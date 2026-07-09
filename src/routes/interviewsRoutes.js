import express from "express"
import {
    createInterview,
    getInterviews,
    updateInterview,
    deleteInterview
} from "../controllers/interviewController.js"
import { verifyTokenMiddleware, requireAdmin, requireOperationalUser } from "../middlewares/verifyTokenMiddleware.js"

const interviewRouter = express.Router()

interviewRouter.use(verifyTokenMiddleware)
interviewRouter.get("/", requireOperationalUser, getInterviews)
interviewRouter.post("/", requireAdmin, createInterview)
interviewRouter.put("/:id", requireAdmin, updateInterview)
interviewRouter.delete("/:id", requireAdmin, deleteInterview)

export default interviewRouter
