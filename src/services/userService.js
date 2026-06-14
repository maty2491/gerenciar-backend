import { checkModelExist } from "../helpers/checkExist.js"
import User from "../models/userModel.js"

const editableBySelf = ["name", "lastName", "email"]

export const createUserService = async (userData) => {
    const { email, firebaseUid } = userData

    await checkModelExist(User, { email }, false, 400, `Usuario con email ${email} ya existe.`)
    await checkModelExist(User, { firebaseUid }, false, 400, "El usuario de Firebase ya tiene perfil.")

    const newUser = new User(userData)
    const savedUser = await newUser.save()

    return {
        message: "Usuario creado exitosamente",
        data: savedUser
    }
}

export const getUserService = async (currentUser) => {
    if (currentUser.role === "administrador") {
        return User.find()
    }

    return [currentUser]
}

export const getUserByIdService = async (id, currentUser) => {
    const user = await checkModelExist(User, { _id: id }, true, 404, "El usuario no existe")

    if (currentUser.role !== "administrador" && user.id !== currentUser.id) {
        const error = new Error("Acceso denegado")
        error.statusCode = 403
        throw error
    }

    return user
}

export const updateUserService = async (id, userData, currentUser) => {
    await checkModelExist(User, { _id: id }, true, 404, "El usuario no existe")

    if (currentUser.role !== "administrador") {
        const invalidFields = Object.keys(userData).filter(
            (field) => !editableBySelf.includes(field)
        )

        if (invalidFields.length > 0) {
            const error = new Error("Solo el administrador puede modificar rol, sector o permisos")
            error.statusCode = 403
            throw error
        }

        if (id !== currentUser.id) {
            const error = new Error("Acceso denegado")
            error.statusCode = 403
            throw error
        }
    }

    const updatedUser = await User.findByIdAndUpdate(
        { _id: id },
        userData,
        { returnDocument: "after", runValidators: true }
    )

    return {
        message: "Usuario actualizado exitosamente",
        data: updatedUser
    }
}

export const deleteUserService = async (id) => {
    await checkModelExist(User, { _id: id }, true, 404, "El usuario no existe")
    await User.deleteOne({ _id: id })

    return {
        message: "Usuario eliminado exitosamente"
    }
}

export const getCurrentUserService = async (currentUser) => {
    return currentUser
}
