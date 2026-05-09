/**
 * Attendance Rules Service
 * 
 * Manages customizable attendance rules per course.
 * Allows admins to configure thresholds, cooldowns, and warning messages.
 */

const admin = require('firebase-admin');
const db = admin.firestore();
const logger = require('../utils/logger');

// Default rules
const DEFAULT_RULES = {
  firstWarningThreshold: 10,
  secondWarningThreshold: 20,
  deprivationThreshold: 25,
  cooldownPeriod: 86400000, // 24 hours in milliseconds
  enableInstantFirstWarning: true,
  excludeExcusedAbsences: true,
  emailNotifications: true,
  inAppNotifications: true,
  smsNotifications: false
};

class AttendanceRulesService {
  /**
   * Get rules for a specific course
   */
  async getCourseRules(courseId) {
    try {
      const doc = await db.collection('attendanceRules').doc(courseId).get();

      if (doc.exists) {
        return {
          id: doc.id,
          ...doc.data()
        };
      }

      // Return default rules if not found
      return {
        courseId,
        ...DEFAULT_RULES,
        customMessages: {
          firstWarning: 'You have reached 10% absence rate. Please improve your attendance immediately.',
          secondWarning: 'You have reached 20% absence rate. Your course enrollment is at risk.',
          deprivation: 'You have exceeded the allowed absence limit (25%). You are denied from taking the final exam.'
        }
      };

    } catch (error) {
      logger.error('Error getting course rules:', error);
      throw error;
    }
  }

  /**
   * Set rules for a course
   */
  async setCourseRules(courseId, rulesData, adminId) {
    try {
      // Validate rules
      this.validateRules(rulesData);

      const rules = {
        courseId,
        ...DEFAULT_RULES,
        ...rulesData,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedBy: adminId
      };

      await db.collection('attendanceRules').doc(courseId).set(rules, { merge: true });

      logger.info(`Rules updated for course ${courseId} by admin ${adminId}`);

      return {
        id: courseId,
        ...rules
      };

    } catch (error) {
      logger.error('Error setting course rules:', error);
      throw error;
    }
  }

  /**
   * Validate rules
   */
  validateRules(rules) {
    const errors = [];

    if (rules.firstWarningThreshold !== undefined) {
      if (typeof rules.firstWarningThreshold !== 'number' || rules.firstWarningThreshold < 0 || rules.firstWarningThreshold > 100) {
        errors.push('firstWarningThreshold must be a number between 0 and 100');
      }
    }

    if (rules.secondWarningThreshold !== undefined) {
      if (typeof rules.secondWarningThreshold !== 'number' || rules.secondWarningThreshold < 0 || rules.secondWarningThreshold > 100) {
        errors.push('secondWarningThreshold must be a number between 0 and 100');
      }
    }

    if (rules.deprivationThreshold !== undefined) {
      if (typeof rules.deprivationThreshold !== 'number' || rules.deprivationThreshold < 0 || rules.deprivationThreshold > 100) {
        errors.push('deprivationThreshold must be a number between 0 and 100');
      }
    }

    // Check threshold ordering
    if (rules.firstWarningThreshold !== undefined && rules.secondWarningThreshold !== undefined) {
      if (rules.firstWarningThreshold >= rules.secondWarningThreshold) {
        errors.push('firstWarningThreshold must be less than secondWarningThreshold');
      }
    }

    if (rules.secondWarningThreshold !== undefined && rules.deprivationThreshold !== undefined) {
      if (rules.secondWarningThreshold >= rules.deprivationThreshold) {
        errors.push('secondWarningThreshold must be less than deprivationThreshold');
      }
    }

    if (rules.cooldownPeriod !== undefined) {
      if (typeof rules.cooldownPeriod !== 'number' || rules.cooldownPeriod < 0) {
        errors.push('cooldownPeriod must be a positive number (in milliseconds)');
      }
    }

    if (errors.length > 0) {
      throw new Error(`Rule validation failed: ${errors.join(', ')}`);
    }
  }

  /**
   * Get all rules
   */
  async getAllRules() {
    try {
      const snapshot = await db.collection('attendanceRules').get();

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

    } catch (error) {
      logger.error('Error getting all rules:', error);
      throw error;
    }
  }

  /**
   * Delete rules for a course (revert to defaults)
   */
  async deleteRules(courseId) {
    try {
      await db.collection('attendanceRules').doc(courseId).delete();

      logger.info(`Rules deleted for course ${courseId}, reverting to defaults`);

      return { success: true };

    } catch (error) {
      logger.error('Error deleting rules:', error);
      throw error;
    }
  }

