import React, { useState, useEffect } from "react";
import {
  TextInput,
  StyleSheet,
  Text,
  TouchableOpacity,
} from "react-native";
import AuthLayout from "../components/AuthInput";
import { COLORS } from "../theme/color";
import { auth, db } from "../firebase";
import { createUserWithEmailAndPassword, signOut } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

export default function RegisterScreen({ navigation }) {
  const [name, setName] = useState("");
  const [id, setId] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const clearFields = () => {
      setName("");
      setId("");
      setEmail("");
      setPassword("");
      setError("");
    };
    
    clearFields();
    
    const unsubscribe = navigation.addListener("focus", clearFields);
    return unsubscribe;
  }, [navigation]);

  const detectRoleFromEmail = (email: string): "student" | "professor" | null => {
    const cleanEmail = email.trim().toLowerCase();
    if (cleanEmail.endsWith("@std.sci.cu.edu.eg")) return "student";
    if (cleanEmail.endsWith("@sci.cu.edu.eg")) return "professor";
    return null;
  };

  const handleRegister = async () => {
    setError("");
    const role = detectRoleFromEmail(email);
    if (!role) {
      setError("Invalid email domain.");
      return;
    }
    if (!name || !email || !password || (role === "student" && !id)) {
      setError("All fields are required.");
      return;
    }

    try {
      setLoading(true);

      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );

      const user = userCredential.user;

      // 1️⃣ Save in "users" collection
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        name: name.trim(),
        email: email.trim(),
        role,
        studentId: role === "student" ? id : null,
        createdAt: serverTimestamp(),
      });

      // 2️⃣ Save in role-specific collection
      if (role === "student") {
        await setDoc(doc(db, "students", user.uid), {
          name,
          email,
          code: id,
          attendance: "0%",
          createdAt: serverTimestamp(),
        });
      } else if (role === "professor") {
        await setDoc(doc(db, "professors", user.uid), {
          name,
          email,
          courses: 0,
          attendance: "0%",
          createdAt: serverTimestamp(),
        });
      }

      console.log("User registered successfully");

      // Logout after registration
      await signOut(auth);

      navigation.replace("Login");
    } catch (err: any) {
      console.log("Register Error:", err);
      setError(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <TextInput
        placeholder="Name"
        style={styles.input}
        value={name}
        onChangeText={setName}
        autoCapitalize="words"
      />

      <TextInput
        placeholder="Email"
        style={styles.input}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
      />

      {detectRoleFromEmail(email) === "student" && (
        <TextInput
          placeholder="Student ID"
          style={styles.input}
          value={id}
          onChangeText={setId}
          autoCapitalize="none"
        />
      )}

      <TextInput
        placeholder="Password"
        style={styles.input}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        autoCapitalize="none"
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TouchableOpacity
        style={styles.button}
        onPress={handleRegister}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? "Registering..." : "Register"}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate("Login")}>
        <Text style={styles.link}>Already have an account? Login</Text>
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