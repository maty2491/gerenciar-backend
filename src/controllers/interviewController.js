import Interview from "../models/interviewsModel.js"
import { validateObjectId } from "../utils/validateObjectId.js"

export const createInterview = async (req, res) => {
    try {
        const payload = {
            ...req.body,
            sector: req.body.sector?.toLowerCase().trim()
        }

        const newInterview = new Interview(payload)
        const savedInterview = await newInterview.save()

        return res.status(201).json({
            success: true,
            data: savedInterview
        })
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Error al registrar la entrevista.",
            error: error.message
        })
    }
}

export const getInterviews = async (req, res) => {
    try {
        const query = req.user.role === "administrador"
            ? {}
            : { sector: req.user.sector }

        const interviews = await Interview.find(query).sort({ fechaEntrevista: 1 })

        return res.status(200).json({
            success: true,
            data: interviews
        })
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Error al obtener las entrevistas.",
            error: error.message
        })
    }
}

export const updateInterview = async (req, res) => {
    try {
        const { id } = req.params
        validateObjectId(id, "ID de entrevista")

        const payload = {
            ...req.body,
            ...(req.body.sector ? { sector: req.body.sector.toLowerCase().trim() } : {})
        }

        const updatedInterview = await Interview.findByIdAndUpdate(id, payload, {
            new: true,
            runValidators: true
        })

        if (!updatedInterview) {
            return res.status(404).json({
                success: false,
                message: "No se encontro el registro a actualizar."
            })
        }

        return res.status(200).json({
            success: true,
            message: "Registro actualizado correctamente.",
            data: updatedInterview
        })
    } catch (error) {
        return res.status(error.statusCode || 500).json({
            success: false,
            message: "Error al actualizar la entrevista.",
            error: error.message
        })
    }
}

export const deleteInterview = async (req, res) => {
    try {
        const { id } = req.params
        validateObjectId(id, "ID de entrevista")
        const deletedInterview = await Interview.findByIdAndDelete(id)

        if (!deletedInterview) {
            return res.status(404).json({
                success: false,
                message: "No se encontro el candidato a eliminar."
            })
        }

        return res.status(200).json({
            success: true,
            message: "Candidato eliminado definitivamente de la base de datos."
        })
    } catch (error) {
        return res.status(error.statusCode || 500).json({
            success: false,
            message: "Error al eliminar el registro.",
            error: error.message
        })
    }
}
