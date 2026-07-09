import express from "express"
import {
    createSubactivity,
    getSubactivities,
    updateSubactivity
} from "../controllers/subactivityController.js"
import {
    requireOperationalUser,
    requireRoles,
    verifyTokenMiddleware
} from "../middlewares/verifyTokenMiddleware.js"

const subactivityRouter = express.Router()

subactivityRouter.use(verifyTokenMiddleware)
subactivityRouter.use(requireOperationalUser)
subactivityRouter.use(requireRoles(["administrador", "encargado"]))

subactivityRouter.get("/", getSubactivities)
subactivityRouter.post("/", createSubactivity)
subactivityRouter.patch("/:id", updateSubactivity)

export default subactivityRouter
