import { markAttendance } from "../models/attendance.js";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebase.js"; // عدلي المسار لو مختلف

/**
 * يسجل حضور الطالب مع التحقق من عدم وجود تعارض بين محاضراته
 * @param {string} studentId
 * @param {string} sessionId
 * @param {Date} newStartTime وقت بداية المحاضرة الجديدة
 * @param {Date} newEndTime وقت نهاية المحاضرة الجديدة
 */
export const attendanceController = async (studentId, sessionId, newStartTime, newEndTime) => {
  try {
    const q = query(
      collection(db, "attendance"),
      where("studentId", "==", studentId)
    );

    const snapshot = await getDocs(q);

    let conflict = false;

    snapshot.forEach((doc) => {
      const data = doc.data();
      const oldStart = data.startTime.toDate ? data.startTime.toDate() : new Date(data.startTime);
      const oldEnd = data.endTime.toDate ? data.endTime.toDate() : new Date(data.endTime);

      if (newStartTime < oldEnd && newEndTime > oldStart) {
        conflict = true;
      }
    });

    if (conflict) {
      throw new Error("You cannot attend two courses at the same time.");
    }

    const result = await markAttendance(studentId, sessionId);
    console.log({ success: true, data: result });
    return result;

  } catch (error) {
    console.log({ success: false, message: error.message });
    throw error;
  }
};