import express from "express";
import {
  sendLoginHelloEmailController,
  sendAttendanceWarningEmailController,
} from "../controllers/emailSender.controller.js";

const router = express.Router();

/**
 * Send login hello email
 * POST /api/email-sender/send-login-hello
 */
router.post("/send-login-hello", sendLoginHelloEmailController);

/**
 * Send attendance warning email
 * POST /api/email-sender/send-attendance-warning
 */
router.post("/send-attendance-warning", sendAttendanceWarningEmailController);

export default router;
