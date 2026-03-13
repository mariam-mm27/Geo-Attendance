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
 * Record attendance for a scanned dynamic QR
 * QR format: SESSION-XXXXX-N (dynamic part N)
 */
export const recordAttendance = async (scannedQRValue: string) => {
  try {
    const student = auth.currentUser;
    if (!student) throw new Error("No authenticated user");

    const userRef = doc(db, "users", student.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists() || userSnap.data().role.toLowerCase() !== "student") {
      throw new Error("Only students can record attendance");
    }

    // Extract base session ID from dynamic QR code
    const baseSessionId = scannedQRValue.split("-").slice(0, 2).join("-");

    // Find session in Firestore
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

    // Check if session is active
    if (sessionData.active === false) return { success: false, message: "Session Expired" };

    // Check session expiry (duration in minutes)
    const createdAt = sessionData.createdAt?.toDate();
    const duration = sessionData.duration || 10; // default 10 minutes
    const expiresAt = new Date(createdAt.getTime() + duration * 60 * 1000);
    if (new Date() > expiresAt) return { success: false, message: "Session Expired" };

    // Check for duplicate attendance
    const attendanceQuery = query(
      collection(db, "attendance"),
      where("sessionId", "==", baseSessionId),
      where("studentId", "==", student.uid)
    );

    const existingAttendance = await getDocs(attendanceQuery);
    if (!existingAttendance.empty) return { success: false, message: "Already Recorded" };

    // Record attendance
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
    return { success: false, message: "Server Error" };
  }
};

/**
 * Get all attendance records for the logged-in student
 */
export const getStudentAttendance = async () => {
  try {
    const student = auth.currentUser;
    if (!student) throw new Error("No authenticated user");

    const q = query(collection(db, "attendance"), where("studentId", "==", student.uid));
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error("Error fetching attendance:", error);
    return [];
  }
};

/**
 * Get all attendance records for a specific course (for professor)
 */
export const getCourseAttendance = async (courseId: string) => {
  try {
    const q = query(collection(db, "attendance"), where("courseId", "==", courseId));
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error("Error fetching course attendance:", error);
    return [];
  }
};

/**
 * Validate if a session is active (frontend check before recording)
 */
export const validateSession = async (sessionId: string) => {
  try {
    const sessionRef = doc(db, "sessions", sessionId);
    const sessionSnap = await getDoc(sessionRef);

    if (!sessionSnap.exists()) return { valid: false, message: "Session does not exist" };

    const sessionData = sessionSnap.data();
    if (!sessionData.active) return { valid: false, message: "Session expired" };

    const createdAt = sessionData.createdAt?.toDate();
    const duration = sessionData.duration || 10;
    const expiryTime = new Date(createdAt.getTime() + duration * 60 * 1000);

    if (new Date() > expiryTime) return { valid: false, message: "Session expired" };

    return { valid: true, session: sessionData };
  } catch (error) {
    console.error("Session validation error:", error);
    return { valid: false, message: "Server error" };
  }
};

/**
 * Validate student enrollment in a course
 */
export const validateStudentInCourse = async (studentId: string, courseId: string) => {
  try {
    const enrollmentsRef = collection(db, "enrollments");

    const q = query(
      enrollmentsRef,
      where("studentId", "==", studentId),
      where("courseId", "==", courseId)
    );

    const snapshot = await getDocs(q);
    if (snapshot.empty) return { valid: false, message: "Student not enrolled in this course" };

    return { valid: true };
  } catch (error) {
    console.error("Enrollment validation error:", error);
    return { valid: false, message: "Server error" };
  }
};