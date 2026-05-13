/**
 * Admin Routes
 * API endpoints for admin configuration and management
 */

import express from 'express';
import {
  getAllCoursesWithRules,
  getSystemOverview,
  updateCourseRules,
  updateEmailTemplate,
  getAllTemplates,
  getWarningReports,
  getAtRiskStudents,
  bulkUpdateRules,
  resetCourseRules
} from '../controllers/admin.controller.js';

const router = express.Router();

// Apply admin middleware (should be implemented)
// router.use(requireAdminAuth);

// System overview
router.get('/overview', getSystemOverview);

// Course management
router.get('/courses', getAllCoursesWithRules);
router.put('/courses/:courseId/rules', updateCourseRules);
router.post('/bulk-update-rules', bulkUpdateRules);
router.post('/reset-rules/:courseId', resetCourseRules);

// Template management
router.get('/templates', getAllTemplates);
router.put('/templates/:courseId/:warningLevel', updateEmailTemplate);

// Reports and analytics
router.get('/reports', getWarningReports);
router.get('/at-risk-students', getAtRiskStudents);

export default router;
