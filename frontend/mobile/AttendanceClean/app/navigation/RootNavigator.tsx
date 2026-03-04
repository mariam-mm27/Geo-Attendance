 feature-login
import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAuth } from "../context/AuthContext";

import React, { useContext } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { AuthContext } from "../context/AuthContext";

 main
import LoginScreen from "../screens/LoginScreen";
import RegisterScreen from "../screens/RegisterScreen";
import ProfessorHome from "../screens/ProfessorHomeScreen";
import StudentHome from "../screens/StudentHomeScreen";
import { View, ActivityIndicator } from "react-native";

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
 feature-login
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!user ? (
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
        </>
      ) : role === "professor" ? (
        <Stack.Screen name="ProfessorHome" component={ProfessorHome} />
      ) : role === "student" ? (
        <Stack.Screen name="StudentHome" component={StudentHome} />
      ) : (
        // حماية إضافية لو role null
        <Stack.Screen name="Login" component={LoginScreen} />
      )}
    </Stack.Navigator>

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
 main
  );
}