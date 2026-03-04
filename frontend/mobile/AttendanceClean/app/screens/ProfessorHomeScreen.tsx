import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  SafeAreaView,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import QRCode from "react-native-qrcode-svg";

// تعريف أنواع البيانات
type Course = {
  id: string;
  name: string;
  totalLectures: number;
};

type UserData = {
  name: string;
  id: string;
  email: string;
};

export default function ProfessorSessionScreen({ route, navigation }: any) {
  // 🟢 البيانات المتغيرة (Dynamic Data)
  const [userData, setUserData] = useState<UserData>({
    name: "",
    id: "",
    email: "",
  });

  // عند فتح الصفحة، نحدث بيانات البروفيسور من route.params.user
  useEffect(() => {
    if (route?.params?.user) {
      setUserData(route.params.user);
    }
  }, [route?.params?.user]);

  const [courses] = useState<Course[]>([
    { id: "CS308", name: "Database Systems", totalLectures: 10 },
    { id: "CS306", name: "Operating Systems", totalLectures: 10 },
    { id: "CS303", name: "Software Development", totalLectures: 10 },
    { id: "CS316", name: "Files Structure", totalLectures: 10 },
    { id: "CS317", name: "Distributed System", totalLectures: 10 },
  ]);

  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);

  const [activeSession, setActiveSession] = useState<{
    sessionId: string;
    courseName: string;
    lectureNumber: number;
    expiresAt: Date;
  } | null>(null);

  const [timeLeft, setTimeLeft] = useState<number>(0);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined;

    if (timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    }

    if (timeLeft === 0 && activeSession) {
      Alert.alert("Session Expired", "The current attendance session has ended.");
      setActiveSession(null);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [timeLeft, activeSession]);

  const generateSessionId = (): string => {
    return "SESSION-" + Math.random().toString(36).substring(2, 10).toUpperCase();
  };

  const handleCreateSession = () => {
    if (!selectedCourseId) {
      Alert.alert("Error", "Please select a course first");
      return;
    }

    const selectedCourse = courses.find((c) => c.id === selectedCourseId);

    if (selectedCourse) {
      const expireTime = new Date();
      expireTime.setMinutes(expireTime.getMinutes() + 10);

      setActiveSession({
        sessionId: generateSessionId(),
        courseName: selectedCourse.name,
        lectureNumber: selectedCourse.totalLectures + 1,
        expiresAt: expireTime,
      });
      setTimeLeft(600);
    }
  };

  const handleLogout = () => {
    Alert.alert("Log Out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log Out",
        style: "destructive",
        onPress: () => {
          navigation.replace('LoginScreen'); // تأكدي أن اسم شاشة الدخول مضبوط
        }
      }
    ]);
  };

  const formatTime = (seconds: number): string => {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min}:${sec < 10 ? "0" : ""}${sec}`;
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ width: 70 }} />
        <Text style={styles.screenTitle}>Professor</Text>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </View>

      {/* Personal Info Card */}
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

      {/* Action Section */}
      <View style={styles.card}>
        <View style={styles.pickerWrapper}>
          <Picker
            selectedValue={selectedCourseId}
            onValueChange={(itemValue) => setSelectedCourseId(itemValue)}
            style={styles.picker}
          >
            <Picker.Item label="Select a Course..." value={null} color="#6b7280" />
            {courses.map((course) => (
              <Picker.Item key={course.id} label={course.name} value={course.id} color="#1c3166" />
            ))}
          </Picker>
        </View>

        <TouchableOpacity
          style={styles.createButton}
          onPress={handleCreateSession}
        >
          <Text style={styles.buttonText}>+ Create Session</Text>
        </TouchableOpacity>
      </View>

      {/* QR Section */}
      {activeSession && (
        <View style={[styles.card, styles.qrContainer]}>
          <Text style={styles.qrTitle}>Active Session</Text>
          <Text style={styles.infoRow}>
            <Text style={styles.label}>Course: </Text>
            <Text style={[styles.infoText, { fontWeight: 'bold', color: '#1c3166' }]}>
              {activeSession.courseName}
            </Text>
          </Text>
          <Text style={styles.infoRow}>
            <Text style={styles.label}>Lecture Number: </Text>
            <Text style={styles.infoText}>{activeSession.lectureNumber}</Text>
          </Text>
          <Text style={styles.infoRow}>
            <Text style={styles.label}>Expires At: </Text>
            <Text style={styles.infoText}>{activeSession.expiresAt.toLocaleTimeString()}</Text>
          </Text>
          <Text style={styles.timer}>Time Left: {formatTime(timeLeft)}</Text>

          <View style={styles.qrCodeWrapper}>
            <QRCode value={activeSession.sessionId} size={200} />
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#f4f6f9" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20, marginTop: 10 },
  screenTitle: { fontSize: 22, fontWeight: "bold", color: "#1c3166" },
  logoutButton: { backgroundColor: "#ef4444", paddingVertical: 8, paddingHorizontal: 16, borderRadius: 6 },
  logoutText: { color: "#ffffff", fontWeight: "bold", fontSize: 14 },
  card: { backgroundColor: "#ffffff", padding: 24, borderRadius: 12, marginBottom: 20, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  cardTitle: { fontSize: 18, fontWeight: "bold", color: "#1c3166", marginBottom: 16 },
  infoRow: { marginBottom: 8, fontSize: 15 },
  label: { fontWeight: "bold", color: "#374151" },
  infoText: { color: "#6b7280", fontWeight: "normal" },
  pickerWrapper: { borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 8, backgroundColor: "#f9fafb", marginBottom: 16 },
  picker: { height: 50, width: "100%" },
  createButton: { backgroundColor: "#f59e0b", paddingVertical: 12, paddingHorizontal: 20, borderRadius: 8, alignSelf: "flex-start" },
  buttonText: { color: "#ffffff", fontWeight: "bold", fontSize: 14 },
  qrContainer: { alignItems: "center" },
  qrTitle: { fontSize: 18, fontWeight: "bold", color: "#1c3166", marginBottom: 16, alignSelf: "flex-start" },
  timer: { fontSize: 16, fontWeight: "bold", color: "#dc2626", marginVertical: 12 },
  qrCodeWrapper: { marginTop: 10, padding: 10, backgroundColor: "#fff", borderRadius: 8, borderWidth: 1, borderColor: "#e5e7eb" }
});
