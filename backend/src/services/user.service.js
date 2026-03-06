// backend/src/services/user.service.js
import { db } from "../config/firebase.js";

const USERS_COLLECTION = "users";

export const saveUser = async (user) => {
  try {
    await db.collection(USERS_COLLECTION).doc(user.uid).set({
      name: user.name,
      email: user.email,
      role: user.role,
      studentId: user.studentId || null,
      createdAt: new Date(),
    });
    console.log("User saved!");
  } catch (err) {
    console.error("Error saving user:", err.message);
    throw err;
  }
};

export const getUserById = async (uid) => {
  try {
    const docSnap = await db.collection(USERS_COLLECTION).doc(uid).get();
    return docSnap;
  } catch (err) {
    console.error("Error fetching user:", err.message);
    throw err;
  }
};

export const updateUser = async (uid, data) => {
  try {
    await db.collection(USERS_COLLECTION).doc(uid).update(data);
    console.log("User updated!");
  } catch (err) {
    console.error("Error updating user:", err.message);
    throw err;
  }
};

export const getStudents = async () => {
  const snapshot = await db.collection(USERS_COLLECTION).where("role", "==", "student").get();
  return snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() }));
};

export const getProfessors = async () => {
  const snapshot = await db.collection(USERS_COLLECTION).where("role", "==", "professor").get();
  return snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() }));
};