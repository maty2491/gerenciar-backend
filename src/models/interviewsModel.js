import mongoose from "mongoose";

const interviewSchema = new mongoose.Schema({
    candidateName: { type: String, required: true },
    dni: { type: String },
    fechaNacimiento: { type: String },
    telefono: { type: String },
    domicilio: { type: String },
    email: { type: String },    
    puesto: { type: String },
    sector: { type: String }, 
    fechaEntrevista: { type: String }, 
    entrevistador: { type: String },
    resumen: { type: String },
    resultado: { type: String },
    rating: { type: String },
    cvUrl: { type: String } 
}, { timestamps: true });

const Interview = mongoose.model("Interview", interviewSchema);
export default Interview;