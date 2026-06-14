import Task from "../models/taskModel.js" // Tu modelo de Mongoose para KPIs
import Agent from "../models/agentModel.js"
import mongoose from "mongoose"

// 1. REGISTRAR UNA MÉTRICA / KPI (Ej: Cédulas realizadas, Embargos)
export const createTaskRecord = async (req, res) => {
    try {
        const { agentId, category, subType, quantity, note } = req.body

        // Validación de seguridad: Verificamos que el agente exista y sea del mismo sector que el encargado
        const agentExists = await Agent.findOne({ _id: agentId })
        if (!agentExists) {
            return res.status(404).json({ message: "Agente no encontrado." })
        }

        if (req.user.role === "encargado" && agentExists.sector !== req.user.sector) {
            return res.status(403).json({ message: "No tienes permisos para registrar tareas a un agente de otro sector." })
        }

        // Creamos el registro amarrándolo al sector automáticamente
        const newTaskRecord = new Task({
            agentId,
            sector: agentExists.sector, // Hereda el sector del agente
            category,
            subType,
            quantity,
            note,
            recordedBy: req.user._id // El ID del Encargado que lo carga
        })

        await newTaskRecord.save()
        return res.status(201).json(newTaskRecord)
    } catch (error) {
        return res.status(500).json({ message: error.message })
    }
}

// 2. OBTENER HISTORIAL DE METRICAS DE UN AGENTE
export const getTaskHistoryByAgent = async (req, res) => {
    try {
        const { agentId } = req.params

        // Validación de seguridad de sector antes de escupir los datos
        const agentExists = await Agent.findById(agentId)
        if (!agentExists) {
            return res.status(404).json({ message: "Agente no encontrado." })
        }

        if (req.user.role === "encargado" && agentExists.sector !== req.user.sector) {
            return res.status(403).json({ message: "Acceso denegado: Este agente pertenece a otro sector." })
        }

        // Si pasa la validación, traemos su histórico ordenado por fecha más reciente
        const history = await Task.find({ agentId }).sort({ createdAt: -1 })
        return res.status(200).json(history)
    } catch (error) {
        return res.status(500).json({ message: error.message })
    }
}

export const getTaskAnalytics = async (req, res) => {
    try {
        const { agents, period } = req.query;

        if (!agents) return res.status(400).json({ message: "Agentes requeridos" });

        const agentIdsArray = agents.split(",").map(id => new mongoose.Types.ObjectId(id.trim()));

        // Configuramos la agrupación usando createdAt (tu campo real)
        let groupFormat = {};
        if (period === "weekly") {
            groupFormat = { week: { $week: "$createdAt" }, year: { $year: "$createdAt" }, agentId: "$agentId" };
        } else if (period === "yearly") {
            groupFormat = { year: { $year: "$createdAt" }, agentId: "$agentId" };
        } else {
            groupFormat = { month: { $month: "$createdAt" }, year: { $year: "$createdAt" }, agentId: "$agentId" };
        }

        const analytics = await mongoose.connection.collection("registrotareas").aggregate([
            { $match: { agentId: { $in: agentIdsArray } } },
            {
                $group: {
                    _id: groupFormat,
                    totalQuantity: { $sum: "$quantity" } // Campo exacto que me pasaste
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
            { $sort: { "_id.year": 1, "_id.month": 1, "_id.week": 1 } }
        ]).toArray();

        return res.status(200).json(analytics);

    } catch (error) {
        console.error("Error en analíticas:", error);
        return res.status(500).json({ message: "Error al obtener analíticas" });
    }
};