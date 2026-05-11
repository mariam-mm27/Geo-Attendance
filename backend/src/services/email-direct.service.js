import nodemailer from "nodemailer";
import dotenv from "dotenv";
import { db } from "../config/firebase.js";
import { sendWarningEmail } from "./simpleEmailSender.js";

dotenv.config();

/**
 * Get enrollment date for a student in a specific course
 */
const getEnrollmentDate = async (studentId, courseId) => {
  try {
    const enrollmentSnapshot = await db.collection("enrollments")
      .where("studentId", "==", studentId)
      .where("courseId", "==", courseId)
      .get();

    if (!enrollmentSnapshot.empty) {
      const enrollmentData = enrollmentSnapshot.docs[0].data();
      return enrollmentData.enrolledAt?.toDate?.() || enrollmentData.enrolledAt;
    }
    return null;
  } catch (error) {
    console.error("Error getting enrollment date:", error);
    return null;
  }
};

/**
 * Calculate attendance based on enrollment date
 */
const calculateAttendanceFromEnrollment = async (studentId, courseId) => {
  try {
    // Get enrollment date
    const enrollmentDate = await getEnrollmentDate(studentId, courseId);
    console.log(`📅 Student ${studentId} enrolled on:`, enrollmentDate);

    // Get all sessions for this course
    const sessionsSnapshot = await db.collection("sessions")
      .where("courseId", "==", courseId)
      .get();

    // Filter sessions to only count those after enrollment date
    let totalSessions = 0;
    let sessionsAfterEnrollment = [];

    sessionsSnapshot.forEach((sessionDoc) => {
      const sessionData = sessionDoc.data();
      const sessionDate = sessionData.createdAt?.toDate?.() || sessionData.createdAt;

      // If no enrollment date found, count all sessions (backward compatibility)
      // If enrollment date exists, only count sessions after enrollment
      if (!enrollmentDate || !sessionDate || sessionDate >= enrollmentDate) {
        totalSessions++;
        sessionsAfterEnrollment.push(sessionData.sessionId);
      }
    });

    console.log(`📊 Total sessions after enrollment: ${totalSessions} (out of ${sessionsSnapshot.size} total)`);

    // Get attendance records for sessions after enrollment
    const attendanceSnapshot = await db.collection("attendance")
      .where("studentId", "==", studentId)
      .where("courseId", "==", courseId)
      .get();

    let attendedSessions = 0;

    // Count only attendance for sessions after enrollment
    attendanceSnapshot.forEach((attendanceDoc) => {
      const attendanceData = attendanceDoc.data();
      if (sessionsAfterEnrollment.includes(attendanceData.sessionId)) {
        attendedSessions++;
      }
    });

    console.log(`✅ Attended sessions after enrollment: ${attendedSessions}`);

    const attendanceRate = totalSessions > 0 ? (attendedSessions / totalSessions) * 100 : 100;
    const absenceRate = 100 - attendanceRate;
    const missedSessions = totalSessions - attendedSessions;

    return {
      attendanceRate,
      absenceRate,
      attendedSessions,
      totalSessions,
      missedSessions,
      enrollmentDate,
      sessionsBeforeEnrollment: sessionsSnapshot.size - totalSessions
    };
  } catch (error) {
    console.error("Error calculating attendance from enrollment:", error);
    return null;
  }
};

/**
 * Create email transporter with Brevo SMTP priority
 */
const createTransporter = async () => {
  const brevoKey = process.env.BREVO_SMTP_KEY;
  const brevoUser = process.env.BREVO_USER;
  
  // Try Brevo SMTP first (recommended for real emails)
  if (brevoKey && brevoUser) {
    try {
      const brevoTransporter = nodemailer.createTransport({
        host: "smtp-relay.brevo.com",
        port: 587,
        secure: false,
        auth: {
          user: brevoUser,
          pass: brevoKey,
        },
        tls: {
          rejectUnauthorized: false
        }
      });
      
      // Test the connection
      await brevoTransporter.verify();
      console.log("✅ Brevo SMTP connected successfully");
      return brevoTransporter;
    } catch (error) {
      console.warn("⚠️ Brevo SMTP failed, trying Gmail fallback:", error.message);
    }
  }
  
  // Fallback: Try Gmail
  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_PASSWORD;
  
  if (emailUser && emailPass) {
    try {
      const gmailTransporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 587,
        secure: false,
        auth: {
          user: emailUser,
          pass: emailPass,
        },
        tls: {
          rejectUnauthorized: false
        }
      });
      
      // Test the connection
      await gmailTransporter.verify();
      console.log("✅ Gmail SMTP connected successfully");
      return gmailTransporter;
    } catch (error) {
      console.warn("⚠️ Gmail SMTP failed, using test email:", error.message);
    }
  }
  
  // Final fallback: Use Ethereal (test emails only)
  console.log("📧 Using Ethereal test email service...");
  const testAccount = await nodemailer.createTestAccount();
  
  return nodemailer.createTransport({
    host: "smtp.ethereal.email",
    port: 587,
    secure: false,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
  });
};

