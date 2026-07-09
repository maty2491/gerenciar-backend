import Agent from "../models/agentModel.js"
import Kpi from "../models/kpiModel.js"
import { OPERATIVE_SECTORS } from "../constants/sectors.js"
import { validateObjectId } from "../utils/validateObjectId.js"

const INCIDENT_SCORE_MAP = {
    D: 1,
    N: 2,
    S: 3,
    E: 4
}

const comparePeriods = (a, b) => {
    if (a.year !== b.year) return a.year - b.year
    return a.month - b.month
}

const formatPeriodKey = ({ month, year }) => `${year}-${String(month).padStart(2, "0")}`

const parseMonth = (value, fieldName) => {
    const month = Number(value)
    if (!Number.isInteger(month) || month < 1 || month > 12) {
        const error = new Error(`${fieldName} invalido.`)
        error.statusCode = 400
        throw error
    }
    return month
}

const parseYear = (value, fieldName) => {
    const year = Number(value)
    if (!Number.isInteger(year) || year < 2000) {
        const error = new Error(`${fieldName} invalido.`)
        error.statusCode = 400
        throw error
    }
    return year
}

const parsePeriod = ({ month, year, monthField = "Mes", yearField = "Anio" }) => ({
    month: parseMonth(month, monthField),
    year: parseYear(year, yearField)
})

const buildPeriodRange = (start, end) => {
    const periods = []
    let currentMonth = start.month
    let currentYear = start.year

    while (currentYear < end.year || (currentYear === end.year && currentMonth <= end.month)) {
        periods.push({ month: currentMonth, year: currentYear })
        currentMonth += 1
        if (currentMonth === 13) {
            currentMonth = 1
            currentYear += 1
        }
    }

    return periods
}

const shiftPeriod = (period, deltaMonths) => {
    let month = period.month + deltaMonths
    let year = period.year

    while (month < 1) {
        month += 12
        year -= 1
    }

    while (month > 12) {
        month -= 12
        year += 1
    }

    return { month, year }
}

const buildPreviousRange = (periods) => periods.map((period) => shiftPeriod(period, -periods.length))

const normalizeFilters = (query, user) => {
    const now = new Date()

    const requestedSector = query.sector?.toLowerCase().trim()
    const agentId = query.agentId?.trim() || null
    const hasSpecificMonth = query.month !== undefined || query.year !== undefined
    const hasRange = query.fromMonth !== undefined || query.fromYear !== undefined || query.toMonth !== undefined || query.toYear !== undefined

    let sector = null
    if (user.role === "encargado") {
        sector = user.sector
    } else if (requestedSector) {
        if (!OPERATIVE_SECTORS.includes(requestedSector)) {
            const error = new Error("Sector invalido.")
            error.statusCode = 400
            throw error
        }
        sector = requestedSector
    }

    if (agentId) {
        validateObjectId(agentId, "ID de agente")
    }

    let periods = []
    let mode = "range"

    if (hasSpecificMonth) {
        if (query.month === undefined || query.year === undefined) {
            const error = new Error("Debes enviar mes y anio juntos.")
            error.statusCode = 400
            throw error
        }

        const period = parsePeriod({
            month: query.month,
            year: query.year,
            monthField: "Mes",
            yearField: "Anio"
        })
        periods = [period]
        mode = "single"
    } else if (hasRange) {
        if (
            query.fromMonth === undefined
            || query.fromYear === undefined
            || query.toMonth === undefined
            || query.toYear === undefined
        ) {
            const error = new Error("Debes enviar fromMonth, fromYear, toMonth y toYear juntos.")
            error.statusCode = 400
            throw error
        }

        const start = parsePeriod({
            month: query.fromMonth,
            year: query.fromYear,
            monthField: "fromMonth",
            yearField: "fromYear"
        })
        const end = parsePeriod({
            month: query.toMonth,
            year: query.toYear,
            monthField: "toMonth",
            yearField: "toYear"
        })

        if (comparePeriods(start, end) > 0) {
            const error = new Error("El periodo inicial no puede ser mayor al periodo final.")
            error.statusCode = 400
            throw error
        }

        periods = buildPeriodRange(start, end)
    } else {
        const end = {
            month: now.getMonth() + 1,
            year: now.getFullYear()
        }
        const start = shiftPeriod(end, -5)
        periods = buildPeriodRange(start, end)
    }

    const previousPeriods = buildPreviousRange(periods)

    return {
        mode,
        sector,
        agentId,
        periods,
        previousPeriods
    }
}

