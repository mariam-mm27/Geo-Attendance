
import { db, auth } from "../config/firebase.js";
import {
  collection,
  addDoc,
  serverTimestamp,
  doc,
  getDoc,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { markAttendance } from "../models/Attendance.js";




export const attendanceController = async (studentId, scannedQRValue) => {
  try {
    const result = await recordAttendance(scannedQRValue);
    return result;
  } catch (error) {
    return { success: false, message: error.message };
  }
};
