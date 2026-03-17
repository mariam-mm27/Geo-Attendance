import { getStudentAttendanceHistory, getCourseAttendance } from "./attendanceHistoryService";

export const attendanceController = {
  fetchStudentHistory: async (studentId: string) => {
    try {
      const history = await getStudentAttendanceHistory(studentId);
      return { success: true, data: history };
    } catch (error) {
      console.error("Error in attendanceController:", error);
      return { success: false, message: "Failed to fetch attendance history" };
    }
  },

  fetchCourseHistory: async (courseId: string) => {
    try {
      const history = await getCourseAttendance(courseId);
      return { success: true, data: history };
    } catch (error) {
      console.error("Error in attendanceController:", error);
      return { success: false, message: "Failed to fetch course attendance history" };
    }
  },
};