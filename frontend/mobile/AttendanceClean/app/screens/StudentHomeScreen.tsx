import React, { useEffect, useState, useContext } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Alert,
} from "react-native";
import { signOut } from "firebase/auth";
import { auth, db } from "../firebase";
import { doc, getDoc, getDocs } from "firebase/firestore";
import { AuthContext } from "../context/AuthContext";
import { collection, query, where, onSnapshot } from "firebase/firestore";

import { Ionicons } from "@expo/vector-icons";
import { getUnreadCount } from "../services/notificationService";

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


  const [unreadCount, setUnreadCount] = useState(0);

  const authContext = useContext(AuthContext);
  if (!authContext) return null;
  const { setUser, setRole } = authContext;

  useEffect(() => {
    const getStudentData = async () => {
      const user = auth.currentUser;
      if (!user) return;

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

  // ✅ load unread notifications
  useEffect(() => {
    const fetchUnread = async () => {
      const user = auth.currentUser;
      if (!user) return;
      const q = query(
        collection(db, "notifications"),
        where("userId", "==", user.uid),
        where("read", "==", false)
      );
      const snap = await getDocs(q);
      setUnreadCount(snap.size);
    };
    fetchUnread();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setStudent({ name: "", id: "", email: "" });
      setUser(null);
      setRole(null);
      navigation.reset({ index: 0, routes: [{ name: "Login" }] });
    } catch (error) {
      console.log("Logout error:", error);
      Alert.alert("Error", "Failed to logout");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
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

      {/* ✅ HEADER */}
      <View style={styles.headerBar}>
        <TouchableOpacity
          onPress={() => setIsSidebarOpen(true)}
          style={styles.menuButton}
        >
          <Text style={styles.menuIcon}>☰</Text>
        </TouchableOpacity>

        <View style={styles.spacer} />

        {/* 🔔 Notifications Button */}
        <TouchableOpacity
          onPress={() => navigation.navigate("Notifications")}
          style={styles.notificationButton}
        >
          <Text style={{ fontSize: 26 }}>🔔</Text>
          {unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {unreadCount > 9 ? "9+" : unreadCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </View>

      {/* CONTENT */}
      <View style={styles.content}>
        <Text style={styles.pageTitle}>Student Profile</Text>

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

/* ✅ SINGLE StyleSheet (merged correctly) */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },

  overlay: {
    position: "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    zIndex: 999,
  },

  sidebar: {
    position: "absolute",
    top: 0, left: 0, bottom: 0, width: 280,
    backgroundColor: "white",
    zIndex: 1000,
    padding: 20,
  },

  closeButton: { alignSelf: "flex-end", padding: 10 },
  closeText: { fontSize: 24, color: "#173B66", fontWeight: "700" },

  sidebarTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#173B66",
    marginBottom: 30,
  },

  sidebarItem: {
    padding: 15,
    backgroundColor: "#F8FAFC",
    borderRadius: 10,
  },

  sidebarItemText: {
    fontSize: 16,
    fontWeight: "600",
  },

  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    padding: 15,
  },

  menuButton: { padding: 5 },
  menuIcon: { fontSize: 26, color: "#173B66" },

  spacer: { flex: 1 },

  notificationButton: {
    position: "relative",
    padding: 6,
    marginRight: 10,
  },

  badge: {
    position: "absolute",
    top: -2,
    right: -2,
    backgroundColor: "#EF4444",
    borderRadius: 999,
    minWidth: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: "white",
  },

  badgeText: {
    color: "white",
    fontSize: 11,
    fontWeight: "bold",
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

  content: { flex: 1, padding: 20 },

  pageTitle: {
    fontSize: 28,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 30,
  },

  card: {
    backgroundColor: "white",
    borderRadius: 15,
    padding: 20,
  },

  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 20,
  },

  row: { marginBottom: 12 },

  label: {
    fontSize: 12,
    color: "#64748B",
    textTransform: "uppercase",
  },

  value: {
    fontSize: 16,
    fontWeight: "600",
  },

  scanButton: {
    marginTop: 20,
    backgroundColor: "#173B66",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
  },

  buttonText: {
    color: "white",
    fontWeight: "700",
  },
});