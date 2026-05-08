/**
 * Flexible Attendance Rules System
 * Supports course-specific absence rules and warning configurations
 */

import { db } from '../config/firebase-client.js';
import { doc, getDoc, updateDoc, collection, addDoc, getDocs, query, where } from 'firebase/firestore';

export class AttendanceRules {
  /**
   * Get attendance rules for a specific course
   */
  static async getCourseRules(courseId) {
    try {
      const rulesDoc = await getDoc(doc(db, 'attendanceRules', courseId));
      
      if (rulesDoc.exists()) {
        return rulesDoc.data();
      }
      
      // Return default rules if none exist
      return this.getDefaultRules();
    } catch (error) {
      console.error('Error getting course rules:', error);
      return this.getDefaultRules();
    }
  }

  /**
   * Set or update attendance rules for a course
   */
  static async setCourseRules(courseId, rules) {
    try {
      const rulesRef = doc(db, 'attendanceRules', courseId);
      const validatedRules = this.validateRules(rules);
      
      await updateDoc(rulesRef, {
        ...validatedRules,
        courseId,
        updatedAt: new Date(),
        updatedBy: 'admin' // This should come from auth context
      });
      
      return { success: true, message: 'Rules updated successfully' };
    } catch (error) {
      console.error('Error setting course rules:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get default attendance rules
   */
  static getDefaultRules() {
    return {
      // Warning thresholds (percentage-based)
      firstWarningThreshold: 10,    // First warning at 10% absence
      secondWarningThreshold: 20,   // Second warning at 20% absence
      finalExamDenialThreshold: 25, // Final exam denial at 25% absence
      
      // Alternative: Number-based thresholds
      enableNumberBasedRules: false,
      firstWarningAfterAbsences: 2,
      secondWarningAfterAbsences: 4,
      finalExamDenialAfterAbsences: 6,
      
      // Timing and cooldowns
      cooldownPeriod: 24, // hours between same-level warnings
      enableInstantFirstWarning: true, // Send first warning immediately after first absence
      
      // Notification settings
      emailNotifications: true,
      inAppNotifications: true,
      smsNotifications: false,
      
      // Custom messages
      customMessages: {
        firstWarning: {
          subject: '⚡ First Attendance Warning',
          message: 'Your absence rate has exceeded {threshold}%. Please attend upcoming sessions to maintain good standing.'
        },
        secondWarning: {
          subject: '⚠️ Second Attendance Warning',
          message: 'Your absence rate has exceeded {threshold}%. Take immediate action to avoid final exam denial.'
        },
        finalExamDenial: {
          subject: '🚫 Final Exam Denied',
          message: 'Your absence rate has exceeded {threshold}%. You have been denied from taking the final exam.'
        }
      },
      
      // Course-specific settings
      totalSessions: null, // null = auto-calculate from sessions collection
      enrollmentBasedCalculation: true,
      
      // Advanced settings
      enableGracePeriod: false,
      gracePeriodDays: 0,
      excludeExcusedAbsences: true,
      
      // Metadata
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  /**
   * Validate rules before saving
   */
  static validateRules(rules) {
    const defaults = this.getDefaultRules();
    const validated = { ...defaults, ...rules };
    
    // Ensure thresholds are logical
    if (validated.firstWarningThreshold >= validated.secondWarningThreshold) {
      throw new Error('First warning threshold must be less than second warning threshold');
    }
    
    if (validated.secondWarningThreshold >= validated.finalExamDenialThreshold) {
      throw new Error('Second warning threshold must be less than final exam denial threshold');
    }
    
    // Ensure thresholds are within valid ranges
    validated.firstWarningThreshold = Math.max(0, Math.min(100, validated.firstWarningThreshold));
    validated.secondWarningThreshold = Math.max(0, Math.min(100, validated.secondWarningThreshold));
    validated.finalExamDenialThreshold = Math.max(0, Math.min(100, validated.finalExamDenialThreshold));
    
    return validated;
  }

  /**
   * Determine warning level based on attendance data and course rules
   */
  static async determineWarningLevel(courseId, attendanceData) {
    const rules = await this.getCourseRules(courseId);
    const { absenceRate, missedSessions, totalSessions } = attendanceData;
    
    if (rules.enableNumberBasedRules && totalSessions > 0) {
      // Use number-based rules
      if (missedSessions >= rules.finalExamDenialAfterAbsences) {
        return 'FINAL_EXAM_DENIED';
      } else if (missedSessions >= rules.secondWarningAfterAbsences) {
        return 'SECOND_WARNING';
      } else if (missedSessions >= rules.firstWarningAfterAbsences) {
        return 'FIRST_WARNING';
      }
    } else {
      // Use percentage-based rules
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
   * Check if instant first warning should be sent
   */
  static async shouldSendInstantFirstWarning(courseId, studentId, attendanceData) {
    const rules = await this.getCourseRules(courseId);
    
    if (!rules.enableInstantFirstWarning) {
      return false;
    }
    
    // Check if this is the first absence
    if (attendanceData.missedSessions === 1 && attendanceData.totalSessions >= 1) {
      return true;
    }
    
    return false;
  }

  /**
   * Get all courses with their rules
   */
  static async getAllCourseRules() {
    try {
      const rulesSnapshot = await getDocs(collection(db, 'attendanceRules'));
      const rules = {};
      
      rulesSnapshot.forEach(doc => {
        rules[doc.id] = doc.data();
      });
      
      return rules;
    } catch (error) {
      console.error('Error getting all course rules:', error);
      return {};
    }
  }

  /**
   * Delete course rules (revert to defaults)
   */
  static async deleteCourseRules(courseId) {
    try {
      await updateDoc(doc(db, 'attendanceRules', courseId), {
        isActive: false,
        deletedAt: new Date()
      });
      
      return { success: true, message: 'Rules deleted successfully' };
    } catch (error) {
      console.error('Error deleting course rules:', error);
      return { success: false, error: error.message };
    }
  }
}