/**
 * Send test email to verify configuration
 */
export const sendTestEmailDirect = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email address is required",
      });
    }

    const transporter = await createTransporter();

    const mailOptions = {
      from: `"Attendance System" <${process.env.BREVO_USER || process.env.EMAIL_USER || 'noreply@attendance.com'}>`,
      to: email,
      subject: "✅ Test Email - Attendance System",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 30px;
              border-radius: 10px;
              text-align: center;
            }
            .content {
              background: #f8f9fa;
              padding: 30px;
              border-radius: 10px;
              margin-top: 20px;
            }
            .success-box {
              background: #d4edda;
              border-left: 4px solid #28a745;
              padding: 15px;
              margin: 20px 0;
              border-radius: 5px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>✅ Email System Working!</h1>
          </div>
          <div class="content">
            <div class="success-box">
              <strong>Success!</strong> Your email notification system is configured correctly.
            </div>
            <p>This is a test email from the Attendance Management System.</p>
            <p>If you received this, the email service is working perfectly! ✅</p>
            <p><strong>Configuration:</strong></p>
            <ul>
              <li>Email Service: Brevo SMTP ✅</li>
              <li>From: ${process.env.BREVO_USER || process.env.EMAIL_USER || 'System'}</li>
              <li>Status: Active ✅</li>
            </ul>
          </div>
        </body>
        </html>
      `,
    };

    const info = await transporter.sendMail(mailOptions);

    console.log(`✅ Test email sent to ${email}: ${info.messageId}`);
    
    // If using Ethereal, provide preview URL
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log(`📧 Preview URL: ${previewUrl}`);
    }

    res.status(200).json({
      success: true,
      message: "Test email sent successfully!",
      messageId: info.messageId,
      recipient: email,
      previewUrl: previewUrl || null,
    });
  } catch (error) {
    console.error("❌ Error sending test email:", error);
    res.status(500).json({
      success: false,
      message: "Failed to send test email",
      error: error.message,
    });
  }
};

/**
 * Send absence alert email with 3-tier system (10%, 20%, 25%)
 */
export const sendAbsenceAlertDirect = async (req, res) => {
  try {
    const { studentId, courseId } = req.body;

    if (!studentId || !courseId) {
      return res.status(400).json({
        success: false,
        message: "studentId and courseId are required",
      });
    }

    // Get student data using Admin SDK
    const studentDoc = await db.collection("users").doc(studentId).get();
    
    if (!studentDoc.exists) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    const studentData = studentDoc.data();

    // Get course data using Admin SDK
    const courseDoc = await db.collection("courses").doc(courseId).get();
    
    if (!courseDoc.exists) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    const courseData = courseDoc.data();

    // Calculate attendance using enrollment-based logic
    const attendanceData = await calculateAttendanceFromEnrollment(studentId, courseId);
    
    if (!attendanceData) {
      return res.status(500).json({
        success: false,
        message: "Failed to calculate attendance data",
      });
    }

    const { attendanceRate, absenceRate, attendedSessions, totalSessions, missedSessions, enrollmentDate, sessionsBeforeEnrollment } = attendanceData;

    console.log(`📊 Enrollment-based calculation: ${attendedSessions}/${totalSessions} = ${attendanceRate.toFixed(2)}% (${sessionsBeforeEnrollment} sessions before enrollment excluded)`);

    // Check if absence exceeds any threshold (10%, 20%, or 25%)
    if (absenceRate < 10) {
      return res.status(200).json({
        success: false,
        message: "Absence threshold not exceeded (less than 10%)",
        data: {
          attendanceRate: attendanceRate.toFixed(2),
          absenceRate: absenceRate.toFixed(2),
          threshold: "10%",
          enrollmentDate: enrollmentDate,
          sessionsBeforeEnrollment: sessionsBeforeEnrollment
        },
      });
    }

    // Determine alert level and email content
    let alertLevel, alertColor, alertTitle, alertMessage;
    
    if (absenceRate >= 25) {
      alertLevel = "FINAL_EXAM_DENIED";
      alertColor = "#DC2626"; // Red
      alertTitle = "🚫 DENIED FROM FINAL EXAM";
      alertMessage = "You have been denied from taking the final exam due to excessive absences (25% threshold exceeded).";
    } else if (absenceRate >= 20) {
      alertLevel = "SECOND_WARNING";
      alertColor = "#F59E0B"; // Orange
      alertTitle = "⚠️ SECOND WARNING";
      alertMessage = "This is your second warning. Your absence rate has exceeded 20%.";
    } else if (absenceRate >= 10) {
      alertLevel = "FIRST_WARNING";
      alertColor = "#EAB308"; // Yellow
      alertTitle = "⚡ FIRST WARNING";
      alertMessage = "This is your first warning. Your absence rate has exceeded 10%.";
    }

    // Send email using Brevo SMTP
    const transporter = await createTransporter();

    const mailOptions = {
      from: `"Attendance System" <${process.env.BREVO_USER || process.env.EMAIL_USER || 'noreply@attendance.com'}>`,
      to: studentData.email,
      subject: `${alertTitle} - ${courseData.name}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background: linear-gradient(135deg, ${alertColor} 0%, ${alertColor}CC 100%);
              color: white;
              padding: 30px;
              border-radius: 10px 10px 0 0;
              text-align: center;
            }
            .content {
              background: #f8f9fa;
              padding: 30px;
              border-radius: 0 0 10px 10px;
            }
            .alert-box {
              background: ${alertLevel === 'CRITICAL' ? '#FEE2E2' : alertLevel === 'WARNING' ? '#FEF3C7' : '#FEF9C3'};
              border-left: 4px solid ${alertColor};
              padding: 15px;
              margin: 20px 0;
              border-radius: 5px;
            }
            .stats {
              background: white;
              padding: 20px;
              border-radius: 8px;
              margin: 20px 0;
            }
            .stat-row {
              display: flex;
              justify-content: space-between;
              padding: 10px 0;
              border-bottom: 1px solid #e9ecef;
            }
            .stat-label {
              font-weight: bold;
              color: #6c757d;
            }
            .stat-value {
              color: #173B66;
              font-weight: bold;
            }
            .danger {
              color: ${alertColor};
            }
            .level-badge {
              background: ${alertColor};
              color: white;
              padding: 8px 16px;
              border-radius: 20px;
              font-weight: bold;
              font-size: 12px;
              display: inline-block;
              margin: 10px 0;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${alertTitle}</h1>
            <div class="level-badge">${alertLevel} ALERT</div>
          </div>
          <div class="content">
            <p>Dear <strong>${studentData.name}</strong>,</p>
            
            <div class="alert-box">
              <strong>${alertTitle}</strong>
              <p>${alertMessage}</p>
              <p>Your attendance in <strong>${courseData.name}</strong> requires immediate attention.</p>
            </div>

            <div class="stats">
              <h3>📊 Attendance Statistics</h3>
              <div class="stat-row">
                <span class="stat-label">Course:</span>
                <span class="stat-value">${courseData.name}</span>
              </div>
              <div class="stat-row">
                <span class="stat-label">Total Sessions:</span>
                <span class="stat-value">${totalSessions}</span>
              </div>
              <div class="stat-row">
                <span class="stat-label">Sessions Attended:</span>
                <span class="stat-value">${attendedSessions}</span>
              </div>
              <div class="stat-row">
                <span class="stat-label">Sessions Missed:</span>
                <span class="stat-value danger">${missedSessions}</span>
              </div>
              <div class="stat-row">
                <span class="stat-label">Attendance Rate:</span>
                <span class="stat-value">${attendanceRate.toFixed(2)}%</span>
              </div>
              <div class="stat-row">
                <span class="stat-label">Absence Rate:</span>
                <span class="stat-value danger">${absenceRate.toFixed(2)}%</span>
              </div>
            </div>

            ${alertLevel === 'FINAL_EXAM_DENIED' ? `
            <div style="background: #FEE2E2; padding: 15px; border-radius: 8px; border-left: 4px solid #DC2626; margin: 20px 0;">
              <h4 style="color: #DC2626; margin: 0 0 10px 0;">🚨 FINAL EXAM DENIED</h4>
              <p style="margin: 0; color: #991B1B;">You have been denied from taking the final exam due to excessive absences. Contact your professor immediately!</p>
            </div>
            ` : alertLevel === 'SECOND_WARNING' ? `
            <div style="background: #FEF3C7; padding: 15px; border-radius: 8px; border-left: 4px solid #F59E0B; margin: 20px 0;">
              <h4 style="color: #F59E0B; margin: 0 0 10px 0;">⚠️ SECOND WARNING</h4>
              <p style="margin: 0; color: #92400E;">Your absence rate has exceeded 20%. Take immediate action to avoid final exam denial.</p>
            </div>
            ` : `
            <div style="background: #FEF9C3; padding: 15px; border-radius: 8px; border-left: 4px solid #EAB308; margin: 20px 0;">
              <h4 style="color: #EAB308; margin: 0 0 10px 0;">⚡ FIRST WARNING</h4>
              <p style="margin: 0; color: #854D0E;">Your absence rate has exceeded 10%. Please monitor your attendance to maintain good standing.</p>
            </div>
            `}
            
            <h4>📋 Action Required:</h4>
            <ul>
              <li>Attend all remaining sessions</li>
              <li>Contact your professor: <strong>${courseData.professorName || 'Professor'}</strong></li>
              <li>Submit documentation for any excused absences</li>
              ${alertLevel === 'FINAL_EXAM_DENIED' ? '<li><strong>Schedule an immediate meeting with your professor - Final exam access denied</strong></li>' : ''}
            </ul>

            <div style="background: #E0F2FE; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0; color: #0369A1; font-size: 14px;">
                📧 This is an automated email from the Attendance Management System.<br>
                📱 You can also view this alert in your student dashboard.
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    
    // If using Ethereal, provide preview URL
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log(`📧 Preview URL: ${previewUrl}`);
    }

    // Create in-app notification using Client SDK
    await addDoc(collection(db, "notifications"), {
      userId: studentId,
      type: "absence_alert",
      alertLevel: alertLevel,
      title: alertTitle,
      message: `${alertMessage} Your attendance in ${courseData.name} is ${attendanceRate.toFixed(2)}%. You have missed ${missedSessions} out of ${totalSessions} sessions.`,
      courseId,
      courseName: courseData.name,
      attendanceRate: parseFloat(attendanceRate.toFixed(2)),
      absenceRate: parseFloat(absenceRate.toFixed(2)),
      missedSessions,
      totalSessions,
      read: false,
      createdAt: new Date(),
      priority: alertLevel === 'FINAL_EXAM_DENIED' ? 'critical' : alertLevel === 'SECOND_WARNING' ? 'high' : 'medium',
    });

    console.log(`✅ ${alertLevel} alert sent to ${studentData.email}: ${info.messageId}`);

    res.status(200).json({
      success: true,
      message: `${alertLevel} alert sent successfully to real email!`,
      data: {
        emailSent: true,
        messageId: info.messageId,
        recipient: studentData.email,
        alertLevel: alertLevel,
        attendanceRate: attendanceRate.toFixed(2),
        absenceRate: absenceRate.toFixed(2),
        previewUrl: previewUrl || null,
        realEmail: true,
      },
    });
  } catch (error) {
    console.error("❌ Error sending absence alert:", error);
    res.status(500).json({
      success: false,
      message: "Failed to send absence alert",
      error: error.message,
    });
  }
};

