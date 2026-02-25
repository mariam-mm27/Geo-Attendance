import React, { useState } from "react";
import { View, TextInput, Button, Text, StyleSheet, TouchableOpacity } from "react-native";
import AuthLayout from "../components/AuthInput";
import RolePicker from "../components/RoleSelector";
import { COLORS } from "../theme/color";

export default function LoginScreen({ navigation }: any) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("");

  const handleLogin = () => {
    if (!role) return alert("Please select role");

    // Clear inputs
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

      <View style={styles.button}>
        <Button title="Login" color={COLORS.primary} onPress={handleLogin} />
      </View>

      <View style={styles.button}>
        <Button title="Login with Google" color={COLORS.secondary} />
      </View>

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
    marginBottom: 15,
  },
  button: {
    marginBottom: 10,
  },
  link: {
    textAlign: "center",
    color: COLORS.accent,
    marginTop: 10,
  },
});