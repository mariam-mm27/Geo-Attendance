
// backend/src/services/enrollment.service.js
import { db } from "../config/firebase.js";

export async function enrollStudentToCourse(studentId, courseId) {
  const docRef = db.collection("enrollments").doc(); 
  const data = {
    StudentId: studentId,
    CourseId: courseId,
    EnrolledAt: new Date(),
    IsActive: true,
  };
  await docRef.set(data);
  return data;
}

export async function getStudentCourses(studentId) {
  const snapshot = await db.collection("enrollments")
    .where("StudentId", "==", studentId)
    .get();
  return snapshot.docs.map(doc => doc.data());
}

export async function getCourseStudents(courseId) {
  const snapshot = await db.collection("enrollments")
    .where("CourseId", "==", courseId)
    .get();
  return snapshot.docs.map(doc => doc.data());
}