/**
 * Check attendance and automatically send alert if thresholds are exceeded
 * Called automatically when attendance is recorded
 * Uses enrollment-based calculation
 */
export const checkAndSendAbsenceAlertDirect = async (studentId, courseId) => {
  try {
    console.log(`🔍 Checking attendance for student ${studentId} in course ${courseId}`);
    
    const studentDoc = await db.collection("users").doc(studentId).get();
    if (!studentDoc.exists) {
      return { success: false, message: "Student not found" };
    }
    const studentData = studentDoc.data();

    const courseDoc = await db.collection("courses").doc(courseId).get();
    if (!courseDoc.exists) {
      return { success: false, message: "Course not found" };
    }
    const courseData = courseDoc.data();

    // Calculate attendance using enrollment-based logic
    const attendanceData = await calculateAttendanceFromEnrollment(studentId, courseId);
    if (!attendanceData) {
      return { success: false, message: "Failed to calculate attendance data" };
    }

    const { attendanceRate, absenceRate, attendedSessions, totalSessions, missedSessions, enrollmentDate } = attendanceData;

    console.log(`📊 ${attendedSessions}/${totalSessions} = attendance ${attendanceRate.toFixed(1)}% | absence ${absenceRate.toFixed(1)}%`);

    if (totalSessions === 0) {
      return { success: true, emailSent: false, message: "No sessions recorded yet" };
    }

    // Determine which alert level applies right now
    let currentAlertLevel;
    if (absenceRate >= 25)      currentAlertLevel = "FINAL_EXAM_DENIED";
    else if (absenceRate >= 20) currentAlertLevel = "SECOND_WARNING";
    else if (absenceRate >= 10) currentAlertLevel = "FIRST_WARNING";
    else {
      console.log(`✅ Attendance OK — absence ${absenceRate.toFixed(1)}% < 10%`);
      return { success: true, emailSent: false, message: "Attendance within acceptable range",
               attendanceRate: attendanceRate.toFixed(2), absenceRate: absenceRate.toFixed(2) };
    }

    // ── Cooldown: only block if this EXACT level was sent within the last 24 hours ──
    const allNotificationsSnapshot = await db.collection("notifications")
      .where("userId", "==", studentId)
      .where("courseId", "==", courseId)
      .where("alertLevel", "==", currentAlertLevel)
      .get();

    if (!allNotificationsSnapshot.empty) {
      // Find the most recent notification of this level
      let mostRecentDate = null;
      allNotificationsSnapshot.docs.forEach(d => {
        const data = d.data();
        const alertDate = data.createdAt?.toDate?.() 
          || (data.createdAt?.seconds ? new Date(data.createdAt.seconds * 1000) : null);
        if (alertDate && (!mostRecentDate || alertDate > mostRecentDate)) {
          mostRecentDate = alertDate;
        }
      });

      if (mostRecentDate) {
        const hoursSinceLastAlert = (new Date() - mostRecentDate) / (1000 * 60 * 60);
        if (hoursSinceLastAlert < 24) {
          console.log(`⏰ ${currentAlertLevel} sent ${hoursSinceLastAlert.toFixed(1)}h ago — skipping (24h cooldown)`);
          return {
            success: true, emailSent: false,
            message: `${currentAlertLevel} alert already sent ${hoursSinceLastAlert.toFixed(0)}h ago`,
            attendanceRate: attendanceRate.toFixed(2), absenceRate: absenceRate.toFixed(2)
          };
        }
        console.log(`🔄 ${currentAlertLevel} last sent ${hoursSinceLastAlert.toFixed(1)}h ago — sending again`);
      }
    } else {
      console.log(`🆕 First time ${currentAlertLevel} for this student/course — sending now`);
    }

    console.log(`🚨 Sending ${currentAlertLevel} to ${studentData.email}`);

    // Use simple email sender
    const emailResult = await sendWarningEmail(
      studentData.email,
      studentData.name,
      courseData.name,
      { totalSessions, attendedSessions, missedSessions, attendanceRate, absenceRate },
      currentAlertLevel
    );

    if (!emailResult.success) {
      console.error(`❌ Email failed: ${emailResult.error}`);
      return { success: false, emailSent: false, error: emailResult.error };
    }

    const info = { messageId: emailResult.messageId };

    // ── Save in-app notification ─────────────────────────────────────────────────
    const typeMap = {
      FIRST_WARNING: "absence_alert",
      SECOND_WARNING: "absence_warning",
      FINAL_EXAM_DENIED: "absence_deprivation",
    };

    const titleMap = {
      FIRST_WARNING: "⚡ FIRST WARNING",
      SECOND_WARNING: "⚠️ SECOND WARNING",
      FINAL_EXAM_DENIED: "🚫 DENIED FROM FINAL EXAM",
    };

    const messageMap = {
      FIRST_WARNING: "Your absence rate has exceeded 10%. Please attend upcoming sessions.",
      SECOND_WARNING: "Your absence rate has exceeded 20%. Take immediate action to avoid exam denial.",
      FINAL_EXAM_DENIED: "Your absence rate has exceeded 25%. You have been denied from the final exam.",
    };

    await db.collection("notifications").add({
      userId: studentId,
      type: typeMap[currentAlertLevel],
      alertLevel: currentAlertLevel,
      title: titleMap[currentAlertLevel],
      message: `${messageMap[currentAlertLevel]} Your attendance in ${courseData.name} is ${attendanceRate.toFixed(1)}%. Missed ${missedSessions} of ${totalSessions} sessions.`,
      courseId,
      courseName: courseData.name,
      attendanceRate: parseFloat(attendanceRate.toFixed(2)),
      absenceRate: parseFloat(absenceRate.toFixed(2)),
      missedSessions,
      totalSessions,
      read: false,
      createdAt: new Date(),
      priority: currentAlertLevel === "FINAL_EXAM_DENIED" ? "critical" : currentAlertLevel === "SECOND_WARNING" ? "high" : "medium",
    });

    console.log(`✅ ${currentAlertLevel} sent to ${studentData.email} — ID: ${info.messageId}`);

    return {
      success: true, emailSent: true,
      message: `${currentAlertLevel} alert sent`,
      alertLevel: currentAlertLevel,
      attendanceRate: attendanceRate.toFixed(2),
      absenceRate: absenceRate.toFixed(2),
      messageId: info.messageId,
      recipient: studentData.email,
    };

  } catch (error) {
    console.error("❌ Error in checkAndSendAbsenceAlertDirect:", error);
    return { success: false, emailSent: false, error: error.message };
  }
};


