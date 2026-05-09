/**
 * Email Delivery Service
 * 
 * Handles multi-provider email delivery with automatic fallback and retry logic.
 * Supports Brevo (primary), Gmail (fallback), and Ethereal (test).
 * 
 * Features:
 * - Connection pooling
 * - Automatic provider fallback
 * - Delivery tracking
 * - Automatic retries
 * - HTML email templates
 */

const nodemailer = require('nodemailer');
const admin = require('firebase-admin');
const db = admin.firestore();
const logger = require('../utils/logger');

// Email providers
const PROVIDERS = {
  BREVO: 'BREVO',
  GMAIL: 'GMAIL',
  ETHEREAL: 'ETHEREAL'
};

// Email status
const EMAIL_STATUS = {
  SENT: 'SENT',
  DELIVERED: 'DELIVERED',
  FAILED: 'FAILED',
  PERMANENTLY_FAILED: 'PERMANENTLY_FAILED'
};

class EmailDeliveryService {
  constructor() {
    this.transports = {};
    this.initializeTransports();
  }

  /**
   * Initialize email transports for all providers
   */
  initializeTransports() {
    try {
      // Brevo SMTP
      if (process.env.BREVO_SMTP_HOST && process.env.BREVO_SMTP_USER && process.env.BREVO_SMTP_PASS) {
        this.transports[PROVIDERS.BREVO] = nodemailer.createTransport({
          host: process.env.BREVO_SMTP_HOST,
          port: parseInt(process.env.BREVO_SMTP_PORT || '587'),
          secure: process.env.BREVO_SMTP_SECURE === 'true',
          auth: {
            user: process.env.BREVO_SMTP_USER,
            pass: process.env.BREVO_SMTP_PASS
          },
          pool: {
            maxConnections: 20,
            maxMessages: 100,
            rateDelta: 1000,
            rateLimit: 50
          }
        });
        logger.info('Brevo SMTP transport initialized');
      }

      // Gmail SMTP
      if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
        this.transports[PROVIDERS.GMAIL] = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: process.env.GMAIL_USER,
            pass: process.env.GMAIL_APP_PASSWORD
          },
          pool: {
            maxConnections: 10,
            maxMessages: 50,
            rateDelta: 1000,
            rateLimit: 30
          }
        });
        logger.info('Gmail SMTP transport initialized');
      }

      // Ethereal (test)
      if (process.env.ETHEREAL_USER && process.env.ETHEREAL_PASS) {
        this.transports[PROVIDERS.ETHEREAL] = nodemailer.createTransport({
          host: 'smtp.ethereal.email',
          port: 587,
          secure: false,
          auth: {
            user: process.env.ETHEREAL_USER,
            pass: process.env.ETHEREAL_PASS
          }
        });
        logger.info('Ethereal test transport initialized');
      }

    } catch (error) {
      logger.error('Error initializing email transports:', error);
    }
  }

  /**
   * Send warning email
   */
  async sendWarningEmail(emailData) {
    try {
      const htmlContent = this.generateWarningEmailHTML(emailData);
      const subject = this.generateEmailSubject(emailData);

      const mailOptions = {
        from: process.env.EMAIL_FROM || process.env.BREVO_SMTP_USER || 'noreply@attendance-system.com',
        to: emailData.studentEmail,
        subject,
        html: htmlContent
      };

      logger.info(`Attempting to send email to ${emailData.studentEmail}`, {
        subject,
        warningLevel: emailData.warningLevel
      });

      // Try providers in order
      const providers = [
        { name: 'BREVO', transport: this.transports['BREVO'] },
        { name: 'GMAIL', transport: this.transports['GMAIL'] },
        { name: 'ETHEREAL', transport: this.transports['ETHEREAL'] }
      ];

      for (const provider of providers) {
        if (!provider.transport) {
          logger.warn(`Provider ${provider.name} not configured, skipping`);
          continue;
        }

        try {
          logger.debug(`Trying to send via ${provider.name}...`);
          const result = await provider.transport.sendMail(mailOptions);
          
          logger.info(`✅ Email sent via ${provider.name} to ${emailData.studentEmail}`, {
            messageId: result.messageId,
            provider: provider.name
          });

          return {
            success: true,
            messageId: result.messageId,
            provider: provider.name,
            status: EMAIL_STATUS.SENT,
            timestamp: new Date().toISOString()
          };

        } catch (error) {
          logger.warn(`Failed to send via ${provider.name}: ${error.message}`);
          continue;
        }
      }

      // All providers failed
      logger.error('All email providers failed', {
        studentEmail: emailData.studentEmail,
        warningLevel: emailData.warningLevel
      });

      return {
        success: false,
        error: 'All email providers failed',
        status: EMAIL_STATUS.FAILED,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      logger.error('Error sending warning email:', error);
      return {
        success: false,
        error: error.message,
        status: EMAIL_STATUS.FAILED,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Generate email subject
   */
  generateEmailSubject(emailData) {
    const { warningLevel, courseName } = emailData;

    const levelLabels = {
      FIRST_WARNING: '⚠️ First Warning',
      SECOND_WARNING: '⚠️⚠️ Second Warning',
      DEPRIVATION: '🚫 Course Denial Notice'
    };

    return `${levelLabels[warningLevel]} - ${courseName}`;
  }

  /**
   * Generate warning email HTML
   */
  generateWarningEmailHTML(emailData) {
    const {
      studentName,
      courseName,
      courseCode,
      warningLevel,
      metrics,
      professorName,
      timestamp
    } = emailData;

    const warningColors = {
      FIRST_WARNING: '#FFC107',
      SECOND_WARNING: '#FF9800',
      DEPRIVATION: '#F44336'
    };

    const warningTitles = {
      FIRST_WARNING: 'First Warning - Attendance Alert',
      SECOND_WARNING: 'Second Warning - Critical Attendance Alert',
      DEPRIVATION: 'Course Denial Notice - Attendance Exceeded'
    };

    const warningMessages = {
      FIRST_WARNING: 'You have reached 10% absence rate. Please improve your attendance immediately.',
      SECOND_WARNING: 'You have reached 20% absence rate. Your course enrollment is at risk.',
      DEPRIVATION: 'You have exceeded the allowed absence limit (25%). You are denied from taking the final exam.'
    };

    const actionMessages = {
      FIRST_WARNING: 'Please attend all upcoming lectures to improve your attendance rate.',
      SECOND_WARNING: 'Contact your professor immediately to discuss your attendance issues.',
      DEPRIVATION: 'Contact your department head to appeal this decision.'
    };

    const color = warningColors[warningLevel];
    const title = warningTitles[warningLevel];
    const message = warningMessages[warningLevel];
    const action = actionMessages[warningLevel];

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f5f5f5;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: white;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          .header {
            background-color: ${color};
            color: white;
            padding: 20px;
            text-align: center;
          }
          .header h1 {
            margin: 0;
            font-size: 24px;
          }
          .content {
            padding: 30px;
          }
          .greeting {
            font-size: 16px;
            margin-bottom: 20px;
          }
          .alert-box {
            background-color: #fff3cd;
            border-left: 4px solid ${color};
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
          }
          .alert-box p {
            margin: 0;
            color: #856404;
            font-weight: 500;
          }
          .stats-table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
            background-color: #f9f9f9;
          }
          .stats-table th {
            background-color: #f0f0f0;
            padding: 12px;
            text-align: left;
            font-weight: 600;
            border-bottom: 2px solid #ddd;
          }
          .stats-table td {
            padding: 12px;
            border-bottom: 1px solid #ddd;
          }
          .stats-table tr:hover {
            background-color: #f5f5f5;
          }
          .stat-label {
            font-weight: 500;
            color: #555;
          }
          .stat-value {
            font-weight: 600;
            color: ${color};
            font-size: 18px;
          }
          .action-box {
            background-color: #e3f2fd;
            border-left: 4px solid #2196F3;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
          }
          .action-box h3 {
            margin-top: 0;
            color: #1976D2;
          }
          .action-box p {
            margin: 10px 0;
            color: #0d47a1;
          }
          .footer {
            background-color: #f5f5f5;
            padding: 20px;
            text-align: center;
            font-size: 12px;
            color: #666;
            border-top: 1px solid #ddd;
          }
          .footer p {
            margin: 5px 0;
          }
          .contact-info {
            background-color: #f0f0f0;
            padding: 15px;
            border-radius: 4px;
            margin: 20px 0;
            font-size: 14px;
          }
          .contact-info p {
            margin: 5px 0;
          }
          .timestamp {
            color: #999;
            font-size: 12px;
            margin-top: 10px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${title}</h1>
          </div>

          <div class="content">
            <div class="greeting">
              <p>Dear <strong>${studentName}</strong>,</p>
            </div>

            <div class="alert-box">
              <p>${message}</p>
            </div>

            <h2>Course Information</h2>
            <table class="stats-table">
              <tr>
                <td class="stat-label">Course Name:</td>
                <td><strong>${courseName}</strong></td>
              </tr>
              <tr>
                <td class="stat-label">Course Code:</td>
                <td><strong>${courseCode}</strong></td>
              </tr>
              <tr>
                <td class="stat-label">Professor:</td>
                <td><strong>${professorName || 'N/A'}</strong></td>
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
              <tr>
                <td class="stat-label">Remaining Allowed Absences:</td>
                <td class="stat-value">${metrics.remainingAllowedAbsences}</td>
              </tr>
            </table>

            <div class="action-box">
              <h3>What You Need to Do</h3>
              <p>${action}</p>
              <p>If you have any questions or need to discuss your attendance, please reach out to your professor or the department office immediately.</p>
            </div>

            <div class="contact-info">
              <p><strong>Need Help?</strong></p>
              <p>📧 Email: ${professorName ? 'Contact your professor' : 'Contact your department'}</p>
              <p>📞 Phone: Contact your department office</p>
              <p>🏫 Office: Visit the student services office</p>
            </div>

            <p style="margin-top: 30px; color: #666;">
              This is an automated message from the Attendance Management System. Please do not reply to this email.
            </p>
            <div class="timestamp">
              Generated on: ${new Date(timestamp).toLocaleString()}
            </div>
          </div>

          <div class="footer">
            <p><strong>Attendance Management System</strong></p>
            <p>© 2024 All Rights Reserved</p>
            <p>This email was sent because your attendance has triggered an automated warning.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Test email configuration
   */
  async testEmailConfiguration() {
    try {
      const results = {};

      for (const [provider, transport] of Object.entries(this.transports)) {
        try {
          await transport.verify();
          results[provider] = { status: 'OK', message: 'Connection verified' };
        } catch (error) {
          results[provider] = { status: 'FAILED', message: error.message };
        }
      }

      return results;

    } catch (error) {
      logger.error('Error testing email configuration:', error);
      throw error;
    }
  }

  /**
   * Send test email
   */
  async sendTestEmail(toEmail) {
    try {
      const mailOptions = {
        from: process.env.EMAIL_FROM || 'noreply@attendance-system.com',
        to: toEmail,
        subject: 'Test Email - Attendance System',
        html: `
          <h1>Test Email</h1>
          <p>This is a test email from the Attendance Management System.</p>
          <p>If you received this email, the email configuration is working correctly.</p>
          <p>Sent at: ${new Date().toISOString()}</p>
        `
      };

      const providers = [PROVIDERS.BREVO, PROVIDERS.GMAIL, PROVIDERS.ETHEREAL];

      for (const provider of providers) {
        if (!this.transports[provider]) continue;

        try {
          const result = await this.transports[provider].sendMail(mailOptions);
          return {
            success: true,
            provider,
            messageId: result.messageId
          };
        } catch (error) {
          logger.warn(`Test email failed via ${provider}:`, error.message);
          continue;
        }
      }

      throw new Error('All email providers failed');

    } catch (error) {
      logger.error('Error sending test email:', error);
      throw error;
    }
  }
}

// Singleton instance
let instance = null;

function getInstance() {
  if (!instance) {
    instance = new EmailDeliveryService();
  }
  return instance;
}

module.exports = {
  getInstance,
  PROVIDERS,
  EMAIL_STATUS,
  EmailDeliveryService
};
