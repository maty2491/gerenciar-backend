import dotenv from 'dotenv'

dotenv.config()

const normalizeMongoUri = (uri) => {
    if (!uri) {
        return uri
    }

    const trimmedUri = uri.trim()
    const hasQuery = trimmedUri.includes("?")
    const hasRetryWrites = /([?&])retryWrites=/i.test(trimmedUri)

    if (hasRetryWrites) {
        return trimmedUri.replace(/([?&])retryWrites=[^&]*/i, "$1retryWrites=false")
    }

    return `${trimmedUri}${hasQuery ? "&" : "?"}retryWrites=false`
}

const normalizeAppEnv = (value) => {
    const env = value?.trim().toLowerCase()

    if (!env) {
        return "prod"
    }

    if (env === "dev" || env === "prod") {
        return env
    }

    throw new Error(`APP_ENV invalido: "${value}". Valores permitidos: dev, prod`)
}

export const APP_ENV = normalizeAppEnv(process.env.APP_ENV)
export const PORT = process.env.PORT || 3001
export const MONGODB_URI =
    APP_ENV === "dev"
        ? normalizeMongoUri(process.env.MONGODB_URI_DEV || process.env.MONGODB_URI)
        : normalizeMongoUri(process.env.MONGODB_URI_PROD || process.env.MONGODB_URI)
export const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID
export const FIREBASE_CLIENT_EMAIL = process.env.FIREBASE_CLIENT_EMAIL
export const FIREBASE_PRIVATE_KEY = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n")
export const FIREBASE_SERVICE_ACCOUNT_PATH = process.env.FIREBASE_SERVICE_ACCOUNT_PATH
