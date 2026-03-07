import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import LoginScreen from "../screens/LoginScreen";
import RegisterScreen from "../screens/RegisterScreen";
import ForgotPasswordScreen from "../screens/ForgotPasswordScreen";
import StudentHomeScreen from "../screens/StudentHomeScreen";
import ProfessorHomeScreen from "../screens/ProfessorHomeScreen";
import ScanQRScreen from "../screens/ScanQRScreen";

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
        <Stack.Screen name="StudentHome" component={StudentHomeScreen} />
        <Stack.Screen name="ProfessorHome" component={ProfessorHomeScreen} />
        <Stack.Screen name="ScanQR" component={ScanQRScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
