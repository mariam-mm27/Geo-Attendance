import React, { useState } from "react";
import {
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
} from "react-native";

import AuthLayout from "../components/AuthInput";
import RolePicker from "../components/RoleSelector";
import { COLORS } from "../theme/color";

import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebase";

import { useAuth } from "../context/AuthContext";

export default function LoginScreen({ navigation }: any) {
  const [role, setRole] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const { setUser, setRole: setUserRole } = useAuth();

  const handleLogin = async () => {
    setError("");

    // 1️⃣ Validation
    if (!role || !email || !password) {
      setError("All fields are required");
      return;
    }

    const cleanEmail = email.trim().toLowerCase();

    // Student domain check
    if (role === "student" && !cleanEmail.endsWith("@std.sci.cu.edu.eg")) {
      setError("Invalid student email domain");
      return;
    }

    // Professor domain check
    if (role === "professor" && !cleanEmail.endsWith("@sci.cu.edu.eg")) {
      setError("Invalid professor email domain");
      return;
    }

    try {
      // 2️⃣ Login with Firebase
      const cred = await signInWithEmailAndPassword(
        auth,
        cleanEmail,
        password
      );

      // 3️⃣ Get user data from Firestore
      const userRef = doc(db, "users", cred.user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        await auth.signOut();
        setError("Account not registered. Please register first.");
        return;
      }

      const userData = userSnap.data();

      // 4️⃣ Role security check
      if (userData.role.toLowerCase() !== role.toLowerCase()) {
        await auth.signOut();
        setError("Selected role does not match your account");
        return;
      }

      // 5️⃣ Save in context
      setUser(cred.user);
      setUserRole(userData.role);

      // 6️⃣ Navigate based on role
      if (userData.role.toLowerCase() === "student") {
        navigation.replace("StudentHome");
      } else if (userData.role.toLowerCase() === "professor") {
        navigation.replace("ProfessorHome");
      } else {
        setError("Invalid user role");
      }

      // 7️⃣ Clear inputs
      setEmail("");
      setPassword("");

    } catch (err: any) {
      console.log("LOGIN ERROR:", err);

      if (err.code === "auth/user-not-found") {
        setError("User not found");
      } else if (err.code === "auth/wrong-password") {
        setError("Incorrect password");
      } else if (err.code === "auth/invalid-email") {
        setError("Invalid email format");
      } else {
        setError("Login failed. Please try again.");
      }
    }
  };

  return (
    <AuthLayout>
      <RolePicker role={role} setRole={setRole} />

      <TextInput
        placeholder="Email"
        style={styles.input}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
      />

      <TextInput
        placeholder="Password"
        secureTextEntry
        style={styles.input}
        value={password}
        onChangeText={setPassword}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TouchableOpacity style={styles.button} onPress={handleLogin}>
        <Text style={styles.buttonText}>Login</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, { backgroundColor: COLORS.secondary }]}
      >
        <Text style={styles.buttonText}>Login with Google</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate("Register")}>
        <Text style={styles.link}>
          Don't have an account? Register
        </Text>
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
  button: {
    backgroundColor: COLORS.primary,
    padding: 12,
    borderRadius: 8,
    marginTop: 5,
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