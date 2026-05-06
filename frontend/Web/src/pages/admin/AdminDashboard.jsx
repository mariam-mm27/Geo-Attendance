import { useState, useEffect } from "react";
import { auth, db } from "../../firebase";
import { signOut } from "firebase/auth";
import { collection, getDocs, addDoc, deleteDoc, doc, getDoc, onSnapshot, query, where } from "firebase/firestore";
import { FaUserGraduate, FaChalkboardTeacher, FaSignOutAlt, FaPlus, FaUserShield, FaBell } from "react-icons/fa";
import { useNavigate, useSearchParams } from "react-router-dom";
import UsersTable from "./UsersTable";
import SubjectsTable from "./SubjectsTable";
import AddModal from "./AddModal";
import Modal from "../../components/Modal";
import { useModal } from "../../hooks/useModal";
import AttendanceLogs from "./AttendanceLogs";
import AlertsSection from "./AlertsSection";
import { calculateOverallStudentAttendance } from '../../services/attendanceService';


const AdminDashboard = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tabFromUrl = searchParams.get('tab') || 'professors';
  const [activeTab, setActiveTab] = useState(tabFromUrl);
  const [showModal, setShowModal] = useState(false);
  const [profs, setProfs] = useState([]);
  const [profsWithStats, setProfsWithStats] = useState([]);
  const [students, setStudents] = useState([]);
  const [studentsWithAttendance, setStudentsWithAttendance] = useState([]);
  const [courses, setCourses] = useState([]);
  const [adminInfo, setAdminInfo] = useState({
    name: "Loading...",
    email: auth.currentUser?.email || ""
  });
  const [loading, setLoading] = useState(true);
  const [averageAttendance, setAverageAttendance] = useState(0);
  const [overallStudentAttendance, setOverallStudentAttendance] = useState(0);
  const { modalState, closeModal, showSuccess, showError, showWarning } = useModal();
  const [confirmAction, setConfirmAction] = useState(null);

  useEffect(() => {
    // Aggressive back button prevention
    const preventBack = () => {
      window.history.forward();
    };

    // Push multiple states to make it harder to go back
    window.history.pushState(null, null, window.location.href);
    window.history.pushState(null, null, window.location.href);
    window.history.pushState(null, null, window.location.href);

    window.addEventListener('popstate', preventBack);

    setTimeout(preventBack, 0);

    return () => {
      window.removeEventListener('popstate', preventBack);
    };
  }, []);

  useEffect(() => {
    const fetchAdminInfo = async (user) => {
      try {
        if (user) {
          const userEmail = user.email;

          try {
            const usersSnapshot = await getDocs(collection(db, "users"));
            let foundUser = null;
            let foundDoc = null;

            usersSnapshot.forEach((docSnap) => {
              const userData = docSnap.data();
              const userDocEmail = (userData.Email || userData.email || "").toLowerCase();
              const loginEmail = userEmail.toLowerCase();

              if (userDocEmail === loginEmail) {
                foundUser = userData;
                foundDoc = docSnap;
                console.log("MATCHED! Name:", userData.Name, "Email:", userData.Email);
                console.log("All keys:", Object.keys(userData));
              }
            });

            if (foundUser && foundDoc) {
              const freshData = foundDoc.data();
              let displayName = freshData.Name || freshData.name;

              if (!displayName && userEmail === "mariamhany31017@gmail.com") {
                console.log("Name field missing for mariamhany31017, needs to be added in Firestore");
                displayName = "Mariam Hany Hussien";
              }

              if (!displayName) {
                displayName = userEmail.split('@')[0];
              }

              console.log("Fresh data Name:", freshData.Name);
              console.log("Display name:", displayName);

              setAdminInfo({
                name: displayName,
                email: userEmail
              });
            } else {
              console.log("No match found for:", userEmail, "Trying UID...");
              const adminDoc = await getDoc(doc(db, "users", user.uid));
              if (adminDoc.exists()) {
                const data = adminDoc.data();
                console.log("Found by UID:", data.Name);
                setAdminInfo({
                  name: data.Name || data.name || userEmail.split('@')[0],
                  email: userEmail
                });
              } else {
                console.log("Not found by UID, using email username");
                setAdminInfo({
                  name: userEmail.split('@')[0],
                  email: userEmail
                });
              }
            }
          } catch (firestoreError) {
            console.error("Firestore error:", firestoreError);
            setAdminInfo({
              name: user.displayName || userEmail.split('@')[0],
              email: userEmail
            });
          }
        } else {
          navigate("/login", { replace: true });
        }
      } catch (error) {
        console.error("Error fetching admin info:", error);
      }
    };

    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        fetchAdminInfo(user);
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  useEffect(() => {
    const fetchProfessors = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "professors"));
        const professorsData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setProfs(professorsData);
        
        // Calculate stats for each professor
        const profsWithCalculatedStats = await Promise.all(
          professorsData.map(async (prof) => {
            const stats = await calculateProfessorStats(prof.id, prof.email);
            return {
              ...prof,
              ...stats
            };
          })
        );
        setProfsWithStats(profsWithCalculatedStats);
      } catch (error) {
        console.error("Error fetching professors:", error);
        setProfs([]);
        setProfsWithStats([]);
      } finally {
        setLoading(false);
      }
    };
    fetchProfessors();
  }, []);

  // Function to calculate professor statistics
  const calculateProfessorStats = async (professorId, professorEmail) => {
    try {
      // Get all courses assigned to this professor
      const coursesSnapshot = await getDocs(collection(db, "courses"));
      const professorCourses = [];
      
      coursesSnapshot.docs.forEach(doc => {
        const courseData = doc.data();
        if (courseData.professorId === professorId || 
            courseData.professorEmail === professorEmail) {
          professorCourses.push({
            id: doc.id,
            ...courseData
          });
        }
      });
      
      const numberOfCourses = professorCourses.length;
      
      if (numberOfCourses === 0) {
        return {
          numberOfCourses: 0,
          averageAttendanceRate: "N/A",
          averageAbsentRate: "N/A",
          courseAttendanceRates: []
        };
      }
      
      let totalAttendanceRate = 0;
      let coursesWithData = 0;
      const courseAttendanceRates = [];
      
      // Calculate attendance for each course
      for (const course of professorCourses) {
        const enrolledStudents = course.enrolledStudents || [];
        
        if (enrolledStudents.length === 0) {
          courseAttendanceRates.push({
            courseName: course.name,
            attendanceRate: "N/A"
          });
          continue;
        }
        
        // Get all sessions for this course
        const sessionsSnapshot = await getDocs(
          query(collection(db, "sessions"), where("courseId", "==", course.id))
        );
        const totalSessions = sessionsSnapshot.size;
        
        if (totalSessions === 0) {
          courseAttendanceRates.push({
            courseName: course.name,
            attendanceRate: "N/A"
          });
          continue;
        }
        
        // Get all attendance records for this course
        const attendanceSnapshot = await getDocs(
          query(collection(db, "attendance"), where("courseId", "==", course.id))
        );
        
        const totalPossibleAttendance = enrolledStudents.length * totalSessions;
        const actualAttendance = attendanceSnapshot.size;
        
        const courseAttendanceRate = (actualAttendance / totalPossibleAttendance) * 100;
        
        courseAttendanceRates.push({
          courseName: course.name,
          attendanceRate: `${Math.round(courseAttendanceRate)}%`
        });
        
        totalAttendanceRate += courseAttendanceRate;
        coursesWithData++;
      }
      
      const averageAttendanceRate = coursesWithData > 0 
        ? Math.round(totalAttendanceRate / coursesWithData)
        : 0;
      
      const averageAbsentRate = averageAttendanceRate > 0 
        ? 100 - averageAttendanceRate
        : 0;
      
      return {
        numberOfCourses,
        averageAttendanceRate: `${averageAttendanceRate}%`,
        averageAbsentRate: `${averageAbsentRate}%`,
        courseAttendanceRates
      };
      
    } catch (error) {
      console.error("Error calculating professor stats:", error);
      return {
        numberOfCourses: 0,
        averageAttendanceRate: "Error",
        averageAbsentRate: "Error",
        courseAttendanceRates: []
      };
    }
  };

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const usersSnapshot = await getDocs(collection(db, "users"));
        const studentsData = usersSnapshot.docs
          .map(doc => ({
            id: doc.id,
            uid: doc.data().uid || doc.id,
            ...doc.data()
          }))
          .filter(user => user.role === "student" || user.Role === "student");
        setStudents(studentsData);
        
        // Calculate attendance rates for students
        const studentsWithRates = await Promise.all(
          studentsData.map(async (student) => {
            const result = await calculateOverallStudentAttendance(student.uid);
            const attendanceRate = result.success ? parseFloat(result.data.overallPercentage) : 0;
            return {
              ...student,
              attendanceRate: `${attendanceRate}%`
            };
          })
        );
        setStudentsWithAttendance(studentsWithRates);
        
        // Calculate overall attendance rate for all students
        const validRates = studentsWithRates
          .map(s => parseFloat(s.attendanceRate))
          .filter(rate => !isNaN(rate));
        
        const overallRate = validRates.length > 0 
          ? Math.round(validRates.reduce((sum, rate) => sum + rate, 0) / validRates.length)
          : 0;
        
        setOverallStudentAttendance(overallRate);
      } catch (error) {
        console.error("Error fetching students:", error);
        setStudents([]);
        setStudentsWithAttendance([]);
        setOverallStudentAttendance(0);
      }
    };
    
    fetchStudents();
    
    // Set up listener for real-time updates
    const unsubscribe = onSnapshot(collection(db, "users"), () => {
      fetchStudents();
    });

    return () => unsubscribe();
  }, []);

  // Function to calculate overall attendance rate for a student across all courses
  const calculateStudentOverallAttendance = async (studentId) => {
    try {
      console.log("Calculating attendance for student:", studentId);
      
      // Get all courses where this student is enrolled
      const coursesSnapshot = await getDocs(collection(db, "courses"));
      const enrolledCourses = [];
      
      coursesSnapshot.docs.forEach(doc => {
        const courseData = doc.data();
        const enrolledStudents = courseData.enrolledStudents || [];
        if (enrolledStudents.includes(studentId)) {
          enrolledCourses.push(doc.id);
        }
      });
      
      console.log("Student enrolled in courses:", enrolledCourses);
      
      if (enrolledCourses.length === 0) {
        return "N/A";
      }
      
      let totalAttended = 0;
      let totalSessions = 0;
      
      // For each enrolled course, calculate attendance
      for (const courseId of enrolledCourses) {
        // Get all sessions for this course
        const sessionsSnapshot = await getDocs(
          query(collection(db, "sessions"), where("courseId", "==", courseId))
        );
        
        const courseSessions = sessionsSnapshot.size;
        totalSessions += courseSessions;
        
        // Get attendance records for this student in this course
        const attendanceSnapshot = await getDocs(
          query(
            collection(db, "attendance"), 
            where("studentId", "==", studentId),
            where("courseId", "==", courseId)
          )
        );
        
        const courseAttendance = attendanceSnapshot.size;
        totalAttended += courseAttendance;
        
        console.log(`Course ${courseId}: ${courseAttendance}/${courseSessions} sessions attended`);
      }
      
      console.log(`Total: ${totalAttended}/${totalSessions} sessions`);
      
      if (totalSessions === 0) {
        return "N/A";
      }
      
      const attendanceRate = (totalAttended / totalSessions) * 100;
      return Math.round(attendanceRate);
      
    } catch (error) {
      console.error("Error calculating student attendance:", error);
      return "Error";
    }
  };

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "courses"), (snapshot) => {
      const coursesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setCourses(coursesData);
      
      // Calculate average attendance when courses change
      calculateAverageAttendance(coursesData);
    }, (error) => {
      console.error("Error fetching courses:", error);
      setCourses([]);
    });

    return () => unsubscribe();
  }, []);

  // Function to calculate average attendance across all courses
  const calculateAverageAttendance = async (coursesData) => {
    try {
      if (coursesData.length === 0) {
        setAverageAttendance(0);
        return;
      }

      let totalAttendanceRate = 0;
      let coursesWithData = 0;

      for (const course of coursesData) {
        const enrolledStudents = course.enrolledStudents || [];
        if (enrolledStudents.length === 0) continue;

        // Get all sessions for this course
        const sessionsSnapshot = await getDocs(
          query(collection(db, "sessions"), where("courseId", "==", course.id))
        );
        
        const totalSessions = sessionsSnapshot.size;
        if (totalSessions === 0) continue;

        // Get all attendance records for this course
        const attendanceSnapshot = await getDocs(
          query(collection(db, "attendance"), where("courseId", "==", course.id))
        );
        
        const totalPossibleAttendance = enrolledStudents.length * totalSessions;
        const actualAttendance = attendanceSnapshot.size;
        
        if (totalPossibleAttendance > 0) {
          const courseAttendanceRate = (actualAttendance / totalPossibleAttendance) * 100;
          totalAttendanceRate += courseAttendanceRate;
          coursesWithData++;
        }
      }

      const avgAttendance = coursesWithData > 0 ? totalAttendanceRate / coursesWithData : 0;
      setAverageAttendance(Math.round(avgAttendance));
    } catch (error) {
      console.error("Error calculating average attendance:", error);
      setAverageAttendance(0);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);

      localStorage.clear();
      sessionStorage.clear();

      window.history.replaceState(null, '', '/login');

      navigate("/login", { replace: true });
      window.location.href = "/login";
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const handleAddProfessor = async (newProf) => {
    try {
      const docRef = await addDoc(collection(db, "professors"), newProf);
      setProfs([...profs, { id: docRef.id, ...newProf }]);
    } catch (error) {
      console.error("Error adding professor:", error);
    }
  };

  const handleAddStudent = async (newStudent) => {
    try {
      const docRef = await addDoc(collection(db, "students"), newStudent);
      setStudents([...students, { id: docRef.id, ...newStudent }]);
      showSuccess("Student added successfully!");
    } catch (error) {
      console.error("Error adding student:", error);
      showError("Failed to add student");
    }
  };

  const handleDeleteProfessor = async (id) => {
    try {
      await deleteDoc(doc(db, "professors", id));
      setProfs(profs.filter(prof => prof.id !== id));
      showSuccess("Professor deleted successfully!");
    } catch (error) {
      console.error("Error deleting professor:", error);
      showError("Failed to delete professor");
    }
  };

  const handleDeleteStudent = async (id) => {
    try {
      await deleteDoc(doc(db, "students", id));
      setStudents(students.filter(student => student.id !== id));
      showSuccess("Student deleted successfully!");
    } catch (error) {
      console.error("Error deleting student:", error);
      showError("Failed to delete student");
    }
  };

  const handleAddCourse = async (newCourse) => {
    try {
      const docRef = await addDoc(collection(db, "courses"), newCourse);
      setCourses([...courses, { id: docRef.id, ...newCourse }]);
      showSuccess("Course added successfully!");
    } catch (error) {
      console.error("Error adding course:", error);
      showError("Failed to add course");
    }
  };

  const handleDeleteCourse = async (id) => {
    try {
      await deleteDoc(doc(db, "courses", id));
      setCourses(courses.filter(course => course.id !== id));
      showSuccess("Course deleted successfully!");
    } catch (error) {
      console.error("Error deleting course:", error);
      showError("Failed to delete course");
    }
  };

  const handleConfirmDelete = (id, name, type = 'professor') => {
    const itemType = type === 'course' ? 'course' : type === 'student' ? 'student' : 'professor';
    setConfirmAction({ id, name, type: itemType });

    showWarning(
      `Are you sure you want to delete ${name}?`,
      `Delete ${itemType.charAt(0).toUpperCase() + itemType.slice(1)}`,
      () => {
        if (itemType === 'professor') {
          handleDeleteProfessor(id);
        } else if (itemType === 'student') {
          handleDeleteStudent(id);
        } else if (itemType === 'course') {
          handleDeleteCourse(id);
        }
        setConfirmAction(null);
      }
    );
  };

  if (loading) {
    return <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>Loading...</div>;
  }

  return (
    <div style={{ display: "flex", height: "100vh", background: "#F8FAFC" }}>
      <nav style={styles.sidebar}>
        <div style={styles.adminPanelTitle}>
          <h2 style={{ margin: 0, color: "#173B66", fontSize: "20px", fontWeight: "bold", textAlign: "center" }}>
            Admin Panel
          </h2>
        </div>
        <div style={styles.adminProfile}>
          <FaUserShield size={40} color="#173B66" />
          <h3 style={{ margin: "10px 0 5px", color: "#173B66", fontSize: "18px", fontWeight: "bold" }}>
            {adminInfo.name || auth.currentUser?.email?.split('@')[0] || "Loading..."}
          </h3>
          <p style={{ margin: 0, fontSize: "13px", color: "#64748b", wordBreak: "break-word" }}>
            {adminInfo.email || auth.currentUser?.email || ""}
          </p>
        </div>
        <div onClick={() => setActiveTab("professors")} style={styles.navItem(activeTab === "professors")}>
          <FaChalkboardTeacher style={{ marginRight: "8px" }} /> Professors
        </div>
        <div onClick={() => setActiveTab("students")} style={styles.navItem(activeTab === "students")}>
          <FaUserGraduate style={{ marginRight: "8px" }} /> Students
        </div>
        <div onClick={() => setActiveTab("courses")} style={styles.navItem(activeTab === "courses")}>
          <FaChalkboardTeacher style={{ marginRight: "8px" }} /> Courses
        </div>
        <div onClick={() => setActiveTab("logs")} style={styles.navItem(activeTab === "logs")}>
          📊 Attendance Logs
        </div>
        <div onClick={() => setActiveTab("alerts")} style={styles.navItem(activeTab === "alerts")}>
          <FaBell style={{ marginRight: "8px" }} /> Alerts
        </div>
        <button onClick={handleLogout} style={styles.logoutBtn}>
          <FaSignOutAlt style={{ marginRight: "8px" }} /> Log Out
        </button>
      </nav>

      <main style={{ flex: 1, padding: "40px", overflow: "auto" }}>
        {/* Statistics Cards - Different for each section */}
        {activeTab === "alerts" ? (
          // No statistics for alerts section
          <div></div>
        ) : activeTab === "courses" ? (
          <div style={styles.statsContainer}>
            <div 
              style={styles.statCard}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.05), 0 10px 15px rgba(0, 0, 0, 0.1)';
              }}
            >
              <div style={styles.statIcon}>
                <FaChalkboardTeacher size={24} color="#173B66" />
              </div>
              <div style={styles.statContent}>
                <h3 style={styles.statNumber}>{courses.length}</h3>
                <p style={styles.statLabel}>Total Courses</p>
              </div>
            </div>
            
            <div 
              style={styles.statCard}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.05), 0 10px 15px rgba(0, 0, 0, 0.1)';
              }}
            >
              <div style={styles.statIcon}>
                <FaUserGraduate size={24} color="#173B66" />
              </div>
              <div style={styles.statContent}>
                <h3 style={styles.statNumber}>
                  {courses.reduce((total, course) => total + (course.enrolledStudents?.length || 0), 0)}
                </h3>
                <p style={styles.statLabel}>Students in Courses</p>
              </div>
            </div>
            
            <div 
              style={styles.statCard}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.05), 0 10px 15px rgba(0, 0, 0, 0.1)';
              }}
            >
              <div style={styles.statIcon}>
                <FaBell size={24} color="#173B66" />
              </div>
              <div style={styles.statContent}>
                <h3 style={styles.statNumber}>{averageAttendance}%</h3>
                <p style={styles.statLabel}>Average Attendance</p>
              </div>
            </div>
          </div>
        ) : activeTab === "students" ? (
          <div style={styles.statsContainer}>
            <div 
              style={styles.statCard}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.05), 0 10px 15px rgba(0, 0, 0, 0.1)';
              }}
            >
              <div style={styles.statIcon}>
                <FaUserGraduate size={24} color="#173B66" />
              </div>
              <div style={styles.statContent}>
                <h3 style={styles.statNumber}>{students.length}</h3>
                <p style={styles.statLabel}>Total Students</p>
              </div>
            </div>
            
            <div 
              style={styles.statCard}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.05), 0 10px 15px rgba(0, 0, 0, 0.1)';
              }}
            >
              <div style={styles.statIcon}>
                <FaBell size={24} color="#173B66" />
              </div>
              <div style={styles.statContent}>
                <h3 style={styles.statNumber}>{overallStudentAttendance}%</h3>
                <p style={styles.statLabel}>Overall Attendance Rate</p>
              </div>
            </div>
            
            <div 
              style={styles.statCard}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.05), 0 10px 15px rgba(0, 0, 0, 0.1)';
              }}
            >
              <div style={styles.statIcon}>
                <FaChalkboardTeacher size={24} color="#173B66" />
              </div>
              <div style={styles.statContent}>
                <h3 style={styles.statNumber}>{courses.length}</h3>
                <p style={styles.statLabel}>Courses</p>
              </div>
            </div>
          </div>
        ) : activeTab === "professors" ? (
          <div style={styles.statsContainer}>
            <div 
              style={styles.statCard}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.05), 0 10px 15px rgba(0, 0, 0, 0.1)';
              }}
            >
              <div style={styles.statIcon}>
                <FaChalkboardTeacher size={24} color="#173B66" />
              </div>
              <div style={styles.statContent}>
                <h3 style={styles.statNumber}>{profs.length}</h3>
                <p style={styles.statLabel}>Professors</p>
              </div>
            </div>
            
            <div 
              style={styles.statCard}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.05), 0 10px 15px rgba(0, 0, 0, 0.1)';
              }}
            >
              <div style={styles.statIcon}>
                <FaUserGraduate size={24} color="#173B66" />
              </div>
              <div style={styles.statContent}>
                <h3 style={styles.statNumber}>{students.length}</h3>
                <p style={styles.statLabel}>Students</p>
              </div>
            </div>
            
            <div 
              style={styles.statCard}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.05), 0 10px 15px rgba(0, 0, 0, 0.1)';
              }}
            >
              <div style={styles.statIcon}>
                <FaChalkboardTeacher size={24} color="#173B66" />
              </div>
              <div style={styles.statContent}>
                <h3 style={styles.statNumber}>{courses.length}</h3>
                <p style={styles.statLabel}>Courses</p>
              </div>
            </div>
          </div>
        ) : (
          <div style={styles.statsContainer}>
            <div 
              style={styles.statCard}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.05), 0 10px 15px rgba(0, 0, 0, 0.1)';
              }}
            >
              <div style={styles.statIcon}>
                <FaChalkboardTeacher size={24} color="#173B66" />
              </div>
              <div style={styles.statContent}>
                <h3 style={styles.statNumber}>{profs.length}</h3>
                <p style={styles.statLabel}>Professors</p>
              </div>
            </div>
            
            <div 
              style={styles.statCard}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.05), 0 10px 15px rgba(0, 0, 0, 0.1)';
              }}
            >
              <div style={styles.statIcon}>
                <FaUserGraduate size={24} color="#173B66" />
              </div>
              <div style={styles.statContent}>
                <h3 style={styles.statNumber}>{students.length}</h3>
                <p style={styles.statLabel}>Students</p>
              </div>
            </div>
            
            <div 
              style={styles.statCard}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.05), 0 10px 15px rgba(0, 0, 0, 0.1)';
              }}
            >
              <div style={styles.statIcon}>
                <FaChalkboardTeacher size={24} color="#173B66" />
              </div>
              <div style={styles.statContent}>
                <h3 style={styles.statNumber}>{courses.length}</h3>
                <p style={styles.statLabel}>Courses</p>
              </div>
            </div>
          </div>
        )}

        <div style={styles.header}>
          <h1 style={{ color: "#173B66", margin: 0, fontSize: "28px" }}>
            {activeTab === "alerts"
              ? "Student Alerts"
              : activeTab === "logs"
                ? "Attendance Logs"
                : `Manage ${activeTab === "professors"
                  ? "Professors"
                  : activeTab === "students"
                    ? "Students"
                    : "Courses"
                }`}
          </h1>
          
          {/* Add Button */}
          {(activeTab === "professors" || activeTab === "students" || activeTab === "courses") && (
            <button 
              onClick={() => setShowModal(true)} 
              style={styles.addBtn}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#0F2744'}
              onMouseLeave={(e) => e.target.style.backgroundColor = '#173B66'}
            >
              <FaPlus style={{ marginRight: "8px" }} />
              Add {activeTab === "professors" ? "Professor" : activeTab === "students" ? "Student" : "Course"}
            </button>
          )}
        </div>

        {activeTab === "alerts" ? (
          <AlertsSection courses={courses} students={students} showSuccess={showSuccess} showError={showError} />
        ) : activeTab === "logs" ? (
          <AttendanceLogs allCourses={courses} />
        ) : activeTab === "professors" ? (
          <UsersTable
            data={profsWithStats}
            onDelete={handleDeleteProfessor}
            allCourses={courses}
            onConfirmDelete={(id, name) => handleConfirmDelete(id, name, 'professor')}
            type="professors"
          />
        ) : activeTab === "students" ? (
          <UsersTable
            data={studentsWithAttendance}
            onDelete={handleDeleteStudent}
            allCourses={courses}
            onConfirmDelete={(id, name) => handleConfirmDelete(id, name, 'student')}
            type="students"
          />
        ) : (
          <UsersTable
            data={courses}
            onDelete={handleDeleteCourse}
            type="courses"
            onConfirmDelete={(id, name) => handleConfirmDelete(id, name, 'course')}
          />
        )}
      </main>
      {showModal && (
        <AddModal
          type={activeTab}
          onClose={() => setShowModal(false)}
          onAdd={(newItem) => {
            if (activeTab === "professors") {
              handleAddProfessor(newItem);
            } else if (activeTab === "students") {
              handleAddStudent(newItem);
            } else {
              handleAddCourse(newItem);
            }
            setShowModal(false);
          }}
          professors={profs}
          onShowWarning={(message) => showWarning(message)}
        />
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
  sidebar: { width: "260px", background: "#fff", borderRight: "1px solid #e2e8f0", padding: "20px", display: "flex", flexDirection: "column" },
  adminPanelTitle: {
    textAlign: "center",
    marginBottom: "20px",
    paddingBottom: "15px",
    borderBottom: "2px solid #173B66"
  },
  adminProfile: { textAlign: "center", marginBottom: "30px", paddingBottom: "20px", borderBottom: "1px solid #e2e8f0" },
  navItem: (active) => ({
    padding: "12px",
    cursor: "pointer",
    background: active ? "#F1F5F9" : "transparent",
    color: "#173B66",
    fontWeight: "bold",
    borderRadius: "8px",
    marginBottom: "5px",
    display: "flex",
    alignItems: "center",
    transition: "background 0.2s"
  }),
  
  // Statistics Cards
  statsContainer: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "20px",
    marginBottom: "30px"
  },
  statCard: {
    background: "white",
    padding: "25px",
    borderRadius: "15px",
    boxShadow: "0 4px 6px rgba(0, 0, 0, 0.05), 0 10px 15px rgba(0, 0, 0, 0.1)",
    border: "1px solid #E2E8F0",
    display: "flex",
    alignItems: "center",
    gap: "20px",
    transition: "transform 0.2s ease, box-shadow 0.2s ease"
  },
  statIcon: {
    width: "60px",
    height: "60px",
    backgroundColor: "#F0F9FF",
    borderRadius: "12px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0
  },
  statContent: {
    flex: 1
  },
  statNumber: {
    fontSize: "32px",
    fontWeight: "700",
    color: "#173B66",
    margin: "0 0 5px 0"
  },
  statLabel: {
    fontSize: "14px",
    color: "#64748B",
    margin: 0,
    fontWeight: "500"
  },
  
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" },
  addBtn: {
    background: "#173B66",
    color: "white",
    padding: "12px 20px",
    border: "none",
    borderRadius: "10px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    fontSize: "14px",
    fontWeight: "600",
    transition: "all 0.3s ease",
    boxShadow: "0 4px 6px rgba(23, 59, 102, 0.25)"
  },
  logoutBtn: {
    marginTop: "auto",
    background: "#173B66",
    color: "white",
    padding: "12px",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "bold"
  },
  card: { background: "white", padding: "20px", borderRadius: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }
};
export default AdminDashboard;