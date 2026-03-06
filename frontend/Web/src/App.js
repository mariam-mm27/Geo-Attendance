import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./utils/AuthContex";
import PrivateRoute from "./utils/PrivateRoute";
import { Toaster } from "react-hot-toast";

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
    <AuthProvider>

      <Toaster position="top-right" />

      <BrowserRouter>

        <Routes>

          <Route path="/" element={<Login />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route
            path="/admin"
            element={
              <PrivateRoute allowedRoles={["admin"]}>
                <AdminDashboard />
              </PrivateRoute>
            }
          />

          <Route
            path="/professor"
            element={
              <PrivateRoute allowedRoles={["professor"]}>
                <ProfessorProfile />
              </PrivateRoute>
            }
          />

          <Route
            path="/student"
            element={
              <PrivateRoute allowedRoles={["student"]}>
                <StudentProfile />
              </PrivateRoute>
            }
          />

          <Route path="/reset-password" element={<ResetPasswordPage />} />

          <Route
            path="/reports/:courseId"
            element={
              <PrivateRoute allowedRoles={["admin", "professor"]}>
                <Reports />
              </PrivateRoute>
            }
          />

          <Route
            path="/details/:type/:id"
            element={
              <PrivateRoute allowedRoles={["admin"]}>
                <CourseDetails />
              </PrivateRoute>
            }
          />

        </Routes>

      </BrowserRouter>

    </AuthProvider>
  );
}

export default App;