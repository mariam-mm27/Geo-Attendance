
import express from "express";
import userRoutes from "./routes/user.routes.js";
import enrollmentRouter from "./routes/enrollment.routes.js";

const app = express();
app.use(express.json());

app.use("/", userRoutes);
app.use("/api/enrollment", enrollmentRouter);

app.listen(3000, () => console.log("Server running on port 3000"));

