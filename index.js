import express from "express"
import { PORT } from "./src/config/config.js"
import { connectDB } from "./src/config/db.js"
import userRouter from "./src/routes/userRoutes.js"
// Importaciones con tus nombres exactos de rutas
import agentRouter from "./src/routes/agentRoutes.js"
import taskRouter from "./src/routes/taskRoutes.js"
import categoryRouter from "./src/routes/categoryRoutes.js";
import interviewsRouter from "./src/routes/interviewsRoutes.js"
import eventRouter from "./src/routes/eventRoutes.js"

const app = express()

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

const allowedOrigins = [
    "http://localhost:5173",
    "https://gerenciarsrl-qdetvolta-maty2491s-projects.vercel.app"
]

app.use((req, res, next) => {
    const origin = req.headers.origin
    if (allowedOrigins.includes(origin)) {
        res.header("Access-Control-Allow-Origin", origin)
    }
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization")
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")

    if (req.method === "OPTIONS") {
        return res.sendStatus(204)
    }

    next()
})

connectDB()

app.use("/api/user", userRouter)
app.use("/api/agents", agentRouter) // <-- CRUD de Subordinados (Agentes)
app.use("/api/tasks", taskRouter)   // <-- Registro de KPIs (Tareas)
app.use("/api/categories", categoryRouter);
app.use("/api/interviews", interviewsRouter); // <-- CRUD de Entrevistas
app.use("/api/events", eventRouter);

app.listen(PORT, () => {
    console.log(`Server funcionando en puerto: ${PORT}`)
})