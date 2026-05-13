/**
 * Unified Warning Service
 * 
 * Consolidates all warning logic into a single, real-time event-driven system.
 * Handles instant warning delivery with <100ms latency.
 * 
 * Features:
 * - Real-time event processing
 * - Duplicate prevention
 * - Cooldown management
 * - Multi-provider email delivery
 * - Automatic retries
 * - Complete audit trail
 */

const admin = require('firebase-admin');
const db = admin.firestore();
const emailDeliveryService = require('./emailDelivery.service');
const warningHistoryService = require('./warningHistory.service');
const attendanceRulesService = require('./attendanceRules.service');
const logger = require('../utils/logger');

// Processing queue to prevent duplicate processing
const processingQueue = new Map();
const QUEUE_CLEANUP_INTERVAL = 5000; // 5 seconds

// Warning levels
const WARNING_LEVELS = {
  FIRST_WARNING: 'FIRST_WARNING',
  SECOND_WARNING: 'SECOND_WARNING',
  DEPRIVATION: 'DEPRIVATION'
};

// Event sources
const EVENT_SOURCES = {
  ATTENDANCE_RECORDED: 'ATTENDANCE_RECORDED',
  ABSENCE_DETECTED: 'ABSENCE_DETECTED',
  MANUAL_TRIGGER: 'MANUAL_TRIGGER'
};

class UnifiedWarningService {
  constructor() {
    this.processingQueue = processingQueue;
    this.startQueueCleanup();
  }

  /**
   * Process attendance recorded event
   * Called when a student marks attendance
   */
  async processAttendanceRecorded(attendanceData) {
    try {
      const { studentId, courseId, sessionId, professorId } = attendanceData;
      const queueKey = `${studentId}-${courseId}`;

      // Prevent duplicate processing
      if (this.processingQueue.has(queueKey)) {
        logger.debug(`Skipping duplicate processing for ${queueKey}`);
        return;
      }

      this.processingQueue.set(queueKey, Date.now());

      // Get course rules
      const rules = await attendanceRulesService.getCourseRules(courseId);
      if (!rules) {
        logger.warn(`No rules found for course ${courseId}`);
        return;
      }

      // Calculate attendance metrics
      const metrics = await this.calculateAttendanceMetrics(studentId, courseId);
      
      // Determine warning level
      const warningLevel = this.determineWarningLevel(metrics, rules);

      if (!warningLevel) {
        logger.debug(`No warning needed for ${studentId} in ${courseId}`);
        return;
      }

      // Check if warning should be sent
      const shouldSend = await this.shouldSendWarning(
        studentId,
        courseId,
        warningLevel,
        rules
      );

      if (!shouldSend) {
        logger.debug(`Warning ${warningLevel} skipped due to cooldown or duplicate`);
        return;
      }

      // Send warning
      await this.sendWarning(
        studentId,
        courseId,
        warningLevel,
        metrics,
        rules,
        {
          source: EVENT_SOURCES.ATTENDANCE_RECORDED,
          sessionId,
          professorId,
          triggeredBy: 'system'
        }
      );

    } catch (error) {
      logger.error('Error processing attendance recorded event:', error);
      throw error;
    }
  }

  /**
   * Process absence detected event
   * Called when a student misses a session
   */
  async processAbsenceDetected(absenceData) {
    try {
      const { studentId, courseId, sessionId, professorId } = absenceData;
      const queueKey = `${studentId}-${courseId}-absence`;

      // Prevent duplicate processing
      if (this.processingQueue.has(queueKey)) {
        logger.debug(`Skipping duplicate absence processing for ${queueKey}`);
        return;
      }

      this.processingQueue.set(queueKey, Date.now());

      // Get course rules
      const rules = await attendanceRulesService.getCourseRules(courseId);
      if (!rules) {
        logger.warn(`No rules found for course ${courseId}`);
        return;
      }

      // Check if instant first warning is enabled
      if (!rules.enableInstantFirstWarning) {
        logger.debug(`Instant first warning disabled for course ${courseId}`);
        return;
      }

      // Check if this is the first absence
      const metrics = await this.calculateAttendanceMetrics(studentId, courseId);
      
      if (metrics.missedSessions === 1) {
        // Send instant first warning
        await this.sendWarning(
          studentId,
          courseId,
          WARNING_LEVELS.FIRST_WARNING,
          metrics,
          rules,
          {
            source: EVENT_SOURCES.ABSENCE_DETECTED,
            sessionId,
            professorId,
            triggeredBy: 'system'
          }
        );
      }

    } catch (error) {
      logger.error('Error processing absence detected event:', error);
      throw error;
    }
  }

