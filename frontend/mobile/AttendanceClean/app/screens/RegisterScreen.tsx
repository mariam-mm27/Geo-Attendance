import React, { useState } from "react";
import {
  TextInput,
  StyleSheet,
  Text,
  TouchableOpacity,
} from "react-native";
import AuthLayout from "../components/AuthInput";
import RolePicker from "../components/RoleSelector";
import { COLORS } from "../theme/color";
import { signOut } from "firebase/auth";

import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../firebase"; // عدلي المسار لو مختلف

export default function RegisterScreen({ navigation }: any) {
  const [role, setRole] = useState("");
  const [name, setName] = useState("");
  const [id, setId] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
  setError("");

  if (!role || !name || !email || !password || (role === "student" && !id)) {
    setError("All fields are required.");
    return;
  }

  if (role === "student" && !email.endsWith("@std.sci.cu.edu.eg")) {
    setError("Student email must end with @std.sci.cu.edu.eg");
    return;
  }

  if (role === "professor" && !email.endsWith("@sci.cu.edu.eg")) {
    setError("Professor email must end with @sci.cu.edu.eg");
    return;
  }

  try {
    setLoading(true);

    // ✅ 1- تسجيل في Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email.trim(),
      password
    );

    const user = userCredential.user;

    // ✅ 2- تخزين في Firestore وربطه بالـ UID
    await setDoc(doc(db, "users", user.uid), {
      uid: user.uid,
      name: name.trim(),
      email: email.trim(),
      role: role,
      studentId: role === "student" ? id : null,
      createdAt: serverTimestamp(),
    });

    console.log("User registered & saved successfully");

    // ✅ 3- Logout علشان ميحولكيش على Home
    await signOut(auth);

    // ✅ 4- يروح Login
    navigation.replace("Login");

  } catch (error: any) {
    console.log("Register Error:", error.code);
    setError(error.message);
  } finally {
    setLoading(false);
  }
};

  return (
    <AuthLayout>
      <RolePicker role={role} setRole={setRole} />

      <TextInput
        placeholder="Name"
        style={styles.input}
        value={name}
        onChangeText={setName}
      />

      {role === "student" && (
        <TextInput
          placeholder="ID"
          style={styles.input}
          value={id}
          onChangeText={setId}
        />
      )}

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