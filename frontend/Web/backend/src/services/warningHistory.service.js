/**
 * Warning History Service
 * 
 * Manages warning history records, audit trails, and reporting.
 * Provides comprehensive tracking of all warnings sent.
 */

const admin = require('firebase-admin');
const db = admin.firestore();
const logger = require('../utils/logger');

class WarningHistoryService {
  /**
   * Record a warning in history
   */
  async recordWarning(warningData) {
    try {
      const docRef = await db.collection('warningHistory').add({
        ...warningData,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      logger.info(`Warning recorded with ID: ${docRef.id}`);
      return { id: docRef.id, ...warningData };

    } catch (error) {
      logger.error('Error recording warning:', error);
      throw error;
    }
  }

  /**
   * Update warning status
   */
  async updateWarningStatus(warningId, status, deliveredAt = null) {
    try {
      const updateData = {
        status,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };

      if (deliveredAt) {
        updateData.deliveredAt = deliveredAt;
      }

      await db.collection('warningHistory').doc(warningId).update(updateData);

      logger.info(`Warning ${warningId} status updated to ${status}`);

    } catch (error) {
      logger.error('Error updating warning status:', error);
      throw error;
    }
  }

  /**
   * Increment delivery attempts
   */
  async incrementDeliveryAttempts(warningId) {
    try {
      await db.collection('warningHistory').doc(warningId).update({
        deliveryAttempts: admin.firestore.FieldValue.increment(1),
        lastAttemptAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

    } catch (error) {
      logger.error('Error incrementing delivery attempts:', error);
      throw error;
    }
  }

  /**
   * Get last warning for a student in a course
   */
  async getLastWarning(studentId, courseId) {
    try {
      const snapshot = await db.collection('warningHistory')
        .where('studentId', '==', studentId)
        .where('courseId', '==', courseId)
        .orderBy('createdAt', 'desc')
        .limit(1)
        .get();

      if (snapshot.empty) {
        return null;
      }

      const doc = snapshot.docs[0];
      return {
        id: doc.id,
        ...doc.data()
      };

    } catch (error) {
      logger.error('Error getting last warning:', error);
      throw error;
    }
  }

  /**
   * Get student warning history
   */
  async getStudentWarningHistory(studentId, courseId = null, limit = 50) {
    try {
      let query = db.collection('warningHistory')
        .where('studentId', '==', studentId);

      if (courseId) {
        query = query.where('courseId', '==', courseId);
      }

      const snapshot = await query
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .get();

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

    } catch (error) {
      logger.error('Error getting student warning history:', error);
      throw error;
    }
  }

  /**
   * Get course warning history
   */
  async getCourseWarningHistory(courseId, limit = 100) {
    try {
      const snapshot = await db.collection('warningHistory')
        .where('courseId', '==', courseId)
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .get();

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

    } catch (error) {
      logger.error('Error getting course warning history:', error);
      throw error;
    }
  }

  /**
   * Get warnings by status
   */
  async getWarningsByStatus(status, limit = 100) {
    try {
      const snapshot = await db.collection('warningHistory')
        .where('status', '==', status)
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .get();

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

    } catch (error) {
      logger.error('Error getting warnings by status:', error);
      throw error;
    }
  }

  /**
   * Get pending warnings (failed or not yet delivered)
   */
  async getPendingWarnings(limit = 50) {
    try {
      const snapshot = await db.collection('warningHistory')
        .where('status', 'in', ['SENT', 'FAILED'])
        .where('deliveryAttempts', '<', 3)
        .orderBy('deliveryAttempts', 'asc')
        .orderBy('lastAttemptAt', 'asc')
        .limit(limit)
        .get();

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

    } catch (error) {
      logger.error('Error getting pending warnings:', error);
      throw error;
    }
  }

  /**
   * Get warning statistics
   */
  async getWarningStatistics(filters = {}) {
    try {
      let query = db.collection('warningHistory');

      if (filters.courseId) {
        query = query.where('courseId', '==', filters.courseId);
      }

      if (filters.studentId) {
        query = query.where('studentId', '==', filters.studentId);
      }

      if (filters.warningLevel) {
        query = query.where('warningLevel', '==', filters.warningLevel);
      }

      if (filters.status) {
        query = query.where('status', '==', filters.status);
      }

      const snapshot = await query.get();

      const stats = {
        total: snapshot.size,
        byLevel: {
          FIRST_WARNING: 0,
          SECOND_WARNING: 0,
          DEPRIVATION: 0
        },
        byStatus: {
          SENT: 0,
          DELIVERED: 0,
          FAILED: 0,
          PERMANENTLY_FAILED: 0
        },
        bySource: {
          ATTENDANCE_RECORDED: 0,
          ABSENCE_DETECTED: 0,
          MANUAL_TRIGGER: 0
        },
        averageDeliveryAttempts: 0,
        deliveryRate: 0
      };

      let totalAttempts = 0;

      snapshot.docs.forEach(doc => {
        const data = doc.data();
        stats.byLevel[data.warningLevel]++;
        stats.byStatus[data.status]++;
        stats.bySource[data.source]++;
        totalAttempts += data.deliveryAttempts || 0;
      });

      if (snapshot.size > 0) {
        stats.averageDeliveryAttempts = Math.round(totalAttempts / snapshot.size * 100) / 100;
        stats.deliveryRate = Math.round((stats.byStatus.DELIVERED / snapshot.size) * 100);
      }

      return stats;

    } catch (error) {
      logger.error('Error getting warning statistics:', error);
      throw error;
    }
  }

  /**
   * Check if warning was sent recently (cooldown check)
   */
  async wasWarningSentRecently(studentId, courseId, warningLevel, cooldownMs) {
    try {
      const cutoffTime = new Date(Date.now() - cooldownMs);

      const snapshot = await db.collection('warningHistory')
        .where('studentId', '==', studentId)
        .where('courseId', '==', courseId)
        .where('warningLevel', '==', warningLevel)
        .where('createdAt', '>=', cutoffTime)
        .limit(1)
        .get();

      return !snapshot.empty;

    } catch (error) {
      logger.error('Error checking if warning was sent recently:', error);
      throw error;
    }
  }

  /**
   * Get most recent warning level for a student in a course
   */
  async getLastWarningLevel(studentId, courseId) {
    try {
      const warning = await this.getLastWarning(studentId, courseId);
      return warning ? warning.warningLevel : null;

    } catch (error) {
      logger.error('Error getting last warning level:', error);
      throw error;
    }
  }

  /**
   * Export warning history for reporting
   */
  async exportWarningHistory(filters = {}, format = 'json') {
    try {
      let query = db.collection('warningHistory');

      if (filters.courseId) {
        query = query.where('courseId', '==', filters.courseId);
      }

      if (filters.startDate) {
        query = query.where('createdAt', '>=', filters.startDate);
      }

      if (filters.endDate) {
        query = query.where('createdAt', '<=', filters.endDate);
      }

      const snapshot = await query.orderBy('createdAt', 'desc').get();
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      if (format === 'csv') {
        return this.convertToCSV(data);
      }

      return data;

    } catch (error) {
      logger.error('Error exporting warning history:', error);
      throw error;
    }
  }

  /**
   * Convert data to CSV format
   */
  convertToCSV(data) {
    if (data.length === 0) return '';

    const headers = [
      'ID',
      'Student ID',
      'Course ID',
      'Warning Level',
      'Attendance Rate',
      'Absence Rate',
      'Missed Sessions',
      'Total Sessions',
      'Email Status',
      'Delivery Attempts',
      'Source',
      'Created At'
    ];

    const rows = data.map(record => [
      record.id,
      record.studentId,
      record.courseId,
      record.warningLevel,
      record.attendanceRate,
      record.absenceRate,
      record.missedSessions,
      record.totalSessions,
      record.status,
      record.deliveryAttempts,
      record.source,
      record.createdAt?.toDate?.().toISOString() || ''
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    return csv;
  }

  /**
   * Cleanup old warnings (archive)
   */
  async cleanupOldWarnings(daysOld = 90) {
    try {
      const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);

      const snapshot = await db.collection('warningHistory')
        .where('createdAt', '<', cutoffDate)
        .limit(100)
        .get();

      let deleted = 0;

      for (const doc of snapshot.docs) {
        // Archive to separate collection before deleting
        await db.collection('warningHistoryArchive').doc(doc.id).set(doc.data());
        await doc.ref.delete();
        deleted++;
      }

      logger.info(`Cleaned up ${deleted} old warnings`);
      return { deleted };

    } catch (error) {
      logger.error('Error cleaning up old warnings:', error);
      throw error;
    }
  }

  /**
   * Get warning trend for a course
   */
  async getWarningTrend(courseId, days = 30) {
    try {
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const snapshot = await db.collection('warningHistory')
        .where('courseId', '==', courseId)
        .where('createdAt', '>=', startDate)
        .orderBy('createdAt', 'asc')
        .get();

      const trend = {};

      snapshot.docs.forEach(doc => {
        const data = doc.data();
        const date = data.createdAt?.toDate?.().toISOString().split('T')[0] || 'unknown';

        if (!trend[date]) {
          trend[date] = {
            FIRST_WARNING: 0,
            SECOND_WARNING: 0,
            DEPRIVATION: 0,
            total: 0
          };
        }

        trend[date][data.warningLevel]++;
        trend[date].total++;
      });

      return trend;

    } catch (error) {
      logger.error('Error getting warning trend:', error);
      throw error;
    }
  }
}

// Singleton instance
let instance = null;

function getInstance() {
  if (!instance) {
    instance = new WarningHistoryService();
  }
  return instance;
}

module.exports = {
  getInstance,
  WarningHistoryService
};