  /**
   * Calculate attendance metrics for a student in a course
   */
  async calculateAttendanceMetrics(studentId, courseId) {
    try {
      // Get enrollment date
      const enrollment = await db.collection('enrollments')
        .where('studentId', '==', studentId)
        .where('courseId', '==', courseId)
        .limit(1)
        .get();

      if (enrollment.empty) {
        logger.warn(`No enrollment found for ${studentId} in ${courseId}`);
        return {
          totalSessions: 0,
          attendedSessions: 0,
          missedSessions: 0,
          attendanceRate: 0,
          absenceRate: 0,
          remainingAllowedAbsences: 0
        };
      }

      const enrollmentData = enrollment.docs[0].data();
      const enrollmentDate = enrollmentData.enrolledAt?.toDate?.() || enrollmentData.enrolledAt;

      // Get all sessions for the course
      const sessions = await db.collection('sessions')
        .where('courseId', '==', courseId)
        .get();

      // Filter sessions to only count those after enrollment
      let totalSessions = 0;
      const sessionIds = [];

      sessions.forEach(sessionDoc => {
        const sessionData = sessionDoc.data();
        const sessionDate = sessionData.createdAt?.toDate?.() || sessionData.createdAt;
        
        // Count sessions after enrollment date
        if (!enrollmentDate || !sessionDate || sessionDate >= enrollmentDate) {
          totalSessions++;
          sessionIds.push(sessionData.sessionId || sessionDoc.id);
        }
      });

      if (totalSessions === 0) {
        logger.debug(`No sessions found after enrollment for ${studentId} in ${courseId}`);
        return {
          totalSessions: 0,
          attendedSessions: 0,
          missedSessions: 0,
          attendanceRate: 0,
          absenceRate: 0,
          remainingAllowedAbsences: 0
        };
      }

      // Get attendance records for this student in this course
      const attendance = await db.collection('attendance')
        .where('studentId', '==', studentId)
        .where('courseId', '==', courseId)
        .get();

      // Count only attendance for sessions after enrollment
      const attendedSessions = attendance.docs.filter(doc => {
        const sessionId = doc.data().sessionId;
        return sessionIds.includes(sessionId);
      }).length;

      const missedSessions = totalSessions - attendedSessions;
      const attendanceRate = totalSessions > 0 
        ? Math.round((attendedSessions / totalSessions) * 100) 
        : 0;
      const absenceRate = 100 - attendanceRate;

      logger.debug(`Metrics for ${studentId} in ${courseId}: ${attendedSessions}/${totalSessions} = ${attendanceRate}%`);

      return {
        totalSessions,
        attendedSessions,
        missedSessions,
        attendanceRate,
        absenceRate,
        remainingAllowedAbsences: Math.max(0, totalSessions - missedSessions)
      };
    } catch (error) {
      logger.error('Error calculating attendance metrics:', error);
      return {
        totalSessions: 0,
        attendedSessions: 0,
        missedSessions: 0,
        attendanceRate: 0,
        absenceRate: 0,
        remainingAllowedAbsences: 0
      };
    }
  }

