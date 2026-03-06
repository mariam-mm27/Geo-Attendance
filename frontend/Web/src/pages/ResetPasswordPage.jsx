import React, { useState, useEffect } from "react";
import { auth, db } from "../firebase";
import { updatePassword } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";

const ResetPasswordPage = () => {
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [loading, setLoading] = useState(false);
  const [userRole, setUserRole] = useState("student");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchRole = async () => {
      if (auth.currentUser) {
        const docRef = doc(db, "users", auth.currentUser.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setUserRole(docSnap.data().role);
        }
      }
    };
    fetchRole();
  }, []);

  const handleChangePassword = async () => {
    if (newPass.length < 6) return alert("Password must be at least 6 characters.");
    if (newPass !== confirmPass) return alert("Passwords do not match!");

    setLoading(true);
    try {
      await updatePassword(auth.currentUser, newPass);
      alert("Password updated! For security, please login again.");
      await auth.signOut();
      window.location.replace("/login");
    } catch (err) {
      alert("Security Error: Please log out and log in again before changing your password.");
    } finally {
      setLoading(false);
    }
  };
  const handleBackNavigation = () => {
    if (userRole === "professor") {
      navigate("/professor");
    } else if (userRole === "admin") {
      navigate("/admin");
    } else {
      navigate("/student");
    }
  };

  return (
    <div style={styles.container}>
      {/* سهم الباك الأزرق */}
      <div style={styles.backWrapper} onClick={handleBackNavigation}>
        <span style={styles.backArrow}>←</span>
        <span style={styles.backText}>Back</span>
      </div>

      <div style={styles.card}>
        <div style={{...styles.iconCircle, background: "#E0E7FF"}}>🔑</div>
        
        <h2 style={styles.title}>Secure Reset</h2>
        <p style={styles.subtitle}>Enter your new password below</p>
        
        <input 
          type="password"
          placeholder="New Password"
          style={styles.input}
          onChange={(e) => setNewPass(e.target.value)} 
        />
        <input 
          type="password"
          placeholder="Confirm New Password"
          style={styles.input}
          onChange={(e) => setConfirmPass(e.target.value)} 
        />
        
        <button 
          onClick={handleChangePassword} 
          disabled={loading}
          style={{...styles.button, background: "#173B66"}}
        >
          {loading ? "Updating..." : "Update Password"}
        </button>
        
        <button onClick={handleBackNavigation} style={styles.cancelBtn}>
          Cancel
        </button>
      </div>
    </div>
  );
};

const styles = {
    container: { 
      display: "flex", 
      justifyContent: "center", 
      alignItems: "center", 
      height: "100vh", 
      background: "#F1F5F9",
      position: "relative" 
    },
    backWrapper: {
      position: "absolute",
      top: "20px",
      left: "20px",
      display: "flex",
      alignItems: "center",
      gap: "5px",
      cursor: "pointer",
      color: "#173B66", 
      transition: "0.3s"
    },
    backArrow: {
      fontSize: "24px",
      fontWeight: "bold"
    },
    backText: {
      fontSize: "16px",
      fontWeight: "600"
    },
    card: { background: "white", padding: "40px", borderRadius: "20px", boxShadow: "0 10px 25px rgba(0,0,0,0.05)", width: "100%", maxWidth: "400px", textAlign: "center" },
    iconCircle: { width: "60px", height: "60px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", fontSize: "24px" },
    title: { color: "#173B66", margin: "0 0 10px 0", fontSize: "24px" },
    subtitle: { color: "#64748B", fontSize: "14px", marginBottom: "30px" },
    input: { width: "100%", padding: "12px 15px", marginBottom: "20px", borderRadius: "10px", border: "1px solid #CBD5E1", fontSize: "16px", outline: "none", boxSizing: "border-box" },
    button: { width: "100%", padding: "14px", color: "white", border: "none", borderRadius: "10px", cursor: "pointer", fontWeight: "bold", fontSize: "16px", transition: "0.3s" },
    cancelBtn: { marginTop: "15px", background: "none", border: "none", color: "#94A3B8", cursor: "pointer", fontSize: "14px", fontWeight: "500" }
};

export default ResetPasswordPage;