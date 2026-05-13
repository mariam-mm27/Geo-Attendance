/**
 * Auto Notification & Email Service
 * 
 * Automatically sends BOTH emails and in-app notifications when attendance is recorded
 * Works for web and mobile apps
 */

import { db } from '../config/firebase.js';
import { addDoc, collection, doc, getDoc } from 'firebase/firestore';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

let emailTransporter = null;

/**
 * Initialize email transporter
 */
function initEmailTransporter() {
  if (emailTransporter) return emailTransporter;

  try {
    // Try Brevo first
    if (process.env.BREVO_SMTP_KEY && process.env.BREVO_USER) {
      emailTransporter = nodemailer.createTransport({
        host: 'smtp-relay.brevo.com',
        port: 587,
        secure: false,
        auth: {
          user: process.env.BREVO_USER,
          pass: process.env.BREVO_SMTP_KEY
        }
      });
      console.log('✅ Brevo email transporter ready');
      return emailTransporter;
    }

    // Fallback to Gmail
    if (process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
      emailTransporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD
        }
      });
      console.log('✅ Gmail email transporter ready');
      return emailTransporter;
    }

    console.error('❌ No email credentials configured');
    return null;
  } catch (error) {
    console.error('❌ Error initializing email transporter:', error.message);
    return null;
  }
}

/**
 * Send warning email
 */
