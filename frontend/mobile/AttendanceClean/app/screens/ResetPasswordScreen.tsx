import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { updatePassword } from "firebase/auth";
import { auth } from "../firebase";

export default function ResetPasswordScreen({ navigation }: any) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleResetPassword = async () => {
    if (!newPassword || !confirmPassword) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert("Error", "New passwords do not match");
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters");
      return;
    }

    setLoading(true);

    try {
      const user = auth.currentUser;
      if (!user) {
        Alert.alert("Error", "No user logged in");
        setLoading(false);
        return;
      }

      await updatePassword(user, newPassword);

      Alert.alert("Success", "Password updated successfully! Please log in again.", [
        {
          text: "OK",
          onPress: async () => {
            await auth.signOut();
            navigation.reset({
              index: 0,
              routes: [{ name: 'Login' }],
            });
          },
        },
      ]);

      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      console.error("Reset password error:", error);
      if (error.code === "auth/requires-recent-login") {
        Alert.alert(
          "Security Error", 
          "For security reasons, please log out and log in again before changing your password.",
          [
            {
              text: "OK",
              onPress: () => navigation.goBack(),
            },
          ]
        );
      } else if (error.code === "auth/weak-password") {
        Alert.alert("Error", "Password is too weak. Please use a stronger password.");
      } else {
        Alert.alert("Error", "Failed to update password. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <ScrollView 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Back Button */}
          <TouchableOpacity 
            onPress={() => navigation.goBack()} 
            style={styles.backButton}
          >
            <Text style={styles.backArrow}>←</Text>
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>

          {/* Card */}
          <View style={styles.card}>
            {/* Icon */}
            <View style={styles.iconCircle}>
              <Text style={styles.iconText}>🔑</Text>
            </View>

            {/* Title */}
            <Text style={styles.title}>Secure Reset</Text>
            <Text style={styles.subtitle}>Enter your new password below</Text>

            {/* Form */}
            <View style={styles.form}>
              <TextInput
                style={styles.input}
                placeholder="New Password"
                placeholderTextColor="#94A3B8"
                secureTextEntry
                value={newPassword}
                onChangeText={setNewPassword}
                autoCapitalize="none"
                editable={!loading}
              />

              <TextInput
                style={styles.input}
                placeholder="Confirm New Password"
                placeholderTextColor="#94A3B8"
                secureTextEntry
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                autoCapitalize="none"
                editable={!loading}
              />

              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleResetPassword}
                disabled={loading}
              >
                <Text style={styles.buttonText}>
                  {loading ? "Updating..." : "Update Password"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                onPress={() => navigation.goBack()}
                style={styles.cancelButton}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F1F5F9",
  },

  keyboardView: {
    flex: 1,
  },

  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 20,
    paddingTop: 60,
  },

  backButton: {
    position: "absolute",
    top: 20,
    left: 20,
    flexDirection: "row",
    alignItems: "center",
    zIndex: 10,
  },

  backArrow: {
    fontSize: 24,
    color: "#173B66",
    fontWeight: "700",
    marginRight: 5,
  },

  backText: {
    fontSize: 16,
    color: "#173B66",
    fontWeight: "600",
  },

  card: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 40,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
    alignItems: "center",
    maxWidth: 400,
    width: "100%",
    alignSelf: "center",
  },

  iconCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#E0E7FF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },

  iconText: {
    fontSize: 32,
  },

  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#173B66",
    marginBottom: 10,
    textAlign: "center",
  },

  subtitle: {
    fontSize: 14,
    color: "#64748B",
    marginBottom: 30,
    textAlign: "center",
  },

  form: {
    width: "100%",
  },

  input: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    color: "#1E293B",
    marginBottom: 20,
    width: "100%",
  },

  button: {
    backgroundColor: "#173B66",
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: "center",
    width: "100%",
    shadowColor: "#173B66",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },

  buttonDisabled: {
    opacity: 0.5,
  },

  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "700",
  },

  cancelButton: {
    marginTop: 15,
    alignItems: "center",
    paddingVertical: 10,
  },

  cancelText: {
    color: "#94A3B8",
    fontSize: 14,
    fontWeight: "500",
  },
});
