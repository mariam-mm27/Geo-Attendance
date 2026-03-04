import React, { useContext } from 'react';
import { View, Text, Button } from 'react-native';
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import { AuthContext } from "../context/AuthContext";

export default function StudentHomeScreen() {
  const { setUser, setRole } = useContext(AuthContext);

  const handleLogout = async () => {
    await signOut(auth);
    setUser(null);
    setRole(null);
  };

  return (
    <View style={{ padding: 20 }}>
      <Text>Hello this is the student home page</Text>

    </View>
  );
}