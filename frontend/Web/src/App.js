<<<<<<< Updated upstream
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
=======
import { BrowserRouter as Router, Routes, Route } from "react-router-dom"; // غيرت دي عشان تمشي مع الكود تحت
import { AuthProvider } from "./utils/AuthContex";
import { Toaster } from 'react-hot-toast';
import PrivateRoute from "./utils/PrivateRoute";
>>>>>>> Stashed changes

import Login from "./Login";
import Register from "./Register";
import Reports from "./pages/Reports";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import AdminDashboard from "./pages/admin/AdminDashboard";
import ProfessorProfile from "./pages/Professor/ProfessorProfile";
import StudentProfile from "./pages/Student/StudentProfile";
import CourseDetails from "./pages/admin/CourseDetails";

function App() {
  return (
<<<<<<< Updated upstream
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/professor" element={<ProfessorProfile />} />
        <Route path="/student" element={<StudentProfile />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/reports/:courseId" element={<Reports />} />
        
        <Route path="/details/:type/:id" element={<CourseDetails />} />
      </Routes>
    </Router>
=======
    <AuthProvider> {}
      <Toaster position="top-right" />
      <Router>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          {}
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/professor" element={<ProfessorProfile />} />
          <Route path="/student" element={<StudentProfile />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/reports/:courseId" element={<Reports />} />
          
          <Route path="/details/:type/:id" element={<CourseDetails />} />
        </Routes>
      </Router>
    </AuthProvider>
>>>>>>> Stashed changes
  );
}

export default App;