import express from "express"
import Event from "../models/eventModel.js"
import { verifyTokenMiddleware, requireOperationalUser, requireRoles } from "../middlewares/verifyTokenMiddleware.js"
import { validateObjectId } from "../utils/validateObjectId.js"

const router = express.Router()

router.use(verifyTokenMiddleware)

router.post("/", requireOperationalUser, requireRoles(["administrador", "encargado"]), async (req, res) => {
    try {
        const { title, description, eventDateTime, type, visibilityType = "public", visibleSectors = [] } = req.body

        if (!title || !eventDateTime) {
            return res.status(400).json({ success: false, message: "Titulo y fecha son obligatorios." })
        }

        if (visibilityType === "private" && (!Array.isArray(visibleSectors) || visibleSectors.length === 0)) {
            return res.status(400).json({ success: false, message: "Debe indicar al menos un sector para eventos privados." })
        }

        const normalizedVisibleSectors = visibilityType === "private"
            ? visibleSectors.map((sector) => sector.toLowerCase().trim())
            : []

        if (req.user.role === "encargado" && visibilityType === "private" && normalizedVisibleSectors.some((sector) => sector !== req.user.sector)) {
            return res.status(403).json({ success: false, message: "Solo puedes crear eventos privados para tu propio sector." })
        }

        const newEvent = new Event({
            title,
            description,
            eventDateTime,
            type,
            visibilityType,
            visibleSectors: normalizedVisibleSectors,
            createdBy: `${req.user?.name || ""} ${req.user?.lastName || ""}`.trim() || "Usuario",
            createdById: req.user?._id
        })

        await newEvent.save()
        res.status(201).json({ success: true, data: newEvent, message: "Evento programado con exito." })
    } catch (error) {
        res.status(500).json({ success: false, message: "Error interno del servidor al guardar el evento.", error: error.message })
    }
})

router.get("/", async (req, res) => {
    try {
        if (req.user.role === "general") {
            return res.status(403).json({ success: false, message: "Solicite su sector al administrador" })
        }

        const { all } = req.query
        const query = {}

        if (req.user.role !== "administrador") {
            query.$or = [
                { visibilityType: "public" },
                { visibilityType: "private", visibleSectors: req.user.sector }
            ]
        }

        if (all !== "true") {
            query.eventDateTime = { $gte: new Date() }
        }

        const events = await Event.find(query).sort({ eventDateTime: 1 })
        res.status(200).json({ success: true, data: events })
    } catch (error) {
        res.status(500).json({ success: false, message: "Error al obtener los eventos de la base de datos.", error: error.message })
    }
})

router.delete("/:id", requireOperationalUser, requireRoles(["administrador", "encargado"]), async (req, res) => {
    try {
        validateObjectId(req.params.id, "ID de evento")
        const deletedEvent = await Event.findByIdAndDelete(req.params.id)

        if (!deletedEvent) {
            return res.status(404).json({ success: false, message: "El evento no existe." })
        }

        res.status(200).json({ success: true, message: "Evento eliminado correctamente de la agenda." })
    } catch (error) {
        res.status(error.statusCode || 500).json({ success: false, message: "Error al intentar eliminar el evento.", error: error.message })
    }
})

export default router
