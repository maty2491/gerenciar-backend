// src/models/categoryModel.js
import mongoose from "mongoose";

const categorySchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true, 
    trim: true 
  },
  subTypes: [{ 
    type: String, 
    trim: true 
  }],
  sector: { 
    type: String, 
    required: true 
  },
  isDefault: { 
    type: Boolean, 
    default: false 
  }
}, { timestamps: true });

// Evita duplicados del mismo nombre en el mismo sector
categorySchema.index({ name: 1, sector: 1 }, { unique: true });

// Usamos esta opción resistente para evitar errores de recompilación de Mongoose con nodemon
const Category = mongoose.models.Category || mongoose.model("Category", categorySchema);

export default Category;