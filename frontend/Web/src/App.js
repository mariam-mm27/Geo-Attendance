import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { getAuth, onAuthStateChanged } from 'firebase/auth';

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
import StudentNotifications from "./pages/Student/StudentNotifications";
import CourseDetails from "./pages/admin/CourseDetails";
import EnrollStudents from "./pages/admin/EnrollStudents";
import CourseReports from "./pages/admin/CourseReports";
import EditCourse from "./pages/admin/EditCourse";
import CourseSessions from "./pages/Professor/CourseSessions";
import SessionAttendance from "./pages/Professor/SessionAttendance";

import NotificationsPage from './pages/NotificationsPage';
import FloatingChatBot from './components/FloatingChatBot';

import LectureReview from "./pages/Student/LectureReview";

// Component to handle chat functionality
const AppWithChat = () => {
  const [user, setUser] = useState(null);
  const location = useLocation();
  const auth = getAuth();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });

    return () => unsubscribe();
  }, [auth]);

  // Don't show chat on login/register pages
  const isAuthPage = ['/login', '/register', '/forgot-password', '/reset-password', '/'].includes(location.pathname);
  const showChat = user && !isAuthPage;

  return (
    <>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/professor" element={<ProfessorProfile />} />
          
        {/* Student Dashboard */}
        <Route path="/student" element={<StudentProfile />} />

        {/* Student Routes */}
        <Route path="/student-enroll" element={<StudentEnroll />} />
        <Route path="/student/sessions" element={<SessionsList />} />
        <Route path="/student/attendance-history/:courseId" element={<AttendanceHistory />} />
        <Route path="/student/notifications" element={<StudentNotifications />} />
        
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/reports/:courseId" element={<Reports />} />
        <Route path="/enroll-students/:courseId" element={<EnrollStudents />} />
        <Route path="/course-reports/:courseId" element={<CourseReports />} />
        <Route path="/edit-course/:courseId" element={<EditCourse />} />
        
        <Route path="/details/:type/:id" element={<CourseDetails />} />
        <Route path="/student/review/:sessionId" element={<LectureReview />} />

        {/* Professor Routes */}
        <Route path="/professor/courses/:courseId/sessions" element={<CourseSessions />} />
        <Route path="/professor/sessions/:sessionId/attendance" element={<SessionAttendance />} />

        {/* Notifications */}
        <Route path="/notifications" element={<NotificationsPage />} />
      </Routes>

      {/* Floating AI Chat Assistant */}
      {showChat && <FloatingChatBot />}
    </>
  );
};

function App() {
  return (
    <Router>
      <AppWithChat />
    </Router>
  );
}

export default App;