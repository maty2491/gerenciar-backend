import mongoose from "mongoose";
import { APP_ENV, MONGODB_URI } from "./config.js";

export const connectDB = async () => {
    try {
        if (!MONGODB_URI) {
            throw new Error(`No se encontro una URI de MongoDB para APP_ENV=${APP_ENV}`)
        }

        await mongoose.connect(MONGODB_URI)
        console.log(`Base de datos conectada (${APP_ENV})`)
        return mongoose.connection
        
    } catch (error) {
        console.log("Error connecting to database", error)
        process.exit(1)
                
    }
}
