import { db } from "../firebase";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  addDoc,
  serverTimestamp
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
    console.log('📊 Calculating course stats for:', courseId);
    
    const courseRef = doc(db, "courses", courseId);
    const courseSnap = await getDoc(courseRef);
    
    if (!courseSnap.exists()) {
      throw new Error("Course not found");
    }
    
    const courseData = courseSnap.data();
    console.log('📚 Course data:', courseData.name, courseData.code);
    
    const sessionsQuery = query(
      collection(db, "sessions"),
      where("courseId", "==", courseId)
    );
    const sessionsSnap = await getDocs(sessionsQuery);
    const totalSessions = sessionsSnap.size;
    
    console.log(`🎓 Total sessions: ${totalSessions}`);
    
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
    console.log(`👥 Enrolled students: ${studentIds.length}`);
    
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
      console.log(`  👤 Student ${studentId}: ${attended}/${totalSessions} = ${percentage.toFixed(2)}%`);
    }
    
    const avgAttendance = totalPercentage / studentIds.length;
    console.log(`✅ Average attendance: ${avgAttendance.toFixed(2)}%`);
    
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
    console.log('🔍 Fetching history for:', { courseId, studentId });
    
    // Get all sessions for this course
    const sessionsQuery = query(
      collection(db, "sessions"),
      where("courseId", "==", courseId)
    );
    const sessionsSnap = await getDocs(sessionsQuery);
    
    console.log('📚 Total sessions found:', sessionsSnap.size);
    
    const sessions = [];
    
    for (const sessionDoc of sessionsSnap.docs) {
      const sessionData = sessionDoc.data();
      const sessionId = sessionData.sessionId; // Use the sessionId field, not document ID
      
      console.log(`📅 Session ${sessionId}:`, sessionData);
      
      // Check if student attended this session using the sessionId field
      const attendanceQuery = query(
        collection(db, "attendance"),
        where("sessionId", "==", sessionId),
        where("studentId", "==", studentId)
      );
      
      const attendanceSnap = await getDocs(attendanceQuery);
      const attended = attendanceSnap.size > 0;
      
      let recordedAt = null;
      if (attended && attendanceSnap.docs.length > 0) {
        const attendanceData = attendanceSnap.docs[0].data();
        recordedAt = attendanceData.recordedAt?.toDate?.() || attendanceData.recordedAt;
      }
      
      console.log(`   👤 Attended: ${attended}, Recorded at:`, recordedAt);
      
      sessions.push({
        sessionId: sessionId,
        lectureNumber: sessionData.lectureNumber,
        date: sessionData.createdAt?.toDate?.() || sessionData.createdAt,
        attended,
        recordedAt
      });
    }
    
    // Sort by date, newest first
    const sorted = sessions.sort((a, b) => new Date(b.date) - new Date(a.date));
    console.log('✅ Final history:', sorted);
    
    return {
      success: true,
      data: sorted
    };
    
  } catch (error) {
    console.error('❌ Error in getStudentAttendanceHistory:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/* =========================
   validateEnrollment
========================= */
export const validateEnrollment = async (studentId, courseId) => {
  try {
    const courseRef = doc(db, "courses", courseId);
    const courseSnap = await getDoc(courseRef);
    
    if (!courseSnap.exists()) {
      return { valid: false, message: "Course not found" };
    }
    
    const courseData = courseSnap.data();
    const enrolledStudents = courseData.enrolledStudents || [];
    
    if (!enrolledStudents.includes(studentId)) {
      return { valid: false, message: "You are not enrolled in this course" };
    }
    
    return { valid: true };
  } catch (error) {
    console.error("Error validating enrollment:", error);
    return { valid: false, message: "Server error" };
  }
};

/* =========================
   getActiveSessions
========================= */
export const getActiveSessions = async (courseId) => {
  try {
    const sessionsQuery = query(
      collection(db, "sessions"),
      where("courseId", "==", courseId),
      where("active", "==", true)
    );
    
    const sessionsSnap = await getDocs(sessionsQuery);
    const activeSessions = [];
    const now = new Date();
    
    for (const sessionDoc of sessionsSnap.docs) {
      const sessionData = sessionDoc.data();
      const createdAt = sessionData.createdAt?.toDate();
      const duration = sessionData.duration || 10; // default 10 minutes
      const expiresAt = new Date(createdAt.getTime() + duration * 60 * 1000);
      
      // Only include sessions that haven't expired
      if (now <= expiresAt) {
        activeSessions.push({
          id: sessionDoc.id,
          sessionId: sessionData.sessionId,
          lectureNumber: sessionData.lectureNumber,
          createdAt: createdAt,
          expiresAt: expiresAt,
          duration: duration,
          courseId: sessionData.courseId,
          professorId: sessionData.professorId
        });
      }
    }
    
    return {
      success: true,
      data: activeSessions
    };
  } catch (error) {
    console.error("Error fetching active sessions:", error);
    return {
      success: false,
      error: error.message
    };
  }
};

/* =========================
   calculateOverallStudentAttendance
========================= */
export const calculateOverallStudentAttendance = async (studentId) => {
  try {
    console.log('🔍 Calculating overall attendance for student:', studentId);
    
    // Get all courses the student is enrolled in
    const coursesSnapshot = await getDocs(collection(db, "courses"));
    const enrolledCourses = [];
    
    coursesSnapshot.forEach((courseDoc) => {
      const courseData = courseDoc.data();
      if ((courseData.enrolledStudents || []).includes(studentId)) {
        enrolledCourses.push(courseDoc.id);
        console.log('✅ Student enrolled in course:', courseDoc.id, courseData.name);
      }
    });
    
    console.log(`📚 Total enrolled courses: ${enrolledCourses.length}`);
    
    if (enrolledCourses.length === 0) {
      return {
        success: true,
        data: {
          overallPercentage: "0.00",
          totalCourses: 0,
          totalSessions: 0,
          totalAttended: 0
        }
      };
    }
    
    let totalSessions = 0;
    let totalAttended = 0;
    
    // Calculate attendance for each course
    for (const courseId of enrolledCourses) {
      const result = await calculateStudentAttendance(courseId, studentId);
      if (result.success) {
        console.log(`📊 Course ${courseId}: ${result.data.attendedSessions}/${result.data.totalSessions}`);
        totalSessions += result.data.totalSessions;
        totalAttended += result.data.attendedSessions;
      }
    }
    
    const overallPercentage = totalSessions > 0 
      ? ((totalAttended / totalSessions) * 100).toFixed(2)
      : "0.00";
    
    console.log(`🎯 Overall: ${totalAttended}/${totalSessions} = ${overallPercentage}%`);
    
    return {
      success: true,
      data: {
        overallPercentage,
        totalCourses: enrolledCourses.length,
        totalSessions,
        totalAttended
      }
    };
  } catch (error) {
    console.error("Error calculating overall student attendance:", error);
    return {
      success: false,
      error: error.message
    };
  }
};

/* =========================
   calculateOverallProfessorAttendance
========================= */
export const calculateOverallProfessorAttendance = async (professorId, professorEmail) => {
  try {
    // Get all courses assigned to this professor
    const coursesSnapshot = await getDocs(collection(db, "courses"));
    const professorCourses = [];
    
    coursesSnapshot.forEach((courseDoc) => {
      const courseData = courseDoc.data();
      const courseProfEmail = courseData.professorEmail?.toLowerCase();
      const userEmail = professorEmail?.toLowerCase();
      
      if (courseData.professorId === professorId || 
          courseProfEmail === userEmail ||
          courseData.professorEmail === professorEmail) {
        professorCourses.push(courseDoc.id);
      }
    });
    
    if (professorCourses.length === 0) {
      return {
        success: true,
        data: {
          overallPercentage: "0.00",
          totalCourses: 0
        }
      };
    }
    
    let totalPercentage = 0;
    let coursesWithData = 0;
    
    // Calculate average attendance across all courses
    for (const courseId of professorCourses) {
      const result = await calculateCourseAttendanceStats(courseId);
      if (result.success && result.data.avgAttendance) {
        totalPercentage += parseFloat(result.data.avgAttendance);
        coursesWithData++;
      }
    }
    
    const overallPercentage = coursesWithData > 0 
      ? (totalPercentage / coursesWithData).toFixed(2)
      : "0.00";
    
    return {
      success: true,
      data: {
        overallPercentage,
        totalCourses: professorCourses.length
      }
    };
  } catch (error) {
    console.error("Error calculating overall professor attendance:", error);
    return {
      success: false,
      error: error.message
    };
  }
};
export const recordAttendanceWeb = async (courseId, sessionId, studentId) => {
  try {
    // Validate enrollment
    const enrollmentCheck = await validateEnrollment(studentId, courseId);
    if (!enrollmentCheck.valid) {
      return {
        success: false,
        message: enrollmentCheck.message
      };
    }
    
    // Find the session
    const sessionsQuery = query(
      collection(db, "sessions"),
      where("sessionId", "==", sessionId)
    );
    
    const sessionsSnap = await getDocs(sessionsQuery);
    
    if (sessionsSnap.empty) {
      return {
        success: false,
        message: "Session not found"
      };
    }
    
    const sessionDoc = sessionsSnap.docs[0];
    const sessionData = sessionDoc.data();
    
    // Check if session is active
    if (sessionData.active === false) {
      return {
        success: false,
        message: "Session is not active"
      };
    }
    
    // Check session expiry (duration in minutes)
    const createdAt = sessionData.createdAt?.toDate();
    const duration = sessionData.duration || 10; // default 10 minutes
    const expiresAt = new Date(createdAt.getTime() + duration * 60 * 1000);
    
    if (new Date() > expiresAt) {
      return {
        success: false,
        message: "Session has expired"
      };
    }
    
    // Check for duplicate attendance
    const attendanceQuery = query(
      collection(db, "attendance"),
      where("sessionId", "==", sessionId),
      where("studentId", "==", studentId)
    );
    
    const existingAttendance = await getDocs(attendanceQuery);
    
    if (!existingAttendance.empty) {
      return {
        success: false,
        message: "Attendance already recorded for this session"
      };
    }
    
    // Record attendance
    await addDoc(collection(db, "attendance"), {
      sessionId: sessionId,
      studentId: studentId,
      courseId: courseId,
      professorId: sessionData.professorId,
      recordedAt: serverTimestamp()
    });
    
    return {
      success: true,
      message: "Attendance recorded successfully"
    };
    
  } catch (error) {
    console.error("Error recording attendance:", error);
    return {
      success: false,
      message: "Server error"
    };
  }
};
