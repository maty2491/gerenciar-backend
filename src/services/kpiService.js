import mongoose from "mongoose"
import Agent from "../models/agentModel.js"
import Activity from "../models/activityModel.js"
import Subactivity from "../models/subactivityModel.js"
import ActivitySubactivity from "../models/activitySubactivityModel.js"
import Incident from "../models/incidentModel.js"
import Kpi from "../models/kpiModel.js"
import { validateObjectId } from "../utils/validateObjectId.js"
export { getKpiDashboardService } from "./kpiDashboardService.js"

const KPI_RATINGS = ["D", "N", "S", "E"]

const buildAgentAccessQuery = (agentId, user) => (
    user.role === "encargado"
        ? { _id: agentId, sector: user.sector, encargadoId: user._id, status: "activo" }
        : { _id: agentId, status: "activo" }
)

const normalizePeriod = (month, year) => {
    const normalizedMonth = Number(month)
    const normalizedYear = Number(year)

    if (!Number.isInteger(normalizedMonth) || normalizedMonth < 1 || normalizedMonth > 12) {
        const error = new Error("Mes invalido.")
        error.statusCode = 400
        throw error
    }

    if (!Number.isInteger(normalizedYear) || normalizedYear < 2000) {
        const error = new Error("Anio invalido.")
        error.statusCode = 400
        throw error
    }

    return {
        month: normalizedMonth,
        year: normalizedYear
    }
}

const getAuthorizedAgent = async (agentId, user) => {
    validateObjectId(agentId, "ID de agente")
    const agent = await Agent.findOne(buildAgentAccessQuery(agentId, user))

    if (!agent) {
        const error = new Error("Agente no encontrado o no pertenece a tu sector.")
        error.statusCode = 404
        throw error
    }

    return agent
}

const getSectorCatalog = async (sectorId) => {
    const activities = await Activity.find({
        sector: sectorId,
        active: true,
        approvalStatus: "approved"
    }).sort({ name: 1 })
    const activityIds = activities.map((activity) => activity._id)

    const relations = activityIds.length === 0
        ? []
        : await ActivitySubactivity.find({
            activityId: { $in: activityIds },
            active: true
        }).sort({ activityId: 1, assignedAt: 1, createdAt: 1 })

    const subactivityIds = [...new Set(relations.map((relation) => String(relation.subactivityId)))]
    const subactivities = subactivityIds.length === 0
        ? []
        : await Subactivity.find({
            _id: { $in: subactivityIds.map((id) => new mongoose.Types.ObjectId(id)) },
            active: true,
            sector: sectorId
        }).sort({ name: 1 })

    const subactivityMap = new Map(subactivities.map((subactivity) => [String(subactivity._id), subactivity]))
    const relationsByActivityId = new Map()

    relations.forEach((relation) => {
        const subactivity = subactivityMap.get(String(relation.subactivityId))
        if (!subactivity) return

        const key = String(relation.activityId)
        if (!relationsByActivityId.has(key)) {
            relationsByActivityId.set(key, [])
        }

        relationsByActivityId.get(key).push(subactivity)
    })

    return activities.map((activity) => ({
        activityId: activity._id,
        name: activity.name,
        subactivities: (relationsByActivityId.get(String(activity._id)) || []).map((subactivity) => ({
            subactivityId: subactivity._id,
            name: subactivity.name
        }))
    }))
}

const getVisibleIncidents = async (sectorId) => {
    const incidents = await Incident.find({
        active: true,
        $or: [
            { scope: "global", sectorId: null },
            { scope: "sector", sectorId }
        ]
    }).sort({ scope: 1, name: 1 })

    return incidents.map((incident) => ({
        incidentId: incident._id,
        name: incident.name,
        description: incident.description,
        scope: incident.scope,
        sectorId: incident.sectorId
    }))
}

const buildActivityResponse = (catalogActivities, storedKpi) => {
    const storedActivities = new Map(
        (storedKpi?.activities || []).map((activity) => [String(activity.activityId), activity])
    )

    return catalogActivities.map((activity) => {
        const storedActivity = storedActivities.get(String(activity.activityId))
        const storedSubactivities = new Map(
            (storedActivity?.subactivities || []).map((subactivity) => [String(subactivity.subactivityId), subactivity])
        )

        return {
            activityId: activity.activityId,
            name: activity.name,
            subactivities: activity.subactivities.map((subactivity) => ({
                subactivityId: subactivity.subactivityId,
                name: subactivity.name,
                value: storedSubactivities.get(String(subactivity.subactivityId))?.value ?? 0
            }))
        }
    })
}

