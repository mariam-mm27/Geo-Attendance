import nodemailer from "nodemailer";
import { db } from "../config/firebase.js";

/**
 * Create email transporter using SMTP
 * Configure with your email provider settings
 */
const createTransporter = () => {
  // Check if email credentials are configured
  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_PASSWORD;
  
  if (!emailUser || !emailPass || emailUser === "your-email@gmail.com") {
    console.error("Email credentials not configured! Please set EMAIL_USER and EMAIL_PASSWORD environment variables.");
    return null;
  }
  
  // For Gmail - use App Password
  return nodemailer.createTransporter({
    service: "gmail",
    auth: {
      user: emailUser,
      pass: emailPass,
    },
  });
};

/**
 * Send absence alert email to student
 * @param {string} studentId - Student ID
 * @param {string} courseId - Course ID
 * @param {object} attendanceData - Attendance statistics
 * @returns {Promise<{success: boolean, messageId?: string}>}
 */
export const sendAbsenceAlertEmail = async (studentId, courseId, attendanceData) => {
  try {
    console.log(`Sending email alert for student ${studentId}, course ${courseId}`);
    
    // Get student and course details from Firestore
    const studentDoc = await db.collection("users").doc(studentId).get();
    const courseDoc = await db.collection("courses").doc(courseId).get();

    if (!studentDoc.exists || !courseDoc.exists) {
      throw new Error("Student or course not found");
    }

    const studentData = studentDoc.data();
    const courseData = courseDoc.data();

    console.log(`Student email: ${studentData.email}`);

    if (!studentData.email) {
      throw new Error("Student email not found");
    }

    const transporter = createTransporter();
    if (!transporter) {
      throw new Error("Email transporter not configured. Check EMAIL_USER and EMAIL_PASSWORD environment variables.");
    }

    // Calculate absence percentage
    const absenceRate = (100 - attendanceData.attendanceRate).toFixed(2);
    const missedSessions = attendanceData.totalSessions - attendanceData.attendedSessions;

    // Email content
    const mailOptions = {
      from: process.env.EMAIL_USER || '"Attendance System" <your-email@gmail.com>',
      to: studentData.email,
      subject: "Attendance Warning",
      html: `
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
                <td style="padding: 12px; border: 1px solid #ddd; color: ${attendanceData.attendanceRate < 75 ? '#DC2626' : '#16A34A'}; font-weight: bold;">
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
      `,
      text: `
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
      `,
    };

    // Send email
    const info = await transporter.sendMail(mailOptions);

    // Log email sent in Firestore for tracking
    await db.collection("emailNotifications").add({
      studentId,
      courseId,
      studentEmail: studentData.email,
      type: "absence_alert",
      attendanceRate: attendanceData.attendanceRate,
      absenceRate: parseFloat(absenceRate),
      sentAt: new Date(),
      messageId: info.messageId,
      status: "sent",
    });

    console.log(`Absence alert email sent to ${studentData.email}: ${info.messageId}`);

    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (error) {
    console.error("Error sending absence alert email:", error);
    
    // Log failed attempt
    await db.collection("emailNotifications").add({
      studentId,
      courseId,
      type: "absence_alert",
      attendanceRate: attendanceData.attendanceRate,
      sentAt: new Date(),
      status: "failed",
      error: error.message,
    });

    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Check attendance threshold and send email if exceeded
 * @param {string} studentId - Student ID
 * @param {string} courseId - Course ID
 * @returns {Promise<{success: boolean, emailSent: boolean, message?: string}>}
 */
export const checkAndSendAbsenceAlert = async (studentId, courseId) => {
  try {
    // Get all sessions for the course
    const sessionsSnapshot = await db
      .collection("sessions")
      .where("courseId", "==", courseId)
      .get();

    const totalSessions = sessionsSnapshot.size;

    if (totalSessions === 0) {
      return {
        success: true,
        emailSent: false,
        message: "No sessions recorded yet",
      };
    }

    // Get student's attendance records
    const attendanceSnapshot = await db
      .collection("attendance")
      .where("studentId", "==", studentId)
      .where("courseId", "==", courseId)
      .get();

    const attendedSessions = attendanceSnapshot.size;
    const attendanceRate = (attendedSessions / totalSessions) * 100;
    const absenceRate = 100 - attendanceRate;

    // Check if absence exceeds 25% (attendance below 75%)
    if (absenceRate > 25) {
      // Check if alert was already sent recently (within 7 days)
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

      if (!recentAlertsSnapshot.empty) {
        return {
          success: true,
          emailSent: false,
          message: "Alert already sent within the last 7 days",
        };
      }

      // Send email alert
      const emailResult = await sendAbsenceAlertEmail(studentId, courseId, {
        attendanceRate: parseFloat(attendanceRate.toFixed(2)),
        attendedSessions,
        totalSessions,
      });

      return {
        success: emailResult.success,
        emailSent: emailResult.success,
        message: emailResult.success
          ? "Absence alert email sent successfully"
          : emailResult.error,
        attendanceRate: attendanceRate.toFixed(2),
        absenceRate: absenceRate.toFixed(2),
      };
    }

    return {
      success: true,
      emailSent: false,
      message: "Attendance within acceptable range",
      attendanceRate: attendanceRate.toFixed(2),
    };
  } catch (error) {
    console.error("Error checking and sending absence alert:", error);
    return {
      success: false,
      emailSent: false,
      error: error.message,
    };
  }
};

/**
 * Get email notification history for a student
 * @param {string} studentId - Student ID
 * @returns {Promise<Array>} Email notification history
 */
export const getStudentEmailHistory = async (studentId) => {
  try {
    const notificationsSnapshot = await db
      .collection("emailNotifications")
      .where("studentId", "==", studentId)
      .orderBy("sentAt", "desc")
      .get();

    return notificationsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error("Error fetching email history:", error);
    return [];
  }
};

/**
 * Send bulk absence alerts for a course
 * @param {string} courseId - Course ID
 * @returns {Promise<{success: boolean, sent: number, failed: number, details: Array}>}
 */
export const sendBulkAbsenceAlerts = async (courseId) => {
  try {
    // Get course details
    const courseDoc = await db.collection("courses").doc(courseId).get();
    if (!courseDoc.exists) {
      throw new Error("Course not found");
    }

    const courseData = courseDoc.data();
    const enrolledStudents = courseData.enrolledStudents || [];

    const results = {
      sent: 0,
      failed: 0,
      details: [],
    };

    // Check each student
    for (const studentId of enrolledStudents) {
      const result = await checkAndSendAbsenceAlert(studentId, courseId);
      
      if (result.emailSent) {
        results.sent++;
      } else if (!result.success) {
        results.failed++;
      }

      results.details.push({
        studentId,
        ...result,
      });
    }

    return {
      success: true,
      ...results,
    };
  } catch (error) {
    console.error("Error sending bulk absence alerts:", error);
    return {
      success: false,
      error: error.message,
    };
  }
};
