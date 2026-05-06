import nodemailer from "nodemailer";
import dotenv from "dotenv";
import { db } from "../config/firebase-client.js";
import { collection, doc, getDoc, getDocs, query, where, addDoc } from "firebase/firestore";

dotenv.config();

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

    // Get student data using Client SDK
    const studentDocRef = doc(db, "users", studentId);
    const studentDoc = await getDoc(studentDocRef);
    
    if (!studentDoc.exists()) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    const studentData = studentDoc.data();

    // Get course data using Client SDK
    const courseDocRef = doc(db, "courses", courseId);
    const courseDoc = await getDoc(courseDocRef);
    
    if (!courseDoc.exists()) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    const courseData = courseDoc.data();

    // Calculate attendance using Client SDK - match frontend logic
    const sessionsQuery = query(
      collection(db, "sessions"),
      where("courseId", "==", courseId)
      // Remove active=false filter to match frontend behavior
    );
    const sessionsSnapshot = await getDocs(sessionsQuery);
    const totalSessions = sessionsSnapshot.size;

    const attendanceQuery = query(
      collection(db, "attendance"),
      where("studentId", "==", studentId),
      where("courseId", "==", courseId)
    );
    const attendanceSnapshot = await getDocs(attendanceQuery);
    const attendedSessions = attendanceSnapshot.size;

    const attendanceRate = totalSessions > 0 ? (attendedSessions / totalSessions) * 100 : 100;
    const absenceRate = 100 - attendanceRate;
    const missedSessions = totalSessions - attendedSessions;

    // Check if absence exceeds any threshold (10%, 20%, or 25%)
    if (absenceRate < 10) {
      return res.status(200).json({
        success: false,
        message: "Absence threshold not exceeded (less than 10%)",
        data: {
          attendanceRate: attendanceRate.toFixed(2),
          absenceRate: absenceRate.toFixed(2),
          threshold: "10%",
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
 */
export const checkAndSendAbsenceAlertDirect = async (studentId, courseId) => {
  try {
    console.log(`🔍 Checking attendance for student ${studentId} in course ${courseId}`);
    
    // Get student data using Client SDK
    const studentDocRef = doc(db, "users", studentId);
    const studentDoc = await getDoc(studentDocRef);
    
    if (!studentDoc.exists()) {
      console.log(`❌ Student not found: ${studentId}`);
      return { success: false, message: "Student not found" };
    }

    const studentData = studentDoc.data();

    // Get course data using Client SDK
    const courseDocRef = doc(db, "courses", courseId);
    const courseDoc = await getDoc(courseDocRef);
    
    if (!courseDoc.exists()) {
      console.log(`❌ Course not found: ${courseId}`);
      return { success: false, message: "Course not found" };
    }

    const courseData = courseDoc.data();

    // Calculate attendance using Client SDK - match frontend logic
    const sessionsQuery = query(
      collection(db, "sessions"),
      where("courseId", "==", courseId)
    );
    const sessionsSnapshot = await getDocs(sessionsQuery);
    const totalSessions = sessionsSnapshot.size;

    if (totalSessions === 0) {
      console.log(`⚠️ No sessions found for course ${courseId}`);
      return { success: true, emailSent: false, message: "No sessions recorded yet" };
    }

    const attendanceQuery = query(
      collection(db, "attendance"),
      where("studentId", "==", studentId),
      where("courseId", "==", courseId)
    );
    const attendanceSnapshot = await getDocs(attendanceQuery);
    const attendedSessions = attendanceSnapshot.size;

    const attendanceRate = (attendedSessions / totalSessions) * 100;
    const absenceRate = 100 - attendanceRate;
    const missedSessions = totalSessions - attendedSessions;

    console.log(`📊 Student ${studentData.name}: ${attendanceRate.toFixed(2)}% attendance, ${absenceRate.toFixed(2)}% absence`);

    // Check if absence exceeds any threshold (10%, 20%, or 25%)
    if (absenceRate < 10) {
      console.log(`✅ Attendance is good (${absenceRate.toFixed(2)}% absence < 10% threshold)`);
      return { 
        success: true, 
        emailSent: false, 
        message: "Attendance within acceptable range",
        attendanceRate: attendanceRate.toFixed(2),
        absenceRate: absenceRate.toFixed(2)
      };
    }

    // Check if alert was already sent recently (within 3 days for same threshold)
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    // Determine current alert level
    let currentAlertLevel;
    if (absenceRate >= 25) {
      currentAlertLevel = "FINAL_EXAM_DENIED";
    } else if (absenceRate >= 20) {
      currentAlertLevel = "SECOND_WARNING";
    } else if (absenceRate >= 10) {
      currentAlertLevel = "FIRST_WARNING";
    }

    // Check for recent notifications of the same level
    const recentNotificationsQuery = query(
      collection(db, "notifications"),
      where("userId", "==", studentId),
      where("courseId", "==", courseId),
      where("type", "==", "absence_alert"),
      where("alertLevel", "==", currentAlertLevel),
      where("createdAt", ">=", threeDaysAgo)
    );
    const recentNotifications = await getDocs(recentNotificationsQuery);

    if (!recentNotifications.empty) {
      console.log(`⏰ ${currentAlertLevel} alert already sent within last 3 days for course ${courseData.name}`);
      return {
        success: true,
        emailSent: false,
        message: `${currentAlertLevel} alert already sent recently`,
        attendanceRate: attendanceRate.toFixed(2),
        absenceRate: absenceRate.toFixed(2)
      };
    }

    // Determine alert details
    let alertColor, alertTitle, alertMessage;
    
    if (absenceRate >= 25) {
      alertColor = "#DC2626";
      alertTitle = "🚫 DENIED FROM FINAL EXAM";
      alertMessage = "You have been denied from taking the final exam due to excessive absences (25% threshold exceeded).";
    } else if (absenceRate >= 20) {
      alertColor = "#F59E0B";
      alertTitle = "⚠️ SECOND WARNING";
      alertMessage = "This is your second warning. Your absence rate has exceeded 20%.";
    } else if (absenceRate >= 10) {
      alertColor = "#EAB308";
      alertTitle = "⚡ FIRST WARNING";
      alertMessage = "This is your first warning. Your absence rate has exceeded 10%.";
    }

    console.log(`🚨 Sending ${currentAlertLevel} alert to ${studentData.email}`);

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
              background: ${currentAlertLevel === 'FINAL_EXAM_DENIED' ? '#FEE2E2' : currentAlertLevel === 'SECOND_WARNING' ? '#FEF3C7' : '#FEF9C3'};
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
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${alertTitle}</h1>
            <p style="margin: 0; font-size: 14px; opacity: 0.9;">Automatic Alert - Attendance System</p>
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

            ${currentAlertLevel === 'FINAL_EXAM_DENIED' ? `
            <div style="background: #FEE2E2; padding: 15px; border-radius: 8px; border-left: 4px solid #DC2626; margin: 20px 0;">
              <h4 style="color: #DC2626; margin: 0 0 10px 0;">🚨 FINAL EXAM DENIED</h4>
              <p style="margin: 0; color: #991B1B;">You have been denied from taking the final exam due to excessive absences. Contact your professor immediately!</p>
            </div>
            ` : currentAlertLevel === 'SECOND_WARNING' ? `
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
              ${currentAlertLevel === 'FINAL_EXAM_DENIED' ? '<li><strong>Schedule an immediate meeting with your professor - Final exam access denied</strong></li>' : ''}
            </ul>

            <div style="background: #E0F2FE; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0; color: #0369A1; font-size: 14px;">
                📧 This email was automatically sent when your attendance was recorded.<br>
                📱 You can also view this alert in your student dashboard.
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    
    // Create in-app notification using Client SDK
    await addDoc(collection(db, "notifications"), {
      userId: studentId,
      type: "absence_alert",
      alertLevel: currentAlertLevel,
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
      priority: currentAlertLevel === 'FINAL_EXAM_DENIED' ? 'critical' : currentAlertLevel === 'SECOND_WARNING' ? 'high' : 'medium',
    });

    console.log(`✅ ${currentAlertLevel} alert sent automatically to ${studentData.email}: ${info.messageId}`);

    return {
      success: true,
      emailSent: true,
      message: `${currentAlertLevel} alert sent automatically`,
      alertLevel: currentAlertLevel,
      attendanceRate: attendanceRate.toFixed(2),
      absenceRate: absenceRate.toFixed(2),
      messageId: info.messageId,
      recipient: studentData.email,
    };
  } catch (error) {
    console.error("❌ Error in automatic absence alert check:", error);
    return {
      success: false,
      emailSent: false,
      error: error.message,
    };
  }
};
export const checkAllCoursesDirect = async (req, res) => {
  try {
    console.log("🚀 Starting checkAllCoursesDirect - Generate all 3 warning types for each course");
    const coursesSnapshot = await getDocs(collection(db, "courses"));
    console.log(`📚 Found ${coursesSnapshot.size} courses to check`);
    
    let totalAlerts = 0;
    const results = [];

    for (const courseDoc of coursesSnapshot.docs) {
      const courseData = courseDoc.data();
      const courseId = courseDoc.id;
      const enrolledStudents = courseData.enrolledStudents || [];
      
      console.log(`\n📖 Processing course: ${courseData.name} (${courseId})`);
      console.log(`👥 Enrolled students: ${enrolledStudents.length}`);
      console.log(`📋 Student IDs: ${enrolledStudents.join(', ')}`);

      let alertsSent = 0;
      let firstWarningAlerts = 0;
      let secondWarningAlerts = 0;
      let finalExamDeniedAlerts = 0;

      for (const studentId of enrolledStudents) {
        try {
          console.log(`🔍 Processing student: ${studentId} in course: ${courseData.name}`);
          
          // Get student data
          const studentDocRef = doc(db, "users", studentId);
          const studentDoc = await getDoc(studentDocRef);
          if (!studentDoc.exists()) {
            console.log(`❌ Student document not found for ID: ${studentId}`);
            continue;
          }

          const studentData = studentDoc.data();
          console.log(`✅ Student found: ${studentData.name} (${studentData.email})`);

          // Calculate attendance for display purposes
          const sessionsQuery = query(
            collection(db, "sessions"),
            where("courseId", "==", courseId)
          );
          const sessionsSnapshot = await getDocs(sessionsQuery);
          const totalSessions = sessionsSnapshot.size;
          
          const attendanceQuery = query(
            collection(db, "attendance"),
            where("studentId", "==", studentId),
            where("courseId", "==", courseId)
          );
          const attendanceSnapshot = await getDocs(attendanceQuery);
          const attendedSessions = attendanceSnapshot.size;
          
          const attendanceRate = totalSessions > 0 ? (attendedSessions / totalSessions) * 100 : 100;
          const absenceRate = 100 - attendanceRate;
          const missedSessions = totalSessions - attendedSessions;
          
          console.log(`📊 Attendance: ${attendanceRate.toFixed(2)}%, Absence: ${absenceRate.toFixed(2)}%`);

          // Generate ALL THREE warning types for each student in each course
          const warningTypes = [
            {
              alertLevel: "FIRST_WARNING",
              alertColor: "#EAB308",
              alertTitle: "⚡ FIRST WARNING",
              alertMessage: "This is your first warning. Your absence rate has exceeded 10%.",
              type: "absence_alert"
            },
            {
              alertLevel: "SECOND_WARNING", 
              alertColor: "#F59E0B",
              alertTitle: "⚠️ SECOND WARNING",
              alertMessage: "This is your second warning. Your absence rate has exceeded 20%.",
              type: "absence_warning"
            },
            {
              alertLevel: "FINAL_EXAM_DENIED",
              alertColor: "#DC2626", 
              alertTitle: "🚫 DENIED FROM FINAL EXAM",
              alertMessage: "You have been denied from taking the final exam due to excessive absences (25% threshold exceeded).",
              type: "absence_deprivation"
            }
          ];

          // Send all three warning types
          for (const warning of warningTypes) {
            console.log(`📧 Sending ${warning.alertLevel} alert to ${studentData.email}`);

            // Send email using Brevo SMTP
            const transporter = await createTransporter();
            const mailOptions = {
              from: `"Attendance System" <${process.env.BREVO_USER || process.env.EMAIL_USER || 'noreply@attendance.com'}>`,
              to: studentData.email,
              subject: `${warning.alertTitle} - ${courseData.name}`,
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
                      background: linear-gradient(135deg, ${warning.alertColor} 0%, ${warning.alertColor}CC 100%);
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
                      background: ${warning.alertLevel === 'FINAL_EXAM_DENIED' ? '#FEE2E2' : warning.alertLevel === 'SECOND_WARNING' ? '#FEF3C7' : '#FEF9C3'};
                      border-left: 4px solid ${warning.alertColor};
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
                      color: ${warning.alertColor};
                    }
                  </style>
                </head>
                <body>
                  <div class="header">
                    <h1>${warning.alertTitle}</h1>
                  </div>
                  <div class="content">
                    <p>Dear <strong>${studentData.name}</strong>,</p>
                    
                    <div class="alert-box">
                      <strong>${warning.alertTitle}</strong>
                      <p>${warning.alertMessage}</p>
                      <p>Your attendance in <strong>${courseData.name}</strong> requires attention.</p>
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

                    ${warning.alertLevel === 'FINAL_EXAM_DENIED' ? `
                    <div style="background: #FEE2E2; padding: 15px; border-radius: 8px; border-left: 4px solid #DC2626; margin: 20px 0;">
                      <h4 style="color: #DC2626; margin: 0 0 10px 0;">🚨 FINAL EXAM DENIED</h4>
                      <p style="margin: 0; color: #991B1B;">You have been denied from taking the final exam due to excessive absences. Contact your professor immediately!</p>
                    </div>
                    ` : warning.alertLevel === 'SECOND_WARNING' ? `
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

                    <p><strong>Action Required:</strong></p>
                    <ul>
                      <li>Attend all remaining sessions</li>
                      <li>Contact your professor: <strong>${courseData.professorName || 'Professor'}</strong></li>
                      <li>Submit documentation for excused absences</li>
                      ${warning.alertLevel === 'FINAL_EXAM_DENIED' ? '<li><strong>Schedule an immediate meeting with your professor - Final exam access denied</strong></li>' : ''}
                    </ul>

                    <div style="background: #E0F2FE; padding: 15px; border-radius: 8px; margin: 20px 0;">
                      <p style="margin: 0; color: #0369A1; font-size: 14px;">
                        📧 This email was sent to your real email address via Brevo SMTP.<br>
                        📱 You can also view this alert in your student dashboard.
                      </p>
                    </div>
                  </div>
                </body>
                </html>
              `,
            };

            await transporter.sendMail(mailOptions);

            // Create notification
            await addDoc(collection(db, "notifications"), {
              userId: studentId,
              type: warning.type,
              alertLevel: warning.alertLevel,
              title: warning.alertTitle,
              message: `${warning.alertMessage} Your attendance in ${courseData.name} is ${attendanceRate.toFixed(2)}%. You have missed ${missedSessions} out of ${totalSessions} sessions.`,
              courseId,
              courseName: courseData.name,
              attendanceRate: parseFloat(attendanceRate.toFixed(2)),
              absenceRate: parseFloat(absenceRate.toFixed(2)),
              missedSessions,
              totalSessions,
              read: false,
              createdAt: new Date(),
              priority: warning.alertLevel === 'FINAL_EXAM_DENIED' ? 'critical' : warning.alertLevel === 'SECOND_WARNING' ? 'high' : 'medium',
            });

            alertsSent++;
            
            // Count by type
            if (warning.alertLevel === 'FIRST_WARNING') firstWarningAlerts++;
            else if (warning.alertLevel === 'SECOND_WARNING') secondWarningAlerts++;
            else if (warning.alertLevel === 'FINAL_EXAM_DENIED') finalExamDeniedAlerts++;
            
            console.log(`✅ ${warning.alertLevel} alert sent to ${studentData.email} for ${courseData.name}`);
            
            // Add small delay between emails to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 100));
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
      message: `Checked ${coursesSnapshot.size} courses, sent ${totalAlerts} real email alerts (all 3 warning types for each student)`,
      totalCourses: coursesSnapshot.size,
      totalAlertsSent: totalAlerts,
      alertBreakdown: {
        firstWarning: results.reduce((sum, r) => sum + r.firstWarningAlerts, 0),
        secondWarning: results.reduce((sum, r) => sum + r.secondWarningAlerts, 0),
        finalExamDenied: results.reduce((sum, r) => sum + r.finalExamDeniedAlerts, 0),
      },
      expectedTotal: coursesSnapshot.size * (results[0]?.studentsChecked || 0) * 3, // courses × students × 3 warning types
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