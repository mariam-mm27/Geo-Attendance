import { markAttendance } from "../models/attendance.js";

export const attendanceControllerTest = async () => {
  try {
    const result = await markAttendance("student123", "session456");
    console.log({ success: true, data: result });
  } catch (error) {
    console.log({ success: false, message: error.message });
  }
};