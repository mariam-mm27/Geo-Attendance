import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Alert,
} from "react-native";
import { useContext } from "react";
import { signOut } from "firebase/auth";
import { auth, db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import { AuthContext } from "../context/AuthContext";

type Student = {
  name: string;
  id: string;
  email: string;
};

export default function StudentHomeScreen({ navigation }: any) {
  const [student, setStudent] = useState<Student>({
    name: "",
    id: "",
    email: "",
  });

  useEffect(() => {
    const getStudentData = async () => {
      const user = auth.currentUser;

      if (!user) {
        return;
      }

      try {
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data() as {
            name: string;
            studentId: string;
            email: string;
          };

          setStudent({
            name: data.name,
            id: data.studentId,
            email: data.email,
          });
        }
      } catch (error) {
        console.log("Error fetching student data:", error);
        Alert.alert("Error", "Failed to load student data");
      }
    };

    getStudentData();
  }, []);

  const authContext = useContext(AuthContext);

  if (!authContext) return null;

  const { setUser, setRole } = authContext;

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setRole(null);
      
      // Clear navigation stack and go to login
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
    } catch (error) {
      console.log("Logout error:", error);
      Alert.alert("Error", "Failed to logout");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Student Dashboard</Text>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Personal Info */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Personal Information</Text>

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
}

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
    marginBottom: 20,
    paddingHorizontal: 0,
  },

  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#173B66",
    flex: 1,
  },

  logoutButton: {
    backgroundColor: "#173B66",
    paddingVertical: 10,
    paddingHorizontal: 18,
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

  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 15,
    color: "#173B66",
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
    marginTop: 20,
    alignSelf: "flex-start",
    backgroundColor: "#173B66",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },

  buttonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
});
