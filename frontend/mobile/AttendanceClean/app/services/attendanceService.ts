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

    const createdAt = sessionData.createdAt?.toDate();
    const duration = sessionData.duration || 10; 
    const expiresAt = new Date(createdAt.getTime() + duration * 60 * 1000);
    if (new Date() > expiresAt) return { success: false, message: "Session Expired" };

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
    return null;
  }
};