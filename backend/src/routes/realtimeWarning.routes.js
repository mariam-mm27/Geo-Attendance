/**
 * Real-time Warning Routes
 * API endpoints for the flexible attendance warning system
 */

import express from 'express';
import {
  processAttendanceEvent,
  processBatchEvents,
  getCourseRules,
  setCourseRules,
  getEmailTemplate,
  setEmailTemplate,
  getStudentWarningHistory,
  getCourseWarningHistory,
  getWarningStats,
  getSystemStatus,
  emergencySendPending,
  testRealtimeWarning,
  exportWarningHistory
} from '../controllers/realtimeWarning.controller.js';

const router = express.Router();

// Real-time event processing
router.post('/process-event', processAttendanceEvent);
router.post('/process-batch', processBatchEvents);

// Course rules management
router.get('/rules/:courseId', getCourseRules);
router.put('/rules/:courseId', setCourseRules);

// Email template management
router.get('/templates/:courseId/:warningLevel', getEmailTemplate);
router.put('/templates/:courseId/:warningLevel', setEmailTemplate);

// Warning history
router.get('/history/student/:studentId', getStudentWarningHistory);
router.get('/history/course/:courseId', getCourseWarningHistory);
router.get('/stats', getWarningStats);
router.get('/export', exportWarningHistory);

// System management
router.get('/status', getSystemStatus);
router.post('/emergency-send', emergencySendPending);
router.post('/test', testRealtimeWarning);

export default router;
