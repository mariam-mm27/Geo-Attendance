import React, { useState, useEffect, useContext } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  ScrollView,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import QRCode from "react-native-qrcode-svg";
import { signOut } from "firebase/auth";
import { auth, db } from "../firebase";
import { collection, getDocs, doc, getDoc, addDoc } from "firebase/firestore";
import { AuthContext } from "../context/AuthContext";

interface Course {
  id: string;
  name: string;
  code: string;
}

interface ActiveSession {
  sessionId: string;
  courseName: string;
  lectureNumber: number;
  expiresAt: Date;
  baseSessionId: string;
}

export default function ProfessorSessionScreen({ navigation }: any) {
  const [userData, setUserData] = useState({ name: "", id: "", email: "" });
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [qrRefreshCounter, setQrRefreshCounter] = useState(0);
  const [lectureCounters, setLectureCounters] = useState<Record<string, number>>({});
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [errorModal, setErrorModal] = useState<{ visible: boolean; title: string; message: string }>({
    visible: false,
    title: "",
    message: ""
  });

  const authContext = useContext(AuthContext);
  if (!authContext) return null;
  const { setUser, setRole } = authContext;

  const validateLectureTime = (lectureTime: string): { isValid: boolean; message: string } => {
    try {
      console.log("🕐 Validating lecture time:", lectureTime);
      
      const timePattern = /(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)\s*(?:to|-)\s*(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)/i;
      const match = lectureTime.match(timePattern);
      
      if (!match) {
        console.log("⚠️ Time format doesn't match pattern, allowing session");
        return { isValid: true, message: "" }; // If format doesn't match, allow session creation
      }
      
      const [, startHour, startMin, startPeriod, endHour, endMin, endPeriod] = match;
      
      let startHour24 = parseInt(startHour);
      let endHour24 = parseInt(endHour);
      
      if (startPeriod.toLowerCase() === 'pm' && startHour24 !== 12) startHour24 += 12;
      if (startPeriod.toLowerCase() === 'am' && startHour24 === 12) startHour24 = 0;
      if (endPeriod.toLowerCase() === 'pm' && endHour24 !== 12) endHour24 += 12;
      if (endPeriod.toLowerCase() === 'am' && endHour24 === 12) endHour24 = 0;
      
      const now = new Date();
      const currentHour = now.getHours();
      const currentMin = now.getMinutes();
      
      const currentTimeInMin = currentHour * 60 + currentMin;
      const startTimeInMin = startHour24 * 60 + parseInt(startMin);
      const endTimeInMin = endHour24 * 60 + parseInt(endMin);
      
      console.log(`⏰ Current: ${currentHour}:${currentMin} (${currentTimeInMin} min)`);
      console.log(`📅 Lecture: ${startHour24}:${startMin} - ${endHour24}:${endMin} (${startTimeInMin}-${endTimeInMin} min)`);
      
      const isValid = currentTimeInMin >= startTimeInMin && currentTimeInMin <= endTimeInMin;
      console.log(`✅ Is within time: ${isValid}`);
      
      return {
        isValid,
        message: isValid ? "" : `You can only create sessions during the scheduled lecture time: ${lectureTime}`
      };
    } catch (error) {
      console.error("❌ Error validating lecture time:", error);
      return { isValid: true, message: "" }; 
    }
  };

  useEffect(() => {
    const fetchUserAndCourses = async () => {
      const user = auth.currentUser;
      if (!user) return navigation.replace("Login");

      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setUserData({ name: data.name, id: user.uid, email: data.email });

          const coursesSnapshot = await getDocs(collection(db, "courses"));
          const professorCourses: Course[] = [];
          const userEmail = user.email?.toLowerCase();

          coursesSnapshot.forEach((docSnap) => {
            const courseData = docSnap.data();
            const courseProfEmail = courseData.professorEmail?.toLowerCase();
            if (
              courseData.professorId === user.uid ||
              courseProfEmail === userEmail
            ) {
              professorCourses.push({
                id: docSnap.id,
                name: courseData.name,
                code: courseData.code,
              });
            }
          });

          setCourses(professorCourses);
        }
      } catch (error) {
        console.error(error);
        Alert.alert("Error", "Failed to load courses");
      } finally {
        setLoading(false);
      }
    };

    fetchUserAndCourses();
  }, [navigation]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
        setQrRefreshCounter((prev) => prev + 1);
      }, 1000);
    }
    if (timeLeft === 0 && activeSession) {
      Alert.alert("Session Expired", "The current attendance session has ended.");
      setActiveSession(null);
      setQrRefreshCounter(0);
    }
    return () => clearInterval(timer);
  }, [timeLeft, activeSession]);

  const formatTime = (seconds: number) => {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min}:${sec < 10 ? "0" : ""}${sec}`;
  };

  const getDynamicQRValue = () => {
    if (!activeSession) return "";
    const qrCycle = Math.floor(qrRefreshCounter / 10);
    return `${activeSession.baseSessionId}-${qrCycle}`;
  };

  const handleCreateSession = async () => {
    if (!selectedCourseId) return Alert.alert("Error", "Please select a course first");

    try {
      const selectedCourse = courses.find((c) => c.id === selectedCourseId);
      if (!selectedCourse) return Alert.alert("Error", "Course not found");
      
      // Get full course data to check lecture time
      const courseDoc = await getDoc(doc(db, "courses", selectedCourseId));
      if (!courseDoc.exists()) return Alert.alert("Error", "Course not found");
      
      const courseData = courseDoc.data();
      console.log("📚 Course data:", courseData);
      
      if (courseData.time) {
        const validation = validateLectureTime(courseData.time);
        console.log("🔍 Validation result:", validation);
        if (!validation.isValid) {
          setErrorModal({
            visible: true,
            title: "⏰ Outside Lecture Time",
            message: validation.message
          });
          return;
        }
      } else {
        console.log("⚠️ No time field found in course data");
      }
      
      const lectureNumber = lectureCounters[selectedCourseId] || 1;

      const baseSessionId =
        "SESSION-" + Math.random().toString(36).substring(2, 10).toUpperCase();
      const expireTime = new Date();
      expireTime.setMinutes(expireTime.getMinutes() + 15); // 15 minutes duration

      const user = auth.currentUser;
      if (!user) return Alert.alert("Error", "No user logged in");

      await addDoc(collection(db, "sessions"), {
        sessionId: baseSessionId,
        courseId: selectedCourseId,
        courseName: selectedCourse.name,
        courseCode: selectedCourse.code,
        professorId: user.uid,
        lectureNumber,
        createdAt: new Date(),
        expiresAt: expireTime,
        active: true,
        attendees: [],
      });

      setActiveSession({
        sessionId: baseSessionId + "-0",
        courseName: selectedCourse.name,
        lectureNumber,
        expiresAt: expireTime,
        baseSessionId: baseSessionId,
      });

      setTimeLeft(900); 
      setQrRefreshCounter(0);
      setLectureCounters((prev) => ({
        ...prev,
        [selectedCourseId]: (prev[selectedCourseId] || 1) + 1,
      }));

      Alert.alert("✅ Success", "Session created successfully! QR code will refresh every 10 seconds.");
    } catch (error: any) {
      console.error(error);
      Alert.alert("❌ Error", error.message || "Failed to create session");
    }
  };

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
      navigation.reset({ index: 0, routes: [{ name: "Login" }] });
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Failed to logout");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Error Modal */}
      {errorModal.visible && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>{errorModal.title}</Text>
            <Text style={styles.modalMessage}>{errorModal.message}</Text>
            <TouchableOpacity 
              style={styles.modalButton} 
              onPress={() => setErrorModal({ visible: false, title: "", message: "" })}
            >
              <Text style={styles.modalButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {isSidebarOpen && (
        <>
          <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setIsSidebarOpen(false)} />
          <View style={styles.sidebar}>
            <TouchableOpacity style={styles.closeButton} onPress={() => setIsSidebarOpen(false)}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.sidebarTitle}>Settings</Text>
            <TouchableOpacity style={styles.sidebarItem} onPress={() => { setIsSidebarOpen(false); navigation.navigate("ResetPassword"); }}>
              <Text style={styles.sidebarItemText}>🔑 Reset Password</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => setIsSidebarOpen(true)} style={styles.menuButton}>
          <Text style={styles.menuIcon}>☰</Text>
        </TouchableOpacity>
        <View style={styles.spacer} />
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <Text style={styles.pageTitle}>Professor Profile</Text>

          {loading ? (
            <View style={styles.card}><Text>Loading courses...</Text></View>
          ) : (
            <>
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Personal Information</Text>
                <Text style={styles.infoText}>Name: {userData.name}</Text>
                <Text style={styles.infoText}>Email: {userData.email}</Text>
              </View>

              {courses.length > 0 ? (
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>Create Attendance Session</Text>
                  <Picker selectedValue={selectedCourseId} onValueChange={(v) => setSelectedCourseId(v)} style={styles.picker}>
                    <Picker.Item label="Select a Course..." value={null} />
                    {courses.map((c) => (
                      <Picker.Item key={c.id} label={`${c.code} - ${c.name}`} value={c.id} />
                    ))}
                  </Picker>
                  <TouchableOpacity style={styles.createButton} onPress={handleCreateSession}>
                    <Text style={styles.buttonText}>Create Session</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.card}>
                  <Text style={styles.noCoursesText}>No courses assigned yet.</Text>
                </View>
              )}

              {activeSession && (
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>Active Session</Text>
                  <Text style={styles.infoText}>Course: {activeSession.courseName}</Text>
                  <Text style={styles.infoText}>Lecture: #{activeSession.lectureNumber}</Text>
                  <Text style={styles.infoText}>Time Left: {formatTime(timeLeft)}</Text>
                  <Text style={styles.qrRefreshText}>QR refreshes every 10 seconds</Text>
                  <View style={styles.qrContainer}>
                    <QRCode value={getDynamicQRValue()} size={200} />
                  </View>
                  <Text style={styles.sessionIdText}>Base Session ID: {activeSession.baseSessionId}</Text>
                  <Text style={styles.sessionIdText}>Current QR: {getDynamicQRValue()}</Text>
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
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  modalOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 9999,
  },
  modalContainer: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 30,
    width: "85%",
    maxWidth: 400,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#173B66",
    marginBottom: 15,
    textAlign: "center",
  },
  modalMessage: {
    fontSize: 16,
    color: "#64748B",
    marginBottom: 25,
    textAlign: "center",
    lineHeight: 24,
  },
  modalButton: {
    backgroundColor: "#173B66",
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
    alignSelf: "center",
    minWidth: 120,
  },
  modalButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
    textAlign: "center",
  },
  overlay: { position: "absolute", top:0,left:0,right:0,bottom:0,backgroundColor:"rgba(0,0,0,0.5)", zIndex:999 },
  sidebar: { position:"absolute",top:0,left:0,bottom:0,width:280,backgroundColor:"white",padding:20, zIndex:1000 },
  closeButton:{alignSelf:"flex-end",padding:10,marginBottom:20},
  closeText:{fontSize:24,color:"#173B66",fontWeight:"700"},
  sidebarTitle:{fontSize:22,fontWeight:"700",color:"#173B66",marginBottom:30,paddingBottom:15,borderBottomWidth:2,borderBottomColor:"#E2E8F0"},
  sidebarItem:{paddingVertical:15,paddingHorizontal:10,backgroundColor:"#F8FAFC",borderRadius:10,marginBottom:10},
  sidebarItemText:{fontSize:16,color:"#1E293B",fontWeight:"600"},
  headerBar:{flexDirection:"row",justifyContent:"space-between",alignItems:"center",backgroundColor:"white",paddingVertical:15,paddingHorizontal:20,shadowColor:"#000",shadowOpacity:0.05,shadowRadius:3,shadowOffset:{width:0,height:2},elevation:3},
  menuButton:{padding:5},
  menuIcon:{fontSize:26,color:"#173B66",fontWeight:"700"},
  spacer:{flex:1},
  logoutButton:{backgroundColor:"#173B66",paddingVertical:10,paddingHorizontal:20,borderRadius:8},
  logoutText:{color:"white",fontSize:14,fontWeight:"700"},
  content:{padding:20},
  pageTitle:{fontSize:28,fontWeight:"700",color:"#173B66",textAlign:"center",marginBottom:30,marginTop:10},
  card:{backgroundColor:"#fff",padding:25,borderRadius:20,marginBottom:20,shadowColor:"#000",shadowOpacity:0.1,shadowRadius:15,shadowOffset:{width:0,height:5},elevation:6,borderWidth:1,borderColor:"#E2E8F0"},
  cardTitle:{fontSize:20,fontWeight:"700",color:"#173B66",marginBottom:18,borderBottomWidth:2,borderBottomColor:"#E2E8F0",paddingBottom:10},
  infoText:{fontSize:15,color:"#1E293B",marginBottom:8,lineHeight:22},
  picker:{height:50,marginBottom:15},
  createButton:{backgroundColor:"#173B66",paddingVertical:14,paddingHorizontal:28,borderRadius:12,alignSelf:"flex-start",shadowColor:"#173B66",shadowOpacity:0.4,shadowRadius:10,shadowOffset:{width:0,height:6},elevation:8,marginTop:10},
  buttonText:{color:"#fff",fontWeight:"700",fontSize:15},
  noCoursesText:{fontSize:15,color:"#64748B",textAlign:"center",paddingVertical:10},
  qrContainer:{alignItems:"center",marginTop:20,marginBottom:15},
  qrRefreshText:{fontSize:13,color:"#F59E0B",textAlign:"center",marginTop:10,fontWeight:"600"},
  sessionIdText:{fontSize:12,color:"#64748B",textAlign:"center",marginTop:10},
});
