import { useState } from "react";
import { validateRegister } from "./utils/validation";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "./firebase";
import { useNavigate } from "react-router-dom";
import Modal from "./components/Modal";
import { useModal } from "./hooks/useModal";

function Register() {
  const [name, setName] = useState("");
  const [id, setId] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [adminCode, setAdminCode] = useState("");
  const navigate = useNavigate();
  const { modalState, closeModal, showSuccess, showError, showWarning } = useModal(); 

  const allowedAdminEmails = [
    "alaatantawy352@gmail.com",
    "mariam22khalid22@gmail.com",
    "mariamhany31017@gmail.com",
    "mariemkhaled2009@gmail.com",
    "shimaaabdelfatah13579@gmail.com",
    "mariam10182005@gmail.com"
  ];

  const detectRoleFromEmail = (email) => {
    const cleanEmail = email.trim().toLowerCase();
    
    if (allowedAdminEmails.includes(cleanEmail)) {
      return "admin";
    } else if (cleanEmail.endsWith("@std.sci.cu.edu.eg")) {
      return "student";
    } else if (cleanEmail.endsWith("@sci.cu.edu.eg")) {
      return "professor";
    }
    
    return null;
  };

  const handleRegister = async () => {
    const role = detectRoleFromEmail(email);
    
    if (!role) {
      showWarning("Invalid email domain. Please use:\n- @std.sci.cu.edu.eg for students\n- @sci.cu.edu.eg for professors\n- Authorized admin emails", "Invalid Email");
      return;
    }

    const error = validateRegister({
      role,
      name,
      email,
      password,
      studentId: role === "student" ? id : null,
      adminCode: role === "admin" ? adminCode : null 
    });

    if (error) {
      showWarning(error);
      return;
    }

    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);

      // Save to users collection
      await setDoc(doc(db, "users", cred.user.uid), {
        name,
        email,
        role,
        studentId: role === "student" ? id : null,
        createdAt: new Date()
      });

      // Also save to role-specific collection
      if (role === "student") {
        await setDoc(doc(db, "students", cred.user.uid), {
          name,
          email,
          code: id,
          attendance: "0%",
          createdAt: new Date().toISOString()
        });
      } else if (role === "professor") {
        await setDoc(doc(db, "professors", cred.user.uid), {
          name,
          email,
          courses: 0,
          attendance: "0%",
          createdAt: new Date().toISOString()
        });
      }

      showSuccess("Registration successful!", "Success", () => {
        if (role === "professor") {
          window.location.replace("/professor");
        } else if (role === "student") { 
          window.location.replace("/student");
        } else if (role === "admin") {
          window.location.replace("/admin");
        }
      });

    } catch (err) {
      showError("Error: " + err.message);
    }
  };

  return (
    <div style={{
      background: "#F8FAFC",
      height: "100vh",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      position: "relative" 
    }}>
      
      {}
      <div 
        onClick={() => navigate("/login")}
        style={{
          position: "absolute", top: "20px", left: "20px",
          display: "flex", alignItems: "center", gap: "5px",
          cursor: "pointer", color: "#173B66", fontWeight: "bold"
        }}
      >
        <span style={{ fontSize: "24px" }}>←</span>
        <span> Login</span>
      </div>

      <div 
        autoComplete="off"
        style={{
          width: "350px",
          padding: "30px",
          borderRadius: "12px",
          border: "1px solid #CBD5E1",
          background: "white",
          boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)"
        }}
      >
        <h2 style={{ color: "#173B66", textAlign: "center", marginBottom: "20px" }}>
          Create Account
        </h2>

        <input
          placeholder="Full Name"
          autoComplete="off"
          style={{
            width: "100%", padding: "12px", marginTop: "10px",
            borderRadius: "8px", border: "1px solid #CBD5E1", boxSizing: "border-box"
          }}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <input
          placeholder="Email Address"
          autoComplete="off"
          style={{
            width: "100%", padding: "12px", marginTop: "15px",
            borderRadius: "8px", border: "1px solid #CBD5E1", boxSizing: "border-box"
          }}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        {detectRoleFromEmail(email) === "student" && (
          <input
            placeholder="Student ID"
            autoComplete="off"
            style={{
              width: "100%", padding: "12px", marginTop: "15px",
              borderRadius: "8px", border: "1px solid #CBD5E1", boxSizing: "border-box"
            }}
            value={id}
            onChange={(e) => setId(e.target.value)}
          />
        )}

        <input
          type="password"
          placeholder="Password"
          autoComplete="new-password"
          style={{
            width: "100%", padding: "12px", marginTop: "15px",
            borderRadius: "8px", border: "1px solid #CBD5E1", boxSizing: "border-box"
          }}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          onClick={handleRegister}
          style={{
            width: "100%", marginTop: "25px", padding: "12px",
            borderRadius: "8px", background: "#173B66",
            color: "white", border: "none", cursor: "pointer", fontWeight: "bold",
            fontSize: "15px"
          }}
        >
          Register
        </button>

        <p style={{ textAlign: "center", marginTop: "20px", fontSize: "14px", color: "#64748B" }}>
            Already have an account? <a href="/login" style={{ color: "#E68A45", fontWeight: "bold", textDecoration: "none" }}>Login</a>
        </p>
        
      </div>
      <Modal 
        isOpen={modalState.isOpen}
        onClose={closeModal}
        title={modalState.title}
        message={modalState.message}
        type={modalState.type}
        confirmText={modalState.confirmText}
        onConfirm={modalState.onConfirm}
      />
    </div>
  );
}

export default Register;