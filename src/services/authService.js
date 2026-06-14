import User from "../models/userModel.js"

const defaultSector = process.env.DEFAULT_USER_SECTOR || "general"

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

    if (!uid || !email || !name) {
        const error = new Error("Token invalido: faltan datos de usuario")
        error.statusCode = 401
        throw error
    }

    let user = await User.findOne({ firebaseUid: uid })

    if (!user) {
        user = await User.findOne({ email })
    }

    if (user && !user.firebaseUid) {
        user.firebaseUid = uid
        await user.save()
        return user
    }

    if (user) {
        return user
    }

    const { firstName, lastName } = splitFullName(name)

    const newUser = new User({
        firebaseUid: uid,
        email: email.toLowerCase(),
        name: firstName,
        lastName: lastName,
        role: "encargado",
        sector: defaultSector,
        permissions: {
            canCreateTasks: true,
            canDeleteTasks: false,
            canAssignRoles: false
        }
    })

    return newUser.save()
}
