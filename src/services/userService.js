import { checkModelExist } from "../helpers/checkExist.js"
import User from "../models/userModel.js"
import Agent from "../models/agentModel.js"
import { OPERATIVE_SECTORS, PENDING_SECTOR, isOperativeSector } from "../constants/sectors.js"
import { validateObjectId } from "../utils/validateObjectId.js"

const editableBySelf = ["name", "lastName", "email"]

const ensureSingleManagerPerSector = async (sector, userIdToIgnore = null) => {
    if (!isOperativeSector(sector)) {
        return
    }

    const existingManager = await User.findOne({
        role: "encargado",
        sector,
        status: "activo",
        ...(userIdToIgnore ? { _id: { $ne: userIdToIgnore } } : {})
    })

    if (existingManager) {
        const error = new Error(`Ya existe un encargado asignado al sector ${sector}`)
        error.statusCode = 400
        throw error
    }
}

const normalizeUserData = (userData) => {
    const normalized = { ...userData }

    if (normalized.email) normalized.email = normalized.email.toLowerCase().trim()
    if (normalized.role) normalized.role = normalized.role.toLowerCase().trim()
    if (normalized.sector) normalized.sector = normalized.sector.toLowerCase().trim()
    if (normalized.status) normalized.status = normalized.status.toLowerCase().trim()

    if (normalized.sector === PENDING_SECTOR) {
        normalized.role = "general"
    } else if (normalized.sector && isOperativeSector(normalized.sector) && normalized.role !== "administrador") {
        normalized.role = "encargado"
    }

    return normalized
}

const buildManagerPayload = (sector) => ({
    sector,
    role: sector === PENDING_SECTOR ? "general" : "encargado",
    status: "activo"
})

export const createUserService = async (userData) => {
    const normalizedData = normalizeUserData(userData)
    const { email, firebaseUid, role, sector } = normalizedData

    await checkModelExist(User, { email }, false, 400, `Usuario con email ${email} ya existe.`)
    await checkModelExist(User, { firebaseUid }, false, 400, "El usuario de Firebase ya tiene perfil.")
    if (role === "encargado") {
        await ensureSingleManagerPerSector(sector)
    }

    const newUser = new User(normalizedData)
    const savedUser = await newUser.save()

    return {
        message: "Usuario creado exitosamente",
        data: savedUser
    }
}

export const getUserService = async (currentUser) => {
    if (currentUser.role === "administrador") {
        return User.find().sort({ status: 1, role: 1, sector: 1, lastName: 1, name: 1 })
    }

    return [currentUser]
}

export const getUserByIdService = async (id, currentUser) => {
    validateObjectId(id, "ID de usuario")
    const user = await checkModelExist(User, { _id: id }, true, 404, "El usuario no existe")

    if (currentUser.role !== "administrador" && user.id !== currentUser.id) {
        const error = new Error("Acceso denegado")
        error.statusCode = 403
        throw error
    }

    return user
}

export const updateUserService = async (id, userData, currentUser) => {
    validateObjectId(id, "ID de usuario")
    const currentDbUser = await checkModelExist(User, { _id: id }, true, 404, "El usuario no existe")

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

    const normalizedData = normalizeUserData(userData)

    if (currentUser.role === "administrador") {
        const nextSector = normalizedData.sector ?? currentDbUser.sector
        const nextRole = normalizedData.role ?? currentDbUser.role
        const nextStatus = normalizedData.status ?? currentDbUser.status

        if (nextRole === "encargado" && nextStatus === "activo") {
            await ensureSingleManagerPerSector(nextSector, id)
        }
    }

    const updatedUser = await User.findByIdAndUpdate(
        { _id: id },
        normalizedData,
        { returnDocument: "after", runValidators: true }
    )

    return {
        message: "Usuario actualizado exitosamente",
        data: updatedUser
    }
}

export const assignManagerToSectorService = async ({ userId, sector, replaceCurrent = false }) => {
    validateObjectId(userId, "ID de usuario")

    const normalizedSector = sector?.toLowerCase().trim()
    if (!OPERATIVE_SECTORS.includes(normalizedSector)) {
        const error = new Error("Sector invalido")
        error.statusCode = 400
        throw error
    }

    const newManager = await checkModelExist(User, { _id: userId }, true, 404, "El usuario no existe")
    if (newManager.role === "administrador") {
        const error = new Error("No se puede asignar un administrador como encargado de sector")
        error.statusCode = 400
        throw error
    }

    const currentManager = await User.findOne({
        role: "encargado",
        sector: normalizedSector,
        status: "activo",
        _id: { $ne: userId }
    })

    if (currentManager && !replaceCurrent) {
        const error = new Error(`El sector ${normalizedSector} ya tiene un encargado activo`)
        error.statusCode = 400
        throw error
    }

    if (currentManager && replaceCurrent) {
        await User.findByIdAndUpdate(currentManager._id, buildManagerPayload(PENDING_SECTOR))
    }

    const updatedManager = await User.findByIdAndUpdate(
        userId,
        buildManagerPayload(normalizedSector),
        { new: true, runValidators: true }
    )

    await Agent.updateMany(
        { sector: normalizedSector, status: "activo" },
        { $set: { encargadoId: updatedManager._id } }
    )

    return {
        message: `Encargado asignado al sector ${normalizedSector} exitosamente`,
        data: updatedManager
    }
}

export const deactivateUserService = async (id) => {
    validateObjectId(id, "ID de usuario")
    const user = await checkModelExist(User, { _id: id }, true, 404, "El usuario no existe")

    if (user.role === "administrador") {
        const error = new Error("No se puede desactivar un administrador desde esta operacion")
        error.statusCode = 400
        throw error
    }

    const updatedUser = await User.findByIdAndUpdate(
        id,
        {
            status: "inactivo",
            role: "general",
            sector: PENDING_SECTOR
        },
        { new: true, runValidators: true }
    )

    return {
        message: "Usuario desactivado exitosamente",
        data: updatedUser
    }
}

export const deleteUserService = async (id) => {
    validateObjectId(id, "ID de usuario")
    await checkModelExist(User, { _id: id }, true, 404, "El usuario no existe")
    await User.deleteOne({ _id: id })

    return {
        message: "Usuario eliminado exitosamente"
    }
}

export const getCurrentUserService = async (currentUser) => {
    return currentUser
}
