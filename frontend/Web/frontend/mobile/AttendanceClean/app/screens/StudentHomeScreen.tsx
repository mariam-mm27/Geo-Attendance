import React, { useEffect, useState, useContext } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Image,
  ScrollView,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { signOut } from "firebase/auth";
import { auth, db } from "../firebase";
import { doc, getDoc, getDocs } from "firebase/firestore";
import { AuthContext } from "../context/AuthContext";
import { collection, query, where } from "firebase/firestore";
import FloatingChatButton from "../components/FloatingChatButton";

type Student = {
  name: string;
  id: string;
  email: string;
  photoURL: string;
};

export default function StudentHomeScreen({ navigation }: any) {
  const [student, setStudent] = useState<Student>({
    name: "",
    id: "",
    email: "",
    photoURL: "",
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
            photoURL: string;
          };

          setStudent({
            name: data.name,
            id: data.studentId,
            email: data.email,
            photoURL: data.photoURL || "",
          });
        }
      } catch (error) {
        console.log("Error fetching student data:", error);
        Alert.alert("Error", "Failed to load student data");
      }
    };

    getStudentData();
  }, []);

  // ✅ load unread notifications (including calculated alerts)
  useEffect(() => {
    const fetchUnreadCount = async () => {
      const user = auth.currentUser;
      if (!user) return;

      try {
        // Get database notifications
        const notifQuery = query(
          collection(db, "notifications"),
          where("userId", "==", user.uid),
          where("read", "==", false)
        );
        const snapshot = await getDocs(notifQuery);
        let dbUnreadCount = snapshot.size;

        // Get calculated alerts from course attendance data - always generate all 3 types
        const coursesSnapshot = await getDocs(collection(db, "courses"));
        let calculatedAlertsCount = 0;

        // Get read calculated alerts from AsyncStorage (mobile equivalent of localStorage)
        const readCalculatedAlerts = JSON.parse(
          await AsyncStorage.getItem(`readCalculatedAlerts_${user.uid}`) || '[]'
        );

        for (const courseDoc of coursesSnapshot.docs) {
          const courseData = courseDoc.data();
          if ((courseData.enrolledStudents || []).includes(user.uid)) {
            // Always count all 3 types of alerts for each course
            const firstAlertId = `calc-${courseDoc.id}-first`;
            const secondAlertId = `calc-${courseDoc.id}-second`;
            const deniedAlertId = `calc-${courseDoc.id}-denied`;

            if (!readCalculatedAlerts.includes(firstAlertId)) {
              calculatedAlertsCount++;
            }
            if (!readCalculatedAlerts.includes(secondAlertId)) {
              calculatedAlertsCount++;
            }
            if (!readCalculatedAlerts.includes(deniedAlertId)) {
              calculatedAlertsCount++;
            }
          }
        }

        const totalUnreadCount = dbUnreadCount + calculatedAlertsCount;
        
        // Debug logging
        console.log('🔔 Mobile Notification Count Debug:', {
          dbUnreadCount,
          calculatedAlertsCount,
          totalUnreadCount,
          readCalculatedAlerts: readCalculatedAlerts.length,
          coursesCount: coursesSnapshot.size
        });

        setUnreadCount(totalUnreadCount);
      } catch (error) {
        console.error("Error fetching unread count:", error);
      }
    };

    fetchUnreadCount();

    // Add focus listener to refresh count when user returns to this screen
    const unsubscribe = navigation.addListener('focus', () => {
      fetchUnreadCount();
    });

    return unsubscribe;
  }, [navigation]);

  const handleLogout = async () => {
  try {
    await signOut(auth);
    // ✅ لا تحتاج لـ setUser و setRole لأن onAuthStateChanged سيتولى الأمر
    // ✅ لا تحتاج لـ navigation.reset إطلاقاً
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

      {/* Floating Chat Button */}
      <FloatingChatButton onPress={() => navigation.navigate("Chat")} />

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
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.pageTitle}>Student Profile</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Personal Information</Text>

          {/* Profile Photo */}
          <View style={styles.photoContainer}>
            {student.photoURL ? (
              <Image
                source={{ uri: student.photoURL }}
                style={styles.profilePhoto}
              />
            ) : (
              <View style={styles.photoPlaceholder}>
                <Text style={styles.photoPlaceholderText}>👤</Text>
              </View>
            )}
          </View>

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

        {/* Removed Chat Button - Use floating icon instead */}
      </ScrollView>
    </SafeAreaView>
  );
}

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
    color: "#173B66",
  },

  card: {
    backgroundColor: "white",
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },

  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 20,
    color: "#173B66",
  },

  photoContainer: {
    alignItems: "center",
    marginBottom: 20,
  },

  profilePhoto: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 3,
    borderColor: "#173B66",
  },

  photoPlaceholder: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "#E0F2FE",
    borderWidth: 3,
    borderColor: "#173B66",
    alignItems: "center",
    justifyContent: "center",
  },

  photoPlaceholderText: {
    fontSize: 36,
  },

  row: { marginBottom: 12 },

  label: {
    fontSize: 12,
    color: "#64748B",
    textTransform: "uppercase",
    marginBottom: 4,
  },

  value: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1E293B",
  },

  scanButton: {
    marginTop: 20,
    backgroundColor: "#173B66",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
  },

  chatButton: {
    marginTop: 15,
    backgroundColor: "#667eea",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
  },

  buttonText: {
    color: "white",
    fontWeight: "700",
    fontSize: 16,
  },
});