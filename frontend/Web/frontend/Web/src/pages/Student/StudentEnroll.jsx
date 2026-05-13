import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../../firebase";
import { collection, getDocs, doc, updateDoc, arrayUnion, getDoc, addDoc, arrayRemove, query, where, deleteDoc } from "firebase/firestore";
import Modal from "../../components/Modal";
import { useModal } from "../../hooks/useModal";
const MAX_COURSES = 6;

const StudentEnroll = () => {
  const navigate = useNavigate();
  const [allCourses, setAllCourses] = useState([]);
  const [enrolledCourseIds, setEnrolledCourseIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [studentId, setStudentId] = useState(null);
  const { modalState, closeModal, showSuccess, showError } = useModal();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const user = auth.currentUser;
        if (!user) {
          navigate("/login");
          return;
        }

        const coursesSnapshot = await getDocs(collection(db, "courses"));
        const coursesData = coursesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setAllCourses(coursesData);

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
      const user = auth.currentUser;
      
      if (enrolledCourseIds.length >= 6) {
        showError("You cannot enroll in more than 6 courses");
        return;
      }

      const courseRef = doc(db, "courses", courseId);

      // Create enrollment record with timestamp (same pattern as admin enrollment)
      const enrollmentData = {
        studentId: user.uid,
        enrolledAt: new Date(),
        courseId: courseId
      };

      // Add to enrolledStudents array and create enrollment record
      await updateDoc(courseRef, {
        enrolledStudents: arrayUnion(user.uid)
      });

      // Create enrollment record in separate collection for tracking dates
      await addDoc(collection(db, "enrollments"), enrollmentData);

      setEnrolledCourseIds([...enrolledCourseIds, courseId]);
      showSuccess("Successfully enrolled in course with enrollment date tracked!");

    } catch (error) {
      console.error("Error enrolling:", error);
      showError("Failed to enroll in course");
    }
  };

  if (loading) {
    return <div style={styles.loader}>Loading courses...</div>;
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
        <div style={{
          marginTop: "12px",
          display: "inline-flex", alignItems: "center", gap: "8px",
          backgroundColor: enrolledCourseIds.length >= MAX_COURSES ? "#FEE2E2" : "#F0F9FF",
          border: `1px solid ${enrolledCourseIds.length >= MAX_COURSES ? "#EF4444" : "#BAE6FD"}`,
          borderRadius: "10px", padding: "8px 18px"
        }}>
          <span>{enrolledCourseIds.length >= MAX_COURSES ? "🚫" : "📚"}</span>
          <span style={{
            fontSize: "14px", fontWeight: "700",
            color: enrolledCourseIds.length >= MAX_COURSES ? "#991B1B" : "#173B66"
          }}>
            {enrolledCourseIds.length >= MAX_COURSES
              ? `Maximum reached (${enrolledCourseIds.length}/${MAX_COURSES})`
              : `Enrolled: ${enrolledCourseIds.length} / ${MAX_COURSES}`}
          </span>
        </div>
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
                <p>📍 Room: {course.room}</p>
                <p>🕒 Time: {course.time}</p>
                <p>👨‍🏫 Professor: {course.professorName}</p>
                <p>👥 Enrolled: {(course.enrolledStudents || []).length} students</p>
              </div>
              <button onClick={() => handleEnroll(course.id)} style={styles.enrollBtn}>
                Enroll Now
              </button>
            </div>
          ))}
        </div>
      )}
      <Modal
        isOpen={modalState.isOpen}
        onClose={closeModal}
        title={modalState.title}
        message={modalState.message}
        type={modalState.type}
        confirmText={modalState.confirmText}
        onConfirm={modalState.onConfirm}
      />
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
    gap: "30px"
  },
  courseCard: {
    background: "white",
    padding: "25px",
    borderRadius: "15px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.08)"
  },
  courseHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "15px",
    paddingBottom: "15px",
    borderBottom: "2px solid #f1f5f9"
  },
  courseName: {
    color: "#173B66",
    fontSize: "20px",
    fontWeight: "700",
    margin: 0
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
    marginBottom: "20px",
    color: "#64748b",
    fontSize: "14px"
  },
  enrollBtn: {
    width: "100%",
    background: "#173B66",
    color: "white",
    border: "none",
    padding: "12px",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "16px",
    fontWeight: "700"
  },
  emptyState: {
    background: "white",
    padding: "80px",
    borderRadius: "15px",
    textAlign: "center"
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
    textAlign: "center",
    padding: "100px",
    fontSize: "18px",
    color: "#173B66"
  }
};

export default StudentEnroll;