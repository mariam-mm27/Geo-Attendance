import React, { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
  Navigate,
} from "react-router-dom";

import { getAuth, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

import { db } from "./firebase";

// ================= AUTH PAGES =================

import Login from "./Login";
import Register from "./Register";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";

// ================= ADMIN PAGES =================

import AdminDashboard from "./pages/admin/AdminDashboard";
import CourseDetails from "./pages/admin/CourseDetails";
import EnrollStudents from "./pages/admin/EnrollStudents";
import CourseReports from "./pages/admin/CourseReports";
import EditCourse from "./pages/admin/EditCourse";

// ================= PROFESSOR PAGES =================

import ProfessorProfile from "./pages/Professor/ProfessorProfile";
import CourseSessions from "./pages/Professor/CourseSessions";
import SessionAttendance from "./pages/Professor/SessionAttendance";

// ================= STUDENT PAGES =================

import StudentProfile from "./pages/Student/StudentProfile";
import StudentEnroll from "./pages/Student/StudentEnroll";
import AttendanceHistory from "./pages/Student/AttendanceHistory";
import SessionsList from "./pages/Student/SessionsList";
import StudentNotifications from "./pages/Student/StudentNotifications";
import LectureReview from "./pages/Student/LectureReview";

// ================= GENERAL PAGES =================

import Reports from "./pages/Reports";
import NotificationsPage from "./pages/NotificationsPage";

import ChatBotButton from "./components/ChatBotButton";


// ======================================================
// ================= PRIVATE ROUTE ======================
// ======================================================

const PrivateRoute = ({
  children,
  user,
  role,
  allowedRoles,
  loading,
}) => {

  // ================= LOADING =================

  if (loading) {
    return <div>Loading...</div>;
  }

  // ================= NOT LOGGED IN =================

  if (!user) {
    return <Navigate to="/" replace />;
  }

  // ================= EMAIL NOT VERIFIED =================

  if (!user.emailVerified) {
    return <Navigate to="/" replace />;
  }

  // ================= ROLE NOT ALLOWED =================

  if (!allowedRoles.includes(role)) {
    return <Navigate to="/" replace />;
  }

  return children;
};


// ======================================================
// ================= MAIN APP ===========================
// ======================================================

const AppWithChat = () => {

  const [user, setUser] = useState(null);

  const [role, setRole] = useState(null);

  const [loading, setLoading] = useState(true);

  const location = useLocation();

  const auth = getAuth();

  // ======================================================
  // ================= AUTH CHECK =========================
  // ======================================================

  useEffect(() => {

    const unsubscribe = onAuthStateChanged(
      auth,
      async (currentUser) => {

        try {

          if (currentUser) {

            await currentUser.reload();

            // ================= EMAIL VERIFY =================

            if (!currentUser.emailVerified) {

              setUser(null);
              setRole(null);
              setLoading(false);

              return;
            }

            // ================= GET USER ROLE =================

            const userRef = doc(
              db,
              "users",
              currentUser.uid
            );

            const userSnap = await getDoc(userRef);

            if (userSnap.exists()) {

              const userData = userSnap.data();

              setUser(currentUser);

              setRole(userData.role);

            } else {

              setUser(null);

              setRole(null);
            }

          } else {

            setUser(null);

            setRole(null);
          }

        } catch (error) {

          console.log("AUTH ERROR:", error);

          setUser(null);

          setRole(null);

        } finally {

          setLoading(false);
        }
      }
    );

    return () => unsubscribe();

  }, [auth]);



  // ======================================================
  // ================= CHAT BUTTON ========================
  // ======================================================

  const isAuthPage = [
    "/",
    "/login",
    "/register",
    "/forgot-password",
    "/reset-password",
  ].includes(location.pathname);

  const showChat = user && !isAuthPage;



  // ======================================================
  // ================= ROUTES =============================
  // ======================================================

  return (
    <>
      <Routes>

        {/* ================= AUTH ROUTES ================= */}

        <Route path="/" element={<Login />} />

        <Route path="/login" element={<Login />} />

        <Route path="/register" element={<Register />} />

        <Route
          path="/forgot-password"
          element={<ForgotPasswordPage />}
        />

        <Route
          path="/reset-password"
          element={<ResetPasswordPage />}
        />



        {/* ================= ADMIN ROUTES ================= */}

        <Route
          path="/admin"
          element={
            <PrivateRoute
              user={user}
              role={role}
              loading={loading}
              allowedRoles={["admin"]}
            >
              <AdminDashboard />
            </PrivateRoute>
          }
        />

        <Route
          path="/details/:type/:id"
          element={
            <PrivateRoute
              user={user}
              role={role}
              loading={loading}
              allowedRoles={["admin"]}
            >
              <CourseDetails />
            </PrivateRoute>
          }
        />

        <Route
          path="/enroll-students/:courseId"
          element={
            <PrivateRoute
              user={user}
              role={role}
              loading={loading}
              allowedRoles={["admin"]}
            >
              <EnrollStudents />
            </PrivateRoute>
          }
        />

        <Route
          path="/course-reports/:courseId"
          element={
            <PrivateRoute
              user={user}
              role={role}
              loading={loading}
              allowedRoles={["admin"]}
            >
              <CourseReports />
            </PrivateRoute>
          }
        />

        <Route
          path="/edit-course/:courseId"
          element={
            <PrivateRoute
              user={user}
              role={role}
              loading={loading}
              allowedRoles={["admin"]}
            >
              <EditCourse />
            </PrivateRoute>
          }
        />



        {/* ================= PROFESSOR ROUTES ================= */}

        <Route
          path="/professor"
          element={
            <PrivateRoute
              user={user}
              role={role}
              loading={loading}
              allowedRoles={["professor"]}
            >
              <ProfessorProfile />
            </PrivateRoute>
          }
        />

        <Route
          path="/professor/courses/:courseId/sessions"
          element={
            <PrivateRoute
              user={user}
              role={role}
              loading={loading}
              allowedRoles={["professor"]}
            >
              <CourseSessions />
            </PrivateRoute>
          }
        />

        <Route
          path="/professor/sessions/:sessionId/attendance"
          element={
            <PrivateRoute
              user={user}
              role={role}
              loading={loading}
              allowedRoles={["professor"]}
            >
              <SessionAttendance />
            </PrivateRoute>
          }
        />



        {/* ================= STUDENT ROUTES ================= */}

        <Route
          path="/student"
          element={
            <PrivateRoute
              user={user}
              role={role}
              loading={loading}
              allowedRoles={["student"]}
            >
              <StudentProfile />
            </PrivateRoute>
          }
        />

        <Route
          path="/student-enroll"
          element={
            <PrivateRoute
              user={user}
              role={role}
              loading={loading}
              allowedRoles={["student"]}
            >
              <StudentEnroll />
            </PrivateRoute>
          }
        />

        <Route
          path="/student/sessions"
          element={
            <PrivateRoute
              user={user}
              role={role}
              loading={loading}
              allowedRoles={["student"]}
            >
              <SessionsList />
            </PrivateRoute>
          }
        />

        <Route
          path="/student/attendance-history/:courseId"
          element={
            <PrivateRoute
              user={user}
              role={role}
              loading={loading}
              allowedRoles={["student"]}
            >
              <AttendanceHistory />
            </PrivateRoute>
          }
        />

        <Route
          path="/student/notifications"
          element={
            <PrivateRoute
              user={user}
              role={role}
              loading={loading}
              allowedRoles={["student"]}
            >
              <StudentNotifications />
            </PrivateRoute>
          }
        />

        <Route
          path="/student/review/:sessionId"
          element={
            <PrivateRoute
              user={user}
              role={role}
              loading={loading}
              allowedRoles={["student"]}
            >
              <LectureReview />
            </PrivateRoute>
          }
        />



        {/* ================= SHARED ROUTES ================= */}

        <Route
          path="/notifications"
          element={
            <PrivateRoute
              user={user}
              role={role}
              loading={loading}
              allowedRoles={[
                "student",
                "professor",
                "admin",
              ]}
            >
              <NotificationsPage />
            </PrivateRoute>
          }
        />

        <Route
          path="/reports/:courseId"
          element={
            <PrivateRoute
              user={user}
              role={role}
              loading={loading}
              allowedRoles={[
                "admin",
                "professor",
              ]}
            >
              <Reports />
            </PrivateRoute>
          }
        />



        {/* ================= INVALID ROUTE ================= */}

        <Route
          path="*"
          element={<Navigate to="/" replace />}
        />

      </Routes>




      {/* ================= CHAT BOT ================= */}

      {showChat && <ChatBotButton />}
    </>
  );
};



// ======================================================
// ================= APP ================================
// ======================================================

function App() {

  return (
    <Router>
      <AppWithChat />
    </Router>
  );
}

export default App;