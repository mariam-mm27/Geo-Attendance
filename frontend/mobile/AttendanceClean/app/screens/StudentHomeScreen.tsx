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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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
      
      // Clear local state
      setStudent({ name: "", id: "", email: "" });
      setUser(null);
      setRole(null);
      
    } catch (error) {
      console.log("Logout error:", error);
      Alert.alert("Error", "Failed to logout");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Sidebar */}
      {isSidebarOpen && (
        <>
          <TouchableOpacity
            style={styles.overlay}
            activeOpacity={1}
            onPress={() => setIsSidebarOpen(false)}
          />
          <View style={styles.sidebar}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setIsSidebarOpen(false)}
            >
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>

            <Text style={styles.sidebarTitle}>Settings</Text>

            <TouchableOpacity
              style={styles.sidebarItem}
              onPress={() => {
                setIsSidebarOpen(false);
                navigation.navigate("ResetPassword");
              }}
            >
              <Text style={styles.sidebarItemText}>🔑 Reset Password</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* Header */}
      <View style={styles.headerBar}>
        <TouchableOpacity
          onPress={() => setIsSidebarOpen(true)}
          style={styles.menuButton}
        >
          <Text style={styles.menuIcon}>☰</Text>
        </TouchableOpacity>

        <View style={styles.spacer} />

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        <Text style={styles.pageTitle}>Student Profile</Text>

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
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },

  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    zIndex: 999,
  },

  sidebar: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    width: 280,
    backgroundColor: "white",
    zIndex: 1000,
    padding: 20,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 2, height: 0 },
    elevation: 10,
  },

  closeButton: {
    alignSelf: "flex-end",
    padding: 10,
    marginBottom: 20,
  },

  closeText: {
    fontSize: 24,
    color: "#173B66",
    fontWeight: "700",
  },

  sidebarTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#173B66",
    marginBottom: 30,
    paddingBottom: 15,
    borderBottomWidth: 2,
    borderBottomColor: "#E2E8F0",
  },

  sidebarItem: {
    paddingVertical: 15,
    paddingHorizontal: 10,
    backgroundColor: "#F8FAFC",
    borderRadius: 10,
    marginBottom: 10,
  },

  sidebarItemText: {
    fontSize: 16,
    color: "#1E293B",
    fontWeight: "600",
  },

  headerBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "white",
    paddingVertical: 15,
    paddingHorizontal: 20,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },

  menuButton: {
    padding: 5,
  },

  menuIcon: {
    fontSize: 26,
    color: "#173B66",
    fontWeight: "700",
  },

  spacer: {
    flex: 1,
  },

  logoutButton: {
    backgroundColor: "#173B66",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },

  logoutText: {
    color: "white",
    fontSize: 14,
    fontWeight: "700",
  },

  content: {
    flex: 1,
    padding: 20,
  },

  pageTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#173B66",
    textAlign: "center",
    marginBottom: 30,
    marginTop: 10,
  },

  card: {
    backgroundColor: "white",
    borderRadius: 15,
    padding: 25,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
    marginBottom: 20,
  },

  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 20,
    color: "#173B66",
  },

  row: {
    marginBottom: 16,
  },

  label: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "600",
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  value: {
    fontSize: 16,
    fontWeight: "600",
    marginTop: 2,
    color: "#1E293B",
  },

  scanButton: {
    marginTop: 20,
    alignSelf: "center",
    backgroundColor: "#173B66",
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 10,
    shadowColor: "#173B66",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },

  buttonText: {
    color: "white",
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
  },
});
