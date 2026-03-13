import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  ScrollView,
} from "react-native";
import { useContext } from "react";
import { Picker } from "@react-native-picker/picker";
import QRCode from "react-native-qrcode-svg";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import { db } from "../firebase";
import { collection, query, where, getDocs, doc, getDoc, addDoc } from "firebase/firestore";
import { AuthContext } from "../context/AuthContext";

type Course = {
  id: string;
  name: string;
  code: string;
};

type UserData = {
  name: string;
  id: string;
  email: string;
};

export default function ProfessorSessionScreen({ route, navigation }: any) {
  const [userData, setUserData] = useState<UserData>({
    name: "",
    id: "",
    email: "",
  });

  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    const fetchUserAndCourses = async () => {
      const user = auth.currentUser;
      
      if (!user) {
        navigation.replace("Login");
        return;
      }

      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setUserData({
            name: data.name,
            id: user.uid,
            email: data.email,
          });

          // Fetch all courses
          const coursesSnapshot = await getDocs(collection(db, "courses"));
          const professorCourses: Course[] = [];
          
          // Normalize email for comparison (case-insensitive)
          const userEmail = user.email?.toLowerCase();
          
          coursesSnapshot.forEach((docSnap) => {
            const courseData = docSnap.data();
            const courseProfEmail = courseData.professorEmail?.toLowerCase();
            
            // Check if course belongs to this professor
            if (courseData.professorId === user.uid || 
                courseProfEmail === userEmail ||
                courseData.professorEmail === user.email) {
              professorCourses.push({
                id: docSnap.id,
                name: courseData.name,
                code: courseData.code,
              });
            }
          });

          console.log("Found courses:", professorCourses);
          console.log("User email:", user.email);
          console.log("User ID:", user.uid);
          
          setCourses(professorCourses);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        Alert.alert("Error", "Failed to load courses");
      } finally {
        setLoading(false);
      }
    };

    fetchUserAndCourses();
  }, [navigation]);

  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);

  const [activeSession, setActiveSession] = useState<{
    sessionId: string;
    courseName: string;
    lectureNumber: number;
    expiresAt: Date;
  } | null>(null);

  const [timeLeft, setTimeLeft] = useState<number>(0);

  const [lectureCounters, setLectureCounters] = useState<{
    [key: string]: number;
  }>({});

  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;

    if (timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    }

    if (timeLeft === 0 && activeSession) {
      Alert.alert(
        "Session Expired",
        "The current attendance session has ended.",
      );
      setActiveSession(null);
    }

    return () => clearInterval(timer);
  }, [timeLeft]);

  const generateSessionId = (): string => {
    return (
      "SESSION-" + Math.random().toString(36).substring(2, 10).toUpperCase()
    );
  };

  const handleCreateSession = async () => {
    if (!selectedCourseId) {
      Alert.alert("Error", "Please select a course first");
      return;
    }

    try {
      const selectedCourse = courses.find((c) => c.id === selectedCourseId);
      const lectureNumber = lectureCounters[selectedCourseId] || 1;

      const newSessionId = "SESSION-" + Math.random().toString(36).substring(2, 10).toUpperCase();
      
      const expireTime = new Date();
      expireTime.setMinutes(expireTime.getMinutes() + 10);

      const user = auth.currentUser;
      if (!user) {
        Alert.alert("Error", "No user logged in");
        return;
      }

      await addDoc(collection(db, "sessions"), {
        sessionId: newSessionId,
        courseId: selectedCourseId,
        courseName: selectedCourse!.name,
        courseCode: selectedCourse!.code,
        professorId: user.uid,
        lectureNumber: lectureNumber,
        createdAt: new Date(),
        expiresAt: expireTime,
        active: true,
        attendees: []
      });

      setActiveSession({
        sessionId: newSessionId,
        courseName: selectedCourse!.name,
        lectureNumber: lectureNumber,
        expiresAt: expireTime,
      });

      setTimeLeft(600);

      setLectureCounters((prev) => ({
        ...prev,
        [selectedCourseId]: (prev[selectedCourseId] || 1) + 1,
      }));

      Alert.alert("✅ Success", "Session created successfully!");
    } catch (error: any) {
      console.error("Create session error:", error);
      Alert.alert("❌ Error", error.message || "Failed to create session");
    }
  };

  const authContext = useContext(AuthContext);

  if (!authContext) return null;

  const { setUser, setRole } = authContext;

  const handleLogout = async () => {
    try {
      await signOut(auth);
      
      setUserData({ name: "", id: "", email: "" });
      setCourses([]);
      setSelectedCourseId(null);
      setActiveSession(null);
      setTimeLeft(0);
      setLectureCounters({});
      setUser(null);
      setRole(null);
      
    } catch (error) {
      console.log("Logout error:", error);
      Alert.alert("Error", "Failed to logout");
    }
  };

  const formatTime = (seconds: number): string => {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min}:${sec < 10 ? "0" : ""}${sec}`;
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
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <Text style={styles.pageTitle}>Professor Profile</Text>

        {loading ? (
          <View style={styles.card}>
            <Text style={styles.infoText}>Loading courses...</Text>
          </View>
        ) : (
          <>
            {/* Personal Info */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Personal Information</Text>

              <Text style={styles.infoRow}>
                <Text style={styles.label}>Name: </Text>
                <Text style={styles.infoText}>{userData.name}</Text>
              </Text>

              <Text style={styles.infoRow}>
                <Text style={styles.label}>Email: </Text>
                <Text style={styles.infoText}>{userData.email}</Text>
              </Text>
            </View>

            {/* Create Session */}
            {courses.length > 0 ? (
              <View style={styles.card}>
                <View style={styles.pickerWrapper}>
                  <Picker
                    selectedValue={selectedCourseId}
                    onValueChange={(itemValue) => setSelectedCourseId(itemValue)}
                    style={styles.picker}
                  >
                    <Picker.Item
                      label="Select a Course..."
                      value={null}
                      color="#6b7280"
                    />

                    {courses.map((course) => (
                      <Picker.Item
                        key={course.id}
                        label={`${course.code} - ${course.name}`}
                        value={course.id}
                        color="#2f4fa3"
                      />
                    ))}
                  </Picker>
                </View>

                <TouchableOpacity
                  style={styles.createButton}
                  onPress={handleCreateSession}
                >
                  <Text style={styles.buttonText}>Create Session</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.card}>
                <Text style={styles.infoText}>No courses assigned yet.</Text>
              </View>
            )}

            {/* QR Section */}
            {activeSession && (
              <View style={[styles.card, styles.qrContainer]}>
                <Text style={styles.qrTitle}>Active Session</Text>

                <Text style={styles.infoRow}>
                  <Text style={styles.label}>Course: </Text>
                  <Text style={styles.courseName}>{activeSession.courseName}</Text>
                </Text>

                <Text style={styles.infoRow}>
                  <Text style={styles.label}>Lecture Number: </Text>
                  <Text style={styles.infoText}>{activeSession.lectureNumber}</Text>
                </Text>

                <Text style={styles.timer}>Time Left: {formatTime(timeLeft)}</Text>

                <View style={styles.qrCodeWrapper}>
                  <QRCode value={activeSession.sessionId} size={200} />
                </View>
              </View>
            )}
          </>
        )}
        </View>
      </ScrollView>
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
    backgroundColor: "#fff",
    padding: 25,
    borderRadius: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 5 },
    elevation: 6,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },

  cardTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#173B66",
    marginBottom: 18,
    borderBottomWidth: 2,
    borderBottomColor: "#E2E8F0",
    paddingBottom: 10,
  },

  infoRow: {
    marginBottom: 12,
    paddingVertical: 4,
  },

  label: {
    fontWeight: "700",
    color: "#64748B",
    fontSize: 14,
  },

  infoText: {
    color: "#1E293B",
    fontSize: 15,
    fontWeight: "500",
  },

  courseName: {
    color: "#173B66",
    fontWeight: "700",
    fontSize: 15,
  },

  pickerWrapper: {
    borderWidth: 2,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    backgroundColor: "#F8FAFC",
    marginBottom: 20,
    overflow: "hidden",
  },

  picker: {
    height: 50,
    width: "100%",
  },

  createButton: {
    backgroundColor: "#173B66",
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
    alignSelf: "flex-start",
    shadowColor: "#173B66",
    shadowOpacity: 0.4,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },

  buttonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },

  qrContainer: {
    alignItems: "center",
  },

  qrTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#173B66",
    marginBottom: 20,
    alignSelf: "flex-start",
    borderBottomWidth: 2,
    borderBottomColor: "#E2E8F0",
    paddingBottom: 10,
    width: "100%",
  },

  timer: {
    fontSize: 18,
    fontWeight: "700",
    color: "#dc2626",
    marginVertical: 16,
    backgroundColor: "#FEE2E2",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },

  qrCodeWrapper: {
    marginTop: 20,
    padding: 20,
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
});
