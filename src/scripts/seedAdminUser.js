import { connectDB } from "../config/db.js"
import User from "../models/userModel.js"

const {
    ADMIN_EMAIL,
    ADMIN_FIREBASE_UID,
    ADMIN_LAST_NAME,
    ADMIN_NAME,
    ADMIN_SECTOR
} = process.env

const requiredValues = {
    ADMIN_EMAIL,
    ADMIN_FIREBASE_UID,
    ADMIN_LAST_NAME,
    ADMIN_NAME,
    ADMIN_SECTOR
}

const missingValues = Object.entries(requiredValues)
    .filter(([, value]) => !value)
    .map(([key]) => key)

if (missingValues.length > 0) {
    console.error(`Faltan variables: ${missingValues.join(", ")}`)
    process.exit(1)
}

await connectDB()

const adminUser = await User.findOneAndUpdate(
    {
        $or: [
            { firebaseUid: ADMIN_FIREBASE_UID },
            { email: ADMIN_EMAIL }
        ]
    },
    {
        firebaseUid: ADMIN_FIREBASE_UID,
        name: ADMIN_NAME,
        lastName: ADMIN_LAST_NAME,
        email: ADMIN_EMAIL,
        role: "administrador",
        sector: ADMIN_SECTOR,
        permissions: {
            canCreateTasks: true,
            canDeleteTasks: true,
            canAssignRoles: true
        }
    },
    {
        returnDocument: "after",
        runValidators: true,
        upsert: true
    }
)

console.log(`Administrador listo: ${adminUser.email}`)
process.exit(0)
