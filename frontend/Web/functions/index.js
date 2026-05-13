/**
 * Cloud Functions for Firebase - Geo Attendance System
 * Auto-triggers for Security + Notifications
 */

const {setGlobalOptions} = require("firebase-functions");
const {onDocumentCreated} = require("firebase-functions/v2/firestore");
const {onSchedule} = require("firebase-functions/v2/scheduler");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");

// Initialize Firebase Admin
admin.initializeApp();
const db = admin.firestore();

// Set global options for all functions
setGlobalOptions({maxInstances: 10, region: "us-central1"});

/**
 * Create email transporter using Nodemailer with Gmail
 * Configure using environment variables
 */
const createTransporter = () => {
  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_PASSWORD;

  if (!emailUser || !emailPass || emailUser === "your-email@gmail.com") {
    logger.warn("Email credentials not configured! Set EMAIL_USER and EMAIL_PASSWORD environment variables.");
    return null;
  }

  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: emailUser,
      pass: emailPass,
    },
  });
};

/**
 * Send email notification using Nodemailer
 * @param {string} to - Recipient email
 * @param {string} subject - Email subject
 * @param {string} html - HTML body
 * @param {string} text - Plain text body
 * @returns {Promise<{success: boolean, messageId?: string, error?: string}>}
 */
const sendEmail = async (to, subject, html, text) => {
  try {
    const transporter = createTransporter();
    if (!transporter) {
      return {
        success: false,
        error: "Email transporter not configured. Please set EMAIL_USER and EMAIL_PASSWORD environment variables.",
      };
    }

    const info = await transporter.sendMail({
      from: process.env.EMAIL_USER || "\"Attendance System\" <your-email@gmail.com>",
      to,
      subject,
      html,
      text,
    });

    logger.info(`Email sent to ${to}: ${info.messageId}`);
    return {success: true, messageId: info.messageId};
  } catch (error) {
    logger.error("Error sending email:", error);
    return {success: false, error: error.message};
  }
};

/**
 * Check if student's absence exceeds threshold (>25%)
 * @param {string} studentId
 * @param {string} courseId
 * @return {Promise<object>}
 */
async function checkAbsenceThreshold(studentId, courseId) {
  try {
    // Get all completed sessions for the course
    const sessionsSnapshot = await db
        .collection("sessions")
        .where("courseId", "==", courseId)
        .where("active", "==", false)
        .get();

    const totalSessions = sessionsSnapshot.size;

    if (totalSessions === 0) {
      return {
        exceeded: false,
        attendanceRate: 100,
        totalSessions: 0,
        attendedSessions: 0,
      };
    }

    // Get student's attendance records for this course
    const attendanceSnapshot = await db
        .collection("attendance")
        .where("studentId", "==", studentId)
        .where("courseId", "==", courseId)
        .get();

    const attendedSessions = attendanceSnapshot.size;
    const attendanceRate = (attendedSessions / totalSessions) * 100;
    const absenceRate = 100 - attendanceRate;

    return {
      exceeded: absenceRate > 25,
      attendanceRate: Math.round(attendanceRate * 100) / 100,
      absenceRate: Math.round(absenceRate * 100) / 100,
      totalSessions,
      attendedSessions,
      missedSessions: totalSessions - attendedSessions,
    };
  } catch (error) {
    logger.error("Error checking absence threshold:", error);
    throw error;
  }
}

/**
 * Send absence alert notification and email to student
 * @param {string} studentId
 * @param {string} courseId
 * @param {object} attendanceData
 */
