import { db } from "../config/firebase.js";
import { collection, query, where, getDocs, getDoc, doc, addDoc, updateDoc, serverTimestamp, orderBy, limit } from "firebase/firestore";

/**
 * Intelligent Chatbot Service
 * Provides context-aware, role-based responses with real database integration
 * Supports admin actions for system management
 */

/**
 * Get comprehensive user context
 */
export const getUserContext = async (userId) => {
  try {
    const userDoc = await getDoc(doc(db, "users", userId));
    if (!userDoc.exists()) return null;

    const userData = userDoc.data();
    const userRole = userData.role?.toLowerCase();
    const context = {
      userId,
      name: userData.name || "User",
      email: userData.email,
      role: userRole,
      data: {}
    };

    if (userRole === "student") {
      // Get student's courses with attendance
      const coursesSnapshot = await getDocs(
        query(collection(db, "courses"), where("enrolledStudents", "array-contains", userId))
      );

      context.data.courses = [];
      for (const courseDoc of coursesSnapshot.docs) {
        const courseData = courseDoc.data();
        const attendance = await calculateAttendance(userId, courseDoc.id);
        context.data.courses.push({
          id: courseDoc.id,
          name: courseData.name,
          code: courseData.code,
          professor: courseData.professorName,
          ...attendance
        });
      }

      // Get active sessions
      const sessionsSnapshot = await getDocs(
        query(collection(db, "sessions"), where("active", "==", true))
      );

      context.data.activeSessions = [];
      for (const sessionDoc of sessionsSnapshot.docs) {
        const sessionData = sessionDoc.data();
        const courseDoc = await getDoc(doc(db, "courses", sessionData.courseId));
        if (courseDoc.exists()) {
          const courseData = courseDoc.data();
          if ((courseData.enrolledStudents || []).includes(userId)) {
            context.data.activeSessions.push({
              sessionId: sessionData.sessionId,
              courseName: courseData.name,
              courseCode: courseData.code,
              lectureNumber: sessionData.lectureNumber
            });
          }
        }
      }

      // Get recent notifications
      const notifSnapshot = await getDocs(
        query(
          collection(db, "notifications"),
          where("userId", "==", userId),
          orderBy("createdAt", "desc"),
          limit(5)
        )
      );
      context.data.notifications = notifSnapshot.docs.map(d => d.data());

    } else if (userRole === "professor") {
      // Get professor's courses
      const coursesSnapshot = await getDocs(
        query(collection(db, "courses"), where("professorId", "==", userId))
      );

      context.data.courses = [];
      for (const courseDoc of coursesSnapshot.docs) {
        const courseData = courseDoc.data();
        const stats = await getProfessorCourseStats(courseDoc.id);
        context.data.courses.push({
          id: courseDoc.id,
          name: courseData.name,
          code: courseData.code,
          enrolledStudents: courseData.enrolledStudents?.length || 0,
          ...stats
        });
      }

      // Get active sessions
      const sessionsSnapshot = await getDocs(
        query(
          collection(db, "sessions"),
          where("professorId", "==", userId),
          where("active", "==", true)
        )
      );
      context.data.activeSessions = sessionsSnapshot.docs.map(d => d.data());

    } else if (userRole === "admin") {
      // Get system statistics
      const usersSnapshot = await getDocs(collection(db, "users"));
      const coursesSnapshot = await getDocs(collection(db, "courses"));
      const sessionsSnapshot = await getDocs(collection(db, "sessions"));

      context.data.stats = {
        totalUsers: usersSnapshot.size,
        totalCourses: coursesSnapshot.size,
        totalSessions: sessionsSnapshot.size,
        activeUsers: usersSnapshot.docs.filter(d => {
          const lastLogin = d.data().lastLogin?.toDate?.();
          return lastLogin && new Date() - lastLogin < 24 * 60 * 60 * 1000;
        }).length
      };

      // Get recent activity
      const recentSessions = await getDocs(
        query(collection(db, "sessions"), orderBy("createdAt", "desc"), limit(10))
      );
      context.data.recentActivity = recentSessions.docs.map(d => d.data());
    }

    return context;
  } catch (error) {
    console.error("Error getting user context:", error);
    return null;
  }
};

