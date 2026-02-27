import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import LoginScreen from "../screens/LoginScreen";
import RegisterScreen from "../screens/RegisterScreen";
import StudentHome from "../screens/StudentHomeScreen";
import ProfessorHome from "../screens/ProfessorHomeScreen";

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        {/* Login has NO back button */}
        <Stack.Screen 
          name="Login" 
          component={LoginScreen}
          options={{  title: "Login"}}
        />

        {/* All other screens have back button */}
        <Stack.Screen 
          name="Register" 
          component={RegisterScreen}
          options={{ title: "Register" }}
        />
        <Stack.Screen 
          name="StudentHome" 
          component={StudentHome}
          options={{ title: "Student Home Page" }}
        />
        <Stack.Screen 
          name="ProfessorHome" 
          component={ProfessorHome}
          options={{ title: "Professor Home Page" }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}