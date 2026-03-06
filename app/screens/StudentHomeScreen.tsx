import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
} from "react-native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

type RootStackParamList = {
  StudentHome: undefined;
  ScanQR: undefined;
  Login: undefined;
};

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, "StudentHome">;
};

type Student = {
  name: string;
  id: string;
  email: string;
};

const StudentHomeScreen: React.FC<Props> = ({ navigation }) => {

  const student: Student = {
    name: "",
    id: "",
    email: "",
  };

  return (
    <SafeAreaView style={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Personal Information</Text>

        <TouchableOpacity
          style={styles.logoutButton}
          onPress={() => navigation.navigate("Login")}
        >
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Card */}
      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.label}>Name</Text>
          <Text style={styles.value}>{student.name}</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Student ID</Text>
          <Text style={styles.value}>{student.id}</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Email</Text>
          <Text style={styles.value}>{student.email}</Text>
        </View>
      </View>

      {/* Scan Button */}
      <TouchableOpacity
        style={styles.scanButton}
        onPress={() => navigation.navigate("ScanQR")}
      >
        <Text style={styles.buttonText}>Scan QR</Text>
      </TouchableOpacity>

    </SafeAreaView>
  );
};

export default StudentHomeScreen;

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: "#F4F6FA",
    padding: 20,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },

  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#2f4fa3",
  },

  logoutButton: {
    backgroundColor: "#2f4fa3",
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 8,
  },

  logoutText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },

  card: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },

  row: {
    marginBottom: 15,
  },

  label: {
    fontSize: 14,
    color: "#7A7A7A",
  },

  value: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 2,
  },

  scanButton: {
    marginTop: 15,
    alignSelf: "flex-start",
    backgroundColor: "#2f4fa3",
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 8,
  },

  buttonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },

});
