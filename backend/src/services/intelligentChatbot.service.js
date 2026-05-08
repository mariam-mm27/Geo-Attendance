import { db } from "../config/firebase.js";

// ── Admin SDK helpers (same API as Client SDK) ──
const getDoc = async (ref) => ref.get();
const getDocs = async (q) => q.get();
const collection = (_, name) => db.collection(name);
const doc = (_, col, id) => db.collection(col).doc(id);
const addDoc = async (colRef, data) => colRef.add(data);
const serverTimestamp = () => new Date();
const where = (field, op, value) => ({ field, op, value });
const orderBy = (field, dir = "asc") => ({ field, dir, _type: "orderBy" });
const limit = (n) => ({ n, _type: "limit" });

const query = (colRef, ...constraints) => {
  let q = colRef;
  for (const c of constraints) {
    if (!c) continue;
    if (c._type === "orderBy") q = q.orderBy(c.field, c.dir);
    else if (c._type === "limit") q = q.limit(c.n);
    else if (c.field !== undefined && c.op !== undefined) q = q.where(c.field, c.op, c.value);
  }
  return q;
};

/**
 * Intelligent Chatbot Service
 */

export const getUserContext = async (userId) => {
  try {
    if (!userId) throw new Error("USER_ID_MISSING: User ID is required to fetch context");

    const userDoc = await db.collection("users").doc(userId).get();
    if (!userDoc.exists) throw new Error(`USER_NOT_FOUND: No user found with ID ${userId}`);

    const userData = userDoc.data();
    const userRole = userData.role?.toLowerCase();

    if (!userRole) throw new Error("USER_ROLE_MISSING: User role is not defined in the database");

    const context = {
      userId,
      name: userData.name || "User",
      email: userData.email,
      role: userRole,
      data: {}
    };

    if (userRole === "student") {
      try {
        const coursesSnapshot = await db.collection("courses")
          .where("enrolledStudents", "array-contains", userId).get();

        context.data.courses = [];
        for (const courseDoc of coursesSnapshot.docs) {
          const courseData = courseDoc.data();
          const attendance = await calculateAttendance(userId, courseDoc.id);
          context.data.courses.push({
            id: courseDoc.id,
            name: courseData.name || "Unnamed Course",
            code: courseData.code || "N/A",
            professor: courseData.professorName || "TBA",
            ...attendance
          });
        }
      } catch (error) {
        throw new Error(`COURSES_FETCH_FAILED: Unable to retrieve courses - ${error.message}`);
      }

      try {
        const sessionsSnapshot = await db.collection("sessions").where("active", "==", true).get();
        context.data.activeSessions = [];
        for (const sessionDoc of sessionsSnapshot.docs) {
          const sessionData = sessionDoc.data();
          if (!sessionData.courseId) continue;
          const courseDoc = await db.collection("courses").doc(sessionData.courseId).get();
          if (courseDoc.exists) {
            const courseData = courseDoc.data();
            if ((courseData.enrolledStudents || []).includes(userId)) {
              context.data.activeSessions.push({
                sessionId: sessionData.sessionId || sessionDoc.id,
                courseName: courseData.name || "Unknown Course",
                courseCode: courseData.code || "N/A",
                lectureNumber: sessionData.lectureNumber || 1
              });
            }
          }
        }
      } catch (error) {
        context.data.activeSessions = [];
      }

      try {
        const notifSnapshot = await db.collection("notifications")
          .where("userId", "==", userId)
          .orderBy("createdAt", "desc")
          .limit(5).get();
        context.data.notifications = notifSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      } catch (error) {
        context.data.notifications = [];
      }

    } else if (userRole === "professor") {
      try {
        const coursesSnapshot = await db.collection("courses")
          .where("professorId", "==", userId).get();

        context.data.courses = [];
        for (const courseDoc of coursesSnapshot.docs) {
          const courseData = courseDoc.data();
          const stats = await getProfessorCourseStats(courseDoc.id);
          context.data.courses.push({
            id: courseDoc.id,
            name: courseData.name || "Unnamed Course",
            code: courseData.code || "N/A",
            enrolledStudents: courseData.enrolledStudents?.length || 0,
            ...stats
          });
        }
      } catch (error) {
        throw new Error(`PROFESSOR_COURSES_FETCH_FAILED: Unable to retrieve assigned courses - ${error.message}`);
      }

      try {
        const sessionsSnapshot = await db.collection("sessions")
          .where("professorId", "==", userId)
          .where("active", "==", true).get();
        context.data.activeSessions = sessionsSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      } catch (error) {
        context.data.activeSessions = [];
      }

    } else if (userRole === "admin") {
      try {
        const usersSnapshot = await db.collection("users").get();
        const coursesSnapshot = await db.collection("courses").get();
        const sessionsSnapshot = await db.collection("sessions").get();

        context.data.stats = {
          totalUsers: usersSnapshot.size,
          totalCourses: coursesSnapshot.size,
          totalSessions: sessionsSnapshot.size,
          activeUsers: usersSnapshot.docs.filter(d => {
            const lastLogin = d.data().lastLogin?.toDate?.();
            return lastLogin && new Date() - lastLogin < 24 * 60 * 60 * 1000;
          }).length
        };

        const recentSessions = await db.collection("sessions")
          .orderBy("createdAt", "desc").limit(10).get();
        context.data.recentActivity = recentSessions.docs.map(d => ({ id: d.id, ...d.data() }));
      } catch (error) {
        throw new Error(`ADMIN_STATS_FETCH_FAILED: Unable to retrieve system statistics - ${error.message}`);
      }
    } else {
      throw new Error(`INVALID_ROLE: Unknown user role '${userRole}'. Valid roles are: student, professor, admin`);
    }

    return context;
  } catch (error) {
    console.error("Error getting user context:", error);
    if (error.message.startsWith("USER_") || error.message.startsWith("COURSES_") ||
      error.message.startsWith("PROFESSOR_") || error.message.startsWith("ADMIN_") ||
      error.message.startsWith("INVALID_")) {
      throw error;
    }
    throw new Error(`CONTEXT_FETCH_FAILED: Unable to retrieve user context - ${error.message}`);
  }
};

