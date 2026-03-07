<<<<<<< HEAD
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./utils/AuthContex";
import PrivateRoute from "./utils/PrivateRoute";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Admin from "./pages/Admin";
import Student from "./pages/Student";
import Professor from "./pages/Professor";
import Profile from "./pages/Profile";

function App() {
  return (
    <AuthProvider>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />
          Security
         <Route
            path="/admin"
            element={
              <PrivateRoute allowedRoles={["admin"]}>
                <Admin />
              </PrivateRoute>
            }
          />

          <Route
            path="/student"
            element={
              <PrivateRoute allowedRoles={["student"]}>
                <Student />
              </PrivateRoute>
            }
          />

          <Route
            path="/professor"
            element={
              <PrivateRoute allowedRoles={["professor"]}>
                <Professor />
              </PrivateRoute>
            }
          />
        <Route path="/admin" element={<Admin />} />
        <Route path="/student" element={<Student />} />
        <Route path="/professor" element={<Professor />} />
        <Route path="/profile" element={<Profile />} />
 main
      </Routes>
    </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
=======
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
import CourseDetails from "./pages/admin/CourseDetails";

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
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/reports/:courseId" element={<Reports />} />
        
        <Route path="/details/:type/:id" element={<CourseDetails />} />
      </Routes>
    </Router>
  );
}

export default App;
>>>>>>> 8b9578bc1e2302e3a75ac27510a86a584aaa425f
