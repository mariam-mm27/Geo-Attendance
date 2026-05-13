/**
 * Attendance Integration Service
 * 
 * Integrates the unified warning system with attendance recording.
 * Automatically triggers warning processing when attendance is recorded.
 */

const unifiedWarningService = require('./unifiedWarning.service');
const logger = require('../utils/logger');

const warningService = unifiedWarningService.getInstance();

/**
 * Hook into attendance recording
 * Call this after attendance is successfully recorded
 */
async function onAttendanceRecorded(attendanceData) {
  try {
    logger.info('Attendance recorded, triggering warning check', {
      studentId: attendanceData.studentId,
      courseId: attendanceData.courseId,
      sessionId: attendanceData.sessionId
    });

    // Process attendance event asynchronously (non-blocking)
    setImmediate(async () => {
      try {
        await warningService.processAttendanceRecorded(attendanceData);
      } catch (error) {
        logger.error('Error processing attendance event:', error);
      }
    });

  } catch (error) {
    logger.error('Error in onAttendanceRecorded:', error);
  }
}

/**
 * Hook into absence detection
 * Call this when a student misses a session
 */
async function onAbsenceDetected(absenceData) {
  try {
    logger.info('Absence detected, triggering warning check', {
      studentId: absenceData.studentId,
      courseId: absenceData.courseId,
      sessionId: absenceData.sessionId
    });

    // Process absence event asynchronously (non-blocking)
    setImmediate(async () => {
      try {
        await warningService.processAbsenceDetected(absenceData);
      } catch (error) {
        logger.error('Error processing absence event:', error);
      }
    });

  } catch (error) {
    logger.error('Error in onAbsenceDetected:', error);
  }
}

module.exports = {
  onAttendanceRecorded,
  onAbsenceDetected
};
