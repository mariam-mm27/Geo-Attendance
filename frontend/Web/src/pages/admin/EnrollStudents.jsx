import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "../../firebase";
import {
  doc,
  getDoc,
  collection,
  getDocs,
  updateDoc,
  arrayUnion,
  arrayRemove,
  addDoc
} from "firebase/firestore";
import { 
  FaArrowLeft, 
  FaSearch, 
  FaUserPlus, 
  FaUserMinus, 
  FaUsers, 
  FaGraduationCap,
  FaCheckCircle,
  FaTimesCircle,
  FaSpinner,
  FaBook,
  FaEnvelope,
  FaIdCard
} from "react-icons/fa";

import Modal from "../../components/Modal";
import { useModal } from "../../hooks/useModal";

const EnrollStudents = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();

  const [course, setCourse] = useState(null);
  const [allStudents, setAllStudents] = useState([]);
  const [enrolledStudents, setEnrolledStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [searchedStudent, setSearchedStudent] = useState(null);

  const { modalState, closeModal, showSuccess, showError } = useModal();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const courseDoc = await getDoc(doc(db, "courses", courseId));

        if (courseDoc.exists()) {
          const data = courseDoc.data();
          setCourse({ id: courseDoc.id, ...data });
          setEnrolledStudents(data.enrolledStudents || []);
        }

        const snap = await getDocs(collection(db, "students"));

        const students = snap.docs.map(d => ({
          id: d.id,
          ...d.data()
        }));

        setAllStudents(students);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [courseId]);

  const handleSearch = async () => {
    if (!search.trim()) {
      showError("Please enter student information to search");
      return;
    }

    setSearchLoading(true);
    try {
      const snap = await getDocs(collection(db, "students"));

      let found = null;

      snap.forEach((d) => {
        const data = d.data();

        if (
          d.id === search ||        
          data.code === search ||   
          data.name?.toLowerCase().includes(search.toLowerCase()) ||   
          data.email?.toLowerCase().includes(search.toLowerCase())     
        ) {
          found = {
            id: d.id,
            ...data
          };
        }
      });

      if (found) {
        setSearchedStudent(found);
        showSuccess("Student found successfully");
      } else {
        setSearchedStudent(null);
        showError("No student found with the provided information");
      }
    } catch (error) {
      console.error(error);
      showError("Error searching for student");
    } finally {
      setSearchLoading(false);
    }
  };

  const handleEnroll = async (studentId) => {
    try {
      const ref = doc(db, "courses", courseId);

      // Create enrollment record with timestamp
      const enrollmentData = {
        studentId: studentId,
        enrolledAt: new Date(),
        courseId: courseId
      };

      // Add to enrolledStudents array and create enrollment record
      await updateDoc(ref, {
        enrolledStudents: arrayUnion(studentId)
      });

      // Create enrollment record in separate collection for tracking dates
      await addDoc(collection(db, "enrollments"), enrollmentData);

      setEnrolledStudents(prev => [...prev, studentId]);
      showSuccess("Student enrolled successfully with enrollment date tracked");
    } catch (err) {
      console.error(err);
      showError("Failed to enroll student");
    }
  };

  const handleUnenroll = async (studentId) => {
    try {
      const ref = doc(db, "courses", courseId);

      await updateDoc(ref, {
        enrolledStudents: arrayRemove(studentId)
      });

      setEnrolledStudents(prev =>
        prev.filter(id => id !== studentId)
      );

      showSuccess("Student unenrolled successfully");
    } catch (err) {
      console.error(err);
      showError("Failed to unenroll student");
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <FaSpinner style={styles.spinner} />
        <p style={styles.loadingText}>Loading course data...</p>
      </div>
    );
  }

  if (!course) {
    return (
      <div style={styles.loadingContainer}>
        <FaTimesCircle style={styles.errorIcon} />
        <p style={styles.errorText}>Course not found</p>
      </div>
    );
  }

  const enrolledCount = enrolledStudents.length;
  const totalStudents = allStudents.length;

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <button 
          onClick={() => navigate("/admin?tab=courses")} 
          style={styles.backBtn}
          onMouseEnter={(e) => e.target.style.backgroundColor = '#0F2744'}
          onMouseLeave={(e) => e.target.style.backgroundColor = '#173B66'}
        >
          <FaArrowLeft style={styles.backIcon} />
          Back to Courses
        </button>

        <div style={styles.titleSection}>
          <h1 style={styles.title}>
            <FaUsers style={styles.titleIcon} />
            Student Enrollment Management
          </h1>
          <p style={styles.subtitle}>Manage student enrollments for your course</p>
        </div>
      </div>

      {/* Course Info Card */}
      <div style={styles.courseCard}>
        <div style={styles.courseHeader}>
          <div style={styles.courseIcon}>
            <FaGraduationCap />
          </div>
          <div style={styles.courseInfo}>
            <h2 style={styles.courseName}>{course.name}</h2>
            <p style={styles.courseCode}>Course Code: {course.code}</p>
            <div style={styles.courseStats}>
              <span style={styles.statItem}>
                <FaUsers style={styles.statIcon} />
                {enrolledCount} Enrolled Students
              </span>
              <span style={styles.statItem}>
                <FaBook style={styles.statIcon} />
                {totalStudents} Total Students
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Search Section */}
      <div style={styles.searchCard}>
        <div style={styles.searchHeader}>
          <h3 style={styles.sectionTitle}>
            <FaSearch style={styles.sectionIcon} />
            Search Student
          </h3>
          <p style={styles.sectionSubtitle}>Find students by name, email, code, or ID</p>
        </div>

        <div style={styles.searchContainer} className="search-container">
          <div style={styles.inputGroup} className="input-group">
            <FaSearch style={styles.inputIcon} />
            <input
              placeholder="Enter student name, email, code, or ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyPress={handleKeyPress}
              style={styles.searchInput}
            />
          </div>
          <button 
            onClick={handleSearch} 
            disabled={searchLoading}
            style={styles.searchBtn}
            onMouseEnter={(e) => !searchLoading && (e.target.style.backgroundColor = '#0F2744')}
            onMouseLeave={(e) => !searchLoading && (e.target.style.backgroundColor = '#173B66')}
          >
            {searchLoading ? (
              <FaSpinner style={styles.buttonSpinner} />
            ) : (
              <FaSearch />
            )}
            {searchLoading ? 'Searching...' : 'Search'}
          </button>
        </div>

        {searchedStudent && (
          <div style={styles.searchResult}>
            <div style={styles.resultHeader}>
              <FaCheckCircle style={styles.successIcon} />
              <span style={styles.resultTitle}>Student Found</span>
            </div>
            <div style={styles.resultContent}>
              <div style={styles.studentInfo}>
                <div style={styles.infoItem}>
                  <FaIdCard style={styles.infoIcon} />
                  <span style={styles.infoLabel}>Name:</span>
                  <span style={styles.infoValue}>{searchedStudent.name}</span>
                </div>
                <div style={styles.infoItem}>
                  <FaEnvelope style={styles.infoIcon} />
                  <span style={styles.infoLabel}>Email:</span>
                  <span style={styles.infoValue}>{searchedStudent.email}</span>
                </div>
                <div style={styles.infoItem}>
                  <FaIdCard style={styles.infoIcon} />
                  <span style={styles.infoLabel}>Code:</span>
                  <span style={styles.infoValue}>{searchedStudent.code}</span>
                </div>
              </div>
              <div style={styles.resultActions}>
                {enrolledStudents.includes(searchedStudent.id) ? (
                  <button
                    onClick={() => handleUnenroll(searchedStudent.id)}
                    style={styles.unenrollBtn}
                    onMouseEnter={(e) => e.target.style.backgroundColor = '#B91C1C'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = '#DC2626'}
                  >
                    <FaUserMinus />
                    Unenroll Student
                  </button>
                ) : (
                  <button
                    onClick={() => handleEnroll(searchedStudent.id)}
                    style={styles.enrollBtn}
                    onMouseEnter={(e) => e.target.style.backgroundColor = '#059669'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = '#10B981'}
                  >
                    <FaUserPlus />
                    Enroll Student
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Students Table */}
      <div style={styles.tableCard}>
        <div style={styles.tableHeader}>
          <h3 style={styles.sectionTitle}>
            <FaUsers style={styles.sectionIcon} />
            All Students ({totalStudents})
          </h3>
          <div style={styles.enrollmentSummary}>
            <span style={styles.enrolledBadge}>
              {enrolledCount} Enrolled
            </span>
            <span style={styles.notEnrolledBadge}>
              {totalStudents - enrolledCount} Not Enrolled
            </span>
          </div>
        </div>

        <div style={styles.tableContainer}>
          <table style={styles.table}>
            <colgroup>
              <col style={{ width: "25%" }} />
              <col style={{ width: "30%" }} />
              <col style={{ width: "15%" }} />
              <col style={{ width: "15%" }} />
              <col style={{ width: "15%" }} />
            </colgroup>
            <thead>
              <tr style={styles.tableHeaderRow}>
                <th style={styles.tableHeaderCell}>
                  Name
                </th>
                <th style={styles.tableHeaderCell}>
                  Email
                </th>
                <th style={styles.tableHeaderCell}>
                  Code
                </th>
                <th style={styles.tableHeaderCell}>Status</th>
                <th style={styles.tableHeaderCell}>Action</th>
              </tr>
            </thead>
            <tbody>
              {allStudents.map((student, index) => {
                const isEnrolled = enrolledStudents.includes(student.id);
                return (
                  <tr 
                    key={student.id} 
                    style={{
                      ...styles.tableRow,
                      backgroundColor: index % 2 === 0 ? '#FFFFFF' : '#F8FAFC'
                    }}
                  >
                    <td style={styles.tableCell}>
                      <div style={styles.nameCell}>
                        <div style={styles.avatar}>
                          {student.name?.charAt(0)?.toUpperCase() || 'S'}
                        </div>
                        <span style={styles.studentName}>{student.name}</span>
                      </div>
                    </td>
                    <td style={styles.tableCell}>
                      <span style={styles.emailText}>{student.email}</span>
                    </td>
                    <td style={styles.tableCell}>
                      <span style={styles.codeText}>{student.code}</span>
                    </td>
                    <td style={styles.tableCell}>
                      <span style={isEnrolled ? styles.enrolledStatus : styles.notEnrolledStatus}>
                        {isEnrolled ? (
                          <>
                            <FaCheckCircle style={styles.statusIcon} />
                            Enrolled
                          </>
                        ) : (
                          <>
                            <FaTimesCircle style={styles.statusIcon} />
                            Not Enrolled
                          </>
                        )}
                      </span>
                    </td>
                    <td style={styles.tableCell}>
                      {isEnrolled ? (
                        <button
                          onClick={() => handleUnenroll(student.id)}
                          style={styles.tableUnenrollBtn}
                          onMouseEnter={(e) => e.target.style.backgroundColor = '#B91C1C'}
                          onMouseLeave={(e) => e.target.style.backgroundColor = '#DC2626'}
                        >
                          <FaUserMinus />
                          Unenroll
                        </button>
                      ) : (
                        <button
                          onClick={() => handleEnroll(student.id)}
                          style={styles.tableEnrollBtn}
                          onMouseEnter={(e) => e.target.style.backgroundColor = '#0F2744'}
                          onMouseLeave={(e) => e.target.style.backgroundColor = '#173B66'}
                        >
                          <FaUserPlus />
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
      </div>

      <Modal
        isOpen={modalState.isOpen}
        onClose={closeModal}
        title={modalState.title}
        message={modalState.message}
        type={modalState.type}
      />
    </div>
  );
};

export default EnrollStudents;

/* ================= MODERN PROFESSIONAL STYLES ================= */

const styles = {
  container: {
    padding: "40px",
    background: "linear-gradient(135deg, #F8FAFC 0%, #E2E8F0 100%)",
    minHeight: "100vh",
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
  },

  // Loading States
  loadingContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100vh",
    background: "#F8FAFC"
  },
  spinner: {
    fontSize: "48px",
    color: "#173B66",
    animation: "spin 1s linear infinite",
    marginBottom: "20px"
  },
  loadingText: {
    fontSize: "18px",
    color: "#64748B",
    margin: 0
  },
  errorIcon: {
    fontSize: "48px",
    color: "#DC2626",
    marginBottom: "20px"
  },
  errorText: {
    fontSize: "18px",
    color: "#DC2626",
    margin: 0
  },

  // Header Section
  header: {
    marginBottom: "40px"
  },
  backBtn: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "12px 20px",
    backgroundColor: "#173B66",
    color: "white",
    border: "none",
    borderRadius: "10px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "600",
    transition: "all 0.3s ease",
    boxShadow: "0 4px 6px rgba(23, 59, 102, 0.25)",
    marginBottom: "20px"
  },
  backIcon: {
    fontSize: "14px"
  },
  titleSection: {
    textAlign: "center"
  },
  title: {
    fontSize: "36px",
    fontWeight: "700",
    color: "#173B66",
    margin: "0 0 8px 0",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "12px"
  },
  titleIcon: {
    fontSize: "32px",
    color: "#173B66"
  },
  subtitle: {
    fontSize: "16px",
    color: "#64748B",
    margin: 0
  },

  // Course Info Card
  courseCard: {
    background: "linear-gradient(135deg, #173B66 0%, #1E40AF 100%)",
    borderRadius: "20px",
    padding: "30px",
    marginBottom: "30px",
    boxShadow: "0 10px 25px rgba(23, 59, 102, 0.15)",
    color: "white"
  },
  courseHeader: {
    display: "flex",
    alignItems: "center",
    gap: "20px"
  },
  courseIcon: {
    width: "60px",
    height: "60px",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: "15px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "24px",
    flexShrink: 0
  },
  courseInfo: {
    flex: 1
  },
  courseName: {
    fontSize: "24px",
    fontWeight: "700",
    margin: "0 0 8px 0"
  },
  courseCode: {
    fontSize: "14px",
    opacity: 0.9,
    margin: "0 0 15px 0"
  },
  courseStats: {
    display: "flex",
    gap: "30px",
    flexWrap: "wrap"
  },
  statItem: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "14px",
    fontWeight: "500"
  },
  statIcon: {
    fontSize: "16px"
  },

  // Search Card
  searchCard: {
    background: "white",
    borderRadius: "20px",
    padding: "30px",
    marginBottom: "30px",
    boxShadow: "0 4px 6px rgba(0, 0, 0, 0.05), 0 10px 15px rgba(0, 0, 0, 0.1)",
    border: "1px solid #E2E8F0"
  },
  searchHeader: {
    marginBottom: "25px"
  },
  sectionTitle: {
    fontSize: "20px",
    fontWeight: "700",
    color: "#173B66",
    margin: "0 0 8px 0",
    display: "flex",
    alignItems: "center",
    gap: "10px"
  },
  sectionIcon: {
    fontSize: "18px"
  },
  sectionSubtitle: {
    fontSize: "14px",
    color: "#64748B",
    margin: 0
  },
  searchContainer: {
    display: "flex",
    gap: "12px",
    alignItems: "center",
    marginBottom: "20px",
    width: "100%",
    flexWrap: "wrap"
  },
  inputGroup: {
    position: "relative",
    flex: 1,
    display: "flex",
    alignItems: "center",
    minWidth: "300px"
  },
  inputIcon: {
    position: "absolute",
    left: "15px",
    top: "50%",
    transform: "translateY(-50%)",
    color: "#64748B",
    fontSize: "16px",
    zIndex: 1,
    pointerEvents: "none"
  },
  searchInput: {
    width: "100%",
    padding: "15px 15px 15px 45px",
    border: "2px solid #E2E8F0",
    borderRadius: "12px",
    fontSize: "16px",
    transition: "all 0.3s ease",
    outline: "none",
    backgroundColor: "#FFFFFF",
    boxSizing: "border-box",
    height: "54px"
  },
  searchBtn: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "15px 25px",
    backgroundColor: "#173B66",
    color: "white",
    border: "none",
    borderRadius: "12px",
    cursor: "pointer",
    fontSize: "16px",
    fontWeight: "600",
    transition: "all 0.3s ease",
    boxShadow: "0 4px 6px rgba(23, 59, 102, 0.25)",
    minWidth: "130px",
    justifyContent: "center",
    height: "54px",
    flexShrink: 0,
    whiteSpace: "nowrap"
  },
  buttonSpinner: {
    animation: "spin 1s linear infinite"
  },

  // Search Result
  searchResult: {
    background: "linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%)",
    border: "2px solid #BBF7D0",
    borderRadius: "15px",
    padding: "25px",
    marginTop: "20px"
  },
  resultHeader: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    marginBottom: "20px"
  },
  successIcon: {
    fontSize: "20px",
    color: "#16A34A"
  },
  resultTitle: {
    fontSize: "18px",
    fontWeight: "700",
    color: "#16A34A"
  },
  resultContent: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "20px",
    flexWrap: "wrap"
  },
  studentInfo: {
    flex: 1,
    minWidth: "300px"
  },
  infoItem: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    marginBottom: "12px"
  },
  infoIcon: {
    fontSize: "16px",
    color: "#16A34A",
    width: "20px"
  },
  infoLabel: {
    fontSize: "14px",
    fontWeight: "600",
    color: "#374151",
    minWidth: "50px"
  },
  infoValue: {
    fontSize: "14px",
    color: "#1F2937"
  },
  resultActions: {
    display: "flex",
    gap: "10px"
  },

  // Buttons
  enrollBtn: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "12px 20px",
    backgroundColor: "#10B981",
    color: "white",
    border: "none",
    borderRadius: "10px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "600",
    transition: "all 0.3s ease",
    boxShadow: "0 4px 6px rgba(16, 185, 129, 0.25)"
  },
  unenrollBtn: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "12px 20px",
    backgroundColor: "#DC2626",
    color: "white",
    border: "none",
    borderRadius: "10px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "600",
    transition: "all 0.3s ease",
    boxShadow: "0 4px 6px rgba(220, 38, 38, 0.25)"
  },

  // Table Card
  tableCard: {
    background: "white",
    borderRadius: "20px",
    padding: "30px",
    boxShadow: "0 4px 6px rgba(0, 0, 0, 0.05), 0 10px 15px rgba(0, 0, 0, 0.1)",
    border: "1px solid #E2E8F0"
  },
  tableHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "25px",
    flexWrap: "wrap",
    gap: "15px"
  },
  enrollmentSummary: {
    display: "flex",
    gap: "10px"
  },
  enrolledBadge: {
    padding: "6px 12px",
    backgroundColor: "#DCFCE7",
    color: "#16A34A",
    borderRadius: "20px",
    fontSize: "12px",
    fontWeight: "600"
  },
  notEnrolledBadge: {
    padding: "6px 12px",
    backgroundColor: "#FEE2E2",
    color: "#DC2626",
    borderRadius: "20px",
    fontSize: "12px",
    fontWeight: "600"
  },

  // Table Styles
  tableContainer: {
    overflowX: "auto",
    borderRadius: "12px",
    border: "1px solid #E2E8F0"
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "14px",
    tableLayout: "fixed"
  },
  tableHeaderRow: {
    backgroundColor: "#F8FAFC"
  },
  tableHeaderCell: {
    padding: "16px 20px",
    textAlign: "left",
    fontWeight: "700",
    color: "#374151",
    borderBottom: "2px solid #E2E8F0",
    fontSize: "14px",
    whiteSpace: "nowrap"
  },
  headerIcon: {
    fontSize: "14px",
    color: "#64748B",
    marginRight: "8px"
  },
  tableRow: {
    transition: "all 0.2s ease"
  },
  tableCell: {
    padding: "16px 20px",
    borderBottom: "1px solid #F1F5F9",
    verticalAlign: "middle",
    wordWrap: "break-word"
  },

  // Table Cell Content
  nameCell: {
    display: "flex",
    alignItems: "center",
    gap: "12px"
  },
  avatar: {
    width: "40px",
    height: "40px",
    borderRadius: "50%",
    backgroundColor: "#173B66",
    color: "white",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "16px",
    fontWeight: "600"
  },
  studentName: {
    fontSize: "14px",
    fontWeight: "600",
    color: "#1F2937"
  },
  emailText: {
    fontSize: "14px",
    color: "#64748B"
  },
  codeText: {
    fontSize: "14px",
    fontWeight: "600",
    color: "#374151",
    backgroundColor: "#F1F5F9",
    padding: "4px 8px",
    borderRadius: "6px"
  },

  // Status Badges
  enrolledStatus: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "6px 12px",
    backgroundColor: "#DCFCE7",
    color: "#16A34A",
    borderRadius: "20px",
    fontSize: "12px",
    fontWeight: "600",
    width: "fit-content"
  },
  notEnrolledStatus: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "6px 12px",
    backgroundColor: "#FEE2E2",
    color: "#DC2626",
    borderRadius: "20px",
    fontSize: "12px",
    fontWeight: "600",
    width: "fit-content"
  },
  statusIcon: {
    fontSize: "12px"
  },

  // Table Action Buttons
  tableEnrollBtn: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "8px 16px",
    backgroundColor: "#173B66",
    color: "white",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "12px",
    fontWeight: "600",
    transition: "all 0.3s ease"
  },
  tableUnenrollBtn: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "8px 16px",
    backgroundColor: "#DC2626",
    color: "white",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "12px",
    fontWeight: "600",
    transition: "all 0.3s ease"
  }
};

