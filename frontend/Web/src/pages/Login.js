import { useState } from "react";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("");

  const handleLogin = () => {
    if (role === "Professor" && !email.endsWith("@sci.cu.edu.eg")) {
  alert("Professor must use @sci.cu.edu.eg email");
  return;
}

if (role === "Student" && !email.endsWith("@std.sci.cu.edu.eg")) {
  alert("Student must use @std.sci.cu.edu.eg email");
  return;
}

    if (!role) {
      alert("Please select role");
      return;
    }

    if (role === "Admin") window.location.href = "/admin";
    else if (role === "Professor") window.location.href = "/professor";
    else window.location.href = "/student";
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
          <option value="Student">Student</option>
          <option value="Professor">Professor</option>
          <option value="Admin">Admin</option>
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
          Don't have account? <a href="/register" style={{ color: "#E68A45" }}>Register here</a>
        </p>

      </div>
    </div>
  );
}

export default Login;