import mongoose from "mongoose"
import { OPERATIVE_SECTORS } from "../constants/sectors.js"

const interviewSchema = new mongoose.Schema({
    candidateName: { type: String, required: true, trim: true },
    dni: { type: String, trim: true },
    fechaNacimiento: { type: String },
    telefono: { type: String, trim: true },
    domicilio: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    puesto: { type: String, trim: true },
    sector: { type: String, required: true, enum: OPERATIVE_SECTORS, lowercase: true, trim: true },
    fechaEntrevista: { type: Date, required: true },
    entrevistador: { type: String, trim: true },
    resumen: { type: String },
    resultado: { type: String },
    rating: { type: String },
    cvUrl: { type: String }
}, { timestamps: true })

const Interview = mongoose.models.Interview || mongoose.model("Interview", interviewSchema)
export default Interview
