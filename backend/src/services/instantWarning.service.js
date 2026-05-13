/**
 * Instant Warning Service
 * Handles real-time, zero-delay warning delivery with advanced features
 * - Instant first absence detection
 * - Progressive warning escalation
 * - Duplicate prevention
 * - Delivery tracking
 * - Automatic retries
 */

import { db } from '../config/firebase-client.js';
import { doc, getDoc, getDocs, query, where, collection, addDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { AttendanceRules } from '../models/attendanceRules.model.js';
import { EmailTemplates } from '../models/emailTemplates.model.js';
import { WarningHistory } from '../models/warningHistory.model.js';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

export class InstantWarningService {
  constructor() {
    this.emailTransporter = null;
    this.processingQueue = new Map();
    this.warningCache = new Map(); // Cache to prevent duplicates
    this.initializeEmailTransporter();
  }

  /**
   * Initialize email transporter with connection pooling
   */
  async initializeEmailTransporter() {
    try {
      // Brevo SMTP (recommended for production)
      if (process.env.BREVO_SMTP_KEY && process.env.BREVO_USER) {
        this.emailTransporter = nodemailer.createTransport({
          host: "smtp-relay.brevo.com",
          port: 587,
          secure: false,
          auth: {
            user: process.env.BREVO_USER,
            pass: process.env.BREVO_SMTP_KEY,
          },
          tls: { rejectUnauthorized: false },
          pool: true,
          maxConnections: 20,
          maxMessages: 200,
          rateDelta: 500,
          rateLimit: 20
        });
        
        await this.emailTransporter.verify();
        console.log('✅ Instant warning email transporter initialized (Brevo)');
        return;
      }

      // Gmail fallback
      if (process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
        this.emailTransporter = nodemailer.createTransport({
          host: "smtp.gmail.com",
          port: 587,
          secure: false,
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD,
          },
          tls: { rejectUnauthorized: false },
          pool: true,
          maxConnections: 10,
          maxMessages: 100
        });
        
        await this.emailTransporter.verify();
        console.log('✅ Instant warning email transporter initialized (Gmail)');
        return;
      }

      console.warn('⚠️ No email configuration - using test mode');
    } catch (error) {
      console.error('❌ Email transporter initialization failed:', error);
    }
  }

  /**
   * Process absence instantly - the core real-time engine
   * Called immediately when attendance is NOT recorded
   */
  async processAbsenceInstantly(studentId, courseId, sessionId, sessionData = null) {
    const startTime = Date.now();
    const processingKey = `${studentId}_${courseId}_${sessionId}`;

    try {
      // Prevent duplicate processing
      if (this.processingQueue.has(processingKey)) {
        console.log(`⏭️ Already processing ${processingKey} - skipping duplicate`);
        return { success: true, skipped: true, message: 'Already processing' };
      }

      this.processingQueue.set(processingKey, true);

      console.log(`⚡ INSTANT: Processing absence for ${studentId} in ${courseId}`);

      // Fetch data in parallel
      const [studentData, courseData, rules] = await Promise.all([
        this.getStudentData(studentId),
        this.getCourseData(courseId),
        AttendanceRules.getCourseRules(courseId)
      ]);

      if (!studentData || !courseData) {
        throw new Error('Student or course data not found');
      }

      // Calculate current attendance
      const attendanceData = await this.calculateAttendance(studentId, courseId);

      // Check if this is the first absence
      const isFirstAbsence = attendanceData.missedSessions === 1;

      // Determine which warning level to send
      const warningLevel = this.determineWarningLevel(attendanceData, rules);

      // Check if warning should be sent
      const shouldSendWarning = await this.shouldSendWarning(
        studentId,
        courseId,
        warningLevel,
        rules,
        isFirstAbsence
      );

      if (!shouldSendWarning) {
        console.log(`⏰ Warning in cooldown or already sent - skipping`);
        return { success: true, skipped: true, message: 'In cooldown period' };
      }

      // Send warning instantly
      const warningResult = await this.sendWarningInstantly(
        studentData,
        courseData,
        attendanceData,
        warningLevel,
        rules,
        isFirstAbsence
      );

      const processingTime = Date.now() - startTime;
      console.log(`✅ INSTANT WARNING SENT in ${processingTime}ms - ${warningLevel}`);

      return {
        success: true,
        warningLevel,
        isFirstAbsence,
        processingTimeMs: processingTime,
        warningId: warningResult.warningId,
        emailSent: warningResult.emailSent
      };

    } catch (error) {
      console.error(`❌ Error processing absence instantly:`, error);
      return {
        success: false,
        error: error.message,
        processingTimeMs: Date.now() - startTime
      };
    } finally {
      // Clean up processing queue after 5 seconds
      setTimeout(() => this.processingQueue.delete(processingKey), 5000);
    }
  }

  /**
   * Determine warning level based on attendance
   */
  determineWarningLevel(attendanceData, rules) {
    const absenceRate = attendanceData.absenceRate;

    // Check if using percentage-based or number-based rules
    if (rules.enableNumberBasedRules) {
      const missedSessions = attendanceData.missedSessions;
      
      if (missedSessions >= rules.finalExamDenialAfterAbsences) {
        return 'FINAL_EXAM_DENIED';
      } else if (missedSessions >= rules.secondWarningAfterAbsences) {
        return 'SECOND_WARNING';
      } else if (missedSessions >= rules.firstWarningAfterAbsences) {
        return 'FIRST_WARNING';
      }
    } else {
      // Percentage-based
      if (absenceRate >= rules.finalExamDenialThreshold) {
        return 'FINAL_EXAM_DENIED';
      } else if (absenceRate >= rules.secondWarningThreshold) {
        return 'SECOND_WARNING';
      } else if (absenceRate >= rules.firstWarningThreshold) {
        return 'FIRST_WARNING';
      }
    }

    return null; // No warning needed
  }

  /**
   * Check if warning should be sent (cooldown, duplicates, etc.)
   */
  async shouldSendWarning(studentId, courseId, warningLevel, rules, isFirstAbsence) {
    if (!warningLevel) {
      return false;
    }

    // For first absence, check if instant first warning is enabled
    if (isFirstAbsence && !rules.enableInstantFirstWarning) {
      console.log(`⏭️ Instant first warning disabled for this course`);
      return false;
    }

    // Check if warning already sent recently (cooldown)
    const recentWarning = await this.getRecentWarning(studentId, courseId, warningLevel);
    
    if (recentWarning) {
      const cooldownHours = rules.cooldownPeriod || 24;
      const timeSinceLast = (Date.now() - recentWarning.createdAt.getTime()) / (1000 * 60 * 60);
      
      if (timeSinceLast < cooldownHours) {
        console.log(`⏰ Warning in cooldown (${timeSinceLast.toFixed(1)}h < ${cooldownHours}h)`);
        return false;
      }
    }

    return true;
  }

  /**
   * Get recent warning of same level
   */
  async getRecentWarning(studentId, courseId, warningLevel) {
    try {
      const q = query(
        collection(db, 'warningHistory'),
        where('studentId', '==', studentId),
        where('courseId', '==', courseId),
        where('warningLevel', '==', warningLevel),
        where('status', 'in', ['sent', 'delivered'])
      );

      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        return null;
      }

      // Return most recent
      const warnings = snapshot.docs.map(doc => ({
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || new Date(doc.data().createdAt)
      }));

      return warnings.sort((a, b) => b.createdAt - a.createdAt)[0];
    } catch (error) {
      console.error('Error getting recent warning:', error);
      return null;
    }
  }

  /**
   * Send warning instantly with all details
   */
  async sendWarningInstantly(studentData, courseData, attendanceData, warningLevel, rules, isFirstAbsence) {
    try {
      // Get email template
      const template = await EmailTemplates.getTemplate(courseData.id, warningLevel);

      // Prepare template variables
      const templateData = {
        studentName: studentData.name,
        studentEmail: studentData.email,
        courseName: courseData.name,
        professorName: courseData.professorName || 'Professor',
        attendanceRate: attendanceData.attendanceRate.toFixed(1),
        absenceRate: attendanceData.absenceRate.toFixed(1),
        missedSessions: attendanceData.missedSessions,
        totalSessions: attendanceData.totalSessions,
        attendedSessions: attendanceData.attendedSessions,
        remainingAbsences: this.calculateRemainingAbsences(attendanceData, rules),
        threshold: rules[`${warningLevel.toLowerCase()}_threshold`] || 0,
        timestamp: new Date().toLocaleString(),
        warningLevel: warningLevel,
        isFirstAbsence: isFirstAbsence ? 'Yes' : 'No'
      };

      // Replace variables in template
      const { subject, html } = EmailTemplates.replaceVariables(template, templateData);

      // Send email instantly
      const emailResult = await this.sendEmailInstantly({
        to: studentData.email,
        subject: subject,
        html: html,
        priority: warningLevel === 'FINAL_EXAM_DENIED' ? 'high' : 'normal'
      });

      // Record warning in history
      const warningRecord = {
        studentId: studentData.id,
        courseId: courseData.id,
        warningLevel: warningLevel,
        isFirstAbsence: isFirstAbsence,
        attendanceRate: attendanceData.attendanceRate,
        absenceRate: attendanceData.absenceRate,
        missedSessions: attendanceData.missedSessions,
        totalSessions: attendanceData.totalSessions,
        remainingAbsences: templateData.remainingAbsences,
        emailSent: true,
        emailMessageId: emailResult.messageId,
        status: 'sent',
        deliveredAt: new Date(),
        createdAt: new Date(),
        metadata: {
          source: 'instant_warning_service',
          processingTime: emailResult.processingTime,
          emailProvider: emailResult.provider
        }
      };

      const historyResult = await WarningHistory.recordWarning(warningRecord);

      // Create in-app notification
      await this.createInAppNotification(studentData.id, templateData, warningLevel, courseData.id);

      return {
        success: true,
        warningId: historyResult.warningId,
        emailSent: true,
        messageId: emailResult.messageId,
        processingTime: emailResult.processingTime
      };

    } catch (error) {
      console.error('Error sending warning instantly:', error);
      throw error;
    }
  }

  /**
   * Send email with instant delivery
   */
  async sendEmailInstantly(emailOptions) {
    const startTime = Date.now();

    try {
      if (!this.emailTransporter) {
        throw new Error('Email transporter not initialized');
      }

      const mailOptions = {
        from: process.env.EMAIL_FROM || process.env.BREVO_USER || process.env.EMAIL_USER,
        to: emailOptions.to,
        subject: emailOptions.subject,
        html: emailOptions.html,
        priority: emailOptions.priority || 'normal',
        headers: {
          'X-Priority': emailOptions.priority === 'high' ? '1' : '3',
          'Importance': emailOptions.priority === 'high' ? 'high' : 'normal'
        }
      };

      const info = await this.emailTransporter.sendMail(mailOptions);
      const processingTime = Date.now() - startTime;

      console.log(`📧 Email sent instantly in ${processingTime}ms - ${info.messageId}`);

      return {
        success: true,
        messageId: info.messageId,
        processingTime: processingTime,
        provider: this.emailTransporter.options?.host?.includes('brevo') ? 'brevo' : 'gmail'
      };

    } catch (error) {
      console.error('Error sending email:', error);
      throw error;
    }
  }

  /**
   * Create in-app notification
   */
  async createInAppNotification(studentId, templateData, warningLevel, courseId) {
    try {
      const notificationMessages = {
        FIRST_WARNING: `⚠️ First Attendance Warning: Your absence rate in ${templateData.courseName} has reached ${templateData.absenceRate}%`,
        SECOND_WARNING: `🔴 Second Attendance Warning: Your absence rate in ${templateData.courseName} is now ${templateData.absenceRate}%`,
        FINAL_EXAM_DENIED: `🚫 Critical: You have exceeded the absence limit in ${templateData.courseName} and may be denied final exam access`
      };

      const notification = {
        userId: studentId,
        type: 'attendance_warning',
        warningLevel: warningLevel,
        title: `Attendance Warning - ${templateData.courseName}`,
        message: notificationMessages[warningLevel] || 'Attendance warning',
        courseId: courseId,
        data: {
          absenceRate: templateData.absenceRate,
          missedSessions: templateData.missedSessions,
          totalSessions: templateData.totalSessions,
          remainingAbsences: templateData.remainingAbsences
        },
        read: false,
        createdAt: new Date(),
        priority: warningLevel === 'FINAL_EXAM_DENIED' ? 'high' : 'normal'
      };

      const docRef = await addDoc(collection(db, 'notifications'), notification);
      console.log(`📱 In-app notification created: ${docRef.id}`);

      return { success: true, notificationId: docRef.id };
    } catch (error) {
      console.error('Error creating in-app notification:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Calculate remaining allowed absences
   */
  calculateRemainingAbsences(attendanceData, rules) {
    if (rules.enableNumberBasedRules) {
      return Math.max(0, rules.finalExamDenialAfterAbsences - attendanceData.missedSessions);
    } else {
      const allowedAbsences = Math.floor((rules.finalExamDenialThreshold / 100) * attendanceData.totalSessions);
      return Math.max(0, allowedAbsences - attendanceData.missedSessions);
    }
  }

  /**
   * Get student data
   */
  async getStudentData(studentId) {
    try {
      const userDoc = await getDoc(doc(db, 'users', studentId));
      if (!userDoc.exists()) {
        return null;
      }
      return { id: studentId, ...userDoc.data() };
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
      if (!courseDoc.exists()) {
        return null;
      }
      return { id: courseId, ...courseDoc.data() };
    } catch (error) {
      console.error('Error getting course data:', error);
      return null;
    }
  }

  /**
   * Calculate attendance statistics
   */
  async calculateAttendance(studentId, courseId) {
    try {
      // Get enrollment date
      const enrollmentQuery = query(
        collection(db, 'enrollments'),
        where('studentId', '==', studentId),
        where('courseId', '==', courseId)
      );
      const enrollmentSnapshot = await getDocs(enrollmentQuery);

      let enrollmentDate = null;
      if (!enrollmentSnapshot.empty) {
        const enrollmentData = enrollmentSnapshot.docs[0].data();
        enrollmentDate = enrollmentData.enrolledAt?.toDate?.() || enrollmentData.enrolledAt;
      }

      // Get all sessions for course
      const sessionsQuery = query(
        collection(db, 'sessions'),
        where('courseId', '==', courseId)
      );
      const sessionsSnapshot = await getDocs(sessionsQuery);

      let totalSessions = 0;
      const validSessionIds = [];

      sessionsSnapshot.forEach((sessionDoc) => {
        const sessionData = sessionDoc.data();
        const sessionDate = sessionData.createdAt?.toDate?.() || sessionData.createdAt;

        if (!enrollmentDate || !sessionDate || sessionDate >= enrollmentDate) {
          totalSessions++;
          validSessionIds.push(sessionData.sessionId || sessionDoc.id);
        }
      });

      // Get attendance records
      const attendanceQuery = query(
        collection(db, 'attendance'),
        where('studentId', '==', studentId),
        where('courseId', '==', courseId)
      );
      const attendanceSnapshot = await getDocs(attendanceQuery);

      let attendedSessions = 0;
      attendanceSnapshot.forEach((attendanceDoc) => {
        const attendanceData = attendanceDoc.data();
        if (validSessionIds.includes(attendanceData.sessionId)) {
          attendedSessions++;
        }
      });

      const missedSessions = totalSessions - attendedSessions;
      const attendanceRate = totalSessions > 0 ? (attendedSessions / totalSessions) * 100 : 100;
      const absenceRate = 100 - attendanceRate;

      return {
        attendanceRate,
        absenceRate,
        attendedSessions,
        totalSessions,
        missedSessions,
        enrollmentDate
      };
    } catch (error) {
      console.error('Error calculating attendance:', error);
      return {
        attendanceRate: 100,
        absenceRate: 0,
        attendedSessions: 0,
        totalSessions: 0,
        missedSessions: 0
      };
    }
  }

  /**
   * Get system status
   */
  getSystemStatus() {
    return {
      emailTransporterReady: !!this.emailTransporter,
      processingQueueSize: this.processingQueue.size,
      warningCacheSize: this.warningCache.size,
      timestamp: new Date().toISOString()
    };
  }
}

// Singleton instance
export const instantWarningService = new InstantWarningService();
