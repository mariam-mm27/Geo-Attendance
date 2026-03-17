import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "../../firebase";
import { doc, getDoc, collection, getDocs, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import Modal from "../../components/Modal";
import { useModal } from "../../hooks/useModal";

const EnrollStudents = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [allStudents, setAllStudents] = useState([]);
  const [enrolledStudents, setEnrolledStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const { modalState, closeModal, showSuccess, showError } = useModal();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const courseDoc = await getDoc(doc(db, "courses", courseId));
        if (courseDoc.exists()) {
          const courseData = { id: courseDoc.id, ...courseDoc.data() };
          setCourse(courseData);
          setEnrolledStudents(courseData.enrolledStudents || []);
        }

        const studentsSnapshot = await getDocs(collection(db, "students"));
        const studentsData = studentsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setAllStudents(studentsData);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [courseId]);

  const handleEnroll = async (studentId) => {
    try {
      const courseRef = doc(db, "courses", courseId);
      await updateDoc(courseRef, {
        enrolledStudents: arrayUnion(studentId)
      });
      setEnrolledStudents([...enrolledStudents, studentId]);
      showSuccess("Student enrolled successfully!");
    } catch (error) {
      console.error("Error enrolling student:", error);
      showError("Failed to enroll student");
    }
  };

  const handleUnenroll = async (studentId) => {
    try {
      const courseRef = doc(db, "courses", courseId);
      await updateDoc(courseRef, {
        enrolledStudents: arrayRemove(studentId)
      });
      setEnrolledStudents(enrolledStudents.filter(id => id !== studentId));
      showSuccess("Student unenrolled successfully!");
    } catch (error) {
      console.error("Error unenrolling student:", error);
      showError("Failed to unenroll student");
    }
  };

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
        <h1 style={styles.title}>Enroll Students</h1>
      </div>

      <div style={styles.courseInfo}>
        <h2 style={styles.courseName}>{course.name} ({course.code})</h2>
        <p style={styles.courseDetails}>
          Room: {course.room} | Time: {course.time} | Duration: {course.duration || "Not specified"} | Professor: {course.professorName}
        </p>
      </div>

      <div style={styles.card}>
        <h3 style={styles.sectionTitle}>All Students</h3>
        <table style={styles.table}>
          <thead>
            <tr style={{ borderBottom: "2px solid #e2e8f0", background: "#F8FAFC" }}>
              <th style={styles.th}>Name</th>
              <th style={styles.th}>Email</th>
              <th style={styles.th}>Student ID</th>
              <th style={{ ...styles.th, textAlign: "center" }}>Status</th>
              <th style={{ ...styles.th, textAlign: "center" }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {allStudents.map(student => {
              const isEnrolled = enrolledStudents.includes(student.id);
              return (
                <tr key={student.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={styles.td}>{student.name}</td>
                  <td style={styles.td}>{student.email}</td>
                  <td style={styles.td}>{student.code}</td>
                  <td style={{ ...styles.td, textAlign: "center" }}>
                    <span style={isEnrolled ? styles.enrolledBadge : styles.notEnrolledBadge}>
                      {isEnrolled ? "Enrolled" : "Not Enrolled"}
                    </span>
                  </td>
                  <td style={{ ...styles.td, textAlign: "center" }}>
                    {isEnrolled ? (
                      <button 
                        onClick={() => handleUnenroll(student.id)} 
                        style={styles.unenrollBtn}
                      >
                        Unenroll
                      </button>
                    ) : (
                      <button 
                        onClick={() => handleEnroll(student.id)} 
                        style={styles.enrollBtn}
                      >
                        Enroll
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
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
    margin: "0 0 10px 0"
  },
  courseDetails: {
    color: "#64748b",
    fontSize: "16px",
    margin: 0
  },
  card: { 
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
  enrolledBadge: {
    background: "#dcfce7",
    color: "#166534",
    padding: "4px 12px",
    borderRadius: "12px",
    fontSize: "12px",
    fontWeight: "bold"
  },
  notEnrolledBadge: {
    background: "#fee2e2",
    color: "#991b1b",
    padding: "4px 12px",
    borderRadius: "12px",
    fontSize: "12px",
    fontWeight: "bold"
  },
  enrollBtn: {
    background: "#173B66",
    color: "white",
    border: "none",
    padding: "8px 20px",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: "500"
  },
  unenrollBtn: {
    background: "#dc2626",
    color: "white",
    border: "none",
    padding: "8px 20px",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: "500"
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

export default EnrollStudents;
