import mongoose from "mongoose"

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  label: {
    type: String,
    trim: true
  },
  subTypes: [{
    type: String,
    trim: true
  }],
  sector: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  group: {
    type: String,
    enum: ["despacho", "embargo", "liquidaciones", "subjetivo", "general"],
    default: "general",
    required: true
  },
  metricType: {
    type: String,
    enum: ["numeric", "qualitative"],
    default: "numeric",
    required: true
  },
  order: {
    type: Number,
    default: 0
  },
  active: {
    type: Boolean,
    default: true
  },
  isDefault: {
    type: Boolean,
    default: false
  }
}, { timestamps: true })

categorySchema.index({ name: 1, sector: 1 }, { unique: true })
categorySchema.index({ sector: 1, group: 1, metricType: 1, active: 1, order: 1 })

const Category = mongoose.models.Category || mongoose.model("Category", categorySchema)

export default Category
