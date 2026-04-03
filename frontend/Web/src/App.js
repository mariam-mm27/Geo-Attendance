import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

import Login from "./Login";
import Register from "./Register";
import Reports from "./pages/Reports";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import AdminDashboard from "./pages/admin/AdminDashboard";
import ProfessorProfile from "./pages/Professor/ProfessorProfile";
import StudentProfile from "./pages/Student/StudentProfile";
import StudentEnroll from "./pages/Student/StudentEnroll";
import AttendanceHistory from "./pages/Student/AttendanceHistory";
import SessionsList from "./pages/Student/SessionsList";
import CourseDetails from "./pages/admin/CourseDetails";
import EnrollStudents from "./pages/admin/EnrollStudents";
import CourseReports from "./pages/admin/CourseReports";
import EditCourse from "./pages/admin/EditCourse";
import CourseSessions from "./pages/Professor/CourseSessions";
import SessionAttendance from "./pages/Professor/SessionAttendance";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/professor" element={<ProfessorProfile />} />
        <Route path="/student" element={<StudentProfile />} />
        
        {/* Student Routes */}
        <Route path="/student-enroll" element={<StudentEnroll />} />
        <Route path="/student/sessions" element={<SessionsList />} />
        <Route path="/student/attendance-history/:courseId" element={<AttendanceHistory />} />
        
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/reports/:courseId" element={<Reports />} />
        <Route path="/enroll-students/:courseId" element={<EnrollStudents />} />
        <Route path="/course-reports/:courseId" element={<CourseReports />} />
        <Route path="/edit-course/:courseId" element={<EditCourse />} />
        
        <Route path="/details/:type/:id" element={<CourseDetails />} />

        {/* Professor Routes */}
        <Route path="/professor/courses/:courseId/sessions" element={<CourseSessions />} />
        <Route path="/professor/sessions/:sessionId/attendance" element={<SessionAttendance />} />
      </Routes>
    </Router>
  );
}

export default App;