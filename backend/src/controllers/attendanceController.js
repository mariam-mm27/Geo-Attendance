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

    if (sessionsSnap.empty) {
      return { success: false, message: "Session not found" };
    }

    const sessionDoc = sessionsSnap.docs[0];
    const sessionData = sessionDoc.data();

    const courseRef = doc(db, "courses", sessionData.courseId);
    const courseSnap = await getDoc(courseRef);

    if (!courseSnap.exists()) {
      return { success: false, message: "Course not found" };
    }

    const courseData = courseSnap.data();
    const enrolledStudents = courseData.enrolledStudents || [];

    if (!enrolledStudents.includes(student.uid)) {
      return { success: false, message: "Not Enrolled in Course" };
    }

    const now = new Date();

    // ✅ Check for overlapping sessions
    const allAttendanceQuery = query(
      collection(db, "attendance"),
      where("studentId", "==", student.uid)
    );
    const allAttendanceSnap = await getDocs(allAttendanceQuery);

    for (const attDoc of allAttendanceSnap.docs) {
      const attData = attDoc.data();
      const attSessionRef = doc(db, "sessions", attData.sessionId);
      const attSessionSnap = await getDoc(attSessionRef);

      if (!attSessionSnap.exists()) continue;

      const attSessionData = attSessionSnap.data();
      const attStart = attSessionData.createdAt?.toDate();
      const attEnd = new Date(attStart.getTime() + (attSessionData.duration || 10) * 60 * 1000);

      const sessionStart = sessionData.createdAt?.toDate();
      const sessionEnd = new Date(sessionStart.getTime() + (sessionData.duration || 10) * 60 * 1000);

      // Check overlap
      if (sessionStart < attEnd && sessionEnd > attStart) {
        return {
          success: false,
          message: "You cannot attend two overlapping sessions."
        };
      }
    }

    const attendanceQuery = query(
      collection(db, "attendance"),
      where("sessionId", "==", baseSessionId),
      where("studentId", "==", student.uid)
    );

    const existingAttendance = await getDocs(attendanceQuery);
    if (!existingAttendance.empty) return { success: false, message: "Already Recorded" };

    await addDoc(collection(db, "attendance"), {
      sessionId: baseSessionId,
      studentId: student.uid,
      studentEmail: student.email,
      courseId: sessionData.courseId,
      professorId: sessionData.professorId,
      recordedAt: serverTimestamp(),
    });

    return { success: true, message: "Attendance Successful" };

  } catch (error) {
    console.error("Error recording attendance:", error);
    return { success: false, message: error.message || "Server Error" };
  }
};