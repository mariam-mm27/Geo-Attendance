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
import { useAuth } from "../context/AuthContext";

const Stack = createNativeStackNavigator();

function AuthStack() {
  return (
    <Stack.Navigator 
      screenOptions={{ headerShown: false }}
      initialRouteName="Login"
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
    </Stack.Navigator>
  );
}

function StudentStack() {
  return (
    <Stack.Navigator 
      screenOptions={{ headerShown: false }}
      initialRouteName="StudentHome"
    >
      <Stack.Screen name="StudentHome" component={StudentHomeScreen} />
      <Stack.Screen name="ScanQR" component={ScanQRScreen} />
    </Stack.Navigator>
  );
}

function ProfessorStack() {
  return (
    <Stack.Navigator 
      screenOptions={{ headerShown: false }}
      initialRouteName="ProfessorHome"
    >
      <Stack.Screen name="ProfessorHome" component={ProfessorHomeScreen} />
    </Stack.Navigator>
  );
}

export default function RootNavigator() {
  const { user, role } = useAuth();

  return (
    <NavigationContainer key={user ? `${user.uid}-${role}` : 'logged-out'}>
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