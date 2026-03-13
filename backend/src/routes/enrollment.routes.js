// backend/src/routes/enrollment.routes.js
import express from "express";
import enrollmentController from "../controllers/enrollment.controller.js";

const router = express.Router();

router.use("/", enrollmentController);

export default router;