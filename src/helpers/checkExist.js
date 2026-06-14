export const checkModelExist = async (Model, query, shouldExist, statusCode, errorMessage) => {
    const document = await Model.findOne(query)
    if (!shouldExist && document) {
        const error = new Error(errorMessage)
        error.statusCode = statusCode
        throw error
    }

    if (shouldExist && !document) {
        const error = new Error(errorMessage)
        error.statusCode = statusCode
        throw error
    }
    return document
}