import express from "express";
import {
  checkStudentAbsence,
  sendStudentAbsenceAlert,
  checkAllCourseAbsences,
  getNotifications,
  markAsRead,
  createNotification,
} from "../controllers/notification.controller.js";

const router = express.Router();

// Check if student's absence exceeds threshold
router.get("/check-absence/:studentId/:courseId", checkStudentAbsence);

// Send absence alert to student
router.post("/send-absence-alert", sendStudentAbsenceAlert);

// Check all students in a course and send alerts
router.post("/check-course-absences/:courseId", checkAllCourseAbsences);

// Get user notifications
router.get("/user/:userId", getNotifications);

// Mark notification as read
router.put("/:notificationId/read", markAsRead);

// Create custom notification
router.post("/create", createNotification);

export default router;
