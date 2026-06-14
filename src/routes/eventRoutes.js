import express from "express";
import Event from "../models/eventModel.js";
import { verifyTokenMiddleware, requireRoles } from "../middlewares/verifyTokenMiddleware.js";

const router = express.Router();

// Aplicamos la verificación de token a TODO el enrutador. 
// Nadie que no esté logueado en Firebase puede tocar este archivo.
router.use(verifyTokenMiddleware);

// 1️⃣ CREAR UN NUEVO EVENTO (POST /api/events)
// Usamos requireRoles para que SOLO el "administrador" y el "encargado" puedan agendar eventos
router.post("/", requireRoles(["administrador", "encargado"]), async (req, res) => {
    try {
        const { title, description, fechaEvento, horaEvento, type } = req.body;

        if (!title || !fechaEvento || !horaEvento) {
            return res.status(400).json({ success: false, message: "Título, fecha y hora son obligatorios." });
        }

        const newEvent = new Event({
            title,
            description,
            fechaEvento,
            horaEvento,
            type,
            // 🎯 CAPTURA AUTOMÁTICA Y SEGURA: Guardamos el nombre del usuario logueado en la BD
            createdBy: req.user?.name || "Usuario" 
        });

        await newEvent.save();
        res.status(201).json({ success: true, data: newEvent, message: "Evento programado con éxito." });
    } catch (error) {
        console.error("🚨 Error al crear evento:", error);
        res.status(500).json({ success: false, message: "Error interno del servidor al guardar el evento." });
    }
});

// 2️⃣ OBTENER EVENTOS (GET /api/events)
// Cualquiera que esté logueado (admin, encargado o subordinado si existiera) puede ver la agenda
router.get("/", async (req, res) => {
    try {
        const { all } = req.query;
        let query = {};

        if (all !== "true") {
            // Buscamos la fecha local de hoy basada en tu zona horaria (Argentina - ART)
            const hoy = new Date();
            const fechaHoyString = hoy.toLocaleDateString("en-CA"); // Escupe "YYYY-MM-DD" perfecto
            
            query = { fechaEvento: { $gte: fechaHoyString } };
        }

        const events = await Event.find(query).sort({ fechaEvento: 1, horaEvento: 1 });
        
        res.status(200).json({ success: true, data: events });
    } catch (error) {
        console.error("🚨 Error al obtener eventos:", error);
        res.status(500).json({ success: false, message: "Error al obtener los eventos de la base de datos." });
    }
});

// 3️⃣ ELIMINAR UN EVENTO (DELETE /api/events/:id)
// Al igual que la creación, solo roles jerárquicos limpian la agenda
router.delete("/:id", requireRoles(["administrador", "encargado"]), async (req, res) => {
    try {
        const { id } = req.params;
        const deletedEvent = await Event.findByIdAndDelete(id);

        if (!deletedEvent) {
            return res.status(404).json({ success: false, message: "El evento no existe." });
        }

        res.status(200).json({ success: true, message: "Evento eliminado correctamente de la agenda." });
    } catch (error) {
        console.error("Error al eliminar evento:", error);
        res.status(500).json({ success: false, message: "Error al intentar eliminar el evento." });
    }
});

export default router;