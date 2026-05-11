import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

let transporter = null;

/**
 * Initialize email transporter - called once
 */
function initializeTransporter() {
  if (transporter) return transporter;

  console.log("🔧 Initializing email transporter...");

  // Try Gmail first (most reliable for this setup)
  if (process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
    console.log("📧 Using Gmail SMTP");
    transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });
    return transporter;
  }

  // Fallback to Brevo
  if (process.env.BREVO_USER && process.env.BREVO_SMTP_KEY) {
    console.log("📧 Using Brevo SMTP");
    transporter = nodemailer.createTransport({
      host: "smtp-relay.brevo.com",
      port: 587,
      secure: false,
      auth: {
        user: process.env.BREVO_USER,
        pass: process.env.BREVO_SMTP_KEY,
      },
    });
    return transporter;
  }

  console.error("❌ NO EMAIL CREDENTIALS FOUND");
  return null;
}

/**
 * Send email - generic function
 */
export async function sendEmail(to, subject, html) {
  try {
    const trans = initializeTransporter();
    if (!trans) {
      console.error("❌ Email transporter not initialized");
      return { success: false, error: "Email service not configured" };
    }

    const fromEmail = process.env.EMAIL_USER || process.env.BREVO_USER;
    console.log(`📧 Sending email to ${to}...`);
    console.log(`   Subject: ${subject}`);
    console.log(`   From: ${fromEmail}`);

    const info = await trans.sendMail({
      from: fromEmail,
      to: to,
      subject: subject,
      html: html,
    });

    console.log(`✅ Email sent! Message ID: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`❌ Email failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Send login hello message email
 */
export async function sendLoginHelloEmail(email, name) {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0; font-size: 28px;">👋 Welcome Back!</h1>
      </div>
      
      <div style="padding: 30px; background-color: #f8f9fa; border-radius: 0 0 8px 8px;">
        <p style="font-size: 16px; color: #333; margin-bottom: 20px;">
          Hello <strong>${name}</strong>,
        </p>
        
        <p style="font-size: 16px; color: #333; line-height: 1.6; margin-bottom: 20px;">
          You have successfully logged in to the <strong>Geo-Attendance System</strong>.
        </p>
        
        <div style="background-color: #E0F2FE; border-left: 4px solid #0284C7; padding: 15px; margin: 20px 0; border-radius: 4px;">
          <p style="margin: 0; color: #0C4A6E; font-weight: bold;">
            ✅ Login Successful
          </p>
          <p style="margin: 5px 0 0 0; color: #0C4A6E; font-size: 14px;">
            Your session is now active. If this wasn't you, please change your password immediately.
          </p>
        </div>
        
        <h3 style="color: #173B66; margin-top: 25px; margin-bottom: 15px;">📋 Quick Links:</h3>
        <ul style="color: #333; line-height: 1.8; margin: 0; padding-left: 20px;">
          <li>📊 Check your attendance</li>
          <li>📚 View your courses</li>
          <li>📱 Find active sessions</li>
          <li>🔔 Review notifications</li>
        </ul>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; color: #666; font-size: 12px;">
          <p style="margin: 0;">
            This is an automated message from Geo-Attendance System.<br>
            Please do not reply to this email.
          </p>
        </div>
      </div>
    </div>
  `;

  return sendEmail(email, "👋 Welcome to Geo-Attendance - Login Successful", html);
}

/**
 * Send attendance warning email
 */
export async function sendAttendanceWarningEmail(email, name, courseName, attendanceRate, absenceRate, missedSessions, totalSessions) {
  let warningLevel = "FIRST_WARNING";
  let warningColor = "#FFC107";
  let warningTitle = "⚠️ First Warning";

  if (absenceRate >= 25) {
    warningLevel = "FINAL_EXAM_DENIED";
    warningColor = "#DC2626";
    warningTitle = "🚫 FINAL EXAM DENIED";
  } else if (absenceRate >= 20) {
    warningLevel = "SECOND_WARNING";
    warningColor = "#F59E0B";
    warningTitle = "⚠️⚠️ Second Warning";
  }

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: ${warningColor}; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0; font-size: 24px;">${warningTitle}</h1>
      </div>
      
      <div style="padding: 30px; background-color: #f8f9fa; border-radius: 0 0 8px 8px;">
        <p style="font-size: 16px; color: #333; margin-bottom: 20px;">
          Hello <strong>${name}</strong>,
        </p>
        
        <p style="font-size: 16px; color: #333; line-height: 1.6; margin-bottom: 20px;">
          This is an important notification regarding your attendance in <strong>${courseName}</strong>.
        </p>
        
        <div style="background-color: #FEE2E2; border-left: 4px solid ${warningColor}; padding: 15px; margin: 20px 0; border-radius: 4px;">
          <p style="margin: 0; color: #991B1B; font-weight: bold;">
            Your absence rate has reached ${absenceRate}%
          </p>
          <p style="margin: 5px 0 0 0; color: #991B1B; font-size: 14px;">
            ${warningLevel === "FINAL_EXAM_DENIED" 
              ? "You have been denied from taking the final exam due to excessive absences." 
              : "Please attend all remaining sessions to maintain good standing."}
          </p>
        </div>
        
        <h3 style="color: #173B66; margin-top: 25px; margin-bottom: 15px;">📊 Attendance Details:</h3>
        <table style="width: 100%; background-color: white; border-collapse: collapse; margin-top: 10px;">
          <tr style="background-color: #E0F2FE;">
            <td style="padding: 12px; border: 1px solid #ddd; font-weight: bold;">Course</td>
            <td style="padding: 12px; border: 1px solid #ddd;">${courseName}</td>
          </tr>
          <tr>
            <td style="padding: 12px; border: 1px solid #ddd; font-weight: bold;">Attendance Rate</td>
            <td style="padding: 12px; border: 1px solid #ddd; color: ${attendanceRate < 75 ? '#DC2626' : '#16A34A'}; font-weight: bold;">
              ${attendanceRate}%
            </td>
          </tr>
          <tr style="background-color: #F3F4F6;">
            <td style="padding: 12px; border: 1px solid #ddd; font-weight: bold;">Absence Rate</td>
            <td style="padding: 12px; border: 1px solid #ddd; color: ${warningColor}; font-weight: bold;">
              ${absenceRate}%
            </td>
          </tr>
          <tr>
            <td style="padding: 12px; border: 1px solid #ddd; font-weight: bold;">Sessions Attended</td>
            <td style="padding: 12px; border: 1px solid #ddd;">
              ${totalSessions - missedSessions} / ${totalSessions}
            </td>
          </tr>
          <tr style="background-color: #F3F4F6;">
            <td style="padding: 12px; border: 1px solid #ddd; font-weight: bold;">Sessions Missed</td>
            <td style="padding: 12px; border: 1px solid #ddd; color: ${warningColor}; font-weight: bold;">
              ${missedSessions}
            </td>
          </tr>
        </table>
        
        <h3 style="color: #173B66; margin-top: 25px; margin-bottom: 15px;">📋 Action Required:</h3>
        <ul style="color: #333; line-height: 1.8; margin: 0; padding-left: 20px;">
          <li>Attend all remaining sessions</li>
          <li>Contact your professor immediately</li>
          <li>Submit documentation for any excused absences</li>
          ${warningLevel === "FINAL_EXAM_DENIED" ? "<li><strong>Schedule an urgent meeting with your professor</strong></li>" : ""}
        </ul>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; color: #666; font-size: 12px;">
          <p style="margin: 0;">
            This is an automated message from Geo-Attendance System.<br>
            Please do not reply to this email.
          </p>
        </div>
      </div>
    </div>
  `;

  return sendEmail(email, `${warningTitle} - ${courseName}`, html);
}
