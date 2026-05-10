import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import LoginScreen from "../screens/LoginScreen";
import RegisterScreen from "../screens/RegisterScreen";
import ForgotPasswordScreen from "../screens/ForgotPasswordScreen";
import ResetPasswordScreen from "../screens/ResetPasswordScreen";

import StudentHomeScreen from "../screens/StudentHomeScreen";
import ProfessorHomeScreen from "../screens/ProfessorHomeScreen";

import ScanQRScreen from "../screens/ScanQRScreen";
import IntelligentChatScreen from "../screens/IntelligentChatScreen";
import NotificationsScreen from "../screens/NotificationsScreen";

import { useAuth } from "../context/AuthContext";

const Stack = createNativeStackNavigator();


// ================= AUTH STACK =================

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
    </Stack.Navigator>
  );
}


// ================= STUDENT STACK =================

function StudentStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="StudentHome" component={StudentHomeScreen} />
      <Stack.Screen name="ScanQR" component={ScanQRScreen} />
      <Stack.Screen name="Chat" component={IntelligentChatScreen} />
      <Stack.Screen
        name="Notifications"
        component={NotificationsScreen}
      />
    </Stack.Navigator>
  );
}


// ================= PROFESSOR STACK =================

function ProfessorStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="ProfessorHome"
        component={ProfessorHomeScreen}
      />

      <Stack.Screen name="Chat" component={IntelligentChatScreen} />

      <Stack.Screen
        name="Notifications"
        component={NotificationsScreen}
      />
    </Stack.Navigator>
  );
}


// ================= ROOT NAVIGATOR =================

export default function RootNavigator() {
  const { user, role, loading } = useAuth();

  if (loading) {
    return null;
  }

  return (
    <NavigationContainer>
      {!user ? (
        <AuthStack />
      ) : role === "student" ? (
        <StudentStack />
      ) : role === "professor" ? (
        <ProfessorStack />
      ) : (
        <AuthStack />
      )}
    </NavigationContainer>
  );
}