import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom"; 
import { auth, db } from "../../firebase"; 
import { doc, getDoc } from "firebase/firestore";
import { signOut, onAuthStateChanged } from "firebase/auth";
import AttendanceBar from "../../components/AttendanceBar";
import { colors } from "../../styles/colors";

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
    window.history.pushState(null, null, window.location.href);
    window.onpopstate = () => window.history.go(1);

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
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    await signOut(auth); 
    window.location.replace("/login"); 
  };

  return (
    <div style={{ backgroundColor: "#F1F5F9", minHeight: "100vh", padding: "60px 10% 40px", position: "relative" }}>
      {}
      <div 
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        style={{ position: "absolute", top: "25px", left: "30px", cursor: "pointer", zIndex: 1001 }}
      >
        <div style={{ width: "25px", height: "3px", backgroundColor: colors.primary, margin: "5px 0" }}></div>
        <div style={{ width: "25px", height: "3px", backgroundColor: colors.primary, margin: "5px 0" }}></div>
        <div style={{ width: "25px", height: "3px", backgroundColor: colors.primary, margin: "5px 0" }}></div>
      </div>
      {}
      {isSidebarOpen && (
        <div style={{
          position: "absolute", top: 0, left: 0, width: "250px", height: "100%", 
          backgroundColor: "white", boxShadow: "2px 0 5px rgba(0,0,0,0.1)", zIndex: 1000, padding: "80px 20px"
        }}>
          <h3 style={{ color: colors.primary }}>Settings</h3>
          
          <button 
            onClick={() => navigate("/reset-password")} 
            style={{ display: "block", width: "100%", padding: "10px", margin: "10px 0", border: "1px solid #ddd", borderRadius: "5px", cursor: "pointer", textAlign: "left" }}
          >
            🔑 Reset Password
          </button>

          <button onClick={() => setIsSidebarOpen(false)} style={{ marginTop: "20px", color: "red", border: "none", background: "none", cursor: "pointer" }}>Close</button>
        </div>
      )}
      {}
      <button 
        onClick={handleLogout}
        style={{ position: "absolute", top: "20px", right: "40px", backgroundColor: "#173B66", color: "white", border: "none", padding: "10px 20px", borderRadius: "8px", cursor: "pointer", fontWeight: "bold", zIndex: 100 }}
      >
        Log Out
      </button>
      <h1 style={{ color: colors.primary, marginBottom: "30px", fontSize: "32px", textAlign: "center" }}>
        Student Dashboard
      </h1>
      {}
      <div style={{ 
        backgroundColor: "white", padding: "30px", borderRadius: "15px", 
        boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)", marginBottom: "40px",
        display: "flex", justifyContent: "space-between", alignItems: "center"
      }}>
        <div>
          <h2 style={{ color: colors.primary, margin: "0 0 10px 0" }}>Personal Information</h2>
          <p style={{ margin: "5px 0", color: "#475569" }}><strong>Name:</strong> {studentData.name}</p>
          <p style={{ margin: "5px 0", color: "#475569" }}><strong>ID:</strong> {studentData.studentId}</p>
          <p style={{ margin: "5px 0", color: "#475569" }}><strong>Email:</strong> {studentData.email}</p>
        </div>
      </div>

      {}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "25px" }}>
        {courses.map((course) => (
          <div key={course.id} style={{ backgroundColor: "white", padding: "25px", borderRadius: "15px", border: "1px solid #E2E8F0" }}>
            <h3 style={{ color: colors.primary, marginBottom: "15px" }}>{course.name}</h3>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
              <span style={{ fontSize: "12px", color: "#64748B" }}>Attendance Rate</span>
              <span style={{ fontSize: "14px", fontWeight: "bold" }}>{course.attendance}%</span>
            </div>
            <AttendanceBar attendance={course.attendance} />
          </div>
        ))}
      </div>
    </div>
  );
};

export default StudentProfile;