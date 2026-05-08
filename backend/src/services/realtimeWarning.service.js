/**
 * Real-time Event-Driven Warning System
 * Provides instant warning processing with zero delays
 */

import { AttendanceRules } from '../models/attendanceRules.model.js';
import { EmailTemplates } from '../models/emailTemplates.model.js';
import { WarningHistory } from '../models/warningHistory.model.js';
import { db } from '../config/firebase-client.js';
import { doc, getDoc, getDocs, query, where, collection, addDoc } from 'firebase/firestore';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

export class RealtimeWarningService {
  constructor() {
    this.emailTransporter = null;
    this.processingQueue = new Map(); // Prevent duplicate processing
    
    // Initialize email transporter immediately (synchronously create, async verify)
    this.initializeEmailTransporterSync();
  }

  /**
   * Initialize email transporter synchronously
   */
  initializeEmailTransporterSync() {
    try {
      // Try Brevo SMTP first
      if (process.env.BREVO_SMTP_KEY && process.env.BREVO_USER) {
        this.emailTransporter = nodemailer.createTransport({
          host: "smtp-relay.brevo.com",
          port: 587,
          secure: false,
          auth: {
            user: process.env.BREVO_USER,
            pass: process.env.BREVO_SMTP_KEY,
          },
          tls: {
            rejectUnauthorized: false
          },
          pool: true,
          maxConnections: 20,
          maxMessages: 100,
          rateDelta: 1000,
          rateLimit: 50
        });
        
        console.log('✅ Brevo SMTP transporter created');
        
        // Verify in background
        this.emailTransporter.verify().then(() => {
          console.log('✅ Brevo SMTP verified');
        }).catch(err => {
          console.warn('⚠️ Brevo verification failed:', err.message);
        });
        
        return;
      }

      // Fallback to Gmail
      if (process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
        this.emailTransporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD,
          },
          pool: true,
          maxConnections: 10,
          maxMessages: 50
        });
        
        console.log('✅ Gmail SMTP transporter created');
        
        // Verify in background
        this.emailTransporter.verify().then(() => {
          console.log('✅ Gmail SMTP verified');
        }).catch(err => {
          console.warn('⚠️ Gmail verification failed:', err.message);
        });
        
