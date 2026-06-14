import dotenv from 'dotenv'

dotenv.config()

export const PORT = process.env.PORT || 3001
export const MONGODB_URI = process.env.MONGODB_URI
export const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID
export const FIREBASE_CLIENT_EMAIL = process.env.FIREBASE_CLIENT_EMAIL
export const FIREBASE_PRIVATE_KEY = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n")
export const FIREBASE_SERVICE_ACCOUNT_PATH = process.env.FIREBASE_SERVICE_ACCOUNT_PATH
