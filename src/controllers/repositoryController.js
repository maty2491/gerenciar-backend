import Repository from "../models/repositoryModel.js"
import { validateObjectId } from "../utils/validateObjectId.js"

export const getRepositories = async (_req, res) => {
    try {
        const repositories = await Repository.find().sort({ institutionName: 1 })
        return res.status(200).json(repositories)
    } catch (error) {
        return res.status(500).json({ message: error.message })
    }
}

export const createRepository = async (req, res) => {
    try {
        const repository = new Repository(req.body)
        await repository.save()
        return res.status(201).json(repository)
    } catch (error) {
        return res.status(500).json({ message: error.message })
    }
}

export const updateRepository = async (req, res) => {
    try {
        validateObjectId(req.params.id, "ID de repositorio")
        const repository = await Repository.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        })

        if (!repository) {
            return res.status(404).json({ message: "Repositorio no encontrado." })
        }

        return res.status(200).json(repository)
    } catch (error) {
        return res.status(error.statusCode || 500).json({ message: error.message })
    }
}

export const deleteRepository = async (req, res) => {
    try {
        validateObjectId(req.params.id, "ID de repositorio")
        const repository = await Repository.findByIdAndDelete(req.params.id)

        if (!repository) {
            return res.status(404).json({ message: "Repositorio no encontrado." })
        }

        return res.status(200).json({ message: "Repositorio eliminado correctamente." })
    } catch (error) {
        return res.status(error.statusCode || 500).json({ message: error.message })
    }
}
