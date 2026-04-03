import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../../firebase";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged, signOut } from "firebase/auth";

const StudentProfile = () => {
  const navigate = useNavigate();
  const [studentData, setStudentData] = useState({ name: "", email: "" });
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [attendedSessions, setAttendedSessions] = useState([]);
  const [attendancePercentage, setAttendancePercentage] = useState(0);
  const [totalSessions, setTotalSessions] = useState(0);

  // منع الرجوع للخلف
  useEffect(() => {
    const preventBack = () => {
      window.history.forward();
    };
    
    window.history.pushState(null, null, window.location.href);
    window.addEventListener("popstate", preventBack);

    return () => {
      window.removeEventListener("popstate", preventBack);
    };
  }, []);

  // جلب بيانات الطالب والكورسات والحضور
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        navigate("/login", { replace: true });
        return;
      }

      try {
        // جلب بيانات الطالب
        const userSnap = await getDoc(doc(db, "users", user.uid));
        if (userSnap.exists()) {
          setStudentData(userSnap.data());
        }

        // جلب كل الكورسات
        const coursesSnap = await getDocs(collection(db, "courses"));
        const allCourses = coursesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // فلتر الكورسات اللي الطالب مسجل فيها
        const studentCourses = allCourses.filter(course => 
          (course.enrolledStudents || []).includes(user.uid)
        );
        setEnrolledCourses(studentCourses);

        // جلب الحضور بتاع الطالب
        const attendanceSnap = await getDocs(query(
          collection(db, "attendance"),
          where("studentId", "==", user.uid)
        ));
        const attendanceList = attendanceSnap.docs.map(doc => doc.data());
        setAttendedSessions(attendanceList);

        // جلب كل الجلسات بتاعة كورسات الطالب
        let totalSessionsCount = 0;
        let attendedSessionsCount = attendanceList.length;

        for (const course of studentCourses) {
          const sessionsSnap = await getDocs(query(
            collection(db, "sessions"),
            where("courseCode", "==", course.code)
          ));
          totalSessionsCount += sessionsSnap.size;
        }

        setTotalSessions(totalSessionsCount);
        
        const percentage = totalSessionsCount > 0 
          ? (attendedSessionsCount / totalSessionsCount * 100).toFixed(2) 
          : 0;
        setAttendancePercentage(percentage);

      } catch (err) {
        console.error("Error fetching student data:", err);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    await signOut(auth);
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = "/login";
  };

  if (loading) {
    return <div style={styles.loader}>Loading...</div>;
  }

  return (
    <div style={styles.pageWrapper}>
      {/* Sidebar */}
      {isSidebarOpen && (
        <div style={styles.sidebarOverlay} onClick={() => setIsSidebarOpen(false)}>
          <div style={styles.sidebar} onClick={e => e.stopPropagation()}>
            <div style={{ padding: "20px", fontSize: "18px", fontWeight: "bold", color: "#173B66" }}>Menu</div>
            <div style={styles.sidebarItem} onClick={() => navigate("/reset-password")}>🔑 Reset Password</div>
            <div style={{...styles.sidebarItem, color: "#173B66", fontWeight: "bold"}} onClick={() => setIsSidebarOpen(false)}>Close</div>
          </div>
        </div>
      )}

      {/* Navbar */}
      <nav style={styles.navbar}>
        <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
          <div style={styles.menuBtn} onClick={() => setIsSidebarOpen(true)}>☰</div>
          <div style={styles.navTitle}>Student Dashboard</div>
        </div>
        <button onClick={handleLogout} style={styles.logoutBtn}>Logout</button>
      </nav>

      <main style={styles.mainContent}>
        {/* Profile Section */}
        <section style={styles.profileSection}>
          <h2 style={styles.sectionHeading}>Profile Information</h2>
          <div style={styles.profileCard}>
            <div style={styles.avatarLarge}>{studentData.name?.charAt(0) || "S"}</div>
            <div style={styles.infoText}>
              <div style={styles.label}>Name</div>
              <div style={styles.value}>{studentData.name || "Student"}</div>
              <div style={styles.label}>Email</div>
              <div style={styles.value}>{studentData.email}</div>
              <div style={styles.label}>Student ID</div>
              <div style={styles.value}>{auth.currentUser?.uid?.slice(0, 8)}...</div>
            </div>
          </div>
        </section>

        {/* Stats Bar */}
        <div style={styles.statsBar}>
          <div style={styles.statItem}>
            <div style={styles.statNumber}>{enrolledCourses.length}</div>
            <div style={styles.statLabel}>Enrolled Courses</div>
          </div>
          <div style={styles.statItem}>
            <div style={styles.statNumber}>{attendedSessions.length}</div>
            <div style={styles.statLabel}>Attended Sessions</div>
          </div>
          <div style={styles.statItem}>
            <div style={styles.statNumber}>{attendancePercentage}%</div>
            <div style={styles.statLabel}>Attendance Rate</div>
          </div>
        </div>

        {/* Action Buttons - تم إزالة زر My Courses & Attendance */}
        <div style={styles.actionButtons}>
          <button 
            onClick={() => navigate("/student/enroll")} 
            style={{ ...styles.actionBtn, backgroundColor: "#10B981" }}
          >
            📚 Enroll in Courses
          </button>
          <button 
            onClick={() => navigate("/student/sessions")} 
            style={{ ...styles.actionBtn, backgroundColor: "#2563EB" }}
          >
            📋 My Sessions History
          </button>
        </div>

        {/* My Courses Section */}
        <h2 style={{ ...styles.sectionHeading, marginTop: "40px" }}>My Courses</h2>
        <div style={styles.grid}>
          {enrolledCourses.length === 0 ? (
            <div style={styles.emptyCard}>
              <p>You are not enrolled in any courses yet.</p>
              <button onClick={() => navigate("/student/enroll")} style={styles.enrollNowBtn}>
                Enroll Now →
              </button>
            </div>
          ) : (
            enrolledCourses.map((course) => (
              <div key={course.id} style={styles.courseCard}>
                <div style={styles.cardHeader}>
                  <span style={styles.codeBadge}>{course.code}</span>
                </div>
                <h3 style={styles.courseTitle}>{course.name}</h3>
                <div style={styles.courseDetails}>
                  <p>📍 Location: <strong>{course.room}</strong></p>
                  <p>🕒 Time: <strong>{course.time}</strong></p>
                  <p>👨‍🏫 Professor: <strong>{course.professorName}</strong></p>
                </div>
                <button 
                  onClick={() => navigate(`/student/attendance-history/${course.id}`, { 
                    state: { courseName: course.name } 
                  })}
                  style={styles.viewHistoryBtn}
                >
                  View Attendance History →
                </button>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
};

const styles = {
  pageWrapper: { 
    backgroundColor: "#F8FAFC", 
    minHeight: "100vh", 
    fontFamily: "sans-serif" 
  },
  
  navbar: { 
    height: "70px", 
    backgroundColor: "#173B66", 
    display: "flex", 
    alignItems: "center", 
    justifyContent: "space-between", 
    padding: "0 5%", 
    color: "white", 
    position: "sticky", 
    top: 0, 
    zIndex: 100 
  },
  
  menuBtn: { 
    fontSize: "28px", 
    cursor: "pointer", 
    color: "white" 
  },
  
  navTitle: { 
    fontSize: "20px", 
    fontWeight: "bold" 
  },
  
  logoutBtn: { 
    backgroundColor: "white", 
    border: "none", 
    color: "#173B66", 
    padding: "10px 24px", 
    borderRadius: "8px", 
    cursor: "pointer", 
    fontWeight: "bold", 
    fontSize: "14px" 
  },
  
  sidebarOverlay: { 
    position: "fixed", 
    top: 0, 
    left: 0, 
    width: "100%", 
    height: "100%", 
    backgroundColor: "rgba(0,0,0,0.4)", 
    zIndex: 6000 
  },
  
  sidebar: { 
    width: "260px", 
    height: "100%", 
    backgroundColor: "white", 
    position: "absolute", 
    left: 0, 
    top: 0, 
    boxShadow: "2px 0 10px rgba(0,0,0,0.1)" 
  },
  
  sidebarItem: { 
    padding: "15px 20px", 
    color: "#173B66", 
    cursor: "pointer", 
    borderBottom: "1px solid #F1F5F9", 
    fontSize: "16px" 
  },
  
  mainContent: { 
    padding: "30px 5%" 
  },
  
  profileSection: { 
    marginBottom: "30px" 
  },
  
  profileCard: { 
    backgroundColor: "white", 
    padding: "25px", 
    borderRadius: "15px", 
    display: "flex", 
    alignItems: "center", 
    gap: "25px", 
    boxShadow: "0 2px 10px rgba(0,0,0,0.05)" 
  },
  
  avatarLarge: { 
    width: "70px", 
    height: "70px", 
    backgroundColor: "#173B66", 
    color: "white", 
    borderRadius: "50%", 
    display: "flex", 
    alignItems: "center", 
    justifyContent: "center", 
    fontSize: "28px" 
  },
  
  infoText: { 
    display: "grid", 
    gap: "2px" 
  },
  
  label: { 
    color: "#94A3B8", 
    fontSize: "11px", 
    fontWeight: "bold" 
  },
  
  value: { 
    color: "#1E293B", 
    fontSize: "15px", 
    fontWeight: "600" 
  },
  
  statsBar: { 
    display: "flex", 
    gap: "20px", 
    marginBottom: "30px" 
  },
  
  statItem: { 
    flex: 1, 
    backgroundColor: "#173B66", 
    padding: "20px", 
    borderRadius: "15px", 
    textAlign: "center", 
    color: "white" 
  },
  
  statNumber: { 
    fontSize: "30px", 
    fontWeight: "bold" 
  },
  
  statLabel: { 
    fontSize: "14px", 
    opacity: 0.8 
  },
  
  actionButtons: {
    display: "flex",
    gap: "15px",
    marginBottom: "30px",
    flexWrap: "wrap"
  },
  
  actionBtn: {
    padding: "12px 24px",
    borderRadius: "10px",
    border: "none",
    color: "white",
    fontWeight: "bold",
    cursor: "pointer",
    fontSize: "14px",
    transition: "0.3s"
  },
  
  sectionHeading: { 
    color: "#173B66", 
    fontSize: "22px", 
    fontWeight: "bold", 
    marginBottom: "20px" 
  },
  
  grid: { 
    display: "grid", 
    gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))", 
    gap: "25px" 
  },
  
  courseCard: { 
    backgroundColor: "white", 
    padding: "25px", 
    borderRadius: "20px", 
    boxShadow: "0 10px 20px rgba(0,0,0,0.05)" 
  },
  
  emptyCard: {
    backgroundColor: "white",
    padding: "40px",
    borderRadius: "20px",
    textAlign: "center",
    color: "#64748B"
  },
  
  enrollNowBtn: {
    marginTop: "15px",
    padding: "10px 20px",
    backgroundColor: "#173B66",
    color: "white",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "bold"
  },
  
  cardHeader: { 
    display: "flex", 
    justifyContent: "space-between", 
    marginBottom: "15px" 
  },
  
  codeBadge: { 
    backgroundColor: "#F1F5F9", 
    color: "#173B66", 
    padding: "4px 10px", 
    borderRadius: "8px", 
    fontSize: "12px", 
    fontWeight: "bold" 
  },
  
  courseTitle: { 
    fontSize: "19px", 
    color: "#173B66", 
    fontWeight: "bold", 
    marginBottom: "15px" 
  },
  
  courseDetails: { 
    marginBottom: "20px", 
    borderTop: "1px solid #F1F5F9", 
    paddingTop: "15px" 
  },
  
  viewHistoryBtn: { 
    width: "100%", 
    padding: "12px", 
    borderRadius: "10px", 
    border: "none", 
    backgroundColor: "#173B66", 
    color: "white", 
    fontWeight: "bold", 
    cursor: "pointer",
    transition: "0.3s"
  },
  
  loader: { 
    textAlign: "center", 
    marginTop: "100px", 
    color: "#173B66", 
    fontWeight: "bold" 
  }
};

export default StudentProfile;