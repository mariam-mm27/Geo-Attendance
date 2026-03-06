import { useState } from "react";
import { validateLogin } from "./utils/validation";
import { 
  signInWithEmailAndPassword, 
  signOut, 
  GoogleAuthProvider, 
  signInWithPopup 
} from "firebase/auth"; 
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "./firebase";
import { useNavigate } from "react-router-dom";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("");
  const navigate = useNavigate();

  const allowedAdminEmails = [
    "alaatantawy352@gmail.com",
    "mariam22khalid22@gmail.com",
    "mariamhany31017@gmail.com",
    "mariemkhaled2009@gmail.com",
    "shimaaabdelfatah13579@gmail.com",
    "mariam10182005@gmail.com"
  ];

  // دالة تسجيل الدخول بـ جوجل
  const handleGoogleLogin = async () => {
    if (!role) {
      alert("Please select a role first!");
      return;
    }

    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // التأكد من وجود اليوزر في Firestore
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        alert("This Google account is not registered in our database. Please register first.");
        await signOut(auth);
        return;
      }

      const userData = userSnap.data();
      redirectUser(userData, user.email);

    } catch (error) {
      console.error("Google Login Error:", error);
      alert("Google Login Failed: " + error.message);
    }
  };

  // دالة مشتركة للتوجيه (عشان منكررش الكود)
  const redirectUser = (userData, userEmail) => {
    const userRoleInDB = userData.role ? userData.role.toLowerCase().trim() : "";
    const selectedRole = role.toLowerCase().trim();

    if (userRoleInDB !== selectedRole) {
      alert(`Role Mismatch! DB says you are ${userRoleInDB}.`);
      signOut(auth);
      return;
    }

    if (userRoleInDB === "admin") {
      if (!allowedAdminEmails.includes(userEmail.toLowerCase().trim())) {
        alert("Unauthorized Admin Email.");
        signOut(auth);
        return;
      }
      window.location.replace("/admin");
    } else if (userRoleInDB === "professor") {
      window.location.replace("/professor");
    } else {
      window.location.replace("/student");
    }
  };

  const handleLogin = async () => {
    const error = validateLogin({ email, password });
    if (error) { alert(error); return; }
    if (!role) { alert("Please select a role!"); return; }

    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
      const userRef = doc(db, "users", cred.user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        alert("Account not found in Database.");
        await signOut(auth);
        return;
      }

      redirectUser(userSnap.data(), email);

    } catch (err) {
      alert("Invalid email or password.");
    }
  };

  return (
    <div style={{ background: "#F8FAFC", height: "100vh", display: "flex", justifyContent: "center", alignItems: "center", position: "relative" }}>
      <div onClick={() => navigate("/register")} style={{ position: "absolute", top: "20px", left: "20px", display: "flex", alignItems: "center", gap: "5px", cursor: "pointer", color: "#173B66", fontWeight: "bold" }}>
        <span style={{ fontSize: "24px" }}>←</span>
        <span>Register</span>
      </div>

      <div style={{ width: "350px", padding: "30px", borderRadius: "12px", border: "1px solid #CBD5E1", background: "white", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)" }}>
        <div style={{ textAlign: "center" }}>
          <h1 style={{ color: "#173B66", marginBottom: "5px", fontSize: "32px" }}>Attendance</h1>
          <h2 style={{ color: "#173B66", fontSize: "24px", marginBottom: "20px" }}>Login</h2>
        </div>

        <select value={role} onChange={(e) => setRole(e.target.value)} style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", height: "42px", fontSize: "14px", color: "#000", background: "white", marginBottom: "15px" }}>
          <option value="" disabled>Select Role</option>
          <option value="student">Student</option>
          <option value="professor">Professor</option>
          <option value="admin">Admin</option>
        </select>

        <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} style={{ width: "100%", padding: "10px", marginBottom: "15px", borderRadius: "8px", border: "1px solid #CBD5E1", boxSizing: "border-box" }} />
        <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} style={{ width: "100%", padding: "10px", marginBottom: "20px", borderRadius: "8px", border: "1px solid #CBD5E1", boxSizing: "border-box" }} />

        <button onClick={handleLogin} style={{ width: "100%", padding: "12px", borderRadius: "8px", background: "#173B66", color: "white", border: "none", cursor: "pointer", fontWeight: "bold", fontSize: "16px" }}>
          Login
        </button>

       <button 
  onClick={handleGoogleLogin} 
  style={{ 
    width: "100%", 
    marginTop: "12px", 
    padding: "10px", 
    borderRadius: "8px", 
    background: "#1B8F85", 
    color: "white", 
    border: "none", 
    cursor: "pointer", 
    fontWeight: "bold", 
    fontSize: "15px"
  }}
>
  Login with Google
</button>

        <p style={{ textAlign: "center", marginTop: "15px", color: "#64748B", fontSize: "14px" }}>
          Don't have account? <a href="/register" style={{ color: "#E68A45", textDecoration: "none", fontWeight: "bold" }}>Register here</a>
        </p>
      </div>
    </div>
  );
}

export default Login;