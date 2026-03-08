import { useState, useEffect, useRef } from "react";
import { validateLogin } from "./utils/validation";
import { 
  signInWithEmailAndPassword, 
  signOut, 
  GoogleAuthProvider, 
  signInWithPopup,
  sendPasswordResetEmail
} from "firebase/auth"; 
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "./firebase";
import { useNavigate } from "react-router-dom";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const navigate = useNavigate();
  const formRef = useRef(null);


  useEffect(() => {
   
    setEmail("");
    setPassword("");
    
    if (formRef.current) {
      formRef.current.reset();
    }
    
    const clearAllInputs = () => {
      const inputs = document.querySelectorAll('input');
      inputs.forEach(input => {
        if (input instanceof HTMLInputElement) {
          input.value = '';
          input.defaultValue = '';
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
      
      if (formRef.current) {
        formRef.current.reset();
      }
      
      setTimeout(() => {
        const inputs = document.querySelectorAll('input');
        inputs.forEach(input => {
          if (input instanceof HTMLInputElement) {
            input.value = '';
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

  const handleGoogleLogin = async () => {
    if (!email) {
      alert("Please enter your email first to verify your role!");
      return;
    }

    const detectedRole = detectRoleFromEmail(email);
    if (!detectedRole) {
      alert("Invalid email domain. Please use:\n- @std.sci.cu.edu.eg for students\n- @sci.cu.edu.eg for professors\n- Authorized admin emails");
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
    const detectedRole = detectRoleFromEmail(userEmail);

    if (!detectedRole) {
      alert("Invalid email domain.");
      signOut(auth);
      return;
    }

    if (userRoleInDB !== detectedRole) {
      alert(`Role Mismatch! Your email indicates you are ${detectedRole}, but DB says ${userRoleInDB}.`);
      signOut(auth);
      return;
    }

    if (userRoleInDB === "admin") {
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

    const detectedRole = detectRoleFromEmail(email);
    if (!detectedRole) {
      alert("Invalid email domain. Please use:\n- @std.sci.cu.edu.eg for students\n- @sci.cu.edu.eg for professors\n- Authorized admin emails");
      return;
    }

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

  const handleForgotPassword = async () => {
    if (!resetEmail.trim()) {
      alert("Please enter your email address");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(resetEmail)) {
      alert("Please enter a valid email address");
      return;
    }

    try {
      console.log("Attempting to send password reset email to:", resetEmail.trim());
      
      const actionCodeSettings = {
        url: window.location.origin + '/forgot-password',
        handleCodeInApp: true
      };
      
      await sendPasswordResetEmail(auth, resetEmail.trim(), actionCodeSettings);
      
      console.log("Password reset email sent successfully");
      alert("Password reset email sent successfully! Please check your inbox and spam folder.");
      setShowForgotPassword(false);
      setResetEmail("");
    } catch (error) {
      console.error("Password reset error:", error);
      console.error("Error code:", error.code);
      console.error("Error message:", error.message);
      
      if (error.code === 'auth/user-not-found') {
        alert("No account found with this email address.");
      } else if (error.code === 'auth/invalid-email') {
        alert("Invalid email address.");
      } else if (error.code === 'auth/missing-email') {
        alert("Please enter an email address.");
      } else {
        alert("Error: " + error.message + "\n\nPlease check the console for details.");
      }
    }
  };

  return (
    <div style={{ background: "#F8FAFC", height: "100vh", display: "flex", justifyContent: "center", alignItems: "center", position: "relative" }}>
      <div onClick={() => navigate("/register")} style={{ position: "absolute", top: "20px", left: "20px", display: "flex", alignItems: "center", gap: "5px", cursor: "pointer", color: "#173B66", fontWeight: "bold" }}>
        <span style={{ fontSize: "24px" }}>←</span>
        <span>Register</span>
      </div>

      {showForgotPassword && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "white", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 }} onClick={() => setShowForgotPassword(false)}>
          <div style={{ background: "white", padding: "30px", borderRadius: "12px", width: "400px", boxShadow: "0 4px 6px rgba(0,0,0,0.1)" }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ color: "#173B66", marginTop: 0, marginBottom: "10px" }}>Reset Password</h2>
            <p style={{ color: "#64748B", fontSize: "14px", marginBottom: "20px" }}>Enter your email address and we'll send you a link to reset your password.</p>
            
            <input 
              type="email" 
              placeholder="Enter your email" 
              value={resetEmail} 
              onChange={(e) => setResetEmail(e.target.value)} 
              style={{ width: "100%", padding: "12px", marginBottom: "20px", borderRadius: "8px", border: "1px solid #CBD5E1", boxSizing: "border-box" }}
              autoComplete="off"
            />
            
            <div style={{ display: "flex", gap: "10px" }}>
              <button 
                onClick={handleForgotPassword} 
                style={{ flex: 1, padding: "12px", borderRadius: "8px", background: "#173B66", color: "white", border: "none", cursor: "pointer", fontWeight: "bold" }}
              >
                Send Reset Link
              </button>
              <button 
                onClick={() => { setShowForgotPassword(false); setResetEmail(""); }} 
                style={{ flex: 1, padding: "12px", borderRadius: "8px", background: "#E2E8F0", color: "#64748B", border: "none", cursor: "pointer", fontWeight: "bold" }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ width: "350px", padding: "30px", borderRadius: "12px", border: "1px solid #CBD5E1", background: "white", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)" }}>
        <div style={{ textAlign: "center" }}>
          <h1 style={{ color: "#173B66", marginBottom: "5px", fontSize: "32px" }}>Attendance</h1>
          <h2 style={{ color: "#173B66", fontSize: "24px", marginBottom: "20px" }}>Login</h2>
        </div>

        <form ref={formRef} onSubmit={(e) => e.preventDefault()}>
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
            style={{ width: "100%", padding: "10px", marginBottom: "10px", borderRadius: "8px", border: "1px solid #CBD5E1", boxSizing: "border-box" }}
            autoComplete="off"
          />

          <div style={{ textAlign: "right", marginBottom: "20px" }}>
            <span 
              onClick={() => setShowForgotPassword(true)} 
              style={{ color: "#173B66", fontSize: "14px", cursor: "pointer", textDecoration: "underline" }}
            >
              Forgot Password?
            </span>
          </div>

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
