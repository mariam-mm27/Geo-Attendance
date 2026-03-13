import { markAttendance } from "../models/attendance.js";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebase.js";

/**
 * يسجل حضور الطالب مع منع أي تداخل في المحاضرات حتى لو كورسين مختلفين
 * @param {string} studentId
 * @param {string} sessionId
 * @param {Date} newStartTime وقت بداية المحاضرة الجديدة
 * @param {Date} newEndTime وقت نهاية المحاضرة الجديدة
 */
export const attendanceController = async (studentId, sessionId, newStartTime, newEndTime) => {
  try {
    // 1️⃣ جلب كل الحضور الحالي للطالب
    const q = query(
      collection(db, "attendance"),
      where("studentId", "==", studentId)
    );

    const snapshot = await getDocs(q);

    // 2️⃣ التحقق من أي تعارض في المواعيد
    let conflict = false;
    snapshot.forEach((doc) => {
      const data = doc.data();
      const oldStart = data.startTime.toDate ? data.startTime.toDate() : new Date(data.startTime);
      const oldEnd = data.endTime.toDate ? data.endTime.toDate() : new Date(data.endTime);

      // منع أي تداخل في الوقت، سواء نفس الكورس أو كورسين مختلفين
      if (newStartTime < oldEnd && newEndTime > oldStart) {
        conflict = true;
      }
    });

    // 3️⃣ لو في تعارض، ارجع رسالة واضحة
    if (conflict) {
      throw new Error("You cannot attend two courses at the same time.");
    }

    // 4️⃣ تسجيل الحضور لو مفيش تعارض
    const result = await markAttendance(studentId, sessionId);
    console.log({ success: true, data: result });
    return result;

  } catch (error) {
    console.log({ success: false, message: error.message });
    throw error;
  }
};