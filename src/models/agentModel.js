import mongoose from "mongoose";

const agentSchema = new mongoose.Schema({
  legajo: { type: String, required: true, unique: true },
  nombre: { type: String, required: true },
  apellido: { type: String, required: true },
  sector: {
    type: String,
    required: true,
    enum: ['buenos aires', 'santa fe', 'cordoba', 'entre rios', 'corrientes', 'recepcion', 'administracion']
  },
  creadoPor: { type: mongoose.Schema.Types.ObjectId, ref: 'user' }
}, { timestamps: true });

const Agent = mongoose.model('Agent', agentSchema);
export default Agent;