const buildIncidentResponse = (catalogIncidents, storedKpi) => {
    const storedIncidents = new Map(
        (storedKpi?.incidents || []).map((incident) => [String(incident.incidentId), incident])
    )

    return catalogIncidents.map((incident) => ({
        ...incident,
        ratingType: storedIncidents.get(String(incident.incidentId))?.ratingType ?? null
    }))
}

const mapKpiDocument = (kpi) => ({
    _id: kpi._id,
    sectorId: kpi.sectorId,
    agentId: kpi.agentId,
    month: kpi.month,
    year: kpi.year,
    activities: kpi.activities,
    incidents: kpi.incidents,
    createdBy: kpi.createdBy,
    updatedBy: kpi.updatedBy,
    createdAt: kpi.createdAt,
    updatedAt: kpi.updatedAt
})

const ensureArray = (value, field) => {
    if (!Array.isArray(value)) {
        const error = new Error(`El campo ${field} debe ser un arreglo.`)
        error.statusCode = 400
        throw error
    }
}

const validateIntegerValue = (value, field) => {
    const numericValue = Number(value)

    if (!Number.isInteger(numericValue) || numericValue < 0 || numericValue > 999999) {
        const error = new Error(`El campo ${field} debe ser un entero entre 0 y 999999.`)
        error.statusCode = 400
        throw error
    }

    return numericValue
}

const validateRatingType = (value, field) => {
    const normalizedValue = String(value || "").trim().toUpperCase()

    if (!KPI_RATINGS.includes(normalizedValue)) {
        const error = new Error(`El campo ${field} debe ser uno de: D, N, S, E.`)
        error.statusCode = 400
        throw error
    }

    return normalizedValue
}

const validateNoDuplicates = (items, keySelector, message) => {
    const seen = new Set()

    items.forEach((item) => {
        const key = keySelector(item)
        if (seen.has(key)) {
            const error = new Error(message)
            error.statusCode = 400
            throw error
        }
        seen.add(key)
    })
}

const validateAndBuildActivitiesPayload = (activities, catalogActivities) => {
    ensureArray(activities, "activities")
    validateNoDuplicates(activities, (activity) => String(activity.activityId), "No se permiten actividades duplicadas.")

    const catalogByActivityId = new Map(
        catalogActivities.map((activity) => [String(activity.activityId), activity])
    )

    return activities.map((activity, activityIndex) => {
        validateObjectId(activity.activityId, "ID de actividad")
        const catalogActivity = catalogByActivityId.get(String(activity.activityId))

        if (!catalogActivity) {
            const error = new Error("La actividad indicada no esta activa o no pertenece al sector.")
            error.statusCode = 400
            throw error
        }

        ensureArray(activity.subactivities, `activities[${activityIndex}].subactivities`)
        validateNoDuplicates(
            activity.subactivities,
            (subactivity) => String(subactivity.subactivityId),
            "No se permiten subactividades duplicadas dentro de la misma actividad."
        )

        const catalogSubactivitiesById = new Map(
            catalogActivity.subactivities.map((subactivity) => [String(subactivity.subactivityId), subactivity])
        )

        return {
            activityId: catalogActivity.activityId,
            name: catalogActivity.name,
            subactivities: activity.subactivities.map((subactivity, subactivityIndex) => {
                validateObjectId(subactivity.subactivityId, "ID de subactividad")
                const catalogSubactivity = catalogSubactivitiesById.get(String(subactivity.subactivityId))

                if (!catalogSubactivity) {
                    const error = new Error("La subactividad indicada no esta activa o no pertenece a la actividad.")
                    error.statusCode = 400
                    throw error
                }

                return {
                    subactivityId: catalogSubactivity.subactivityId,
                    name: catalogSubactivity.name,
                    value: validateIntegerValue(
                        subactivity.value,
                        `activities[${activityIndex}].subactivities[${subactivityIndex}].value`
                    )
                }
            })
        }
    })
}

const validateAndBuildIncidentsPayload = (incidents, catalogIncidents) => {
    ensureArray(incidents, "incidents")
    validateNoDuplicates(incidents, (incident) => String(incident.incidentId), "No se permiten incidencias duplicadas.")

    const catalogByIncidentId = new Map(
        catalogIncidents.map((incident) => [String(incident.incidentId), incident])
    )

    return incidents.map((incident, index) => {
        validateObjectId(incident.incidentId, "ID de incidencia")
        const catalogIncident = catalogByIncidentId.get(String(incident.incidentId))

        if (!catalogIncident) {
            const error = new Error("La incidencia indicada no esta activa o no pertenece al sector.")
            error.statusCode = 400
            throw error
        }

        return {
            incidentId: catalogIncident.incidentId,
            name: catalogIncident.name,
            description: catalogIncident.description,
            scope: catalogIncident.scope,
            sectorId: catalogIncident.sectorId,
            ratingType: validateRatingType(incident.ratingType, `incidents[${index}].ratingType`)
        }
    })
}

