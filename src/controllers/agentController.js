import Agent from "../models/agentModel.js"
import User from "../models/userModel.js"
import { validateObjectId } from "../utils/validateObjectId.js"
import { OPERATIVE_SECTORS } from "../constants/sectors.js"

const getManagerBySector = async (sector) => {
    return User.findOne({ role: "encargado", sector, status: "activo" })
}

export const getAgents = async (req, res) => {
    try {
        const query = req.user.role === "encargado"
            ? { sector: req.user.sector, encargadoId: req.user._id, status: "activo" }
            : { status: "activo" }

        const agents = await Agent.find(query).sort({ apellido: 1, nombre: 1 })
        return res.status(200).json(agents)
    } catch (error) {
        return res.status(500).json({ message: error.message })
    }
}

export const createAgent = async (req, res) => {
    try {
        const { legajo, nombre, apellido } = req.body

        const nuevoAgente = new Agent({
            legajo,
            nombre,
            apellido,
            sector: req.user.sector,
            encargadoId: req.user._id,
            creadoPor: req.user._id,
            status: "activo"
        })

        await nuevoAgente.save()
        return res.status(201).json(nuevoAgente)
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ message: "El legajo ya se encuentra registrado." })
        }
        return res.status(500).json({ message: error.message })
    }
}

export const updateAgent = async (req, res) => {
    try {
        const { id } = req.params
        validateObjectId(id, "ID de agente")

        const allowedFields = ["legajo", "nombre", "apellido"]
        const camposAActualizar = Object.fromEntries(
            Object.entries(req.body).filter(([key]) => allowedFields.includes(key))
        )

        if (Object.keys(camposAActualizar).length === 0) {
            return res.status(400).json({ message: "No hay campos validos para actualizar." })
        }

        const query = req.user.role === "encargado"
            ? { _id: id, sector: req.user.sector, encargadoId: req.user._id, status: "activo" }
            : { _id: id, status: "activo" }

        const agenteActualizado = await Agent.findOneAndUpdate(
            query,
            { $set: camposAActualizar },
            { new: true, runValidators: true }
        )

        if (!agenteActualizado) {
            return res.status(404).json({ message: "Agente no encontrado o no pertenece a tu sector." })
        }

        return res.status(200).json(agenteActualizado)
    } catch (error) {
        return res.status(error.statusCode || 500).json({ message: error.message })
    }
}

export const deactivateAgent = async (req, res) => {
    try {
        validateObjectId(req.params.id, "ID de agente")

        const query = req.user.role === "encargado"
            ? { _id: req.params.id, sector: req.user.sector, encargadoId: req.user._id }
            : { _id: req.params.id }

        const agent = await Agent.findOneAndUpdate(
            query,
            { $set: { status: "desvinculado" } },
            { new: true, runValidators: true }
        )

        if (!agent) {
            return res.status(404).json({ message: "Agente no encontrado o no pertenece a tu sector." })
        }

        return res.status(200).json({ message: "Agente desvinculado correctamente.", data: agent })
    } catch (error) {
        return res.status(error.statusCode || 500).json({ message: error.message })
    }
}

export const deleteAgent = async (req, res) => {
    return deactivateAgent(req, res)
}

export const reassignAgent = async (req, res) => {
    try {
        validateObjectId(req.params.id, "ID de agente")
        const { sector } = req.body
        const normalizedSector = sector?.toLowerCase().trim()

        if (!OPERATIVE_SECTORS.includes(normalizedSector)) {
            return res.status(400).json({ message: "Sector invalido." })
        }

        const newManager = await getManagerBySector(normalizedSector)
        if (!newManager) {
            return res.status(400).json({ message: `El sector ${normalizedSector} no tiene un encargado activo asignado.` })
        }

        const query = req.user.role === "encargado"
            ? { _id: req.params.id, sector: req.user.sector, encargadoId: req.user._id, status: "activo" }
            : { _id: req.params.id, status: "activo" }

        const agent = await Agent.findOneAndUpdate(
            query,
            { $set: { sector: normalizedSector, encargadoId: newManager._id } },
            { new: true, runValidators: true }
        )

        if (!agent) {
            return res.status(404).json({ message: "Agente no encontrado o no pertenece a tu sector." })
        }

        return res.status(200).json({
            message: "Agente reasignado correctamente.",
            data: agent
        })
    } catch (error) {
        return res.status(error.statusCode || 500).json({ message: error.message })
    }
}

export const getAgentsByManager = async (req, res) => {
    try {
        validateObjectId(req.params.managerId, "ID de encargado")

        const managerQuery = req.user.role === "encargado"
            ? { _id: req.user._id, role: "encargado", status: "activo" }
            : { _id: req.params.managerId, role: "encargado", status: "activo" }

        const manager = await User.findOne(managerQuery)
        if (!manager) {
            return res.status(404).json({ message: "Encargado no encontrado." })
        }

        const agents = await Agent.find({ encargadoId: manager._id, sector: manager.sector, status: "activo" }).sort({ apellido: 1, nombre: 1 })

        return res.status(200).json({
            sector: manager.sector,
            encargado: manager,
            agents
        })
    } catch (error) {
        return res.status(error.statusCode || 500).json({ message: "Error al obtener los agentes", error: error.message })
    }
}

export const getHierarchy = async (req, res) => {
    try {
        const requestedSector = req.query.sector?.toLowerCase().trim()

        if (requestedSector && !OPERATIVE_SECTORS.includes(requestedSector)) {
            return res.status(400).json({ message: "Sector invalido." })
        }

        const sectors = requestedSector ? [requestedSector] : OPERATIVE_SECTORS

        const hierarchy = await Promise.all(
            sectors.map(async (sector) => {
                const manager = await User.findOne({ role: "encargado", sector, status: "activo" }).sort({ lastName: 1, name: 1 })
                const agents = await Agent.find({ sector, status: "activo" }).sort({ apellido: 1, nombre: 1 })
                return {
                    sector,
                    encargado: manager,
                    agents
                }
            })
        )

        return res.status(200).json(hierarchy)
    } catch (error) {
        return res.status(500).json({ message: "Error al obtener jerarquia", error: error.message })
    }
}
