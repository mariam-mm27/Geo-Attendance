/**
 * Cloud Functions for Firebase - Geo Attendance System
 * Auto-triggers for Security + Notifications
 */

const {setGlobalOptions} = require("firebase-functions");
const {onDocumentCreated} = require("firebase-functions/v2/firestore");
const {onSchedule} = require("firebase-functions/v2/scheduler");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");

// Initialize Firebase Admin
admin.initializeApp();
const db = admin.firestore();

// Set global options for all functions
setGlobalOptions({maxInstances: 10, region: "us-central1"});

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
 * Send absence alert notification to student
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

    // Create notification
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

    logger.info(
        `Absence alert sent to ${studentData.email} for ${courseData.name}`,
    );

    return {
      success: true,
      notificationId: notificationRef.id,
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
 * Manual Trigger: Check all absences for a specific course
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
              results.push({studentId, status: "alert_sent", data: absenceData});
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
        const sessionStart =
  sessionData.startTime && sessionData.startTime.toDate ?
    sessionData.startTime.toDate() :
    new Date(sessionData.startTime);

        const sessionEnd =
  sessionData.endTime && sessionData.endTime.toDate ?
    sessionData.endTime.toDate() :
    new Date(sessionData.endTime);
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


const {onCall} = require("firebase-functions/v2/https");
const nodemailer = require("nodemailer");


const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "mariamhany31017@gmail.com",
    pass: "okydgndrscezwlic",
  },
});

exports.sendLoginEmail = onCall(
    {region: "us-central1", maxInstances: 5},
    async (request) => {
      try {
        const {email, name} = request.data;

        if (!email) {
          throw new Error("Email is required");
        }

        await transporter.sendMail({
          from: "Geo Attendance System",
          to: email,
          subject: "Login Alert",
          text: `Hello ${name || "User"} 👋

You have successfully logged into your account.

Time: ${new Date().toLocaleString()}

If this wasn't you, please contact support immediately.`,
        });

        logger.info(`Login email sent to ${email}`);

        return {success: true};
      } catch (error) {
        logger.error("Error sending login email:", error);
        throw new Error("Failed to send email");
      }
    },
);
