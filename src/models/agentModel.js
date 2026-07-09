import mongoose from "mongoose"
import { OPERATIVE_SECTORS } from "../constants/sectors.js"

const agentSchema = new mongoose.Schema({
  legajo: { type: String, required: true, unique: true },
  nombre: { type: String, required: true },
  apellido: { type: String, required: true },
  sector: {
    type: String,
    required: true,
    enum: OPERATIVE_SECTORS
  },
  encargadoId: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true },
  creadoPor: { type: mongoose.Schema.Types.ObjectId, ref: "user" },
  status: {
    type: String,
    enum: ["activo", "desvinculado"],
    default: "activo",
    required: true
  }
}, { timestamps: true })

const Agent = mongoose.models.Agent || mongoose.model("Agent", agentSchema)
export default Agent
