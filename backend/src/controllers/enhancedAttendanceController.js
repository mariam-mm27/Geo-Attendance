/**
 * Enhanced Attendance Controller with Real-time Warning Integration
 * Triggers instant warnings when attendance is recorded
 */

import { db } from "../config/firebase.js";
import { realtimeWarningService } from "../services/realtimeWarning.service.js";
import { sendWarningEmailAndNotification, wasWarningSentRecently } from "../services/autoNotificationEmail.service.js";
import {
  collection,
  addDoc,
  doc,
  getDoc,
  query,
  where,
  getDocs,
} from "firebase/firestore";

/**
 * Record attendance and trigger real-time warnings
 * This is the main function that should be called when attendance is recorded
 */
export const recordAttendanceWithWarnings = async (studentId, sessionId, sessionData = null) => {
  try {
    console.log(`📝 Recording attendance for student ${studentId} in session ${sessionId}`);

    // Get session data if not provided
    if (!sessionData) {
      const sessionDoc = await getDoc(doc(db, "sessions", sessionId));
      if (!sessionDoc.exists()) {
        throw new Error("Session not found");
      }
      sessionData = { id: sessionDoc.id, ...sessionDoc.data() };
    }

    // Check if attendance already exists
    const existingAttendance = await getDocs(
      query(
        collection(db, "attendance"),
        where("studentId", "==", studentId),
        where("sessionId", "==", sessionId)
      )
    );

    if (!existingAttendance.empty) {
      console.log(`⚠️ Attendance already recorded for student ${studentId} in session ${sessionId}`);
      return {
        success: false,
        message: "Attendance already recorded for this session",
        alreadyRecorded: true
      };
    }

    // Record attendance
    const attendanceRecord = {
      studentId,
      sessionId,
      courseId: sessionData.courseId,
      timestamp: new Date(),
      status: "present",
      sessionDate: sessionData.date || new Date(),
      recordedAt: new Date()
    };

    const attendanceDoc = await addDoc(collection(db, "attendance"), attendanceRecord);
    console.log(`✅ Attendance recorded: ${attendanceDoc.id}`);

    // Trigger real-time warning check
    console.log(`🚀 Triggering real-time warning check for student ${studentId} in course ${sessionData.courseId}`);
    
    const warningResult = await realtimeWarningService.processAttendanceEvent(
      studentId,
      sessionData.courseId,
      sessionId,
      'attendance_recorded'
    );

    console.log(`📊 Warning result:`, warningResult);

    // If warning was sent, also send email and notification
    if (warningResult.success && warningResult.warningLevel) {
      try {
        console.log(`\n📧 Sending email and notification for ${warningResult.warningLevel}...`);
        
        // Calculate metrics for notification
        const metrics = {
          totalSessions: warningResult.attendanceData?.totalSessions || 0,
          attendedSessions: warningResult.attendanceData?.attendedSessions || 0,
          missedSessions: warningResult.attendanceData?.missedSessions || 0,
          attendanceRate: warningResult.attendanceData?.attendanceRate || 0,
          absenceRate: warningResult.attendanceData?.absenceRate || 0
        };

        // Send email and notification
        const notificationResult = await sendWarningEmailAndNotification(
          studentId,
          sessionData.courseId,
          metrics,
          warningResult.warningLevel
        );

        warningResult.emailAndNotificationSent = notificationResult.success;
      } catch (notificationError) {
        console.error('⚠️ Error sending email/notification:', notificationError.message);
        // Don't fail attendance recording if notification fails
      }
    }

    return {
      success: true,
      attendanceId: attendanceDoc.id,
      attendanceRecord: { id: attendanceDoc.id, ...attendanceRecord },
      warningResult: warningResult,
      message: "Attendance recorded successfully"
    };

  } catch (error) {
    console.error("❌ Error recording attendance with warnings:", error);
    return {
      success: false,
      error: error.message,
      message: "Failed to record attendance"
    };
  }
};

/**
 * Record absence (when student misses a session)
 * This can be called by background jobs to record absences
 */
export const recordAbsenceWithWarnings = async (studentId, sessionId, sessionData = null) => {
  try {
    console.log(`❌ Recording absence for student ${studentId} in session ${sessionId}`);

    // Get session data if not provided
    if (!sessionData) {
      const sessionDoc = await getDoc(doc(db, "sessions", sessionId));
      if (!sessionDoc.exists()) {
        throw new Error("Session not found");
      }
      sessionData = { id: sessionDoc.id, ...sessionDoc.data() };
    }

    // Check if attendance already exists
    const existingAttendance = await getDocs(
      query(
        collection(db, "attendance"),
        where("studentId", "==", studentId),
        where("sessionId", "==", sessionId)
      )
    );

    if (!existingAttendance.empty) {
      console.log(`⚠️ Attendance already recorded for student ${studentId} in session ${sessionId}`);
      return {
        success: false,
        message: "Attendance already recorded for this session",
        alreadyRecorded: true
      };
    }

    // Record absence
    const absenceRecord = {
      studentId,
      sessionId,
      courseId: sessionData.courseId,
      timestamp: new Date(),
      status: "absent",
      sessionDate: sessionData.date || new Date(),
      recordedAt: new Date(),
      absenceReason: "automatic" // Can be updated with manual reason
    };

    const absenceDoc = await addDoc(collection(db, "attendance"), absenceRecord);
    console.log(`✅ Absence recorded: ${absenceDoc.id}`);

    // Trigger real-time warning check
    console.log(`🚀 Triggering real-time warning check for absence - student ${studentId} in course ${sessionData.courseId}`);
    
    const warningResult = await realtimeWarningService.processAttendanceEvent(
      studentId,
      sessionData.courseId,
      sessionId,
      'absence_recorded'
    );

    console.log(`📊 Warning result:`, warningResult);

    return {
      success: true,
      attendanceId: absenceDoc.id,
      absenceRecord: { id: absenceDoc.id, ...absenceRecord },
      warningResult: warningResult,
      message: "Absence recorded successfully"
    };

  } catch (error) {
    console.error("❌ Error recording absence with warnings:", error);
    return {
      success: false,
      error: error.message,
      message: "Failed to record absence"
    };
  }
};

