import { firebaseAuth } from "../config/firebase.js"

export function verifyToken(token) {
    return firebaseAuth.verifyIdToken(token)
}
