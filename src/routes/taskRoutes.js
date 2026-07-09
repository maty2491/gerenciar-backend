import express from "express"
import {
    createMonthlyPerformance,
    createMonthlyQualitativePerformance,
    getMonthlyPerformanceByAgent,
    getMonthlyQualitativePerformanceByAgent,
    createPerformanceIncident,
    getPerformanceIncidentsByAgent,
    getTaskAnalytics,
    getMonthlyKpiSnapshotByAgent,
    getGroupMonthlyKpiReport
} from "../controllers/taskController.js"
import { verifyTokenMiddleware, requireOperationalUser, requireRoles } from "../middlewares/verifyTokenMiddleware.js"

const taskRouter = express.Router()

taskRouter.use(verifyTokenMiddleware)
taskRouter.use(requireOperationalUser)

taskRouter.post("/monthly", requireRoles(["administrador", "encargado"]), createMonthlyPerformance)
taskRouter.get("/monthly/:agentId", requireRoles(["administrador", "encargado"]), getMonthlyPerformanceByAgent)
taskRouter.get("/monthly/:agentId/snapshot", requireRoles(["administrador", "encargado"]), getMonthlyKpiSnapshotByAgent)
taskRouter.post("/qualitative", requireRoles(["administrador", "encargado"]), createMonthlyQualitativePerformance)
taskRouter.get("/qualitative/:agentId", requireRoles(["administrador", "encargado"]), getMonthlyQualitativePerformanceByAgent)
taskRouter.post("/incidents", requireRoles(["administrador", "encargado"]), createPerformanceIncident)
taskRouter.get("/incidents/:agentId", requireRoles(["administrador", "encargado"]), getPerformanceIncidentsByAgent)
taskRouter.get("/analytics", requireRoles(["administrador", "encargado"]), getTaskAnalytics)
taskRouter.get("/reports/group", requireRoles(["administrador", "encargado"]), getGroupMonthlyKpiReport)

export default taskRouter