        return;
      }

      console.error('❌ No email credentials configured in .env');
    } catch (error) {
      console.error('❌ Failed to initialize email transporter:', error.message);
    }
  }

  /**
   * Process attendance event in real-time
   * Called immediately when attendance is recorded
   */
  async processAttendanceEvent(studentId, courseId, sessionId, eventType = 'attendance_recorded') {
    try {
      console.log(`🚀 Processing real-time event: ${eventType} for student ${studentId} in course ${courseId}`);

      // Prevent duplicate processing
      const processingKey = `${studentId}_${courseId}_${sessionId}`;
      if (this.processingQueue.has(processingKey)) {
        console.log(`⏭️ Already processing ${processingKey} - skipping`);
        return { success: true, message: 'Already processing', skipped: true };
      }

      this.processingQueue.set(processingKey, true);

      try {
        // Get student and course data
        const [studentData, courseData] = await Promise.all([
          this.getStudentData(studentId),
          this.getCourseData(courseId)
        ]);

        if (!studentData || !courseData) {
          throw new Error('Student or course not found');
        }

        // Calculate current attendance
        const attendanceData = await this.calculateAttendance(studentId, courseId);
        
        if (!attendanceData) {
          throw new Error('Failed to calculate attendance');
        }

        // Check if there's insufficient data for meaningful warnings
        if (attendanceData.insufficientData) {
          console.log(`⚠️ Insufficient attendance data for ${studentData.name} in ${courseData.name} - ${attendanceData.totalSessions} sessions only`);
          return { 
            success: true, 
            message: 'Insufficient attendance data for warnings',
            attendanceData,
            warningLevel: null,
            insufficientData: true
          };
        }

        // Get course-specific rules
        const rules = await AttendanceRules.getCourseRules(courseId);

        // Check if instant first warning should be sent
        let shouldSendWarning = false;
        let warningLevel = null;

        if (eventType === 'first_absence' && rules.enableInstantFirstWarning) {
          shouldSendWarning = await AttendanceRules.shouldSendInstantFirstWarning(courseId, studentId, attendanceData);
          warningLevel = 'FIRST_WARNING';
        } else {
          // Determine warning level based on current attendance
          warningLevel = await AttendanceRules.determineWarningLevel(courseId, attendanceData);
          shouldSendWarning = !!warningLevel;
        }

        if (!shouldSendWarning) {
          console.log(`✅ No warning needed for ${studentData.name} in ${courseData.name}`);
          return { 
            success: true, 
            message: 'No warning needed',
            attendanceData,
            warningLevel: null
          };
        }

        // Check cooldown period
        const recentlySent = await WarningHistory.wasWarningSentRecently(
          studentId, 
          courseId, 
          warningLevel, 
          rules.cooldownPeriod
        );

        if (recentlySent) {
          console.log(`⏰ ${warningLevel} already sent recently - respecting cooldown`);
          return { 
            success: true, 
            message: 'Warning in cooldown period',
            attendanceData,
            warningLevel,
            cooldown: true
          };
        }

        // Send warning immediately
        const warningResult = await this.sendInstantWarning(
          studentData,
          courseData,
          attendanceData,
          warningLevel,
          rules
        );

        return warningResult;

      } finally {
        // Clean up processing queue
        setTimeout(() => {
          this.processingQueue.delete(processingKey);
        }, 5000); // Keep in queue for 5 seconds to prevent duplicates
      }

    } catch (error) {
      console.error('❌ Error processing attendance event:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send warning instantly without delays
   */
  async sendInstantWarning(studentData, courseData, attendanceData, warningLevel, rules) {
    try {
      console.log(`⚡ Sending instant ${warningLevel} to ${studentData.email}`);

      // Get email template
      const template = await EmailTemplates.getTemplate(courseData.id, warningLevel);

      // Calculate remaining absences
      const threshold = rules[`${warningLevel.toLowerCase()}_threshold`] || 0;
      const remainingAbsences = Math.max(0, Math.floor((threshold / 100 * attendanceData.totalSessions) - attendanceData.missedSessions));

      // Prepare template data
      const templateData = {
        studentName: studentData.name,
        studentEmail: studentData.email,
        courseName: courseData.name,
        professorName: courseData.professorName || 'Professor',
        threshold: threshold,
        attendanceRate: attendanceData.attendanceRate.toFixed(1),
        absenceRate: attendanceData.absenceRate.toFixed(1),
        attendedSessions: attendanceData.attendedSessions,
        missedSessions: attendanceData.missedSessions,
        totalSessions: attendanceData.totalSessions,
        remainingAbsences: remainingAbsences,
        timestamp: new Date().toLocaleString(),
        warningLevel: warningLevel
      };

      // Replace template variables
      const { subject, html } = EmailTemplates.replaceVariables(template, templateData);

      // Send email immediately
      const emailResult = await this.sendEmailInstantly({
        to: studentData.email,
        subject: subject,
        html: html,
        priority: warningLevel === 'FINAL_EXAM_DENIED' ? 'high' : 'normal'
      });

      // Record warning in history
      const warningRecord = {
        studentId: studentData.id,
        studentName: studentData.name,
        studentEmail: studentData.email,
        courseId: courseData.id,
        courseName: courseData.name,
        warningLevel: warningLevel,
        attendanceRate: attendanceData.attendanceRate,
        absenceRate: attendanceData.absenceRate,
        missedSessions: attendanceData.missedSessions,
        totalSessions: attendanceData.totalSessions,
        emailMessageId: emailResult.messageId,
        threshold: threshold,
        remainingAbsences: remainingAbsences,
        triggeredBy: 'realtime_event',
        sessionId: attendanceData.lastSessionId
      };

      const historyResult = await WarningHistory.recordWarning(warningRecord);

      // Create in-app notification
      if (rules.inAppNotifications) {
        await this.createInAppNotification(studentData.id, templateData, warningLevel, courseData.id);
      }

      console.log(`✅ Instant ${warningLevel} sent to ${studentData.email} - ID: ${emailResult.messageId}`);

      return {
        success: true,
        warningLevel: warningLevel,
        emailSent: true,
        messageId: emailResult.messageId,
        warningId: historyResult.warningId,
        attendanceData,
        templateData
      };

    } catch (error) {
      console.error('❌ Error sending instant warning:', error);
      
      // Record failed warning
      await WarningHistory.recordWarning({
        studentId: studentData.id,
        studentName: studentData.name,
        studentEmail: studentData.email,
        courseId: courseData.id,
        courseName: courseData.name,
        warningLevel: warningLevel,
        attendanceRate: attendanceData.attendanceRate,
        absenceRate: attendanceData.absenceRate,
        missedSessions: attendanceData.missedSessions,
        totalSessions: attendanceData.totalSessions,
        status: 'failed',
        failureReason: error.message,
        triggeredBy: 'realtime_event'
      });

      return { success: false, error: error.message };
    }
  }

  /**
   * Send email instantly with optimized settings
   */
  async sendEmailInstantly(emailOptions) {
    try {
      if (!this.emailTransporter) {
        console.error('❌ Email transporter not initialized');
        throw new Error('Email transporter not initialized');
      }

      const mailOptions = {
        from: `"Attendance System" <${process.env.BREVO_USER || process.env.EMAIL_USER || 'noreply@attendance.com'}>`,
        ...emailOptions,
        headers: {
          'X-Priority': emailOptions.priority === 'high' ? '1' : '3',
          'X-Mailer': 'Attendance System v2.0 - Real-time'
        }
      };

      console.log(`📧 Sending email to ${mailOptions.to}...`);
      const result = await this.emailTransporter.sendMail(mailOptions);
      
      console.log(`✅ Email sent successfully: ${result.messageId}`);
      return result;

    } catch (error) {
      console.error('❌ Error sending email instantly:', error.message);
      throw error;
    }
  }

  /**
   * Create in-app notification
   */
  async createInAppNotification(studentId, templateData, warningLevel, courseId) {
    try {
      const notificationData = {
        userId: studentId,
        type: 'attendance_warning',
        warningLevel: warningLevel,
        title: `${warningLevel.replace('_', ' ')} - ${templateData.courseName}`,
        message: `Your absence rate is ${templateData.absenceRate}% in ${templateData.courseName}. You have missed ${templateData.missedSessions} of ${templateData.totalSessions} sessions.`,
        courseId: courseId,
        courseName: templateData.courseName,
        attendanceRate: parseFloat(templateData.attendanceRate),
        absenceRate: parseFloat(templateData.absenceRate),
        missedSessions: templateData.missedSessions,
        totalSessions: templateData.totalSessions,
        read: false,
        createdAt: new Date(),
        priority: warningLevel === 'FINAL_EXAM_DENIED' ? 'critical' : 
                 warningLevel === 'SECOND_WARNING' ? 'high' : 'medium',
        isRealtime: true
      };

      await addDoc(collection(db, 'notifications'), notificationData);
      console.log(`📱 In-app notification created for student ${studentId}`);

    } catch (error) {
      console.error('❌ Error creating in-app notification:', error);
      // Don't throw - email is more important
    }
  }

  /**
   * Get student data
   */
  async getStudentData(studentId) {
    try {
      const studentDoc = await getDoc(doc(db, 'users', studentId));
      return studentDoc.exists() ? { id: studentDoc.id, ...studentDoc.data() } : null;
    } catch (error) {
      console.error('Error getting student data:', error);
      return null;
    }
  }

  /**
   * Get course data
   */
  async getCourseData(courseId) {
    try {
      const courseDoc = await getDoc(doc(db, 'courses', courseId));
      return courseDoc.exists() ? { id: courseDoc.id, ...courseDoc.data() } : null;
    } catch (error) {
      console.error('Error getting course data:', error);
      return null;
    }
  }

  /**
   * Calculate attendance (reuse existing logic)
   */
  async calculateAttendance(studentId, courseId) {
    try {
      // Get enrollment date
      const enrollmentQuery = query(
        collection(db, "enrollments"),
        where("studentId", "==", studentId),
        where("courseId", "==", courseId)
      );
      const enrollmentSnapshot = await getDocs(enrollmentQuery);

      let enrollmentDate = null;
      if (!enrollmentSnapshot.empty) {
        const enrollmentData = enrollmentSnapshot.docs[0].data();
        enrollmentDate = enrollmentData.enrolledAt?.toDate?.() || enrollmentData.enrolledAt;
      }

      // Get all sessions for this course
      const sessionsQuery = query(
        collection(db, "sessions"),
        where("courseId", "==", courseId)
      );
      const sessionsSnapshot = await getDocs(sessionsQuery);

      let totalSessions = 0;
      let sessionsAfterEnrollment = [];
      let lastSessionId = null;

      sessionsSnapshot.forEach((sessionDoc) => {
        const sessionData = sessionDoc.data();
        const sessionDate = sessionData.createdAt?.toDate?.() || sessionData.createdAt;

        if (!enrollmentDate || !sessionDate || sessionDate >= enrollmentDate) {
          totalSessions++;
          sessionsAfterEnrollment.push(sessionData.sessionId);
          lastSessionId = sessionData.sessionId;
        }
      });

      // Get attendance records
      const attendanceQuery = query(
        collection(db, "attendance"),
        where("studentId", "==", studentId),
        where("courseId", "==", courseId)
      );
      const attendanceSnapshot = await getDocs(attendanceQuery);

      let attendedSessions = 0;
      attendanceSnapshot.forEach((attendanceDoc) => {
        const attendanceData = attendanceDoc.data();
        if (sessionsAfterEnrollment.includes(attendanceData.sessionId)) {
          attendedSessions++;
        }
      });

      // Fix: Only calculate meaningful attendance when there are enough sessions
      if (totalSessions < 3) {
        console.log(`⚠️ Too few sessions (${totalSessions}) to calculate meaningful attendance - skipping warnings`);
        return {
          attendanceRate: 100,
          absenceRate: 0,
          attendedSessions,
          totalSessions,
          missedSessions,
          enrollmentDate,
          lastSessionId,
          insufficientData: true
        };
      }

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
        lastSessionId
      };
    } catch (error) {
      console.error('Error calculating attendance:', error);
      return null;
    }
  }

  /**
   * Process batch of events (for bulk operations)
   */
  async processBatchEvents(events) {
    const results = [];
    
    for (const event of events) {
      const result = await this.processAttendanceEvent(
        event.studentId,
        event.courseId,
        event.sessionId,
        event.eventType
      );
      results.push(result);
    }

    return {
      success: true,
      processed: results.length,
      results: results
    };
  }

  /**
   * Get system status
   */
  getSystemStatus() {
    return {
      emailTransporter: !!this.emailTransporter,
      processingQueueSize: this.processingQueue.size,
      systemReady: !!this.emailTransporter
    };
  }
}

// Singleton instance for real-time processing
export const realtimeWarningService = new RealtimeWarningService();
