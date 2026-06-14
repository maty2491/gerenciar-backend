import {
    createUserService,
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

export const deleteUser = async (req, res) => {
    try {
        const { id } = req.params
        const deletedUser = await deleteUserService(id)
        res.status(200).json(deletedUser)
    } catch (error) {
        handleError(error, res)
    }
}

export const logout = async (req, res) => {
    return res.status(200).json({
        message: "Sesion cerrada en el cliente"
    })
}
