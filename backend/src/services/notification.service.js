import { db } from "../config/firebase.js";

/**
 * Check if student's absence exceeds threshold
 * @param {string} studentId - Student ID
 * @param {string} courseId - Course ID
 * @returns {Promise<{exceeded: boolean, attendanceRate: number, totalSessions: number, attendedSessions: number}>}
 */
export const checkAbsenceThreshold = async (studentId, courseId) => {
  try {
    // Get all sessions for the course
    const sessionsSnapshot = await db
      .collection("sessions")
      .where("courseId", "==", courseId)
      .where("active", "==", false) // Only count completed sessions
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
      exceeded: absenceRate > 25, // Alert if absence > 25%
      attendanceRate: Math.round(attendanceRate * 100) / 100,
      absenceRate: Math.round(absenceRate * 100) / 100,
      totalSessions,
      attendedSessions,
      missedSessions: totalSessions - attendedSessions,
    };
  } catch (error) {
    console.error("Error checking absence threshold:", error);
    throw error;
  }
};

/**
 * Send absence alert notification to student
 * @param {string} studentId - Student ID
 * @param {string} courseId - Course ID
 * @param {object} attendanceData - Attendance statistics
 * @returns {Promise<{success: boolean, notificationId?: string}>}
 */
export const sendAbsenceAlert = async (studentId, courseId, attendanceData) => {
  try {
    // Get student and course details
    const studentDoc = await db.collection("users").doc(studentId).get();
    const courseDoc = await db.collection("courses").doc(courseId).get();

    if (!studentDoc.exists || !courseDoc.exists) {
      throw new Error("Student or course not found");
    }

    const studentData = studentDoc.data();
    const courseData = courseDoc.data();

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
      createdAt: new Date(),
      priority: "high",
    };

    const notificationRef = await db.collection("notifications").add(notification);

    console.log(
      `Absence alert sent to ${studentData.email} for ${courseData.name}`
    );

    return {
      success: true,
      notificationId: notificationRef.id,
    };
  } catch (error) {
    console.error("Error sending absence alert:", error);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Check all students in a course and send alerts if needed
 * @param {string} courseId - Course ID
 * @returns {Promise<{alertsSent: number, studentsChecked: number}>}
 */
export const checkCourseAbsences = async (courseId) => {
  try {
    // Get all enrolled students
    const courseDoc = await db.collection("courses").doc(courseId).get();

    if (!courseDoc.exists) {
      throw new Error("Course not found");
    }

    const courseData = courseDoc.data();
    const enrolledStudents = courseData.enrolledStudents || [];

    let alertsSent = 0;

    for (const studentId of enrolledStudents) {
      const absenceData = await checkAbsenceThreshold(studentId, courseId);

      if (absenceData.exceeded) {
        // Check if alert was already sent recently (within last 7 days)
        const recentAlertsSnapshot = await db
          .collection("notifications")
          .where("userId", "==", studentId)
          .where("courseId", "==", courseId)
          .where("type", "==", "absence_alert")
          .orderBy("createdAt", "desc")
          .limit(1)
          .get();

        let shouldSendAlert = true;

        if (!recentAlertsSnapshot.empty) {
          const lastAlert = recentAlertsSnapshot.docs[0].data();
          const daysSinceLastAlert =
            (new Date() - lastAlert.createdAt.toDate()) / (1000 * 60 * 60 * 24);

          if (daysSinceLastAlert < 7) {
            shouldSendAlert = false; // Don't spam alerts
          }
        }

        if (shouldSendAlert) {
          await sendAbsenceAlert(studentId, courseId, absenceData);
          alertsSent++;
        }
      }
    }

    return {
      alertsSent,
      studentsChecked: enrolledStudents.length,
    };
  } catch (error) {
    console.error("Error checking course absences:", error);
    throw error;
  }
};

/**
 * Get notifications for a user
 * @param {string} userId - User ID
 * @param {number} limit - Number of notifications to fetch
 * @returns {Promise<Array>}
 */
export const getUserNotifications = async (userId, limit = 20) => {
  try {
    const notificationsSnapshot = await db
      .collection("notifications")
      .where("userId", "==", userId)
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get();

    return notificationsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return [];
  }
};

/**
 * Mark notification as read
 * @param {string} notificationId - Notification ID
 * @returns {Promise<{success: boolean}>}
 */
export const markNotificationAsRead = async (notificationId) => {
  try {
    await db.collection("notifications").doc(notificationId).update({
      read: true,
      readAt: new Date(),
    });

    return { success: true };
  } catch (error) {
    console.error("Error marking notification as read:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Send custom notification
 * @param {string} userId - User ID
 * @param {string} title - Notification title
 * @param {string} message - Notification message
 * @param {string} type - Notification type
 * @param {object} metadata - Additional metadata
 * @returns {Promise<{success: boolean, notificationId?: string}>}
 */
export const sendNotification = async (
  userId,
  title,
  message,
  type = "info",
  metadata = {}
) => {
  try {
    const notification = {
      userId,
      type,
      title,
      message,
      read: false,
      createdAt: new Date(),
      priority: metadata.priority || "normal",
      ...metadata,
    };

    const notificationRef = await db.collection("notifications").add(notification);

    return {
      success: true,
      notificationId: notificationRef.id,
    };
  } catch (error) {
    console.error("Error sending notification:", error);
    return {
      success: false,
      error: error.message,
    };
  }
};
