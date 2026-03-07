import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../../firebase";
import { collection, getDocs, doc, updateDoc, arrayUnion, getDoc } from "firebase/firestore";

const StudentEnroll = () => {
  const navigate = useNavigate();
  const [allCourses, setAllCourses] = useState([]);
  const [enrolledCourseIds, setEnrolledCourseIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [studentId, setStudentId] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const user = auth.currentUser;
        if (!user) {
          navigate("/login");
          return;
        }

        setStudentId(user.uid);

        // Fetch all courses
        const coursesSnapshot = await getDocs(collection(db, "courses"));
        const coursesData = coursesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setAllCourses(coursesData);

        // Get enrolled course IDs
        const enrolledIds = coursesData
          .filter(course => (course.enrolledStudents || []).includes(user.uid))
          .map(course => course.id);
        setEnrolledCourseIds(enrolledIds);
      } catch (error) {
        console.error("Error fetching courses:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [navigate]);

  const handleEnroll = async (courseId) => {
    try {
      const courseRef = doc(db, "courses", courseId);
      await updateDoc(courseRef, {
        enrolledStudents: arrayUnion(studentId)
      });
      setEnrolledCourseIds([...enrolledCourseIds, courseId]);
      alert("Successfully enrolled in course!");
    } catch (error) {
      console.error("Error enrolling:", error);
      alert("Failed to enroll in course");
    }
  };

  if (loading) {
    return <div style={styles.loader}>Loading...</div>;
  }

  const availableCourses = allCourses.filter(
    course => !enrolledCourseIds.includes(course.id)
  );

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button onClick={() => navigate("/student")} style={styles.backBtn}>
          ← Back to Dashboard
        </button>
        <h1 style={styles.title}>Enroll in Courses</h1>
      </div>

      {availableCourses.length === 0 ? (
        <div style={styles.emptyState}>
          <p style={styles.emptyText}>
            You are already enrolled in all available courses!
          </p>
          <button onClick={() => navigate("/student")} style={styles.backButton}>
            Go to Dashboard
          </button>
        </div>
      ) : (
        <div style={styles.coursesGrid}>
          {availableCourses.map(course => (
            <div key={course.id} style={styles.courseCard}>
              <div style={styles.courseHeader}>
                <h3 style={styles.courseName}>{course.name}</h3>
                <span style={styles.courseCode}>{course.code}</span>
              </div>

              <div style={styles.courseDetails}>
                <div style={styles.detailItem}>
                  <span style={styles.icon}>📍</span>
                  <span style={styles.detailLabel}>Room:</span>
                  <span style={styles.detailValue}>{course.room}</span>
                </div>
                <div style={styles.detailItem}>
                  <span style={styles.icon}>🕒</span>
                  <span style={styles.detailLabel}>Time:</span>
                  <span style={styles.detailValue}>{course.time}</span>
                </div>
                <div style={styles.detailItem}>
                  <span style={styles.icon}>⏱️</span>
                  <span style={styles.detailLabel}>Duration:</span>
                  <span style={styles.detailValue}>{course.duration || "Not specified"}</span>
                </div>
                <div style={styles.detailItem}>
                  <span style={styles.icon}>👨‍🏫</span>
                  <span style={styles.detailLabel}>Professor:</span>
                  <span style={styles.detailValue}>{course.professorName}</span>
                </div>
                <div style={styles.detailItem}>
                  <span style={styles.icon}>👥</span>
                  <span style={styles.detailLabel}>Enrolled:</span>
                  <span style={styles.detailValue}>
                    {(course.enrolledStudents || []).length} students
                  </span>
                </div>
              </div>

              <button
                onClick={() => handleEnroll(course.id)}
                style={styles.enrollBtn}
              >
                Enroll Now
              </button>
            </div>
          ))}
        </div>
      )}
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
    marginBottom: "40px"
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
    fontSize: "36px",
    fontWeight: "700",
    margin: 0
  },
  coursesGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))",
    gap: "30px",
    maxWidth: "1400px",
    margin: "0 auto"
  },
  courseCard: {
    background: "white",
    padding: "30px",
    borderRadius: "15px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
    transition: "transform 0.2s, box-shadow 0.2s"
  },
  courseHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "20px",
    paddingBottom: "15px",
    borderBottom: "2px solid #f1f5f9"
  },
  courseName: {
    color: "#173B66",
    fontSize: "20px",
    fontWeight: "700",
    margin: 0,
    flex: 1,
    marginRight: "10px"
  },
  courseCode: {
    background: "#e0f2fe",
    color: "#173B66",
    padding: "6px 12px",
    borderRadius: "8px",
    fontSize: "13px",
    fontWeight: "bold"
  },
  courseDetails: {
    marginBottom: "25px"
  },
  detailItem: {
    display: "flex",
    alignItems: "center",
    marginBottom: "12px",
    color: "#64748b",
    fontSize: "14px"
  },
  icon: {
    marginRight: "8px",
    fontSize: "16px"
  },
  detailLabel: {
    fontWeight: "600",
    marginRight: "6px",
    color: "#475569"
  },
  detailValue: {
    color: "#64748b"
  },
  enrollBtn: {
    width: "100%",
    background: "#173B66",
    color: "white",
    border: "none",
    padding: "14px",
    borderRadius: "10px",
    cursor: "pointer",
    fontSize: "16px",
    fontWeight: "700",
    transition: "background 0.2s"
  },
  emptyState: {
    background: "white",
    padding: "80px 40px",
    borderRadius: "15px",
    textAlign: "center",
    maxWidth: "600px",
    margin: "0 auto",
    boxShadow: "0 2px 8px rgba(0,0,0,0.08)"
  },
  emptyText: {
    color: "#64748b",
    fontSize: "18px",
    marginBottom: "30px"
  },
  backButton: {
    background: "#173B66",
    color: "white",
    border: "none",
    padding: "12px 30px",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "16px",
    fontWeight: "600"
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

export default StudentEnroll;