  /**
   * Update custom messages for a course
   */
  async updateCustomMessages(courseId, messages, adminId) {
    try {
      const rules = await this.getCourseRules(courseId);

      const updatedRules = {
        ...rules,
        customMessages: {
          ...rules.customMessages,
          ...messages
        },
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedBy: adminId
      };

      await db.collection('attendanceRules').doc(courseId).set(updatedRules, { merge: true });

      logger.info(`Custom messages updated for course ${courseId}`);

      return updatedRules;

    } catch (error) {
      logger.error('Error updating custom messages:', error);
      throw error;
    }
  }

  /**
   * Get custom message for a warning level
   */
  async getCustomMessage(courseId, warningLevel) {
    try {
      const rules = await this.getCourseRules(courseId);

      return rules.customMessages?.[warningLevel] || 
        DEFAULT_RULES.customMessages?.[warningLevel] ||
        'Attendance warning';

    } catch (error) {
      logger.error('Error getting custom message:', error);
      throw error;
    }
  }

  /**
   * Determine warning level based on metrics and rules
   */
  determineWarningLevel(metrics, rules) {
    const { absenceRate, missedSessions } = metrics;

    // Check percentage-based thresholds
    if (absenceRate >= rules.deprivationThreshold) {
      return 'DEPRIVATION';
    }

    if (absenceRate >= rules.secondWarningThreshold) {
      return 'SECOND_WARNING';
    }

    if (absenceRate >= rules.firstWarningThreshold) {
      return 'FIRST_WARNING';
    }

    // Check absolute count thresholds
    if (rules.deprivationAfterAbsences && missedSessions >= rules.deprivationAfterAbsences) {
      return 'DEPRIVATION';
    }

    if (rules.secondWarningAfterAbsences && missedSessions >= rules.secondWarningAfterAbsences) {
      return 'SECOND_WARNING';
    }

    if (rules.firstWarningAfterAbsences && missedSessions >= rules.firstWarningAfterAbsences) {
      return 'FIRST_WARNING';
    }

    return null;
  }

  /**
   * Check if instant first warning should be sent
   */
  shouldSendInstantFirstWarning(rules) {
    return rules.enableInstantFirstWarning === true;
  }

  /**
   * Get rules summary for admin dashboard
   */
  async getRulesSummary() {
    try {
      const allRules = await this.getAllRules();

      const summary = {
        totalCourses: allRules.length,
        customRules: allRules.length,
        defaultRules: 0, // Courses using default rules (not in collection)
        averageFirstWarningThreshold: 0,
        averageSecondWarningThreshold: 0,
        averageDeprivationThreshold: 0,
        instantFirstWarningEnabled: 0
      };

      let firstSum = 0, secondSum = 0, deprivationSum = 0;

      allRules.forEach(rule => {
        firstSum += rule.firstWarningThreshold || DEFAULT_RULES.firstWarningThreshold;
        secondSum += rule.secondWarningThreshold || DEFAULT_RULES.secondWarningThreshold;
        deprivationSum += rule.deprivationThreshold || DEFAULT_RULES.deprivationThreshold;

        if (rule.enableInstantFirstWarning !== false) {
          summary.instantFirstWarningEnabled++;
        }
      });

      if (allRules.length > 0) {
        summary.averageFirstWarningThreshold = Math.round(firstSum / allRules.length);
        summary.averageSecondWarningThreshold = Math.round(secondSum / allRules.length);
        summary.averageDeprivationThreshold = Math.round(deprivationSum / allRules.length);
      }

      return summary;

    } catch (error) {
      logger.error('Error getting rules summary:', error);
      throw error;
    }
  }

  /**
   * Bulk update rules for multiple courses
   */
  async bulkUpdateRules(courseIds, rulesData, adminId) {
    try {
      this.validateRules(rulesData);

      const batch = db.batch();
      const timestamp = admin.firestore.FieldValue.serverTimestamp();

      courseIds.forEach(courseId => {
        const docRef = db.collection('attendanceRules').doc(courseId);
        batch.set(docRef, {
          courseId,
          ...DEFAULT_RULES,
          ...rulesData,
          updatedAt: timestamp,
          updatedBy: adminId
        }, { merge: true });
      });

      await batch.commit();

      logger.info(`Rules updated for ${courseIds.length} courses by admin ${adminId}`);

      return {
        success: true,
        coursesUpdated: courseIds.length
      };

    } catch (error) {
      logger.error('Error in bulk update rules:', error);
      throw error;
    }
  }
}

// Singleton instance
let instance = null;

function getInstance() {
  if (!instance) {
    instance = new AttendanceRulesService();
  }
  return instance;
}

module.exports = {
  getInstance,
  DEFAULT_RULES,
  AttendanceRulesService
};
