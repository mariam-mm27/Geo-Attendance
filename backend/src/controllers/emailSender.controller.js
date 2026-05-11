import { sendLoginHelloEmail, sendAttendanceWarningEmail } from "../services/emailSender.service.js";
import { db } from "../config/firebase.js";

/**
 * Send login hello email
 */
export const sendLoginHelloEmailController = async (req, res) => {
  try {
    const { email, name } = req.body;

    if (!email || !name) {
      return res.status(400).json({
        success: false,
        message: "Email and name are required",
      });
    }

    console.log(`📧 Sending login hello email to ${email}...`);

    const result = await sendLoginHelloEmail(email, name);

    if (result.success) {
      return res.status(200).json({
        success: true,
        message: "Login hello email sent successfully",
        messageId: result.messageId,
      });
    } else {
      return res.status(500).json({
        success: false,
        message: "Failed to send login hello email",
        error: result.error,
      });
    }
  } catch (error) {
    console.error("❌ Error sending login hello email:", error);
    return res.status(500).json({
      success: false,
      message: "Error sending login hello email",
      error: error.message,
    });
  }
};

/**
 * Send attendance warning email
 */
export const sendAttendanceWarningEmailController = async (req, res) => {
  try {
    const { studentId, courseId, attendanceRate, absenceRate, missedSessions, totalSessions } = req.body;

    if (!studentId || !courseId) {
      return res.status(400).json({
        success: false,
        message: "Student ID and Course ID are required",
      });
    }

    // Get student and course data using Admin SDK
    const studentDoc = await db.collection("users").doc(studentId).get();
    const courseDoc = await db.collection("courses").doc(courseId).get();

    if (!studentDoc.exists || !courseDoc.exists) {
      return res.status(404).json({
        success: false,
        message: "Student or course not found",
      });
    }

    const studentData = studentDoc.data();
    const courseData = courseDoc.data();

    if (!studentData.email) {
      return res.status(400).json({
        success: false,
        message: "Student email not found",
      });
    }

    console.log(`📧 Sending attendance warning email to ${studentData.email}...`);

    const result = await sendAttendanceWarningEmail(
      studentData.email,
      studentData.name || "Student",
      courseData.name || "Course",
      attendanceRate || 0,
      absenceRate || 0,
      missedSessions || 0,
      totalSessions || 0
    );

    if (result.success) {
      return res.status(200).json({
        success: true,
        message: "Attendance warning email sent successfully",
        messageId: result.messageId,
      });
    } else {
      return res.status(500).json({
        success: false,
        message: "Failed to send attendance warning email",
        error: result.error,
      });
    }
  } catch (error) {
    console.error("❌ Error sending attendance warning email:", error);
    return res.status(500).json({
      success: false,
      message: "Error sending attendance warning email",
      error: error.message,
    });
  }
};
