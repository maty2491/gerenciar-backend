import {
    assignManagerToSectorService,
    createUserService,
    deactivateUserService,
    deleteUserService,
    getCurrentUserService,
    getUserByIdService,
    getUserService,
    updateUserService
} from "../services/userService.js"
import { handleError } from "../utils/errorHandler.js"

export const createUser = async (req, res) => {
    try {
        const userData = req.body
        const newUser = await createUserService(userData)
        res.status(201).json(newUser)
    } catch (error) {
        handleError(error, res)
    }
}

export const getUser = async (req, res) => {
    try {
        const users = await getUserService(req.user)
        res.status(200).json(users)
    } catch (error) {
        handleError(error, res)
    }
}

export const getUserById = async (req, res) => {
    try {
        const { id } = req.params
        const user = await getUserByIdService(id, req.user)
        res.status(200).json(user)
    } catch (error) {
        handleError(error, res)
    }
}

export const getCurrentUser = async (req, res) => {
    try {
        const user = await getCurrentUserService(req.user)
        res.status(200).json(user)
    } catch (error) {
        handleError(error, res)
    }
}

export const updateUser = async (req, res) => {
    try {
        const { id } = req.params
        const userData = req.body
        const updatedUser = await updateUserService(id, userData, req.user)
        res.status(200).json(updatedUser)
    } catch (error) {
        handleError(error, res)
    }
}

export const assignManagerToSector = async (req, res) => {
    try {
        const { id } = req.params
        const { sector, replaceCurrent } = req.body
        const result = await assignManagerToSectorService({
            userId: id,
            sector,
            replaceCurrent
        })
        res.status(200).json(result)
    } catch (error) {
        handleError(error, res)
    }
}

export const deactivateUser = async (req, res) => {
    try {
        const { id } = req.params
        const result = await deactivateUserService(id)
        res.status(200).json(result)
    } catch (error) {
        handleError(error, res)
    }
}

export const deleteUser = async (req, res) => {
    try {
        const { id } = req.params
        const deletedUser = await deleteUserService(id)
        res.status(200).json(deletedUser)
    } catch (error) {
        handleError(error, res)
    }
}

export const logout = async (_req, res) => {
    return res.status(200).json({
        message: "Sesion cerrada en el cliente"
    })
}
