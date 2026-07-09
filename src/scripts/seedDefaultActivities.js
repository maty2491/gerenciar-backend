import mongoose from "mongoose"
import { connectDB } from "../config/db.js"
import Activity from "../models/activityModel.js"
import User from "../models/userModel.js"
import { OPERATIVE_SECTORS } from "../constants/sectors.js"
import { DEFAULT_ACTIVITY_NAMES } from "../constants/defaultActivities.js"

const run = async () => {
    await connectDB()

    const adminUser = await User.findOne({ role: "administrador", status: "activo" }).sort({ createdAt: 1 })
    if (!adminUser) {
        throw new Error("No existe un administrador activo para asignar la autoria del seed.")
    }

    let created = 0
    let updated = 0
    let unchanged = 0

    for (const sector of OPERATIVE_SECTORS) {
        for (const name of DEFAULT_ACTIVITY_NAMES) {
            const existing = await Activity.findOne({ sector, name })

            if (!existing) {
                await Activity.create({
                    sector,
                    name,
                    description: undefined,
                    active: true,
                    origin: "base",
                    approvalStatus: "approved",
                    requestedBy: adminUser._id,
                    approvedBy: adminUser._id,
                    approvedAt: new Date(),
                    createdBy: adminUser._id,
                    updatedBy: adminUser._id
                })
                created += 1
                continue
            }

            const needsUpdate = existing.origin !== "base"
                || existing.approvalStatus !== "approved"
                || existing.active !== true

            if (!needsUpdate) {
                unchanged += 1
                continue
            }

            existing.origin = "base"
            existing.approvalStatus = "approved"
            existing.active = true
            existing.approvedBy = adminUser._id
            existing.approvedAt = existing.approvedAt || new Date()
            existing.updatedBy = adminUser._id
            await existing.save()
            updated += 1
        }
    }

    console.log(`Actividades base creadas: ${created}`)
    console.log(`Actividades base actualizadas: ${updated}`)
    console.log(`Actividades sin cambios: ${unchanged}`)
}

run()
    .catch((error) => {
        console.error("Error al sembrar actividades base", error)
        process.exitCode = 1
    })
    .finally(async () => {
        await mongoose.connection.close()
    })
