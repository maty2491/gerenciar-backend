import mongoose from "mongoose"
import { OPERATIVE_SECTORS } from "../constants/sectors.js"

const kpiSubactivitySchema = new mongoose.Schema({
    subactivityId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Subactivity",
        required: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    value: {
        type: Number,
        required: true,
        min: 0,
        max: 999999,
        default: 0
    }
}, { _id: false })

const kpiActivitySchema = new mongoose.Schema({
    activityId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Activity",
        required: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    subactivities: {
        type: [kpiSubactivitySchema],
        default: []
    }
}, { _id: false })

const kpiIncidentSchema = new mongoose.Schema({
    incidentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Incident",
        required: true
    },
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
        required: true
    },
    sectorId: {
        type: String,
        enum: [...OPERATIVE_SECTORS, null],
        default: null
    },
    ratingType: {
        type: String,
        enum: ["D", "N", "S", "E"],
        required: true
    }
}, { _id: false })

const kpiSchema = new mongoose.Schema({
    sectorId: {
        type: String,
        required: true,
        enum: OPERATIVE_SECTORS,
        trim: true,
        lowercase: true
    },
    agentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Agent",
        required: true
    },
    month: {
        type: Number,
        required: true,
        min: 1,
        max: 12
    },
    year: {
        type: Number,
        required: true,
        min: 2000
    },
    activities: {
        type: [kpiActivitySchema],
        default: []
    },
    incidents: {
        type: [kpiIncidentSchema],
        default: []
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        required: true
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        required: true
    }
}, {
    timestamps: true,
    collection: "kpis"
})

kpiSchema.index({ agentId: 1, month: 1, year: 1 }, { unique: true })
kpiSchema.index({ sectorId: 1, month: 1, year: 1 })
kpiSchema.index({ sectorId: 1, agentId: 1, year: 1, month: 1 })

const Kpi = mongoose.models.Kpi || mongoose.model("Kpi", kpiSchema)

export default Kpi
