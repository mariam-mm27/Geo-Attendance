import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "../../firebase";
import { doc, getDoc, collection, getDocs } from "firebase/firestore";

const CourseReports = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [enrolledStudentsData, setEnrolledStudentsData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const courseDoc = await getDoc(doc(db, "courses", courseId));
        if (courseDoc.exists()) {
          const courseData = { id: courseDoc.id, ...courseDoc.data() };
          setCourse(courseData);

          const enrolledIds = courseData.enrolledStudents || [];
          if (enrolledIds.length > 0) {
            const studentsSnapshot = await getDocs(collection(db, "students"));
            const studentsData = studentsSnapshot.docs
              .map(doc => ({ id: doc.id, ...doc.data() }))
              .filter(student => enrolledIds.includes(student.id));
            setEnrolledStudentsData(studentsData);
          }
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [courseId]);

  if (loading) {
    return <div style={styles.loader}>Loading...</div>;
  }

  if (!course) {
    return <div style={styles.loader}>Course not found</div>;
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button onClick={() => navigate("/admin?tab=courses")} style={styles.backBtn}>
          ← Back to Admin
        </button>
        <h1 style={styles.title}>Course Reports</h1>
      </div>

      <div style={styles.courseInfo}>
        <h2 style={styles.courseName}>{course.name} ({course.code})</h2>
        <div style={styles.courseDetails}>
          <p><strong>Room:</strong> {course.room}</p>
          <p><strong>Time:</strong> {course.time}</p>
          <p><strong>Duration:</strong> {course.duration || "Not specified"}</p>
          <p><strong>Professor:</strong> {course.professorName}</p>
          <p><strong>Total Enrolled:</strong> {enrolledStudentsData.length} students</p>
        </div>
      </div>

      <div style={styles.card}>
        <h3 style={styles.sectionTitle}>Enrolled Students</h3>
        {enrolledStudentsData.length === 0 ? (
          <p style={styles.emptyMessage}>No students enrolled in this course yet.</p>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr style={{ borderBottom: "2px solid #e2e8f0", background: "#F8FAFC" }}>
                <th style={styles.th}>Name</th>
                <th style={styles.th}>Email</th>
                <th style={styles.th}>Student ID</th>
                <th style={{ ...styles.th, textAlign: "center" }}>Attendance</th>
              </tr>
            </thead>
            <tbody>
              {enrolledStudentsData.map(student => (
                <tr key={student.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={styles.td}>{student.name}</td>
                  <td style={styles.td}>{student.email}</td>
                  <td style={styles.td}>{student.code}</td>
                  <td style={{ ...styles.td, textAlign: "center" }}>
                    <span style={styles.attendanceBadge}>
                      {student.attendance || "0%"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div style={styles.statsCard}>
        <h3 style={styles.sectionTitle}>Course Statistics</h3>
        <div style={styles.statsGrid}>
          <div style={styles.statBox}>
            <div style={styles.statNumber}>{enrolledStudentsData.length}</div>
            <div style={styles.statLabel}>Total Students</div>
          </div>
          <div style={styles.statBox}>
            <div style={styles.statNumber}>
              {enrolledStudentsData.length > 0 
                ? Math.round(enrolledStudentsData.reduce((sum, s) => sum + parseInt(s.attendance || "0"), 0) / enrolledStudentsData.length) 
                : 0}%
            </div>
            <div style={styles.statLabel}>Average Attendance</div>
          </div>
          <div style={styles.statBox}>
            <div style={styles.statNumber}>{course.room}</div>
            <div style={styles.statLabel}>Room</div>
          </div>
          <div style={styles.statBox}>
            <div style={styles.statNumber}>{course.time}</div>
            <div style={styles.statLabel}>Time</div>
          </div>
          <div style={styles.statBox}>
            <div style={styles.statNumber}>{course.duration || "N/A"}</div>
            <div style={styles.statLabel}>Duration</div>
          </div>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: { 
    minHeight: "100vh", 
    background: "#F8FAFC", 
    padding: "40px" 
  },
  header: { 
    marginBottom: "30px" 
  },
  backBtn: {
    background: "#173B66",
    color: "white",
    border: "none",
    padding: "10px 20px",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "bold",
    marginBottom: "20px"
  },
  title: { 
    color: "#173B66", 
    fontSize: "32px", 
    margin: 0 
  },
  courseInfo: {
    background: "white",
    padding: "25px",
    borderRadius: "12px",
    marginBottom: "30px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
  },
  courseName: {
    color: "#173B66",
    fontSize: "24px",
    margin: "0 0 15px 0"
  },
  courseDetails: {
    color: "#64748b",
    fontSize: "16px",
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: "10px"
  },
  card: { 
    background: "white", 
    padding: "25px", 
    borderRadius: "12px", 
    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
    marginBottom: "30px"
  },
  statsCard: {
    background: "white", 
    padding: "25px", 
    borderRadius: "12px", 
    boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
  },
  sectionTitle: {
    color: "#173B66",
    fontSize: "20px",
    marginTop: 0,
    marginBottom: "20px"
  },
  emptyMessage: {
    textAlign: "center",
    color: "#64748b",
    fontSize: "16px",
    padding: "40px"
  },
  table: { 
    width: "100%", 
    borderCollapse: "collapse" 
  },
  th: { 
    padding: "15px 10px", 
    textAlign: "left",
    color: "#173B66",
    fontWeight: "bold",
    fontSize: "14px"
  },
  td: { 
    padding: "15px 10px",
    color: "#334155",
    fontSize: "14px"
  },
  attendanceBadge: {
    background: "#dcfce7",
    color: "#166534",
    padding: "4px 12px",
    borderRadius: "12px",
    fontSize: "12px",
    fontWeight: "bold"
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(5, 1fr)",
    gap: "20px"
  },
  statBox: {
    background: "#F8FAFC",
    padding: "20px",
    borderRadius: "12px",
    textAlign: "center"
  },
  statNumber: {
    fontSize: "28px",
    fontWeight: "bold",
    color: "#173B66",
    marginBottom: "8px"
  },
  statLabel: {
    fontSize: "14px",
    color: "#64748b"
  },
  loader: { 
    display: "flex", 
    justifyContent: "center", 
    alignItems: "center", 
    height: "100vh",
    fontSize: "18px",
    color: "#173B66",
    fontWeight: "bold"
  }
};

export default CourseReports;
