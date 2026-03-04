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
  const { user, role } = useContext(AuthContext);

  return (
    <NavigationContainer>
      <Stack.Navigator>
        {!user ? (
          <>
            <Stack.Screen
              name="Login"
              component={LoginScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Register"
              component={RegisterScreen}
              options={{ title: "Register" }}
            />
          </>
        ) : role === "student" ? (
          <Stack.Screen
            name="StudentHome"
            component={StudentHome}
            options={{ headerShown: false }}
          />
        ) : role === "professor" ? (
          <Stack.Screen
            name="ProfessorHome"
            component={ProfessorHome}
            options={{ headerShown: false }}
          />
        ) : null}
      </Stack.Navigator>
    </NavigationContainer>
  );
}