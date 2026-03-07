<<<<<<< HEAD
// backend/src/controllers/user.controller.js
import * as authService from "../services/auth.service.js";
import { saveUser, getUserById, updateUser, getStudents, getProfessors } from "../services/user.service.js";

// Student registration
export const registerStudent = async (req, res) => {
try {
const { email, password, name, studentId } = req.body;

const uid = await authService.registerStudent(email, password);  

await saveUser({ uid, name, email, role: "student", studentId });  

res.status(201).json({ message: "Student registered", uid });

} catch (err) {
res.status(500).json({ error: err.message });
}
};

// User CRUD
export const registerUser = async (req, res) => {
try {
console.log("BODY:",req.body);
const { uid, name, email, role, studentId } = req.body;
await saveUser({ uid, name, email, role, studentId });
res.status(201).json({ message: "User registered" });
} catch (err) {
console.error(err)
res.status(500).json({ error: err.message });
}
};

export const getUserData = async (req, res) => {
try {
const { uid } = req.params;
const docSnap = await getUserById(uid);
if (!docSnap.exists) return res.status(404).json({ error: "User not found" });
res.json(docSnap.data());
} catch (err) {
res.status(500).json({ error: err.message });
}
};

export const updateUserData = async (req, res) => {
try {
const { uid } = req.params;
const data = req.body;
await updateUser(uid, data);
res.json({ message: "User updated" });
} catch (err) {
res.status(500).json({ error: err.message });
}
};

// Admin dashboard
export const fetchStudents = async (req, res) => {
try {
const students = await getStudents();
res.json(students);
} catch (err) {
res.status(500).json({ error: err.message });
}
};

export const fetchProfessors = async (req, res) => {
try {
const professors = await getProfessors();
res.json(professors);
} catch (err) {
res.status(500).json({ error: err.message });
}
};                                 
=======
 HEAD
import * as authService from "../services/auth.service.js";
import * as userService from "../services/user.service.js";

export const registerStudent = async (req, res) => {
  try {
    const { email, password, name, studentId } = req.body;

    // Person 1 — Firebase Auth
    const uid = await authService.registerStudent(email, password);

    // Person 2 — Firestore
    await userService.createUserDocument(uid, {
      name,
      email,
      role: "student",
      studentId,
    });

    res.status(201).json({ message: "Student registered", uid });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

// backend/src/controllers/user.controller.js
const { saveUser, getUserById, updateUser } = require("../services/user.service");


async function registerUser(req, res) {
  try {
    const { uid, name, email, role, studentId } = req.body;
    await saveUser({ uid, name, email, role, studentId });
    res.status(201).send({ message: "User registered!" });
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
}

async function getUser(req, res) {
  try {
    const { uid } = req.params;
    const docSnap = await getUserById(uid);
    if (!docSnap.exists) return res.status(404).send({ error: "User not found" });
    res.send(docSnap.data());
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
}


async function updateUserData(req, res) {
  try {
    const { uid } = req.params;
    const data = req.body;
    await updateUser(uid, data);
    res.send({ message: "User updated" });
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
}

module.exports = { registerUser, getUser, updateUserData };
ed42419ceaf7011494ac4d23d8461f6318d9fd3f
>>>>>>> 8b9578bc1e2302e3a75ac27510a86a584aaa425f
