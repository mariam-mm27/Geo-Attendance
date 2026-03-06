import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./utils/AuthContex";
import PrivateRoute from "./utils/PrivateRoute";

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
    <>
      <Toaster position="top-right" />
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
          
          {}
          <Route path="/details/:type/:id" element={<CourseDetails />} />
        </Routes>
      </Router>
    </>
  );
}

export default App;