const buildAgentFilters = async (filters, user) => {
    const query = { status: "activo" }

    if (filters.sector) {
        query.sector = filters.sector
    }

    if (user.role === "encargado") {
        query.sector = user.sector
        query.encargadoId = user._id
    }

    if (filters.agentId) {
        query._id = filters.agentId
    }

    const agents = await Agent.find(query).sort({ sector: 1, apellido: 1, nombre: 1 }).lean()

    if (filters.agentId && agents.length === 0) {
        const error = new Error("Agente no encontrado o no pertenece a tu sector.")
        error.statusCode = 404
        throw error
    }

    return agents
}

const buildKpiFilters = (agents, periods) => ({
    agentId: { $in: agents.map((agent) => agent._id) },
    $or: periods.map((period) => ({ month: period.month, year: period.year }))
})

const createEmptyRatingCounts = () => ({ D: 0, N: 0, S: 0, E: 0 })

const createSummaryAccumulator = () => ({
    totalValue: 0,
    totalActivities: 0,
    totalSubactivities: 0,
    totalIncidentEvaluations: 0,
    ratings: createEmptyRatingCounts(),
    incidentScoreSum: 0
})

const addIncidentRating = (accumulator, ratingType) => {
    accumulator.ratings[ratingType] = (accumulator.ratings[ratingType] || 0) + 1
    accumulator.totalIncidentEvaluations += 1
    accumulator.incidentScoreSum += INCIDENT_SCORE_MAP[ratingType] || 0
}

const accumulateKpi = (accumulator, kpi) => {
    accumulator.totalActivities += kpi.activities.length

    kpi.activities.forEach((activity) => {
        accumulator.totalSubactivities += activity.subactivities.length
        activity.subactivities.forEach((subactivity) => {
            accumulator.totalValue += subactivity.value
        })
    })

    kpi.incidents.forEach((incident) => addIncidentRating(accumulator, incident.ratingType))
}

const finalizeSummary = (accumulator, totalAgents, loadedAgents) => ({
    totalValue: accumulator.totalValue,
    totalAgents,
    agentsWithKpi: loadedAgents,
    agentsWithoutKpi: Math.max(totalAgents - loadedAgents, 0),
    avgPerAgent: totalAgents > 0 ? Number((accumulator.totalValue / totalAgents).toFixed(2)) : 0,
    avgPerLoadedAgent: loadedAgents > 0 ? Number((accumulator.totalValue / loadedAgents).toFixed(2)) : 0,
    totalActivities: accumulator.totalActivities,
    totalSubactivities: accumulator.totalSubactivities,
    totalIncidentEvaluations: accumulator.totalIncidentEvaluations,
    ratings: accumulator.ratings,
    incidentScoreAvg: accumulator.totalIncidentEvaluations > 0
        ? Number((accumulator.incidentScoreSum / accumulator.totalIncidentEvaluations).toFixed(2))
        : 0
})

