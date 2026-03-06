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
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { createSession } from "../services/sessionService";
import { AuthContext } from "../context/AuthContext";
type Course = {
  id: string;
  name: string;
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

  useEffect(() => {
    if (route?.params?.user) {
      setUserData(route.params.user);
    } else {
      navigation.replace("Login");
    }
  }, [route?.params?.user]);

  const [courses] = useState<Course[]>([
    { id: "CS308", name: "Database Systems" },
    { id: "CS306", name: "Operating Systems" },
    { id: "CS303", name: "Software Development" },
    { id: "CS316", name: "Files Structure" },
    { id: "CS317", name: "Distributed System" },
  ]);

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
  }>({
    CS308: 1,
    CS306: 1,
    CS303: 1,
    CS316: 1,
    CS317: 1,
  });

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
      const sessionId = await createSession(selectedCourseId, 10);

      const selectedCourse = courses.find((c) => c.id === selectedCourseId);

      const lectureNumber = lectureCounters[selectedCourseId];

      const expireTime = new Date();
      expireTime.setMinutes(expireTime.getMinutes() + 10);

      setActiveSession({
        sessionId: sessionId,
        courseName: selectedCourse!.name,
        lectureNumber: lectureNumber,
        expiresAt: expireTime,
      });

      setTimeLeft(600);

      setLectureCounters((prev) => ({
        ...prev,
        [selectedCourseId]: prev[selectedCourseId] + 1,
      }));
    } catch (error: any) {
      Alert.alert("Error", error.message);
    }
  };

  const authContext = useContext(AuthContext);

  if (!authContext) return null;

  const { setUser, setRole } = authContext;

  const handleLogout = async () => {
    // Alert.alert("Log Out", "Are you sure you want to log out?", [
    //   {
    //     text: "Cancel",
    //     style: "cancel",
    //   },
    //   {
    //     text: "Log Out",
    //     style: "destructive",
    //     onPress: () => logoutUser(),
    //   },
    // ]);
    await signOut(auth);
    setUser(null);
    setRole(null);
    navigation.replace("Login");
  };

  // const logoutUser = async () => {
  //   try {
  //     await signOut(auth);
  //     navigation.replace("Login");
  //   } catch (error) {
  //     console.log("Logout error:", error);
  //   }
  // };

  const formatTime = (seconds: number): string => {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min}:${sec < 10 ? "0" : ""}${sec}`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={{ width: 80 }} />
          <Text style={styles.screenTitle}>Professor Dashboard</Text>

          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>

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
                  label={course.name}
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
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#f4f6f9",
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },

  screenTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#2f4fa3",
  },

  logoutButton: {
    backgroundColor: "#2f4fa3",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },

  logoutText: {
    color: "#fff",
    fontWeight: "bold",
  },

  card: {
    backgroundColor: "#fff",
    padding: 22,
    borderRadius: 18,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },

  cardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#2f4fa3",
    marginBottom: 14,
  },

  infoRow: {
    marginBottom: 8,
  },

  label: {
    fontWeight: "bold",
    color: "#374151",
  },

  infoText: {
    color: "#6b7280",
  },

  courseName: {
    color: "#2f4fa3",
    fontWeight: "bold",
  },

  pickerWrapper: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    backgroundColor: "#f9fafb",
    marginBottom: 16,
  },

  picker: {
    height: 50,
    width: "100%",
  },

  createButton: {
    backgroundColor: "#2f4fa3",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignSelf: "flex-start",
  },

  buttonText: {
    color: "#fff",
    fontWeight: "bold",
  },

  qrContainer: {
    alignItems: "center",
  },

  qrTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#2f4fa3",
    marginBottom: 16,
    alignSelf: "flex-start",
  },

  timer: {
    fontSize: 17,
    fontWeight: "bold",
    color: "#dc2626",
    marginVertical: 12,
  },

  qrCodeWrapper: {
    marginTop: 10,
    padding: 10,
    backgroundColor: "#fff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
});
