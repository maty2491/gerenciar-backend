import mongoose from "mongoose"

const activitySubactivitySchema = new mongoose.Schema({
    activityId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Activity",
        required: true
    },
    subactivityId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Subactivity",
        required: true
    },
    active: {
        type: Boolean,
        default: true
    },
    assignedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        required: true
    },
    assignedAt: {
        type: Date,
        default: Date.now,
        required: true
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user"
    }
}, {
    timestamps: true,
    collection: "activitysubactivities"
})

activitySubactivitySchema.index({ activityId: 1, subactivityId: 1 }, { unique: true })
activitySubactivitySchema.index({ activityId: 1, active: 1 })
activitySubactivitySchema.index({ subactivityId: 1, active: 1 })

const ActivitySubactivity = mongoose.models.ActivitySubactivity || mongoose.model("ActivitySubactivity", activitySubactivitySchema)

export default ActivitySubactivity
