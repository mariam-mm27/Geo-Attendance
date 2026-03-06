import React from "react";
import { Picker } from "@react-native-picker/picker";
import { StyleSheet } from "react-native";
import { COLORS } from "../theme/color";

interface Props {
  role: string;
  setRole: (value: string) => void;
}

export default function RolePicker({ role, setRole }: Props) {
  return (
    <Picker
      selectedValue={role}
      onValueChange={(itemValue) => setRole(itemValue)}
      style={styles.picker}
    >
      <Picker.Item label="Select Role" value="" />
      <Picker.Item label="Student" value="student" />
      <Picker.Item label="Professor" value="professor" />
    </Picker>
  );
}

const styles = StyleSheet.create({
  picker: {
    marginBottom: 15,
  },
});

