import { firebaseAuth } from "../config/firebase.js"
import { findOrCreateUserFromToken } from "../services/authService.js"
import { PENDING_SECTOR } from "../constants/sectors.js"

export const verifyTokenMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ message: "Acceso con token invalido" })
        }

        const token = authHeader.split(" ")[1]
        const decodedToken = await firebaseAuth.verifyIdToken(token)
        const user = await findOrCreateUserFromToken(decodedToken)

        if (user.status === "inactivo") {
            return res.status(403).json({ message: "Usuario inactivo. Contacte al administrador." })
        }

        req.auth = decodedToken
        req.user = user

        next()
    } catch (error) {
        return res.status(error.statusCode || 401).json({ message: error.message || "Acceso al token invalido" })
    }
}

export const requireAdmin = (req, res, next) => {
    if (!req.user || req.user.role !== "administrador") {
        return res.status(403).json({ message: "Acceso denegado" })
    }

    next()
}

export const requireAdminOrSelf = (req, res, next) => {
    if (!req.user) {
        return res.status(403).json({ message: "Acceso denegado" })
    }

    const requestUserId = req.params.id
    const isAdmin = req.user.role === "administrador"
    const isSelf = req.user.id === requestUserId

    if (!isAdmin && !isSelf) {
        return res.status(403).json({ message: "Acceso denegado" })
    }

    next()
}

export const requirePermission = (permission) => {
    return (req, res, next) => {
        if (req.user?.role === "administrador" || req.user?.permissions?.[permission]) {
            return next()
        }

        return res.status(403).json({ message: "Acceso denegado" })
    }
}

export const requireOperationalUser = (req, res, next) => {
    if (!req.user) {
        return res.status(403).json({ message: "Acceso denegado" })
    }

    if (req.user.role === "general" || req.user.sector === PENDING_SECTOR) {
        return res.status(403).json({ message: "Solicite su sector al administrador" })
    }

    next()
}

// Middleware para permitir el acceso solo a ciertos roles
export const requireRoles = (allowedRoles) => {
    return (req, res, next) => {
        if (!req.user || !allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ message: "Acceso denegado: No tienes los permisos requeridos." })
        }
        next()
    }
}

// Middleware específico de seguridad para asegurar que el Encargado tenga un sector asignado
export const requireSector = (req, res, next) => {
    // Si es admin, no requiere sector obligatorio para operar, pasa de largo.
    if (req.user?.role === "administrador") {
        return next()
    }

    // Si es encargado pero no tiene sector en la BD, bloqueamos por seguridad.
    if (!req.user || !req.user.sector || req.user.sector === PENDING_SECTOR || req.user.role === "general") {
        return res.status(403).json({ message: "Solicite su sector al administrador" })
    }

    next()
}
