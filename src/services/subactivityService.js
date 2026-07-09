import mongoose from "mongoose"
import Subactivity from "../models/subactivityModel.js"
import ActivitySubactivity from "../models/activitySubactivityModel.js"
import { validateObjectId } from "../utils/validateObjectId.js"
import {
    assertAllowedFields,
    assertSubactivityAccess,
    buildPaginatedResponse,
    buildSearchRegex,
    normalizeSubactivityPayload,
    parseBooleanQuery,
    parsePagination,
    resolveSectorScope
} from "../helpers/activityModule.js"

const editableFields = ["name", "description", "active"]

const duplicateKeyError = (error, message) => {
    if (error?.code === 11000) {
        const duplicate = new Error(message)
        duplicate.statusCode = 400
        throw duplicate
    }

    throw error
}

const mapSubactivityItem = (item) => ({
    _id: item._id,
    sector: item.sector,
    name: item.name,
    description: item.description,
    active: item.active,
    linkedActivitiesCount: item.linkedActivitiesCount || 0,
    activeLinkedActivitiesCount: item.activeLinkedActivitiesCount || 0,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt
})

export const listSubactivitiesService = async (query, user) => {
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
        Subactivity.aggregate([
            { $match: filters },
            {
                $lookup: {
                    from: "activitysubactivities",
                    localField: "_id",
                    foreignField: "subactivityId",
                    as: "relations"
                }
            },
            {
                $addFields: {
                    linkedActivitiesCount: { $size: "$relations" },
                    activeLinkedActivitiesCount: {
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
        Subactivity.countDocuments(filters)
    ])

    return buildPaginatedResponse({
        items: items.map(mapSubactivityItem),
        page,
        limit,
        total
    })
}

export const createSubactivityService = async (payload, user) => {
    try {
        const normalizedPayload = normalizeSubactivityPayload(payload)
        const sector = resolveSectorScope({
            user,
            requestedSector: normalizedPayload.sector,
            requireExplicitAdminSector: true
        })

        const subactivity = await Subactivity.create({
            sector,
            name: normalizedPayload.name,
            description: normalizedPayload.description,
            active: normalizedPayload.active ?? true,
            createdBy: user._id
        })

        return {
            item: mapSubactivityItem({
                ...subactivity.toObject(),
                linkedActivitiesCount: 0,
                activeLinkedActivitiesCount: 0
            })
        }
    } catch (error) {
        duplicateKeyError(error, "Ya existe una subactividad con ese nombre.")
    }
}

export const updateSubactivityService = async (id, payload, user) => {
    try {
        validateObjectId(id, "ID de subactividad")
        const normalizedPayload = normalizeSubactivityPayload(payload)
        const updatePayload = Object.fromEntries(
            Object.entries(normalizedPayload).filter(([key]) => editableFields.includes(key))
        )

        assertAllowedFields(updatePayload, editableFields)

        const subactivity = await Subactivity.findById(id)
        assertSubactivityAccess(subactivity, user)

        Object.assign(subactivity, updatePayload, { updatedBy: user._id })
        await subactivity.save()

        const relationCounts = await ActivitySubactivity.aggregate([
            { $match: { subactivityId: new mongoose.Types.ObjectId(id) } },
            {
                $group: {
                    _id: null,
                    linkedActivitiesCount: { $sum: 1 },
                    activeLinkedActivitiesCount: {
                        $sum: { $cond: [{ $eq: ["$active", true] }, 1, 0] }
                    }
                }
            }
        ])

        const counts = relationCounts[0] || {
            linkedActivitiesCount: 0,
            activeLinkedActivitiesCount: 0
        }

        return {
            item: mapSubactivityItem({
                ...subactivity.toObject(),
                ...counts
            })
        }
    } catch (error) {
        duplicateKeyError(error, "Ya existe una subactividad con ese nombre.")
    }
}
