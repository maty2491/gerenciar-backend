import MonthlyPerformance from "../models/taskModel.js"
import PerformanceIncident from "../models/performanceIncidentModel.js"
import MonthlyQualitativePerformance from "../models/monthlyQualitativePerformanceModel.js"
import Agent from "../models/agentModel.js"
import Category from "../models/categoryModel.js"
import mongoose from "mongoose"
import { validateObjectId } from "../utils/validateObjectId.js"

const getAuthorizedAgent = async (agentId, user) => {
    validateObjectId(agentId, "ID de agente")

    const query = user.role === "encargado"
        ? { _id: agentId, sector: user.sector, encargadoId: user._id, status: "activo" }
        : { _id: agentId, status: "activo" }

    const agent = await Agent.findOne(query)
    if (!agent) {
        const error = new Error("Agente no encontrado o no pertenece a tu sector.")
        error.statusCode = 404
        throw error
    }

    return agent
}

const ensureAuthorizedAgentList = async (agentIds, user) => {
    agentIds.forEach((id) => validateObjectId(id, "ID de agente"))

    const objectIds = agentIds.map((id) => new mongoose.Types.ObjectId(id))
    const query = user.role === "encargado"
        ? { _id: { $in: objectIds }, sector: user.sector, encargadoId: user._id, status: "activo" }
        : { _id: { $in: objectIds }, status: "activo" }

    const agents = await Agent.find(query)
    if (agents.length !== objectIds.length) {
        const error = new Error("No tienes permisos para consultar metricas de agentes de otro sector.")
        error.statusCode = 403
        throw error
    }

    return objectIds
}

const QUALITATIVE_VALUES = ["D", "N", "S", "E"]

const normalizeCategoryName = (value = "") => String(value).toLowerCase().trim()

const validatePeriod = (month, year) => {
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

    return { month: normalizedMonth, year: normalizedYear }
}

const getKpiDefinition = async ({ sector, category, metricType }) => {
    const definition = await Category.findOne({
        $or: [{ sector }, { isDefault: true }],
        name: normalizeCategoryName(category),
        metricType,
        active: true
    })

    if (!definition) {
        const error = new Error("El KPI indicado no esta configurado para el sector.")
        error.statusCode = 400
        throw error
    }

    return definition
}

const validateSubType = (definition, subType) => {
    if (!subType) return
    if (definition.subTypes.length === 0) return

    const normalizedSubType = String(subType).trim()
    if (!definition.subTypes.includes(normalizedSubType)) {
        const error = new Error("El subtipo indicado no pertenece al KPI configurado.")
        error.statusCode = 400
        throw error
    }
}

const groupDefinitions = (definitions) => {
    return definitions.reduce((acc, definition) => {
        if (!acc[definition.group]) {
            acc[definition.group] = []
        }

        acc[definition.group].push({
            id: definition._id,
            name: definition.name,
            label: definition.label || definition.name,
            group: definition.group,
            metricType: definition.metricType,
            subTypes: definition.subTypes,
            order: definition.order
        })

        return acc
    }, {})
}

export const createMonthlyPerformance = async (req, res) => {
    try {
        const { agentId, month, year, category, subType, quantity, note } = req.body
        const agent = await getAuthorizedAgent(agentId, req.user)
        const normalizedPeriod = validatePeriod(month, year)
        const definition = await getKpiDefinition({
            sector: agent.sector,
            category,
            metricType: "numeric"
        })
        validateSubType(definition, subType)

        const payload = {
            agentId,
            encargadoId: agent.encargadoId,
            sector: agent.sector,
            month: normalizedPeriod.month,
            year: normalizedPeriod.year,
            category: definition.name,
            subType,
            quantity,
            note,
            recordedBy: req.user._id
        }

        const performance = await MonthlyPerformance.findOneAndUpdate(
            {
                agentId,
                month: normalizedPeriod.month,
                year: normalizedPeriod.year,
                category: definition.name,
                subType: subType || null
            },
            payload,
            {
                upsert: true,
                new: true,
                runValidators: true,
                setDefaultsOnInsert: true
            }
        )

        return res.status(201).json(performance)
    } catch (error) {
        return res.status(error.statusCode || 500).json({ message: error.message })
    }
}

