import Category from "../models/categoryModel.js"

const normalizeCategoryPayload = (payload = {}) => {
  const normalized = {}

  if (typeof payload.name === "string") normalized.name = payload.name.toLowerCase().trim()
  if (typeof payload.label === "string") normalized.label = payload.label.trim()
  if (Array.isArray(payload.subTypes)) {
    normalized.subTypes = payload.subTypes
      .map((item) => String(item).trim())
      .filter(Boolean)
  }
  if (typeof payload.sector === "string") normalized.sector = payload.sector.toLowerCase().trim()
  if (typeof payload.group === "string") normalized.group = payload.group.toLowerCase().trim()
  if (typeof payload.metricType === "string") normalized.metricType = payload.metricType.toLowerCase().trim()
  if (payload.order !== undefined) normalized.order = Number(payload.order)
  if (payload.active !== undefined) normalized.active = Boolean(payload.active)
  if (payload.isDefault !== undefined) normalized.isDefault = Boolean(payload.isDefault)

  return normalized
}

export const categoryController = {
  getBySector: async (req, res) => {
    try {
      const sector = req.user.role === "administrador" && req.query.sector 
        ? req.query.sector 
        : req.user.sector
      const normalizedSector = sector.toLowerCase().trim()
      const group = req.query.group?.toLowerCase().trim()
      const metricType = req.query.metricType?.toLowerCase().trim()
      const includeInactive = req.query.includeInactive === "true"

      const query = {
        $or: [{ sector: normalizedSector }, { isDefault: true }]
      }

      if (group) query.group = group
      if (metricType) query.metricType = metricType
      if (!includeInactive) query.active = true

      const categories = await Category.find(query).sort({ group: 1, order: 1, name: 1 })
      
      return res.json(categories)
    } catch (error) {
      return res.status(500).json({ message: "Error al obtener categorias", error: error.message })
    }
  },

  create: async (req, res) => {
    try {
      const normalizedBody = normalizeCategoryPayload(req.body)
      const sector = req.user.role === "administrador" && normalizedBody.sector
        ? normalizedBody.sector
        : req.user.sector

      if (!sector) {
        return res.status(400).json({ message: "El campo sector es obligatorio." })
      }

      const newCategory = new Category({
        ...normalizedBody,
        sector: sector.toLowerCase().trim()
      })

      await newCategory.save()
      return res.status(201).json(newCategory)
    } catch (error) {
      if (error.code === 11000) {
        return res.status(400).json({ message: "Ya existe una categoria con ese nombre en tu sector." })
      }
      return res.status(500).json({ message: "Error al crear la categoria", error: error.message })
    }
  },

  update: async (req, res) => {
    try {
      const { id } = req.params
      const sector = req.user.sector
      const normalizedBody = normalizeCategoryPayload(req.body)

      const query = { _id: id }
      if (req.user.role === "encargado") {
        query.sector = sector
      }

      if (Object.keys(normalizedBody).length === 0) {
        return res.status(400).json({ message: "No hay campos validos para actualizar." })
      }

      const updatedCategory = await Category.findOneAndUpdate(
        query,
        normalizedBody,
        { new: true, runValidators: true }
      )

      if (!updatedCategory) {
        return res.status(404).json({ message: "Categoria no encontrada o no tienes permisos." })
      }

      return res.json(updatedCategory)
    } catch (error) {
      if (error.code === 11000) {
        return res.status(400).json({ message: "Ya existe una categoria con ese nombre en tu sector." })
      }
      return res.status(500).json({ message: "Error al actualizar la categoria", error: error.message })
    }
  },

  delete: async (req, res) => {
    try {
      const { id } = req.params
      const sector = req.user.sector

      const query = { _id: id }
      if (req.user.role === "encargado") {
        query.sector = sector
      }

      const deleted = await Category.findOneAndDelete(query)
      
      if (!deleted) {
        return res.status(404).json({ message: "Categoria no encontrada o no tienes permisos." })
      }

      return res.json({ message: "Categoria eliminada correctamente." })
    } catch (error) {
      return res.status(500).json({ message: "Error al eliminar la categoria", error: error.message })
    }
  }
}