/**
 * Check all courses and send alerts ONLY when thresholds are actually exceeded
 * Thresholds: 10% absence = FIRST_WARNING, 20% = SECOND_WARNING, 25% = FINAL_EXAM_DENIED
 */
export const checkAllCoursesDirect = async (req, res) => {
  try {
    console.log("🚀 Starting checkAllCoursesDirect - checking real thresholds");
    const coursesSnapshot = await db.collection("courses").get();
    console.log(`📚 Found ${coursesSnapshot.size} courses to check`);

    let totalAlerts = 0;
    const results = [];

    for (const courseDoc of coursesSnapshot.docs) {
      const courseData = courseDoc.data();
      const courseId = courseDoc.id;
      const enrolledStudents = courseData.enrolledStudents || [];

      let alertsSent = 0;
      let firstWarningAlerts = 0;
      let secondWarningAlerts = 0;
      let finalExamDeniedAlerts = 0;

      for (const studentId of enrolledStudents) {
        try {
          // Use the proper enrollment-based check which handles cooldowns
          const alertResult = await checkAndSendAbsenceAlertDirect(studentId, courseId);

          if (alertResult.emailSent) {
            alertsSent++;
            if (alertResult.alertLevel === "FIRST_WARNING") firstWarningAlerts++;
            else if (alertResult.alertLevel === "SECOND_WARNING") secondWarningAlerts++;
            else if (alertResult.alertLevel === "FINAL_EXAM_DENIED") finalExamDeniedAlerts++;
            console.log(`✅ ${alertResult.alertLevel} sent to student ${studentId} for ${courseData.name}`);
          } else {
            console.log(`⏭️ No alert for student ${studentId}: ${alertResult.message}`);
          }
        } catch (error) {
          console.error(`Error processing student ${studentId}:`, error);
        }
      }

      results.push({
        courseId,
        courseName: courseData.name,
        alertsSent,
        firstWarningAlerts,
        secondWarningAlerts,
        finalExamDeniedAlerts,
        studentsChecked: enrolledStudents.length,
      });

      totalAlerts += alertsSent;
    }

    res.status(200).json({
      success: true,
      message: `Checked ${coursesSnapshot.size} courses, sent ${totalAlerts} alerts based on real thresholds`,
      totalCourses: coursesSnapshot.size,
      totalAlertsSent: totalAlerts,
      alertBreakdown: {
        firstWarning: results.reduce((sum, r) => sum + r.firstWarningAlerts, 0),
        secondWarning: results.reduce((sum, r) => sum + r.secondWarningAlerts, 0),
        finalExamDenied: results.reduce((sum, r) => sum + r.finalExamDeniedAlerts, 0),
      },
      data: results,
    });
  } catch (error) {
    console.error("❌ Error checking courses:", error);
    res.status(500).json({
      success: false,
      message: "Failed to check courses",
      error: error.message,
    });
  }
};

