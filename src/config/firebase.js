import admin from "firebase-admin"
import fs from "fs"
import {
    FIREBASE_CLIENT_EMAIL,
    FIREBASE_PRIVATE_KEY,
    FIREBASE_PROJECT_ID,
    FIREBASE_SERVICE_ACCOUNT_PATH
} from "./config.js"

const getCredential = () => {
    if (FIREBASE_SERVICE_ACCOUNT_PATH) {
        const serviceAccount = JSON.parse(fs.readFileSync(FIREBASE_SERVICE_ACCOUNT_PATH, "utf8"))
        return admin.credential.cert(serviceAccount)
    }

    return admin.credential.cert({
        projectId: FIREBASE_PROJECT_ID,
        clientEmail: FIREBASE_CLIENT_EMAIL,
        privateKey: FIREBASE_PRIVATE_KEY
    })
}

if (!admin.apps.length) {
    admin.initializeApp({
        credential: getCredential()
    })
}

export const firebaseAuth = admin.auth()