const calculateAttendance = async (studentId, courseId) => {
  try {
    const sessionsSnapshot = await db.collection("sessions").where("courseId", "==", courseId).get();
    const attendanceSnapshot = await db.collection("attendance")
      .where("studentId", "==", studentId)
      .where("courseId", "==", courseId).get();

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
    return { attendanceRate: 0, attendedSessions: 0, totalSessions: 0, missedSessions: 0 };
  }
};

const getProfessorCourseStats = async (courseId) => {
  try {
    const sessionsSnapshot = await db.collection("sessions").where("courseId", "==", courseId).get();
    const attendanceSnapshot = await db.collection("attendance").where("courseId", "==", courseId).get();
    const courseDoc = await db.collection("courses").doc(courseId).get();
    const enrolledCount = courseDoc.exists ? (courseDoc.data().enrolledStudents || []).length : 0;

    const totalSessions = sessionsSnapshot.size;
    const totalAttendance = attendanceSnapshot.size;
    const averageAttendance = (enrolledCount > 0 && totalSessions > 0)
      ? Math.round((totalAttendance / (totalSessions * enrolledCount)) * 100)
      : 0;

    return { totalSessions, totalAttendance, averageAttendance };
  } catch (error) {
    return { totalSessions: 0, totalAttendance: 0, averageAttendance: 0 };
  }
};

