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

// Force send denial email immediately
router.post("/send-denial-email", async (req, res) => {
  try {
    const { studentId, courseId } = req.body;
    if (!studentId || !courseId) {
      return res.status(400).json({ success: false, message: "studentId and courseId are required" });
    }
    console.log(`📧 Force sending FINAL_EXAM_DENIED email to student ${studentId} in course ${courseId}`);
    const result = await checkAndSendAbsenceAlertDirect(studentId, courseId);
    res.status(200).json(result);
  } catch (error) {
    console.error("Error sending denial email:", error);
    res.status(500).json({ success: false, message: "Failed to send denial email", error: error.message });
  }
});

// Check all denied students and send emails
router.post("/check-denied-students", async (req, res) => {
  try {
    console.log("🔍 Checking for denied students and sending emails...");
    const { backgroundJobService } = await import("../services/backgroundJob.service.js");
    const result = await backgroundJobService.checkAndSendDenialEmails();
    res.status(200).json(result);
  } catch (error) {
    console.error("Error checking denied students:", error);
    res.status(500).json({ success: false, message: "Failed to check denied students", error: error.message });
  }
});

// Send denial email to specific student
router.post("/send-denial-to-student", async (req, res) => {
  try {
    const { studentEmail, studentName, courseName, totalSessions, attendedSessions } = req.body;
    
    if (!studentEmail || !studentName || !courseName) {
      return res.status(400).json({ success: false, message: "studentEmail, studentName, and courseName are required" });
    }

    console.log(`📧 Sending FINAL_EXAM_DENIED email to ${studentEmail}...`);
    
    const { sendWarningEmail } = await import("../services/simpleEmailSender.js");
    
    const missedSessions = totalSessions - attendedSessions;
    const absenceRate = totalSessions > 0 ? (missedSessions / totalSessions) * 100 : 0;
    
    const result = await sendWarningEmail(
      studentEmail,
      studentName,
      courseName,
      {
        totalSessions: totalSessions || 0,
        attendedSessions: attendedSessions || 0,
        missedSessions: missedSessions || 0,
        attendanceRate: totalSessions > 0 ? (attendedSessions / totalSessions) * 100 : 0,
        absenceRate: absenceRate
      },
      "FINAL_EXAM_DENIED"
    );

    if (result.success) {
      res.status(200).json({
        success: true,
        message: "Denial email sent successfully",
        messageId: result.messageId,
        recipient: studentEmail
      });
    } else {
      res.status(500).json({
        success: false,
        message: "Failed to send denial email",
        error: result.error
      });
    }
  } catch (error) {
    console.error("Error sending denial email:", error);
    res.status(500).json({ success: false, message: "Failed to send denial email", error: error.message });
  }
});

// ─── History & Reporting ─────────────────────────────────────────────────────

router.get("/history/:studentId", getEmailHistory);
router.get("/low-attendance/:courseId", getLowAttendanceStudents);
router.post("/bulk-alerts", sendBulkAlerts);
router.post("/trigger-on-attendance", triggerOnAttendance);
router.post("/send-login-email", sendLoginEmailController);

export default router;
