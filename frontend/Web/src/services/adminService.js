
import { db } from "../firebase";
import {
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  getDoc
} from "firebase/firestore";



export const getProfessors = async () => {
  const snapshot = await getDocs(collection(db, "professors"));
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
};

export const addProfessor = (data) =>
  addDoc(collection(db, "professors"), data);

export const deleteProfessor = (id) =>
  deleteDoc(doc(db, "professors", id));



export const getStudents = async () => {
  const snapshot = await getDocs(collection(db, "students"));
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
};

export const addStudent = (data) =>
  addDoc(collection(db, "students"), data);

export const deleteStudent = (id) =>
  deleteDoc(doc(db, "students", id));



export const getCourses = async () => {
  const snapshot = await getDocs(collection(db, "courses"));
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
};

export const addCourse = (data) =>
  addDoc(collection(db, "courses"), data);

export const deleteCourse = (id) =>
  deleteDoc(doc(db, "courses", id));



export const getUserById = (uid) =>
  getDoc(doc(db, "users", uid));