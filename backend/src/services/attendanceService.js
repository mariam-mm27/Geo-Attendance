import { db } from "../firebase";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc
} from "firebase/firestore";

/* =========================
   calculateStudentAttendance
========================= */
export const calculateStudentAttendance = async (courseId, studentId) => {
  try {
    const courseRef = doc(db, "courses", courseId);
    const courseSnap = await getDoc(courseRef);
    
    if (!courseSnap.exists()) {
      throw new Error("Course not found");
    }
    
    let totalSessions = courseSnap.data().totalSessions;
    
    if (!totalSessions) {
      const sessionsQuery = query(
        collection(db, "sessions"),
        where("courseId", "==", courseId)
      );
      const sessionsSnap = await getDocs(sessionsQuery);
      totalSessions = sessionsSnap.size;
    }
    
    const attendanceQuery = query(
      collection(db, "attendance"),
      where("courseId", "==", courseId),
      where("studentId", "==", studentId)
    );
    
    const attendanceSnap = await getDocs(attendanceQuery);
    const attendedSessions = attendanceSnap.size;
    
    const percentage = totalSessions > 0 
      ? (attendedSessions / totalSessions) * 100 
      : 0;
    
    const studentRef = doc(db, "users", studentId);
    const studentSnap = await getDoc(studentRef);
    const studentData = studentSnap.exists() ? studentSnap.data() : {};
    
    return {
      success: true,
      data: {
        studentId,
        studentName: studentData.name || "Unknown",
        attendedSessions,
        totalSessions,
        percentage: percentage.toFixed(2),
        status: percentage >= 75 ? "Good" : percentage >= 50 ? "Warning" : "Low"
      }
    };
    
  } catch (error) {
    console.error("Error calculating student attendance:", error);
    return {
      success: false,
      error: error.message
    };
  }
};

/* =========================
   calculateCourseAttendanceStats
========================= */
export const calculateCourseAttendanceStats = async (courseId) => {
  try {
    const courseRef = doc(db, "courses", courseId);
    const courseSnap = await getDoc(courseRef);
    
    if (!courseSnap.exists()) {
      throw new Error("Course not found");
    }
    
    const courseData = courseSnap.data();
    
    const sessionsQuery = query(
      collection(db, "sessions"),
      where("courseId", "==", courseId)
    );
    const sessionsSnap = await getDocs(sessionsQuery);
    const totalSessions = sessionsSnap.size;
    
    if (totalSessions === 0) {
      return {
        success: true,
        data: {
          avgAttendance: 0,
          message: "No sessions yet"
        }
      };
    }
    
    const studentIds = courseData.enrolledStudents || [];
    
    if (studentIds.length === 0) {
      return {
        success: true,
        data: {
          avgAttendance: 0,
          message: "No students enrolled"
        }
      };
    }
    
    let totalPercentage = 0;
    
    for (const studentId of studentIds) {
      const attendanceQuery = query(
        collection(db, "attendance"),
        where("courseId", "==", courseId),
        where("studentId", "==", studentId)
      );
      
      const attendanceSnap = await getDocs(attendanceQuery);
      const attended = attendanceSnap.size;
      const percentage = (attended / totalSessions) * 100;
      totalPercentage += percentage;
    }
    
    const avgAttendance = totalPercentage / studentIds.length;
    
    return {
      success: true,
      data: {
        avgAttendance: avgAttendance.toFixed(2)
      }
    };
    
  } catch (error) {
    console.error("Error calculating course stats:", error);
    return {
      success: false,
      error: error.message
    };
  }
};

/* =========================
   getStudentAttendanceHistory
========================= */
export const getStudentAttendanceHistory = async (courseId, studentId) => {
  try {
    const sessionsQuery = query(
      collection(db, "sessions"),
      where("courseId", "==", courseId)
    );
    const sessionsSnap = await getDocs(sessionsQuery);
    
    const sessions = [];
    
    for (const sessionDoc of sessionsSnap.docs) {
      const sessionData = sessionDoc.data();
      
      const attendanceQuery = query(
        collection(db, "attendance"),
        where("sessionId", "==", sessionDoc.id),
        where("studentId", "==", studentId)
      );
      
      const attendanceSnap = await getDocs(attendanceQuery);
      const attended = attendanceSnap.size > 0;
      
      sessions.push({
        sessionId: sessionDoc.id,
        date: sessionData.createdAt?.toDate?.() || sessionData.createdAt,
        attended
      });
    }
    
    return {
      success: true,
      data: sessions.sort((a, b) => new Date(b.date) - new Date(a.date))
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
};