const buildPeriodMetrics = (periods, kpisByPeriodKey, totalAgents) => (
    periods.map((period) => {
        const periodKey = formatPeriodKey(period)
        const kpis = kpisByPeriodKey.get(periodKey) || []
        const accumulator = createSummaryAccumulator()

        kpis.forEach((kpi) => accumulateKpi(accumulator, kpi))

        return {
            month: period.month,
            year: period.year,
            totalValue: accumulator.totalValue,
            totalAgents,
            agentsWithKpi: kpis.length,
            agentsWithoutKpi: Math.max(totalAgents - kpis.length, 0),
            totalIncidentEvaluations: accumulator.totalIncidentEvaluations,
            incidentScoreAvg: accumulator.totalIncidentEvaluations > 0
                ? Number((accumulator.incidentScoreSum / accumulator.totalIncidentEvaluations).toFixed(2))
                : 0,
            ratings: accumulator.ratings
        }
    })
)

const buildByActivity = (kpis, loadedAgentsCount) => {
    const activityMap = new Map()

    kpis.forEach((kpi) => {
        kpi.activities.forEach((activity) => {
            const activityKey = String(activity.activityId)
            if (!activityMap.has(activityKey)) {
                activityMap.set(activityKey, {
                    activityId: activity.activityId,
                    name: activity.name,
                    totalValue: 0,
                    subactivities: new Map()
                })
            }

            const currentActivity = activityMap.get(activityKey)
            activity.subactivities.forEach((subactivity) => {
                currentActivity.totalValue += subactivity.value

                const subactivityKey = String(subactivity.subactivityId)
                if (!currentActivity.subactivities.has(subactivityKey)) {
                    currentActivity.subactivities.set(subactivityKey, {
                        subactivityId: subactivity.subactivityId,
                        name: subactivity.name,
                        totalValue: 0
                    })
                }

                currentActivity.subactivities.get(subactivityKey).totalValue += subactivity.value
            })
        })
    })

    return [...activityMap.values()]
        .map((activity) => ({
            activityId: activity.activityId,
            name: activity.name,
            totalValue: activity.totalValue,
            avgPerLoadedAgent: loadedAgentsCount > 0 ? Number((activity.totalValue / loadedAgentsCount).toFixed(2)) : 0,
            subactivities: [...activity.subactivities.values()].sort((a, b) => b.totalValue - a.totalValue || a.name.localeCompare(b.name))
        }))
        .sort((a, b) => b.totalValue - a.totalValue || a.name.localeCompare(b.name))
}

const buildBySector = (kpis, agentsById, totalPeriods) => {
    const sectorMap = new Map()

    kpis.forEach((kpi) => {
        const sectorKey = kpi.sectorId
        if (!sectorMap.has(sectorKey)) {
            sectorMap.set(sectorKey, {
                sector: sectorKey,
                totalValue: 0,
                agentIds: new Set(),
                ratings: createEmptyRatingCounts(),
                incidentScoreSum: 0,
                totalIncidentEvaluations: 0
            })
        }

        const current = sectorMap.get(sectorKey)
        current.agentIds.add(String(kpi.agentId))
        kpi.activities.forEach((activity) => {
            activity.subactivities.forEach((subactivity) => {
                current.totalValue += subactivity.value
            })
        })
        kpi.incidents.forEach((incident) => {
            current.ratings[incident.ratingType] += 1
            current.totalIncidentEvaluations += 1
            current.incidentScoreSum += INCIDENT_SCORE_MAP[incident.ratingType] || 0
        })
    })

    const allAgentsBySector = new Map()
    agentsById.forEach((agent) => {
        if (!allAgentsBySector.has(agent.sector)) {
            allAgentsBySector.set(agent.sector, [])
        }
        allAgentsBySector.get(agent.sector).push(agent)
    })

    return [...allAgentsBySector.entries()].map(([sector, sectorAgents]) => {
        const current = sectorMap.get(sector) || {
            totalValue: 0,
            agentIds: new Set(),
            ratings: createEmptyRatingCounts(),
            incidentScoreSum: 0,
            totalIncidentEvaluations: 0
        }
        return {
            sector,
            totalValue: current.totalValue,
            totalAgents: sectorAgents.length,
            agentsWithKpi: current.agentIds.size,
            agentsWithoutKpi: Math.max(sectorAgents.length - current.agentIds.size, 0),
            avgPerAgent: sectorAgents.length > 0 ? Number((current.totalValue / sectorAgents.length).toFixed(2)) : 0,
            avgPerPeriod: totalPeriods > 0 ? Number((current.totalValue / totalPeriods).toFixed(2)) : 0,
            totalIncidentEvaluations: current.totalIncidentEvaluations,
            ratings: current.ratings,
            incidentScoreAvg: current.totalIncidentEvaluations > 0
                ? Number((current.incidentScoreSum / current.totalIncidentEvaluations).toFixed(2))
                : 0
        }
    }).sort((a, b) => b.totalValue - a.totalValue || a.sector.localeCompare(b.sector))
}

