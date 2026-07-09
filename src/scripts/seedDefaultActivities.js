import mongoose from "mongoose"
import { connectDB } from "../config/db.js"
import { ensureDefaultActivitiesService } from "../services/defaultActivitySeedService.js"

const run = async () => {
    await connectDB()
    const { created, updated, unchanged } = await ensureDefaultActivitiesService()

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
