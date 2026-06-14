import express from "express";
import { 
    createInterview, 
    getInterviews,
    updateInterview,
    deleteInterview
} from "../controllers/interviewController.js";
import { verifyTokenMiddleware } from "../middlewares/verifyTokenMiddleware.js";

const interviewRouter = express.Router();

// Si querés que SÍ O SÍ haya que estar logueado para interactuar con entrevistas:
interviewRouter.use(verifyTokenMiddleware);

// Definición de endpoints siguiendo tu misma estética
interviewRouter.get("/", getInterviews);       // GET /api/interviews (o la ruta que definas)
interviewRouter.post("/", createInterview);    // POST /api/interviews
interviewRouter.put("/:id", updateInterview); // PUT /api/interviews/:id (Para actualizar o archivar)
interviewRouter.delete("/:id", deleteInterview); // DELETE /api/interviews/:id (Si querés eliminar definitivamente)


export default interviewRouter;