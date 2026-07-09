import mongoose from "mongoose"
import { OPERATIVE_SECTORS } from "../constants/sectors.js"

const incidentSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true,
        trim: true
    },
    scope: {
        type: String,
        enum: ["global", "sector"],
        default: "global",
        required: true
    },
    sectorId: {
        type: String,
        enum: [...OPERATIVE_SECTORS, null],
        default: null
    },
    active: {
        type: Boolean,
        default: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        required: true
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user"
    }
}, {
    timestamps: true,
    collection: "incidents"
})

incidentSchema.index(
    { name: 1, scope: 1, sectorId: 1 },
    {
        unique: true,
        partialFilterExpression: { active: true }
    }
)
incidentSchema.index({ scope: 1, sectorId: 1, active: 1, name: 1 })

const Incident = mongoose.models.Incident || mongoose.model("Incident", incidentSchema)

export default Incident
