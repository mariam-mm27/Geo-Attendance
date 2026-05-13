/**
 * Email Templates System
 * Manages customizable email templates for attendance warnings
 */

import { db } from '../config/firebase-client.js';
import { doc, getDoc, updateDoc, collection, addDoc, getDocs, query, where } from 'firebase/firestore';

export class EmailTemplates {
  /**
   * Get email template for specific warning level and course
   */
  static async getTemplate(courseId, warningLevel) {
    try {
      // Try to get course-specific template first
      const templateDoc = await getDoc(doc(db, 'emailTemplates', `${courseId}_${warningLevel}`));
      
      if (templateDoc.exists()) {
        return templateDoc.data();
      }
      
      // Fall back to global template
      const globalTemplateDoc = await getDoc(doc(db, 'emailTemplates', `global_${warningLevel}`));
      
      if (globalTemplateDoc.exists()) {
        return globalTemplateDoc.data();
      }
      
      // Return default template
      return this.getDefaultTemplate(warningLevel);
    } catch (error) {
      console.error('Error getting email template:', error);
      return this.getDefaultTemplate(warningLevel);
    }
  }

  /**
   * Set or update email template
   */
  static async setTemplate(courseId, warningLevel, template) {
    try {
      const templateId = courseId ? `${courseId}_${warningLevel}` : `global_${warningLevel}`;
      const templateRef = doc(db, 'emailTemplates', templateId);
      
      const validatedTemplate = this.validateTemplate(template);
      
      await updateDoc(templateRef, {
        ...validatedTemplate,
        warningLevel,
        courseId: courseId || null,
        isGlobal: !courseId,
        updatedAt: new Date(),
        updatedBy: 'admin' // This should come from auth context
      });
      
      return { success: true, message: 'Template updated successfully' };
    } catch (error) {
      console.error('Error setting email template:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get default email template for warning level
   */
  static getDefaultTemplate(warningLevel) {
    const templates = {
      FIRST_WARNING: {
        subject: '⚡ First Attendance Warning - {courseName}',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>First Attendance Warning</title>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #EAB308 0%, #EAB308CC 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
              .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
              .alert-box { background: #FEF9C3; border-left: 4px solid #EAB308; padding: 15px; margin: 20px 0; border-radius: 5px; }
              .stats { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
              .stat-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e9ecef; }
              .stat-label { font-weight: bold; color: #6c757d; }
              .stat-value { color: #173B66; font-weight: bold; }
              .danger { color: #EAB308; }
              .level-badge { background: #EAB308; color: white; padding: 8px 16px; border-radius: 20px; font-weight: bold; font-size: 12px; display: inline-block; margin: 10px 0; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>⚡ First Attendance Warning</h1>
              <div class="level-badge">FIRST WARNING ALERT</div>
            </div>
            <div class="content">
              <p>Dear <strong>{studentName}</strong>,</p>
              
              <div class="alert-box">
                <strong>⚡ First Attendance Warning</strong>
                <p>Your absence rate has exceeded {threshold}%. Please monitor your attendance to maintain good standing.</p>
                <p>Your attendance in <strong>{courseName}</strong> requires attention.</p>
              </div>

              <div class="stats">
                <h3>📊 Attendance Statistics</h3>
                <div class="stat-row">
                  <span class="stat-label">Course:</span>
                  <span class="stat-value">{courseName}</span>
                </div>
                <div class="stat-row">
                  <span class="stat-label">Total Sessions:</span>
                  <span class="stat-value">{totalSessions}</span>
                </div>
                <div class="stat-row">
                  <span class="stat-label">Sessions Attended:</span>
                  <span class="stat-value">{attendedSessions}</span>
                </div>
                <div class="stat-row">
                  <span class="stat-label">Sessions Missed:</span>
                  <span class="stat-value danger">{missedSessions}</span>
                </div>
                <div class="stat-row">
                  <span class="stat-label">Attendance Rate:</span>
                  <span class="stat-value">{attendanceRate}%</span>
                </div>
                <div class="stat-row">
                  <span class="stat-label">Absence Rate:</span>
                  <span class="stat-value danger">{absenceRate}%</span>
                </div>
                <div class="stat-row">
                  <span class="stat-label">Remaining Allowed Absences:</span>
                  <span class="stat-value">{remainingAbsences}</span>
                </div>
              </div>
              
              <h4>📋 Action Required:</h4>
              <ul>
                <li>Attend all remaining sessions</li>
                <li>Contact your professor: <strong>{professorName}</strong></li>
                <li>Submit documentation for any excused absences</li>
              </ul>

              <div style="background: #E0F2FE; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0; color: #0369A1; font-size: 14px;">
                  📧 This is an automated email from the Attendance Management System.<br>
                  📱 You can also view this alert in your student dashboard.<br>
                  📅 Sent on: {timestamp}
                </p>
              </div>
            </div>
          </body>
          </html>
        `,
        variables: ['studentName', 'courseName', 'threshold', 'totalSessions', 'attendedSessions', 'missedSessions', 'attendanceRate', 'absenceRate', 'remainingAbsences', 'professorName', 'timestamp']
      },
      
      SECOND_WARNING: {
        subject: '⚠️ Second Attendance Warning - {courseName}',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Second Attendance Warning</title>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #F59E0B 0%, #F59E0BCC 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
              .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
              .alert-box { background: #FEF3C7; border-left: 4px solid #F59E0B; padding: 15px; margin: 20px 0; border-radius: 5px; }
              .stats { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
              .stat-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e9ecef; }
              .stat-label { font-weight: bold; color: #6c757d; }
              .stat-value { color: #173B66; font-weight: bold; }
              .danger { color: #F59E0B; }
              .level-badge { background: #F59E0B; color: white; padding: 8px 16px; border-radius: 20px; font-weight: bold; font-size: 12px; display: inline-block; margin: 10px 0; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>⚠️ Second Attendance Warning</h1>
              <div class="level-badge">SECOND WARNING ALERT</div>
            </div>
            <div class="content">
              <p>Dear <strong>{studentName}</strong>,</p>
              
              <div class="alert-box">
                <strong>⚠️ Second Attendance Warning</strong>
                <p>Your absence rate has exceeded {threshold}%. Take immediate action to avoid final exam denial.</p>
                <p>Your attendance in <strong>{courseName}</strong> requires immediate attention.</p>
              </div>

              <div class="stats">
                <h3>📊 Attendance Statistics</h3>
                <div class="stat-row">
                  <span class="stat-label">Course:</span>
                  <span class="stat-value">{courseName}</span>
                </div>
                <div class="stat-row">
                  <span class="stat-label">Total Sessions:</span>
                  <span class="stat-value">{totalSessions}</span>
                </div>
                <div class="stat-row">
                  <span class="stat-label">Sessions Attended:</span>
                  <span class="stat-value">{attendedSessions}</span>
                </div>
                <div class="stat-row">
                  <span class="stat-label">Sessions Missed:</span>
                  <span class="stat-value danger">{missedSessions}</span>
                </div>
                <div class="stat-row">
                  <span class="stat-label">Attendance Rate:</span>
                  <span class="stat-value">{attendanceRate}%</span>
                </div>
                <div class="stat-row">
                  <span class="stat-label">Absence Rate:</span>
                  <span class="stat-value danger">{absenceRate}%</span>
                </div>
                <div class="stat-row">
                  <span class="stat-label">Remaining Allowed Absences:</span>
                  <span class="stat-value danger">{remainingAbsences}</span>
                </div>
              </div>
              
              <div style="background: #FEF3C7; padding: 15px; border-radius: 8px; border-left: 4px solid #F59E0B; margin: 20px 0;">
                <h4 style="color: #F59E0B; margin: 0 0 10px 0;">⚠️ URGENT ACTION REQUIRED</h4>
                <p style="margin: 0; color: #92400E;">Your absence rate is critical. You are at risk of being denied from the final exam. Contact your professor immediately!</p>
              </div>
              
              <h4>📋 Immediate Action Required:</h4>
              <ul>
                <li><strong>Contact your professor immediately: {professorName}</strong></li>
                <li>Submit documentation for all absences</li>
                <li>Attend every remaining session without fail</li>
                <li>Discuss options for recovering your attendance</li>
              </ul>

              <div style="background: #E0F2FE; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0; color: #0369A1; font-size: 14px;">
                  📧 This is an automated email from the Attendance Management System.<br>
                  📱 You can also view this alert in your student dashboard.<br>
                  📅 Sent on: {timestamp}
                </p>
              </div>
            </div>
          </body>
          </html>
        `,
        variables: ['studentName', 'courseName', 'threshold', 'totalSessions', 'attendedSessions', 'missedSessions', 'attendanceRate', 'absenceRate', 'remainingAbsences', 'professorName', 'timestamp']
      },
      
      FINAL_EXAM_DENIED: {
        subject: '🚫 Final Exam Denied - {courseName}',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Final Exam Denied</title>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #DC2626 0%, #DC2626CC 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
              .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
              .alert-box { background: #FEE2E2; border-left: 4px solid #DC2626; padding: 15px; margin: 20px 0; border-radius: 5px; }
              .stats { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
              .stat-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e9ecef; }
              .stat-label { font-weight: bold; color: #6c757d; }
              .stat-value { color: #173B66; font-weight: bold; }
              .danger { color: #DC2626; }
              .level-badge { background: #DC2626; color: white; padding: 8px 16px; border-radius: 20px; font-weight: bold; font-size: 12px; display: inline-block; margin: 10px 0; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>🚫 Final Exam Denied</h1>
              <div class="level-badge">FINAL EXAM DENIED</div>
            </div>
            <div class="content">
              <p>Dear <strong>{studentName}</strong>,</p>
              
              <div class="alert-box">
                <strong>🚫 Final Exam Denied</strong>
                <p>Your absence rate has exceeded {threshold}%. You have been denied from taking the final exam.</p>
                <p>This action is final and cannot be reversed without formal appeal.</p>
              </div>

              <div class="stats">
                <h3>📊 Final Attendance Statistics</h3>
                <div class="stat-row">
                  <span class="stat-label">Course:</span>
                  <span class="stat-value">{courseName}</span>
                </div>
                <div class="stat-row">
                  <span class="stat-label">Total Sessions:</span>
                  <span class="stat-value">{totalSessions}</span>
                </div>
                <div class="stat-row">
                  <span class="stat-label">Sessions Attended:</span>
                  <span class="stat-value">{attendedSessions}</span>
                </div>
                <div class="stat-row">
                  <span class="stat-label">Sessions Missed:</span>
                  <span class="stat-value danger">{missedSessions}</span>
                </div>
                <div class="stat-row">
                  <span class="stat-label">Attendance Rate:</span>
                  <span class="stat-value">{attendanceRate}%</span>
                </div>
                <div class="stat-row">
                  <span class="stat-label">Absence Rate:</span>
                  <span class="stat-value danger">{absenceRate}%</span>
                </div>
                <div class="stat-row">
                  <span class="stat-label">Allowed Absences:</span>
                  <span class="stat-value danger">0</span>
                </div>
              </div>
              
              <div style="background: #FEE2E2; padding: 15px; border-radius: 8px; border-left: 4px solid #DC2626; margin: 20px 0;">
                <h4 style="color: #DC2626; margin: 0 0 10px 0;">🚨 FINAL EXAM ACCESS DENIED</h4>
                <p style="margin: 0; color: #991B1B;">You have exceeded the maximum allowed absences and are denied from taking the final exam. You must contact the academic office immediately to discuss your options.</p>
              </div>
              
              <h4>📋 Critical Actions Required:</h4>
              <ul>
                <li><strong>Schedule immediate meeting with department head</strong></li>
                <li><strong>Contact academic affairs office</strong></li>
                <li>Submit formal appeal if applicable</li>
                <li>Review academic withdrawal options</li>
              </ul>

              <div style="background: #E0F2FE; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0; color: #0369A1; font-size: 14px;">
                  📧 This is an automated email from the Attendance Management System.<br>
                  📱 You can also view this alert in your student dashboard.<br>
                  📅 Sent on: {timestamp}
                </p>
              </div>
            </div>
          </body>
          </html>
        `,
        variables: ['studentName', 'courseName', 'threshold', 'totalSessions', 'attendedSessions', 'missedSessions', 'attendanceRate', 'absenceRate', 'remainingAbsences', 'professorName', 'timestamp']
      }
    };

    return templates[warningLevel] || templates.FIRST_WARNING;
  }

  /**
   * Validate template structure
   */
  static validateTemplate(template) {
    if (!template.subject || !template.html) {
      throw new Error('Template must have subject and html content');
    }

    return {
      subject: template.subject,
      html: template.html,
      variables: template.variables || [],
      isActive: template.isActive !== false,
      createdAt: template.createdAt || new Date()
    };
  }

  /**
   * Replace template variables with actual data
   */
  static replaceVariables(template, data) {
    let { subject, html } = template;
    
    // Replace all variables in subject and HTML
    Object.keys(data).forEach(key => {
      const regex = new RegExp(`{${key}}`, 'g');
      subject = subject.replace(regex, data[key] || '');
      html = html.replace(regex, data[key] || '');
    });

    return { subject, html };
  }

  /**
   * Get all email templates
   */
  static async getAllTemplates() {
    try {
      const templatesSnapshot = await getDocs(collection(db, 'emailTemplates'));
      const templates = {};
      
      templatesSnapshot.forEach(doc => {
        templates[doc.id] = doc.data();
      });
      
      return templates;
    } catch (error) {
      console.error('Error getting all templates:', error);
      return {};
    }
  }

  /**
   * Delete email template
   */
  static async deleteTemplate(courseId, warningLevel) {
    try {
      const templateId = courseId ? `${courseId}_${warningLevel}` : `global_${warningLevel}`;
      
      await updateDoc(doc(db, 'emailTemplates', templateId), {
        isActive: false,
        deletedAt: new Date()
      });
      
      return { success: true, message: 'Template deleted successfully' };
    } catch (error) {
      console.error('Error deleting template:', error);
      return { success: false, error: error.message };
    }
  }
}
