import express from "express";
import cors from "cors";
import userRoutes from "./routes/user.routes.js";
import enrollmentRouter from "./routes/enrollment.routes.js";
import courseRoutes from "./routes/course.routes.js";
import notificationRoutes from "./routes/notification.routes.js";
import emailRoutes from "./routes/email.routes.js";

import { attendanceController } from "./controllers/attendanceController.js";


const app = express();

// Enable CORS for all origins
app.use(cors());

app.use(express.json());

app.use("/", userRoutes);
app.use("/api/enrollment", enrollmentRouter);
app.use("/api/courses", courseRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/email", emailRoutes);

app.listen(3001, () => {
  console.log("🚀 Server running on port 3001");
  console.log("📧 Email notification system active");
});
