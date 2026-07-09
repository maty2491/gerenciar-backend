import mongoose from "mongoose"

const performanceIncidentSchema = new mongoose.Schema({
    agentId: { type: mongoose.Schema.Types.ObjectId, ref: "Agent", required: true },
    encargadoId: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true },
    sector: { type: String, required: true, lowercase: true, trim: true },
    date: { type: Date, required: true },
    incidentType: {
        type: String,
        required: true,
        enum: ["ausente", "vacaciones", "licencia", "baja_rendimiento", "otra"]
    },
    observation: { type: String, required: true, trim: true },
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true }
}, { timestamps: true })

export default mongoose.models.PerformanceIncident || mongoose.model("PerformanceIncident", performanceIncidentSchema)
