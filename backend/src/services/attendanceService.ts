import { db } from "../config/firebase.js";

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

    // Check for concurrent attendance
    const allActiveSessionsSnapshot = await db
      .collection("sessions")
      .where("active", "==", true)
      .get();
    
    for (const activeSessionDoc of allActiveSessionsSnapshot.docs) {
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
        const otherAttendanceSnapshot = await db
          .collection("attendance")
          .where("sessionId", "==", activeSessionId)
          .where("studentId", "==", studentId)
          .get();
        
        if (!otherAttendanceSnapshot.empty) {
          const conflictCourseDoc = await db
            .collection("courses")
            .doc(activeSessionData.courseId)
            .get();

          const conflictCourseName = conflictCourseDoc.exists
            ? conflictCourseDoc.data()?.name
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
    await db.collection("attendance").add({
      sessionId: baseSessionId,
      studentId,
      studentEmail,
      courseId: sessionData.courseId,
      professorId: sessionData.professorId,
      recordedAt: new Date(),
    });

    // Trigger email alert check after recording attendance
    try {
      // Import the email service function
      const { checkAndSendAbsenceAlertDirect } = await import("../services/email-direct.service.js");
      const alertResult = await checkAndSendAbsenceAlertDirect(studentId, sessionData.courseId);
      
      if (alertResult.emailSent) {
        console.log(`📧 Automatic email alert sent: ${alertResult.alertLevel} to ${alertResult.recipient}`);
      } else if (alertResult.success) {
        console.log(`✅ Attendance check completed: ${alertResult.message}`);
      } else {
        console.error(`⚠️ Email alert check failed: ${alertResult.error}`);
      }
    } catch (error) {
      console.error("Error triggering automatic email alert:", error);
      // Don't fail attendance recording if email trigger fails
    }

    return { success: true, message: "Attendance Successful" };

  } catch (error: any) {
    console.error("Error recording attendance:", error);
    return { success: false, message: error.message || "Server Error" };
  }
};
