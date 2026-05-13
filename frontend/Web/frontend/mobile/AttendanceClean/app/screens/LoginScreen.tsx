import React, { useState, useEffect } from "react";
import { TextInput, TouchableOpacity, Text, StyleSheet } from "react-native";
import AuthLayout from "../components/AuthInput";
import { COLORS } from "../theme/color";

import {
  signInWithEmailAndPassword,
  sendEmailVerification,
  getAuth,
  signOut,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebase";
import emailjs from "@emailjs/browser";

import { useAuth } from "../context/AuthContext";
type Props = { navigation: any };
import { getFunctions, httpsCallable } from "firebase/functions";

export default function LoginScreen({ navigation }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const { setUser, setRole: setUserRole } = useAuth();

  useEffect(() => {
    const clearFields = () => {
      setEmail("");
      setPassword("");
      setError("");
    };

    clearFields();

    const unsubscribe = navigation.addListener("focus", () => {
      clearFields();
    });

    return unsubscribe;
  }, [navigation]);

  const detectRoleFromEmail = (
    email: string,
  ): "student" | "professor" | null => {
    const cleanEmail = email.trim().toLowerCase();

    if (cleanEmail.endsWith("@std.sci.cu.edu.eg")) {
      return "student";
    } else if (cleanEmail.endsWith("@sci.cu.edu.eg")) {
      return "professor";
    }

    return null;
  };



  const handleLogin = async () => {
    setError("");

    if (!email || !password) {
      setError("Email and password are required.");
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    console.log("🔍 Attempting login with email:", cleanEmail);
    
    const detectedRole = detectRoleFromEmail(cleanEmail);
    console.log("🎭 Detected role:", detectedRole);

    if (!detectedRole) {
      setError(
        "Invalid email domain. Use @std.sci.cu.edu.eg for students or @sci.cu.edu.eg for professors.",
      );
      return;
    }

    try {
      const auth = getAuth();
      console.log("🔥 Firebase auth instance:", auth);
      console.log("📧 Signing in with email:", cleanEmail);
      
      const cred = await signInWithEmailAndPassword(auth, cleanEmail, password);

      await cred.user.reload();

      if (!cred.user.emailVerified) {
        try {
          await sendEmailVerification(cred.user);
          setError("Your account is not vefified Check your email first");
        } catch (err) {
          setError("error sending verifiction email.");
        }
        await signOut(auth);
        return;
      }

      const userRef = doc(db, "users", cred.user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        await auth.signOut();
        setError(
          "Your account is not fully registered yet. Please register first.",
        );
        return;
      }

      const userData = userSnap.data();

      if (userData.role?.toLowerCase() !== detectedRole) {
        await auth.signOut();
        setError(
          `Email indicates you are ${detectedRole}, but account is ${userData.role}.`,
        );
        return;
      }

      try {
      await fetch("http://192.168.1.2:5000/api/email/send-login-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: cleanEmail,
          name: userData.name || "User",
        }),
      });
    } catch (err) {
      console.log("Mobile login email failed:", err);
    }

      setUser(auth.currentUser);
      setUserRole(userData.role?.toLowerCase());

      setEmail("");
      setPassword("");
    } catch (err: any) {
      console.log("LOGIN ERROR:", err);
      if (
        err.code === "auth/wrong-password" ||
        err.code === "auth/user-not-found" ||
        err.code === "auth/invalid-credential"
      ) {
        setError("Invalid email or password.");
      } else {
        setError(err.message || "Login failed.");
      }
    }
  };

  return (
    <AuthLayout>
      <TextInput
        placeholder="Email"
        style={styles.input}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="off"
        textContentType="none"
      />

      <TextInput
        placeholder="Password"
        secureTextEntry
        style={styles.input}
        value={password}
        onChangeText={setPassword}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="off"
        textContentType="none"
      />

      <TouchableOpacity
        onPress={() => navigation.navigate("ForgotPassword")}
        style={styles.forgotPasswordContainer}
      >
        <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
      </TouchableOpacity>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TouchableOpacity style={styles.button} onPress={handleLogin}>
        <Text style={styles.buttonText}>Login</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate("Register")}>
        <Text style={styles.link}>Don't have an account? Register</Text>
      </TouchableOpacity>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: COLORS.background,
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  forgotPasswordContainer: {
    alignSelf: "flex-end",
    marginBottom: 15,
  },
  forgotPasswordText: {
    color: COLORS.primary,
    fontSize: 14,
    textDecorationLine: "underline",
  },
  button: {
    backgroundColor: COLORS.primary,
    padding: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: "white",
    textAlign: "center",
    fontWeight: "bold",
  },
  link: {
    color: COLORS.accent,
    textAlign: "center",
    marginTop: 15,
  },
  error: {
    color: "red",
    marginBottom: 10,
    textAlign: "center",
  },
});
