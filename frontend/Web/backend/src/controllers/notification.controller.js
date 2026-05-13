import {
  checkAbsenceThreshold,
  sendAbsenceAlert,
  checkCourseAbsences,
  getUserNotifications,
  markNotificationAsRead,
  sendNotification,
} from "../services/notification.service.js";

export const checkStudentAbsence = async (req, res) => {
  try {
    const { studentId, courseId } = req.params;

    const result = await checkAbsenceThreshold(studentId, courseId);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Error in checkStudentAbsence:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const sendStudentAbsenceAlert = async (req, res) => {
  try {
    const { studentId, courseId } = req.body;

    const absenceData = await checkAbsenceThreshold(studentId, courseId);

    if (!absenceData.exceeded) {
      return res.status(200).json({
        success: false,
        message: "Absence threshold not exceeded",
        data: absenceData,
      });
    }

    const result = await sendAbsenceAlert(studentId, courseId, absenceData);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Error in sendStudentAbsenceAlert:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const checkAllCourseAbsences = async (req, res) => {
  try {
    const { courseId } = req.params;

    const result = await checkCourseAbsences(courseId);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Error in checkAllCourseAbsences:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getNotifications = async (req, res) => {
  try {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit) || 20;

    const notifications = await getUserNotifications(userId, limit);

    res.status(200).json({
      success: true,
      data: notifications,
    });
  } catch (error) {
    console.error("Error in getNotifications:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const markAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;

    const result = await markNotificationAsRead(notificationId);

    res.status(200).json(result);
  } catch (error) {
    console.error("Error in markAsRead:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const createNotification = async (req, res) => {
  try {
    const { userId, title, message, type, metadata } = req.body;

    const result = await sendNotification(userId, title, message, type, metadata);

    res.status(200).json(result);
  } catch (error) {
    console.error("Error in createNotification:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
