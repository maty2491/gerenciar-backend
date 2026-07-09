import mongoose from "mongoose"

const monthlyQualitativePerformanceSchema = new mongoose.Schema({
    agentId: { type: mongoose.Schema.Types.ObjectId, ref: "Agent", required: true },
    encargadoId: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true },
    sector: { type: String, required: true, lowercase: true, trim: true },
    month: { type: Number, required: true, min: 1, max: 12 },
    year: { type: Number, required: true, min: 2000 },
    category: { type: String, required: true, trim: true },
    value: {
        type: String,
        required: true,
        enum: ["D", "N", "S", "E"]
    },
    note: { type: String, trim: true },
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true }
}, { timestamps: true })

monthlyQualitativePerformanceSchema.index({ agentId: 1, month: 1, year: 1, category: 1 }, { unique: true })

export default mongoose.models.MonthlyQualitativePerformance
    || mongoose.model("MonthlyQualitativePerformance", monthlyQualitativePerformanceSchema)