export const generateIntelligentResponse = async (userId, userMessage) => {
  try {
    if (!userId) return "❌ **Error:** User ID is missing. Please log in again.";
    if (!userMessage || userMessage.trim() === "") return "I didn't receive your message. Please type your question or request.";

    let context;
    try {
      context = await getUserContext(userId);
    } catch (error) {
      if (error.message.includes("USER_NOT_FOUND")) return "❌ **Account Not Found:** Your user account doesn't exist in the system. Please contact support.";
      if (error.message.includes("USER_ROLE_MISSING")) return "❌ **Role Not Assigned:** Your account doesn't have a role assigned. Please contact an administrator.";
      if (error.message.includes("INVALID_ROLE")) return `❌ **Invalid Role:** ${error.message.split(":")[1]}. Please contact an administrator.`;
      if (error.message.includes("COURSES_FETCH_FAILED")) return "❌ **Database Error:** Unable to retrieve your courses. Please try again or contact support.";
      if (error.message.includes("PROFESSOR_COURSES_FETCH_FAILED")) return "❌ **Database Error:** Unable to retrieve your assigned courses. Please check your permissions or contact support.";
      if (error.message.includes("ADMIN_STATS_FETCH_FAILED")) return "❌ **Database Error:** Unable to retrieve system statistics. Please check database connectivity or contact support.";
      return `❌ **System Error:** Unable to access your data. ${error.message}. Please try again or contact support.`;
    }

    const message = userMessage.toLowerCase().trim();
    const { role, data } = context;

    if (role === "student") {
      if (message.includes("hello") || message.includes("hi") || message.includes("hey") || message.includes("مرحبا")) {
        return `👋 **Hello!**\n\nI'm your university assistant. I can help you with:\n• 📊 Check attendance\n• 📚 View courses\n• 📱 Find active sessions\n• 🔔 See notifications\n\nWhat would you like to know?`;
      }
      if (message.includes("help") || message.includes("مساعدة")) {
        return `💡 **I can help you with:**\n\n📊 **Attendance:** "show my attendance"\n📚 **Courses:** "my courses"\n📱 **Sessions:** "active sessions"\n🔔 **Notifications:** "my notifications"\n\nJust ask me in simple words!`;
      }
      if (message.includes("attendance") || message.includes("absence") || message.includes("حضور")) {
        if (!data.courses || data.courses.length === 0) return `📚 **No Courses Enrolled**\n\nYou're not enrolled in any courses yet.`;
        let response = `📊 **Your Attendance Summary**\n\n`;
        data.courses.forEach(course => {
          response += `📖 **${course.code} - ${course.name}**\n`;
          response += `• Attendance Rate: ${course.attendanceRate}%\n`;
          response += `• Attended: ${course.attendedSessions}/${course.totalSessions} sessions\n`;
          if (course.attendanceRate < 75) response += `• ⚠️ **Warning:** Low attendance!\n`;
          else if (course.attendanceRate >= 90) response += `• ✅ **Excellent:** Great attendance!\n`;
          response += "\n";
        });
        return response;
      }
      if (message.includes("course") || message.includes("subject") || message.includes("مواد")) {
        if (!data.courses || data.courses.length === 0) return `📚 **No Courses Enrolled**\n\nYou're not enrolled in any courses yet.`;
        let response = `📚 **Your Enrolled Courses (${data.courses.length})**\n\n`;
        data.courses.forEach((course, index) => {
          response += `${index + 1}. **${course.code} - ${course.name}**\n`;
          response += `   • Professor: ${course.professor}\n`;
          response += `   • Attendance: ${course.attendanceRate}%\n\n`;
        });
        return response;
      }
      if (message.includes("session") || message.includes("active") || message.includes("qr") || message.includes("جلسة")) {
        if (!data.activeSessions || data.activeSessions.length === 0) return `📱 **No Active Sessions**\n\nThere are no active sessions right now.`;
        let response = `📱 **Active Sessions (${data.activeSessions.length})**\n\n`;
        data.activeSessions.forEach((session, index) => {
          response += `${index + 1}. **${session.courseCode} - ${session.courseName}**\n`;
          response += `   • Lecture #${session.lectureNumber}\n`;
          response += `   • 👉 Tap 'Scan QR Code' to mark attendance\n\n`;
        });
        return response;
      }
      if (message.includes("notification") || message.includes("alert")) {
        if (!data.notifications || data.notifications.length === 0) return `🔔 **No Notifications**\n\nYou don't have any notifications at the moment.`;
        let response = `🔔 **Recent Notifications (${data.notifications.length})**\n\n`;
        data.notifications.forEach((notif, index) => {
          response += `${index + 1}. ${notif.title || "Notification"}\n   ${notif.message || ""}\n\n`;
        });
        return response;
      }
      if (message.includes("thank") || message.includes("شكرا")) return `😊 **You're welcome!** I'm here to help anytime!`;
      if (message.includes("bye") || message.includes("وداعا")) return `👋 **Goodbye!** Have a great day!`;
      return `🤔 I can help with:\n\n• "show my attendance"\n• "my courses"\n• "active sessions"\n• "my notifications"`;
    }

    if (role === "professor") {
      if (message.includes("hello") || message.includes("hi") || message.includes("مرحبا")) {
        return `👋 **Hello Professor!**\n\nI can help you with:\n• 📊 Monitor attendance\n• 📚 Manage courses\n• 📱 Control sessions\n\nWhat do you need?`;
      }
      if (message.includes("student") || message.includes("attendance") || message.includes("حضور")) {
        if (!data.courses || data.courses.length === 0) return `👨‍🏫 **No Courses Assigned**\n\nContact the administrator to get courses assigned.`;
        let response = `👨‍🏫 **Your Courses Overview**\n\n`;
        data.courses.forEach((course, index) => {
          response += `${index + 1}. **${course.code} - ${course.name}**\n`;
          response += `   • Enrolled: ${course.enrolledStudents} students\n`;
          response += `   • Sessions: ${course.totalSessions}\n`;
          response += `   • Avg Attendance: ${course.averageAttendance}%\n\n`;
        });
        return response;
      }
      return `👨‍🏫 **Professor Dashboard**\n\n• "my courses"\n• "student attendance"\n• "active sessions"`;
    }

    if (role === "admin") {
      if (message.includes("hello") || message.includes("hi") || message.includes("مرحبا")) {
        return `👋 **Hello Admin!**\n\nSystem: ${data.stats?.totalUsers || 0} users, ${data.stats?.totalCourses || 0} courses\n\nWhat would you like to manage?`;
      }
      if (message.includes("system") || message.includes("statistics") || message.includes("stats")) {
        return `⚙️ **System Dashboard**\n\n• Total Users: ${data.stats?.totalUsers || 0}\n• Active Users (24h): ${data.stats?.activeUsers || 0}\n• Total Courses: ${data.stats?.totalCourses || 0}\n• Total Sessions: ${data.stats?.totalSessions || 0}`;
      }
      return `⚙️ **Admin Panel**\n\n• "system statistics"\n• "user management"\n• "recent activity"`;
    }

    return `👋 **Hello!**\n\nI'm your university assistant. Please contact an administrator to verify your account settings.`;
  } catch (error) {
    console.error("Error generating response:", error);
    return `❌ **Unexpected Error:** ${error.message}\n\nPlease try again or contact support.`;
  }
};

