import { db, auth } from "../firebase";
import {
  collection,
  addDoc,
  serverTimestamp,
  doc,
  getDoc,
  query,
  where,
  getDocs
} from "firebase/firestore";


export const recordAttendance = async (scannedQRValue) => {
  try {
    const student = auth.currentUser;

    if (!student) {
      throw new Error("No authenticated user");
    }

    const userRef = doc(db, "users", student.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists() || userSnap.data().role.toLowerCase() !== "student") {
      throw new Error("Only students can record attendance");
    }

    // Extract base session ID from dynamic QR code (format: SESSION-XXXXX-N)
    const baseSessionId = scannedQRValue.split('-').slice(0, 2).join('-');

    // Query sessions collection to find the session by sessionId field
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
    if (sessionData.active === false) {
      return { success: false, message: "Session Expired" };
    }

    // Check if session has expired (15 minutes)
    const expiresAt = sessionData.expiresAt?.toDate();
    if (new Date() > expiresAt) {
      return { success: false, message: "Session Expired" };
    }

    // Check for duplicate attendance
    const attendanceQuery = query(
      collection(db, "attendance"),
      where("sessionId", "==", baseSessionId),
      where("studentId", "==", student.uid)
    );

    const existingAttendance = await getDocs(attendanceQuery);

    if (!existingAttendance.empty) {
      return { success: false, message: "Already Recorded" };
    }

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
    throw error;
  }
};


export const getStudentAttendance = async () => {
  try {
    const student = auth.currentUser;

    if (!student) {
      throw new Error("No authenticated user");
    }

    const q = query(
      collection(db, "attendance"),
      where("studentId", "==", student.uid)
    );

    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

  } catch (error) {
    console.error("Error fetching attendance:", error);
    throw error;
  }
};


export const getCourseAttendance = async (courseId) => {
  try {
    const q = query(
      collection(db, "attendance"),
      where("courseId", "==", courseId)
    );

    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

  } catch (error) {
    console.error("Error fetching course attendance:", error);
    throw error;
  }
};