// Add CSS animation for spinner
const styleSheet = document.createElement("style");
styleSheet.type = "text/css";
styleSheet.innerText = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  input:focus {
    border-color: #173B66 !important;
    box-shadow: 0 0 0 3px rgba(23, 59, 102, 0.1) !important;
    background-color: #FFFFFF !important;
  }
  
  tr:hover {
    background-color: #F8FAFC !important;
  }
  
  table {
    border-spacing: 0 !important;
  }
  
  th, td {
    text-align: left !important;
    vertical-align: middle !important;
  }
  
  th {
    position: relative !important;
    background-color: #F8FAFC !important;
  }
  
  button:disabled {
    opacity: 0.6 !important;
    cursor: not-allowed !important;
  }
  
  .search-container {
    display: flex !important;
    align-items: center !important;
    gap: 12px !important;
    flex-wrap: wrap !important;
  }
  
  .input-group {
    flex: 1 !important;
    position: relative !important;
    min-width: 300px !important;
  }
  
  @media (max-width: 768px) {
    .search-container {
      flex-direction: column !important;
      align-items: stretch !important;
    }
    
    .input-group {
      min-width: 100% !important;
      margin-bottom: 12px !important;
    }
    
    button {
      width: 100% !important;
    }
  }
`;
document.head.appendChild(styleSheet);