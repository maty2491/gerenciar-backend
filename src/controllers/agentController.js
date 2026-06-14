import Agent from "../models/agentModel.js" // O { Agent } según cómo lo hayas solucionado antes

// 1. OBTENER AGENTES (SUBORDINADOS)
export const getAgents = async (req, res) => {
    try {
        let query = {}
        if (req.user.role === "encargado") {
            query.sector = req.user.sector
        }
        const agents = await Agent.find(query)
        return res.status(200).json(agents)
    } catch (error) {
        return res.status(500).json({ message: error.message })
    }
}

// 2. CREAR AGENTE
export const createAgent = async (req, res) => {
    try {
        const { legajo, nombre, apellido } = req.body

        const nuevoAgente = new Agent({
            legajo,
            nombre,
            apellido,
            sector: req.user.sector,
            creadoPor: req.user._id
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

// 3. MODIFICAR AGENTE
export const updateAgent = async (req, res) => {
    try {
        const { id } = req.params
        const camposAActualizar = req.body

        // Si es encargado, nos aseguramos de que solo pueda editar si pertenece a su sector
        let query = { _id: id }
        if (req.user.role === "encargado") {
            query.sector = req.user.sector
        }

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
        return res.status(500).json({ message: error.message })
    }
}

// 4. ELIMINAR AGENTE
export const deleteAgent = async (req, res) => {
    try {
        const { id } = req.params

        let query = { _id: id }
        if (req.user.role === "encargado") {
            query.sector = req.user.sector
        }

        const agenteEliminado = await Agent.findOneAndDelete(query)

        if (!agenteEliminado) {
            return res.status(404).json({ message: "Agente no encontrado o no pertenece a tu sector." })
        }

        return res.status(200).json({ message: "Agente eliminado correctamente." })
    } catch (error) {
        return res.status(500).json({ message: error.message })
    }
}

export const getAgentsByManager = async (req, res) => {
    try {
        // Buscamos los agentes cuyo campo de encargado asignado coincida
        // Nota: Asegúrate de usar el modelo correcto (si es Agent o User)
        const agents = await Agent.find({ encargadoId: req.params.managerId, role: "agente" });
        return res.json(agents);
    } catch (error) {
        return res.status(500).json({ message: "Error al obtener los agentes", error: error.message });
    }
};