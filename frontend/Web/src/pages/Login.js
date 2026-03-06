import { useState } from "react";
import { validateLogin } from "../utils/validation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebase";
import { useNavigate } from "react-router-dom";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("");

  const navigate = useNavigate();

  const handleLogin = async () => {
    // 1️⃣ UI validation
    if (!role) {
      alert("Please select a role");
      return;
    }

    const error = validateLogin({ email, password });
    if (error) {
      alert(error);
      return;
    }

    try {
      // 2️⃣ Firebase Auth
      const cred = await signInWithEmailAndPassword(auth, email, password);

      // 3️⃣ Get user profile from Firestore
      const userRef = doc(db, "users", cred.user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        alert("Account not registered properly.");
        return;
      }

      const userData = userSnap.data();
      const realRole = userData.role;

      // 4️⃣ Security check (IMPORTANT 🔐)
      if (realRole !== role.toLowerCase()) {
        alert("Selected role does not match your account.");
        return;
      }

      // 5️⃣ Redirect safely
      if (realRole === "admin") {
        navigate("/admin");
      } else if (realRole === "professor") {
        navigate("/professor");
      } else if (role === "student") {
        navigate("/student");
      }

    } catch (err) {
      console.log(err);
      alert("Invalid email or password.");
    }
  };

  return (
    <div style={{
      background: "#F8FAFC",
      height: "100vh",
      display: "flex",
      justifyContent: "center",
      alignItems: "center"
    }}>
      <div style={{
        width: "350px",
        padding: "30px",
        borderRadius: "12px",
        border: "1px solid #CBD5E1",
        background: "white"
      }}>

        <div style={{ textAlign: "center" }}>
          <h1 style={{
            color: "#173B66",
            marginBottom: "5px",
            fontSize: "32px"
          }}>
            Attendance
          </h1>

          <h2 style={{
            color: "#173B66",
            fontSize: "24px"
          }}>
            Login
          </h2>
        </div>

        {/* Role */}
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          style={{
            width: "100%",
            padding: "10px",
            marginTop: "20px",
            borderRadius: "8px",
            border: "1px solid #CBD5E1"
          }}
        >
          <option value="">Select Role</option>
          <option value="student">Student</option>
          <option value="professor">Professor</option>
          <option value="admin">Admin</option>
        </select>

        {/* Email */}
        <input
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{
            width: "100%",
            padding: "10px",
            marginTop: "15px",
            borderRadius: "8px",
            border: "1px solid #CBD5E1"
          }}
        />

        {/* Password */}
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{
            width: "100%",
            padding: "10px",
            marginTop: "15px",
            borderRadius: "8px",
            border: "1px solid #CBD5E1"
          }}
        />

        {/* Login Button */}
        <button
          onClick={handleLogin}
          style={{
            width: "100%",
            marginTop: "20px",
            padding: "10px",
            borderRadius: "8px",
            background: "#173B66",
            color: "white",
            border: "none",
            cursor: "pointer"
          }}
        >
          Login
        </button>

        <button
          onClick={() => alert("Google Login (Firebase not connected yet)")}
          style={{
            width: "100%",
            marginTop: "15px",
            padding: "10px",
            borderRadius: "8px",
            background: "#1B8F85",
            color: "white",
            border: "none",
            cursor: "pointer",
            fontWeight: "bold"
          }}
        >
          Login with Google
        </button>

        <p style={{ textAlign: "center", marginTop: "15px" }}>
          Don't have account?{" "}
          <a href="/register" style={{ color: "#E68A45" }}>
            Register here
          </a>
        </p>

      </div>
    </div>
  );
}

export default Login;