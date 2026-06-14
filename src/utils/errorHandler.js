export const handleError = (error, res) => {
    const statusCode = error.statusCode || 500
    const message = error.message || "Error de server Interno"

    res.status(statusCode).json({
        message: message,
    })
}