import admin from "../config/firebase.js";

export const registerStudent = async (email, password) => {
  try {
    const userRecord = await admin.auth().createUser({
      email,
      password,
    });

    console.log("User created in Firebase Auth:", userRecord.uid);

    return userRecord.uid;
  } catch (err) {
    console.error("Auth error:", err.message);
    throw err;
  }
};