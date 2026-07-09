import express from "express"
import {
    createIncident,
    deleteIncident,
    getIncidents,
    updateIncident
} from "../controllers/incidentController.js"
import {
    requireOperationalUser,
    requireRoles,
    verifyTokenMiddleware
} from "../middlewares/verifyTokenMiddleware.js"

const incidentRouter = express.Router()

incidentRouter.use(verifyTokenMiddleware)
incidentRouter.use(requireOperationalUser)
incidentRouter.use(requireRoles(["administrador", "encargado"]))

incidentRouter.get("/", getIncidents)
incidentRouter.post("/", createIncident)
incidentRouter.patch("/:id", updateIncident)
incidentRouter.delete("/:id", deleteIncident)

export default incidentRouter
