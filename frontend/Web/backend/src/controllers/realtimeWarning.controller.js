/**
 * Real-time Warning Controller
 * Handles API endpoints for the real-time warning system
 */

import { realtimeWarningService } from '../services/realtimeWarning.service.js';
import { backgroundJobService } from '../services/backgroundJob.service.js';
import { AttendanceRules } from '../models/attendanceRules.model.js';
import { EmailTemplates } from '../models/emailTemplates.model.js';
import { WarningHistory } from '../models/warningHistory.model.js';

/**
 * Process attendance event in real-time
 * POST /api/realtime/process-event
 */
export const processAttendanceEvent = async (req, res) => {
  try {
    const { studentId, courseId, sessionId, eventType = 'attendance_recorded' } = req.body;

    if (!studentId || !courseId) {
      return res.status(400).json({
        success: false,
        error: 'Student ID and Course ID are required'
      });
    }

    console.log(`🚀 Real-time event received: ${eventType} for ${studentId} in ${courseId}`);

    const result = await realtimeWarningService.processAttendanceEvent(
      studentId,
      courseId,
      sessionId,
      eventType
    );

    res.status(200).json(result);

  } catch (error) {
    console.error('❌ Error processing attendance event:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Process multiple attendance events
 * POST /api/realtime/process-batch
 */
export const processBatchEvents = async (req, res) => {
  try {
    const { events } = req.body;

    if (!Array.isArray(events) || events.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Events array is required'
      });
    }

    console.log(`🚀 Processing ${events.length} real-time events`);

    const result = await realtimeWarningService.processBatchEvents(events);

    res.status(200).json(result);

  } catch (error) {
    console.error('❌ Error processing batch events:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Get course attendance rules
 * GET /api/realtime/rules/:courseId
 */
export const getCourseRules = async (req, res) => {
  try {
    const { courseId } = req.params;

    if (!courseId) {
      return res.status(400).json({
        success: false,
        error: 'Course ID is required'
      });
    }

    const rules = await AttendanceRules.getCourseRules(courseId);

    res.status(200).json({
      success: true,
      data: rules
    });

  } catch (error) {
    console.error('❌ Error getting course rules:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Set course attendance rules
 * PUT /api/realtime/rules/:courseId
 */
export const setCourseRules = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { rules } = req.body;

    if (!courseId || !rules) {
      return res.status(400).json({
        success: false,
        error: 'Course ID and rules are required'
      });
    }

    const result = await AttendanceRules.setCourseRules(courseId, rules);

    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(400).json(result);
    }

  } catch (error) {
    console.error('❌ Error setting course rules:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Get email template
 * GET /api/realtime/templates/:courseId/:warningLevel
 */
export const getEmailTemplate = async (req, res) => {
  try {
    const { courseId, warningLevel } = req.params;

    if (!courseId || !warningLevel) {
      return res.status(400).json({
        success: false,
        error: 'Course ID and warning level are required'
      });
    }

    const template = await EmailTemplates.getTemplate(courseId, warningLevel);

    res.status(200).json({
      success: true,
      data: template
    });

  } catch (error) {
    console.error('❌ Error getting email template:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Set email template
 * PUT /api/realtime/templates/:courseId/:warningLevel
 */
export const setEmailTemplate = async (req, res) => {
  try {
    const { courseId, warningLevel } = req.params;
    const { template } = req.body;

    if (!courseId || !warningLevel || !template) {
      return res.status(400).json({
        success: false,
        error: 'Course ID, warning level, and template are required'
      });
    }

    const result = await EmailTemplates.setTemplate(courseId, warningLevel, template);

    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(400).json(result);
    }

  } catch (error) {
    console.error('❌ Error setting email template:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Get warning history for student
 * GET /api/realtime/history/student/:studentId
 */
export const getStudentWarningHistory = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { courseId, limit = 50 } = req.query;

    if (!studentId) {
      return res.status(400).json({
        success: false,
        error: 'Student ID is required'
      });
    }

    const result = await WarningHistory.getStudentWarningHistory(
      studentId,
      courseId,
      parseInt(limit)
    );

    res.status(200).json(result);

  } catch (error) {
    console.error('❌ Error getting student warning history:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Get warning history for course
 * GET /api/realtime/history/course/:courseId
 */
export const getCourseWarningHistory = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { limit = 100 } = req.query;

    if (!courseId) {
      return res.status(400).json({
        success: false,
        error: 'Course ID is required'
      });
    }

    const result = await WarningHistory.getCourseWarningHistory(
      courseId,
      parseInt(limit)
    );

    res.status(200).json(result);

  } catch (error) {
    console.error('❌ Error getting course warning history:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Get warning statistics
 * GET /api/realtime/stats
 */
export const getWarningStats = async (req, res) => {
  try {
    const {
      studentId,
      courseId,
      warningLevel,
      startDate,
      endDate
    } = req.query;

    const filters = {};
    if (studentId) filters.studentId = studentId;
    if (courseId) filters.courseId = courseId;
    if (warningLevel) filters.warningLevel = warningLevel;
    if (startDate) filters.startDate = new Date(startDate);
    if (endDate) filters.endDate = new Date(endDate);

    const result = await WarningHistory.getWarningStats(filters);

    res.status(200).json(result);

  } catch (error) {
    console.error('❌ Error getting warning stats:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Get system status
 * GET /api/realtime/status
 */
export const getSystemStatus = async (req, res) => {
  try {
    const warningServiceStatus = realtimeWarningService.getSystemStatus();
    const queueStatus = backgroundJobService.getQueueStatus();

    res.status(200).json({
      success: true,
      data: {
        warningService: warningServiceStatus,
        backgroundJobs: queueStatus,
        timestamp: new Date(),
        uptime: process.uptime()
      }
    });

  } catch (error) {
    console.error('❌ Error getting system status:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Emergency send all pending warnings
 * POST /api/realtime/emergency-send
 */
export const emergencySendPending = async (req, res) => {
  try {
    console.log('🚨 Emergency send requested');

    const result = await backgroundJobService.emergencySendPending();

    res.status(200).json(result);

  } catch (error) {
    console.error('❌ Error in emergency send:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Test real-time warning system
 * POST /api/realtime/test
 */
export const testRealtimeWarning = async (req, res) => {
  try {
    const { studentId, courseId, warningLevel } = req.body;

    if (!studentId || !courseId || !warningLevel) {
      return res.status(400).json({
        success: false,
        error: 'Student ID, Course ID, and warning level are required'
      });
    }

    console.log(`🧪 Testing real-time warning: ${warningLevel} for ${studentId} in ${courseId}`);

    // Simulate an event that would trigger the warning
    const result = await realtimeWarningService.processAttendanceEvent(
      studentId,
      courseId,
      `test_${Date.now()}`,
      'test_event'
    );

    res.status(200).json({
      success: true,
      message: 'Test completed',
      result: result
    });

  } catch (error) {
    console.error('❌ Error testing real-time warning:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Export warning history
 * GET /api/realtime/export
 */
export const exportWarningHistory = async (req, res) => {
  try {
    const {
      studentId,
      courseId,
      warningLevel,
      startDate,
      endDate,
      format = 'json'
    } = req.query;

    const filters = {};
    if (studentId) filters.studentId = studentId;
    if (courseId) filters.courseId = courseId;
    if (warningLevel) filters.warningLevel = warningLevel;
    if (startDate) filters.startDate = new Date(startDate);
    if (endDate) filters.endDate = new Date(endDate);

    const result = await WarningHistory.exportHistory(filters);

    if (!result.success) {
      return res.status(500).json(result);
    }

    // Set appropriate headers for download
    const filename = `warning_history_${new Date().toISOString().split('T')[0]}.${format}`;
    
    if (format === 'csv') {
      // Convert to CSV (simplified)
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      
      const csv = convertToCSV(result.data);
      res.send(csv);
    } else {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.json(result);
    }

  } catch (error) {
    console.error('❌ Error exporting warning history:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Convert data to CSV format
 */
function convertToCSV(data) {
  if (!data || data.length === 0) return '';

  const headers = Object.keys(data[0]);
  const csvRows = [headers.join(',')];

  for (const row of data) {
    const values = headers.map(header => {
      const value = row[header];
      return typeof value === 'string' && value.includes(',') 
        ? `"${value.replace(/"/g, '""')}"` 
        : value;
    });
    csvRows.push(values.join(','));
  }

  return csvRows.join('\n');
}
