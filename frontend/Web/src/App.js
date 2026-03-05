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