import { handleError } from "../utils/errorHandler.js"
import {
    createSubactivityService,
    listSubactivitiesService,
    updateSubactivityService
} from "../services/subactivityService.js"

export const getSubactivities = async (req, res) => {
    try {
        const result = await listSubactivitiesService(req.query, req.user)
        return res.status(200).json(result)
    } catch (error) {
        return handleError(error, res)
    }
}

export const createSubactivity = async (req, res) => {
    try {
        const result = await createSubactivityService(req.body, req.user)
        return res.status(201).json(result)
    } catch (error) {
        return handleError(error, res)
    }
}

export const updateSubactivity = async (req, res) => {
    try {
        const result = await updateSubactivityService(req.params.id, req.body, req.user)
        return res.status(200).json(result)
    } catch (error) {
        return handleError(error, res)
    }
}
