import express from "express"
import {
    approveActivity,
    assignSubactivitiesToActivity,
    createActivity,
    getActivities,
    getActivityById,
    getActivitySubactivityCatalog,
    rejectActivity,
    toggleActivitySubactivityRelation,
    updateActivity
} from "../controllers/activityController.js"
import {
    requireAdmin,
    requireOperationalUser,
    requireRoles,
    verifyTokenMiddleware
} from "../middlewares/verifyTokenMiddleware.js"

const activityRouter = express.Router()

activityRouter.use(verifyTokenMiddleware)
activityRouter.use(requireOperationalUser)
activityRouter.use(requireRoles(["administrador", "encargado"]))

activityRouter.get("/", getActivities)
activityRouter.get("/:id", getActivityById)
activityRouter.get("/:id/subactivities/catalog", getActivitySubactivityCatalog)
activityRouter.post("/", createActivity)
activityRouter.patch("/:id", updateActivity)
activityRouter.patch("/:id/approve", requireAdmin, approveActivity)
activityRouter.patch("/:id/reject", requireAdmin, rejectActivity)
activityRouter.post("/:id/subactivities", assignSubactivitiesToActivity)
activityRouter.patch("/:id/subactivities/:subactivityId", toggleActivitySubactivityRelation)

export default activityRouter
