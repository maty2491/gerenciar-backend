import mongoose from "mongoose"

export const validateObjectId = (id, label = "ID") => {
    if (!mongoose.Types.ObjectId.isValid(id)) {
        const error = new Error(`${label} invalido`)
        error.statusCode = 400
        throw error
    }
}
