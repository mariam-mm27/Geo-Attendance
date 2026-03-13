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

    // Check if student is enrolled in the course
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


export const getCourseAttendance = async (courseId) => {
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


export const validateSession = async (sessionId) => {
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


export const validateStudentInCourse = async (studentId, courseId) => {
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