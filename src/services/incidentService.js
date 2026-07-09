import Incident from "../models/incidentModel.js"
import { OPERATIVE_SECTORS } from "../constants/sectors.js"
import { validateObjectId } from "../utils/validateObjectId.js"

const normalizeIncidentPayload = (payload = {}) => {
    const normalized = {}

    if (typeof payload.name === "string") normalized.name = payload.name.trim()
    if (typeof payload.description === "string") normalized.description = payload.description.trim()
    if (typeof payload.scope === "string") normalized.scope = payload.scope.toLowerCase().trim()
    if (payload.sectorId !== undefined && payload.sectorId !== null) {
        normalized.sectorId = String(payload.sectorId).toLowerCase().trim()
    }
    if (payload.sectorId === null) normalized.sectorId = null
    if (payload.active !== undefined) normalized.active = Boolean(payload.active)

    return normalized
}

const assertAllowedSector = (scope, sectorId) => {
    if (scope === "global") return null

    if (!OPERATIVE_SECTORS.includes(sectorId)) {
        const error = new Error("Sector invalido.")
        error.statusCode = 400
        throw error
    }

    return sectorId
}

const normalizeScopeAndSector = (normalizedPayload, user, isCreate = false) => {
    const scope = normalizedPayload.scope || (isCreate ? "global" : undefined)

    if (user.role === "encargado") {
        const forcedScope = "sector"
        return {
            scope: forcedScope,
            sectorId: user.sector
        }
    }

    if (!scope) {
        return {
            scope: undefined,
            sectorId: normalizedPayload.sectorId
        }
    }

    return {
        scope,
        sectorId: assertAllowedSector(scope, normalizedPayload.sectorId ?? null)
    }
}

const mapIncident = (incident) => ({
    _id: incident._id,
    name: incident.name,
    description: incident.description,
    scope: incident.scope,
    sectorId: incident.sectorId,
    active: incident.active,
    createdBy: incident.createdBy,
    updatedBy: incident.updatedBy,
    createdAt: incident.createdAt,
    updatedAt: incident.updatedAt
})

const applyDuplicateKeyError = (error) => {
    if (error?.code === 11000) {
        const duplicate = new Error("Ya existe una incidencia activa con ese nombre y alcance.")
        duplicate.statusCode = 400
        throw duplicate
    }

    throw error
}

export const listIncidentsService = async (query, user) => {
    const includeInactive = query.includeInactive === "true"
    const requestedScope = query.scope?.toLowerCase().trim()
    const requestedSectorId = query.sectorId?.toLowerCase().trim()

    const filters = {}

    if (!includeInactive) {
        filters.active = true
    }

    if (user.role === "encargado") {
        filters.$or = [
            { scope: "global", sectorId: null },
            { scope: "sector", sectorId: user.sector }
        ]
    } else if (requestedScope === "global") {
        filters.scope = "global"
        filters.sectorId = null
    } else if (requestedScope === "sector") {
        filters.scope = "sector"
        if (requestedSectorId) {
            if (!OPERATIVE_SECTORS.includes(requestedSectorId)) {
                const error = new Error("Sector invalido.")
                error.statusCode = 400
                throw error
            }
            filters.sectorId = requestedSectorId
        }
    } else if (requestedSectorId) {
        if (!OPERATIVE_SECTORS.includes(requestedSectorId)) {
            const error = new Error("Sector invalido.")
            error.statusCode = 400
            throw error
        }
        filters.$or = [
            { scope: "global", sectorId: null },
            { scope: "sector", sectorId: requestedSectorId }
        ]
    }

    const incidents = await Incident.find(filters).sort({ scope: 1, sectorId: 1, active: -1, name: 1 })

    return incidents.map(mapIncident)
}

export const createIncidentService = async (payload, user) => {
    try {
        const normalizedPayload = normalizeIncidentPayload(payload)
        const { scope, sectorId } = normalizeScopeAndSector(normalizedPayload, user, true)

        if (!normalizedPayload.name) {
            const error = new Error("El nombre es obligatorio.")
            error.statusCode = 400
            throw error
        }

        if (!normalizedPayload.description) {
            const error = new Error("La descripcion es obligatoria.")
            error.statusCode = 400
            throw error
        }

        const incident = await Incident.create({
            name: normalizedPayload.name,
            description: normalizedPayload.description,
            scope,
            sectorId,
            active: normalizedPayload.active ?? true,
            createdBy: user._id,
            updatedBy: user._id
        })

        return mapIncident(incident)
    } catch (error) {
        applyDuplicateKeyError(error)
    }
}

export const updateIncidentService = async (id, payload, user) => {
    try {
        validateObjectId(id, "ID de incidencia")
        const incident = await Incident.findById(id)

        if (!incident) {
            const error = new Error("Incidencia no encontrada.")
            error.statusCode = 404
            throw error
        }

        if (user.role === "encargado" && incident.scope !== "sector") {
            const error = new Error("No tienes permisos para modificar incidencias globales.")
            error.statusCode = 403
            throw error
        }

        if (user.role === "encargado" && incident.sectorId !== user.sector) {
            const error = new Error("No tienes permisos para modificar incidencias de otro sector.")
            error.statusCode = 403
            throw error
        }

        const normalizedPayload = normalizeIncidentPayload(payload)
        const nextScope = normalizedPayload.scope ?? incident.scope
        const nextSectorId = normalizedPayload.sectorId !== undefined
            ? normalizedPayload.sectorId
            : incident.sectorId

        const normalizedScopeData = normalizeScopeAndSector(
            { scope: nextScope, sectorId: nextSectorId },
            user,
            false
        )

        if (normalizedPayload.name !== undefined) incident.name = normalizedPayload.name
        if (normalizedPayload.description !== undefined) incident.description = normalizedPayload.description
        if (normalizedScopeData.scope !== undefined) incident.scope = normalizedScopeData.scope
        if (normalizedScopeData.sectorId !== undefined) incident.sectorId = normalizedScopeData.sectorId
        if (normalizedPayload.active !== undefined) incident.active = normalizedPayload.active
        incident.updatedBy = user._id

        await incident.save()
        return mapIncident(incident)
    } catch (error) {
        applyDuplicateKeyError(error)
    }
}

export const deleteIncidentService = async (id, user) => {
    validateObjectId(id, "ID de incidencia")
    const incident = await Incident.findById(id)

    if (!incident) {
        const error = new Error("Incidencia no encontrada.")
        error.statusCode = 404
        throw error
    }

    if (user.role === "encargado" && incident.scope !== "sector") {
        const error = new Error("No tienes permisos para eliminar incidencias globales.")
        error.statusCode = 403
        throw error
    }

    if (user.role === "encargado" && incident.sectorId !== user.sector) {
        const error = new Error("No tienes permisos para eliminar incidencias de otro sector.")
        error.statusCode = 403
        throw error
    }

    incident.active = false
    incident.updatedBy = user._id
    await incident.save()

    return {
        message: "Incidencia desactivada correctamente."
    }
}
