// backend/src/services/user.service.js
const db = require("../config/firebase");

const USERS_COLLECTION = "users";

async function saveUser(user) {
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
}

async function getUserById(uid) {
  try {
    const docRef = db.collection(USERS_COLLECTION).doc(uid);
    const docSnap = await docRef.get();
    return docSnap;
  } catch (err) {
    console.error("Error fetching user:", err.message);
    throw err;
  }
}

async function updateUser(uid, data) {
  try {
    const docRef = db.collection(USERS_COLLECTION).doc(uid);
    await docRef.update(data);
    console.log("User updated!");
  } catch (err) {
    console.error("Error updating user:", err.message);
    throw err;
  }
}

module.exports = { saveUser, getUserById, updateUser };