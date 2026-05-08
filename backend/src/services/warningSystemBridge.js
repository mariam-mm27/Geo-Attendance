/**
 * Warning System Bridge
 * 
 * Bridges the unified warning system with the existing attendance recording.
 * Ensures real-time email delivery when attendance is recorded.
 */

const admin = require('firebase-admin');
const db = admin.firestore();
const logger = require('../utils/logger');

let warningService = null;

/**
 * Initialize the warning service (lazy load)
 */
function getWarningService() {
  if (!warningService) {
    try {
      const { getInstance } = require('./unifiedWarning.service');
      warningService = getInstance();
      logger.info('Warning service initialized');
    } catch (error) {
      logger.error('Failed to initialize warning service:', error);
      return null;
    }
  }
  return warningService;
}

/**
 * Process attendance recorded event
 * Called immediately after attendance is recorded
 */
async function processAttendanceRecorded(attendanceData) {
  try {
    const { studentId, courseId, sessionId, professorId } = attendanceData;

    logger.info('Processing attendance recorded event', {
      studentId,
      courseId,
      sessionId
    });

    const service = getWarningService();
    if (!service) {
      logger.error('Warning service not available');
      return;
    }

    // Process asynchronously to not block attendance recording
    setImmediate(async () => {
      try {
        await service.processAttendanceRecorded({
          studentId,
          courseId,
          sessionId,
          professorId
        });
        logger.info('Attendance event processed successfully');
      } catch (error) {
        logger.error('Error processing attendance event:', error);
      }
    });

  } catch (error) {
    logger.error('Error in processAttendanceRecorded:', error);
  }
}

/**
 * Process absence detected event
 * Called when a student misses a session
 */
async function processAbsenceDetected(absenceData) {
  try {
    const { studentId, courseId, sessionId, professorId } = absenceData;

    logger.info('Processing absence detected event', {
      studentId,
      courseId,
      sessionId
    });

    const service = getWarningService();
    if (!service) {
      logger.error('Warning service not available');
      return;
    }

    // Process asynchronously
    setImmediate(async () => {
      try {
        await service.processAbsenceDetected({
          studentId,
          courseId,
          sessionId,
          professorId
        });
        logger.info('Absence event processed successfully');
      } catch (error) {
        logger.error('Error processing absence event:', error);
      }
    });

  } catch (error) {
    logger.error('Error in processAbsenceDetected:', error);
  }
}

/**
 * Get warning service instance (for direct access if needed)
 */
function getWarningServiceInstance() {
  return getWarningService();
}

module.exports = {
  processAttendanceRecorded,
  processAbsenceDetected,
  getWarningServiceInstance
};
