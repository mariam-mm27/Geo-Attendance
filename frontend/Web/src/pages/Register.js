import { useState } from "react";

function Register() {
  const [name, setName] = useState("");
  const [id, setId] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("");

  const handleRegister = () => {
    if (!email.endsWith("@sci.cu.edu.eg")) {
      alert("Email must end with @sci.cu.edu.eg");
      return;
    }

    alert("Register success (Frontend only)");
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
        <h2 style={{ color: "#173B66", textAlign: "center" }}>
          Register
        </h2>

        <select
          style={{
            width: "100%",
            padding: "10px",
            marginTop: "15px",
            borderRadius: "8px",
            border: "1px solid #CBD5E1"
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
            border: "1px solid #CBD5E1"
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
            border: "1px solid #CBD5E1"
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
            border: "1px solid #CBD5E1"
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
            border: "1px solid #CBD5E1"
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
            cursor: "pointer"
          }}
        >
          Register
        </button>
        
      </div>
    </div>
  );
}

export default Register;