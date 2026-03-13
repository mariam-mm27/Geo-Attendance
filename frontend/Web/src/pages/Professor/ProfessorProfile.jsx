import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../../firebase";
import { doc, getDoc, collection, onSnapshot, getDocs } from "firebase/firestore";
import { signOut, onAuthStateChanged } from "firebase/auth";

const ProfessorProfile = () => {
  const navigate = useNavigate();
  const [profData, setProfData] = useState({ name: "", email: "" });
  const [loading, setLoading] = useState(true);
  const [showToast, setShowToast] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [courses, setCourses] = useState([]);
  useEffect(() => {
    const preventBack = () => {
      window.history.forward();
    };
    
    window.history.pushState(null, null, window.location.href);
    window.history.pushState(null, null, window.location.href);
    window.history.pushState(null, null, window.location.href);
    
    window.addEventListener("popstate", preventBack);
    setTimeout(preventBack, 0);

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        navigate("/login", { replace: true });
      } else {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (snap.exists()) {
          const userData = snap.data();
          setProfData(userData);
          
          const coursesSnapshot = await getDocs(collection(db, "courses"));
          const professorCourses = [];
          const userEmail = user.email?.toLowerCase();
          
          coursesSnapshot.forEach((docSnap) => {
            const courseData = docSnap.data();
            const courseProfEmail = courseData.professorEmail?.toLowerCase();
            
            if (courseData.professorId === user.uid || 
                courseProfEmail === userEmail ||
                courseData.professorEmail === user.email) {
              professorCourses.push({
                id: docSnap.id,
                ...courseData,
                count: (courseData.enrolledStudents || []).length
              });
            }
          });
          setCourses(professorCourses);
        }
        setLoading(false);
      }
    });

    return () => {
      window.removeEventListener("popstate", preventBack);
      unsubscribeAuth();
    };
  }, [navigate]);

  useEffect(() => {
    if (courses.length === 0) return;

    const unsubscribers = courses.map(course => {
      const courseRef = doc(db, "courses", course.id);
      return onSnapshot(courseRef, (docSnap) => {
        if (docSnap.exists()) {
          const courseData = docSnap.data();
          const enrolledCount = (courseData.enrolledStudents || []).length;
          setCourses(prev => prev.map(c => 
            c.id === course.id ? { ...c, count: enrolledCount } : c
          ));
        }
      });
    });

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [courses.length]);

  if (loading) return <div style={styles.loader}>Loading...</div>;
  return (
    <div style={styles.pageWrapper}>
      {showToast && (
        <div style={styles.toastContainer}>
          <div style={styles.toast}>Student Added Successfully!✅ </div>
        </div>
      )}
      {isSidebarOpen && (
        <div style={styles.sidebarOverlay} onClick={() => setIsSidebarOpen(false)}>
          <div style={styles.sidebar} onClick={e => e.stopPropagation()}>
            <div style={{ padding: "20px", fontSize: "18px", fontWeight: "bold", color: "#173B66" }}>Menu</div>
            <div style={styles.sidebarItem} onClick={() => navigate("/reset-password")}>🔑 Reset Password</div>
            <div style={{...styles.sidebarItem, color: "#173B66", fontWeight: "bold"}} onClick={() => setIsSidebarOpen(false)}> Close</div>
          </div>
        </div>
      )}

      <nav style={styles.navbar}>
        <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
          <div style={styles.menuBtn} onClick={() => setIsSidebarOpen(true)}>☰</div>
          <div style={styles.navTitle}>Professor Dashboard</div>
        </div>
        <button onClick={async () => {
          await signOut(auth);
          localStorage.clear();
          sessionStorage.clear();
          window.location.href = "/login";
        }} style={styles.logoutBtn}>Logout</button>
      </nav>

      <main style={styles.mainContent}>
        <section style={styles.profileSection}>
          <h2 style={styles.sectionHeading}>Profile Information</h2>
          <div style={styles.profileCard}>
            <div style={styles.avatarLarge}>{profData.name?.charAt(0)}</div>
            <div style={styles.infoText}>
              <div style={styles.label}>Name</div><div style={styles.value}>{profData.name}</div>
              <div style={styles.label}>Email</div><div style={styles.value}>{profData.email}</div>
            </div>
          </div>
        </section>

        <div style={styles.statsBar}>
          <div style={styles.statItem}><div style={styles.statNumber}>{courses.length}</div><div style={styles.statLabel}>Active Courses</div></div>
          <div style={styles.statItem}>
            <div style={styles.statNumber}>
              {courses.reduce((total, course) => total + (course.count || 0), 0)}
            </div>
            <div style={styles.statLabel}>Total Students</div>
          </div>
          <div style={styles.statItem}><div style={styles.statNumber}>92%</div><div style={styles.statLabel}>Attendance Rate</div></div>
        </div>

        <h2 style={styles.sectionHeading}>Course Management</h2>
        <div style={styles.grid}>
          {courses.map((course) => (
            <div key={course.id} style={styles.courseCard}>
              <div style={styles.cardHeader}>
                <span style={styles.codeBadge}>{course.code}</span>
              </div>
              <h3 style={styles.courseTitle}>{course.name}</h3>
              <div style={styles.courseDetails}>
                <p>📍 Location: <strong>{course.room}</strong></p>
                <p>🕒 Time: <strong>{course.time}</strong></p>
                <p>👥 Enrolled: <strong style={{color: "#173B66"}}>{course.count} Students</strong></p>
              </div>
              <button onClick={() => navigate(`/reports/${course.id}`)} style={styles.reportBtn}>Reports</button>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};

const styles = {
  pageWrapper: { backgroundColor: "#F8FAFC", minHeight: "100vh", fontFamily: "sans-serif" },
  navbar: { height: "70px", backgroundColor: "#173B66", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 5%", color: "white", position: "sticky", top: 0, zIndex: 100 },
  menuBtn: { fontSize: "28px", cursor: "pointer", color: "white" },
  navTitle: { fontSize: "20px", fontWeight: "bold" },
  logoutBtn: { backgroundColor: "white", border: "none", color: "#173B66", padding: "10px 24px", borderRadius: "8px", cursor: "pointer", fontWeight: "bold", fontSize: "14px" },
  sidebarOverlay: { position: "fixed", top: 0, left: 0, width: "100%", height: "100%", backgroundColor: "rgba(0,0,0,0.4)", zIndex: 6000 },
  sidebar: { width: "260px", height: "100%", backgroundColor: "white", position: "absolute", left: 0, top: 0, boxShadow: "2px 0 10px rgba(0,0,0,0.1)" },
  sidebarItem: { padding: "15px 20px", color: "#173B66", cursor: "pointer", borderBottom: "1px solid #F1F5F9", fontSize: "16px" },
  toastContainer: { position: "fixed", top: "20px", left: 0, width: "100%", display: "flex", justifyContent: "center", zIndex: 7000 },
  toast: { backgroundColor: "#173B66", color: "white", padding: "12px 25px", borderRadius: "50px" },
  mainContent: { padding: "30px 5%" },
  profileSection: { marginBottom: "30px" },
  profileCard: { backgroundColor: "white", padding: "25px", borderRadius: "15px", display: "flex", alignItems: "center", gap: "25px", boxShadow: "0 2px 10px rgba(0,0,0,0.05)" },
  avatarLarge: { width: "70px", height: "70px", backgroundColor: "#173B66", color: "white", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "28px" },
  infoText: { display: "grid", gap: "2px" },
  label: { color: "#94A3B8", fontSize: "11px", fontWeight: "bold" },
  value: { color: "#1E293B", fontSize: "15px", fontWeight: "600" },
  statsBar: { display: "flex", gap: "20px", marginBottom: "40px" },
  statItem: { flex: 1, backgroundColor: "#173B66", padding: "20px", borderRadius: "15px", textAlign: "center", color: "white" },
  statNumber: { fontSize: "30px", fontWeight: "bold" },
  statLabel: { fontSize: "14px", opacity: 0.8 },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "25px" },
  courseCard: { backgroundColor: "white", padding: "25px", borderRadius: "20px", boxShadow: "0 10px 20px rgba(0,0,0,0.05)" },
  cardHeader: { display: "flex", justifyContent: "space-between", marginBottom: "15px" },
  codeBadge: { backgroundColor: "#F1F5F9", color: "#173B66", padding: "4px 10px", borderRadius: "8px", fontSize: "12px", fontWeight: "bold" },
  courseTitle: { fontSize: "19px", color: "#173B66", fontWeight: "bold", marginBottom: "15px" },
  courseDetails: { marginBottom: "20px", borderTop: "1px solid #F1F5F9", paddingTop: "15px" },
  reportBtn: { width: "100%", padding: "12px", borderRadius: "10px", border: "none", backgroundColor: "#173B66", color: "white", fontWeight: "bold", cursor: "pointer" },
  loader: { textAlign: "center", marginTop: "100px", color: "#173B66", fontWeight: "bold" },
  sectionHeading: { color: "#173B66", fontSize: "22px", fontWeight: "bold", marginBottom: "20px" }
};

export default ProfessorProfile;