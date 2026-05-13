import { db } from "../config/firebase.js";
import nodemailer from "nodemailer";

/**
 * 1. إعداد الـ Transporter لبعت الإيميلات
 * تأكدي من تفعيل "2-Step Verification" في حساب جوجل 
 * واستخدام الـ 16 حرف بتوع الـ App Password هنا
 */
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true, // استخدام التشفير الكامل (SSL)
  auth: {
    user: 'mariam2789309@gmail.com', 
    pass: 'plbtlkamvqjccpje' 
  },
  tls: {
    // دي مهمة جداً عشان لو فيه مشكلة في الـ Network أو الـ SSL بتاع الجهاز
    rejectUnauthorized: false
  }
});

/**
 * Check if student's absence exceeds threshold (25%)
 */
export const checkAbsenceThreshold = async (studentId, courseId) => {
  try {
    // جلب كل المحاضرات المنتهية للكورس
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

    // جلب سجلات حضور الطالب لهذا الكورس
    const attendanceSnapshot = await db
      .collection("attendance")
      .where("studentId", "==", studentId)
      .where("courseId", "==", courseId)
      .get();

    const attendedSessions = attendanceSnapshot.size;
    const attendanceRate = (attendedSessions / totalSessions) * 100;
    const absenceRate = 100 - attendanceRate;

    return {
      exceeded: absenceRate > 25, // التنبيه لو الغياب أكبر من 25% (الحضور أقل من 75%)
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
 * Send absence alert notification (In-app + Email)
 */
export const sendAbsenceAlert = async (studentId, courseId, attendanceData) => {
  try {
    // جلب بيانات الطالب والكورس من Firestore
    const studentDoc = await db.collection("users").doc(studentId).get();
    const courseDoc = await db.collection("courses").doc(courseId).get();

    if (!studentDoc.exists || !courseDoc.exists) {
      throw new Error("Student or course not found");
    }

    const studentData = studentDoc.data();
    const courseData = courseDoc.data();

    // أولاً: إنشاء الإشعار داخل الأبلكيشن (Firestore)
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

    // ثانياً: إرسال الإيميل الفعلي للطالب (Nodemailer)
    const mailOptions = {
      from: '"Geo-Attendance System" <mariam2789309@gmail.com>',
      to: studentData.email,
      subject: `Attendance Warning: ${courseData.name}`,
      text: `Dear ${studentData.name},\n\nThis is an automated warning regarding your attendance in ${courseData.name}.\n\n` +
            `Current Attendance Rate: ${attendanceData.attendanceRate}%\n` +
            `Total Sessions: ${attendanceData.totalSessions}\n` +
            `Sessions Missed: ${attendanceData.missedSessions}\n\n` +
            `Please ensure you attend future sessions to avoid any academic penalties.`
    };

    await transporter.sendMail(mailOptions);

    console.log(`[Success] Absence alert sent to ${studentData.email} for ${courseData.name}`);

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
 */
export const checkCourseAbsences = async (courseId) => {
  try {
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
        // منع الإزعاج: لا ترسل تنبيه إذا تم إرسال واحد في آخر 7 أيام
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
            shouldSendAlert = false;
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