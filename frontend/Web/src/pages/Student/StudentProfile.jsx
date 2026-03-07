import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom"; 
import { auth, db } from "../../firebase"; 
import { doc, getDoc } from "firebase/firestore";
import { signOut, onAuthStateChanged } from "firebase/auth";
import AttendanceBar from "../../components/AttendanceBar";

const StudentProfile = () => {
  const navigate = useNavigate(); 
  const [studentData, setStudentData] = useState({ name: "...", studentId: "", email: "" });
  const [courses] = useState([
    { id: 1, name: "Cs309", attendance: 90 },
    { id: 2, name: "Cs303", attendance: 78 }, 
    { id: 3, name: "CS 307", attendance: 88 }, 
    { id: 4, name: "CS 308", attendance: 70 }, 
    { id: 5, name: "CS 306", attendance: 50 },
    { id: 6, name: "CS 316", attendance: 20 }
  ]);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  useEffect(() => {
    // Aggressive back button prevention
    const preventBack = () => {
      window.history.forward();
    };
    
    // Push multiple states
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
              <h3 style={{ 
                color: "#173B66", 
                marginBottom: "20px", 
                fontSize: "20px", 
                fontWeight: "700",
                marginTop: "0"
              }}>
                {course.name}
              </h3>
              <div style={{ 
                display: "flex", 
                justifyContent: "space-between", 
                marginBottom: "12px", 
                alignItems: "center" 
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
      </div>
    </div>
  );
};

export default StudentProfile;
