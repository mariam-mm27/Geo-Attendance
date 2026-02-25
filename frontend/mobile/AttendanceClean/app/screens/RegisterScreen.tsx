import React, { useState } from "react";
import {
  TextInput,
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
} from "react-native";
import AuthLayout from "../components/AuthInput";
import RolePicker from "../components/RoleSelector";
import { COLORS } from "../theme/color";

export default function RegisterScreen({ navigation }: any) {
  const [role, setRole] = useState("");
  const [name, setName] = useState("");
  const [id, setId] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleRegister = () => {
    setError("");

    if (!role || !name || !email || !password || (role === "student" && !id)) {
      setError("All fields are required.");
      return;
    }

    if (
      role === "student" &&
      !email.endsWith("@std.sci.cu.edu.eg")
    ) {
      setError("Student email must end with @std.sci.cu.edu.eg");
      return;
    }

    if (
      role === "professor" &&
      !email.endsWith("@gmail.com")
    ) {
      setError("Professor email must end with @gmail.com");
      return;
    }

    // Clear fields
    setName("");
    setId("");
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
      />

      <TextInput
        placeholder="Password"
        secureTextEntry
        style={styles.input}
        value={password}
        onChangeText={setPassword}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TouchableOpacity style={styles.button} onPress={handleRegister}>
        <Text style={styles.buttonText}>Register</Text>
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