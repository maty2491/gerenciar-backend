import mongoose from "mongoose"

const activitySchema = new mongoose.Schema({
    sector: {
        type: String,
        required: true,
        trim: true,
        lowercase: true
    },
    name: {
        type: String,
        required: true,
        trim: true,
        lowercase: true
    },
    description: {
        type: String,
        trim: true
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
    collection: "activities"
})

activitySchema.index({ sector: 1, name: 1 }, { unique: true })
activitySchema.index({ sector: 1, active: 1, name: 1 })

const Activity = mongoose.models.Activity || mongoose.model("Activity", activitySchema)

export default Activity
