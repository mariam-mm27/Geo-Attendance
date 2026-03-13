import { db } from "../config/firebase.js";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc
} from "firebase/firestore";

/* =========================
   1️⃣ calculateStudentAttendance
   مدخلات: courseId, studentId
   مخرجات: نسبة حضور الطالب + تفاصيل
========================= */
export const calculateStudentAttendance = async (courseId, studentId) => {
  try {
    // 1. نجيب إجمالي المحاضرات من ال course
    const courseRef = doc(db, "courses", courseId);
    const courseSnap = await getDoc(courseRef);
    
    if (!courseSnap.exists()) {
      throw new Error("Course not found");
    }
    
    // إجمالي المحاضرات (المفروض محسوب في course document)
    // لو مش موجود، نجيبه من sessions collection
    let totalSessions = courseSnap.data().totalSessions;
    
    // لو totalSessions مش موجود في ال course، نجيبه من sessions
    if (!totalSessions) {
      const sessionsQuery = query(
        collection(db, "sessions"),
        where("courseId", "==", courseId)
      );
      const sessionsSnap = await getDocs(sessionsQuery);
      totalSessions = sessionsSnap.size;
    }
    
    // 2. نجيب عدد المحاضرات اللي حضرها الطالب
    const attendanceQuery = query(
      collection(db, "attendance"),
      where("courseId", "==", courseId),
      where("studentId", "==", studentId)
    );
    
    const attendanceSnap = await getDocs(attendanceQuery);
    const attendedSessions = attendanceSnap.size;
    
    // 3. نحسب النسبة
    const percentage = totalSessions > 0 
      ? (attendedSessions / totalSessions) * 100 
      : 0;
    
    // 4. نجيب بيانات الطالب (اختياري)
    const studentRef = doc(db, "users", studentId);
    const studentSnap = await getDoc(studentRef);
    const studentData = studentSnap.exists() ? studentSnap.data() : {};
    
    return {
      success: true,
      data: {
        studentId,
        studentName: studentData.name || "Unknown",
        studentEmail: studentData.email,
        courseId,
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
   2️⃣ calculateCourseAttendanceStats
   مدخلات: courseId
   مخرجات: إحصائيات الكورس
========================= */
export const calculateCourseAttendanceStats = async (courseId) => {
  try {
    // 1. نجيب بيانات الكورس
    const courseRef = doc(db, "courses", courseId);
    const courseSnap = await getDoc(courseRef);
    
    if (!courseSnap.exists()) {
      throw new Error("Course not found");
    }
    
    const courseData = courseSnap.data();
    
    // 2. نجيب كل المحاضرات بتاعة الكورس
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
          courseId,
          courseName: courseData.CourseName,
          totalSessions: 0,
          avgAttendance: 0,
          students: [],
          message: "No sessions yet"
        }
      };
    }
    
    // 3. نجيب كل الطلاب في الكورس
    // (مفروض في array students جوه الكورس)
    const studentIds = courseData.students || [];
    
    if (studentIds.length === 0) {
      return {
        success: true,
        data: {
          courseId,
          courseName: courseData.CourseName,
          totalSessions,
          avgAttendance: 0,
          students: [],
          message: "No students enrolled"
        }
      };
    }
    
    // 4. لكل طالب نحسب نسبته
    const studentsStats = [];
    let totalPercentage = 0;
    
    for (const studentId of studentIds) {
      // نجيب حضور الطالب
      const attendanceQuery = query(
        collection(db, "attendance"),
        where("courseId", "==", courseId),
        where("studentId", "==", studentId)
      );
      
      const attendanceSnap = await getDocs(attendanceQuery);
      const attended = attendanceSnap.size;
      const percentage = (attended / totalSessions) * 100;
      
      // نجيب بيانات الطالب
      const studentRef = doc(db, "users", studentId);
      const studentSnap = await getDoc(studentRef);
      const studentData = studentSnap.exists() ? studentSnap.data() : {};
      
      studentsStats.push({
        studentId,
        studentName: studentData.name || "Unknown",
        studentEmail: studentData.email,
        attended,
        totalSessions,
        percentage: percentage.toFixed(2),
        status: percentage >= 75 ? "Good" : percentage >= 50 ? "Warning" : "Low"
      });
      
      totalPercentage += percentage;
    }
    
    // 5. حساب متوسط الحضور
    const avgAttendance = totalPercentage / studentsStats.length;
    
    // 6. إحصائيات إضافية
    const goodStudents = studentsStats.filter(s => parseFloat(s.percentage) >= 75).length;
    const warningStudents = studentsStats.filter(s => parseFloat(s.percentage) >= 50 && parseFloat(s.percentage) < 75).length;
    const lowStudents = studentsStats.filter(s => parseFloat(s.percentage) < 50).length;
    
    return {
      success: true,
      data: {
        courseId,
        courseName: courseData.CourseName,
        totalSessions,
        totalStudents: studentsStats.length,
        avgAttendance: avgAttendance.toFixed(2),
        stats: {
          good: goodStudents,
          warning: warningStudents,
          low: lowStudents
        },
        students: studentsStats.sort((a, b) => b.attended - a.attended) // ترتيب تنازلي
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
   3️⃣ getCourseAttendanceSummary
   (مفيدة للـ Dashboard)
========================= */
export const getCourseAttendanceSummary = async (courseId) => {
  try {
    const result = await calculateCourseAttendanceStats(courseId);
    
    if (!result.success) {
      return result;
    }
    
    // نبسط البيانات للـ dashboard
    const data = result.data;
    
    return {
      success: true,
      data: {
        courseName: data.courseName,
        totalStudents: data.totalStudents,
        avgAttendance: data.avgAttendance,
        attendanceRate: `${data.avgAttendance}%`,
        stats: data.stats,
        chartData: data.students.map(s => ({
          name: s.studentName,
          attendance: parseFloat(s.percentage)
        }))
      }
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
};

/* =========================
   4️⃣ getStudentAttendanceHistory
   (تاريخ حضور الطالب في كورس معين)
========================= */
export const getStudentAttendanceHistory = async (courseId, studentId) => {
  try {
    // نجيب كل جلسات الكورس
    const sessionsQuery = query(
      collection(db, "sessions"),
      where("courseId", "==", courseId)
    );
    const sessionsSnap = await getDocs(sessionsQuery);
    
    const sessions = [];
    
    // لكل session نشوف الطالب حضر ولا لا
    for (const sessionDoc of sessionsSnap.docs) {
      const sessionData = sessionDoc.data();
      
      // نشوف لو الطالب حضر
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
        attended,
        duration: sessionData.duration
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
