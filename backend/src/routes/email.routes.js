import express from "express";
import {
  sendAbsenceAlert,
  checkAndAlert,
  sendBulkAlerts,
  getEmailHistory,
  getLowAttendanceStudents,
  triggerOnAttendance,
  sendLoginEmailController,
} from "../controllers/email.controller.js";
import {
  sendTestEmailDirect,
  sendAbsenceAlertDirect,
  checkAndSendAbsenceAlertDirect,
  checkAllCoursesDirect,
} from "../services/email-direct.service.js";

const router = express.Router();

// ─── Test Routes ────────────────────────────────────────────────────────────

// Test email with Brevo SMTP (real email)
router.post("/test-direct", sendTestEmailDirect);

// Simple test with Ethereal (no credentials needed)
router.post("/test-simple", async (req, res) => {
  try {
    const nodemailer = await import("nodemailer");
    const testAccount = await nodemailer.default.createTestAccount();
    const transporter = nodemailer.default.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false,
      auth: { user: testAccount.user, pass: testAccount.pass },
    });
    const info = await transporter.sendMail({
      from: '"Attendance System" <noreply@attendance.com>',
      to: "student@example.com",
      subject: "⚠️ Test Attendance Warning",
      html: `<p>Email system is working! ✅</p>`,
    });
    const previewUrl = nodemailer.default.getTestMessageUrl(info);
    res.json({ success: true, message: "Test email sent!", previewUrl, messageId: info.messageId });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─── Alert Routes ────────────────────────────────────────────────────────────

// Send absence alert to specific student (force send, ignores cooldown)
router.post("/send-alert", sendAbsenceAlert);
router.post("/send-alert-direct", sendAbsenceAlertDirect);

// Check attendance and send alert if threshold exceeded (respects cooldown)
router.post("/check-all", checkAndAlert);
router.post("/check-all-direct", checkAllCoursesDirect);

// Manual check for a specific student (respects cooldown)
router.post("/manual-check", async (req, res) => {
  try {
    const { studentId, courseId } = req.body;
    if (!studentId || !courseId) {
      return res.status(400).json({ success: false, message: "studentId and courseId are required" });
    }
    console.log(`🔍 Manual check triggered for student ${studentId} in course ${courseId}`);
    const result = await checkAndSendAbsenceAlertDirect(studentId, courseId);
    res.status(200).json(result);
  } catch (error) {
    console.error("Error in manual check:", error);
    res.status(500).json({ success: false, message: "Failed to perform manual check", error: error.message });
  }
});

// Auto-check triggered after attendance recording
router.post("/auto-check", async (req, res) => {
  try {
    const { studentId, courseId } = req.body;
    if (!studentId || !courseId) {
      return res.status(400).json({ success: false, message: "studentId and courseId are required" });
    }
    const result = await checkAndSendAbsenceAlertDirect(studentId, courseId);
    res.status(200).json(result);
  } catch (error) {
    console.error("Error in auto-check:", error);
    res.status(500).json({ success: false, message: "Failed to perform automatic check", error: error.message });
  }
});

// ─── History & Reporting ─────────────────────────────────────────────────────

router.get("/history/:studentId", getEmailHistory);
router.get("/low-attendance/:courseId", getLowAttendanceStudents);
router.post("/bulk-alerts", sendBulkAlerts);
router.post("/trigger-on-attendance", triggerOnAttendance);
router.post("/send-login-email", sendLoginEmailController);

export default router;
