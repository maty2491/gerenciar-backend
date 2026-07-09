import User from "../models/userModel.js"
import { PENDING_SECTOR } from "../constants/sectors.js"

const splitFullName = (fullName = "") => {
    const [firstName, ...rest] = fullName.trim().split(" ")
    const lastName = rest.join(" ") || "usuario"
    return {
        firstName: firstName?.toLowerCase() || "usuario",
        lastName: lastName?.toLowerCase() || "sin apellido"
    }
}

export const findOrCreateUserFromToken = async (decodedToken) => {
    const { uid, email, name } = decodedToken

    if (!uid || !email) {
        const error = new Error("Token invalido: faltan datos de usuario")
        error.statusCode = 401
        throw error
    }

    const normalizedEmail = email.toLowerCase()

    let user = await User.findOne({ firebaseUid: uid })

    if (!user) {
        user = await User.findOne({ email: normalizedEmail })
    }

    if (user && !user.firebaseUid) {
        user.firebaseUid = uid
        await user.save()
        return user
    }

    if (user) {
        if (user.status === "inactivo") {
            const error = new Error("Usuario inactivo. Contacte al administrador.")
            error.statusCode = 403
            throw error
        }
        return user
    }

    const fallbackName = name || normalizedEmail.split("@")[0] || "usuario"
    const { firstName, lastName } = splitFullName(fallbackName)

    const newUser = new User({
        firebaseUid: uid,
        email: normalizedEmail,
        name: firstName,
        lastName: lastName,
        role: "general",
        sector: PENDING_SECTOR,
        permissions: {
            canCreateTasks: false,
            canDeleteTasks: false,
            canAssignRoles: false
        },
        status: "activo"
    })

    return newUser.save()
}
