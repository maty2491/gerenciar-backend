import { handleError } from "../utils/errorHandler.js"
import {
    getKpiByIdService,
    getKpiDashboardService,
    getKpiSnapshotService,
    listKpisService,
    saveKpiService
} from "../services/kpiService.js"

export const getKpiSnapshot = async (req, res) => {
    try {
        const result = await getKpiSnapshotService(req.query, req.user)
        return res.status(200).json(result)
    } catch (error) {
        return handleError(error, res)
    }
}

export const getKpiDashboard = async (req, res) => {
    try {
        const result = await getKpiDashboardService(req.query, req.user)
        return res.status(200).json(result)
    } catch (error) {
        return handleError(error, res)
    }
}

export const saveKpi = async (req, res) => {
    try {
        const result = await saveKpiService(req.body, req.user)
        return res.status(201).json(result)
    } catch (error) {
        return handleError(error, res)
    }
}

export const getKpiById = async (req, res) => {
    try {
        const result = await getKpiByIdService(req.params.id, req.user)
        return res.status(200).json(result)
    } catch (error) {
        return handleError(error, res)
    }
}

export const getKpis = async (req, res) => {
    try {
        const result = await listKpisService(req.query, req.user)
        return res.status(200).json(result)
    } catch (error) {
        return handleError(error, res)
    }
}
