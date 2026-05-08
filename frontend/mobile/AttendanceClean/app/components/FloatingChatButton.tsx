import React from "react";
import { TouchableOpacity, StyleSheet, Text } from "react-native";

interface FloatingChatButtonProps {
  onPress: () => void;
}

export default function FloatingChatButton({ onPress }: FloatingChatButtonProps) {
  return (
    <TouchableOpacity style={styles.button} onPress={onPress}>
      <Text style={styles.icon}>🤖</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    position: "absolute",
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#667eea",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 999,
  },
  icon: {
    fontSize: 28,
  },
});
