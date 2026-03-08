import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom"; 
import { auth, db } from "../../firebase"; 
import { doc, getDoc, collection, getDocs } from "firebase/firestore";
import { signOut, onAuthStateChanged } from "firebase/auth";
import AttendanceBar from "../../components/AttendanceBar";

const StudentProfile = () => {
  const navigate = useNavigate(); 
  const [studentData, setStudentData] = useState({ name: "...", studentId: "", email: "" });
  const [courses, setCourses] = useState([]);
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

  const handleLogout = async () => {
    await signOut(auth);
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = "/login";
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

      {}
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

      {}
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

        {}
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

        {}
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

        {}
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
        ) : (
          <div style={{ 
            display: "grid", 
            gridTemplateColumns: "repeat(3, 1fr)", 
            gap: "30px",
            marginBottom: "50px"
          }}>
            {courses.map((course) => (
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

                <div style={{ 
                  display: "flex", 
                  justifyContent: "space-between", 
                  marginBottom: "12px", 
                  alignItems: "center",
                  paddingTop: "15px",
                  borderTop: "1px solid #f1f5f9"
                }}>
                  <span style={{ fontSize: "14px", color: "#64748B", fontWeight: "500" }}>
                    Attendance Rate
                  </span>
                  <span style={{ fontSize: "20px", fontWeight: "700", color: "#1E293B" }}>
                    {course.attendance}%
                  </span>
                </div>
                <AttendanceBar attendance={course.attendance} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentProfile;
