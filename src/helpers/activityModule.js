import { isOperativeSector } from "../constants/sectors.js"

const DEFAULT_PAGE = 1
const DEFAULT_LIMIT = 20
const MAX_LIMIT = 100

const buildError = (message, statusCode = 400) => {
    const error = new Error(message)
    error.statusCode = statusCode
    return error
}

const normalizeText = (value) => String(value || "").trim().toLowerCase()
const normalizeOptionalText = (value) => {
    if (value === undefined) return undefined
    const normalized = String(value).trim()
    return normalized || undefined
}

export const normalizeActivityPayload = (payload = {}) => {
    const normalized = {}

    if (payload.name !== undefined) normalized.name = normalizeText(payload.name)
    if (payload.description !== undefined) normalized.description = normalizeOptionalText(payload.description)
    if (payload.sector !== undefined) normalized.sector = normalizeText(payload.sector)
    if (payload.active !== undefined) normalized.active = Boolean(payload.active)

    return normalized
}

export const normalizeSubactivityPayload = (payload = {}) => {
    const normalized = {}

    if (payload.name !== undefined) normalized.name = normalizeText(payload.name)
    if (payload.description !== undefined) normalized.description = normalizeOptionalText(payload.description)
    if (payload.sector !== undefined) normalized.sector = normalizeText(payload.sector)
    if (payload.active !== undefined) normalized.active = Boolean(payload.active)

    return normalized
}

export const parsePagination = (query = {}) => {
    const pageValue = Number(query.page)
    const limitValue = Number(query.limit)

    const page = Number.isInteger(pageValue) && pageValue > 0 ? pageValue : DEFAULT_PAGE
    const requestedLimit = Number.isInteger(limitValue) && limitValue > 0 ? limitValue : DEFAULT_LIMIT
    const limit = Math.min(requestedLimit, MAX_LIMIT)

    return {
        page,
        limit,
        skip: (page - 1) * limit
    }
}

export const parseBooleanQuery = (value, defaultValue = false) => {
    if (value === undefined) return defaultValue
    return String(value).toLowerCase() === "true"
}

export const buildSearchRegex = (search) => {
    const normalized = String(search || "").trim()
    if (!normalized) return null
    return new RegExp(normalized.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i")
}

export const ensureOperativeSector = (sector) => {
    const normalizedSector = normalizeText(sector)

    if (!isOperativeSector(normalizedSector)) {
        throw buildError("Sector invalido", 400)
    }

    return normalizedSector
}

export const resolveSectorScope = ({ user, requestedSector, requireExplicitAdminSector = false }) => {
    if (user.role === "encargado") {
        return user.sector
    }

    const normalizedSector = requestedSector ? normalizeText(requestedSector) : ""
    if (!normalizedSector) {
        if (requireExplicitAdminSector) {
            throw buildError("El campo sector es obligatorio.", 400)
        }
        return null
    }

    return ensureOperativeSector(normalizedSector)
}

export const assertActivityAccess = (activity, user) => {
    if (!activity) {
        throw buildError("Actividad no encontrada o no tienes permisos.", 404)
    }

    if (user.role === "encargado" && activity.sector !== user.sector) {
        throw buildError("Actividad no encontrada o no tienes permisos.", 404)
    }
}

export const assertSubactivityAccess = (subactivity, user) => {
    if (!subactivity) {
        throw buildError("Subactividad no encontrada o no tienes permisos.", 404)
    }

    if (user.role === "encargado" && subactivity.sector !== user.sector) {
        throw buildError("Subactividad no encontrada o no tienes permisos.", 404)
    }
}

export const assertSameSector = (activitySector, subactivitySector) => {
    if (activitySector !== subactivitySector) {
        throw buildError("No se permite asociar entidades de distintos sectores.", 400)
    }
}

export const assertSubactivityCanBeAssigned = (subactivity) => {
    if (!subactivity.active) {
        throw buildError("La subactividad indicada esta inactiva y no puede asignarse.", 400)
    }
}

export const ensureNonEmptyArray = (value, fieldName) => {
    if (!Array.isArray(value) || value.length === 0) {
        throw buildError(`El campo ${fieldName} debe contener al menos un elemento.`, 400)
    }
}

export const assertAllowedFields = (payload, allowedFields) => {
    const keys = Object.keys(payload)
    if (keys.length === 0) {
        throw buildError("No hay campos validos para actualizar.", 400)
    }

    const invalidFields = keys.filter((key) => !allowedFields.includes(key))
    if (invalidFields.length > 0) {
        throw buildError("No hay campos validos para actualizar.", 400)
    }
}

export const buildPaginatedResponse = ({ items, page, limit, total }) => ({
    items,
    page,
    limit,
    total
})
