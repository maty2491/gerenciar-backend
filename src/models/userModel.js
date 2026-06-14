import mongoose from "mongoose"

const userSchema = new mongoose.Schema({
    firebaseUid: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    name: {
        type: String,
        required: true,
        maxLength: [40, "Ingrese un nombre de menos de 40 caracteres"],
        minLength: [2, "Ingrese un nombre de mas de 2 caracteres"],
        trim: true,
        lowercase: true
    },
    lastName: {
        type: String,
        required: true,
        maxLength: [40, "Ingrese un apellido de menos de 40 caracteres"],
        minLength: [2, "Ingrese un apellido de mas de 2 caracteres"],
        trim: true,
        lowercase: true
    },
    email: {
        type: String,
        required: true,
        maxLength: [80, "Ingrese un email de menos de 80 caracteres"],
        minLength: [7, "Ingrese un email de mas de 7 caracteres"],
        trim: true,
        lowercase: true,
        unique: true,
        match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Por favor ingrese un email valido"]
    },
    role: {
        type: String,
        enum: ["administrador", "encargado"],
        default: "encargado",
        required: true
    },
    sector: {
        type: String,
        required: true,
        trim: true,
        lowercase: true
    },
    permissions: {
        canCreateTasks: {
            type: Boolean,
            default: true
        },
        canDeleteTasks: {
            type: Boolean,
            default: false
        },
        canAssignRoles: {
            type: Boolean,
            default: false
        }
    }
}, { timestamps: true })

export default mongoose.model("user", userSchema)
