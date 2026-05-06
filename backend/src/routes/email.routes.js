import express from "express";
import {
  sendTestEmailDirect,
  sendAbsenceAlertDirect,
  checkAllCoursesDirect,
  checkAndSendAbsenceAlertDirect,
} from "../services/email-direct.service.js";

const router = express.Router();

// Test email endpoint
router.post("/test", sendTestEmailDirect);

// Simple test that works without database
router.post("/test-simple", async (req, res) => {
  try {
    const nodemailer = await import("nodemailer");
    
    // Create test account
    const testAccount = await nodemailer.default.createTestAccount();
    
    const transporter = nodemailer.default.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    
    const info = await transporter.sendMail({
      from: '"Attendance System" <noreply@attendance.com>',
      to: "student@example.com",
      subject: "⚠️ Test Attendance Warning",
      html: `
        <div style="font-family: Arial; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1>⚠️ Attendance Warning</h1>
          </div>
          <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
            <p><strong>This is a test email from your Attendance System!</strong></p>
            <p>Your attendance notification system is working correctly! ✅</p>
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3>Test Statistics:</h3>
              <p><strong>Course:</strong> Software Development</p>
              <p><strong>Attendance Rate:</strong> 70%</p>
              <p><strong>Absence Rate:</strong> <span style="color: #dc3545;">30%</span></p>
            </div>
            <p>✅ Email system is working!</p>
            <p>✅ Notifications are being created!</p>
            <p>✅ Everything is functional!</p>
          </div>
        </div>
      `,
    });
    
    const previewUrl = nodemailer.default.getTestMessageUrl(info);
    
    console.log("✅ Simple test email sent!");
    console.log("📧 Preview URL:", previewUrl);
    
    res.json({
      success: true,
      message: "Test email sent successfully!",
      previewUrl: previewUrl,
      messageId: info.messageId,
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Send absence alert to specific student
router.post("/send-alert", sendAbsenceAlertDirect);

// Check all courses and send alerts
router.post("/check-all", checkAllCoursesDirect);

// Automatic check for single student (called after attendance recording)
router.post("/auto-check", async (req, res) => {
  try {
    const { studentId, courseId } = req.body;
    
    if (!studentId || !courseId) {
      return res.status(400).json({
        success: false,
        message: "studentId and courseId are required",
      });
    }
    
    const result = await checkAndSendAbsenceAlertDirect(studentId, courseId);
    res.status(200).json(result);
  } catch (error) {
    console.error("Error in auto-check:", error);
    res.status(500).json({
      success: false,
      message: "Failed to perform automatic check",
      error: error.message,
    });
  }
});

export default router;
