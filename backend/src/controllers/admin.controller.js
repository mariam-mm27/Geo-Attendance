/**
 * Admin Configuration Controller
 * Provides admin interface for managing attendance warning system
 */

import { AttendanceRules } from '../models/attendanceRules.model.js';
import { EmailTemplates } from '../models/emailTemplates.model.js';
import { WarningHistory } from '../models/warningHistory.model.js';
import { db } from '../config/firebase-client.js';
import { collection, getDocs, doc, getDoc, query, where } from 'firebase/firestore';

/**
 * Get all courses with their rules
 * GET /api/admin/courses
 */
export const getAllCoursesWithRules = async (req, res) => {
  try {
    // Get all courses
    const coursesSnapshot = await getDocs(collection(db, 'courses'));
    const courses = [];

    for (const courseDoc of coursesSnapshot.docs) {
      const courseData = courseDoc.data();
      const courseId = courseDoc.id;

      // Get rules for this course
      const rules = await AttendanceRules.getCourseRules(courseId);

      // Get warning stats for this course
      const statsResult = await WarningHistory.getWarningStats({ courseId });
      const stats = statsResult.success ? statsResult.data : null;

      courses.push({
        id: courseId,
        name: courseData.name,
        professorName: courseData.professorName,
        enrolledStudents: courseData.enrolledStudents?.length || 0,
        rules: rules,
        warningStats: stats,
        createdAt: courseData.createdAt
      });
    }

    res.status(200).json({
      success: true,
      data: courses
    });

  } catch (error) {
    console.error('❌ Error getting courses with rules:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Get system overview
 * GET /api/admin/overview
 */
export const getSystemOverview = async (req, res) => {
  try {
    // Get overall stats
    const overallStats = await WarningHistory.getWarningStats();
    
    // Get courses count
    const coursesSnapshot = await getDocs(collection(db, 'courses'));
    const totalCourses = coursesSnapshot.size;

    // Get students count
    const usersSnapshot = await getDocs(query(collection(db, 'users'), where('role', '==', 'student')));
    const totalStudents = usersSnapshot.size;

    // Get active courses with custom rules
    const rulesSnapshot = await getDocs(collection(db, 'attendanceRules'));
    const coursesWithCustomRules = rulesSnapshot.size;

    // Get recent warnings
    const recentWarningsResult = await WarningHistory.getWarningStats({
      startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
    });
    const recentWarnings = recentWarningsResult.success ? recentWarningsResult.data.total : 0;

    const overview = {
      totalCourses,
      totalStudents,
      coursesWithCustomRules,
      totalWarnings: overallStats.success ? overallStats.data.total : 0,
      recentWarnings,
      systemHealth: {
        emailService: 'active', // This should be checked dynamically
        backgroundJobs: 'active',
        database: 'active'
      },
      stats: overallStats.success ? overallStats.data : null
    };

    res.status(200).json({
      success: true,
      data: overview
    });

  } catch (error) {
    console.error('❌ Error getting system overview:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Update course rules (admin)
 * PUT /api/admin/courses/:courseId/rules
 */
export const updateCourseRules = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { rules } = req.body;

    if (!courseId || !rules) {
      return res.status(400).json({
        success: false,
        error: 'Course ID and rules are required'
      });
    }

    // Validate admin permissions (this should come from auth middleware)
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    const result = await AttendanceRules.setCourseRules(courseId, {
      ...rules,
      updatedBy: req.user.id,
      updatedAt: new Date()
    });

    if (result.success) {
      // Log the change
      await logAdminAction(req.user.id, 'update_course_rules', {
        courseId,
        changes: rules
      });

      res.status(200).json(result);
    } else {
      res.status(400).json(result);
    }

  } catch (error) {
    console.error('❌ Error updating course rules:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Update email template (admin)
 * PUT /api/admin/templates/:courseId/:warningLevel
 */
export const updateEmailTemplate = async (req, res) => {
  try {
    const { courseId, warningLevel } = req.params;
    const { template } = req.body;

    if (!courseId || !warningLevel || !template) {
      return res.status(400).json({
        success: false,
        error: 'Course ID, warning level, and template are required'
      });
    }

    // Validate admin permissions
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    const result = await EmailTemplates.setTemplate(courseId, warningLevel, {
      ...template,
      updatedBy: req.user.id,
      updatedAt: new Date()
    });

    if (result.success) {
      // Log the change
      await logAdminAction(req.user.id, 'update_email_template', {
        courseId,
        warningLevel,
        templateChanges: template
      });

      res.status(200).json(result);
    } else {
      res.status(400).json(result);
    }

  } catch (error) {
    console.error('❌ Error updating email template:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Get all templates (admin)
 * GET /api/admin/templates
 */
export const getAllTemplates = async (req, res) => {
  try {
    const templates = await EmailTemplates.getAllTemplates();

    res.status(200).json({
      success: true,
      data: templates
    });

  } catch (error) {
    console.error('❌ Error getting all templates:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Get warning reports
 * GET /api/admin/reports
 */
export const getWarningReports = async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      courseId,
      warningLevel,
      groupBy = 'day'
    } = req.query;

    const filters = {};
    if (startDate) filters.startDate = new Date(startDate);
    if (endDate) filters.endDate = new Date(endDate);
    if (courseId) filters.courseId = courseId;
    if (warningLevel) filters.warningLevel = warningLevel;

    const statsResult = await WarningHistory.getWarningStats(filters);
    
    if (!statsResult.success) {
      return res.status(500).json(statsResult);
    }

    const stats = statsResult.data;

    // Generate report based on groupBy
    let report = {};
    
    if (groupBy === 'day') {
      report = groupByDay(stats.byMonth);
    } else if (groupBy === 'course') {
      report = stats.byCourse;
    } else if (groupBy === 'level') {
      report = stats.byLevel;
    }

    res.status(200).json({
      success: true,
      data: {
        summary: {
          total: stats.total,
          sent: stats.sent,
          failed: stats.failed,
          delivered: stats.delivered
        },
        breakdown: report,
        filters: filters
      }
    });

  } catch (error) {
    console.error('❌ Error getting warning reports:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Get students with attendance issues
 * GET /api/admin/at-risk-students
 */
export const getAtRiskStudents = async (req, res) => {
  try {
    const { courseId, minAbsenceRate = 10 } = req.query;

    // Get all students with attendance below threshold
    const studentsSnapshot = await getDocs(query(collection(db, 'users'), where('role', '==', 'student')));
    const atRiskStudents = [];

    for (const studentDoc of studentsSnapshot.docs) {
      const studentData = studentDoc.data();
      const studentId = studentDoc.id;

      // Get student's warning history
      const historyResult = await WarningHistory.getStudentWarningHistory(studentId, courseId, 10);
      
      if (historyResult.success && historyResult.data.length > 0) {
        const latestWarning = historyResult.data[0];
        
        if (latestWarning.absenceRate >= minAbsenceRate) {
          atRiskStudents.push({
            studentId,
            studentName: studentData.name,
            studentEmail: studentData.email,
            latestWarning: latestWarning,
            totalWarnings: historyResult.data.length
          });
        }
      }
    }

    // Sort by absence rate (highest first)
    atRiskStudents.sort((a, b) => b.latestWarning.absenceRate - a.latestWarning.absenceRate);

    res.status(200).json({
      success: true,
      data: atRiskStudents
    });

  } catch (error) {
    console.error('❌ Error getting at-risk students:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Bulk update rules for multiple courses
 * POST /api/admin/bulk-update-rules
 */
export const bulkUpdateRules = async (req, res) => {
  try {
    const { courseIds, rules } = req.body;

    if (!Array.isArray(courseIds) || courseIds.length === 0 || !rules) {
      return res.status(400).json({
        success: false,
        error: 'Course IDs array and rules are required'
      });
    }

    // Validate admin permissions
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    const results = [];
    
    for (const courseId of courseIds) {
      try {
        const result = await AttendanceRules.setCourseRules(courseId, {
          ...rules,
          updatedBy: req.user.id,
          updatedAt: new Date()
        });
        
        results.push({
          courseId,
          success: result.success,
          message: result.message || result.error
        });
      } catch (error) {
        results.push({
          courseId,
          success: false,
          message: error.message
        });
      }
    }

    // Log the bulk action
    await logAdminAction(req.user.id, 'bulk_update_rules', {
      courseIds,
      rules,
      results: results.filter(r => r.success).length,
      failures: results.filter(r => !r.success).length
    });

    res.status(200).json({
      success: true,
      message: `Updated ${results.filter(r => r.success).length} of ${courseIds.length} courses`,
      results
    });

  } catch (error) {
    console.error('❌ Error in bulk update rules:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Reset course rules to defaults
 * POST /api/admin/reset-rules/:courseId
 */
export const resetCourseRules = async (req, res) => {
  try {
    const { courseId } = req.params;

    if (!courseId) {
      return res.status(400).json({
        success: false,
        error: 'Course ID is required'
      });
    }

    // Validate admin permissions
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    const result = await AttendanceRules.deleteCourseRules(courseId);

    if (result.success) {
      await logAdminAction(req.user.id, 'reset_course_rules', { courseId });
      res.status(200).json(result);
    } else {
      res.status(400).json(result);
    }

  } catch (error) {
    console.error('❌ Error resetting course rules:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Log admin actions
 */
async function logAdminAction(adminId, action, details) {
  try {
    await addDoc(collection(db, 'adminLogs'), {
      adminId,
      action,
      details,
      timestamp: new Date(),
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });
  } catch (error) {
    console.error('Error logging admin action:', error);
  }
}

/**
 * Group stats by day (simplified implementation)
 */
function groupByDay(byMonth) {
  const daily = {};
  
  Object.keys(byMonth).forEach(month => {
    const [year, monthNum] = month.split('-');
    const daysInMonth = new Date(year, monthNum, 0).getDate();
    
    for (let day = 1; day <= daysInMonth; day++) {
      const dateKey = `${year}-${monthNum.padStart(2, '0')}-${day.padStart(2, '0')}`;
      daily[dateKey] = Math.floor(Math.random() * 10) + 1; // Placeholder
    }
  });
  
  return daily;
}
