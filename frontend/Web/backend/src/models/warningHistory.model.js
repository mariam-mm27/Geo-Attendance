/**
 * Warning History and Tracking System
 * Maintains comprehensive logs of all warnings sent
 */

import { db } from '../config/firebase-client.js';
import { doc, getDoc, getDocs, updateDoc, collection, addDoc, query, where, orderBy, limit } from 'firebase/firestore';

export class WarningHistory {
  /**
   * Record a warning in the history
   */
  static async recordWarning(warningData) {
    try {
      const warningRecord = {
        ...warningData,
        id: null, // Will be set by Firestore
        createdAt: new Date(),
        status: 'sent',
        deliveryAttempts: 1,
        lastDeliveryAttempt: new Date(),
        metadata: {
          userAgent: 'Attendance System v2.0',
          ipAddress: null, // Should be captured from request
          source: 'automated_system'
        }
      };

      const docRef = await addDoc(collection(db, 'warningHistory'), warningRecord);
      
      // Update the record with its ID
      await updateDoc(docRef, { id: docRef.id });

      console.log(`✅ Warning recorded: ${docRef.id} - ${warningData.warningLevel} for ${warningData.studentId}`);
      
      return { 
        success: true, 
        warningId: docRef.id,
        message: 'Warning recorded successfully' 
      };
    } catch (error) {
      console.error('Error recording warning:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update warning status
   */
  static async updateWarningStatus(warningId, status, additionalData = {}) {
    try {
      const warningRef = doc(db, 'warningHistory', warningId);
      const updateData = {
        status,
        updatedAt: new Date(),
        ...additionalData
      };

      if (status === 'failed') {
        updateData.deliveryAttempts = (additionalData.deliveryAttempts || 1) + 1;
        updateData.lastDeliveryAttempt = new Date();
        updateData.failureReason = additionalData.failureReason || 'Unknown error';
      }

      if (status === 'delivered') {
        updateData.deliveredAt = new Date();
      }

      await updateDoc(warningRef, updateData);

      console.log(`✅ Warning status updated: ${warningId} -> ${status}`);
      
      return { success: true, message: 'Warning status updated' };
    } catch (error) {
      console.error('Error updating warning status:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get warning history for a student
   */
  static async getStudentWarningHistory(studentId, courseId = null, limit = 50) {
    try {
      let q = query(
        collection(db, 'warningHistory'),
        where('studentId', '==', studentId),
        orderBy('createdAt', 'desc'),
        limit(limit)
      );

      if (courseId) {
        q = query(
          collection(db, 'warningHistory'),
          where('studentId', '==', studentId),
          where('courseId', '==', courseId),
          orderBy('createdAt', 'desc'),
          limit(limit)
        );
      }

      const snapshot = await getDocs(q);
      const warnings = [];

      snapshot.forEach(doc => {
        warnings.push({
          id: doc.id,
          ...doc.data()
        });
      });

      return { success: true, data: warnings };
    } catch (error) {
      console.error('Error getting student warning history:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get warning history for a course
   */
  static async getCourseWarningHistory(courseId, limit = 100) {
    try {
      const q = query(
        collection(db, 'warningHistory'),
        where('courseId', '==', courseId),
        orderBy('createdAt', 'desc'),
        limit(limit)
      );

      const snapshot = await getDocs(q);
      const warnings = [];

      snapshot.forEach(doc => {
        warnings.push({
          id: doc.id,
          ...doc.data()
        });
      });

      return { success: true, data: warnings };
    } catch (error) {
      console.error('Error getting course warning history:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Check if warning was already sent recently
   */
  static async wasWarningSentRecently(studentId, courseId, warningLevel, hours = 24) {
    try {
      const cutoffTime = new Date();
      cutoffTime.setHours(cutoffTime.getHours() - hours);

      const q = query(
        collection(db, 'warningHistory'),
        where('studentId', '==', studentId),
        where('courseId', '==', courseId),
        where('warningLevel', '==', warningLevel),
        where('createdAt', '>=', cutoffTime),
        where('status', '==', 'sent')
      );

      const snapshot = await getDocs(q);
      
      return !snapshot.empty;
    } catch (error) {
      console.error('Error checking recent warnings:', error);
      return false; // Assume not sent to avoid missing warnings
    }
  }

  /**
   * Get last warning level for student in course
   */
  static async getLastWarningLevel(studentId, courseId) {
    try {
      const q = query(
        collection(db, 'warningHistory'),
        where('studentId', '==', studentId),
        where('courseId', '==', courseId),
        where('status', '==', 'sent'),
        orderBy('createdAt', 'desc'),
        limit(1)
      );

      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        return snapshot.docs[0].data().warningLevel;
      }
      
      return null;
    } catch (error) {
      console.error('Error getting last warning level:', error);
      return null;
    }
  }

  /**
   * Get warning statistics
   */
  static async getWarningStats(filters = {}) {
    try {
      let q = collection(db, 'warningHistory');
      
      // Apply filters
      if (filters.studentId) {
        q = query(q, where('studentId', '==', filters.studentId));
      }
      
      if (filters.courseId) {
        q = query(q, where('courseId', '==', filters.courseId));
      }
      
      if (filters.warningLevel) {
        q = query(q, where('warningLevel', '==', filters.warningLevel));
      }
      
      if (filters.startDate) {
        q = query(q, where('createdAt', '>=', filters.startDate));
      }
      
      if (filters.endDate) {
        q = query(q, where('createdAt', '<=', filters.endDate));
      }

      const snapshot = await getDocs(q);
      const warnings = [];

      snapshot.forEach(doc => {
        warnings.push(doc.data());
      });

      // Calculate statistics
      const stats = {
        total: warnings.length,
        sent: warnings.filter(w => w.status === 'sent').length,
        failed: warnings.filter(w => w.status === 'failed').length,
        delivered: warnings.filter(w => w.status === 'delivered').length,
        byLevel: {},
        byCourse: {},
        byMonth: {}
      };

      warnings.forEach(warning => {
        // By level
        stats.byLevel[warning.warningLevel] = (stats.byLevel[warning.warningLevel] || 0) + 1;
        
        // By course
        stats.byCourse[warning.courseId] = (stats.byCourse[warning.courseId] || 0) + 1;
        
        // By month
        const month = warning.createdAt.toDate().toISOString().substring(0, 7);
        stats.byMonth[month] = (stats.byMonth[month] || 0) + 1;
      });

      return { success: true, data: stats };
    } catch (error) {
      console.error('Error getting warning stats:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get pending warnings (failed delivery)
   */
  static async getPendingWarnings() {
    try {
      const q = query(
        collection(db, 'warningHistory'),
        where('status', '==', 'failed'),
        where('deliveryAttempts', '<', 3),
        orderBy('lastDeliveryAttempt', 'asc')
      );

      const snapshot = await getDocs(q);
      const warnings = [];

      snapshot.forEach(doc => {
        warnings.push({
          id: doc.id,
          ...doc.data()
        });
      });

      return { success: true, data: warnings };
    } catch (error) {
      console.error('Error getting pending warnings:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Delete old warning history
   */
  static async cleanupOldWarnings(daysToKeep = 365) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const q = query(
        collection(db, 'warningHistory'),
        where('createdAt', '<', cutoffDate)
      );

      const snapshot = await getDocs(q);
      let deletedCount = 0;

      // Note: Firestore doesn't support batch delete queries
      // This would need to be implemented with cloud functions or batch operations
      for (const doc of snapshot.docs) {
        await doc.ref.delete();
        deletedCount++;
      }

      console.log(`🧹 Cleaned up ${deletedCount} old warning records`);
      
      return { success: true, deletedCount };
    } catch (error) {
      console.error('Error cleaning up old warnings:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Export warning history
   */
  static async exportHistory(filters = {}) {
    try {
      const result = await this.getWarningStats(filters);
      
      if (!result.success) {
        return result;
      }

      // Get detailed records for export
      let q = collection(db, 'warningHistory');
      
      // Apply same filters as getWarningStats
      Object.keys(filters).forEach(key => {
        if (filters[key]) {
          q = query(q, where(key, '==', filters[key]));
        }
      });

      const snapshot = await getDocs(q);
      const exportData = [];

      snapshot.forEach(doc => {
        const data = doc.data();
        exportData.push({
          id: doc.id,
          studentId: data.studentId,
          studentName: data.studentName,
          studentEmail: data.studentEmail,
          courseId: data.courseId,
          courseName: data.courseName,
          warningLevel: data.warningLevel,
          attendanceRate: data.attendanceRate,
          absenceRate: data.absenceRate,
          missedSessions: data.missedSessions,
          totalSessions: data.totalSessions,
          emailMessageId: data.emailMessageId,
          status: data.status,
          createdAt: data.createdAt,
          deliveredAt: data.deliveredAt,
          deliveryAttempts: data.deliveryAttempts
        });
      });

      return { 
        success: true, 
        data: exportData,
        stats: result.data,
        exportDate: new Date()
      };
    } catch (error) {
      console.error('Error exporting warning history:', error);
      return { success: false, error: error.message };
    }
  }
}
