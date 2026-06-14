import Interview from "../models/interviewsModel.js";

// 1. Crear una nueva entrevista (Ya lo tenías)
export const createInterview = async (req, res) => {
    try {
        const newInterview = new Interview(req.body);
        const savedInterview = await newInterview.save();
        
        return res.status(201).json({
            success: true,
            data: savedInterview
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Error al registrar la entrevista.",
            error: error.message
        });
    }
};

// 2. Traer todas las entrevistas (Ya lo tenías)
export const getInterviews = async (req, res) => {
    try {
        const interviews = await Interview.find().sort({ fechaEntrevista: 1 });
        
        return res.status(200).json({
            success: true,
            data: interviews
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Error al obtener las entrevistas.",
            error: error.message
        });
    }
};

// 🛠️ 3. Actualizar una entrevista por ID (Para Modificar, Completar o Archivar)
export const updateInterview = async (req, res) => {
    try {
        const { id } = req.params;
        
        // { new: true } devuelve el documento ya modificado; runValidators aplica las reglas del esquema
        const updatedInterview = await Interview.findByIdAndUpdate(id, req.body, { 
            new: true, 
            runValidators: true 
        });

        if (!updatedInterview) {
            return res.status(404).json({
                success: false,
                message: "No se encontró el registro a actualizar."
            });
        }

        return res.status(200).json({
            success: true,
            message: "Registro actualizado correctamente.",
            data: updatedInterview
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Error al actualizar la entrevista.",
            error: error.message
        });
    }
};

// 🛠️ 4. Eliminar físicamente una entrevista de la Base de Datos
export const deleteInterview = async (req, res) => {
    try {
        const { id } = req.params;
        const deletedInterview = await Interview.findByIdAndDelete(id);

        if (!deletedInterview) {
            return res.status(404).json({
                success: false,
                message: "No se encontró el candidato a eliminar."
            });
        }

        return res.status(200).json({
            success: true,
            message: "Candidato eliminado definitivamente de la base de datos."
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Error al eliminar el registro.",
            error: error.message
        });
    }
};