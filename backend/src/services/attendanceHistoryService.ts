import { db } from "../config/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";

export const getStudentAttendanceHistory = async (studentId: string) => {
  try {
    const attendanceRef = collection(db, "attendance");
    const q = query(attendanceRef, where("studentId", "==", studentId));
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map((doc) => ({
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
    const attendanceRef = collection(db, "attendance");
    const q = query(attendanceRef, where("courseId", "==", courseId));
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error("Error fetching course attendance history:", error);
    return [];
  }
};