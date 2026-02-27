import { useState } from "react";
import { validateRegister } from "../utils/validation";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "../firebase";

function Register() {
  const [name, setName] = useState("");
  const [id, setId] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("");
  const [adminCode, setAdminCode] = useState("");

  const handleRegister = async () => {
  // 1️⃣ Validation
  const error = validateRegister({
    role,
    name,
    email,
    password,
    studentId: id,
    adminCode // حطي هنا لو عندك input للـ admin code
  });

  if (error) {
    alert(error);
    return;
  }

  try {
    // 2️⃣ Firebase Auth
    const cred = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );

    // 3️⃣ Save user in Firestore
    await setDoc(doc(db, "users", cred.user.uid), {
      name,
      email,
      role,
      studentId: role === "student" ? id : null,
      createdAt: new Date()
    });

    alert("Registration successful!");

    // 4️⃣ Redirect
    if (role === "admin") {
      window.location.href = "/admin";
    } else if (role === "professor") {
      window.location.href = "/professor";
    } else {
      window.location.href = "/student";
    }

  } catch (err) {
    alert("Error: " + err.message);
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
          <option value="student">Student</option>
          <option value="professor">Professor</option>
          <option value="admin">Admin</option>
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
        {role === "admin" && (
  <input
    placeholder="Admin Code"
    style={{
      width: "100%",
      padding: "10px",
      marginTop: "15px",
      borderRadius: "8px",
      border: "1px solid #CBD5E1"
    }}
    value={adminCode}
    onChange={(e) => setAdminCode(e.target.value)}
  />
)}

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
    fontWeight: "bold"
  }}
>
  Sign up with Google
</button>
        
      </div>
    </div>
  );
}

export default Register;