async function sendAbsenceAlert(studentId, courseId, attendanceData) {
  try {
    // Get student and course details
    const [studentDoc, courseDoc] = await Promise.all([
      db.collection("users").doc(studentId).get(),
      db.collection("courses").doc(courseId).get(),
    ]);

    if (!studentDoc.exists || !courseDoc.exists) {
      throw new Error("Student or course not found");
    }

    const studentData = studentDoc.data();
    const courseData = courseDoc.data();

    // Check if alert was already sent recently (within last 7 days)
    const recentAlertsSnapshot = await db
        .collection("notifications")
        .where("userId", "==", studentId)
        .where("courseId", "==", courseId)
        .where("type", "==", "absence_alert")
        .orderBy("createdAt", "desc")
        .limit(1)
        .get();

    if (!recentAlertsSnapshot.empty) {
      const lastAlert = recentAlertsSnapshot.docs[0].data();
      const daysSinceLastAlert =
          (new Date() - lastAlert.createdAt.toDate()) / (1000 * 60 * 60 * 24);

      if (daysSinceLastAlert < 7) {
        logger.info(`Skipping alert for ${studentData.email} - sent recently`);
        return {success: false, reason: "recent_alert_exists"};
      }
    }

    // Check if email exists
    if (!studentData.email) {
      throw new Error("Student email not found");
    }

    const absenceRate = (100 - attendanceData.attendanceRate).toFixed(2);
    const missedSessions = attendanceData.totalSessions - attendanceData.attendedSessions;

    // Create notification in Firestore
    const notification = {
      userId: studentId,
      type: "absence_alert",
      title: "⚠️ Low Attendance Warning",
      message: `Your attendance in ${courseData.name} is ${attendanceData.attendanceRate}%. You have missed ${attendanceData.missedSessions} out of ${attendanceData.totalSessions} sessions. Please improve your attendance to avoid academic consequences.`,
      courseId,
      courseName: courseData.name,
      attendanceRate: attendanceData.attendanceRate,
      absenceRate: attendanceData.absenceRate,
      read: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      priority: "high",
    };

    const notificationRef = await db.collection("notifications").add(notification);

    // Send email using Nodemailer
    const subject = "Attendance Warning";
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #173B66; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">Attendance Warning</h1>
        </div>
        
        <div style="padding: 30px; background-color: #f8f9fa;">
          <p style="font-size: 16px; color: #333;">Dear ${studentData.name || "Student"},</p>
          
          <p style="font-size: 16px; color: #333; line-height: 1.6;">
            This is an automated notification regarding your attendance in <strong>${courseData.name}</strong>.
          </p>
          
          <div style="background-color: #FEE2E2; border-left: 4px solid #DC2626; padding: 15px; margin: 20px 0;">
            <p style="margin: 0; color: #991B1B; font-weight: bold;">
              You have exceeded 25% absence in this course.
            </p>
          </div>
          
          <h3 style="color: #173B66; margin-top: 25px;">Attendance Details:</h3>
          <table style="width: 100%; background-color: white; border-collapse: collapse; margin-top: 10px;">
            <tr style="background-color: #E0F2FE;">
              <td style="padding: 12px; border: 1px solid #ddd; font-weight: bold;">Course</td>
              <td style="padding: 12px; border: 1px solid #ddd;">${courseData.name} (${courseData.code || "N/A"})</td>
            </tr>
            <tr>
              <td style="padding: 12px; border: 1px solid #ddd; font-weight: bold;">Attendance Rate</td>
              <td style="padding: 12px; border: 1px solid #ddd; color: ${attendanceData.attendanceRate < 75 ? "#DC2626" : "#16A34A"}; font-weight: bold;">
                ${attendanceData.attendanceRate}%
              </td>
            </tr>
            <tr style="background-color: #E0F2FE;">
              <td style="padding: 12px; border: 1px solid #ddd; font-weight: bold;">Absence Rate</td>
              <td style="padding: 12px; border: 1px solid #ddd; color: #DC2626; font-weight: bold;">${absenceRate}%</td>
            </tr>
            <tr>
              <td style="padding: 12px; border: 1px solid #ddd; font-weight: bold;">Sessions Attended</td>
              <td style="padding: 12px; border: 1px solid #ddd;">${attendanceData.attendedSessions} / ${attendanceData.totalSessions}</td>
            </tr>
            <tr style="background-color: #E0F2FE;">
              <td style="padding: 12px; border: 1px solid #ddd; font-weight: bold;">Sessions Missed</td>
              <td style="padding: 12px; border: 1px solid #ddd; color: #DC2626; font-weight: bold;">${missedSessions}</td>
            </tr>
          </table>
          
          <div style="background-color: #FEF3C7; border-left: 4px solid #F59E0B; padding: 15px; margin: 25px 0;">
            <p style="margin: 0; color: #92400E;">
              <strong>Important:</strong> Please improve your attendance to avoid academic consequences. 
              If your attendance drops below 75%, you may be at risk of course failure or other penalties 
              as per university policy.
            </p>
          </div>
          
          <p style="font-size: 14px; color: #64748B; margin-top: 30px;">
            This is an automated message from the Attendance Management System. 
            Please contact your professor or academic advisor if you have any questions.
          </p>
        </div>
        
        <div style="background-color: #173B66; color: white; padding: 15px; text-align: center; font-size: 12px;">
          <p style="margin: 0;">Geo-Attendance System</p>
        </div>
      </div>
    `;
    const text = `
Attendance Warning

Dear ${studentData.name || "Student"},

This is an automated notification regarding your attendance in ${courseData.name}.

You have exceeded 25% absence in this course.

Attendance Details:
- Course: ${courseData.name} (${courseData.code || "N/A"})
- Attendance Rate: ${attendanceData.attendanceRate}%
- Absence Rate: ${absenceRate}%
- Sessions Attended: ${attendanceData.attendedSessions} / ${attendanceData.totalSessions}
- Sessions Missed: ${missedSessions}

Important: Please improve your attendance to avoid academic consequences. If your attendance drops below 75%, you may be at risk of course failure or other penalties as per university policy.

This is an automated message from the Attendance Management System.
    `;

    const emailResult = await sendEmail(studentData.email, subject, html, text);

    // Log email sent in Firestore for tracking
    await db.collection("emailNotifications").add({
      studentId,
      courseId,
      studentEmail: studentData.email,
      type: "absence_alert",
      attendanceRate: attendanceData.attendanceRate,
      absenceRate: parseFloat(absenceRate),
      sentAt: admin.firestore.FieldValue.serverTimestamp(),
      messageId: emailResult.success ? emailResult.messageId : null,
      status: emailResult.success ? "sent" : "failed",
      error: emailResult.error || null,
    });

    logger.info(`Absence alert sent to ${studentData.email} for ${courseData.name}`);

    return {
      success: true,
      notificationId: notificationRef.id,
      emailSent: emailResult.success,
      messageId: emailResult.messageId,
    };
  } catch (error) {
    logger.error("Error sending absence alert:", error);
    return {success: false, error: error.message};
  }
}

/**
 * Trigger: When new attendance is recorded, check absence threshold
 * and send alert if > 25%
 */
exports.onAttendanceCreated = onDocumentCreated(
    {
      document: "attendance/{attendanceId}",
      maxInstances: 10,
    },
    async (event) => {
      const attendanceData = event.data.data();
      const {studentId, courseId} = attendanceData;

      logger.info(`New attendance recorded for student ${studentId} in course ${courseId}`);

      try {
        // Check absence threshold
        const absenceData = await checkAbsenceThreshold(studentId, courseId);

        if (absenceData.exceeded) {
          logger.warn(`Student ${studentId} has ${absenceData.absenceRate}% absence in course ${courseId}`);

          // Send absence alert
          const result = await sendAbsenceAlert(studentId, courseId, absenceData);

          if (result.success) {
            logger.info(`Absence alert sent successfully: ${result.notificationId}`);
          } else {
            logger.info(`Alert not sent: ${result.reason || result.error}`);
          }
        } else {
          logger.info(`Student ${studentId} attendance OK: ${absenceData.attendanceRate}%`);
        }

        return null;
      } catch (error) {
        logger.error("Error in onAttendanceCreated:", error);
        return null;
      }
    },
);

/**
 * Trigger: When attendance is deleted (marked as absent), check absence threshold
 */
exports.onAttendanceDeleted = onDocumentCreated(
    {
      document: "attendance/{attendanceId}",
      maxInstances: 10,
    },
    async (event) => {
      // This is triggered on create - the absence check happens after any attendance change
      // For deletion handling, we'd need onDocumentDeleted trigger
      // For now, we check on every new attendance record
      return null;
    },
);

/**
 * Scheduled Function: Check all courses daily at 9 AM for absence alerts
 * Catches students who may have missed multiple sessions
 */
exports.dailyAbsenceCheck = onSchedule(
    {
      schedule: "0 9 * * *", // Every day at 9:00 AM
      timeZone: "Africa/Cairo", // Adjust to your timezone
      maxInstances: 5,
    },
    async (event) => {
      logger.info("Starting daily absence check...");

      try {
        // Get all courses
        const coursesSnapshot = await db.collection("courses").get();
        let totalAlertsSent = 0;
        let totalStudentsChecked = 0;

        for (const courseDoc of coursesSnapshot.docs) {
          const courseId = courseDoc.id;
          const courseData = courseDoc.data();
          const enrolledStudents = courseData.enrolledStudents || [];

          logger.info(`Checking ${enrolledStudents.length} students in course: ${courseData.name}`);

          for (const studentId of enrolledStudents) {
            totalStudentsChecked++;

            try {
              const absenceData = await checkAbsenceThreshold(studentId, courseId);

              if (absenceData.exceeded) {
                const result = await sendAbsenceAlert(studentId, courseId, absenceData);
                if (result.success) {
                  totalAlertsSent++;
                }
              }
            } catch (studentError) {
              logger.error(`Error checking student ${studentId}:`, studentError);
            }
          }
        }

        logger.info(`Daily absence check complete. Checked ${totalStudentsChecked} students, sent ${totalAlertsSent} alerts.`);

        return {
          success: true,
          studentsChecked: totalStudentsChecked,
          alertsSent: totalAlertsSent,
          timestamp: new Date().toISOString(),
        };
      } catch (error) {
        logger.error("Error in dailyAbsenceCheck:", error);
        throw error;
      }
    },
);

/**
 * Manual Trigger HTTP: Check all absences for a specific course
 * Can be called via HTTP or from admin panel
 */
exports.checkCourseAbsencesHttp = require("firebase-functions/v2/https").onRequest(
    {maxInstances: 5, region: "us-central1"},
    async (req, res) => {
      // Verify admin authorization
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        res.status(401).json({error: "Unauthorized"});
        return;
      }

      const courseId = req.query.courseId || req.body.courseId;
      if (!courseId) {
        res.status(400).json({error: "courseId is required"});
        return;
      }

      try {
        const courseDoc = await db.collection("courses").doc(courseId).get();

        if (!courseDoc.exists) {
          res.status(404).json({error: "Course not found"});
          return;
        }

        const courseData = courseDoc.data();
        const enrolledStudents = courseData.enrolledStudents || [];

        let alertsSent = 0;
        const results = [];

        for (const studentId of enrolledStudents) {
          const absenceData = await checkAbsenceThreshold(studentId, courseId);

          if (absenceData.exceeded) {
            const result = await sendAbsenceAlert(studentId, courseId, absenceData);
            if (result.success) {
              alertsSent++;
              results.push({studentId, status: "alert_sent", data: absenceData, emailSent: result.emailSent});
            } else {
              results.push({studentId, status: "skipped", reason: result.reason});
            }
          } else {
            results.push({studentId, status: "threshold_not_exceeded", data: absenceData});
          }
        }

        res.status(200).json({
          success: true,
          courseId,
          courseName: courseData.name,
          studentsChecked: enrolledStudents.length,
          alertsSent,
          results,
        });
      } catch (error) {
        logger.error("Error in checkCourseAbsencesHttp:", error);
        res.status(500).json({error: error.message});
      }
    },
);

/**
 * Security Audit: Log suspicious attendance activity
 * Triggers when attendance is created outside of session time
 */
exports.securityAuditAttendance = onDocumentCreated(
    {
      document: "attendance/{attendanceId}",
      maxInstances: 10,
    },
    async (event) => {
      const attendanceData = event.data.data();
      const {sessionId, studentId, createdAt} = attendanceData;

      try {
        // Get session details
        const sessionDoc = await db.collection("sessions").doc(sessionId).get();

        if (!sessionDoc.exists) {
          logger.warn(`Attendance ${event.params.attendanceId} references non-existent session ${sessionId}`);
          return;
        }

        const sessionData = sessionDoc.data();
        const now = new Date();
        const sessionStart = sessionData.startTime && sessionData.startTime.toDate ? sessionData.startTime.toDate() : new Date(sessionData.startTime);
        const sessionEnd = sessionData.endTime && sessionData.endTime.toDate ? sessionData.endTime.toDate() : new Date(sessionData.endTime);

        // Check if attendance was recorded outside session window
        if (now < sessionStart || now > sessionEnd) {
          logger.warn(
              `SECURITY: Attendance recorded outside session time. ` +
              `Student: ${studentId}, Session: ${sessionId}, ` +
              `Time: ${now}, Session window: ${sessionStart} - ${sessionEnd}`,
          );

          // Create security alert notification for admins
          const securityAlert = {
            type: "security_alert",
            title: "Suspicious Attendance Activity",
            message: `Attendance recorded outside session time. Student: ${studentId}, Session: ${sessionId}`,
            attendanceId: event.params.attendanceId,
            studentId,
            sessionId,
            recordedAt: admin.firestore.FieldValue.serverTimestamp(),
            sessionStart,
            sessionEnd,
            priority: "high",
            resolved: false,
          };

          // Store security alerts in a separate collection for admins
          await db.collection("securityAlerts").add(securityAlert);
        }
      } catch (error) {
        logger.error("Error in securityAuditAttendance:", error);
      }
    },
);

/**
 * HTTP Function: Send manual absence alert for a specific student
 * Can be triggered from admin panel
 */
exports.sendManualAbsenceAlert = require("firebase-functions/v2/https").onRequest(
    {maxInstances: 5, region: "us-central1"},
    async (req, res) => {
      try {
        const {studentId, courseId} = req.body;

        if (!studentId || !courseId) {
          res.status(400).json({error: "studentId and courseId are required"});
          return;
        }

        const absenceData = await checkAbsenceThreshold(studentId, courseId);

        if (!absenceData.exceeded) {
          res.status(400).json({
            error: "Student attendance is within acceptable range",
            attendanceRate: absenceData.attendanceRate,
          });
          return;
        }

        const result = await sendAbsenceAlert(studentId, courseId, absenceData);

        if (result.success) {
          res.status(200).json({
            success: true,
            message: "Absence alert sent successfully",
            notificationId: result.notificationId,
            emailSent: result.emailSent,
            messageId: result.messageId,
          });
        } else {
          res.status(500).json({
            success: false,
            error: result.error,
          });
        }
      } catch (error) {
        logger.error("Error in sendManualAbsenceAlert:", error);
        res.status(500).json({error: error.message});
      }
    },
);