const buildAgentResponse = (agent) => ({
    _id: agent._id,
    legajo: agent.legajo,
    nombre: agent.nombre,
    apellido: agent.apellido,
    sector: agent.sector,
    encargadoId: agent.encargadoId
})

export const getKpiSnapshotService = async ({ agentId, month, year }, user) => {
    const agent = await getAuthorizedAgent(agentId, user)
    const period = normalizePeriod(month, year)

    const [kpi, catalogActivities, catalogIncidents] = await Promise.all([
        Kpi.findOne({ agentId: agent._id, month: period.month, year: period.year }),
        getSectorCatalog(agent.sector),
        getVisibleIncidents(agent.sector)
    ])

    return {
        agent: buildAgentResponse(agent),
        period,
        kpi: kpi ? {
            _id: kpi._id,
            sectorId: kpi.sectorId,
            agentId: kpi.agentId,
            month: kpi.month,
            year: kpi.year
        } : null,
        activities: buildActivityResponse(catalogActivities, kpi),
        incidents: buildIncidentResponse(catalogIncidents, kpi)
    }
}

export const saveKpiService = async (payload, user) => {
    const agent = await getAuthorizedAgent(payload.agentId, user)
    const period = normalizePeriod(payload.month, payload.year)
    const normalizedSectorId = String(payload.sectorId || "").toLowerCase().trim()

    if (!normalizedSectorId) {
        const error = new Error("El sectorId es obligatorio.")
        error.statusCode = 400
        throw error
    }

    if (normalizedSectorId !== agent.sector) {
        const error = new Error("El sectorId no coincide con el sector del agente.")
        error.statusCode = 400
        throw error
    }

    const [catalogActivities, catalogIncidents] = await Promise.all([
        getSectorCatalog(agent.sector),
        getVisibleIncidents(agent.sector)
    ])

    const activities = validateAndBuildActivitiesPayload(payload.activities, catalogActivities)
    const incidents = validateAndBuildIncidentsPayload(payload.incidents || [], catalogIncidents)

    const existingKpi = await Kpi.findOne({
        agentId: agent._id,
        month: period.month,
        year: period.year
    })

    const nextPayload = {
        sectorId: agent.sector,
        agentId: agent._id,
        month: period.month,
        year: period.year,
        activities,
        incidents,
        updatedBy: user._id
    }

    const kpi = await Kpi.findOneAndUpdate(
        {
            agentId: agent._id,
            month: period.month,
            year: period.year
        },
        {
            $set: nextPayload,
            $setOnInsert: {
                createdBy: user._id
            }
        },
        {
            upsert: true,
            new: true,
            runValidators: true,
            setDefaultsOnInsert: true
        }
    )

    return {
        message: existingKpi ? "KPI mensual actualizado correctamente." : "KPI mensual guardado correctamente.",
        data: mapKpiDocument(kpi)
    }
}

export const getKpiByIdService = async (id, user) => {
    validateObjectId(id, "ID de KPI")
    const kpi = await Kpi.findById(id)

    if (!kpi) {
        const error = new Error("KPI no encontrado.")
        error.statusCode = 404
        throw error
    }

    await getAuthorizedAgent(kpi.agentId, user)

    return mapKpiDocument(kpi)
}

export const listKpisService = async (query, user) => {
    const filters = {}

    if (query.agentId) {
        const agent = await getAuthorizedAgent(query.agentId, user)
        filters.agentId = agent._id
    } else if (user.role === "encargado") {
        const agents = await Agent.find({
            sector: user.sector,
            encargadoId: user._id,
            status: "activo"
        }).select("_id")
        filters.agentId = { $in: agents.map((agent) => agent._id) }
    }

    if (query.year !== undefined) {
        const year = Number(query.year)
        if (!Number.isInteger(year) || year < 2000) {
            const error = new Error("Anio invalido.")
            error.statusCode = 400
            throw error
        }
        filters.year = year
    }

    if (query.month !== undefined) {
        const month = Number(query.month)
        if (!Number.isInteger(month) || month < 1 || month > 12) {
            const error = new Error("Mes invalido.")
            error.statusCode = 400
            throw error
        }
        filters.month = month
    }

    const kpis = await Kpi.find(filters).sort({ year: -1, month: -1, updatedAt: -1 })
    return kpis.map(mapKpiDocument)
}
