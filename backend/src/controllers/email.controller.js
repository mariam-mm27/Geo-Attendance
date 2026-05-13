import {
  sendAbsenceAlertEmail,
  checkAndSendAbsenceAlert,
  getStudentEmailHistory,
  sendBulkAbsenceAlerts,
  sendLoginEmail,
} from "../services/email.service.js";
import { db } from "../config/firebase.js";

/**
 * Send absence alert email to a specific student
 * POST /api/email/send-absence-alert
 */
export const sendAbsenceAlert = async (req, res) => {
  try {
    const { studentId, courseId } = req.body;

    if (!studentId || !courseId) {
      return res.status(400).json({
        success: false,
        error: "Student ID and Course ID are required",
      });
    }

    // Get attendance data
    const sessionsSnapshot = await db
      .collection("sessions")
      .where("courseId", "==", courseId)
      .get();

    const totalSessions = sessionsSnapshot.size;

    const attendanceSnapshot = await db
      .collection("attendance")
      .where("studentId", "==", studentId)
      .where("courseId", "==", courseId)
      .get();

    const attendedSessions = attendanceSnapshot.size;
    const attendanceRate =
      totalSessions > 0 ? (attendedSessions / totalSessions) * 100 : 0;

    // Send email
    const result = await sendAbsenceAlertEmail(studentId, courseId, {
      attendanceRate: parseFloat(attendanceRate.toFixed(2)),
      attendedSessions,
      totalSessions,
    });

    if (result.success) {
      res.status(200).json({
        success: true,
        message: "Absence alert email sent successfully",
        messageId: result.messageId,
        attendanceRate: attendanceRate.toFixed(2),
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error || "Failed to send email",
      });
    }
  } catch (error) {
    console.error("Error sending absence alert:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * Check attendance and send alert if threshold exceeded
 * POST /api/email/check-and-alert
 */
export const checkAndAlert = async (req, res) => {
  try {
    const { studentId, courseId } = req.body;

    if (!studentId || !courseId) {
      return res.status(400).json({
        success: false,
        error: "Student ID and Course ID are required",
      });
    }

    const result = await checkAndSendAbsenceAlert(studentId, courseId);

    res.status(200).json(result);
  } catch (error) {
    console.error("Error checking and alerting:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * Send bulk absence alerts for all students in a course
 * POST /api/email/send-bulk-alerts
 */
export const sendBulkAlerts = async (req, res) => {
  try {
    const { courseId } = req.body;

    if (!courseId) {
      return res.status(400).json({
        success: false,
        error: "Course ID is required",
      });
    }

    const result = await sendBulkAbsenceAlerts(courseId);

    if (result.success) {
      res.status(200).json({
        success: true,
        message: `Bulk alerts sent: ${result.sent} sent, ${result.failed} failed`,
        ...result,
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error,
      });
    }
  } catch (error) {
    console.error("Error sending bulk alerts:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * Get email notification history for a student
 * GET /api/email/history/:studentId
 */
export const getEmailHistory = async (req, res) => {
  try {
    const { studentId } = req.params;

    if (!studentId) {
      return res.status(400).json({
        success: false,
        error: "Student ID is required",
      });
    }

    const history = await getStudentEmailHistory(studentId);

    res.status(200).json({
      success: true,
      data: history,
    });
  } catch (error) {
    console.error("Error fetching email history:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * Get all students with low attendance for a course
 * GET /api/email/low-attendance/:courseId
 */
export const getLowAttendanceStudents = async (req, res) => {
  try {
    const { courseId } = req.params;

    if (!courseId) {
      return res.status(400).json({
        success: false,
        error: "Course ID is required",
      });
    }

    // Get course details
    const courseDoc = await db.collection("courses").doc(courseId).get();
    if (!courseDoc.exists) {
      return res.status(404).json({
        success: false,
        error: "Course not found",
      });
    }

    const courseData = courseDoc.data();
    const enrolledStudents = courseData.enrolledStudents || [];

    // Get total sessions
    const sessionsSnapshot = await db
      .collection("sessions")
      .where("courseId", "==", courseId)
      .get();

    const totalSessions = sessionsSnapshot.size;

    if (totalSessions === 0) {
      return res.status(200).json({
        success: true,
        data: [],
        message: "No sessions recorded yet",
      });
    }

    // Check each student's attendance
    const lowAttendanceStudents = [];

    for (const studentId of enrolledStudents) {
      const attendanceSnapshot = await db
        .collection("attendance")
        .where("studentId", "==", studentId)
        .where("courseId", "==", courseId)
        .get();

      const attendedSessions = attendanceSnapshot.size;
      const attendanceRate = (attendedSessions / totalSessions) * 100;

      if (attendanceRate < 75) {
        // Get student details
        const studentDoc = await db.collection("users").doc(studentId).get();
        const studentData = studentDoc.exists ? studentDoc.data() : {};

        // Check if alert was already sent
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

        const recentAlertsSnapshot = await db
          .collection("emailNotifications")
          .where("studentId", "==", studentId)
          .where("courseId", "==", courseId)
          .where("type", "==", "absence_alert")
          .where("sentAt", ">=", oneWeekAgo)
          .where("status", "==", "sent")
          .get();

        lowAttendanceStudents.push({
          studentId,
          studentName: studentData.name || "Unknown",
          email: studentData.email || "N/A",
          attendanceRate: attendanceRate.toFixed(2),
          attendedSessions,
          totalSessions,
          missedSessions: totalSessions - attendedSessions,
          alertSent: !recentAlertsSnapshot.empty,
          lastAlertDate: recentAlertsSnapshot.empty
            ? null
            : recentAlertsSnapshot.docs[0].data().sentAt.toDate(),
        });
      }
    }

    // Sort by attendance rate (lowest first)
    lowAttendanceStudents.sort(
      (a, b) => parseFloat(a.attendanceRate) - parseFloat(b.attendanceRate),
    );

    res.status(200).json({
      success: true,
      data: lowAttendanceStudents,
      totalLowAttendance: lowAttendanceStudents.length,
    });
  } catch (error) {
    console.error("Error getting low attendance students:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * Triggered when attendance is recorded - automatically check and send alert
 * POST /api/email/trigger-on-attendance
 */
export const triggerOnAttendance = async (req, res) => {
  try {
    const { studentId, courseId } = req.body;

    if (!studentId || !courseId) {
      return res.status(400).json({
        success: false,
        error: "Student ID and Course ID are required",
      });
    }

    const result = await checkAndSendAbsenceAlert(studentId, courseId);

    res.status(200).json(result);
  } catch (error) {
    console.error("Error triggering on attendance:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

export const sendLoginEmailController = async (req, res) => {
  try {
    console.log("LOGIN EMAIL ROUTE HIT");
    console.log(req.body);
    const { email, name } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: "Email is required",
      });
    }

    const result = await sendLoginEmail(email, name || "User");

    if (result.success) {
      return res.status(200).json({
        success: true,
        message: "Login email sent successfully",
      });
    }

    return res.status(500).json({
      success: false,
      error: result.error,
    });
  } catch (error) {
    console.error("Error sending login email:", error);

    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};
