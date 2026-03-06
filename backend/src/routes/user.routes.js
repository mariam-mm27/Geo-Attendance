// backend/src/routes/user.routes.js
import express from "express";
import { registerUser, getUserData, updateUserData, fetchStudents, fetchProfessors } from "../controllers/user.controller.js";

const router = express.Router();
console.log("User routes loaded");

// User CRUD
router.post("/users", registerUser);
router.get("/users/:uid", getUserData);
router.put("/users/:uid", updateUserData);

// Admin dashboard
router.get("/users/students", fetchStudents);
router.get("/users/professors", fetchProfessors);

export default router;