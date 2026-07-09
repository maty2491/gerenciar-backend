import express from "express"
import {
    assignManagerToSector,
    createUser,
    deactivateUser,
    deleteUser,
    getCurrentUser,
    getUser,
    getUserById,
    logout,
    updateUser
} from "../controllers/userController.js"
import { requireAdmin, requireAdminOrSelf, verifyTokenMiddleware } from "../middlewares/verifyTokenMiddleware.js"

const userRouter = express.Router()

userRouter.use(verifyTokenMiddleware)

userRouter.get("/me", getCurrentUser)
userRouter.post("/", requireAdmin, createUser)
userRouter.post("/logout", logout)
userRouter.get("/", getUser)
userRouter.get("/:id", getUserById)
userRouter.patch("/:id", requireAdminOrSelf, updateUser)
userRouter.patch("/:id/assign-sector", requireAdmin, assignManagerToSector)
userRouter.patch("/:id/deactivate", requireAdmin, deactivateUser)
userRouter.delete("/:id", requireAdmin, deleteUser)

export default userRouter