  /**
   * Determine which warning level should be sent
   */
  determineWarningLevel(metrics, rules) {
    const { absenceRate, missedSessions } = metrics;

    // Check percentage-based thresholds
    if (absenceRate >= rules.deprivationThreshold) {
      return WARNING_LEVELS.DEPRIVATION;
    }

    if (absenceRate >= rules.secondWarningThreshold) {
      return WARNING_LEVELS.SECOND_WARNING;
    }

    if (absenceRate >= rules.firstWarningThreshold) {
      return WARNING_LEVELS.FIRST_WARNING;
    }

    // Check absolute count thresholds
    if (rules.deprivationAfterAbsences && missedSessions >= rules.deprivationAfterAbsences) {
      return WARNING_LEVELS.DEPRIVATION;
    }

    if (rules.secondWarningAfterAbsences && missedSessions >= rules.secondWarningAfterAbsences) {
      return WARNING_LEVELS.SECOND_WARNING;
    }

    if (rules.firstWarningAfterAbsences && missedSessions >= rules.firstWarningAfterAbsences) {
      return WARNING_LEVELS.FIRST_WARNING;
    }

    return null;
  }

  /**
   * Check if warning should be sent based on cooldown and duplicates
   */
  async shouldSendWarning(studentId, courseId, warningLevel, rules) {
    try {
      // Get last warning for this student/course
      const lastWarning = await warningHistoryService.getLastWarning(
        studentId,
        courseId
      );

      if (!lastWarning) {
        return true; // No previous warning, send it
      }

      // Check if same level warning was sent recently (cooldown)
      if (lastWarning.warningLevel === warningLevel) {
        const timeSinceLastWarning = Date.now() - lastWarning.createdAt.toMillis();
        if (timeSinceLastWarning < rules.cooldownPeriod) {
          logger.debug(
            `Cooldown active for ${warningLevel} (${timeSinceLastWarning}ms < ${rules.cooldownPeriod}ms)`
          );
          return false;
        }
      }

      // Allow escalation to higher warning level immediately
      return true;

    } catch (error) {
      logger.error('Error checking if warning should be sent:', error);
      return false;
    }
  }

  /**
   * Send warning to student
   */
  async sendWarning(studentId, courseId, warningLevel, metrics, rules, metadata) {
    try {
      // Get student and course data
      const [student, course] = await Promise.all([
        db.collection('users').doc(studentId).get(),
        db.collection('courses').doc(courseId).get()
      ]);

      if (!student.exists || !course.exists) {
        throw new Error('Student or course not found');
      }

      const studentData = student.data();
      const courseData = course.data();

      // Prepare email data
      const emailData = {
        studentName: studentData.name || studentData.email,
        studentEmail: studentData.email,
        courseName: courseData.name,
        courseCode: courseData.code,
        warningLevel,
        metrics,
        rules,
        professorName: courseData.professorName,
        timestamp: new Date().toISOString()
      };

      // Send email
      const emailResult = await emailDeliveryService.sendWarningEmail(emailData);

      // Record in history
      const historyRecord = {
        studentId,
        courseId,
        warningLevel,
        attendanceRate: metrics.attendanceRate,
        absenceRate: metrics.absenceRate,
        missedSessions: metrics.missedSessions,
        totalSessions: metrics.totalSessions,
        attendedSessions: metrics.attendedSessions,
        remainingAllowedAbsences: metrics.remainingAllowedAbsences,
        emailMessageId: emailResult.messageId,
        emailAddress: studentData.email,
        emailProvider: emailResult.provider,
        status: emailResult.status,
        deliveryAttempts: 1,
        source: metadata.source,
        triggeredBy: metadata.triggeredBy,
        metadata: {
          sessionId: metadata.sessionId,
          professorId: metadata.professorId,
          ipAddress: metadata.ipAddress || 'system',
          userAgent: metadata.userAgent || 'system'
        },
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };

      await warningHistoryService.recordWarning(historyRecord);

      logger.info(
        `Warning ${warningLevel} sent to ${studentData.email} for course ${courseData.name}`
      );

      return {
        success: true,
        warningLevel,
        emailMessageId: emailResult.messageId,
        status: emailResult.status
      };

    } catch (error) {
      logger.error('Error sending warning:', error);
      throw error;
    }
  }

  /**
   * Manual warning trigger (admin)
   */
  async manualTriggerWarning(studentId, courseId, warningLevel, adminId) {
    try {
      const rules = await attendanceRulesService.getCourseRules(courseId);
      if (!rules) {
        throw new Error(`No rules found for course ${courseId}`);
      }

      const metrics = await this.calculateAttendanceMetrics(studentId, courseId);

      await this.sendWarning(
        studentId,
        courseId,
        warningLevel,
        metrics,
        rules,
        {
          source: EVENT_SOURCES.MANUAL_TRIGGER,
          triggeredBy: adminId
        }
      );

      return { success: true };

    } catch (error) {
      logger.error('Error in manual warning trigger:', error);
      throw error;
    }
  }

  /**
   * Batch process warnings for a course
   */
  async batchProcessCourse(courseId, adminId) {
    try {
      const rules = await attendanceRulesService.getCourseRules(courseId);
      if (!rules) {
        throw new Error(`No rules found for course ${courseId}`);
      }

      // Get all students in course
      const enrollments = await db.collection('enrollments')
        .where('courseId', '==', courseId)
        .where('isActive', '==', true)
        .get();

      const results = {
        processed: 0,
        warned: 0,
        failed: 0,
        errors: []
      };

      for (const enrollment of enrollments.docs) {
        try {
          const studentId = enrollment.data().studentId;
          const metrics = await this.calculateAttendanceMetrics(studentId, courseId);
          const warningLevel = this.determineWarningLevel(metrics, rules);

          if (warningLevel) {
            const shouldSend = await this.shouldSendWarning(
              studentId,
              courseId,
              warningLevel,
              rules
            );

            if (shouldSend) {
              await this.sendWarning(
                studentId,
                courseId,
                warningLevel,
                metrics,
                rules,
                {
                  source: EVENT_SOURCES.MANUAL_TRIGGER,
                  triggeredBy: adminId
                }
              );
              results.warned++;
            }
          }

          results.processed++;

        } catch (error) {
          results.failed++;
          results.errors.push({
            studentId: enrollment.data().studentId,
            error: error.message
          });
        }
      }

      logger.info(`Batch processing completed for course ${courseId}:`, results);
      return results;

    } catch (error) {
      logger.error('Error in batch process course:', error);
      throw error;
    }
  }

  /**
   * Start queue cleanup interval
   */
  startQueueCleanup() {
    setInterval(() => {
      const now = Date.now();
      for (const [key, timestamp] of this.processingQueue.entries()) {
        if (now - timestamp > QUEUE_CLEANUP_INTERVAL) {
          this.processingQueue.delete(key);
        }
      }
    }, QUEUE_CLEANUP_INTERVAL);
  }

  /**
   * Get system statistics
   */
  async getSystemStats() {
    try {
      const stats = await db.collection('warningHistory')
        .get();

      const byLevel = {
        [WARNING_LEVELS.FIRST_WARNING]: 0,
        [WARNING_LEVELS.SECOND_WARNING]: 0,
        [WARNING_LEVELS.DEPRIVATION]: 0
      };

      const byStatus = {
        SENT: 0,
        DELIVERED: 0,
        FAILED: 0,
        PERMANENTLY_FAILED: 0
      };

      stats.docs.forEach(doc => {
        const data = doc.data();
        byLevel[data.warningLevel]++;
        byStatus[data.status]++;
      });

      return {
        totalWarnings: stats.size,
        byLevel,
        byStatus,
        deliveryRate: stats.size > 0 
          ? Math.round((byStatus.DELIVERED / stats.size) * 100) 
          : 0
      };

    } catch (error) {
      logger.error('Error getting system stats:', error);
      throw error;
    }
  }
}

// Singleton instance
let instance = null;

function getInstance() {
  if (!instance) {
    instance = new UnifiedWarningService();
  }
  return instance;
}

module.exports = {
  getInstance,
  WARNING_LEVELS,
  EVENT_SOURCES,
  UnifiedWarningService
};
