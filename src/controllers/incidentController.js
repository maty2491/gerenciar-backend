import { handleError } from "../utils/errorHandler.js"
import {
    createIncidentService,
    deleteIncidentService,
    listIncidentsService,
    updateIncidentService
} from "../services/incidentService.js"

export const getIncidents = async (req, res) => {
    try {
        const result = await listIncidentsService(req.query, req.user)
        return res.status(200).json(result)
    } catch (error) {
        return handleError(error, res)
    }
}

export const createIncident = async (req, res) => {
    try {
        const result = await createIncidentService(req.body, req.user)
        return res.status(201).json(result)
    } catch (error) {
        return handleError(error, res)
    }
}

export const updateIncident = async (req, res) => {
    try {
        const result = await updateIncidentService(req.params.id, req.body, req.user)
        return res.status(200).json(result)
    } catch (error) {
        return handleError(error, res)
    }
}

export const deleteIncident = async (req, res) => {
    try {
        const result = await deleteIncidentService(req.params.id, req.user)
        return res.status(200).json(result)
    } catch (error) {
        return handleError(error, res)
    }
}
