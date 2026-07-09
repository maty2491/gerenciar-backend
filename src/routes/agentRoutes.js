import express from "express"
import {
    getAgents,
    createAgent,
    updateAgent,
    deleteAgent,
    getAgentsByManager,
    getHierarchy,
    reassignAgent,
    deactivateAgent
} from "../controllers/agentController.js"
import { verifyTokenMiddleware, requireOperationalUser, requireRoles, requireSector } from "../middlewares/verifyTokenMiddleware.js"

const agentRouter = express.Router()

agentRouter.use(verifyTokenMiddleware)
agentRouter.use(requireOperationalUser)
agentRouter.use(requireSector)

agentRouter.get("/", requireRoles(["administrador", "encargado"]), getAgents)
agentRouter.get("/hierarchy", requireRoles(["administrador"]), getHierarchy)
agentRouter.get("/by-manager/:managerId", requireRoles(["administrador", "encargado"]), getAgentsByManager)
agentRouter.post("/", requireRoles(["encargado"]), createAgent)
agentRouter.patch("/:id", requireRoles(["encargado"]), updateAgent)
agentRouter.patch("/:id/reassign", requireRoles(["administrador"]), reassignAgent)
agentRouter.patch("/:id/deactivate", requireRoles(["administrador", "encargado"]), deactivateAgent)
agentRouter.delete("/:id", requireRoles(["administrador", "encargado"]), deleteAgent)

export default agentRouter
