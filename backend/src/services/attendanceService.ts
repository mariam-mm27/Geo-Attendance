import { db, auth } from "../config/firebase";
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

export const recordAttendance = async (scannedQRValue: string) => {
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

    const allActiveSessionsQuery = query(
      collection(db, "sessions"),
      where("active", "==", true)
    );
    const allActiveSessionsSnap = await getDocs(allActiveSessionsQuery);
    
    for (const activeSessionDoc of allActiveSessionsSnap.docs) {
      const activeSessionData = activeSessionDoc.data();
      const activeSessionId = activeSessionData.sessionId;
      
      if (activeSessionId === baseSessionId) continue;
      
      const sessionCreatedAt = activeSessionData.createdAt?.toDate();
      const sessionDuration = activeSessionData.duration || 10;

      if (!sessionCreatedAt) continue;

      const sessionExpiresAt = new Date(
        sessionCreatedAt.getTime() + sessionDuration * 60 * 1000
      );
      
      if (now <= sessionExpiresAt) {
        const otherAttendanceQuery = query(
          collection(db, "attendance"),
          where("sessionId", "==", activeSessionId),
          where("studentId", "==", student.uid)
        );
        const otherAttendanceSnap = await getDocs(otherAttendanceQuery);
        
        if (!otherAttendanceSnap.empty) {
          const conflictCourseRef = doc(db, "courses", activeSessionData.courseId);
          const conflictCourseSnap = await getDoc(conflictCourseRef);

          const conflictCourseName = conflictCourseSnap.exists()
            ? conflictCourseSnap.data().name
            : "another course";
          
          return { 
            success: false, 
            message: `Already attending ${conflictCourseName}. Wait until that lecture ends.` 
          };
        }
      }
    }

    if (sessionData.active === false) {
      return { success: false, message: "Session Expired" };
    }

    const createdAt = sessionData.createdAt?.toDate();
    const duration = sessionData.duration || 10;

    if (!createdAt) {
      return { success: false, message: "Invalid session time" };
    }

    const expiresAt = new Date(createdAt.getTime() + duration * 60 * 1000);

    if (new Date() > expiresAt) {
      return { success: false, message: "Session Expired" };
    }

    const attendanceQuery = query(
      collection(db, "attendance"),
      where("sessionId", "==", baseSessionId),
      where("studentId", "==", student.uid)
    );

    const existingAttendance = await getDocs(attendanceQuery);

    if (!existingAttendance.empty) {
      return { success: false, message: "Already Recorded" };
    }

    await addDoc(collection(db, "attendance"), {
      sessionId: baseSessionId,
      studentId: student.uid,
      studentEmail: student.email,
      courseId: sessionData.courseId,
      professorId: sessionData.professorId,
      recordedAt: serverTimestamp(),
    });

    return { success: true, message: "Attendance Successful" };

  } catch (error: any) {
    console.error("Error recording attendance:", error);
    return { success: false, message: error.message || "Server Error" };
  }
};