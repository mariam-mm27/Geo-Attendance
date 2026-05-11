/**
 * Warning Email Service
 * Sends attendance warning emails when thresholds are exceeded
 */

import nodemailer from "nodemailer";
import dotenv from "dotenv";
import { db } from "../config/firebase.js";
import { doc, getDoc } from "firebase/firestore";

dotenv.config();

let transporter = null;

/**
 * Initialize email transporter
 */
function initializeTransporter() {
  if (transporter) return transporter;

  console.log("🔧 Initializing warning email transporter...");

  // Try Gmail first (most reliable)
  if (process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
    console.log("📧 Using Gmail SMTP for warnings");
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
    console.log("📧 Using Brevo SMTP for warnings");
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
 * Send warning email
 */
export async function sendWarningEmail(studentId, courseId, warningLevel, metrics) {
  try {
    console.log(`\n📧 Sending ${warningLevel} warning email to student ${studentId}...`);

    // Get student data
    const studentDoc = await getDoc(doc(db, "users", studentId));
    if (!studentDoc.exists()) {
      console.error("❌ Student not found");
      return { success: false, error: "Student not found" };
    }

    const studentData = studentDoc.data();
    const studentEmail = studentData.email;

    if (!studentEmail) {
      console.error("❌ Student email not found");
      return { success: false, error: "Student email not found" };
    }

    // Get course data
    const courseDoc = await getDoc(doc(db, "courses", courseId));
    if (!courseDoc.exists()) {
      console.error("❌ Course not found");
      return { success: false, error: "Course not found" };
    }

    const courseData = courseDoc.data();
    const courseName = courseData.name || "Course";

    // Determine warning details
    let warningTitle = "⚠️ First Warning";
    let warningColor = "#FFC107";
    let warningMessage = "Your absence rate has exceeded 10%.";

    if (warningLevel === "SECOND_WARNING") {
      warningTitle = "⚠️⚠️ Second Warning";
      warningColor = "#F59E0B";
      warningMessage = "Your absence rate has exceeded 20%.";
    } else if (warningLevel === "FINAL_EXAM_DENIED") {
      warningTitle = "🚫 FINAL EXAM DENIED";
      warningColor = "#DC2626";
      warningMessage = "Your absence rate has exceeded 25%. You have been denied from the final exam.";
    }

    // Create email HTML
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: ${warningColor}; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 24px;">${warningTitle}</h1>
        </div>
        
        <div style="padding: 30px; background-color: #f8f9fa; border-radius: 0 0 8px 8px;">
          <p style="font-size: 16px; color: #333; margin-bottom: 20px;">
            Hello <strong>${studentData.name || "Student"}</strong>,
          </p>
          
          <p style="font-size: 16px; color: #333; line-height: 1.6; margin-bottom: 20px;">
            This is an important notification regarding your attendance in <strong>${courseName}</strong>.
          </p>
          
          <div style="background-color: #FEE2E2; border-left: 4px solid ${warningColor}; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0; color: #991B1B; font-weight: bold;">
              ${warningMessage}
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
              <td style="padding: 12px; border: 1px solid #ddd; color: ${metrics.attendanceRate < 75 ? '#DC2626' : '#16A34A'}; font-weight: bold;">
                ${metrics.attendanceRate}%
              </td>
            </tr>
            <tr style="background-color: #F3F4F6;">
              <td style="padding: 12px; border: 1px solid #ddd; font-weight: bold;">Absence Rate</td>
              <td style="padding: 12px; border: 1px solid #ddd; color: ${warningColor}; font-weight: bold;">
                ${metrics.absenceRate}%
              </td>
            </tr>
            <tr>
              <td style="padding: 12px; border: 1px solid #ddd; font-weight: bold;">Sessions Attended</td>
              <td style="padding: 12px; border: 1px solid #ddd;">
                ${metrics.attendedSessions} / ${metrics.totalSessions}
              </td>
            </tr>
            <tr style="background-color: #F3F4F6;">
              <td style="padding: 12px; border: 1px solid #ddd; font-weight: bold;">Sessions Missed</td>
              <td style="padding: 12px; border: 1px solid #ddd; color: ${warningColor}; font-weight: bold;">
                ${metrics.missedSessions}
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

    // Send email
    const transporter_instance = initializeTransporter();
    if (!transporter_instance) {
      console.error("❌ Email transporter not initialized");
      return { success: false, error: "Email service not configured" };
    }

    const fromEmail = process.env.EMAIL_USER || process.env.BREVO_USER;
    console.log(`📧 Sending to: ${studentEmail}`);
    console.log(`   From: ${fromEmail}`);
    console.log(`   Subject: ${warningTitle} - ${courseName}`);

    const info = await transporter_instance.sendMail({
      from: fromEmail,
      to: studentEmail,
      subject: `${warningTitle} - ${courseName}`,
      html: html,
    });

    console.log(`✅ Warning email sent! Message ID: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`❌ Error sending warning email: ${error.message}`);
    return { success: false, error: error.message };
  }
}
