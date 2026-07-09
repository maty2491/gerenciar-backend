// src/routes/categoryRoutes.js
import express from "express"
import { categoryController } from "../controllers/categoryController.js"
import { verifyTokenMiddleware, requireOperationalUser, requireRoles } from "../middlewares/verifyTokenMiddleware.js"

const categoryRouter = express.Router()

// 1. Primero validamos que el usuario esté logueado con Firebase de forma global en este router
categoryRouter.use(verifyTokenMiddleware)
categoryRouter.use(requireOperationalUser)

// 2. Obtener categorías: Ambos roles pueden (el controlador discrimina sector o query)
categoryRouter.get(
  "/", 
  requireRoles(["administrador", "encargado"]), 
  categoryController.getBySector
)

// 3. Crear una categoría nueva: Ambos roles pueden
categoryRouter.post(
  "/", 
  requireRoles(["administrador", "encargado"]), 
  categoryController.create
)

// 4. Actualizar categoría (agregar/remover subtipos o renombrar): Ambos roles pueden
categoryRouter.patch(
  "/:id", 
  requireRoles(["administrador", "encargado"]), 
  categoryController.update
)

// 5. Eliminar categoría: Ambos roles pueden
categoryRouter.delete(
  "/:id", 
  requireRoles(["administrador", "encargado"]), 
  categoryController.delete
)

export default categoryRouter
