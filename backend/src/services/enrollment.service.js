
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
    .where("IsActive", "==", true)
    .get();
  return snapshot.docs.map(doc => doc.data());
}

export async function getCourseStudents(courseId) {
  const snapshot = await db.collection("enrollments")
    .where("CourseId", "==", courseId)
    .where("IsActive", "==", true)
    .get();
  return snapshot.docs.map(doc => doc.data());
}


export async function checkStudentCourseLimit(studentId) {
  const snapshot = await db.collection("enrollments")
    .where("StudentId", "==", studentId)
    .get();

  if (snapshot.size >= 6) {
    throw new Error("Student cannot enroll in more than 6 courses");
  }

  return true;
}


export async function checkAlreadyEnrolled(studentId, courseId) {
  const snapshot = await db.collection("enrollments")
    .where("StudentId", "==", studentId)
    .where("CourseId", "==", courseId)
    .where("IsActive", "==", true)
    .get();

  if (!snapshot.empty) {
    throw new Error("Student already enrolled in this course");
  }

  return true;
}


export async function enrollStudentWithValidation(studentId, courseId) {

 
  await checkStudentCourseLimit(studentId);

 
  await checkAlreadyEnrolled(studentId, courseId);

  
  return await enrollStudentToCourse(studentId, courseId);
}