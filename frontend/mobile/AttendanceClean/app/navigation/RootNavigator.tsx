import React, { useContext } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { AuthContext } from "../context/AuthContext";

import LoginScreen from "../screens/LoginScreen";
import RegisterScreen from "../screens/RegisterScreen";
import StudentHome from "../screens/StudentHomeScreen";
import ProfessorHome from "../screens/ProfessorHomeScreen";

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  const auth = useContext(AuthContext);

  if (!auth) return null;

  const { user, role } = auth;

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>

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

      </Stack.Navigator>
    </NavigationContainer>
  );
}