export const executeAdminAction = async (userId, action, params) => {
  try {
    if (!userId) return { success: false, message: "❌ User ID is required" };
    if (!action) return { success: false, message: "❌ Action type is required" };

    const context = await getUserContext(userId);
    if (!context || context.role !== "admin") {
      return { success: false, message: "❌ Only administrators can execute actions" };
    }

    switch (action) {
      case "show_course_details":
        if (!params?.courseId) return { success: false, message: "❌ Course ID is required" };
        const courseDoc = await db.collection("courses").doc(params.courseId).get();
        if (!courseDoc.exists) return { success: false, message: `❌ Course not found` };
        const courseData = courseDoc.data();
        return {
          success: true,
          data: {
            id: courseDoc.id,
            name: courseData.name || "Unnamed Course",
            code: courseData.code || "N/A",
            professor: courseData.professorName || "Not Assigned",
            students: courseData.enrolledStudents?.length || 0,
          },
          message: "✅ Course details retrieved successfully"
        };
      default:
        return { success: false, message: `❌ Unknown action: '${action}'` };
    }
  } catch (error) {
    return { success: false, message: `❌ Action Failed: ${error.message}` };
  }
};

export const saveMessage = async (conversationId, sender, senderName, text, userId) => {
  try {
    if (!conversationId || !sender || !text || !userId) throw new Error("Missing required fields");

    const messageRef = await db.collection("messages").add({
      conversationId,
      sender,
      senderName: senderName || "Unknown",
      text: text.trim(),
      userId,
      timestamp: new Date(),
      type: "text"
    });

    return { success: true, messageId: messageRef.id };
  } catch (error) {
    console.error("Error saving message:", error);
    return { success: false, message: `❌ Failed to save message: ${error.message}` };
  }
};

export const getWelcomeMessage = async (userId) => {
  try {
    if (!userId) return "👋 **Welcome!**\n\nI'm your university assistant. Please log in to access personalized features.";

    let context;
    try {
      context = await getUserContext(userId);
    } catch (error) {
      return "👋 **Welcome!**\n\nI'm your university assistant. How can I help you today?";
    }

    const welcomeMessages = {
      student: `👋 **Welcome, Student!**\n\nI can help you with:\n\n• 📊 Check your attendance\n• 📚 View your courses\n• 📱 Find active sessions\n• 🔔 See your notifications\n\nType "help" to see all commands!`,
      professor: `👋 **Welcome, Professor!**\n\nI can help you with:\n\n• 📊 Monitor student attendance\n• 📚 Manage your courses\n• 📱 Control sessions\n\nType "help" to see all commands!`,
      admin: `👋 **Welcome, Administrator!**\n\nI can help you with:\n\n• 📊 System monitoring\n• 👥 User management\n• 📚 Course management\n\nType "system statistics" for an overview!`
    };

    return welcomeMessages[context.role] || "👋 **Welcome!**\n\nHow can I help you today?";
  } catch (error) {
    return "👋 **Welcome!**\n\nI'm your university assistant. How can I help you today?";
  }
};