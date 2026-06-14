import mongoose from "mongoose";

const taskSchema = new mongoose.Schema({
    agentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Agent', required: true },
    sector: {
        type: String,
        required: true
    },
    category: {
        type: String,
        required: true
    },
    subType: {
        type: String,
        required: true
    },
    quantity: {
        type: Number,
        required: true,
        default: 0
    },
    note: {
        type: String
    },
    recordedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true
    }
}, { timestamps: true });

export default mongoose.model('RegistroTarea', taskSchema);