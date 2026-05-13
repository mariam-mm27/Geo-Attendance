/**
 * Unified Warning Controller
 * 
 * API endpoints for the unified warning system.
 * Handles warning management, rules configuration, and reporting.
 */

const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const db = admin.firestore();

const unifiedWarningService = require('../services/unifiedWarning.service');
const warningHistoryService = require('../services/warningHistory.service');
const attendanceRulesService = require('../services/attendanceRules.service');
const emailDeliveryService = require('../services/emailDelivery.service');
const logger = require('../utils/logger');

const warningService = unifiedWarningService.getInstance();
const historyService = warningHistoryService.getInstance();
const rulesService = attendanceRulesService.getInstance();
const emailService = emailDeliveryService.getInstance();

/**
 * POST /api/warnings/process-attendance
 * Process attendance recorded event
 */
router.post('/process-attendance', async (req, res) => {
  try {
    const { studentId, courseId, sessionId, professorId } = req.body;

    if (!studentId || !courseId || !sessionId) {
      return res.status(400).json({
        error: 'Missing required fields: studentId, courseId, sessionId'
      });
    }

    await warningService.processAttendanceRecorded({
      studentId,
      courseId,
      sessionId,
      professorId
    });

    res.json({
      success: true,
      message: 'Attendance processed'
    });

  } catch (error) {
    logger.error('Error processing attendance:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/warnings/process-absence
 * Process absence detected event
 */
router.post('/process-absence', async (req, res) => {
  try {
    const { studentId, courseId, sessionId, professorId } = req.body;

    if (!studentId || !courseId || !sessionId) {
      return res.status(400).json({
        error: 'Missing required fields: studentId, courseId, sessionId'
      });
    }

    await warningService.processAbsenceDetected({
      studentId,
      courseId,
      sessionId,
      professorId
    });

    res.json({
      success: true,
      message: 'Absence processed'
    });

  } catch (error) {
    logger.error('Error processing absence:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/warnings/manual-trigger
 * Manually trigger a warning (admin only)
 */
router.post('/manual-trigger', async (req, res) => {
  try {
    const { studentId, courseId, warningLevel, adminId } = req.body;

    if (!studentId || !courseId || !warningLevel || !adminId) {
      return res.status(400).json({
        error: 'Missing required fields: studentId, courseId, warningLevel, adminId'
      });
    }

    const result = await warningService.manualTriggerWarning(
      studentId,
      courseId,
      warningLevel,
      adminId
    );

    res.json(result);

  } catch (error) {
    logger.error('Error in manual trigger:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/warnings/batch-process
 * Batch process warnings for a course (admin only)
 */
router.post('/batch-process', async (req, res) => {
  try {
    const { courseId, adminId } = req.body;

    if (!courseId || !adminId) {
      return res.status(400).json({
        error: 'Missing required fields: courseId, adminId'
      });
    }

    const result = await warningService.batchProcessCourse(courseId, adminId);

    res.json(result);

  } catch (error) {
    logger.error('Error in batch process:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/warnings/history/student/:studentId
 * Get warning history for a student
 */
router.get('/history/student/:studentId', async (req, res) => {
  try {
    const { studentId } = req.params;
    const { courseId, limit = 50 } = req.query;

    const history = await historyService.getStudentWarningHistory(
      studentId,
      courseId,
      parseInt(limit)
    );

    res.json({
      success: true,
      count: history.length,
      data: history
    });

  } catch (error) {
    logger.error('Error getting student warning history:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/warnings/history/course/:courseId
 * Get warning history for a course
 */
router.get('/history/course/:courseId', async (req, res) => {
  try {
    const { courseId } = req.params;
    const { limit = 100 } = req.query;

    const history = await historyService.getCourseWarningHistory(
      courseId,
      parseInt(limit)
    );

    res.json({
      success: true,
      count: history.length,
      data: history
    });

  } catch (error) {
    logger.error('Error getting course warning history:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/warnings/statistics
 * Get warning statistics
 */
router.get('/statistics', async (req, res) => {
  try {
    const { courseId, studentId, warningLevel, status } = req.query;

    const filters = {};
    if (courseId) filters.courseId = courseId;
    if (studentId) filters.studentId = studentId;
    if (warningLevel) filters.warningLevel = warningLevel;
    if (status) filters.status = status;

    const stats = await historyService.getWarningStatistics(filters);

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    logger.error('Error getting statistics:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/warnings/trend/:courseId
 * Get warning trend for a course
 */
router.get('/trend/:courseId', async (req, res) => {
  try {
    const { courseId } = req.params;
    const { days = 30 } = req.query;

    const trend = await historyService.getWarningTrend(courseId, parseInt(days));

    res.json({
      success: true,
      data: trend
    });

  } catch (error) {
    logger.error('Error getting warning trend:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/warnings/rules/:courseId
 * Get rules for a course
 */
router.get('/rules/:courseId', async (req, res) => {
  try {
    const { courseId } = req.params;

    const rules = await rulesService.getCourseRules(courseId);

    res.json({
      success: true,
      data: rules
    });

  } catch (error) {
    logger.error('Error getting rules:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/warnings/rules/:courseId
 * Update rules for a course (admin only)
 */
router.put('/rules/:courseId', async (req, res) => {
  try {
    const { courseId } = req.params;
    const { adminId, ...rulesData } = req.body;

    if (!adminId) {
      return res.status(400).json({
        error: 'Missing required field: adminId'
      });
    }

    const rules = await rulesService.setCourseRules(courseId, rulesData, adminId);

    res.json({
      success: true,
      data: rules
    });

  } catch (error) {
    logger.error('Error updating rules:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/warnings/rules
 * Get all rules
 */
router.get('/rules', async (req, res) => {
  try {
    const rules = await rulesService.getAllRules();

    res.json({
      success: true,
      count: rules.length,
      data: rules
    });

  } catch (error) {
    logger.error('Error getting all rules:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/warnings/rules/:courseId
 * Delete rules for a course (revert to defaults)
 */
router.delete('/rules/:courseId', async (req, res) => {
  try {
    const { courseId } = req.params;

    await rulesService.deleteRules(courseId);

    res.json({
      success: true,
      message: 'Rules deleted, reverted to defaults'
    });

  } catch (error) {
    logger.error('Error deleting rules:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/warnings/system-status
 * Get system status and statistics
 */
router.get('/system-status', async (req, res) => {
  try {
    const stats = await warningService.getSystemStats();
    const rulesStats = await rulesService.getRulesSummary();

    res.json({
      success: true,
      data: {
        warnings: stats,
        rules: rulesStats,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('Error getting system status:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/warnings/test-email
 * Test email configuration
 */
router.post('/test-email', async (req, res) => {
  try {
    const { toEmail } = req.body;

    if (!toEmail) {
      return res.status(400).json({
        error: 'Missing required field: toEmail'
      });
    }

    const result = await emailService.sendTestEmail(toEmail);

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('Error sending test email:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/warnings/email-config
 * Get email configuration status
 */
router.get('/email-config', async (req, res) => {
  try {
    const config = await emailService.testEmailConfiguration();

    res.json({
      success: true,
      data: config
    });

  } catch (error) {
    logger.error('Error getting email config:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/warnings/pending
 * Get pending warnings (failed or not yet delivered)
 */
router.get('/pending', async (req, res) => {
  try {
    const { limit = 50 } = req.query;

    const pending = await historyService.getPendingWarnings(parseInt(limit));

    res.json({
      success: true,
      count: pending.length,
      data: pending
    });

  } catch (error) {
    logger.error('Error getting pending warnings:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/warnings/export
 * Export warning history (admin only)
 */
router.post('/export', async (req, res) => {
  try {
    const { courseId, format = 'json', startDate, endDate } = req.body;

    const filters = {};
    if (courseId) filters.courseId = courseId;
    if (startDate) filters.startDate = new Date(startDate);
    if (endDate) filters.endDate = new Date(endDate);

    const data = await historyService.exportWarningHistory(filters, format);

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="warnings.csv"');
      res.send(data);
    } else {
      res.json({
        success: true,
        count: data.length,
        data
      });
    }

  } catch (error) {
    logger.error('Error exporting warnings:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
