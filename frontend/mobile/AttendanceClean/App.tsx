import "react-native-gesture-handler";
import React from "react";
import { NavigationContainer } from '@react-navigation/native';
import RootNavigator from "./app/navigation/RootNavigator";
import { AuthProvider } from "./app/context/AuthContext";

export default function App() {
  return (
    <AuthProvider>
< feature-login
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>

      <RootNavigator />
 main
    </AuthProvider>
  );
}