const buildByAgent = (agents, periods, kpisByAgentId) => {
    const expectedPeriods = periods.length

    return agents.map((agent) => {
        const agentKpis = kpisByAgentId.get(String(agent._id)) || []
        const accumulator = createSummaryAccumulator()
        const activitiesMap = new Map()
        const loadedPeriodKeys = new Set()

        agentKpis.forEach((kpi) => {
            loadedPeriodKeys.add(formatPeriodKey({ month: kpi.month, year: kpi.year }))
            accumulateKpi(accumulator, kpi)

            kpi.activities.forEach((activity) => {
                const activityKey = String(activity.activityId)
                if (!activitiesMap.has(activityKey)) {
                    activitiesMap.set(activityKey, {
                        activityId: activity.activityId,
                        name: activity.name,
                        totalValue: 0
                    })
                }

                activity.subactivities.forEach((subactivity) => {
                    activitiesMap.get(activityKey).totalValue += subactivity.value
                })
            })
        })

        const missingPeriods = periods
            .filter((period) => !loadedPeriodKeys.has(formatPeriodKey(period)))
            .map((period) => ({
                month: period.month,
                year: period.year
            }))

        return {
            agentId: agent._id,
            legajo: agent.legajo,
            nombre: agent.nombre,
            apellido: agent.apellido,
            sector: agent.sector,
            totalValue: accumulator.totalValue,
            kpiCount: agentKpis.length,
            expectedKpiCount: expectedPeriods,
            completionRate: expectedPeriods > 0 ? Number((agentKpis.length / expectedPeriods * 100).toFixed(2)) : 0,
            missingPeriods,
            avgPerPeriod: expectedPeriods > 0 ? Number((accumulator.totalValue / expectedPeriods).toFixed(2)) : 0,
            avgPerLoadedPeriod: agentKpis.length > 0 ? Number((accumulator.totalValue / agentKpis.length).toFixed(2)) : 0,
            totalIncidentEvaluations: accumulator.totalIncidentEvaluations,
            ratings: accumulator.ratings,
            incidentScoreAvg: accumulator.totalIncidentEvaluations > 0
                ? Number((accumulator.incidentScoreSum / accumulator.totalIncidentEvaluations).toFixed(2))
                : 0,
            activities: [...activitiesMap.values()].sort((a, b) => b.totalValue - a.totalValue || a.name.localeCompare(b.name))
        }
    }).sort((a, b) => b.totalValue - a.totalValue || a.apellido.localeCompare(b.apellido) || a.nombre.localeCompare(b.nombre))
}

