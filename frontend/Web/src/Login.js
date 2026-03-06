import { useState, useEffect, useRef } from "react";
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
  const formRef = useRef(null);


  useEffect(() => {
   
    setEmail("");
    setPassword("");
    setRole("");
    
    if (formRef.current) {
      formRef.current.reset();
    }
    
    const clearAllInputs = () => {
      const inputs = document.querySelectorAll('input, select');
      inputs.forEach(input => {
        if (input instanceof HTMLInputElement) {
          input.value = '';
          input.defaultValue = '';
        } else if (input instanceof HTMLSelectElement) {
          input.selectedIndex = 0;
        }
      });
    };
    
    clearAllInputs();
    setTimeout(clearAllInputs, 50);
    setTimeout(clearAllInputs, 100);
    setTimeout(clearAllInputs, 200);
    
    window.history.pushState(null, '', window.location.href);
    const handlePopState = () => {
      window.history.pushState(null, '', window.location.href);
    };
    window.addEventListener('popstate', handlePopState);
    
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  useEffect(() => {
    const clearForm = () => {
      setEmail("");
      setPassword("");
      setRole("");
      
      if (formRef.current) {
        formRef.current.reset();
      }
      
      setTimeout(() => {
        const inputs = document.querySelectorAll('input, select');
        inputs.forEach(input => {
          if (input instanceof HTMLInputElement) {
            input.value = '';
          } else if (input instanceof HTMLSelectElement) {
            input.selectedIndex = 0;
          }
        });
      }, 0);
    };
    
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        clearForm();
      }
    };
    
    const handleFocus = () => {
      clearForm();
    };
    
    const handlePageShow = (event) => {
      clearForm();
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('pageshow', handlePageShow);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('pageshow', handlePageShow);
    };
  }, []);

  const allowedAdminEmails = [
    "alaatantawy352@gmail.com",
    "mariam22khalid22@gmail.com",
    "mariamhany31017@gmail.com",
    "mariemkhaled2009@gmail.com",
    "shimaaabdelfatah13579@gmail.com",
    "mariam10182005@gmail.com"
  ];

  const handleGoogleLogin = async () => {
    if (!role) {
      alert("Please select a role first!");
      return;
    }

    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

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

        <form ref={formRef} onSubmit={(e) => e.preventDefault()}>
          <select 
            value={role} 
            onChange={(e) => setRole(e.target.value)} 
            style={{ 
              width: "100%", 
              padding: "10px 12px", 
              borderRadius: "8px", 
              border: "1px solid #CBD5E1", 
              height: "42px", 
              fontSize: "15px", 
              color: role ? "#000" : "#64748B", 
              background: "white", 
              marginBottom: "15px",
              fontWeight: role ? "600" : "normal"
            }}
            autoComplete="off"
          >
            <option value="" style={{ color: "#94A3B8", backgroundColor: "#F8FAFC" }}>-- Select Your Role --</option>
            <option value="student" style={{ color: "#000", fontWeight: "600", backgroundColor: "white", padding: "10px" }}>Student</option>
            <option value="professor" style={{ color: "#000", fontWeight: "600", backgroundColor: "white", padding: "10px" }}> Professor</option>
            <option value="admin" style={{ color: "#000", fontWeight: "600", backgroundColor: "white", padding: "10px" }}>Admin</option>
          </select>

          <input 
            type="email" 
            placeholder="Email" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            style={{ width: "100%", padding: "10px", marginBottom: "15px", borderRadius: "8px", border: "1px solid #CBD5E1", boxSizing: "border-box" }}
            autoComplete="off"
          />
          
          <input 
            type="password" 
            placeholder="Password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            style={{ width: "100%", padding: "10px", marginBottom: "20px", borderRadius: "8px", border: "1px solid #CBD5E1", boxSizing: "border-box" }}
            autoComplete="off"
          />

          <button 
            type="button"
            onClick={handleLogin} 
            style={{ width: "100%", padding: "12px", borderRadius: "8px", background: "#173B66", color: "white", border: "none", cursor: "pointer", fontWeight: "bold", fontSize: "16px" }}
          >
            Login
          </button>

          <button 
            type="button"
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
        </form>

        <p style={{ textAlign: "center", marginTop: "15px", color: "#64748B", fontSize: "14px" }}>
          Don't have account? <a href="/register" style={{ color: "#E68A45", textDecoration: "none", fontWeight: "bold" }}>Register here</a>
        </p>
      </div>
    </div>
  );
}

export default Login;
