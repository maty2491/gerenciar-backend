import mongoose from "mongoose"
import Activity from "../models/activityModel.js"
import Subactivity from "../models/subactivityModel.js"
import ActivitySubactivity from "../models/activitySubactivityModel.js"
import { validateObjectId } from "../utils/validateObjectId.js"
import {
    assertApprovedActivity,
    assertActivityAccess,
    assertSameSector,
    assertSubactivityAccess,
    assertSubactivityCanBeAssigned,
    buildSearchRegex,
    ensureNonEmptyArray,
    parseBooleanQuery,
    parsePagination
} from "../helpers/activityModule.js"

const getActivityOrThrow = async (activityId, user) => {
    validateObjectId(activityId, "ID de actividad")
    const activity = await Activity.findById(activityId)
    assertActivityAccess(activity, user)
    return activity
}

const toObjectIdMap = (items) => new Map(items.map((item) => [String(item._id), item]))

export const getActivityRelationsService = async (activityId) => {
    const relations = await ActivitySubactivity.find({ activityId }).sort({ active: -1, updatedAt: -1, createdAt: -1 })
    const subactivityIds = relations.map((relation) => relation.subactivityId)
    const subactivities = await Subactivity.find({ _id: { $in: subactivityIds } })
    const subactivityMap = toObjectIdMap(subactivities)

    return relations
        .map((relation) => {
            const subactivity = subactivityMap.get(String(relation.subactivityId))
            if (!subactivity) return null

            return {
                relationId: relation._id,
                subactivityId: subactivity._id,
                sector: subactivity.sector,
                name: subactivity.name,
                description: subactivity.description,
                active: subactivity.active,
                relationActive: relation.active
            }
        })
        .filter(Boolean)
}

export const getActivitySubactivityCatalogService = async (activityId, query, user) => {
    const activity = await getActivityOrThrow(activityId, user)
    assertApprovedActivity(activity)
    const { page, limit, skip } = parsePagination(query)
    const includeInactive = parseBooleanQuery(query.includeInactive, true)
    const searchRegex = buildSearchRegex(query.search)

    const filters = { sector: activity.sector }
    if (!includeInactive) filters.active = true
    if (searchRegex) {
        filters.$or = [
            { name: searchRegex },
            { description: searchRegex }
        ]
    }

    const [subactivities, total, relations] = await Promise.all([
        Subactivity.find(filters)
            .sort({ active: -1, name: 1 })
            .skip(skip)
            .limit(limit),
        Subactivity.countDocuments(filters),
        ActivitySubactivity.find({ activityId })
    ])

    const relationMap = new Map(relations.map((relation) => [String(relation.subactivityId), relation]))

    return {
        activityId: activity._id,
        page,
        limit,
        total,
        items: subactivities.map((subactivity) => {
            const relation = relationMap.get(String(subactivity._id))
            return {
                subactivityId: subactivity._id,
                sector: subactivity.sector,
                name: subactivity.name,
                description: subactivity.description,
                active: subactivity.active,
                selected: Boolean(relation),
                relationActive: relation ? relation.active : null
            }
        })
    }
}

export const assignSubactivitiesToActivityService = async (activityId, payload, user, options = {}) => {
    const activity = options.activity || await getActivityOrThrow(activityId, user)
    assertApprovedActivity(activity)
    const subactivityIds = payload.subactivityIds || []
    ensureNonEmptyArray(subactivityIds, "subactivityIds")
    subactivityIds.forEach((id) => validateObjectId(id, "ID de subactividad"))

    const uniqueIds = [...new Set(subactivityIds)]
    const objectIds = uniqueIds.map((id) => new mongoose.Types.ObjectId(id))

    const subactivities = await Subactivity.find({ _id: { $in: objectIds } })
    if (subactivities.length !== uniqueIds.length) {
        const error = new Error("Subactividad no encontrada o no tienes permisos.")
        error.statusCode = 404
        throw error
    }

    subactivities.forEach((subactivity) => {
        assertSubactivityAccess(subactivity, user)
        assertSameSector(activity.sector, subactivity.sector)
        assertSubactivityCanBeAssigned(subactivity)
    })

    const session = options.session
    const existingRelations = await ActivitySubactivity.find(
        {
            activityId: activity._id,
            subactivityId: { $in: objectIds }
        },
        null,
        session ? { session } : {}
    )

    const relationMap = new Map(existingRelations.map((relation) => [String(relation.subactivityId), relation]))

    let created = 0
    let reactivated = 0
    let unchanged = 0

    for (const subactivity of subactivities) {
        const existingRelation = relationMap.get(String(subactivity._id))

        if (!existingRelation) {
            await ActivitySubactivity.create([{
                activityId: activity._id,
                subactivityId: subactivity._id,
                active: true,
                assignedBy: user._id,
                assignedAt: new Date(),
                updatedBy: user._id
            }], session ? { session } : undefined)
            created += 1
            continue
        }

        if (!existingRelation.active) {
            existingRelation.active = true
            existingRelation.updatedBy = user._id
            await existingRelation.save(session ? { session } : undefined)
            reactivated += 1
            continue
        }

        unchanged += 1
    }

    return {
        activityId: activity._id,
        processed: uniqueIds.length,
        created,
        reactivated,
        unchanged
    }
}

export const toggleActivitySubactivityRelationService = async (activityId, subactivityId, payload, user) => {
    const activity = await getActivityOrThrow(activityId, user)
    assertApprovedActivity(activity)
    validateObjectId(subactivityId, "ID de subactividad")

    if (payload.active === undefined) {
        const error = new Error("No hay campos validos para actualizar.")
        error.statusCode = 400
        throw error
    }

    const relation = await ActivitySubactivity.findOne({
        activityId: activity._id,
        subactivityId
    })

    if (!relation) {
        const error = new Error("Relacion actividad-subactividad no encontrada.")
        error.statusCode = 404
        throw error
    }

    const subactivity = await Subactivity.findById(subactivityId)
    assertSubactivityAccess(subactivity, user)
    assertSameSector(activity.sector, subactivity.sector)

    const nextActive = Boolean(payload.active)
    if (nextActive) {
        assertSubactivityCanBeAssigned(subactivity)
    }

    relation.active = nextActive
    relation.updatedBy = user._id
    await relation.save()

    return {
        item: {
            relationId: relation._id,
            activityId: relation.activityId,
            subactivityId: relation.subactivityId,
            active: relation.active,
            updatedAt: relation.updatedAt
        }
    }
}