const buildIncidentAnalytics = (kpis, periods) => {
    const incidentMap = new Map()

    kpis.forEach((kpi) => {
        const periodKey = formatPeriodKey({ month: kpi.month, year: kpi.year })
        kpi.incidents.forEach((incident) => {
            const incidentKey = String(incident.incidentId)
            if (!incidentMap.has(incidentKey)) {
                incidentMap.set(incidentKey, {
                    incidentId: incident.incidentId,
                    name: incident.name,
                    description: incident.description,
                    scope: incident.scope,
                    sectorId: incident.sectorId,
                    totalEvaluations: 0,
                    ratings: createEmptyRatingCounts(),
                    scoreSum: 0,
                    byPeriod: new Map()
                })
            }

            const current = incidentMap.get(incidentKey)
            current.totalEvaluations += 1
            current.ratings[incident.ratingType] += 1
            current.scoreSum += INCIDENT_SCORE_MAP[incident.ratingType] || 0

            if (!current.byPeriod.has(periodKey)) {
                current.byPeriod.set(periodKey, {
                    month: kpi.month,
                    year: kpi.year,
                    totalEvaluations: 0,
                    ratings: createEmptyRatingCounts(),
                    scoreSum: 0
                })
            }

            const currentPeriod = current.byPeriod.get(periodKey)
            currentPeriod.totalEvaluations += 1
            currentPeriod.ratings[incident.ratingType] += 1
            currentPeriod.scoreSum += INCIDENT_SCORE_MAP[incident.ratingType] || 0
        })
    })

    return [...incidentMap.values()].map((incident) => ({
        incidentId: incident.incidentId,
        name: incident.name,
        description: incident.description,
        scope: incident.scope,
        sectorId: incident.sectorId,
        totalEvaluations: incident.totalEvaluations,
        ratings: incident.ratings,
        incidentScoreAvg: incident.totalEvaluations > 0
            ? Number((incident.scoreSum / incident.totalEvaluations).toFixed(2))
            : 0,
        byPeriod: periods.map((period) => {
            const item = incident.byPeriod.get(formatPeriodKey(period))
            if (!item) {
                return {
                    month: period.month,
                    year: period.year,
                    totalEvaluations: 0,
                    ratings: createEmptyRatingCounts(),
                    incidentScoreAvg: 0
                }
            }

            return {
                month: item.month,
                year: item.year,
                totalEvaluations: item.totalEvaluations,
                ratings: item.ratings,
                incidentScoreAvg: item.totalEvaluations > 0
                    ? Number((item.scoreSum / item.totalEvaluations).toFixed(2))
                    : 0
            }
        })
    })).sort((a, b) => b.totalEvaluations - a.totalEvaluations || a.name.localeCompare(b.name))
}

const buildHeatmap = (kpis, periods) => {
    const rowsMap = new Map()

    kpis.forEach((kpi) => {
        const periodKey = formatPeriodKey({ month: kpi.month, year: kpi.year })
        kpi.activities.forEach((activity) => {
            activity.subactivities.forEach((subactivity) => {
                const rowKey = `${activity.activityId}:${subactivity.subactivityId}`
                if (!rowsMap.has(rowKey)) {
                    rowsMap.set(rowKey, {
                        activityId: activity.activityId,
                        activityName: activity.name,
                        subactivityId: subactivity.subactivityId,
                        subactivityName: subactivity.name,
                        periods: new Map()
                    })
                }
                const row = rowsMap.get(rowKey)
                row.periods.set(periodKey, (row.periods.get(periodKey) || 0) + subactivity.value)
            })
        })
    })

    return [...rowsMap.values()].map((row) => ({
        activityId: row.activityId,
        activityName: row.activityName,
        subactivityId: row.subactivityId,
        subactivityName: row.subactivityName,
        values: periods.map((period) => ({
            month: period.month,
            year: period.year,
            value: row.periods.get(formatPeriodKey(period)) || 0
        }))
    })).sort((a, b) => a.activityName.localeCompare(b.activityName) || a.subactivityName.localeCompare(b.subactivityName))
}

