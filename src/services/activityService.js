import mongoose from "mongoose"
import Activity from "../models/activityModel.js"
import ActivitySubactivity from "../models/activitySubactivityModel.js"
import { validateObjectId } from "../utils/validateObjectId.js"
import {
    assertAdminManagedApproval,
    assertApprovedActivity,
    assertActivityAccess,
    assertAllowedFields,
    buildPaginatedResponse,
    buildSearchRegex,
    normalizeActivityPayload,
    parseBooleanQuery,
    parsePagination,
    resolveSectorScope
} from "../helpers/activityModule.js"
import {
    assignSubactivitiesToActivityService,
    getActivityRelationsService
} from "./activitySubactivityService.js"

const editableFields = ["name", "description", "active", "origin"]

const duplicateKeyError = (error, message) => {
    if (error?.code === 11000) {
        const duplicate = new Error(message)
        duplicate.statusCode = 400
        throw duplicate
    }

    throw error
}

const mapActivityListItem = (item) => ({
    _id: item._id,
    sector: item.sector,
    name: item.name,
    description: item.description,
    active: item.active,
    origin: item.origin,
    approvalStatus: item.approvalStatus,
    requestedBy: item.requestedBy || null,
    approvedBy: item.approvedBy || null,
    approvedAt: item.approvedAt || null,
    subactivitiesCount: item.subactivitiesCount || 0,
    activeSubactivitiesCount: item.activeSubactivitiesCount || 0,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt
})

const isUnsupportedTransactionError = (error) => {
    const message = String(error?.message || "")

    return message.includes("Transaction numbers are only allowed")
        || message.includes("This MongoDB deployment does not support retryable writes")
        || message.includes("ReplicaSet")
        || message.includes("replica set")
}

const runCreateActivityFallback = async ({ activityPayload, subactivityIds, user }) => {
    const activity = await Activity.create(activityPayload)

    try {
        if (subactivityIds.length > 0) {
            await assignSubactivitiesToActivityService(
                activity._id,
                { subactivityIds },
                user,
                { activity }
            )
        }
    } catch (error) {
        await Activity.deleteOne({ _id: activity._id })
        throw error
    }

    return activity
}

export const listActivitiesService = async (query, user) => {
    const { page, limit, skip } = parsePagination(query)
    const includeInactive = parseBooleanQuery(query.includeInactive, false)
    const sector = resolveSectorScope({ user, requestedSector: query.sector })
    const searchRegex = buildSearchRegex(query.search)
    const approvalStatus = String(query.approvalStatus || "").trim().toLowerCase()

    const filters = {}
    if (sector) filters.sector = sector
    if (!includeInactive) filters.active = true
    if (approvalStatus) filters.approvalStatus = approvalStatus
    if (searchRegex) {
        filters.$or = [
            { name: searchRegex },
            { description: searchRegex }
        ]
    }

    const [items, total] = await Promise.all([
        Activity.aggregate([
            { $match: filters },
            {
                $lookup: {
                    from: "activitysubactivities",
                    localField: "_id",
                    foreignField: "activityId",
                    as: "relations"
                }
            },
            {
                $addFields: {
                    subactivitiesCount: { $size: "$relations" },
                    activeSubactivitiesCount: {
                        $size: {
                            $filter: {
                                input: "$relations",
                                as: "relation",
                                cond: { $eq: ["$$relation.active", true] }
                            }
                        }
                    }
                }
            },
            { $sort: { sector: 1, active: -1, name: 1 } },
            { $skip: skip },
            { $limit: limit },
            {
                $project: {
                    relations: 0
                }
            }
        ]),
        Activity.countDocuments(filters)
    ])

    return buildPaginatedResponse({
        items: items.map(mapActivityListItem),
        page,
        limit,
        total
    })
}

export const getActivityByIdService = async (id, user) => {
    validateObjectId(id, "ID de actividad")
    const activity = await Activity.findById(id)
    assertActivityAccess(activity, user)

    const subactivities = await getActivityRelationsService(activity._id)

    return {
        _id: activity._id,
        sector: activity.sector,
        name: activity.name,
        description: activity.description,
        active: activity.active,
        origin: activity.origin,
        approvalStatus: activity.approvalStatus,
        requestedBy: activity.requestedBy,
        approvedBy: activity.approvedBy,
        approvedAt: activity.approvedAt,
        subactivities,
        createdAt: activity.createdAt,
        updatedAt: activity.updatedAt
    }
}

