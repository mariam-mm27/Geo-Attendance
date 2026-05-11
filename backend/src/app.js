import express from "express";
import cors from "cors";
import userRoutes from "./routes/user.routes.js";
import enrollmentRouter from "./routes/enrollment.routes.js";
import courseRoutes from "./routes/course.routes.js";
import notificationRoutes from "./routes/notification.routes.js";
import emailRoutes from "./routes/email.routes.js";
import emailSenderRoutes from "./routes/emailSender.routes.js";
import chatRoutes from "./routes/chat.routes.js";
import chatbotRoutes from "./routes/chatbot.routes.js";
import realtimeWarningRoutes from "./routes/realtimeWarning.routes.js";
import adminRoutes from "./routes/admin.routes.js";

// Initialize background services
import "./services/backgroundJob.service.js";

const app = express();

// Enable CORS for all origins
app.use(cors());

app.use(express.json());

app.use("/", userRoutes);
app.use("/api/enrollment", enrollmentRouter);
app.use("/api/courses", courseRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/email", emailRoutes);
app.use("/api/email-sender", emailSenderRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/chatbot", chatbotRoutes);
app.use("/api/realtime", realtimeWarningRoutes);
app.use("/api/admin", adminRoutes);

app.listen(5000, () => {
  console.log("Server running");
});
