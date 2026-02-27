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

export default function LoginScreen({ navigation }: any) {
  const [role, setRole] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = () => {
    setError("");

    if (!role || !email || !password) {
      setError("All fields are required.");
      return;
    }

    if (
      role === "student" &&
      !email.endsWith("@std.sci.cu.edu.eg")
    ) {
      setError("Invalid student email domain.");
      return;
    }

    if (
      role === "professor" &&
      !email.endsWith("@sci.cu.edu.eg")
    ) {
      setError("Invalid professor email domain.");
      return;
    }

    // Clear
    setEmail("");
    setPassword("");

    if (role === "student") {
      navigation.replace("StudentHome");
    } else {
      navigation.replace("ProfessorHome");
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