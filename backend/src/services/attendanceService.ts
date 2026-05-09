import { db } from "../config/firebase.js";
import { checkAndSendAbsenceAlertDirect } from "../services/email-direct.service.js";
import { processAttendanceRecorded } from "../services/warningSystemBridge.js";
import { sendWarningEmailNow, calculateMetrics, determineWarningLevel, wasWarningSentRecently } from "../services/instantEmail.service.js";

/**
 * Get enrollment date for a student in a specific course
 */
const getEnrollmentDate = async (studentId: string, courseId: string) => {
  try {
    const enrollmentSnapshot = await db
      .collection("enrollments")
      .where("studentId", "==", studentId)
      .where("courseId", "==", courseId)
      .get();

    if (!enrollmentSnapshot.empty) {
      const enrollmentData = enrollmentSnapshot.docs[0].data();
      return enrollmentData.enrolledAt?.toDate() || enrollmentData.enrolledAt;
    }
    return null;
  } catch (error) {
    console.error("Error getting enrollment date:", error);
    return null;
  }
};

/**
 * Calculate attendance based on enrollment date
 */
const calculateAttendanceFromEnrollment = async (studentId: string, courseId: string) => {
  try {
    // Get enrollment date
    const enrollmentDate = await getEnrollmentDate(studentId, courseId);
    console.log(`📅 Student ${studentId} enrolled on:`, enrollmentDate);

    // Get all sessions for this course
    const sessionsSnapshot = await db
      .collection("sessions")
      .where("courseId", "==", courseId)
      .get();

    // Filter sessions to only count those after enrollment date
    let totalSessions = 0;
    let sessionsAfterEnrollment: string[] = [];

    sessionsSnapshot.forEach((sessionDoc: any) => {
      const sessionData = sessionDoc.data();
      const sessionDate = sessionData.createdAt?.toDate();

      // If no enrollment date found, count all sessions (backward compatibility)
      // If enrollment date exists, only count sessions after enrollment
      if (!enrollmentDate || !sessionDate || sessionDate >= enrollmentDate) {
        totalSessions++;
        sessionsAfterEnrollment.push(sessionData.sessionId);
      }
    });

    console.log(`📊 Total sessions after enrollment: ${totalSessions} (out of ${sessionsSnapshot.size} total)`);

    // Get attendance records for sessions after enrollment
    const attendanceSnapshot = await db
      .collection("attendance")
      .where("courseId", "==", courseId)
      .where("studentId", "==", studentId)
      .get();

    let attendedSessions = 0;

    // Count only attendance for sessions after enrollment
    attendanceSnapshot.forEach((attendanceDoc: any) => {
      const attendanceData = attendanceDoc.data();
      if (sessionsAfterEnrollment.includes(attendanceData.sessionId)) {
        attendedSessions++;
      }
    });

    console.log(`✅ Attended sessions after enrollment: ${attendedSessions}`);

    const attendanceRate = totalSessions > 0 ? (attendedSessions / totalSessions) * 100 : 100;
    const absenceRate = 100 - attendanceRate;
    const missedSessions = totalSessions - attendedSessions;

    return {
      attendanceRate,
      absenceRate,
      attendedSessions,
      totalSessions,
      missedSessions,
      enrollmentDate,
      sessionsBeforeEnrollment: sessionsSnapshot.size - totalSessions
    };
  } catch (error) {
    console.error("Error calculating attendance from enrollment:", error);
    return null;
  }
};

