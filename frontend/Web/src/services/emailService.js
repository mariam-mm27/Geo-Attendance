const API_BASE_URL = "http://localhost:3001/api";

/**
 * Send absence alert email to a student
 * @param {string} studentId - Student ID
 * @param {string} courseId - Course ID
 * @returns {Promise<Object>} Result of the email sending
 */
export const sendAbsenceAlert = async (studentId, courseId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/email/send-alert`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ studentId, courseId }),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error sending absence alert:", error);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Check attendance and send alert if threshold exceeded
 * @param {string} studentId - Student ID
 * @param {string} courseId - Course ID
 * @returns {Promise<Object>} Result with emailSent flag
 */
export const checkAndSendAlert = async (studentId, courseId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/email/check-and-alert`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ studentId, courseId }),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error checking and sending alert:", error);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Send bulk absence alerts for all students in a course
 * @param {string} courseId - Course ID
 * @returns {Promise<Object>} Result with sent and failed counts
 */
export const sendBulkAlerts = async (courseId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/email/send-bulk-alerts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ courseId }),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error sending bulk alerts:", error);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Get email notification history for a student
 * @param {string} studentId - Student ID
 * @returns {Promise<Object>} Array of email notifications
 */
export const getEmailHistory = async (studentId) => {
  try {
    // This endpoint doesn't exist yet, return empty for now
    return {
      success: true,
      data: [],
    };
  } catch (error) {
    console.error("Error fetching email history:", error);
    return {
      success: false,
      error: error.message,
      data: [],
    };
  }
};

/**
 * Get all students with low attendance for a course
 * @param {string} courseId - Course ID
 * @returns {Promise<Object>} Array of students with low attendance
 */
export const getLowAttendanceStudents = async (courseId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/email/low-attendance/${courseId}`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching low attendance students:", error);
    return {
      success: false,
      error: error.message,
      data: [],
    };
  }
};

/**
 * Trigger email check when attendance is recorded
 * @param {string} studentId - Student ID
 * @param {string} courseId - Course ID
 * @returns {Promise<Object>} Result of the trigger
 */
export const triggerOnAttendance = async (studentId, courseId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/email/trigger-on-attendance`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ studentId, courseId }),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error triggering on attendance:", error);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Check if student's attendance is below threshold (75%)
 * @param {number} attendanceRate - Attendance percentage
 * @returns {boolean} True if attendance is below 75%
 */
export const isLowAttendance = (attendanceRate) => {
  return parseFloat(attendanceRate) < 75;
};

/**
 * Get attendance status color
 * @param {number} attendanceRate - Attendance percentage
 * @returns {string} Color code for the attendance status
 */
export const getAttendanceStatusColor = (attendanceRate) => {
  const rate = parseFloat(attendanceRate);
  if (rate >= 75) return "#16A34A"; // Green - Good
  if (rate >= 50) return "#F59E0B"; // Yellow - Warning
  return "#DC2626"; // Red - Critical
};

/**
 * Get attendance status label
 * @param {number} attendanceRate - Attendance percentage
 * @returns {string} Status label
 */
export const getAttendanceStatusLabel = (attendanceRate) => {
  const rate = parseFloat(attendanceRate);
  if (rate >= 75) return "Good";
  if (rate >= 50) return "Warning";
  return "Critical";
};
