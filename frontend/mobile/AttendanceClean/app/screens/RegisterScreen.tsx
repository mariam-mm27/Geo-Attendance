import React, { useState, useEffect } from "react";
import {
  TextInput,
  StyleSheet,
  Text,
  TouchableOpacity,
} from "react-native";
import AuthLayout from "../components/AuthInput";
import { COLORS } from "../theme/color";
import { validateRegister } from "../utils/validation";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../firebase";

export default function RegisterScreen({ navigation }: any) {
  const [name, setName] = useState("");
  const [id, setId] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const clearFields = () => {
      setName("");
      setId("");
      setEmail("");
      setPassword("");
      setError("");
    };
    
    clearFields();
    
    const unsubscribe = navigation.addListener('focus', () => {
      clearFields();
    });
    
    return unsubscribe;
  }, [navigation]);

  const detectRoleFromEmail = (email: string): string | null => {
    const cleanEmail = email.trim().toLowerCase();
    
    if (cleanEmail.endsWith("@std.sci.cu.edu.eg")) {
      return "student";
    } else if (cleanEmail.endsWith("@sci.cu.edu.eg")) {
      return "professor";
    }
    
    return null;
  };

  const handleRegister = async () => {
    setError("");

    const role = detectRoleFromEmail(email);

    if (!role) {
      setError("Invalid email domain. Use @std.sci.cu.edu.eg for students or @sci.cu.edu.eg for professors.");
      return;
    }

    const errorMessage = validateRegister({
      role,
      name,
      id,
      email,
      password,
    });

    if (errorMessage) {
      setError(errorMessage);
      return;
    }

    try {
      const cred = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

      await setDoc(doc(db, "users", cred.user.uid), {
        name,
        email,
        role: role.toLowerCase(),
        studentId: role === "student" ? id : null,
        createdAt: serverTimestamp(),
      });

      if (role === "student") {
        await setDoc(doc(db, "students", cred.user.uid), {
          name,
          email,
          code: id,
          attendance: "0%",
          createdAt: serverTimestamp(),
        });
      } else if (role === "professor") {
        await setDoc(doc(db, "professors", cred.user.uid), {
          name,
          email,
          courses: 0,
          attendance: "0%",
          createdAt: serverTimestamp(),
        });
      }

      setName("");
      setId("");
      setEmail("");
      setPassword("");


    } catch (err: any) {
      console.log("REGISTER ERROR:", err);
      setError(err.message || "Registration failed");
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
        autoCorrect={false}
        autoComplete="off"
        textContentType="none"
      />

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

      {detectRoleFromEmail(email) === "student" && (
        <TextInput
          placeholder="Student ID"
          style={styles.input}
          value={id}
          onChangeText={setId}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="off"
          textContentType="none"
        />
      )}

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

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TouchableOpacity style={styles.button} onPress={handleRegister}>
        <Text style={styles.buttonText}>Register</Text>
      </TouchableOpacity>

      {}
      {}

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
