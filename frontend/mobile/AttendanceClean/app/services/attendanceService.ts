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
 * Get enrollment date for a student in a specific course
 */
export const getEnrollmentDate = async (studentId: string, courseId: string) => {
  try {
    const enrollmentQuery = query(
      collection(db, "enrollments"),
      where("studentId", "==", studentId),
      where("courseId", "==", courseId)
    );
    const enrollmentSnapshot = await getDocs(enrollmentQuery);

    if (!enrollmentSnapshot.empty) {
      const enrollmentData = enrollmentSnapshot.docs[0].data();
      return enrollmentData.enrolledAt?.toDate?.() || enrollmentData.enrolledAt;
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
export const calculateAttendanceFromEnrollment = async (studentId: string, courseId: string) => {
  try {
    // Get enrollment date
    const enrollmentDate = await getEnrollmentDate(studentId, courseId);
    console.log(`📅 Student ${studentId} enrolled on:`, enrollmentDate);

    // Get all sessions for this course
    const sessionsQuery = query(
      collection(db, "sessions"),
      where("courseId", "==", courseId)
    );
    const sessionsSnapshot = await getDocs(sessionsQuery);

    // Filter sessions to only count those after enrollment date
    let totalSessions = 0;
    let sessionsAfterEnrollment: string[] = [];

    sessionsSnapshot.forEach((sessionDoc) => {
      const sessionData = sessionDoc.data();
      const sessionDate = sessionData.createdAt?.toDate?.() || sessionData.createdAt;

      // If no enrollment date found, count all sessions (backward compatibility)
      // If enrollment date exists, only count sessions after enrollment
      if (!enrollmentDate || !sessionDate || sessionDate >= enrollmentDate) {
        totalSessions++;
        sessionsAfterEnrollment.push(sessionData.sessionId);
      }
    });

    console.log(`📊 Total sessions after enrollment: ${totalSessions} (out of ${sessionsSnapshot.size} total)`);

    // Get attendance records for sessions after enrollment
    const attendanceQuery = query(
      collection(db, "attendance"),
      where("studentId", "==", studentId),
      where("courseId", "==", courseId)
    );
    const attendanceSnapshot = await getDocs(attendanceQuery);

    let attendedSessions = 0;

    // Count only attendance for sessions after enrollment
    attendanceSnapshot.forEach((attendanceDoc) => {
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
export const isSessionLiveNow = (session: any) => {
  const now = new Date();

  const createdAt =
    session.createdAt?.toDate?.() || new Date(session.createdAt);

  const duration = session.duration || 10;

  const expiresAt = new Date(
    createdAt.getTime() + duration * 60 * 1000
  );

  return (
    session.active === true &&
    now >= createdAt &&
    now <= expiresAt
  );
};


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

    if (sessionData.active === false) return { success: false, message: "Session Expired" };

    // Check session expiry (duration in minutes)
    if (!isSessionLiveNow(sessionData)) {
  return { success: false, message: "Session is not active now" };
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
    return { success: false, message: "Server Error" };
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

export const getCourseReport = async (courseId: string) => {
  try {
    // 1️⃣ Get all students in course
    const enrollmentsQuery = query(
      collection(db, "enrollments"),
      where("courseId", "==", courseId)
    );

    const enrollmentsSnap = await getDocs(enrollmentsQuery);
    const students = enrollmentsSnap.docs.map(doc => doc.data().studentId);

    const totalStudents = students.length;

    // 2️⃣ Get all sessions of this course
    const sessionsQuery = query(
      collection(db, "sessions"),
      where("courseId", "==", courseId)
    );

    const sessionsSnap = await getDocs(sessionsQuery);
    const totalSessions = sessionsSnap.size;

    // 3️⃣ Get attendance records
    const attendanceQuery = query(
      collection(db, "attendance"),
      where("courseId", "==", courseId)
    );

    const attendanceSnap = await getDocs(attendanceQuery);

    // 4️⃣ Count attendance per student
    const attendanceMap: { [key: string]: number } = {};

    attendanceSnap.docs.forEach(doc => {
      const data = doc.data();
      const studentId = data.studentId;

      if (!attendanceMap[studentId]) {
        attendanceMap[studentId] = 0;
      }

      attendanceMap[studentId]++;
    });

    // 5️⃣ Calculate average attendance
    let totalAttendancePercent = 0;
    let absentStudents = 0;

    students.forEach(studentId => {
      const attended = attendanceMap[studentId] || 0;

      const percent =
        totalSessions === 0 ? 0 : (attended / totalSessions) * 100;

      totalAttendancePercent += percent;

      if (percent < 75) {
        absentStudents++;
      }
    });

    const averageAttendance =
      totalStudents === 0
        ? 0
        : totalAttendancePercent / totalStudents;

    return {
      totalStudents,
      totalSessions,
      averageAttendance: Math.round(averageAttendance),
      absentStudents,
    };

  } catch (error) {
    console.error("Error generating report:", error);

    return {
      totalStudents: 0,
      totalSessions: 0,
      averageAttendance: 0,
      absentStudents: 0,
    };
  }
};
export const getActiveSessionsForProfessor = async (professorId: string) => {
  try {
    const q = query(
      collection(db, "sessions"),
      where("professorId", "==", professorId),
      where("active", "==", true)
    );

    const snap = await getDocs(q);

    const activeSessions: any[] = [];

    snap.forEach((doc) => {
      const data = doc.data();

      if (isSessionLiveNow(data)) {
        activeSessions.push({
          id: doc.id,
          ...data,
        });
      }
    });

    return {
      success: true,
      data: activeSessions,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
    };
  }
};
export const filterCoursesByCurrentTime = (courses: any[]) => {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  return courses.filter((course: any) => {
    if (!course.schedule || !Array.isArray(course.schedule)) return false;

    return course.schedule.some((slot: any) => {
      const parseTime = (t: string) => {
        const clean = t.replace(/"/g, "").trim();
        const [h, m] = clean.split(":").map(Number);
        return h * 60 + m;
      };

      const start = parseTime(slot.startTime);
      const end = parseTime(slot.endTime);

      // حالة عادية: 10:00 - 12:00
      if (end > start) {
        return currentMinutes >= start && currentMinutes <= end;
      }

      // حالة midnight: 22:00 - 00:00
      // end بيبقى 0 أو أصغر من start
      return currentMinutes >= start || currentMinutes <= end;
    });
  });
};
