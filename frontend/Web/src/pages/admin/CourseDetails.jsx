import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";       
import { doc, getDoc, collection, getDocs } from "firebase/firestore";
import { db } from "../../firebase";
import { FaArrowLeft, FaBook, FaUsers, FaChartBar, FaClock } from "react-icons/fa";

const CourseDetails = () => {
  const { type, id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [userData, setUserData] = useState(null);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const collectionName = type === "prof" ? "professors" : "students";
        const userDoc = await getDoc(doc(db, collectionName, id));
        
        if (userDoc.exists()) {
          setUserData({ id: userDoc.id, ...userDoc.data() });
          
          // Fetch courses
          const coursesSnapshot = await getDocs(collection(db, "courses"));
          const allCourses = coursesSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          
          if (type === "prof") {
            // Get courses assigned to this professor
            const profCourses = allCourses.filter(course => 
              course.professorId === id || course.professorEmail === userDoc.data().email
            );
            
            // Fetch enrolled students for each course
            const coursesWithStudents = await Promise.all(
              profCourses.map(async (course) => {
                const enrolledStudentIds = course.enrolledStudents || [];
                const studentsData = [];
                
                if (enrolledStudentIds.length > 0) {
                  const studentsSnapshot = await getDocs(collection(db, "students"));
                  studentsSnapshot.forEach(studentDoc => {
                    if (enrolledStudentIds.includes(studentDoc.id)) {
                      studentsData.push({
                        name: studentDoc.data().name,
                        attendance: studentDoc.data().attendance || "0%"
                      });
                    }
                  });
                }
                
                return {
                  ...course,
                  studentsCount: enrolledStudentIds.length,
                  students: studentsData
                };
              })
            );
            
            setCourses(coursesWithStudents);
          } else {
            // Get courses student is enrolled in
            const studentCourses = allCourses.filter(course => 
              (course.enrolledStudents || []).includes(id)
            );
            setCourses(studentCourses);
          }
        } else {
          console.error("User not found");
          navigate("/admin");
        }
      } catch (error) {
        console.error("Error fetching details:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [type, id, navigate]);

  const handleBackClick = () => {
    const tab = type === "prof" ? "professors" : "students";
    navigate(`/admin?tab=${tab}`);
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <p>Loading...</p>
      </div>
    );
  }

  if (!userData) {
    return (
      <div style={styles.loadingContainer}>
        <p>User not found</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <button onClick={handleBackClick} style={styles.backBtn}>
        <FaArrowLeft style={{ marginRight: "8px" }} /> Back to Dashboard
      </button>

      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>
            {type === "prof" ? "Professor" : "Student"} Details
          </h1>
          <p style={styles.subtitle}>{userData.name}</p>
        </div>
      </div>

      <div style={styles.infoCard}>
        <h3 style={styles.cardTitle}>Personal Information</h3>
        <div style={styles.infoGrid}>
          <div style={styles.infoItem}>
            <span style={styles.infoLabel}>Name:</span>
            <span style={styles.infoValue}>{userData.name}</span>
          </div>
          <div style={styles.infoItem}>
            <span style={styles.infoLabel}>Email:</span>
            <span style={styles.infoValue}>{userData.email}</span>
          </div>
          {type === "std" && userData.code && (
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>Student ID:</span>
              <span style={styles.infoValue}>{userData.code}</span>
            </div>
          )}
          <div style={styles.infoItem}>
            <span style={styles.infoLabel}>Overall Attendance:</span>
            <span style={styles.infoValue}>{userData.attendance || "0%"}</span>
          </div>
        </div>
      </div>

      <div style={styles.coursesCard}>
        <h3 style={styles.cardTitle}>
          <FaBook style={{ marginRight: "8px" }} />
          {type === "prof" ? "Assigned Courses" : "Enrolled Courses"}
        </h3>
        
        {courses.length === 0 ? (
          <p style={{ color: "#64748b", textAlign: "center", padding: "20px" }}>
            No courses {type === "prof" ? "assigned" : "enrolled"} yet.
          </p>
        ) : (
          <div style={styles.coursesList}>
            {courses.map(course => (
              <div key={course.id} style={styles.courseItem}>
                <div style={styles.courseHeader}>
                  <h4 style={styles.courseName}>{course.name}</h4>
                  <span style={styles.courseCode}>{course.code}</span>
                </div>
                
                <div style={styles.courseStats}>
                  <div style={styles.statItem}>
                    <FaClock style={{ marginRight: "5px", color: "#173B66" }} />
                    <span>Time: {course.time}</span>
                  </div>
                  <div style={styles.statItem}>
                    <FaChartBar style={{ marginRight: "5px", color: "#173B66" }} />
                    <span>Duration: {course.duration || "Not specified"}</span>
                  </div>
                  <div style={styles.statItem}>
                    <FaChartBar style={{ marginRight: "5px", color: "#173B66" }} />
                    <span>Room: {course.room}</span>
                  </div>
                  {type === "prof" && (
                    <div style={styles.statItem}>
                      <FaUsers style={{ marginRight: "5px", color: "#173B66" }} />
                      <span>{course.studentsCount} Students</span>
                    </div>
                  )}
                  {type === "std" && (
                    <div style={styles.statItem}>
                      <FaUsers style={{ marginRight: "5px", color: "#173B66" }} />
                      <span>Professor: {course.professorName}</span>
                    </div>
                  )}
                </div>

                {type === "prof" && course.students && course.students.length > 0 && (
                  <div style={styles.studentsSection}>
                    <h5 style={styles.studentsSectionTitle}>Enrolled Students:</h5>
                    <div style={styles.studentsList}>
                      {course.students.map((student, idx) => (
                        <div key={idx} style={styles.studentItem}>
                          <span style={styles.studentName}>{student.name}</span>
                          <span style={styles.studentAttendance}>{student.attendance}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const styles = {
  container: {
    padding: "40px",
    maxWidth: "1200px",
    margin: "0 auto",
    background: "#F8FAFC",
    minHeight: "100vh"
  },
  loadingContainer: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    height: "100vh",
    fontSize: "18px",
    color: "#64748b"
  },
  backBtn: {
    background: "#173B66",
    border: "none",
    color: "white",
    padding: "10px 20px",
    borderRadius: "8px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    fontWeight: "500",
    marginBottom: "20px",
    fontSize: "14px"
  },
  header: {
    marginBottom: "30px"
  },
  title: {
    color: "#173B66",
    fontSize: "32px",
    margin: "0 0 5px 0"
  },
  subtitle: {
    color: "#64748b",
    fontSize: "18px",
    margin: 0
  },
  infoCard: {
    background: "white",
    padding: "30px",
    borderRadius: "12px",
    marginBottom: "20px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
  },
  cardTitle: {
    color: "#173B66",
    fontSize: "20px",
    marginTop: 0,
    marginBottom: "20px",
    display: "flex",
    alignItems: "center"
  },
  infoGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
    gap: "20px"
  },
  infoItem: {
    display: "flex",
    flexDirection: "column",
    gap: "5px"
  },
  infoLabel: {
    color: "#64748b",
    fontSize: "14px",
    fontWeight: "500"
  },
  infoValue: {
    color: "#173B66",
    fontSize: "16px",
    fontWeight: "600"
  },
  coursesCard: {
    background: "white",
    padding: "30px",
    borderRadius: "12px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
  },
  coursesList: {
    display: "grid",
    gap: "20px"
  },
  courseItem: {
    border: "1px solid #e2e8f0",
    borderRadius: "8px",
    padding: "20px",
    background: "#F8FAFC"
  },
  courseHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "15px"
  },
  courseName: {
    color: "#173B66",
    fontSize: "18px",
    margin: 0
  },
  courseCode: {
    background: "#173B66",
    color: "white",
    padding: "4px 12px",
    borderRadius: "6px",
    fontSize: "12px",
    fontWeight: "bold"
  },
  courseStats: {
    display: "flex",
    gap: "20px",
    flexWrap: "wrap",
    marginBottom: "15px"
  },
  statItem: {
    display: "flex",
    alignItems: "center",
    color: "#64748b",
    fontSize: "14px"
  },
  studentsSection: {
    marginTop: "20px",
    paddingTop: "20px",
    borderTop: "1px solid #e2e8f0"
  },
  studentsSectionTitle: {
    color: "#173B66",
    fontSize: "16px",
    marginTop: 0,
    marginBottom: "15px"
  },
  studentsList: {
    display: "grid",
    gap: "10px"
  },
  studentItem: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "10px 15px",
    background: "white",
    borderRadius: "6px",
    border: "1px solid #e2e8f0"
  },
  studentName: {
    color: "#334155",
    fontSize: "14px"
  },
  studentAttendance: {
    color: "#173B66",
    fontSize: "14px",
    fontWeight: "600"
  }
};

export default CourseDetails;
