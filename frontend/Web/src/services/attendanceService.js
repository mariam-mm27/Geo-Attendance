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
   calculateStudentAttendance (Updated with Enrollment Date)
========================= */
export const calculateStudentAttendance = async (courseId, studentId) => {
  try {
    const courseRef = doc(db, "courses", courseId);
    const courseSnap = await getDoc(courseRef);
    
    if (!courseSnap.exists()) {
      throw new Error("Course not found");
    }
    
    // Get enrollment date for this student in this course
    const enrollmentQuery = query(
      collection(db, "enrollments"),
      where("studentId", "==", studentId),
      where("courseId", "==", courseId)
    );
    const enrollmentSnap = await getDocs(enrollmentQuery);
    
    let enrollmentDate = null;
    if (!enrollmentSnap.empty) {
      const enrollmentData = enrollmentSnap.docs[0].data();
      enrollmentDate = enrollmentData.enrolledAt?.toDate?.() || enrollmentData.enrolledAt;
      console.log(`📅 Student ${studentId} enrolled on:`, enrollmentDate);
    } else {
      console.log(`⚠️ No enrollment record found for student ${studentId} in course ${courseId}`);
    }
    
    // Get all sessions for this course
    const sessionsQuery = query(
      collection(db, "sessions"),
      where("courseId", "==", courseId)
    );
    const sessionsSnap = await getDocs(sessionsQuery);
    
    // Filter sessions to only count those after enrollment date
    let totalSessions = 0;
    let sessionsAfterEnrollment = [];
    
    sessionsSnap.forEach((sessionDoc) => {
      const sessionData = sessionDoc.data();
      const sessionDate = sessionData.createdAt?.toDate?.() || sessionData.createdAt;
      
      console.log(`🎓 Session ${sessionData.sessionId}: created on ${sessionDate}, enrollment: ${enrollmentDate}`);
      
      // If no enrollment date found, count all sessions (backward compatibility)
      // If enrollment date exists, only count sessions after enrollment
      if (!enrollmentDate || sessionDate >= enrollmentDate) {
        totalSessions++;
        sessionsAfterEnrollment.push(sessionData.sessionId);
        console.log(`✅ Session ${sessionData.sessionId} counted (after enrollment)`);
      } else {
        console.log(`❌ Session ${sessionData.sessionId} excluded (before enrollment)`);
      }
    });
    
    console.log(`📊 Total sessions after enrollment: ${totalSessions} (out of ${sessionsSnap.size} total)`);
    
    // If no sessions after enrollment, student should have 100% attendance
    if (totalSessions === 0) {
      console.log(`✅ No sessions after enrollment - student has perfect attendance`);
      return {
        success: true,
        data: {
          studentId,
          studentName: studentData.name || "Unknown",
          attendedSessions: 0,
          totalSessions: 0,
          percentage: "100.00", // Perfect attendance if no sessions to attend
          status: "Good",
          enrollmentDate: enrollmentDate,
          sessionsBeforeEnrollment: sessionsSnap.size
        }
      };
    }
    
    // Get attendance records for sessions after enrollment
    const attendanceQuery = query(
      collection(db, "attendance"),
      where("courseId", "==", courseId),
      where("studentId", "==", studentId)
    );
    
    const attendanceSnap = await getDocs(attendanceQuery);
    let attendedSessions = 0;
    
    // Count only attendance for sessions after enrollment
    attendanceSnap.forEach((attendanceDoc) => {
      const attendanceData = attendanceDoc.data();
      if (sessionsAfterEnrollment.includes(attendanceData.sessionId)) {
        attendedSessions++;
      }
    });
    
    console.log(`✅ Attended sessions after enrollment: ${attendedSessions}`);
    
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
        status: percentage >= 75 ? "Good" : percentage >= 50 ? "Warning" : "Low",
        enrollmentDate: enrollmentDate,
        sessionsBeforeEnrollment: sessionsSnap.size - totalSessions
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
    
    const sessionsQuery = query(
      collection(db, "sessions"),
      where("courseId", "==", courseId)
    );
    const sessionsSnap = await getDocs(sessionsQuery);
    
    console.log('📚 Total sessions found:', sessionsSnap.size);
    
    const sessions = [];
    
    for (const sessionDoc of sessionsSnap.docs) {
      const sessionData = sessionDoc.data();
      const sessionId = sessionData.sessionId;
      
      console.log(`📅 Session ${sessionId}:`, sessionData);
      
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
      const duration = sessionData.duration || 10;
      const expiresAt = new Date(createdAt.getTime() + duration * 60 * 1000);
      
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

/* =========================
   recordAttendanceWeb
========================= */
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
    
    // Check session expiry
    const createdAt = sessionData.createdAt?.toDate();
    const duration = sessionData.duration || 10;
    const expiresAt = new Date(createdAt.getTime() + duration * 60 * 1000);
    
    if (new Date() > expiresAt) {
      return {
        success: false,
        message: "Session has expired"
      };
    }

    // Enhanced conflict checking - Check for overlapping sessions
    const sessionStartTime = sessionData.createdAt?.toDate();
    const sessionDuration = sessionData.duration || 15;
    const sessionEndTime = new Date(sessionStartTime.getTime() + sessionDuration * 60 * 1000);

    console.log(`🕐 Current session time: ${sessionStartTime.toLocaleTimeString()} - ${sessionEndTime.toLocaleTimeString()}`);

    const allActiveSessionsQuery = query(
      collection(db, "sessions"),
      where("active", "==", true)
    );
    const allActiveSessionsSnap = await getDocs(allActiveSessionsQuery);

    // Check if student has already attended any session during this time period
    for (const activeSessionDoc of allActiveSessionsSnap.docs) {
      const activeSessionData = activeSessionDoc.data();
      
      // Skip the current session we're trying to attend
      if (activeSessionData.sessionId === sessionId) continue;

      const activeSessionStartTime = activeSessionData.createdAt?.toDate();
      const activeSessionDuration = activeSessionData.duration || 15;
      const activeSessionEndTime = new Date(activeSessionStartTime.getTime() + activeSessionDuration * 60 * 1000);

      // Check if sessions overlap in time
      const sessionsOverlap = (
        (sessionStartTime >= activeSessionStartTime && sessionStartTime < activeSessionEndTime) ||
        (sessionEndTime > activeSessionStartTime && sessionEndTime <= activeSessionEndTime) ||
        (sessionStartTime <= activeSessionStartTime && sessionEndTime >= activeSessionEndTime)
      );

      if (sessionsOverlap) {
        // Check if student has already attended this overlapping session
        const conflictingAttendanceQuery = query(
          collection(db, "attendance"),
          where("sessionId", "==", activeSessionData.sessionId),
          where("studentId", "==", studentId)
        );

        const conflictingAttendanceSnap = await getDocs(conflictingAttendanceQuery);
        
        if (!conflictingAttendanceSnap.empty) {
          // Get course name for better error message
          const conflictingCourseRef = doc(db, "courses", activeSessionData.courseId);
          const conflictingCourseSnap = await getDoc(conflictingCourseRef);
          const conflictingCourseName = conflictingCourseSnap.exists() ? 
            conflictingCourseSnap.data().name : "Another course";

          console.log(`❌ Student already attended ${conflictingCourseName} during overlapping time`);
          return {
            success: false,
            message: `Already attended ${conflictingCourseName} during this time slot`
          };
        }
      }
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

    // Trigger email alert check
    try {
      const API_BASE_URL = "http://localhost:3000/api";
      await fetch(`${API_BASE_URL}/email/trigger-on-attendance`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ studentId, courseId }),
      });
    } catch (error) {
      console.error("Error triggering email check:", error);
    }
    
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

/* =========================
   getCourseReport
========================= */
export const getCourseReport = async (courseId) => {
  try {
    console.log("📊 Generating course report for:", courseId);

    const courseRef = doc(db, "courses", courseId);
    const courseSnap = await getDoc(courseRef);

    if (!courseSnap.exists()) {
      throw new Error("Course not found");
    }

    const courseData = courseSnap.data();
    const students = courseData.enrolledStudents || [];

    const sessionsQuery = query(
      collection(db, "sessions"),
      where("courseId", "==", courseId)
    );
    const sessionsSnap = await getDocs(sessionsQuery);
    const totalSessions = sessionsSnap.size;

    const attendanceQuery = query(
      collection(db, "attendance"),
      where("courseId", "==", courseId)
    );
    const attendanceSnap = await getDocs(attendanceQuery);

    const totalStudents = students.length;
    let attendanceMap = {};

    attendanceSnap.forEach((doc) => {
      const data = doc.data();
      if (!attendanceMap[data.studentId]) {
        attendanceMap[data.studentId] = 0;
      }
      attendanceMap[data.studentId]++;
    });

    let totalAttendancePercentage = 0;
    let absentStudents = 0;

    students.forEach((studentId) => {
      const attended = attendanceMap[studentId] || 0;
      const percentage =
        totalSessions > 0 ? (attended / totalSessions) * 100 : 0;

      totalAttendancePercentage += percentage;

      if (percentage < 75) {
        absentStudents++;
      }
    });

    const averageAttendance =
      totalStudents > 0
        ? (totalAttendancePercentage / totalStudents).toFixed(2)
        : "0.00";

    return {
      success: true,
      data: {
        totalStudents,
        totalSessions,
        averageAttendance,
        absentStudents,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
};