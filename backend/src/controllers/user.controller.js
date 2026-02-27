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