import React, { useState, useEffect, useContext } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  ScrollView,
  Modal,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import QRCode from "react-native-qrcode-svg";
import { signOut } from "firebase/auth";
import { auth, db } from "../firebase";
import { collection, getDocs, doc, getDoc, addDoc } from "firebase/firestore";
import { AuthContext } from "../context/AuthContext";
import { getCourseReport } from "../services/attendanceService";
import { getActiveSessionsForProfessor , isSessionLiveNow } from "../services/attendanceService";
import { filterCoursesByCurrentTime } from "../services/attendanceService";
import FloatingChatButton from "../components/FloatingChatButton";
 
interface Course {
  id: string;
  name: string;
  code: string;
  room?: string;
  time?: string;
  duration?: number;
  professorName?: string;
  enrolledStudents?: string[];
  count?: number;
  schedule?: { startTime: string; endTime: string }[];
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
  const [courseReport, setCourseReport] = useState<any>(null);
  const [activeSessionsList, setActiveSessionsList] = useState<any[]>([]);
  const [showTimeModal, setShowTimeModal] = useState(false);
  const authContext = useContext(AuthContext);
  if (!authContext) return null;
  const { setUser, setRole } = authContext;


  useEffect(() => {
    const fetchUserAndCourses = async () => {
      const user = auth.currentUser;
      if (!user) return navigation.replace("Login");

      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setUserData({ name: data.name, id: user.uid, email: data.email });

          console.log("🔍 Mobile Professor login debug:");
          console.log("- User UID:", user.uid);
          console.log("- User Email:", user.email);

          const coursesSnapshot = await getDocs(collection(db, "courses"));
          const professorCourses: Course[] = [];
          const userEmail = user.email?.toLowerCase();

          console.log("- Total courses in database:", coursesSnapshot.size);

          coursesSnapshot.forEach((docSnap) => {
            const courseData = docSnap.data();
            const courseProfEmail = courseData.professorEmail?.toLowerCase();
            const courseProfName = courseData.professorName?.toLowerCase();
            const userNameLower = data.name?.toLowerCase();

            console.log(`📚 Course: ${courseData.name}`);
            console.log(`  - professorId: ${courseData.professorId}`);
            console.log(`  - professorEmail: ${courseData.professorEmail}`);
            console.log(`  - professorName: ${courseData.professorName}`);
            console.log(`  - courseProfEmail (lowercase): ${courseProfEmail}`);
            console.log(`  - courseProfName (lowercase): ${courseProfName}`);
            console.log(`  - userNameLower: ${userNameLower}`);

            const matchesUID = courseData.professorId === user.uid;
            const matchesEmailLower = courseProfEmail === userEmail;
            const matchesEmailExact = courseData.professorEmail === user.email;
            const matchesNameLower = courseProfName === userNameLower;
            const matchesNamePartial = courseProfName && userNameLower && 
              (courseProfName.includes(userNameLower) || userNameLower.includes(courseProfName));

            console.log(`  - Matches UID: ${matchesUID}`);
            console.log(`  - Matches Email (lowercase): ${matchesEmailLower}`);
            console.log(`  - Matches Email (exact): ${matchesEmailExact}`);
            console.log(`  - Matches Name (exact): ${matchesNameLower}`);
            console.log(`  - Matches Name (partial): ${matchesNamePartial}`);

            if (matchesUID || matchesEmailLower || matchesEmailExact || matchesNameLower || matchesNamePartial) {
              console.log(`✅ MATCH FOUND for course: ${courseData.name}`);
              professorCourses.push({
                id: docSnap.id,
                name: courseData.name,
                code: courseData.code,
                room: courseData.room,
                time: courseData.time,
                duration: courseData.duration,
                professorName: courseData.professorName,
                enrolledStudents: courseData.enrolledStudents || [],
                count: (courseData.enrolledStudents || []).length,
                schedule: courseData.schedule || [],
              });
            } else {
              console.log(`❌ NO MATCH for course: ${courseData.name}`);
            }
          });

          console.log(`📊 Total matching courses: ${professorCourses.length}`);

          // Filter courses by current time - only show courses that are currently active
          const filteredCourses = filterCoursesByCurrentTime(professorCourses);
          console.log(`⏰ Courses active right now: ${filteredCourses.length}`);
          
          setCourses(filteredCourses); // Only store active courses for session creation
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
  const fetchActiveSessions = async () => {
    const user = auth.currentUser;
    if (!user) return;

   const result = await getActiveSessionsForProfessor(user.uid);

if (result.success) {
  setActiveSessionsList(result.data ?? []);
}
  };

  fetchActiveSessions();
}, []);

  useEffect(() => {
  const fetchReport = async () => {
    if (!selectedCourseId) return;

    const data = await getCourseReport(selectedCourseId);
    setCourseReport(data);
  };

  fetchReport();
}, [selectedCourseId]);

  useEffect(() => {
let timer: ReturnType<typeof setInterval>;
    if (timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
        // Refresh QR code every 10 seconds
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

  // Validate if current time is within lecture schedule
  const validateLectureTime = (lectureTime?: string): boolean => {
    if (!lectureTime) return true; // If no time specified, allow session creation

    try {
      // Parse time format: "4:00 pm to 6:00 pm" or "09:00 AM - 11:00 AM"
      // Support both "to" and "-" as separators
      const timeMatch = lectureTime.match(/(\d{1,2}):(\d{2})\s*(am|pm)\s*(?:to|-)\s*(\d{1,2}):(\d{2})\s*(am|pm)/i);
      
      if (!timeMatch) return true; // If format doesn't match, allow session creation

      const [, startHour, startMin, startPeriod, endHour, endMin, endPeriod] = timeMatch;

      // Convert to 24-hour format
      let startHour24 = parseInt(startHour);
      let endHour24 = parseInt(endHour);

      if (startPeriod.toLowerCase() === 'pm' && startHour24 !== 12) startHour24 += 12;
      if (startPeriod.toLowerCase() === 'am' && startHour24 === 12) startHour24 = 0;
      if (endPeriod.toLowerCase() === 'pm' && endHour24 !== 12) endHour24 += 12;
      if (endPeriod.toLowerCase() === 'am' && endHour24 === 12) endHour24 = 0;

      // Get current time
      const now = new Date();
      const currentHour = now.getHours();
      const currentMin = now.getMinutes();
      const currentTimeInMinutes = currentHour * 60 + currentMin;

      const startTimeInMinutes = startHour24 * 60 + parseInt(startMin);
      const endTimeInMinutes = endHour24 * 60 + parseInt(endMin);

      return currentTimeInMinutes >= startTimeInMinutes && currentTimeInMinutes <= endTimeInMinutes;
    } catch (error) {
      console.error("Error parsing lecture time:", error);
      return true; // On error, allow session creation
    }
  };

  // Generate dynamic QR code that changes every 10 seconds
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
      
      // Validate lecture time
      if (!validateLectureTime(selectedCourse.time)) {
        setShowTimeModal(true);
        return;
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

      {/* Floating Chat Button */}
      <FloatingChatButton onPress={() => navigation.navigate("Chat")} />

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
                  <Text style={styles.sessionNote}>
                    Only courses with current active time slots are available for session creation.
                  </Text>

                  <Picker
                    selectedValue={selectedCourseId}
                    onValueChange={(v) => setSelectedCourseId(v)}
                    style={styles.picker}
                  >
                    <Picker.Item label="Select a Course..." value={null} />
                    {courses.map((c) => (
                      <Picker.Item
                        key={c.id}
                        label={`${c.code} - ${c.name} (${c.time || 'No time set'})`}
                        value={c.id}
                      />
                    ))}
                  </Picker>

                  <TouchableOpacity
                    style={styles.createButton}
                    onPress={handleCreateSession}
                  >
                    <Text style={styles.buttonText}>Create Session</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.card}>
                  <Text style={styles.noCoursesText}>
                    No courses are currently active for session creation.
                  </Text>
                  <Text style={styles.noCoursesSubtext}>
                    Sessions can only be created during scheduled lecture times.
                  </Text>
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

          {/* Chat Button */}
          <TouchableOpacity
            style={styles.chatButton}
            onPress={() => navigation.navigate("Chat")}
          >
            <Text style={styles.buttonText}>💬 Chat with AI Assistant</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Outside Lecture Time Modal */}
      {showTimeModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.timeModal}>
            <View style={styles.timeModalIcon}>
              <Text style={styles.timeModalIconText}>⏰</Text>
            </View>
            <Text style={styles.timeModalTitle}>Outside Lecture Time</Text>
            <Text style={styles.timeModalMessage}>
              You can only create attendance sessions during the scheduled lecture time.
            </Text>
            <TouchableOpacity 
              style={styles.timeModalButton}
              onPress={() => setShowTimeModal(false)}
            >
              <Text style={styles.timeModalButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
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
  
  sessionNote: {
    fontSize: 13,
    color: "#64748B",
    marginBottom: 15,
    fontStyle: "italic",
    textAlign: "center",
    backgroundColor: "#F8FAFC",
    padding: 10,
    borderRadius: 8,
  },
  
  picker:{height:50,marginBottom:15},
  createButton:{backgroundColor:"#173B66",paddingVertical:14,paddingHorizontal:28,borderRadius:12,alignSelf:"flex-start",shadowColor:"#173B66",shadowOpacity:0.4,shadowRadius:10,shadowOffset:{width:0,height:6},elevation:8,marginTop:10},
  chatButton:{backgroundColor:"#667eea",paddingVertical:14,paddingHorizontal:28,borderRadius:12,alignSelf:"center",shadowColor:"#667eea",shadowOpacity:0.4,shadowRadius:10,shadowOffset:{width:0,height:6},elevation:8,marginTop:20,width:"100%"},
  buttonText:{color:"#fff",fontWeight:"700",fontSize:15},
  noCoursesText:{fontSize:15,color:"#64748B",textAlign:"center",paddingVertical:10},
  noCoursesSubtext: {
    fontSize: 13,
    color: "#94A3B8",
    textAlign: "center",
    marginTop: 8,
    fontStyle: "italic",
  },
  qrContainer:{alignItems:"center",marginTop:20,marginBottom:15},
  qrRefreshText:{fontSize:13,color:"#F59E0B",textAlign:"center",marginTop:10,fontWeight:"600"},
  sessionIdText:{fontSize:12,color:"#64748B",textAlign:"center",marginTop:10},
  modalOverlay:{position:"absolute",top:0,left:0,right:0,bottom:0,backgroundColor:"rgba(0,0,0,0.5)",justifyContent:"center",alignItems:"center",zIndex:9999},
  timeModal:{backgroundColor:"white",borderRadius:16,padding:32,width:"85%",maxWidth:400,alignItems:"center",shadowColor:"#000",shadowOpacity:0.25,shadowRadius:20,shadowOffset:{width:0,height:10},elevation:10},
  timeModalIcon:{width:64,height:64,borderRadius:32,backgroundColor:"#F59E0B",justifyContent:"center",alignItems:"center",marginBottom:20},
  timeModalIconText:{fontSize:32,color:"white"},
  timeModalTitle:{fontSize:24,fontWeight:"700",color:"#D97706",marginBottom:12,textAlign:"center"},
  timeModalMessage:{fontSize:16,color:"#64748B",marginBottom:24,textAlign:"center",lineHeight:24},
  timeModalButton:{backgroundColor:"#173B66",paddingVertical:12,paddingHorizontal:32,borderRadius:8,width:"100%"},
  timeModalButtonText:{color:"white",fontSize:16,fontWeight:"700",textAlign:"center"},
});