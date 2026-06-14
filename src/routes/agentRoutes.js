import express from "express"
import {
    getAgents,
    createAgent,
    updateAgent,
    deleteAgent,
    getAgentsByManager
} from "../controllers/agentController.js" // <-- Ahora sí coinciden los nombres
import { verifyTokenMiddleware, requireRoles, requireSector } from "../middlewares/verifyTokenMiddleware.js"

const agentRouter = express.Router()

agentRouter.use(verifyTokenMiddleware)
agentRouter.use(requireSector)

agentRouter.get("/", requireRoles(["administrador", "encargado"]), getAgents)
agentRouter.post("/", requireRoles(["encargado"]), createAgent)
agentRouter.patch("/:id", requireRoles(["encargado"]), updateAgent)
agentRouter.delete("/:id", requireRoles(["encargado"]), deleteAgent)
agentRouter.get("/by-manager/:managerId", requireRoles(["administrador"]), getAgentsByManager)

export default agentRouter