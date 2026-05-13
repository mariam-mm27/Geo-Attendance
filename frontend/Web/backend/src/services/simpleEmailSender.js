/**
 * Simple Email Sender
 * Direct, no-nonsense email sending
 * This WILL work or fail loudly
 */

import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

let transporter = null;

/**
 * Initialize transporter once
 */
function initTransporter() {
  if (transporter) return transporter;

  console.log('\n🔧 Initializing email transporter...');

  // Try Brevo
  if (process.env.BREVO_USER && process.env.BREVO_SMTP_KEY) {
    console.log('📧 Using Brevo SMTP');
    transporter = nodemailer.createTransport({
      host: 'smtp-relay.brevo.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.BREVO_USER,
        pass: process.env.BREVO_SMTP_KEY
      }
    });
    return transporter;
  }

  // Try Gmail
  if (process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
    console.log('📧 Using Gmail SMTP');
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      }
    });
    return transporter;
  }

  console.error('❌ NO EMAIL CREDENTIALS FOUND IN .env');
  return null;
}

/**
 * Send email - SIMPLE AND DIRECT
 */
async function sendEmail(to, subject, html) {
  try {
    const trans = initTransporter();
    if (!trans) {
      console.error('❌ Email transporter not initialized');
      return { success: false, error: 'No email service' };
    }

    console.log(`\n📧 Sending email to ${to}...`);
    console.log(`   Subject: ${subject}`);

    const info = await trans.sendMail({
      from: process.env.BREVO_USER || process.env.EMAIL_USER,
      to: to,
      subject: subject,
      html: html
    });

    console.log(`✅ Email sent! Message ID: ${info.messageId}\n`);
    return { success: true, messageId: info.messageId };

  } catch (error) {
    console.error(`❌ Email failed: ${error.message}\n`);
    return { success: false, error: error.message };
  }
}

/**
 * Send warning email
 */
async function sendWarningEmail(studentEmail, studentName, courseName, metrics, warningLevel) {
  const colors = {
    FIRST_WARNING: '#FFC107',
    SECOND_WARNING: '#FF9800',
    FINAL_EXAM_DENIED: '#F44336'
  };

  const titles = {
    FIRST_WARNING: '⚠️ First Warning',
    SECOND_WARNING: '⚠️⚠️ Second Warning',
    FINAL_EXAM_DENIED: '🚫 Course Denial'
  };

  const messages = {
    FIRST_WARNING: 'You have reached 10% absence rate.',
    SECOND_WARNING: 'You have reached 20% absence rate.',
    FINAL_EXAM_DENIED: 'You have exceeded 25% absence. You are denied from the final exam.'
  };

  const color = colors[warningLevel] || '#FFC107';
  const title = titles[warningLevel] || 'Warning';
  const message = messages[warningLevel] || 'Attendance warning';

  const html = `
    <html>
    <body style="font-family: Arial; max-width: 600px; margin: 0 auto;">
      <div style="background: ${color}; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0;">${title}</h1>
      </div>
      <div style="background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px;">
        <p>Dear ${studentName},</p>
        <p style="background: #fff3cd; border-left: 4px solid ${color}; padding: 15px; border-radius: 4px;">
          <strong>${message}</strong>
        </p>
        <h3>Course: ${courseName}</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr style="background: #f0f0f0;">
            <td style="padding: 10px; border: 1px solid #ddd;"><strong>Total Sessions</strong></td>
            <td style="padding: 10px; border: 1px solid #ddd;">${metrics.totalSessions}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd;"><strong>Attended</strong></td>
            <td style="padding: 10px; border: 1px solid #ddd;">${metrics.attendedSessions}</td>
          </tr>
          <tr style="background: #f0f0f0;">
            <td style="padding: 10px; border: 1px solid #ddd;"><strong>Missed</strong></td>
            <td style="padding: 10px; border: 1px solid #ddd; color: ${color}; font-weight: bold;">${metrics.missedSessions}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd;"><strong>Attendance Rate</strong></td>
            <td style="padding: 10px; border: 1px solid #ddd;">${metrics.attendanceRate}%</td>
          </tr>
          <tr style="background: #f0f0f0;">
            <td style="padding: 10px; border: 1px solid #ddd;"><strong>Absence Rate</strong></td>
            <td style="padding: 10px; border: 1px solid #ddd; color: ${color}; font-weight: bold;">${metrics.absenceRate}%</td>
          </tr>
        </table>
        <p style="margin-top: 20px; color: #666; font-size: 12px;">
          This is an automated message from the Attendance System.
        </p>
      </div>
    </body>
    </html>
  `;

  return sendEmail(studentEmail, `${title} - ${courseName}`, html);
}

export {
  sendEmail,
  sendWarningEmail,
  initTransporter
};
