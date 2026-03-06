import "react-native-gesture-handler";
import React from "react";
import RootNavigator from "./app/navigation/RootNavigator";
import { AuthProvider } from "./app/context/AuthContext";

export default function App() {
  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  );
}