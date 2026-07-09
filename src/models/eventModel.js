import mongoose from "mongoose"
import { OPERATIVE_SECTORS } from "../constants/sectors.js"

const eventSchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true },
    description: { type: String },
    eventDateTime: { type: Date, required: true },
    type: { type: String, default: "Reunion" },
    visibilityType: { type: String, enum: ["public", "private"], default: "public" },
    visibleSectors: [{
        type: String,
        enum: OPERATIVE_SECTORS,
        lowercase: true,
        trim: true
    }],
    createdBy: { type: String },
    createdById: { type: mongoose.Schema.Types.ObjectId, ref: "user" }
}, { timestamps: true })

const Event = mongoose.models.Event || mongoose.model("Event", eventSchema)
export default Event
