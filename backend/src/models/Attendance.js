import { db } from "../config/firebase.js";

// Function لتسجيل الحضور
export const markAttendance = async (studentId, sessionId) => {
  // تحقق لو الطالب مسجل قبل كده لنفس السيشن
  const existing = await db.collection("attendance")
    .where("studentId", "==", studentId)
    .where("sessionId", "==", sessionId)
    .get();

  if (!existing.empty) {
    throw new Error("Attendance already marked for this student.");
  }

  // سجل حضور الطالب
  const newRecord = {
    studentId,
    sessionId,
    timestamp: new Date(),
  };

  const docRef = await db.collection("attendance").add(newRecord);
  return { id: docRef.id, ...newRecord };
};