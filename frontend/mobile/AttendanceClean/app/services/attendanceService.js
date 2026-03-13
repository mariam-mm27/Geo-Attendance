import { db, auth } from "../firebase";
import {
  collection,
  addDoc,
  serverTimestamp,
  doc,
  getDoc,
  query,
  where,
  getDocs
} from "firebase/firestore";


export const recordAttendance = async (sessionId) => {
  try {
    const student = auth.currentUser;

    if (!student) {
      throw new Error("No authenticated user");
    }

    const userRef = doc(db, "users", student.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists() || userSnap.data().role.toLowerCase() !== "student") {
      throw new Error("Only students can record attendance");
    }

    const sessionRef = doc(db, "sessions", sessionId);
    const sessionSnap = await getDoc(sessionRef);

    if (!sessionSnap.exists()) {
      return { success: false, message: "Session not found" };
    }

    const sessionData = sessionSnap.data();

    if (!sessionData.isActive) {
      return { success: false, message: "Session Expired" };
    }

    const createdAt = sessionData.createdAt?.toDate();
    const duration = sessionData.duration || 15; 
    const expiryTime = new Date(createdAt.getTime() + duration * 60000);
    
    if (new Date() > expiryTime) {
      return { success: false, message: "Session Expired" };
    }

    const attendanceQuery = query(
      collection(db, "attendance"),
      where("sessionId", "==", sessionId),
      where("studentId", "==", student.uid)
    );

    const existingAttendance = await getDocs(attendanceQuery);

    if (!existingAttendance.empty) {
      return { success: false, message: "Already Recorded" };
    }

    await addDoc(collection(db, "attendance"), {
      sessionId,
      studentId: student.uid,
      studentEmail: student.email,
      courseId: sessionData.courseId,
      professorId: sessionData.professorId,
      recordedAt: serverTimestamp(),
    });

    return { success: true, message: "Attendance Successful" };

  } catch (error) {
    console.error("Error recording attendance:", error);
    throw error;
  }
};


export const getStudentAttendance = async () => {
  try {
    const student = auth.currentUser;

    if (!student) {
      throw new Error("No authenticated user");
    }

    const q = query(
      collection(db, "attendance"),
      where("studentId", "==", student.uid)
    );

    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

  } catch (error) {
    console.error("Error fetching attendance:", error);
    throw error;
  }
};


export const getCourseAttendance = async (courseId) => {
  try {
    const q = query(
      collection(db, "attendance"),
      where("courseId", "==", courseId)
    );

    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

  } catch (error) {
    console.error("Error fetching course attendance:", error);
    throw error;
  }
};
