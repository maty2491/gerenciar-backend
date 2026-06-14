// src/controllers/categoryController.js
import Category from "../models/categoryModel.js"; 

export const categoryController = {
  getBySector: async (req, res) => {
    try {
      const sector = req.user.role === "administrador" && req.query.sector 
        ? req.query.sector 
        : req.user.sector;

      const categories = await Category.find({ 
        $or: [{ sector: sector }, { isDefault: true }] 
      }).sort({ name: 1 });
      
      return res.json(categories);
    } catch (error) {
      return res.status(500).json({ message: "Error al obtener categorías", error: error.message });
    }
  },

  create: async (req, res) => {
    try {
      const { name, subTypes, sector: bodySector } = req.body;
      
      const sector = req.user.role === "administrador" && bodySector 
        ? bodySector 
        : req.user.sector;

      if (!sector) {
        return res.status(400).json({ message: "El campo sector es obligatorio." });
      }

      const newCategory = new Category({
        name,
        subTypes: subTypes || [],
        sector: sector.toLowerCase().trim()
      });

      await newCategory.save();
      return res.status(201).json(newCategory);
    } catch (error) {
      if (error.code === 11000) {
        return res.status(400).json({ message: "Ya existe una categoría con ese nombre en tu sector." });
      }
      return res.status(500).json({ message: "Error al crear la categoría", error: error.message });
    }
  },

  update: async (req, res) => {
    try {
      const { id } = req.params;
      const { name, subTypes } = req.body;
      const sector = req.user.sector;

      const query = { _id: id };
      if (req.user.role === "encargado") {
        query.sector = sector;
      }

      const updatedCategory = await Category.findOneAndUpdate(
        query,
        { name, subTypes },
        { new: true, runValidators: true }
      );

      if (!updatedCategory) {
        return res.status(404).json({ message: "Categoría no encontrada o no tienes permisos." });
      }

      return res.json(updatedCategory);
    } catch (error) {
      return res.status(500).json({ message: "Error al actualizar la categoría", error: error.message });
    }
  },

  delete: async (req, res) => {
    try {
      const { id } = req.params;
      const sector = req.user.sector;

      const query = { _id: id };
      if (req.user.role === "encargado") {
        query.sector = sector;
      }

      const deleted = await Category.findOneAndDelete(query);
      
      if (!deleted) {
        return res.status(404).json({ message: "Categoría no encontrada o no tienes permisos." });
      }

      return res.json({ message: "Categoría eliminada correctamente." });
    } catch (error) {
      return res.status(500).json({ message: "Error al eliminar la categoría", error: error.message });
    }
  }
};