const buildComparison = (currentKpis, previousKpis, totalCurrentAgents, totalPreviousAgents) => {
    const currentAccumulator = createSummaryAccumulator()
    const previousAccumulator = createSummaryAccumulator()

    currentKpis.forEach((kpi) => accumulateKpi(currentAccumulator, kpi))
    previousKpis.forEach((kpi) => accumulateKpi(previousAccumulator, kpi))

    const current = finalizeSummary(currentAccumulator, totalCurrentAgents, currentKpis.length)
    const previous = finalizeSummary(previousAccumulator, totalPreviousAgents, previousKpis.length)

    return {
        current,
        previous,
        delta: {
            totalValue: current.totalValue - previous.totalValue,
            avgPerAgent: Number((current.avgPerAgent - previous.avgPerAgent).toFixed(2)),
            agentsWithKpi: current.agentsWithKpi - previous.agentsWithKpi,
            agentsWithoutKpi: current.agentsWithoutKpi - previous.agentsWithoutKpi,
            totalIncidentEvaluations: current.totalIncidentEvaluations - previous.totalIncidentEvaluations,
            incidentScoreAvg: Number((current.incidentScoreAvg - previous.incidentScoreAvg).toFixed(2))
        }
    }
}

export const getKpiDashboardService = async (query, user) => {
    const filters = normalizeFilters(query, user)
    const agents = await buildAgentFilters(filters, user)

    if (agents.length === 0) {
        return {
            filters: {
                mode: filters.mode,
                sector: filters.sector,
                agentId: filters.agentId,
                periods: filters.periods,
                previousPeriods: filters.previousPeriods
            },
            summary: finalizeSummary(createSummaryAccumulator(), 0, 0),
            comparison: buildComparison([], [], 0, 0),
            coverage: {
                totalAgents: 0,
                periods: filters.periods,
                expectedAssignments: 0,
                loadedAssignments: 0,
                missingAssignments: 0
            },
            trend: [],
            bySector: [],
            byActivity: [],
            byAgent: [],
            incidentAnalytics: [],
            heatmap: []
        }
    }

    const [currentKpis, previousKpis] = await Promise.all([
        Kpi.find(buildKpiFilters(agents, filters.periods)).sort({ year: 1, month: 1 }).lean(),
        Kpi.find(buildKpiFilters(agents, filters.previousPeriods)).sort({ year: 1, month: 1 }).lean()
    ])

    const agentsById = new Map(agents.map((agent) => [String(agent._id), agent]))
    const currentKpisByPeriodKey = new Map()
    const currentKpisByAgentId = new Map()
    const summaryAccumulator = createSummaryAccumulator()

    currentKpis.forEach((kpi) => {
        const periodKey = formatPeriodKey({ month: kpi.month, year: kpi.year })
        if (!currentKpisByPeriodKey.has(periodKey)) {
            currentKpisByPeriodKey.set(periodKey, [])
        }
        currentKpisByPeriodKey.get(periodKey).push(kpi)

        const agentKey = String(kpi.agentId)
        if (!currentKpisByAgentId.has(agentKey)) {
            currentKpisByAgentId.set(agentKey, [])
        }
        currentKpisByAgentId.get(agentKey).push(kpi)

        accumulateKpi(summaryAccumulator, kpi)
    })

    const loadedAgentsCount = currentKpisByAgentId.size

    return {
        filters: {
            mode: filters.mode,
            sector: filters.sector,
            agentId: filters.agentId,
            periods: filters.periods,
            previousPeriods: filters.previousPeriods
        },
        summary: finalizeSummary(summaryAccumulator, agents.length, loadedAgentsCount),
        comparison: buildComparison(currentKpis, previousKpis, agents.length, agents.length),
        coverage: {
            totalAgents: agents.length,
            periods: filters.periods,
            expectedAssignments: agents.length * filters.periods.length,
            loadedAssignments: currentKpis.length,
            missingAssignments: (agents.length * filters.periods.length) - currentKpis.length
        },
        trend: buildPeriodMetrics(filters.periods, currentKpisByPeriodKey, agents.length),
        bySector: buildBySector(currentKpis, agentsById, filters.periods.length),
        byActivity: buildByActivity(currentKpis, loadedAgentsCount),
        byAgent: buildByAgent(agents, filters.periods, currentKpisByAgentId),
        incidentAnalytics: buildIncidentAnalytics(currentKpis, filters.periods),
        heatmap: buildHeatmap(currentKpis, filters.periods)
    }
}
