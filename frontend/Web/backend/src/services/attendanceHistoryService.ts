import { db } from "../config/firebase.js";

export const getStudentAttendanceHistory = async (studentId: string) => {
  try {
    const attendanceRef = db.collection("attendance");
    const querySnapshot = await attendanceRef.where("studentId", "==", studentId).get();

    return querySnapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error("Error fetching student attendance history:", error);
    return [];
  }
};

export const getCourseAttendance = async (courseId: string) => {
  try {
    const attendanceRef = db.collection("attendance");
    const querySnapshot = await attendanceRef.where("courseId", "==", courseId).get();

    return querySnapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error("Error fetching course attendance history:", error);
    return [];
  }
};