export const createMonthlyQualitativePerformance = async (req, res) => {
    try {
        const { agentId, month, year, category, value, note } = req.body
        const agent = await getAuthorizedAgent(agentId, req.user)
        const normalizedPeriod = validatePeriod(month, year)
        const definition = await getKpiDefinition({
            sector: agent.sector,
            category,
            metricType: "qualitative"
        })

        const normalizedValue = String(value || "").trim().toUpperCase()
        if (!QUALITATIVE_VALUES.includes(normalizedValue)) {
            return res.status(400).json({ message: "Valor cualitativo invalido. Use D, N, S o E." })
        }

        const qualitativeMetric = await MonthlyQualitativePerformance.findOneAndUpdate(
            {
                agentId,
                month: normalizedPeriod.month,
                year: normalizedPeriod.year,
                category: definition.name
            },
            {
                agentId,
                encargadoId: agent.encargadoId,
                sector: agent.sector,
                month: normalizedPeriod.month,
                year: normalizedPeriod.year,
                category: definition.name,
                value: normalizedValue,
                note,
                recordedBy: req.user._id
            },
            {
                upsert: true,
                new: true,
                runValidators: true,
                setDefaultsOnInsert: true
            }
        )

        return res.status(201).json(qualitativeMetric)
    } catch (error) {
        return res.status(error.statusCode || 500).json({ message: error.message })
    }
}

export const getMonthlyPerformanceByAgent = async (req, res) => {
    try {
        const { agentId } = req.params
        await getAuthorizedAgent(agentId, req.user)

        const query = { agentId }
        if (req.query.month) query.month = Number(req.query.month)
        if (req.query.year) query.year = Number(req.query.year)

        const history = await MonthlyPerformance.find(query).sort({ year: -1, month: -1, category: 1, subType: 1 })
        return res.status(200).json(history)
    } catch (error) {
        return res.status(error.statusCode || 500).json({ message: error.message })
    }
}

export const getMonthlyQualitativePerformanceByAgent = async (req, res) => {
    try {
        const { agentId } = req.params
        await getAuthorizedAgent(agentId, req.user)

        const query = { agentId }
        if (req.query.month) query.month = Number(req.query.month)
        if (req.query.year) query.year = Number(req.query.year)

        const history = await MonthlyQualitativePerformance.find(query).sort({ year: -1, month: -1, category: 1 })
        return res.status(200).json(history)
    } catch (error) {
        return res.status(error.statusCode || 500).json({ message: error.message })
    }
}

export const createPerformanceIncident = async (req, res) => {
    try {
        const { agentId, date, incidentType, observation } = req.body
        const agent = await getAuthorizedAgent(agentId, req.user)

        const incident = new PerformanceIncident({
            agentId,
            encargadoId: agent.encargadoId,
            sector: agent.sector,
            date,
            incidentType,
            observation,
            recordedBy: req.user._id
        })

        await incident.save()
        return res.status(201).json(incident)
    } catch (error) {
        return res.status(error.statusCode || 500).json({ message: error.message })
    }
}

export const getPerformanceIncidentsByAgent = async (req, res) => {
    try {
        const { agentId } = req.params
        await getAuthorizedAgent(agentId, req.user)

        const incidents = await PerformanceIncident.find({ agentId }).sort({ date: -1 })
        return res.status(200).json(incidents)
    } catch (error) {
        return res.status(error.statusCode || 500).json({ message: error.message })
    }
}

export const getMonthlyKpiSnapshotByAgent = async (req, res) => {
    try {
        const { agentId } = req.params
        const { month, year } = req.query
        const agent = await getAuthorizedAgent(agentId, req.user)
        const normalizedPeriod = validatePeriod(month, year)

        const [definitions, numericMetrics, qualitativeMetrics, incidents] = await Promise.all([
            Category.find({
                $or: [{ sector: agent.sector }, { isDefault: true }],
                active: true
            }).sort({ group: 1, order: 1, name: 1 }),
            MonthlyPerformance.find({
                agentId,
                month: normalizedPeriod.month,
                year: normalizedPeriod.year
            }).sort({ category: 1, subType: 1 }),
            MonthlyQualitativePerformance.find({
                agentId,
                month: normalizedPeriod.month,
                year: normalizedPeriod.year
            }).sort({ category: 1 }),
            PerformanceIncident.find({
                agentId,
                date: {
                    $gte: new Date(normalizedPeriod.year, normalizedPeriod.month - 1, 1),
                    $lt: new Date(normalizedPeriod.year, normalizedPeriod.month, 1)
                }
            }).sort({ date: -1 })
        ])

        return res.status(200).json({
            agent,
            period: normalizedPeriod,
            catalog: groupDefinitions(definitions),
            metrics: numericMetrics,
            qualitative: qualitativeMetrics,
            incidents
        })
    } catch (error) {
        return res.status(error.statusCode || 500).json({ message: error.message })
    }
}

