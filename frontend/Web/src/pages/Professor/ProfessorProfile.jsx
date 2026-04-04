import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../../firebase";
import { doc, getDoc, collection, onSnapshot, getDocs } from "firebase/firestore";
import { signOut, onAuthStateChanged } from "firebase/auth";
import { calculateCourseAttendanceStats, getCourseReport } from '../../services/attendanceService';

const ProfessorProfile = () => {
  const navigate = useNavigate();
  const [profData, setProfData] = useState({ name: "", email: "" });
  const [loading, setLoading] = useState(true);
  const [showToast, setShowToast] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [courses, setCourses] = useState([]);
  const [attendanceRate, setAttendanceRate] = useState(0);
  const [coursesWithAttendance, setCoursesWithAttendance] = useState([]);

 
  const [selectedCourseId, setSelectedCourseId] = useState(null);
  const [courseReport, setCourseReport] = useState(null);

  
  useEffect(() => {
    const preventBack = () => {
      window.history.forward();
    };

    window.history.pushState(null, null, window.location.href);
    window.history.pushState(null, null, window.location.href);
    window.history.pushState(null, null, window.location.href);

    window.addEventListener("popstate", preventBack);
    setTimeout(preventBack, 0);

    return () => {
      window.removeEventListener("popstate", preventBack);
    };
  }, []);

  
  useEffect(() => {
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

            if (
              courseData.professorId === user.uid ||
              courseProfEmail === userEmail ||
              courseData.professorEmail === user.email
            ) {
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

    return () => unsubscribeAuth();
  }, [navigate]);

  // realtime students
  useEffect(() => {
    if (courses.length === 0) return;

    const unsubscribers = courses.map(course => {
      const courseRef = doc(db, "courses", course.id);
      return onSnapshot(courseRef, (docSnap) => {
        if (docSnap.exists()) {
          const courseData = docSnap.data();
          const enrolledCount = (courseData.enrolledStudents || []).length;
          setCourses(prev =>
            prev.map(c =>
              c.id === course.id ? { ...c, count: enrolledCount } : c
            )
          );
        }
      });
    });

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [courses.length]);

  // overall attendance
  useEffect(() => {
    const calculateOverallAttendance = async () => {
      if (courses.length === 0) return;

      let totalPercentage = 0;
      let coursesWithData = 0;

      for (const course of courses) {
        const result = await calculateCourseAttendanceStats(course.id);
        if (result.success && result.data.avgAttendance) {
          totalPercentage += parseFloat(result.data.avgAttendance);
          coursesWithData++;
        }
      }

      const average = coursesWithData > 0
        ? (totalPercentage / coursesWithData).toFixed(2)
        : 0;

      setAttendanceRate(average);
    };

    calculateOverallAttendance();
  }, [courses]);

  // course attendance
  useEffect(() => {
    const fetchCoursesAttendance = async () => {
      if (courses.length === 0) return;

      const updatedCourses = await Promise.all(
        courses.map(async (course) => {
          const result = await calculateCourseAttendanceStats(course.id);
          return {
            ...course,
            attendanceData: result.success ? result.data : null
          };
        })
      );

      setCoursesWithAttendance(updatedCourses);
    };

    fetchCoursesAttendance();
  }, [courses]);

 
  useEffect(() => {
    const fetchReport = async () => {
      if (!selectedCourseId) return;

      const data = await getCourseReport(selectedCourseId);
      setCourseReport(data);
    };

    fetchReport();
  }, [selectedCourseId]);

  if (loading) return <div style={styles.loader}>Loading...</div>;

  return (
    <div style={styles.pageWrapper}>

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

        <div style={styles.statsBar}>
          <div style={styles.statItem}>
            <div style={styles.statNumber}>{courses.length}</div>
            <div style={styles.statLabel}>Active Courses</div>
          </div>

          <div style={styles.statItem}>
            <div style={styles.statNumber}>
              {courses.reduce((t, c) => t + (c.count || 0), 0)}
            </div>
            <div style={styles.statLabel}>Total Students</div>
          </div>

          <div style={styles.statItem}>
            <div style={styles.statNumber}>{attendanceRate}%</div>
            <div style={styles.statLabel}>Attendance Rate</div>
          </div>
        </div>

        <div style={styles.grid}>
          {coursesWithAttendance.map((course) => (
            <div key={course.id} style={styles.courseCard}>
              <h3>{course.name}</h3>

              <p>Students: {course.count}</p>

              {course.attendanceData && (
                <p>Attendance: {course.attendanceData.avgAttendance}%</p>
              )}

              {/* القديم */}
              <button onClick={() => navigate(`/reports/${course.id}`)} style={styles.reportBtn}>
                Reports
              </button>

              {/* الجديد */}
              <button
                onClick={() => setSelectedCourseId(course.id)}
                style={{ ...styles.reportBtn, backgroundColor: "#059669", marginTop: "10px" }}
              >
                📊 Quick Report
              </button>

            </div>
          ))}
        </div>

        {/* عرض التقرير */}
        {courseReport && (
          <div style={{
            marginTop: "30px",
            background: "white",
            padding: "20px",
            borderRadius: "15px"
          }}>
            <h3>📄 Course Report</h3>
            <pre>{JSON.stringify(courseReport, null, 2)}</pre>
          </div>
        )}

      </main>
    </div>
  );
};

const styles = {
  pageWrapper: { backgroundColor: "#F8FAFC", minHeight: "100vh" },
  navbar: { height: "70px", backgroundColor: "#173B66", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 20px", color: "white" },
  logoutBtn: { background: "white", border: "none", padding: "10px", borderRadius: "8px" },
  mainContent: { padding: "20px" },
  statsBar: { display: "flex", gap: "10px", marginBottom: "20px" },
  statItem: { flex: 1, background: "#173B66", color: "white", padding: "15px", borderRadius: "10px" },
  statNumber: { fontSize: "24px" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px,1fr))", gap: "15px" },
  courseCard: { background: "white", padding: "15px", borderRadius: "10px" },
  reportBtn: { width: "100%", padding: "10px", marginTop: "10px", background: "#173B66", color: "white", border: "none", borderRadius: "8px" },
  loader: { textAlign: "center", marginTop: "100px" }
};

export default ProfessorProfile;