export const recordAttendance = async (
  scannedQRValue: string,
  studentId: string,
  studentEmail: string
) => {
  try {
    const baseSessionId = scannedQRValue.split("-").slice(0, 2).join("-");

    // Get session
    const sessionsSnapshot = await db
      .collection("sessions")
      .where("sessionId", "==", baseSessionId)
      .get();

    if (sessionsSnapshot.empty) {
      return { success: false, message: "Session not found" };
    }

    const sessionDoc = sessionsSnapshot.docs[0];
    const sessionData = sessionDoc.data();

    // Check if student is enrolled
    const courseDoc = await db.collection("courses").doc(sessionData.courseId).get();
    
    if (!courseDoc.exists) {
      return { success: false, message: "Course not found" };
    }
    
    const courseData = courseDoc.data();
    const enrolledStudents = courseData?.enrolledStudents || [];
    
    if (!enrolledStudents.includes(studentId)) {
      return { success: false, message: "Not Enrolled in Course" };
    }

    const now = new Date();

    // Check for concurrent attendance - Enhanced conflict detection
    const sessionStartTime = sessionData.createdAt?.toDate();
    const sessionDuration = sessionData.duration || 15; // Default 15 minutes
    
    if (!sessionStartTime) {
      return { success: false, message: "Invalid session time" };
    }
    
    const sessionEndTime = new Date(sessionStartTime.getTime() + sessionDuration * 60 * 1000);

    console.log(`🕐 Current session time: ${sessionStartTime.toLocaleTimeString()} - ${sessionEndTime.toLocaleTimeString()}`);

    const allActiveSessionsSnapshot = await db
      .collection("sessions")
      .where("active", "==", true)
      .get();
    
    // Check if student has already attended any session during this time period
    for (const activeSessionDoc of allActiveSessionsSnapshot.docs) {
      const activeSessionData = activeSessionDoc.data();
      
      // Skip the current session we're trying to attend
      if (activeSessionData.sessionId === baseSessionId) continue;

      const activeSessionStartTime = activeSessionData.createdAt?.toDate();
      const activeSessionDuration = activeSessionData.duration || 15;
      
      if (!activeSessionStartTime) continue;
      
      const activeSessionEndTime = new Date(activeSessionStartTime.getTime() + activeSessionDuration * 60 * 1000);

      // Check if sessions overlap in time
      const sessionsOverlap = (
        (sessionStartTime >= activeSessionStartTime && sessionStartTime < activeSessionEndTime) ||
        (sessionEndTime > activeSessionStartTime && sessionEndTime <= activeSessionEndTime) ||
        (sessionStartTime <= activeSessionStartTime && sessionEndTime >= activeSessionEndTime)
      );

      if (sessionsOverlap) {
        // Check if student has already attended this overlapping session
        const conflictingAttendanceSnapshot = await db
          .collection("attendance")
          .where("sessionId", "==", activeSessionData.sessionId)
          .where("studentId", "==", studentId)
          .get();
        
        if (!conflictingAttendanceSnapshot.empty) {
          // Get course name for better error message
          const conflictingCourseDoc = await db
            .collection("courses")
            .doc(activeSessionData.courseId)
            .get();

          const conflictingCourseName = conflictingCourseDoc.exists
            ? conflictingCourseDoc.data()?.name
            : "Another course";

          console.log(`❌ Student already attended ${conflictingCourseName} during overlapping time`);
          return { 
            success: false, 
            message: `Already attended ${conflictingCourseName} during this time slot` 
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

    // Check if already recorded
    const existingAttendanceSnapshot = await db
      .collection("attendance")
      .where("sessionId", "==", baseSessionId)
      .where("studentId", "==", studentId)
      .get();

    if (!existingAttendanceSnapshot.empty) {
      return { success: false, message: "Already Recorded" };
    }

    // Record attendance
    const attendanceRef = await db.collection("attendance").add({
      sessionId: baseSessionId,
      studentId,
      studentEmail,
      courseId: sessionData.courseId,
      professorId: sessionData.professorId,
      recordedAt: new Date(),
      timestamp: new Date(),
    });

    console.log(`✅ Attendance recorded with ID: ${attendanceRef.id}`);

    // Send warning email immediately (synchronous)
    try {
      console.log(`📧 Checking for warnings to send...`);
      
      const metrics = await calculateMetrics(studentId, sessionData.courseId);
      if (metrics) {
        const warningLevel = determineWarningLevel(metrics.absenceRate);
        
        if (warningLevel) {
          const alreadySent = await wasWarningSentRecently(studentId, sessionData.courseId, warningLevel);
          
          if (!alreadySent) {
            const student = await db.collection('users').doc(studentId).get();
            const course = await db.collection('courses').doc(sessionData.courseId).get();
            
            if (student.exists && course.exists) {
              const emailResult = await sendWarningEmailNow(
                student.data().email,
                student.data().name || student.data().email,
                course.data().name,
                metrics,
                warningLevel
              );
              
              if (emailResult.success) {
                console.log(`✅ ${warningLevel} email sent to ${student.data().email}`);
              } else {
                console.error(`❌ Failed to send email: ${emailResult.error}`);
              }
            }
          } else {
            console.log(`⏰ ${warningLevel} already sent within 24 hours, skipping`);
          }
        } else {
          console.log(`✅ Attendance OK - no warning needed`);
        }
      }
    } catch (error) {
      console.error("❌ Error sending warning email:", error);
      // Don't fail attendance recording if email fails
    }

    return { success: true, message: "Attendance Successful" };

  } catch (error: any) {
    console.error("Error recording attendance:", error);
    return { success: false, message: error.message || "Server Error" };
  }
};
