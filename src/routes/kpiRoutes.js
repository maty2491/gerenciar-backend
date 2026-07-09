import express from "express"
import {
    getKpiById,
    getKpiDashboard,
    getKpis,
    getKpiSnapshot,
    saveKpi
} from "../controllers/kpiController.js"
import {
    requireOperationalUser,
    requireRoles,
    verifyTokenMiddleware
} from "../middlewares/verifyTokenMiddleware.js"

const kpiRouter = express.Router()

kpiRouter.use(verifyTokenMiddleware)
kpiRouter.use(requireOperationalUser)
kpiRouter.use(requireRoles(["administrador", "encargado"]))

kpiRouter.get("/dashboard", getKpiDashboard)
kpiRouter.get("/snapshot", getKpiSnapshot)
kpiRouter.get("/", getKpis)
kpiRouter.get("/:id", getKpiById)
kpiRouter.post("/", saveKpi)

export default kpiRouter