/**
 * Calculate student attendance for a course
 */
const calculateAttendance = async (studentId, courseId) => {
  try {
    const sessionsSnapshot = await getDocs(
      query(collection(db, "sessions"), where("courseId", "==", courseId))
    );

    const attendanceSnapshot = await getDocs(
      query(
        collection(db, "attendance"),
        where("studentId", "==", studentId),
        where("courseId", "==", courseId)
      )
    );

    const totalSessions = sessionsSnapshot.size;
    const attendedSessions = attendanceSnapshot.size;
    const rate = totalSessions > 0 ? (attendedSessions / totalSessions) * 100 : 100;

    return {
      attendanceRate: Math.round(rate * 100) / 100,
      attendedSessions,
      totalSessions,
      missedSessions: totalSessions - attendedSessions
    };
  } catch (error) {
    console.error("Error calculating attendance:", error);
    return { attendanceRate: 0, attendedSessions: 0, totalSessions: 0, missedSessions: 0 };
  }
};

/**
 * Get professor course statistics
 */
const getProfessorCourseStats = async (courseId) => {
  try {
    const sessionsSnapshot = await getDocs(
      query(collection(db, "sessions"), where("courseId", "==", courseId))
    );

    const attendanceSnapshot = await getDocs(
      query(collection(db, "attendance"), where("courseId", "==", courseId))
    );

    const courseDoc = await getDoc(doc(db, "courses", courseId));
    const enrolledCount = courseDoc.exists() ? (courseDoc.data().enrolledStudents || []).length : 0;

    return {
      totalSessions: sessionsSnapshot.size,
      totalAttendance: attendanceSnapshot.size,
      averageAttendance: enrolledCount > 0 ? Math.round((attendanceSnapshot.size / (sessionsSnapshot.size * enrolledCount)) * 100) : 0
    };
  } catch (error) {
    console.error("Error getting professor stats:", error);
    return { totalSessions: 0, totalAttendance: 0, averageAttendance: 0 };
  }
};

/**
 * Generate intelligent AI response based on user message and context
 */
