// backend/src/services/auth.service.js
import admin from "firebase-admin";


export const registerStudent = async (email, password) => {
  try {
    const userRecord = await admin.auth().createUser({
      email,
      password,
    });

    console.log("Student registered in Firebase Auth:", userRecord.uid);
    return userRecord.uid;
  } catch (err) {
    console.error("Error registering student:", err.message);
    throw err;
  }
};


export const registerUser = async (email, password) => {
  try {
    const userRecord = await admin.auth().createUser({
      email,
      password,
    });

    console.log("User registered in Firebase Auth:", userRecord.uid);
    return userRecord.uid;
  } catch (err) {
    console.error("Error registering user:", err.message);
    throw err;
  }
};


export const loginUser = async (email, password) => {
   throw new Error("Server-side login is usually handled client-side via Firebase SDK");
};