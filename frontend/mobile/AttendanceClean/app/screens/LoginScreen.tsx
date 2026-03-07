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

  React.useEffect(() => {
    const clearFields = () => {
      setRole("");
      setEmail("");
      setPassword("");
      setError("");
    };
    
    clearFields();
    
    // Also clear when screen comes into focus
    const unsubscribe = navigation.addListener('focus', () => {
      clearFields();
    });
    
    return unsubscribe;
  }, [navigation]);

  const handleLogin = async () => {
    setError("");

    if (!role || !email || !password) {
      setError("All fields are required.");
      return;
    }

    const cleanEmail = email.trim().toLowerCase();

    if (role === "student" && !cleanEmail.endsWith("@std.sci.cu.edu.eg")) {
      setError("Invalid student email domain.");
      return;
    }

    if (role === "professor" && !cleanEmail.endsWith("@sci.cu.edu.eg")) {
      setError("Invalid professor email domain.");
      return;
    }

    try {
      const cred = await signInWithEmailAndPassword(auth, cleanEmail, password);

      const userRef = doc(db, "users", cred.user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        await auth.signOut();
        setError("Your account is not fully registered yet. Please register first.");
        return;
      }

      const userData = userSnap.data();

      if (userData.role !== role.toLowerCase()) {
        await auth.signOut();
        setError("Selected role does not match your account.");
        return;
      }

      setUser(cred.user);
      setUserRole(userData.role);

      if (userData.role === "student") {
        navigation.replace("StudentHome", {
          user: {
            name: userData.name,
            id: cred.user.uid,
            email: cred.user.email,
          }
        });
      } else if (userData.role === "professor") {
        navigation.replace("ProfessorHome", {
          user: {
            name: userData.name,
            id: cred.user.uid,
            email: cred.user.email,
          }
        });
      }

      // Clear fields after successful login
      setEmail("");
      setPassword("");
      setRole("");

    } catch (err: any) {
      console.log("LOGIN ERROR:", err);
      setError(err.message || "Login failed");
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