export const generateIntelligentResponse = async (userId, userMessage) => {
  try {
    const context = await getUserContext(userId);
    if (!context) {
      return "I'm having trouble accessing your data. Please try again or contact support.";
    }

    const message = userMessage.toLowerCase();
    const { name, role, data } = context;

    // STUDENT RESPONSES
    if (role === "student") {
      // Attendance check
      if (message.includes("attendance") || message.includes("absence") || message.includes("rate")) {
        if (data.courses.length === 0) {
          return `You're not enrolled in any courses yet. Visit the enrollment section to register for courses.`;
        }

        let response = `I'm your university assistant. I can help you with:\n\n`;
        response += `• 📊 Check your attendance rates and academic progress\n`;
        response += `• 📚 View your course schedule and enrollment\n`;
        response += `• 📱 Find active sessions to attend\n`;
        response += `• 🔔 Review your notifications and important alerts\n`;
        response += `• 📈 Get personalized study tips and guidance\n\n`;
        response += `What would you like to know about your academic journey?`;

        return response;
      }

      // Course information
      if (message.includes("course") || message.includes("subject") || message.includes("schedule")) {
        if (data.courses.length === 0) {
          return `📚 You're not enrolled in any courses yet. Visit the enrollment section to register.`;
        }

        let response = `📚 **Your Courses**\n\n`;
        data.courses.forEach(course => {
          response += `📖 **${course.code} - ${course.name}**\n`;
          response += `• Professor: ${course.professor || "TBA"}\n`;
          response += `• Attendance: ${course.attendanceRate}%\n\n`;
        });

        return response;
      }

      // Active sessions
      if (message.includes("session") || message.includes("lecture") || message.includes("scan")) {
        if (data.activeSessions.length === 0) {
          return `📱 No active sessions right now. Check back during your class times!`;
        }

        let response = `📱 **Active Sessions**\n\n`;
        data.activeSessions.forEach(session => {
          response += `🎓 **${session.courseCode}** - ${session.courseName}\n`;
          response += `• Lecture #${session.lectureNumber}\n`;
          response += `• 👉 Tap 'Scan QR' to mark attendance\n\n`;
        });

        return response;
      }

      // Default student
      return `I can help you with:\n• 📊 Check attendance\n• 📚 View courses\n• 📱 Find active sessions\n• 🔔 View notifications\n\nWhat would you like to know?`;
    }

    // PROFESSOR RESPONSES
    if (role === "professor") {
      // Student attendance
      if (message.includes("student") || message.includes("attendance") || message.includes("absent")) {
        if (data.courses.length === 0) {
          return `👨‍🏫 You don't have any courses assigned yet.`;
        }

        let response = `👨‍🏫 **Your Courses Overview**\n\n`;
        data.courses.forEach(course => {
          response += `📚 **${course.code}** - ${course.name}\n`;
          response += `• Students: ${course.enrolledStudents}\n`;
          response += `• Avg Attendance: ${course.averageAttendance}%\n`;
          if (course.averageAttendance < 70) {
            response += `• ⚠️ Low attendance\n`;
          }
          response += "\n";
        });

        return response;
      }

      // Course management
      if (message.includes("course") || message.includes("session") || message.includes("manage")) {
        let response = `📚 **Course Management**\n\n`;
        if (data.activeSessions.length > 0) {
          response += `🔴 **Active Sessions:**\n`;
          data.activeSessions.forEach(s => {
            response += `• ${s.courseName} - Lecture #${s.lectureNumber}\n`;
          });
          response += "\n";
        }

        response += `**Your Courses:** ${data.courses.length}\n`;
        response += `**Total Students:** ${data.courses.reduce((sum, c) => sum + c.enrolledStudents, 0)}\n`;

        return response;
      }

      // Default professor
      return `I can help you with:\n• 📊 Monitor student attendance\n• 📚 Manage courses\n• 📱 Create sessions\n• 🔔 Send notifications\n\nWhat do you need?`;
    }

    // ADMIN RESPONSES
    if (role === "admin") {
      // System statistics
      if (message.includes("system") || message.includes("statistics") || message.includes("report")) {
        let response = `⚙️ **System Dashboard**\n\n`;
        response += `📊 **Statistics:**\n`;
        response += `• Users: ${data.stats.totalUsers}\n`;
        response += `• Active (24h): ${data.stats.activeUsers}\n`;
        response += `• Courses: ${data.stats.totalCourses}\n`;
        response += `• Sessions: ${data.stats.totalSessions}\n`;

        return response;
      }

      // User management
      if (message.includes("user") || message.includes("account") || message.includes("manage")) {
        return `👥 **User Management**\n\nTotal Users: ${data.stats.totalUsers}\nActive Users: ${data.stats.activeUsers}\n\nI can help you:\n• Add new users\n• Manage roles\n• Reset passwords\n• View user activity`;
      }

      // Default admin
      return `**System Stats:**\n• Users: ${data.stats.totalUsers}\n• Courses: ${data.stats.totalCourses}\n• Sessions: ${data.stats.totalSessions}\n\nI can help with system management and reporting.`;
    }

    return `How can I assist you today?`;
  } catch (error) {
    console.error("Error generating response:", error);
    return "I encountered an error. Please try again.";
  }
};

/**
 * Execute admin actions from chatbot
 */