export const createActivityService = async (payload, user) => {
    try {
        const normalizedPayload = normalizeActivityPayload(payload)
        const sector = resolveSectorScope({
            user,
            requestedSector: normalizedPayload.sector,
            requireExplicitAdminSector: true
        })

        const activityPayload = {
            sector,
            name: normalizedPayload.name,
            description: normalizedPayload.description,
            active: normalizedPayload.active ?? true,
            origin: user.role === "administrador" ? (normalizedPayload.origin || "sector") : "sector",
            approvalStatus: user.role === "administrador" ? "approved" : "pending",
            requestedBy: user._id,
            approvedBy: user.role === "administrador" ? user._id : undefined,
            approvedAt: user.role === "administrador" ? new Date() : undefined,
            createdBy: user._id
        }

        const subactivityIds = Array.isArray(payload.subactivityIds) ? payload.subactivityIds : []
        if (user.role !== "administrador" && subactivityIds.length > 0) {
            const error = new Error("Las actividades pendientes no pueden asociar subactividades hasta ser aprobadas.")
            error.statusCode = 400
            throw error
        }

        let activity

        if (subactivityIds.length === 0) {
            activity = await Activity.create(activityPayload)
        } else {
            let session

            try {
                session = await mongoose.startSession()
                await session.withTransaction(async () => {
                    const created = await Activity.create([activityPayload], { session })
                    activity = created[0]

                    await assignSubactivitiesToActivityService(
                        activity._id,
                        { subactivityIds },
                        user,
                        { activity, session }
                    )
                })
            } catch (error) {
                if (!isUnsupportedTransactionError(error)) {
                    throw error
                }

                activity = await runCreateActivityFallback({ activityPayload, subactivityIds, user })
            } finally {
                if (session) {
                    await session.endSession()
                }
            }
        }

        return {
            activity: await getActivityByIdService(activity._id, user)
        }
    } catch (error) {
        duplicateKeyError(error, "Ya existe una actividad con ese nombre en el sector indicado.")
    }
}

export const updateActivityService = async (id, payload, user) => {
    try {
        validateObjectId(id, "ID de actividad")
        const normalizedPayload = normalizeActivityPayload(payload)
        assertAdminManagedApproval(normalizedPayload, user)

        const allowedFields = user.role === "administrador"
            ? editableFields
            : editableFields.filter((field) => field !== "origin")
        const updatePayload = Object.fromEntries(
            Object.entries(normalizedPayload).filter(([key]) => allowedFields.includes(key))
        )

        assertAllowedFields(updatePayload, allowedFields)

        const activity = await Activity.findById(id)
        assertActivityAccess(activity, user)
        if (user.role === "encargado" && activity.approvalStatus === "rejected") {
            const error = new Error("La actividad fue rechazada por un administrador y no puede editarse.")
            error.statusCode = 400
            throw error
        }

        Object.assign(activity, updatePayload, { updatedBy: user._id })
        await activity.save()

        const relationCounts = await ActivitySubactivity.aggregate([
            { $match: { activityId: new mongoose.Types.ObjectId(id) } },
            {
                $group: {
                    _id: null,
                    subactivitiesCount: { $sum: 1 },
                    activeSubactivitiesCount: {
                        $sum: { $cond: [{ $eq: ["$active", true] }, 1, 0] }
                    }
                }
            }
        ])

        const counts = relationCounts[0] || {
            subactivitiesCount: 0,
            activeSubactivitiesCount: 0
        }

        return {
            item: mapActivityListItem({
                ...activity.toObject(),
                ...counts
            })
        }
    } catch (error) {
        duplicateKeyError(error, "Ya existe una actividad con ese nombre en el sector indicado.")
    }
}

export const approveActivityService = async (id, user) => {
    validateObjectId(id, "ID de actividad")
    const activity = await Activity.findById(id)

    if (!activity) {
        const error = new Error("Actividad no encontrada.")
        error.statusCode = 404
        throw error
    }

    activity.approvalStatus = "approved"
    activity.approvedBy = user._id
    activity.approvedAt = new Date()
    activity.updatedBy = user._id
    await activity.save()

    return {
        activity: await getActivityByIdService(activity._id, user)
    }
}

export const rejectActivityService = async (id, user) => {
    validateObjectId(id, "ID de actividad")
    const activity = await Activity.findById(id)

    if (!activity) {
        const error = new Error("Actividad no encontrada.")
        error.statusCode = 404
        throw error
    }

    activity.approvalStatus = "rejected"
    activity.approvedBy = null
    activity.approvedAt = null
    activity.updatedBy = user._id
    await activity.save()

    return {
        activity: await getActivityByIdService(activity._id, user)
    }
}

export const assertActivityReadyForOperationalUse = (activity) => {
    assertApprovedActivity(activity)
}
