<<<<<<< HEAD
import React, { useContext } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { AuthContext } from "../context/AuthContext";

import LoginScreen from "../screens/LoginScreen";
import RegisterScreen from "../screens/RegisterScreen";
import StudentHome from "../screens/StudentHomeScreen";
import ProfessorHome from "../screens/ProfessorHomeScreen";
=======
import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import LoginScreen from "../screens/LoginScreen";
import RegisterScreen from "../screens/RegisterScreen";
import StudentHomeScreen from "../screens/StudentHomeScreen";
import ProfessorHomeScreen from "../screens/ProfessorHomeScreen";
import ScanQRScreen from "../screens/ScanQRScreen";
>>>>>>> 8b9578bc1e2302e3a75ac27510a86a584aaa425f

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
<<<<<<< HEAD
  const auth = useContext(AuthContext);

  if (!auth) return null;

  const { user, role } = auth;

=======
>>>>>>> 8b9578bc1e2302e3a75ac27510a86a584aaa425f
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>

<<<<<<< HEAD
        {/* لو مفيش يوزر */}
        {!user && (
          <>
            <Stack.Screen
              name="Login"
              component={LoginScreen}
            />
            <Stack.Screen
              name="Register"
              component={RegisterScreen}
            />
          </>
        )}

        {/* لو Student */}
        {user && role === "student" && (
          <Stack.Screen
            name="StudentHome"
            component={StudentHome}
          />
        )}

        {/* لو Professor */}
        {user && role === "professor" && (
          <Stack.Screen
            name="ProfessorHome"
            component={ProfessorHome}
          />
        )}

        {/* fallback لو role لسه null */}
        {user && !role && (
          <Stack.Screen
            name="Login"
            component={LoginScreen}
          />
        )}
=======
        {/* يبدأ باللوج ان */}
        <Stack.Screen name="Login" component={LoginScreen} />

        <Stack.Screen name="Register" component={RegisterScreen} />

        <Stack.Screen name="StudentHome" component={StudentHomeScreen} />

        <Stack.Screen name="ProfessorHome" component={ProfessorHomeScreen} />

        <Stack.Screen name="ScanQR" component={ScanQRScreen} />
>>>>>>> 8b9578bc1e2302e3a75ac27510a86a584aaa425f

      </Stack.Navigator>
    </NavigationContainer>
  );
}