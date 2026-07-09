import express from "express"
import {
    getRepositories,
    createRepository,
    updateRepository,
    deleteRepository
} from "../controllers/repositoryController.js"
import { verifyTokenMiddleware, requireAdmin } from "../middlewares/verifyTokenMiddleware.js"

const repositoryRouter = express.Router()

repositoryRouter.use(verifyTokenMiddleware)

repositoryRouter.get("/", getRepositories)
repositoryRouter.post("/", requireAdmin, createRepository)
repositoryRouter.patch("/:id", requireAdmin, updateRepository)
repositoryRouter.delete("/:id", requireAdmin, deleteRepository)

export default repositoryRouter