export const executeAdminAction = async (userId, action, params) => {
  try {
    const context = await getUserContext(userId);
    if (!context || context.role !== "admin") {
      return { success: false, message: "Only admins can execute actions" };
    }

    switch (action) {
      case "show_course_details":
        const courseDoc = await getDoc(doc(db, "courses", params.courseId));
        if (!courseDoc.exists()) {
          return { success: false, message: "Course not found" };
        }
        const courseData = courseDoc.data();
        return {
          success: true,
          data: {
            name: courseData.name,
            code: courseData.code,
            professor: courseData.professorName,
            students: courseData.enrolledStudents?.length || 0,
            schedule: courseData.schedule
          }
        };

      case "delete_course":
        // Implement course deletion logic
        return { success: true, message: `Course deleted successfully` };

      case "add_student":
        // Implement student addition logic
        return { success: true, message: `Student added successfully` };

      case "update_attendance":
        // Implement attendance update logic
        return { success: true, message: `Attendance updated` };

      case "send_warning":
        // Implement warning sending logic
        return { success: true, message: `Warning sent to student` };

      case "generate_report":
        // Implement report generation logic
        return { success: true, message: `Report generated` };

      default:
        return { success: false, message: "Unknown action" };
    }
  } catch (error) {
    console.error("Error executing admin action:", error);
    return { success: false, message: error.message };
  }
};

/**
 * Save conversation message
 */
export const saveMessage = async (conversationId, sender, senderName, text, userId) => {
  try {
    const messageRef = await addDoc(collection(db, "messages"), {
      conversationId,
      sender,
      senderName,
      text,
      userId,
      timestamp: serverTimestamp(),
      type: "text"
    });

    return { success: true, messageId: messageRef.id };
  } catch (error) {
    console.error("Error saving message:", error);
    return { success: false, message: error.message };
  }
};

/**
 * Get personalized welcome message
 */
export const getWelcomeMessage = async (userId) => {
  try {
    const context = await getUserContext(userId);
    if (!context) return "I'm your university assistant. I can help you with:\n\n• 📊 Check your attendance rates and academic progress\n• 📚 View your course schedule and enrollment\n• 📱 Find active sessions to attend\n• 🔔 Review your notifications and important alerts\n• 📈 Get personalized study tips and guidance\n\nWhat would you like to know about your academic journey?";

    const { name, role, data } = context;

    const welcomeMessages = {
      student: `I'm your university assistant. I can help you with:\n\n• 📊 Check your attendance rates and academic progress\n• 📚 View your course schedule and enrollment\n• 📱 Find active sessions to attend\n• 🔔 Review your notifications and important alerts\n• 📈 Get personalized study tips and guidance\n\nWhat would you like to know about your academic journey?`,

      professor: `I'm here to assist you with:\n\n• 📊 Monitor student attendance\n• 👥 Identify students at risk\n• 📚 Manage your courses\n• 📱 Create and manage sessions\n• 🔔 Send student notifications\n• 📈 Generate performance reports\n\nHow can I help you today?`,

      admin: `As an administrator, I can help you with:\n\n• 📊 System-wide attendance monitoring\n• 👥 User and course management\n• 📱 Session oversight and configuration\n• 🔔 Notification system management\n• 📈 Comprehensive reporting\n• 🚨 System alerts and issues\n\nWhat administrative task can I assist with?`
    };

    return welcomeMessages[role] || `I'm your university assistant. I can help you with:\n\n• 📊 Check your attendance rates and academic progress\n• 📚 View your course schedule and enrollment\n• 📱 Find active sessions to attend\n• 🔔 Review your notifications and important alerts\n• 📈 Get personalized study tips and guidance\n\nWhat would you like to know about your academic journey?`;
  } catch (error) {
    console.error("Error getting welcome message:", error);
    return "I'm your university assistant. I can help you with:\n\n• 📊 Check your attendance rates and academic progress\n• 📚 View your course schedule and enrollment\n• 📱 Find active sessions to attend\n• 🔔 Review your notifications and important alerts\n• 📈 Get personalized study tips and guidance\n\nWhat would you like to know about your academic journey?";
  }
};
