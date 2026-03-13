import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom"; 
import { auth, db } from "../../firebase"; 
import { doc, getDoc, collection, getDocs } from "firebase/firestore";
import { signOut, onAuthStateChanged } from "firebase/auth";
import AttendanceBar from "../../components/AttendanceBar";
import { calculateStudentAttendance, getStudentAttendanceHistory } from '../../services/attendanceService';
const StudentProfile = () => {
  const navigate = useNavigate(); 
  const [studentData, setStudentData] = useState({ name: "...", studentId: "", email: "" });
  const [courses, setCourses] = useState([]);
  const [coursesWithAttendance, setCoursesWithAttendance] = useState([]);
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  useEffect(() => {
    const preventBack = () => {
      window.history.forward();
    };
    
    window.history.pushState(null, null, window.location.href);
    window.history.pushState(null, null, window.location.href);
    window.history.pushState(null, null, window.location.href);
    
    window.addEventListener("popstate", preventBack);
    setTimeout(preventBack, 0);

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setStudentData(docSnap.data());
          
          const coursesSnapshot = await getDocs(collection(db, "courses"));
          const enrolledCourses = [];
          coursesSnapshot.forEach((courseDoc) => {
            const courseData = courseDoc.data();
            if ((courseData.enrolledStudents || []).includes(user.uid)) {
              enrolledCourses.push({
                id: courseDoc.id,
                name: courseData.name,
                code: courseData.code,
                room: courseData.room,
                time: courseData.time,
                duration: courseData.duration,
                professorName: courseData.professorName,
                attendance: 0 
              });
            }
          });
          setCourses(enrolledCourses);
        }
      } else {
        window.location.replace("/login"); 
      }
    });
    
    return () => {
      window.removeEventListener("popstate", preventBack);
      unsubscribe();
    };
  }, []);

  // جلب نسبة الحضور لكل كورس
  useEffect(() => {
    const fetchAttendanceForCourses = async () => {
      if (!studentData.studentId || courses.length === 0) return;
      
      setLoadingAttendance(true);
      
      const updatedCourses = await Promise.all(
        courses.map(async (course) => {
const result = await calculateStudentAttendance(course.id, auth.currentUser.uid);          return {
            ...course,
            attendance: result.success ? result.data.percentage : "0",
            attendanceDetails: result.success ? result.data : null
          };
        })
      );
      
      setCoursesWithAttendance(updatedCourses);
      setLoadingAttendance(false);
    };
    
    fetchAttendanceForCourses();
  }, [courses, studentData.studentId]);

  const handleLogout = async () => {
    try {
      setStudentData({ name: "...", studentId: "", email: "" });
      setCourses([]);
      
      await signOut(auth);
      localStorage.clear();
      sessionStorage.clear();
      
      window.history.pushState(null, null, "/login");
      window.location.replace("/login");
    } catch (error) {
      console.error("Logout error:", error);
      window.location.replace("/login");
    }
  };

  const handleViewHistory = async (courseId, courseName) => {
const result = await getStudentAttendanceHistory(courseId, auth.currentUser.uid);    if (result.success) {
      const historyText = result.data.map(s => 
        `${new Date(s.date).toLocaleDateString()}: ${s.attended ? '✅ حاضر' : '❌ غائب'}`
      ).join('\n');
      
      alert(`📊 Attendance History for ${courseName}\n\n${historyText || 'No sessions yet'}`);
    } else {
      alert('Error loading attendance history');
    }
  };

  const getAttendanceColor = (percentage) => {
    const p = parseFloat(percentage);
    if (p >= 75) return { bg: "#d4edda", text: "#155724", border: "#c3e6cb" };
    if (p >= 50) return { bg: "#fff3cd", text: "#856404", border: "#ffeeba" };
    return { bg: "#f8d7da", text: "#721c24", border: "#f5c6cb" };
  };

  return (
    <div style={{ backgroundColor: "#F8FAFC", minHeight: "100vh", position: "relative" }}>
      {/* Sidebar */}
      {isSidebarOpen && (
        <div style={{
          position: "fixed", 
          top: 0, 
          left: 0, 
          width: "250px", 
          height: "100%", 
          backgroundColor: "white", 
          boxShadow: "2px 0 5px rgba(0,0,0,0.1)", 
          zIndex: 1000, 
          padding: "80px 20px"
        }}>
          <h3 style={{ color: "#173B66" }}>Settings</h3>
          
          <button 
            onClick={() => navigate("/reset-password")} 
            style={{ 
              display: "block", 
              width: "100%", 
              padding: "10px", 
              margin: "10px 0", 
              border: "1px solid #ddd", 
              borderRadius: "5px", 
              cursor: "pointer", 
              textAlign: "left",
              background: "white"
            }}
          >
            🔑 Reset Password
          </button>

          <button 
            onClick={() => setIsSidebarOpen(false)} 
            style={{ 
              marginTop: "20px", 
              color: "red", 
              border: "none", 
              background: "none", 
              cursor: "pointer" 
            }}
          >
            Close
          </button>
        </div>
      )}

      {/* Navbar */}
      <div style={{ 
        backgroundColor: "white",
        padding: "20px 40px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
      }}>
        <div 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          style={{ cursor: "pointer", fontSize: "24px", color: "#173B66" }}
        >
          ☰
        </div>
        
        <button 
          onClick={handleLogout}
          style={{ 
            backgroundColor: "#173B66", 
            color: "white", 
            border: "none", 
            padding: "10px 24px", 
            borderRadius: "8px", 
            cursor: "pointer", 
            fontWeight: "600",
            fontSize: "14px"
          }}
        >
          Log Out
        </button>
      </div>

      {/* Main Content */}
      <div style={{ padding: "50px 100px", maxWidth: "1600px", margin: "0 auto" }}>
        {/* Title */}
        <h1 style={{ 
          color: "#173B66", 
          fontSize: "36px", 
          fontWeight: "700", 
          textAlign: "center", 
          marginBottom: "50px",
          marginTop: "0"
        }}>
          Student Dashboard
        </h1>

        {/* Personal Information */}
        <div style={{ 
          backgroundColor: "white", 
          padding: "35px 45px", 
          borderRadius: "15px", 
          boxShadow: "0 2px 4px rgba(0,0,0,0.08)", 
          marginBottom: "50px"
        }}>
          <h2 style={{ 
            color: "#173B66", 
            margin: "0 0 25px 0", 
            fontSize: "20px", 
            fontWeight: "700" 
          }}>
            Personal Information
          </h2>
          <div style={{ lineHeight: "2" }}>
            <p style={{ margin: "8px 0", color: "#1E293B", fontSize: "16px" }}>
              <strong style={{ fontWeight: "600" }}>Name:</strong> {studentData.name}
            </p>
            <p style={{ margin: "8px 0", color: "#1E293B", fontSize: "16px" }}>
              <strong style={{ fontWeight: "600" }}>ID:</strong> {studentData.studentId}
            </p>
            <p style={{ margin: "8px 0", color: "#1E293B", fontSize: "16px" }}>
              <strong style={{ fontWeight: "600" }}>Email:</strong> {studentData.email}
            </p>
          </div>
        </div>

        {/* My Courses Header */}
        <div style={{ 
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "30px"
        }}>
          <h2 style={{ 
            color: "#173B66", 
            margin: "0", 
            fontSize: "24px", 
            fontWeight: "700" 
          }}>
            My Courses
          </h2>
          <button
            onClick={() => navigate("/student-enroll")}
            style={{
              backgroundColor: "#173B66",
              color: "white",
              border: "none",
              padding: "12px 24px",
              borderRadius: "8px",
              cursor: "pointer",
              fontWeight: "600",
              fontSize: "14px"
            }}
          >
            + Enroll in Course
          </button>
        </div>

        {/* Courses Grid */}
        {courses.length === 0 ? (
          <div style={{
            backgroundColor: "white",
            padding: "60px",
            borderRadius: "15px",
            boxShadow: "0 2px 4px rgba(0,0,0,0.08)",
            textAlign: "center"
          }}>
            <p style={{ color: "#64748b", fontSize: "18px", margin: 0 }}>
              You are not enrolled in any courses yet. Click "Enroll in Course" to get started.
            </p>
          </div>
        ) : loadingAttendance ? (
          <div style={{ textAlign: "center", padding: "40px" }}>
            <p>Loading attendance data...</p>
          </div>
        ) : (
          <div style={{ 
            display: "grid", 
            gridTemplateColumns: "repeat(3, 1fr)", 
            gap: "30px",
            marginBottom: "50px"
          }}>
            {coursesWithAttendance.map((course) => {
              const colors = getAttendanceColor(course.attendance);
              return (
                <div key={course.id} style={{ 
                  backgroundColor: "white", 
                  padding: "30px", 
                  borderRadius: "15px", 
                  boxShadow: "0 2px 4px rgba(0,0,0,0.08)"
                }}>
                  <div style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: "15px"
                  }}>
                    <h3 style={{ 
                      color: "#173B66", 
                      fontSize: "20px", 
                      fontWeight: "700",
                      marginTop: "0",
                      marginBottom: "0",
                      flex: 1
                    }}>
                      {course.name}
                    </h3>
                    <span style={{
                      backgroundColor: "#e0f2fe",
                      color: "#173B66",
                      padding: "4px 10px",
                      borderRadius: "6px",
                      fontSize: "12px",
                      fontWeight: "bold",
                      marginLeft: "10px"
                    }}>
                      {course.code}
                    </span>
                  </div>
                  
                  <div style={{ marginBottom: "20px", paddingTop: "15px", borderTop: "1px solid #f1f5f9" }}>
                    <p style={{ 
                      margin: "8px 0", 
                      color: "#64748b", 
                      fontSize: "14px",
                      display: "flex",
                      alignItems: "center"
                    }}>
                      <span style={{ marginRight: "8px" }}>📍</span>
                      <strong style={{ fontWeight: "600", marginRight: "5px" }}>Room:</strong> 
                      {course.room}
                    </p>
                    <p style={{ 
                      margin: "8px 0", 
                      color: "#64748b", 
                      fontSize: "14px",
                      display: "flex",
                      alignItems: "center"
                    }}>
                      <span style={{ marginRight: "8px" }}>🕒</span>
                      <strong style={{ fontWeight: "600", marginRight: "5px" }}>Time:</strong> 
                      {course.time}
                    </p>
                    <p style={{ 
                      margin: "8px 0", 
                      color: "#64748b", 
                      fontSize: "14px",
                      display: "flex",
                      alignItems: "center"
                    }}>
                      <span style={{ marginRight: "8px" }}>⏱️</span>
                      <strong style={{ fontWeight: "600", marginRight: "5px" }}>Duration:</strong> 
                      {course.duration || "Not specified"}
                    </p>
                    <p style={{ 
                      margin: "8px 0", 
                      color: "#64748b", 
                      fontSize: "14px",
                      display: "flex",
                      alignItems: "center"
                    }}>
                      <span style={{ marginRight: "8px" }}>👨‍🏫</span>
                      <strong style={{ fontWeight: "600", marginRight: "5px" }}>Professor:</strong> 
                      {course.professorName || "Not assigned"}
                    </p>
                  </div>

                  {/* Attendance Section */}
                  <div style={{ 
                    padding: "15px",
                    backgroundColor: colors.bg,
                    borderRadius: "8px",
                    border: `1px solid ${colors.border}`,
                    marginBottom: "15px"
                  }}>
                    <div style={{ 
                      display: "flex", 
                      justifyContent: "space-between", 
                      marginBottom: "8px", 
                      alignItems: "center"
                    }}>
                      <span style={{ fontSize: "14px", color: colors.text, fontWeight: "600" }}>
                        Attendance Rate
                      </span>
                      <span style={{ fontSize: "24px", fontWeight: "700", color: colors.text }}>
                        {course.attendance}%
                      </span>
                    </div>
                    <AttendanceBar attendance={parseFloat(course.attendance)} />
                    
                    {course.attendanceDetails && (
                      <div style={{ 
                        marginTop: "10px", 
                        fontSize: "13px", 
                        color: colors.text,
                        display: "flex",
                        justifyContent: "space-between"
                      }}>
                        <span>✅ {course.attendanceDetails.attendedSessions} attended</span>
                        <span>📚 {course.attendanceDetails.totalSessions} total</span>
                      </div>
                    )}
                  </div>

                  {/* History Button */}
                  <button
                    onClick={() => handleViewHistory(course.id, course.name)}
                    style={{
                      backgroundColor: "white",
                      border: "1px solid #173B66",
                      color: "#173B66",
                      padding: "10px",
                      borderRadius: "6px",
                      cursor: "pointer",
                      width: "100%",
                      fontSize: "14px",
                      fontWeight: "600",
                      transition: "0.3s"
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.backgroundColor = "#173B66";
                      e.target.style.color = "white";
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor = "white";
                      e.target.style.color = "#173B66";
                    }}
                  >
                    📋 View Attendance History
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentProfile;