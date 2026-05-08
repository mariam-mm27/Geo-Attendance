/**
 * Background Job Processing Service
 * Handles asynchronous warning delivery and retry logic
 */

import { realtimeWarningService } from './realtimeWarning.service.js';
import { WarningHistory } from '../models/warningHistory.model.js';
import { db } from '../config/firebase-client.js';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';

export class BackgroundJobService {
  constructor() {
    this.isProcessing = false;
    this.retryQueue = [];
    this.processingInterval = 30000; // 30 seconds
    this.maxRetries = 3;
    this.startBackgroundProcessor();
  }

  /**
   * Start the background processor
   */
  startBackgroundProcessor() {
    setInterval(() => {
      this.processPendingJobs();
    }, this.processingInterval);

    console.log('🔄 Background job processor started');
  }

  /**
   * Process all pending jobs
   */
  async processPendingJobs() {
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;

    try {
      // Get failed warnings that need retry
      const pendingResult = await WarningHistory.getPendingWarnings();
      
      if (!pendingResult.success || pendingResult.data.length === 0) {
        return;
      }

      console.log(`🔄 Processing ${pendingResult.data.length} pending warning jobs`);

      for (const warning of pendingResult.data) {
        await this.retryFailedWarning(warning);
        
        // Small delay between retries to avoid overwhelming email service
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

    } catch (error) {
      console.error('❌ Error processing background jobs:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Retry a failed warning
   */
  async retryFailedWarning(warning) {
    try {
      console.log(`🔄 Retrying warning ${warning.id} - Attempt ${warning.deliveryAttempts + 1}`);

      // Get student and course data
      const [studentData, courseData] = await Promise.all([
        realtimeWarningService.getStudentData(warning.studentId),
        realtimeWarningService.getCourseData(warning.courseId)
      ]);

      if (!studentData || !courseData) {
        await WarningHistory.updateWarningStatus(warning.id, 'failed', {
          failureReason: 'Student or course data not found',
          deliveryAttempts: warning.deliveryAttempts
        });
        return;
      }

      // Reconstruct attendance data
      const attendanceData = {
        attendanceRate: warning.attendanceRate,
        absenceRate: warning.absenceRate,
        attendedSessions: warning.totalSessions - warning.missedSessions,
        totalSessions: warning.totalSessions,
        missedSessions: warning.missedSessions
      };

      // Get rules and template
      const { AttendanceRules } = await import('../models/attendanceRules.model.js');
      const { EmailTemplates } = await import('../models/emailTemplates.model.js');
      
      const rules = await AttendanceRules.getCourseRules(warning.courseId);
      const template = await EmailTemplates.getTemplate(warning.courseId, warning.warningLevel);

      // Prepare template data
      const templateData = {
        studentName: studentData.name,
        studentEmail: studentData.email,
        courseName: courseData.name,
        professorName: courseData.professorName || 'Professor',
        threshold: rules[`${warning.warningLevel.toLowerCase()}_threshold`] || 0,
        attendanceRate: warning.attendanceRate.toFixed(1),
        absenceRate: warning.absenceRate.toFixed(1),
        attendedSessions: attendanceData.attendedSessions,
        missedSessions: warning.missedSessions,
        totalSessions: warning.totalSessions,
        remainingAbsences: warning.remainingAbsences || 0,
        timestamp: new Date().toLocaleString(),
        warningLevel: warning.warningLevel
      };

      // Replace template variables
      const { subject, html } = EmailTemplates.replaceVariables(template, templateData);

      // Send email
      const emailResult = await realtimeWarningService.sendEmailInstantly({
        to: studentData.email,
        subject: subject,
        html: html,
        priority: warning.warningLevel === 'FINAL_EXAM_DENIED' ? 'high' : 'normal'
      });

      // Update warning status
      await WarningHistory.updateWarningStatus(warning.id, 'sent', {
        emailMessageId: emailResult.messageId,
        deliveryAttempts: warning.deliveryAttempts + 1,
        lastDeliveryAttempt: new Date()
      });

      console.log(`✅ Warning ${warning.id} retried successfully - ${emailResult.messageId}`);

    } catch (error) {
      console.error(`❌ Retry failed for warning ${warning.id}:`, error);

      const newAttempts = warning.deliveryAttempts + 1;
      
      if (newAttempts >= this.maxRetries) {
        // Mark as permanently failed
        await WarningHistory.updateWarningStatus(warning.id, 'permanently_failed', {
          failureReason: `Max retries exceeded: ${error.message}`,
          deliveryAttempts: newAttempts,
          lastDeliveryAttempt: new Date()
        });
        console.log(`💀 Warning ${warning.id} marked as permanently failed`);
      } else {
        // Keep as failed for next retry
        await WarningHistory.updateWarningStatus(warning.id, 'failed', {
          failureReason: error.message,
          deliveryAttempts: newAttempts,
          lastDeliveryAttempt: new Date()
        });
      }
    }
  }

  /**
   * Queue a background job
   */
  async queueJob(jobType, jobData, priority = 'normal') {
    const job = {
      id: this.generateJobId(),
      type: jobType,
      data: jobData,
      priority: priority,
      createdAt: new Date(),
      attempts: 0,
      maxAttempts: 3,
      status: 'queued'
    };

    this.retryQueue.push(job);
    
    // Sort by priority
    this.retryQueue.sort((a, b) => {
      const priorityOrder = { 'high': 0, 'normal': 1, 'low': 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    console.log(`📋 Job queued: ${job.type} - ${job.id}`);
    return job.id;
  }

  /**
   * Process queued jobs
   */
  async processQueuedJobs() {
    const jobsToProcess = this.retryQueue.splice(0, 10); // Process 10 jobs at a time

    for (const job of jobsToProcess) {
      try {
        await this.processJob(job);
      } catch (error) {
        console.error(`❌ Error processing job ${job.id}:`, error);
        
        // Retry logic
        job.attempts++;
        if (job.attempts < job.maxAttempts) {
          this.retryQueue.push(job);
        }
      }
    }
  }

  /**
   * Process individual job
   */
  async processJob(job) {
    console.log(`⚙️ Processing job: ${job.type} - ${job.id}`);

    switch (job.type) {
      case 'send_warning':
        await realtimeWarningService.processAttendanceEvent(
          job.data.studentId,
          job.data.courseId,
          job.data.sessionId,
          job.data.eventType
        );
        break;

      case 'batch_check':
        await this.processBatchCheck(job.data);
        break;

      case 'cleanup_old_warnings':
        await WarningHistory.cleanupOldWarnings(job.data.daysToKeep || 365);
        break;

      default:
        console.warn(`Unknown job type: ${job.type}`);
    }
  }

  /**
   * Process batch attendance check
   */
  async processBatchCheck(data) {
    const { courseId, studentIds } = data;
    
    for (const studentId of studentIds) {
      await realtimeWarningService.processAttendanceEvent(
        studentId,
        courseId,
        null,
        'batch_check'
      );
    }
  }

  /**
   * Generate unique job ID
   */
  generateJobId() {
    return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get queue status
   */
  getQueueStatus() {
    return {
      queueSize: this.retryQueue.length,
      isProcessing: this.isProcessing,
      nextProcessIn: this.processingInterval / 1000
    };
  }

  /**
   * Schedule recurring job
   */
  scheduleRecurringJob(jobType, jobData, intervalMs) {
    setInterval(async () => {
      await this.queueJob(jobType, jobData, 'low');
    }, intervalMs);

    console.log(`⏰ Recurring job scheduled: ${jobType} every ${intervalMs / 1000} seconds`);
  }

  /**
   * Emergency send all pending warnings
   */
  async emergencySendPending() {
    console.log('🚨 Emergency: Sending all pending warnings immediately');
    
    const pendingResult = await WarningHistory.getPendingWarnings();
    
    if (!pendingResult.success) {
      return { success: false, error: pendingResult.error };
    }

    const results = [];
    
    for (const warning of pendingResult.data) {
      const result = await this.retryFailedWarning(warning);
      results.push({ warningId: warning.id, result });
    }

    return {
      success: true,
      processed: results.length,
      results: results
    };
  }
}

// Singleton instance
export const backgroundJobService = new BackgroundJobService();
