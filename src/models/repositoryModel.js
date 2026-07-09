import mongoose from "mongoose"

const repositorySchema = new mongoose.Schema({
    institutionName: { type: String, required: true, trim: true },
    contactPhone: { type: String, required: true, trim: true },
    contactPerson: { type: String, required: true, trim: true },
    notes: { type: String, trim: true }
}, { timestamps: true })

export default mongoose.models.Repository || mongoose.model("Repository", repositorySchema)
