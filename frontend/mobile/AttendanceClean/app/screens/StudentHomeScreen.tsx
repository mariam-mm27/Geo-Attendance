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
  ActivityIndicator,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { signOut } from "firebase/auth";
import { auth, db } from "../firebase";
import { doc, getDoc, getDocs } from "firebase/firestore";
import { AuthContext } from "../context/AuthContext";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { Ionicons } from "@expo/vector-icons";
import { getUnreadCount } from "../services/notificationService";
import { calculateAttendanceFromEnrollment } from "../services/attendanceService";

type Student = {
  name: string;
  id: string;
  email: string;
  photoURL: string;
};

type Course = {
  id: string;
  name: string;
  code: string;
  room: string;
  time: string;
  duration: number;
  professorName: string;
  attendance: string;
  attendanceDetails?: any;
};

export default function StudentHomeScreen({ navigation }: any) {
  const [student, setStudent] = useState<Student>({
    name: "",
    id: "",
    email: "",
    photoURL: "",
  });

  const [courses, setCourses] = useState<Course[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const authContext = useContext(AuthContext);
  if (!authContext) return null;
  const { setUser, setRole } = authContext;

  // Helper functions for attendance styling
  const getAttendanceColor = (attendance: string) => {
    const absence = 100 - parseFloat(attendance);
    if (absence >= 25) return "#EF4444"; // Red - Denied
    if (absence >= 20) return "#F59E0B"; // Orange - Second Warning
    if (absence >= 10) return "#EAB308"; // Yellow - First Warning
    return "#10B981"; // Green - Good
  };

  const getAttendanceStyle = (attendance: string) => {
    const absence = 100 - parseFloat(attendance);
    if (absence >= 25) return { backgroundColor: "#FEE2E2", borderColor: "#FECACA" };
    if (absence >= 20) return { backgroundColor: "#FEF3C7", borderColor: "#FCD34D" };
    if (absence >= 10) return { backgroundColor: "#FEF9C3", borderColor: "#FDE047" };
    return { backgroundColor: "#F0F9FF", borderColor: "#E0F2FE" };
  };

  const getAttendanceStatusText = (attendance: string) => {
    const absence = 100 - parseFloat(attendance);
    if (absence >= 25) return `🚫 Denied from Final Exam — absence ${absence.toFixed(1)}%`;
    if (absence >= 20) return `⚠️ Second Warning — absence ${absence.toFixed(1)}%`;
    if (absence >= 10) return `⚠️ First Warning — absence ${absence.toFixed(1)}%`;
    return "✅ Good standing";
  };

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

          // Fetch courses after getting student data
          await fetchStudentCourses(user.uid);
        }
      } catch (error) {
        console.log("Error fetching student data:", error);
        Alert.alert("Error", "Failed to load student data");
      }
    };

    getStudentData();
  }, []);

  const fetchStudentCourses = async (studentUid: string) => {
    setLoadingCourses(true);
    try {
      console.log("🔍 Fetching courses for student:", studentUid);
      
      // Get all courses where student is enrolled
      const coursesSnapshot = await getDocs(collection(db, "courses"));
      console.log("📚 Total courses in database:", coursesSnapshot.size);
      
      const enrolledCourses: Course[] = [];

      for (const courseDoc of coursesSnapshot.docs) {
        const courseData = courseDoc.data();
        console.log(`📖 Course: ${courseData.name}, enrolledStudents:`, courseData.enrolledStudents);
        
        if ((courseData.enrolledStudents || []).includes(studentUid)) {
          console.log(`✅ Student enrolled in: ${courseData.name}`);
          
          // Calculate attendance for this course
          console.log(`📊 Calculating attendance for ${courseData.name}...`);
          const attendanceResult = await calculateAttendanceFromEnrollment(studentUid, courseDoc.id);
          console.log(`📈 Attendance result:`, attendanceResult);
          
          enrolledCourses.push({
            id: courseDoc.id,
            name: courseData.name,
            code: courseData.code,
            room: courseData.room,
            time: courseData.time,
            duration: courseData.duration,
            professorName: courseData.professorName,
            attendance: attendanceResult ? attendanceResult.attendanceRate.toFixed(2) : "0",
            attendanceDetails: attendanceResult ? {
              attendedSessions: attendanceResult.attendedSessions,
              totalSessions: attendanceResult.totalSessions
            } : null
          });
        } else {
          console.log(`❌ Student NOT enrolled in: ${courseData.name}`);
        }
      }

      console.log(`📊 Found ${enrolledCourses.length} enrolled courses:`, enrolledCourses);
      setCourses(enrolledCourses);
    } catch (error) {
      console.error("❌ Error fetching courses:", error);
      Alert.alert("Error", "Failed to load courses");
    } finally {
      setLoadingCourses(false);
    }
  };

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
      setStudent({ name: "", id: "", email: "", photoURL: "" });
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

        {/* My Courses Section */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>My Courses</Text>
          
          {loadingCourses ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#173B66" />
              <Text style={styles.loadingText}>Loading courses...</Text>
            </View>
          ) : courses.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                You are not enrolled in any courses yet.
              </Text>
            </View>
          ) : (
            courses.map((course) => (
              <View key={course.id} style={styles.courseCard}>
                <View style={styles.courseHeader}>
                  <Text style={styles.courseName}>{course.name}</Text>
                  <Text style={styles.courseCode}>{course.code}</Text>
                </View>
                
                <View style={styles.courseDetails}>
                  <Text style={styles.courseDetailText}>📍 Room: {course.room}</Text>
                  <Text style={styles.courseDetailText}>🕒 Time: {course.time}</Text>
                  <Text style={styles.courseDetailText}>
                    ⏱️ Duration: {course.duration ? 
                      (typeof course.duration === 'number' ? 
                        `${course.duration / 60} hour${course.duration / 60 !== 1 ? 's' : ''}` :
                        course.duration
                      ) : "Not specified"}
                  </Text>
                  <Text style={styles.courseDetailText}>👨‍🏫 Professor: {course.professorName || "Not assigned"}</Text>
                </View>

                {/* Attendance Section */}
                <View style={[styles.attendanceSection, getAttendanceStyle(course.attendance)]}>
                  <View style={styles.attendanceHeader}>
                    <Text style={styles.attendanceLabel}>Attendance Rate</Text>
                    <Text style={styles.attendancePercentage}>{course.attendance}%</Text>
                  </View>
                  
                  <View style={styles.attendanceBar}>
                    <View 
                      style={[
                        styles.attendanceProgress, 
                        { 
                          width: `${course.attendance}%`,
                          backgroundColor: getAttendanceColor(course.attendance)
                        }
                      ]} 
                    />
                  </View>

                  <Text style={[styles.attendanceStatus, { color: getAttendanceColor(course.attendance) }]}>
                    {getAttendanceStatusText(course.attendance)}
                  </Text>

                  {course.attendanceDetails && (
                    <View style={styles.attendanceStats}>
                      <Text style={styles.attendanceStatText}>
                        ✅ {course.attendanceDetails.attendedSessions} attended
                      </Text>
                      <Text style={styles.attendanceStatText}>
                        📚 {course.attendanceDetails.totalSessions} total
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            ))
          )}
        </View>

        <TouchableOpacity
          style={styles.scanButton}
          onPress={() => navigation.navigate("ScanQR")}
        >
          <Text style={styles.buttonText}>Scan QR</Text>
        </TouchableOpacity>
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

  loadingContainer: {
    alignItems: "center",
    padding: 20,
  },

  loadingText: {
    marginTop: 10,
    color: "#64748B",
    fontSize: 16,
  },

  emptyContainer: {
    alignItems: "center",
    padding: 20,
  },

  emptyText: {
    color: "#64748B",
    fontSize: 16,
    textAlign: "center",
  },

  courseCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },

  courseHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },

  courseName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#173B66",
    flex: 1,
  },

  courseCode: {
    backgroundColor: "#E0F2FE",
    color: "#173B66",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    fontSize: 12,
    fontWeight: "bold",
  },

  courseDetails: {
    marginBottom: 15,
  },

  courseDetailText: {
    fontSize: 14,
    color: "#64748B",
    marginBottom: 4,
  },

  attendanceSection: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },

  attendanceHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },

  attendanceLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
  },

  attendancePercentage: {
    fontSize: 20,
    fontWeight: "700",
    color: "#374151",
  },

  attendanceBar: {
    height: 6,
    backgroundColor: "#E5E7EB",
    borderRadius: 3,
    marginBottom: 8,
  },

  attendanceProgress: {
    height: "100%",
    borderRadius: 3,
  },

  attendanceStatus: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 8,
  },

  attendanceStats: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  attendanceStatText: {
    fontSize: 12,
    color: "#6B7280",
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
    fontSize: 16,
  },
});