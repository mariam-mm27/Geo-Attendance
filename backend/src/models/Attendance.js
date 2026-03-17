import { db } from "../firebase.js"; // عدلي المسار حسب مشروعك

export const markAttendance = async (studentId, sessionId, sessionStartTime, sessionEndTime) => {
  const snapshot = await db.collection("attendance")
    .where("studentId", "==", studentId)
    .get();

  let conflict = false;
  snapshot.forEach((doc) => {
    const data = doc.data();
    const oldStart = data.startTime.toDate ? data.startTime.toDate() : new Date(data.startTime);
    const oldEnd = data.endTime.toDate ? data.endTime.toDate() : new Date(data.endTime);

    if (sessionStartTime < oldEnd && sessionEndTime > oldStart) {
      conflict = true;
    }
  });

  if (conflict) {
    throw new Error("You cannot attend two courses at the same time.");
  }

  const existing = await db.collection("attendance")
    .where("studentId", "==", studentId)
    .where("sessionId", "==", sessionId)
    .get();

  if (!existing.empty) {
    throw new Error("Attendance already marked for this session.");
  }

  const newRecord = {
    studentId,
    sessionId,
    startTime: sessionStartTime,
    endTime: sessionEndTime,
    timestamp: new Date(),
  };

  const docRef = await db.collection("attendance").add(newRecord);
  return { id: docRef.id, ...newRecord };
};