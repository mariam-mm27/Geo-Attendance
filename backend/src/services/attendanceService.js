import { db, auth } from "../firebase";
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

/**
 * يسجل حضور الطالب مع التحقق من التعارض بين المحاضرات
 * @param {string} scannedQRValue
 */
export const recordAttendance = async (scannedQRValue) => {
  try {
    const student = auth.currentUser;
    if (!student) throw new Error("No authenticated user");

    const userRef = doc(db, "users", student.uid);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists() || userSnap.data().role.toLowerCase() !== "student") {
      throw new Error("Only students can record attendance");
    }

    const baseSessionId = scannedQRValue.split("-").slice(0, 2).join("-");
    const sessionsQuery = query(
      collection(db, "sessions"),
      where("sessionId", "==", baseSessionId)
    );
    const sessionsSnap = await getDocs(sessionsQuery);
    if (sessionsSnap.empty) return { success: false, message: "Session not found" };

    const sessionDoc = sessionsSnap.docs[0];
    const sessionData = sessionDoc.data();

    // Course check
    const courseRef = doc(db, "courses", sessionData.courseId);
    const courseSnap = await getDoc(courseRef);
    if (!courseSnap.exists()) return { success: false, message: "Course not found" };

    const courseData = courseSnap.data();
    const enrolledStudents = courseData.enrolledStudents || [];
    if (!enrolledStudents.includes(student.uid)) return { success: false, message: "Not Enrolled in Course" };

    const now = new Date();
    const sessionStart = sessionData.createdAt?.toDate();
    const sessionDuration = sessionData.duration || 10;
    const sessionEnd = new Date(sessionStart.getTime() + sessionDuration * 60 * 1000);

    // Check if session expired
    if (!sessionData.active || now > sessionEnd) return { success: false, message: "Session Expired" };

    // Check for overlapping sessions
    const allAttendanceQuery = query(
      collection(db, "attendance"),
      where("studentId", "==", student.uid)
    );
    const allAttendanceSnap = await getDocs(allAttendanceQuery);

    for (const attDoc of allAttendanceSnap.docs) {
      const attData = attDoc.data();
      const attStart = attData.startTime.toDate ? attData.startTime.toDate() : new Date(attData.startTime);
      const attEnd = attData.endTime.toDate ? attData.endTime.toDate() : new Date(attData.endTime);

      if (sessionStart < attEnd && sessionEnd > attStart) {
        return { success: false, message: "You cannot attend two courses at the same time." };
      }
    }

    // Check if already recorded for this session
    const existingAttendanceQuery = query(
      collection(db, "attendance"),
      where("sessionId", "==", baseSessionId),
      where("studentId", "==", student.uid)
    );
    const existingAttendanceSnap = await getDocs(existingAttendanceQuery);
    if (!existingAttendanceSnap.empty) return { success: false, message: "Already Recorded" };

    // Record attendance
    await addDoc(collection(db, "attendance"), {
      sessionId: baseSessionId,
      studentId: student.uid,
      studentEmail: student.email,
      courseId: sessionData.courseId,
      professorId: sessionData.professorId,
      startTime: sessionStart,
      endTime: sessionEnd,
      recordedAt: serverTimestamp(),
    });

    return { success: true, message: "Attendance Successful" };
  } catch (error) {
    console.error("Error recording attendance:", error);
    return { success: false, message: error.message || "Server Error" };
  }
};