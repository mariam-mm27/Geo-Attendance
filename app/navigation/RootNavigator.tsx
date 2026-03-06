import React, { useContext } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { RootStackParamList } from "../types/navigation";
import ScanQRScreen from "../screens/ScanQRScreen";
import { AuthContext } from "../context/AuthContext";

import LoginScreen from "../screens/LoginScreen";
import RegisterScreen from "../screens/RegisterScreen";
import StudentHome from "../screens/StudentHomeScreen";
import ProfessorHome from "../screens/ProfessorHomeScreen";

const Stack = createNativeStackNavigator<RootStackParamList>();
export default function RootNavigator() {
  const auth = useContext(AuthContext);

  if (!auth) return null;

  const { user, role } = auth;

  return (
    <NavigationContainer>
      <Stack.Navigator>
        {/* Login has NO back button */}
        <Stack.Screen 
          name="Login" 
          component={LoginScreen}
          options={{  title: "Login"}}
        />
        <Stack.Screen
           name="ScanQR"
           component={ScanQRScreen}
/>

      </Stack.Navigator>
    </NavigationContainer>
  );
}