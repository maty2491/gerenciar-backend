import { handleError } from "../utils/errorHandler.js"
import {
    approveActivityService,
    createActivityService,
    getActivityByIdService,
    listActivitiesService,
    rejectActivityService,
    updateActivityService
} from "../services/activityService.js"
import {
    assignSubactivitiesToActivityService,
    getActivitySubactivityCatalogService,
    toggleActivitySubactivityRelationService
} from "../services/activitySubactivityService.js"

export const getActivities = async (req, res) => {
    try {
        const result = await listActivitiesService(req.query, req.user)
        return res.status(200).json(result)
    } catch (error) {
        return handleError(error, res)
    }
}

export const getActivityById = async (req, res) => {
    try {
        const result = await getActivityByIdService(req.params.id, req.user)
        return res.status(200).json(result)
    } catch (error) {
        return handleError(error, res)
    }
}

export const createActivity = async (req, res) => {
    try {
        const result = await createActivityService(req.body, req.user)
        return res.status(201).json(result)
    } catch (error) {
        return handleError(error, res)
    }
}

export const updateActivity = async (req, res) => {
    try {
        const result = await updateActivityService(req.params.id, req.body, req.user)
        return res.status(200).json(result)
    } catch (error) {
        return handleError(error, res)
    }
}

export const approveActivity = async (req, res) => {
    try {
        const result = await approveActivityService(req.params.id, req.user)
        return res.status(200).json(result)
    } catch (error) {
        return handleError(error, res)
    }
}

export const rejectActivity = async (req, res) => {
    try {
        const result = await rejectActivityService(req.params.id, req.user)
        return res.status(200).json(result)
    } catch (error) {
        return handleError(error, res)
    }
}

export const getActivitySubactivityCatalog = async (req, res) => {
    try {
        const result = await getActivitySubactivityCatalogService(req.params.id, req.query, req.user)
        return res.status(200).json(result)
    } catch (error) {
        return handleError(error, res)
    }
}

export const assignSubactivitiesToActivity = async (req, res) => {
    try {
        const result = await assignSubactivitiesToActivityService(req.params.id, req.body, req.user)
        return res.status(200).json(result)
    } catch (error) {
        return handleError(error, res)
    }
}

export const toggleActivitySubactivityRelation = async (req, res) => {
    try {
        const result = await toggleActivitySubactivityRelationService(
            req.params.id,
            req.params.subactivityId,
            req.body,
            req.user
        )
        return res.status(200).json(result)
    } catch (error) {
        return handleError(error, res)
    }
}
