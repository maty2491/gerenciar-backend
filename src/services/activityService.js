import mongoose from "mongoose"
import Activity from "../models/activityModel.js"
import ActivitySubactivity from "../models/activitySubactivityModel.js"
import { validateObjectId } from "../utils/validateObjectId.js"
import {
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

const editableFields = ["name", "description", "active"]

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

    const filters = {}
    if (sector) filters.sector = sector
    if (!includeInactive) filters.active = true
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
            createdBy: user._id
        }

        const subactivityIds = Array.isArray(payload.subactivityIds) ? payload.subactivityIds : []

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
        const updatePayload = Object.fromEntries(
            Object.entries(normalizedPayload).filter(([key]) => editableFields.includes(key))
        )

        assertAllowedFields(updatePayload, editableFields)

        const activity = await Activity.findById(id)
        assertActivityAccess(activity, user)

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
