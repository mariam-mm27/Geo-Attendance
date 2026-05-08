/**
 * Instant Email Service
 * 
 * Sends emails immediately when attendance is recorded
 * Simple, direct implementation with no delays
 */

const nodemailer = require('nodemailer');
const admin = require('firebase-admin');
const db = admin.firestore();

let transporter = null;

/**
 * Initialize email transporter
 */
async function initializeTransporter() {
  if (transporter) return transporter;

  try {
    // Try Brevo first
    if (process.env.BREVO_USER && process.env.BREVO_SMTP_KEY) {
      console.log('🔧 Initializing Brevo SMTP...');
      transporter = nodemailer.createTransport({
        host: 'smtp-relay.brevo.com',
        port: 587,
        secure: false,
        auth: {
          user: process.env.BREVO_USER,
          pass: process.env.BREVO_SMTP_KEY
        }
      });

      await transporter.verify();
      console.log('✅ Brevo SMTP ready');
      return transporter;
    }

    // Try Gmail
    if (process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
      console.log('🔧 Initializing Gmail SMTP...');
      transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD
        }
      });

      await transporter.verify();
      console.log('✅ Gmail SMTP ready');
      return transporter;
    }

    console.error('❌ No email credentials configured');
    return null;
  } catch (error) {
    console.error('❌ Error initializing transporter:', error.message);
    return null;
  }
}

/**
 * Send warning email immediately
 */
async function sendWarningEmailNow(studentEmail, studentName, courseName, metrics, warningLevel) {
  try {
    const trans = await initializeTransporter();
    if (!trans) {
      console.error('❌ No transporter available');
      return { success: false, error: 'No email service configured' };
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

    console.log(`📧 Sending ${warningLevel} email to ${studentEmail}...`);
    const info = await trans.sendMail(mailOptions);

    console.log(`✅ Email sent successfully - Message ID: ${info.messageId}`);

    // Save to database
    try {
      await db.collection('emailLogs').add({
        studentEmail,
        studentName,
        courseName,
        warningLevel,
        messageId: info.messageId,
        status: 'SENT',
        sentAt: new Date(),
        metrics: metrics
      });
    } catch (dbError) {
      console.warn('⚠️ Failed to log email to database:', dbError.message);
    }

    return {
      success: true,
      messageId: info.messageId,
      email: studentEmail
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
 * Calculate attendance metrics
 */
async function calculateMetrics(studentId, courseId) {
  try {
    // Get enrollment date
    const enrollment = await db.collection('enrollments')
      .where('studentId', '==', studentId)
      .where('courseId', '==', courseId)
      .limit(1)
      .get();

    if (enrollment.empty) {
      return null;
    }

    const enrollmentDate = enrollment.docs[0].data().enrolledAt?.toDate?.() || enrollment.docs[0].data().enrolledAt;

    // Get all sessions after enrollment
    const sessions = await db.collection('sessions')
      .where('courseId', '==', courseId)
      .get();

    let totalSessions = 0;
    const sessionIds = [];

    sessions.forEach(doc => {
      const sessionData = doc.data();
      const sessionDate = sessionData.createdAt?.toDate?.() || sessionData.createdAt;

      if (!enrollmentDate || !sessionDate || sessionDate >= enrollmentDate) {
        totalSessions++;
        sessionIds.push(sessionData.sessionId || doc.id);
      }
    });

    if (totalSessions === 0) {
      return {
        totalSessions: 0,
        attendedSessions: 0,
        missedSessions: 0,
        attendanceRate: 0,
        absenceRate: 0
      };
    }

    // Get attendance records
    const attendance = await db.collection('attendance')
      .where('studentId', '==', studentId)
      .where('courseId', '==', courseId)
      .get();

    const attendedSessions = attendance.docs.filter(doc => {
      return sessionIds.includes(doc.data().sessionId);
    }).length;

    const missedSessions = totalSessions - attendedSessions;
    const attendanceRate = Math.round((attendedSessions / totalSessions) * 100);
    const absenceRate = 100 - attendanceRate;

    return {
      totalSessions,
      attendedSessions,
      missedSessions,
      attendanceRate,
      absenceRate
    };
  } catch (error) {
    console.error('Error calculating metrics:', error);
    return null;
  }
}

/**
 * Determine warning level
 */
function determineWarningLevel(absenceRate) {
  if (absenceRate >= 25) return 'DEPRIVATION';
  if (absenceRate >= 20) return 'SECOND_WARNING';
  if (absenceRate >= 10) return 'FIRST_WARNING';
  return null;
}

/**
 * Check if warning was sent recently (cooldown)
 */
async function wasWarningSentRecently(studentId, courseId, warningLevel) {
  try {
    const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago

    const recent = await db.collection('emailLogs')
      .where('studentEmail', '==', (await db.collection('users').doc(studentId).get()).data().email)
      .where('courseName', '==', (await db.collection('courses').doc(courseId).get()).data().name)
      .where('warningLevel', '==', warningLevel)
      .where('sentAt', '>=', cutoffTime)
      .limit(1)
      .get();

    return !recent.empty;
  } catch (error) {
    console.warn('Error checking cooldown:', error.message);
    return false;
  }
}

module.exports = {
  sendWarningEmailNow,
  calculateMetrics,
  determineWarningLevel,
  wasWarningSentRecently,
  initializeTransporter
};
