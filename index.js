import express from "express"
import { PORT } from "./src/config/config.js"
import { connectDB } from "./src/config/db.js"
import userRouter from "./src/routes/userRoutes.js"
import agentRouter from "./src/routes/agentRoutes.js"
import taskRouter from "./src/routes/taskRoutes.js"
import categoryRouter from "./src/routes/categoryRoutes.js";
import interviewsRouter from "./src/routes/interviewsRoutes.js"
import eventRouter from "./src/routes/eventRoutes.js"
import repositoryRouter from "./src/routes/repositoryRoutes.js"
import activityRouter from "./src/routes/activityRoutes.js"
import subactivityRouter from "./src/routes/subactivityRoutes.js"
import incidentRouter from "./src/routes/incidentRoutes.js"
import kpiRouter from "./src/routes/kpiRoutes.js"

const app = express()

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

const allowedOrigins = [
    "http://localhost:5173",
    "https://gerenciarsrl.vercel.app"
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

app.use("/api/user", userRouter)
app.use("/api/agents", agentRouter) // <-- CRUD de Subordinados (Agentes)
app.use("/api/tasks", taskRouter)   // <-- Registro de KPIs (Tareas)
app.use("/api/categories", categoryRouter);
app.use("/api/interviews", interviewsRouter); // <-- CRUD de Entrevistas
app.use("/api/events", eventRouter);
app.use("/api/repositories", repositoryRouter)
app.use("/api/activities", activityRouter)
app.use("/api/subactivities", subactivityRouter)
app.use("/api/incidents", incidentRouter)
app.use("/api/kpis", kpiRouter)

const startServer = async () => {
    await connectDB()

    app.listen(PORT, () => {
        console.log(`Server funcionando en puerto: ${PORT}`)
    })
}

startServer().catch((error) => {
    console.error("No se pudo iniciar el servidor", error)
    process.exit(1)
})
