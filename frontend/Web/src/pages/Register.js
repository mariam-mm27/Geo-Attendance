import { useState } from "react";

function Register() {
  const [name, setName] = useState("");
  const [id, setId] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("");

  const handleRegister = () => {
    if (role === "Professor" && !email.endsWith("@sci.cu.edu.eg")) {
      alert("Professor must use @sci.cu.edu.eg email");
      return;
    }

    if (role === "Student" && !email.endsWith("@std.sci.cu.edu.eg")) {
      alert("Student must use @std.sci.cu.edu.eg email");
      return;
    }

    alert("Register success");
    

  };

  return (
    <div
      style={{
        background: "#F8FAFC",
        height: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <div
        style={{
          width: "350px",
          padding: "30px",
          borderRadius: "12px",
          border: "1px solid #CBD5E1",
          background: "white",
        }}
      >
        <h2 style={{ color: "#173B66", textAlign: "center" }}>Register</h2>

        <select
          style={{
            width: "100%",
            padding: "10px",
            marginTop: "15px",
            borderRadius: "8px",
            border: "1px solid #CBD5E1",
          }}
          value={role}
          onChange={(e) => setRole(e.target.value)}
        >
          <option value="">Select Role</option>
          <option value="Student">Student</option>
          <option value="Professor">Professor</option>
          <option value="Admin">Admin</option>
        </select>

        <input
          placeholder="Name"
          style={{
            width: "100%",
            padding: "10px",
            marginTop: "15px",
            borderRadius: "8px",
            border: "1px solid #CBD5E1",
          }}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <input
          placeholder="Email"
          style={{
            width: "100%",
            padding: "10px",
            marginTop: "15px",
            borderRadius: "8px",
            border: "1px solid #CBD5E1",
          }}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          placeholder="ID"
          style={{
            width: "100%",
            padding: "10px",
            marginTop: "15px",
            borderRadius: "8px",
            border: "1px solid #CBD5E1",
          }}
          value={id}
          onChange={(e) => setId(e.target.value)}
        />

        <input
          type="password"
          placeholder="Password"
          style={{
            width: "100%",
            padding: "10px",
            marginTop: "15px",
            borderRadius: "8px",
            border: "1px solid #CBD5E1",
          }}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          onClick={handleRegister}
          style={{
            width: "100%",
            marginTop: "20px",
            padding: "10px",
            borderRadius: "8px",
            background: "#173B66",
            color: "white",
            border: "none",
            cursor: "pointer",
          }}
        >
          Register
        </button>
        <button
          onClick={() => alert("Google Sign Up (Firebase not connected yet)")}
          style={{
            width: "100%",
            marginTop: "15px",
            padding: "10px",
            borderRadius: "8px",
            background: "#1B8F85",
            color: "white",
            border: "none",
            cursor: "pointer",
            fontWeight: "bold",
          }}
        >
          Sign up with Google
        </button>
      </div>
    </div>
  );
}

export default Register;