/**
 * Enhanced QR code scanning with real-time warnings
 * Replaces the original attendanceController
 */
export const enhancedAttendanceController = async (studentId, scannedQRValue) => {
  try {
    console.log(`📱 QR Code scanned by student ${studentId}: ${scannedQRValue}`);

    // Parse QR code to get session ID
    const sessionId = parseQRCode(scannedQRValue);
    if (!sessionId) {
      return {
        success: false,
        message: "Invalid QR code format"
      };
    }

    // Get session data
    const sessionDoc = await getDoc(doc(db, "sessions", sessionId));
    if (!sessionDoc.exists()) {
      return {
        success: false,
        message: "Session not found"
      };
    }

    const sessionData = { id: sessionDoc.id, ...sessionDoc.data() };

    // Check if session is active
    const now = new Date();
    const startTime = sessionData.startTime?.toDate?.() || new Date(sessionData.startTime);
    const endTime = sessionData.endTime?.toDate?.() || new Date(sessionData.endTime);

    if (now < startTime) {
      return {
        success: false,
        message: "Session has not started yet"
      };
    }

    if (now > endTime) {
      return {
        success: false,
        message: "Session has already ended"
      };
    }

    // Record attendance with warnings
    const result = await recordAttendanceWithWarnings(studentId, sessionId, sessionData);

    return result;

  } catch (error) {
    console.error("❌ Error in enhanced attendance controller:", error);
    return {
      success: false,
      error: error.message,
      message: "Failed to process attendance"
    };
  }
};

/**
 * Parse QR code to extract session ID
 * Adjust this based on your QR code format
 */
function parseQRCode(qrValue) {
  try {
    // Example formats:
    // "session:abc123"
    // "SESSION_ID:abc123"
    // "https://yourapp.com/session/abc123"
    // Just "abc123"
    
    if (qrValue.startsWith("session:")) {
      return qrValue.replace("session:", "");
    }
    
    if (qrValue.startsWith("SESSION_ID:")) {
      return qrValue.replace("SESSION_ID:", "");
    }
    
    if (qrValue.includes("/session/")) {
      const parts = qrValue.split("/session/");
      return parts[parts.length - 1];
    }
    
    // Assume it's just the session ID
    return qrValue;
    
  } catch (error) {
    console.error("Error parsing QR code:", error);
    return null;
  }
}

/**
 * Batch process attendance for multiple students
 * Useful for bulk operations or background processing
 */
export const batchProcessAttendance = async (attendanceRecords) => {
  try {
    console.log(`📦 Processing ${attendanceRecords.length} attendance records in batch`);

    const results = [];
    
    for (const record of attendanceRecords) {
      const { studentId, sessionId, status } = record;
      
      try {
        let result;
        
        if (status === "present") {
          result = await recordAttendanceWithWarnings(studentId, sessionId);
        } else if (status === "absent") {
          result = await recordAbsenceWithWarnings(studentId, sessionId);
        } else {
          result = {
            success: false,
            message: `Invalid status: ${status}`
          };
        }
        
        results.push({
          studentId,
          sessionId,
          status,
          ...result
        });
        
      } catch (error) {
        results.push({
          studentId,
          sessionId,
          status,
          success: false,
          error: error.message
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.length - successCount;

    console.log(`✅ Batch processing completed: ${successCount} success, ${failureCount} failures`);

    return {
      success: true,
      total: attendanceRecords.length,
      successCount,
      failureCount,
      results
    };

  } catch (error) {
    console.error("❌ Error in batch attendance processing:", error);
    return {
      success: false,
      error: error.message,
      message: "Failed to process batch attendance"
    };
  }
};

/**
 * Get attendance statistics for a student in a course
 */
export const getAttendanceStats = async (studentId, courseId) => {
  try {
    const attendanceQuery = query(
      collection(db, "attendance"),
      where("studentId", "==", studentId),
      where("courseId", "==", courseId)
    );

    const attendanceSnapshot = await getDocs(attendanceQuery);
    const attendanceRecords = attendanceSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    const totalSessions = attendanceRecords.length;
    const presentSessions = attendanceRecords.filter(r => r.status === "present").length;
    const absentSessions = attendanceRecords.filter(r => r.status === "absent").length;
    const attendanceRate = totalSessions > 0 ? (presentSessions / totalSessions) * 100 : 0;
    const absenceRate = totalSessions > 0 ? (absentSessions / totalSessions) * 100 : 0;

    return {
      success: true,
      data: {
        studentId,
        courseId,
        totalSessions,
        presentSessions,
        absentSessions,
        attendanceRate: parseFloat(attendanceRate.toFixed(2)),
        absenceRate: parseFloat(absenceRate.toFixed(2)),
        records: attendanceRecords
      }
    };

  } catch (error) {
    console.error("❌ Error getting attendance stats:", error);
    return {
      success: false,
      error: error.message,
      message: "Failed to get attendance statistics"
    };
  }
};

// Export the enhanced controller to replace the original
export const attendanceController = enhancedAttendanceController;
