import { markAttendance } from "../models/attendance.js";

/**
 * يسجل حضور الطالب مع منع أي تداخل في المحاضرات حتى لو كورسين مختلفين
 */
export const attendanceController = async (studentId, sessionId, sessionStartTime, sessionEndTime) => {
  try {
    const result = await markAttendance(studentId, sessionId, sessionStartTime, sessionEndTime);
    console.log({ success: true, data: result });
    return result;
  } catch (error) {
    console.log({ success: false, message: error.message });
    throw error;
  }
};