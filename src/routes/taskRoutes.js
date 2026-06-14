
import express from "express"
import { createTaskRecord, getTaskHistoryByAgent, getTaskAnalytics } from "../controllers/taskController.js"
import { verifyTokenMiddleware, requireRoles, requireSector } from "../middlewares/verifyTokenMiddleware.js"

const taskRouter = express.Router()

// 1. Primero validamos que el usuario esté logueado con Firebase
taskRouter.use(verifyTokenMiddleware)

// 2. Registrar una métrica: Permitimos tanto a administrador como a encargado
taskRouter.post("/record", requireRoles(["administrador", "encargado"]), createTaskRecord)

// 3. 📈 NUEVA RUTA DE ANALÍTICAS: Va acá arriba para ganarle al parámetro dinámico
taskRouter.get("/analytics", requireRoles(["administrador", "encargado"]), getTaskAnalytics)

// 4. Ver el historial de un empleado: Ambos roles pueden (Queda abajo de todo)
taskRouter.get("/history/:agentId", requireRoles(["administrador", "encargado"]), getTaskHistoryByAgent)

export default taskRouter