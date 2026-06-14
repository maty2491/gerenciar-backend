import mongoose from "mongoose";

const eventSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String },
    fechaEvento: { type: String, required: true }, 
    horaEvento: { type: String, required: true },  
    type: { type: String, default: "Reunión" },  
    createdBy: { type: String }                   
}, { timestamps: true });

const Event = mongoose.model("Event", eventSchema);
export default Event;