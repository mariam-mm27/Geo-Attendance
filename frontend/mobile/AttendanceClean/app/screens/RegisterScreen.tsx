import React, { useState } from "react";
import { TextInput, Button, StyleSheet, View } from "react-native";
import AuthLayout from "../components/AuthInput";
import RolePicker from "../components/RoleSelector";
import { COLORS } from "../theme/color";

export default function RegisterScreen({ navigation }: any) {
  const [role, setRole] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");

  const handleRegister = () => {
    if (!role) return alert("Select role");

    // Clear everything
    setName("");
    setPhone("");
    setEmail("");
    setId("");
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

      {role === "student" && (
        <>
          <TextInput
            placeholder="Name"
            style={styles.input}
            value={name}
            onChangeText={setName}
          />
          <TextInput
            placeholder="Phone Number"
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
          />
          <TextInput
            placeholder="Email"
            style={styles.input}
            value={email}
            onChangeText={setEmail}
          />
        </>
      )}

      {role === "professor" && (
        <TextInput
          placeholder="Email"
          style={styles.input}
          value={email}
          onChangeText={setEmail}
        />
      )}

      <TextInput
        placeholder="ID"
        style={styles.input}
        value={id}
        onChangeText={setId}
      />

      <TextInput
        placeholder="Password"
        secureTextEntry
        style={styles.input}
        value={password}
        onChangeText={setPassword}
      />

      <View style={styles.button}>
        <Button title="Register" color={COLORS.primary} onPress={handleRegister} />
      </View>

      <View style={styles.button}>
        <Button title="Signup with Google" color={COLORS.secondary} />
      </View>
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
});