import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { confirmPasswordReset } from "firebase/auth";
import { auth } from "../firebase";

const ForgotPasswordPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const oobCode = searchParams.get("oobCode");

  const handleResetPassword = async () => {
    setError("");

    if (!newPassword || !confirmPassword) {
      setError("Please fill in all fields");
      return;
    }

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (!oobCode) {
      setError("Invalid or expired reset link");
      return;
    }

    setLoading(true);
    try {
      await confirmPasswordReset(auth, oobCode, newPassword);
      alert("Password reset successful! You can now login with your new password.");
      navigate("/login");
    } catch (err) {
      console.error("Password reset error:", err);
      if (err.code === "auth/expired-action-code") {
        setError("Reset link has expired. Please request a new one.");
      } else if (err.code === "auth/invalid-action-code") {
        setError("Invalid reset link. Please request a new one.");
      } else {
        setError("Failed to reset password. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const passwordsMatch = newPassword && confirmPassword && newPassword === confirmPassword;
  const passwordsDontMatch = newPassword && confirmPassword && newPassword !== confirmPassword;

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.iconCircle}>
          <span style={styles.icon}>🔐</span>
        </div>
        
        <h2 style={styles.title}>Reset Your Password</h2>
        <p style={styles.subtitle}>Enter your new password below</p>
        
        {error && (
          <div style={styles.errorBox}>
            {error}
          </div>
        )}

        <div style={styles.inputWrapper}>
          <input 
            type={showPassword ? "text" : "password"}
            placeholder="New Password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            style={styles.input}
          />
          <span 
            onClick={() => setShowPassword(!showPassword)}
            style={styles.eyeIcon}
          >
            {showPassword ? "👁️" : "👁️‍🗨️"}
          </span>
        </div>

        <div style={styles.inputWrapper}>
          <input 
            type={showConfirmPassword ? "text" : "password"}
            placeholder="Confirm Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            style={{
              ...styles.input,
              borderColor: passwordsDontMatch ? "#EF4444" : passwordsMatch ? "#10B981" : "#CBD5E1"
            }}
          />
          <span 
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            style={styles.eyeIcon}
          >
            {showConfirmPassword ? "👁️" : "👁️‍🗨️"}
          </span>
        </div>

        {passwordsDontMatch && (
          <p style={styles.matchError}>❌ Passwords do not match</p>
        )}
        
        {passwordsMatch && (
          <p style={styles.matchSuccess}>✅ Passwords match</p>
        )}

        <button 
          onClick={handleResetPassword}
          disabled={loading || !passwordsMatch}
          style={{
            ...styles.button,
            opacity: loading || !passwordsMatch ? 0.6 : 1,
            cursor: loading || !passwordsMatch ? "not-allowed" : "pointer"
          }}
        >
          {loading ? "Resetting..." : "Reset Password"}
        </button>

        <button 
          onClick={() => navigate("/login")}
          style={styles.cancelBtn}
        >
          Back to Login
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
    minHeight: "100vh",
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    padding: "20px"
  },
  card: {
    background: "white",
    padding: "40px",
    borderRadius: "20px",
    boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
    width: "100%",
    maxWidth: "450px",
    textAlign: "center"
  },
  iconCircle: {
    width: "80px",
    height: "80px",
    borderRadius: "50%",
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 20px",
    boxShadow: "0 10px 25px rgba(102, 126, 234, 0.4)"
  },
  icon: {
    fontSize: "36px"
  },
  title: {
    color: "#173B66",
    margin: "0 0 10px 0",
    fontSize: "28px",
    fontWeight: "bold"
  },
  subtitle: {
    color: "#64748B",
    fontSize: "14px",
    marginBottom: "30px"
  },
  errorBox: {
    background: "#FEE2E2",
    color: "#DC2626",
    padding: "12px",
    borderRadius: "8px",
    marginBottom: "20px",
    fontSize: "14px",
    border: "1px solid #FCA5A5"
  },
  inputWrapper: {
    position: "relative",
    marginBottom: "20px"
  },
  input: {
    width: "100%",
    padding: "14px 45px 14px 15px",
    borderRadius: "10px",
    border: "2px solid #CBD5E1",
    fontSize: "16px",
    outline: "none",
    boxSizing: "border-box",
    transition: "border-color 0.3s"
  },
  eyeIcon: {
    position: "absolute",
    right: "15px",
    top: "50%",
    transform: "translateY(-50%)",
    cursor: "pointer",
    fontSize: "20px"
  },
  matchError: {
    color: "#EF4444",
    fontSize: "13px",
    marginTop: "-10px",
    marginBottom: "15px",
    textAlign: "left"
  },
  matchSuccess: {
    color: "#10B981",
    fontSize: "13px",
    marginTop: "-10px",
    marginBottom: "15px",
    textAlign: "left"
  },
  button: {
    width: "100%",
    padding: "14px",
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    color: "white",
    border: "none",
    borderRadius: "10px",
    fontWeight: "bold",
    fontSize: "16px",
    transition: "transform 0.2s, box-shadow 0.2s",
    boxShadow: "0 4px 15px rgba(102, 126, 234, 0.4)"
  },
  cancelBtn: {
    marginTop: "15px",
    background: "none",
    border: "none",
    color: "#64748B",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "500"
  }
};

export default ForgotPasswordPage;
