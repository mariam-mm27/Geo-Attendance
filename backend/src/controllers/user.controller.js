
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


