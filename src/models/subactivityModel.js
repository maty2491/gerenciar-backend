import mongoose from "mongoose"

const subactivitySchema = new mongoose.Schema({
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
    collection: "subactivities"
})

subactivitySchema.index({ sector: 1, name: 1 }, { unique: true })
subactivitySchema.index({ sector: 1, active: 1, name: 1 })

const Subactivity = mongoose.models.Subactivity || mongoose.model("Subactivity", subactivitySchema)

export default Subactivity