export const getGroupMonthlyKpiReport = async (req, res) => {
    try {
        const { month, year, agentIds } = req.query
        const normalizedPeriod = validatePeriod(month, year)

        let resolvedAgentIds = []
        if (agentIds) {
            const parsedAgentIds = agentIds.split(",").map((id) => id.trim()).filter(Boolean)
            resolvedAgentIds = await ensureAuthorizedAgentList(parsedAgentIds, req.user)
        } else {
            const query = req.user.role === "encargado"
                ? { sector: req.user.sector, encargadoId: req.user._id, status: "activo" }
                : { status: "activo" }

            const agents = await Agent.find(query).sort({ apellido: 1, nombre: 1 })
            resolvedAgentIds = agents.map((agent) => agent._id)
        }

        const agents = await Agent.find({ _id: { $in: resolvedAgentIds } }).sort({ apellido: 1, nombre: 1 })
        const agentSectors = [...new Set(agents.map((agent) => agent.sector))]

        const [definitions, numericMetrics, qualitativeMetrics] = await Promise.all([
            Category.find({
                $or: [
                    { sector: { $in: agentSectors } },
                    { isDefault: true }
                ],
                active: true
            }).sort({ sector: 1, group: 1, order: 1, name: 1 }),
            MonthlyPerformance.find({
                agentId: { $in: resolvedAgentIds },
                month: normalizedPeriod.month,
                year: normalizedPeriod.year
            }).sort({ category: 1, subType: 1 }),
            MonthlyQualitativePerformance.find({
                agentId: { $in: resolvedAgentIds },
                month: normalizedPeriod.month,
                year: normalizedPeriod.year
            }).sort({ category: 1 })
        ])

        const definitionMap = new Map(
            definitions.map((definition) => [`${definition.sector}:${definition.name}:${definition.metricType}`, definition])
        )

        const metricsByAgent = new Map()
        numericMetrics.forEach((metric) => {
            const key = String(metric.agentId)
            if (!metricsByAgent.has(key)) {
                metricsByAgent.set(key, [])
            }
            metricsByAgent.get(key).push(metric)
        })

        const qualitativeByAgent = new Map()
        qualitativeMetrics.forEach((metric) => {
            const key = String(metric.agentId)
            if (!qualitativeByAgent.has(key)) {
                qualitativeByAgent.set(key, [])
            }
            qualitativeByAgent.get(key).push(metric)
        })

        const agentSummaries = agents.map((agent) => {
            const numeric = metricsByAgent.get(String(agent._id)) || []
            const qualitative = qualitativeByAgent.get(String(agent._id)) || []
            const totalsByGroup = numeric.reduce((acc, metric) => {
                const categoryDefinition = definitionMap.get(`${metric.sector}:${metric.category}:numeric`)
                    || definitionMap.get(`general:${metric.category}:numeric`)
                const group = categoryDefinition?.group || "general"
                acc[group] = (acc[group] || 0) + metric.quantity
                return acc
            }, {})

            return {
                agent,
                totals: {
                    overall: numeric.reduce((sum, metric) => sum + metric.quantity, 0),
                    byGroup: totalsByGroup
                },
                metrics: numeric,
                qualitative
            }
        })

        return res.status(200).json({
            period: normalizedPeriod,
            catalog: groupDefinitions(definitions),
            agents: agentSummaries
        })
    } catch (error) {
        return res.status(error.statusCode || 500).json({ message: error.message })
    }
}

export const getTaskAnalytics = async (req, res) => {
    try {
        const { agents, period } = req.query

        if (!agents) return res.status(400).json({ message: "Agentes requeridos" })

        const agentIds = agents.split(",").map((id) => id.trim()).filter(Boolean)
        const agentIdsArray = await ensureAuthorizedAgentList(agentIds, req.user)

        let groupFormat = {}
        if (period === "yearly") {
            groupFormat = { year: "$year", agentId: "$agentId" }
        } else {
            groupFormat = { month: "$month", year: "$year", agentId: "$agentId" }
        }

        const analytics = await MonthlyPerformance.aggregate([
            { $match: { agentId: { $in: agentIdsArray } } },
            {
                $group: {
                    _id: groupFormat,
                    totalQuantity: { $sum: "$quantity" }
                }
            },
            {
                $lookup: {
                    from: "agents",
                    localField: "_id.agentId",
                    foreignField: "_id",
                    as: "agentInfo"
                }
            },
            { $unwind: { path: "$agentInfo", preserveNullAndEmptyArrays: true } },
            { $sort: { "_id.year": 1, "_id.month": 1 } }
        ])

        return res.status(200).json(analytics)
    } catch (error) {
        return res.status(error.statusCode || 500).json({ message: error.message })
    }
}
