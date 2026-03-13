// backend/src/controllers/enrollment.controller.js
import express from "express";
import { enrollStudentToCourse, getStudentCourses, getCourseStudents } from "../services/enrollment.service.js";

const router = express.Router();

router.post("/enroll", async (req, res) => {
  try {
    const { StudentId, CourseId } = req.body;
    if (!StudentId || !CourseId) {
      return res.status(400).json({ error: "StudentId and CourseId are required" });
    }
    const result = await enrollStudentToCourse(StudentId, CourseId);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/student/:id", async (req, res) => {
  try {
    const courses = await getStudentCourses(req.params.id);
    res.status(200).json({ data: courses });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/course/:id", async (req, res) => {
  try {
    const students = await getCourseStudents(req.params.id);
    res.status(200).json({ data: students });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;