async function sendWarningEmail(studentEmail, studentName, courseName, metrics, warningLevel) {
  try {
    const transporter = initEmailTransporter();
    if (!transporter) {
      console.error('❌ Email transporter not available');
      return { success: false, error: 'Email service not configured' };
    }

    const colors = {
      FIRST_WARNING: '#FFC107',
      SECOND_WARNING: '#FF9800',
      DEPRIVATION: '#F44336'
    };

    const titles = {
      FIRST_WARNING: '⚠️ First Warning - Attendance Alert',
      SECOND_WARNING: '⚠️⚠️ Second Warning - Critical Alert',
      DEPRIVATION: '🚫 Course Denial - Final Exam Denied'
    };

    const messages = {
      FIRST_WARNING: 'You have reached 10% absence rate. Please improve your attendance immediately.',
      SECOND_WARNING: 'You have reached 20% absence rate. Your course enrollment is at risk.',
      DEPRIVATION: 'You have exceeded the allowed absence limit (25%). You are denied from taking the final exam.'
    };

    const color = colors[warningLevel] || '#FFC107';
    const title = titles[warningLevel] || 'Attendance Warning';
    const message = messages[warningLevel] || 'Attendance warning';

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          .header { background-color: ${color}; color: white; padding: 20px; text-align: center; }
          .header h1 { margin: 0; font-size: 24px; }
          .content { padding: 30px; }
          .alert-box { background-color: #fff3cd; border-left: 4px solid ${color}; padding: 15px; margin: 20px 0; border-radius: 4px; }
          .stats-table { width: 100%; border-collapse: collapse; margin: 20px 0; background-color: #f9f9f9; }
          .stats-table th { background-color: #f0f0f0; padding: 12px; text-align: left; font-weight: 600; border-bottom: 2px solid #ddd; }
          .stats-table td { padding: 12px; border-bottom: 1px solid #ddd; }
          .stat-label { font-weight: 500; color: #555; }
          .stat-value { font-weight: 600; color: ${color}; font-size: 18px; }
          .footer { background-color: #f5f5f5; padding: 20px; text-align: center; font-size: 12px; color: #666; border-top: 1px solid #ddd; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${title}</h1>
          </div>
          <div class="content">
            <p>Dear <strong>${studentName}</strong>,</p>
            <div class="alert-box">
              <p>${message}</p>
            </div>
            <h2>Course Information</h2>
            <table class="stats-table">
              <tr>
                <td class="stat-label">Course Name:</td>
                <td><strong>${courseName}</strong></td>
              </tr>
            </table>
            <h2>Attendance Statistics</h2>
            <table class="stats-table">
              <tr>
                <th>Metric</th>
                <th>Value</th>
              </tr>
              <tr>
                <td class="stat-label">Total Sessions:</td>
                <td class="stat-value">${metrics.totalSessions}</td>
              </tr>
              <tr>
                <td class="stat-label">Attended Sessions:</td>
                <td class="stat-value">${metrics.attendedSessions}</td>
              </tr>
              <tr>
                <td class="stat-label">Missed Sessions:</td>
                <td class="stat-value">${metrics.missedSessions}</td>
              </tr>
              <tr>
                <td class="stat-label">Attendance Rate:</td>
                <td class="stat-value">${metrics.attendanceRate}%</td>
              </tr>
              <tr>
                <td class="stat-label">Absence Rate:</td>
                <td class="stat-value">${metrics.absenceRate}%</td>
              </tr>
            </table>
            <p style="margin-top: 30px; color: #666;">
              This is an automated message. Please do not reply to this email.
            </p>
          </div>
          <div class="footer">
            <p><strong>Attendance Management System</strong></p>
            <p>© 2024 All Rights Reserved</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const mailOptions = {
      from: process.env.BREVO_USER || process.env.EMAIL_USER || 'noreply@attendance-system.com',
      to: studentEmail,
      subject: `${title} - ${courseName}`,
      html: htmlContent
    };

    console.log(`📧 Sending email to ${studentEmail}...`);
    const info = await transporter.sendMail(mailOptions);

    console.log(`✅ Email sent - Message ID: ${info.messageId}`);
    return {
      success: true,
      messageId: info.messageId
    };

  } catch (error) {
    console.error('❌ Error sending email:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Create in-app notification (for web and mobile)
 */
async function createInAppNotification(studentId, courseName, metrics, warningLevel) {
  try {
    const notificationData = {
      userId: studentId,
      type: 'attendance_warning',
      warningLevel: warningLevel,
      title: `${warningLevel.replace(/_/g, ' ')} - ${courseName}`,
      message: `Your absence rate is ${metrics.absenceRate}% in ${courseName}. You have missed ${metrics.missedSessions} of ${metrics.totalSessions} sessions.`,
      courseName: courseName,
      attendanceRate: metrics.attendanceRate,
      absenceRate: metrics.absenceRate,
      missedSessions: metrics.missedSessions,
      totalSessions: metrics.totalSessions,
      read: false,
      createdAt: new Date(),
      priority: warningLevel === 'DEPRIVATION' ? 'critical' : 
               warningLevel === 'SECOND_WARNING' ? 'high' : 'medium',
      isRealtime: true
    };

    const notificationRef = await addDoc(collection(db, 'notifications'), notificationData);
    console.log(`📱 In-app notification created: ${notificationRef.id}`);

    return {
      success: true,
      notificationId: notificationRef.id
    };

  } catch (error) {
    console.error('❌ Error creating in-app notification:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Send both email and notification
 */
export async function sendWarningEmailAndNotification(studentId, courseId, metrics, warningLevel) {
  try {
    console.log(`\n🚀 Sending warning email and notification...`);
    console.log(`   Student: ${studentId}`);
    console.log(`   Course: ${courseId}`);
    console.log(`   Warning Level: ${warningLevel}\n`);

    // Get student and course data
    const [studentDoc, courseDoc] = await Promise.all([
      getDoc(doc(db, 'users', studentId)),
      getDoc(doc(db, 'courses', courseId))
    ]);

    if (!studentDoc.exists() || !courseDoc.exists()) {
      throw new Error('Student or course not found');
    }

    const studentData = studentDoc.data();
    const courseData = courseDoc.data();

    // Send email
    console.log(`📧 Sending email...`);
    const emailResult = await sendWarningEmail(
      studentData.email,
      studentData.name || studentData.email,
      courseData.name,
      metrics,
      warningLevel
    );

    // Create in-app notification
    console.log(`📱 Creating in-app notification...`);
    const notificationResult = await createInAppNotification(
      studentId,
      courseData.name,
      metrics,
      warningLevel
    );

    console.log(`\n✅ Warning sent successfully!`);
    console.log(`   Email: ${emailResult.success ? '✅' : '❌'}`);
    console.log(`   Notification: ${notificationResult.success ? '✅' : '❌'}\n`);

    return {
      success: emailResult.success && notificationResult.success,
      email: emailResult,
      notification: notificationResult
    };

  } catch (error) {
    console.error('❌ Error sending warning:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Check if warning was sent recently (cooldown)
 */
export async function wasWarningSentRecently(studentId, courseId, warningLevel, cooldownHours = 24) {
  try {
    const cutoffTime = new Date(Date.now() - cooldownHours * 60 * 60 * 1000);

    const recentWarnings = await db.collection('notifications')
      .where('userId', '==', studentId)
      .where('warningLevel', '==', warningLevel)
      .where('createdAt', '>=', cutoffTime)
      .limit(1)
      .get();

    return !recentWarnings.empty;
  } catch (error) {
    console.warn('Error checking cooldown:', error.message);
    return false;
  }
}

export default {
  sendWarningEmailAndNotification,
  wasWarningSentRecently,
  initEmailTransporter
};
