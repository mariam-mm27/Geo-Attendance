// attendanceController.js
import { recordAttendance } from "../servers/attendanceServer.js";

export const attendanceController = async (studentId, scannedQRValue) => {
  try {
    const result = await recordAttendance(scannedQRValue);
    return result;
  } catch (error) {
    return { success: false, message: error.message };
  }
};