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

  // New state for comprehensive monitoring
  const [systemActivity, setSystemActivity] = useState([]);
  const [allNotifications, setAllNotifications] = useState([]);

  // Search states
  const [systemActivitySearch, setSystemActivitySearch] = useState("");

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

  // Fetch all notifications for admin monitoring
  useEffect(() => {
    const fetchAllNotifications = async () => {
      try {
        const notificationsSnapshot = await getDocs(collection(db, "notifications"));
        const notifications = [];

        for (const notifDoc of notificationsSnapshot.docs) {
          const notifData = notifDoc.data();

          // Get user info
          const userDoc = await getDoc(doc(db, "users", notifData.userId));
          const userData = userDoc.exists() ? userDoc.data() : {};

          notifications.push({
            id: notifDoc.id,
            userName: userData.name || userData.Name || "Unknown User",
            userEmail: userData.email || userData.Email || "Unknown",
            userRole: userData.role || userData.Role || "Unknown",
            ...notifData
          });
        }

        // Sort by creation date (newest first)
        notifications.sort((a, b) => {
          const dateA = a.createdAt?.toDate?.() || a.createdAt || new Date(0);
          const dateB = b.createdAt?.toDate?.() || b.createdAt || new Date(0);
          return dateB - dateA;
        });

        setAllNotifications(notifications.slice(0, 200)); // Last 200 notifications
      } catch (error) {
        console.error("Error fetching notifications:", error);
      }
    };

    fetchAllNotifications();
  }, []);

  // Fetch comprehensive system activity (all activities in one place)
  useEffect(() => {
    const fetchSystemActivity = async () => {
      try {
        console.log("Fetching system activity...");
        const activities = [];

        // Get recent registrations
        console.log("Fetching registrations...");
        const usersSnapshot = await getDocs(collection(db, "users"));
        let registrationCount = 0;
        usersSnapshot.forEach((doc) => {
          const userData = doc.data();
          // Include all users, not just those with createdAt
          registrationCount++;
          activities.push({
            id: `reg-${doc.id}`,
            type: "registration",
            action: "User Registration",
            userName: userData.name || userData.Name || "Unknown",
            userEmail: userData.email || userData.Email || "Unknown",
            userRole: userData.role || userData.Role || "Unknown",
            timestamp: userData.createdAt?.toDate?.() || userData.registeredAt?.toDate?.() || new Date(2024, 0, 1), // Default date if no timestamp
            details: `${userData.name || userData.Name || "User"} registered as ${userData.role || userData.Role || "user"}`,
            searchText: `${userData.name || userData.Name || ""} ${userData.email || userData.Email || ""} ${userData.role || userData.Role || ""} registration`
          });
        });
        console.log("Registrations found:", registrationCount);

        // Get recent enrollments
        console.log("Fetching enrollments...");
        const enrollmentsSnapshot = await getDocs(collection(db, "enrollments"));
        let enrollmentCount = 0;
        for (const enrollDoc of enrollmentsSnapshot.docs) {
          const enrollData = enrollDoc.data();
          enrollmentCount++;

          // Get student and course info
          let studentData = {};
          let courseData = {};

          try {
            if (enrollData?.studentId) {
              const studentDoc = await getDoc(
                doc(db, "users", enrollData.studentId)
              );

              studentData = studentDoc.exists()
                ? studentDoc.data()
                : {};
            } else {
              console.log("Missing studentId in enrollment");
            }
          } catch (e) {
            console.log(
              "Could not fetch student data for enrollment:",
              enrollData?.studentId
            );
          }

          try {
            if (enrollData?.courseId) {
              const courseDoc = await getDoc(
                doc(db, "courses", enrollData.courseId)
              );

              courseData = courseDoc.exists()
                ? courseDoc.data()
                : {};
            } else {
              console.log("Missing courseId in enrollment");
            }
          } catch (e) {
            console.log(
              "Could not fetch course data for enrollment:",
              enrollData?.courseId
            );
          }

          activities.push({
            id: `enroll-${enrollDoc.id}`,
            type: "enrollment",
            action: "Course Enrollment",
            studentName: studentData.name || studentData.Name || "Unknown Student",
            studentEmail: studentData.email || studentData.Email || "Unknown",
            courseName: courseData.name || "Unknown Course",
            courseCode: courseData.code || "Unknown",
            timestamp: enrollData.enrolledAt?.toDate?.() || enrollData.enrolledAt || new Date(2024, 0, 1),
            details: `${studentData.name || studentData.Name || "Student"} enrolled in ${courseData.name || "course"}`,
            searchText: `${studentData.name || studentData.Name || ""} ${studentData.email || studentData.Email || ""} ${courseData.name || ""} ${courseData.code || ""} enrollment`
          });
        }
        console.log("Enrollments found:", enrollmentCount);

        // Get recent attendance records
        console.log("Fetching attendance records...");
        const attendanceSnapshot = await getDocs(collection(db, "attendance"));
        let attendanceCount = 0;
        for (const attendDoc of attendanceSnapshot.docs) {
          const attendData = attendDoc.data();
          attendanceCount++;

          // Get student and course info
          let studentData = {};
          let courseData = {};

          try {
            const studentDoc = await getDoc(doc(db, "users", attendData.studentId));
            studentData = studentDoc.exists() ? studentDoc.data() : {};
          } catch (e) {
            console.log("Could not fetch student data for attendance:", attendData.studentId);
          }

          try {
            const courseDoc = await getDoc(doc(db, "courses", attendData.courseId));
            courseData = courseDoc.exists() ? courseDoc.data() : {};
          } catch (e) {
            console.log("Could not fetch course data for attendance:", attendData.courseId);
          }

          activities.push({
            id: `attend-${attendDoc.id}`,
            type: "attendance",
            action: "Attendance Recorded",
            studentName: studentData.name || studentData.Name || "Unknown",
            studentEmail: studentData.email || studentData.Email || "",
            courseName: courseData.name || "Unknown Course",
            courseCode: courseData.code || "N/A",
            sessionId: attendData.sessionId,
            timestamp: attendData.recordedAt?.toDate?.() || attendData.recordedAt || new Date(2024, 0, 1),
            details: `${studentData.name || studentData.Name || "Student"} attended ${courseData.name || "course"}`,
            searchText: `${studentData.name || studentData.Name || ""} ${studentData.email || studentData.Email || ""} ${courseData.name || ""} ${courseData.code || ""} ${attendData.sessionId || ""} attendance`
          });
        }
        console.log("Attendance records found:", attendanceCount);

        // Get recent sessions (both active and inactive)
        console.log("Fetching sessions...");
        const sessionsSnapshot = await getDocs(collection(db, "sessions"));
        let sessionCount = 0;
        for (const sessionDoc of sessionsSnapshot.docs) {
          const sessionData = sessionDoc.data();
          if(!sessionData)
            continue;
          sessionCount++;

          let courseData = {};
          try {
            const courseDoc = await getDoc(doc(db, "courses", sessionData.courseId));
            courseData = courseDoc.exists() ? courseDoc.data() : {};
          } catch (e) {
            console.log("Could not fetch course data for session:", sessionData.courseId);
          }

          // Get professor info
          let professorName = "Unknown Professor";
          if (sessionData.professorId) {
            try {
              const professorDoc = await getDoc(doc(db, "users", sessionData.professorId));
              if (professorDoc.exists()) {
                const professorData = professorDoc.data();
                professorName = professorData.name || professorData.Name || "Unknown Professor";
              }
            } catch (e) {
              console.log("Could not fetch professor data for session:", sessionData.professorId);
            }
          }

          // Check if session is currently active
          const now = new Date();
          const createdAt = sessionData.createdAt?.toDate?.() || sessionData.createdAt || new Date(2024, 0, 1);
          const duration = sessionData.duration || 10;
          const expiresAt = new Date(createdAt.getTime() + duration * 60 * 1000);
          const isCurrentlyActive = sessionData.active && now <= expiresAt;

          // Get attendance count for this session
          let attendanceCount = 0;

          try {

            if (!sessionData?.sessionId) {
              console.log("Missing sessionId");
            } else {

              const sessionAttendanceSnapshot = await getDocs(
                query(
                  collection(db, "attendance"),
                  where("sessionId", "==", sessionData.sessionId)
                )
              );

              attendanceCount = sessionAttendanceSnapshot.size;
            }

          } catch (e) {

            console.log(
              "Could not fetch attendance count for session:",
              sessionData?.sessionId
            );

          }

          activities.push({
            id: `session-${sessionDoc.id}`,
            type: isCurrentlyActive ? "active-session" : "session",
            action: isCurrentlyActive ? "Active Session" : "Session Created",
            courseName: courseData.name || "Unknown Course",
            courseCode: courseData.code || "N/A",
            professorName: professorName,
            sessionId: sessionData.sessionId,
            lectureNumber: sessionData.lectureNumber || "N/A",
            duration: duration,
            active: isCurrentlyActive,
            attendanceCount: attendanceCount,
            enrolledStudents: courseData.enrolledStudents?.length || 0,
            timeRemaining: isCurrentlyActive ? Math.max(0, Math.floor((expiresAt - now) / (1000 * 60))) : 0,
            timestamp: createdAt,
            details: isCurrentlyActive
              ? `Active session for ${courseData.name || "course"} by ${professorName} (${Math.max(0, Math.floor((expiresAt - now) / (1000 * 60)))}min left)`
              : `Session ${sessionData.lectureNumber || "N/A"} created for ${courseData.name || "course"} by ${professorName}`,
            searchText: `${courseData.name || ""} ${courseData.code || ""} ${professorName} ${sessionData.sessionId || ""} ${sessionData.lectureNumber || ""} session`
          });
        }
        console.log("Sessions found:", sessionCount);

        // Sort by timestamp (newest first)
        activities.sort((a, b) => b.timestamp - a.timestamp);
        console.log("Total activities:", activities.length);
        console.log("Activities sample:", activities.slice(0, 3));

        setSystemActivity(activities);
      } catch (error) {
        console.error("Error fetching system activity:", error);
        setSystemActivity([]); // Set empty array on error
      }
    };

    fetchSystemActivity();

    // Refresh every 30 seconds to keep active sessions updated
    const interval = setInterval(fetchSystemActivity, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchProfessors = async () => {
      try {
        // Fetch from both professors collection and users collection with professor role
        const professorsData = [];

        // Get from professors collection
        console.log("Fetching from professors collection...");
        const professorsSnapshot = await getDocs(collection(db, "professors"));
        console.log("Professors collection size:", professorsSnapshot.size);
        professorsSnapshot.docs.forEach(doc => {
          const profData = doc.data();
          console.log("Professor from collection:", profData.name || profData.Name, profData.email || profData.Email);
          professorsData.push({
            id: doc.id,
            source: "professors",
            ...profData
          });
        });


        // Get from users collection with professor role
        const usersSnapshot = await getDocs(collection(db, "users"));
        console.log("Checking users collection for professors...");
        usersSnapshot.docs.forEach(doc => {
          const userData = doc.data();
          const userRole = (userData.role || userData.Role || "").toLowerCase();
          const userName = userData.name || userData.Name || "Unknown";
          const userEmail = userData.email || userData.Email || "Unknown";

          console.log("Checking user:", userName, "Role:", userRole, "Email:", userEmail);

          if (userRole === "professor" || userRole === "prof") {
            console.log("Found professor in users:", userName, userEmail);

            // Check if this professor is not already in the professors collection
            const existingProf = professorsData.find(p => {
              const pEmail = (p.email || p.Email || "").toLowerCase();
              const uEmail = userEmail.toLowerCase();
              return pEmail === uEmail;
            });

            if (!existingProf) {
              console.log("Adding professor from users collection:", userName);
              professorsData.push({
                id: doc.id,
                uid: userData.uid || doc.id,
                source: "users",
                name: userName,
                email: userEmail,
                // Map user fields to professor fields for consistency
                Name: userName,
                Email: userEmail,
                ...userData
              });
            } else {
              console.log("Professor already exists in professors collection:", userName);
            }
          }
        });

        console.log("Total professors found:", professorsData.length);
        console.log("Professors data:", professorsData.map(p => ({ name: p.name || p.Name, email: p.email || p.Email, source: p.source })));

        setProfs(professorsData);

        // Calculate stats for each professor
        const profsWithCalculatedStats = await Promise.all(
          professorsData.map(async (prof) => {
            // Use appropriate ID and email based on source
            const profId = prof.source === "users" ? prof.uid || prof.id : prof.id;
            const profEmail = prof.email || prof.Email;
            const stats = await calculateProfessorStats(profId, profEmail);
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
      // Get all courses assigned to this professor using the same logic as professor profile
      const coursesSnapshot = await getDocs(collection(db, "courses"));
      const professorCourses = [];

      coursesSnapshot.docs.forEach(doc => {
        const courseData = doc.data();
        const courseProfEmail = courseData.professorEmail?.toLowerCase();
        const userEmail = professorEmail?.toLowerCase();

        // Use the same matching logic as professor profile
        if (courseData.professorId === professorId ||
          courseProfEmail === userEmail ||
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
    const prof = profs.find(p => p.id === id);
    
    if (prof?.source === "users") {
      // امسحه من users collection
      await deleteDoc(doc(db, "users", id));
    } else {
      // امسحه من professors collection
      await deleteDoc(doc(db, "professors", id));
    }
    
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
        <div onClick={() => setActiveTab("system-activity")} style={styles.navItem(activeTab === "system-activity")}>
          🔍 System Activity
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
              ? "Student Alerts & Notifications"
              : activeTab === "logs"
                ? "Attendance Logs"
                : activeTab === "system-activity"
                  ? "System Activity Monitor"
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
          <AlertsSection
            courses={courses}
            students={students}
            showSuccess={showSuccess}
            showError={showError}
            allNotifications={allNotifications}
          />
        ) : activeTab === "logs" ? (
          <AttendanceLogs allCourses={courses} />
        ) : activeTab === "system-activity" ? (
          <div style={styles.monitoringContainer}>
            <div style={styles.monitoringHeader}>
              <h3 style={styles.monitoringTitle}>System Activity Monitor</h3>
              <span style={styles.monitoringCount}>{systemActivity.length} recent activities</span>
            </div>

            {/* Activity Type Tabs */}
            <div style={styles.activityTabs}>
              <button
                style={styles.activityTab(systemActivitySearch === "")}
                className="activity-tab"
                onClick={() => setSystemActivitySearch("")}
              >
                All Activities ({systemActivity.length})
              </button>
              <button
                style={styles.activityTab(systemActivitySearch === "active-session")}
                className="activity-tab"
                onClick={() => setSystemActivitySearch("active-session")}
              >
                Active Sessions ({systemActivity.filter(a => a.type === "active-session").length})
              </button>
              <button
                style={styles.activityTab(systemActivitySearch === "session")}
                className="activity-tab"
                onClick={() => setSystemActivitySearch("session")}
              >
                Sessions ({systemActivity.filter(a => a.type === "session").length})
              </button>
              <button
                style={styles.activityTab(systemActivitySearch === "attendance")}
                className="activity-tab"
                onClick={() => setSystemActivitySearch("attendance")}
              >
                Attendance ({systemActivity.filter(a => a.type === "attendance").length})
              </button>
              <button
                style={styles.activityTab(systemActivitySearch === "enrollment")}
                className="activity-tab"
                onClick={() => setSystemActivitySearch("enrollment")}
              >
                Enrollments ({systemActivity.filter(a => a.type === "enrollment").length})
              </button>
              <button
                style={styles.activityTab(systemActivitySearch === "registration")}
                className="activity-tab"
                onClick={() => setSystemActivitySearch("registration")}
              >
                Registrations ({systemActivity.filter(a => a.type === "registration").length})
              </button>
            </div>

            {/* Search Field */}
            <div style={styles.searchContainer}>
              <input
                type="text"
                placeholder="Search all activities by student, course, professor, session ID, or user..."
                value={["active-session", "session", "attendance", "enrollment", "registration"].includes(systemActivitySearch) ? "" : systemActivitySearch}
                onChange={(e) => setSystemActivitySearch(e.target.value)}
                style={styles.searchInput}
                className="search-input"
                disabled={["active-session", "session", "attendance", "enrollment", "registration"].includes(systemActivitySearch)}
              />
            </div>

            <div style={styles.activityFeed}>
              {systemActivity
                .filter(activity => {
                  // Filter by type if specific type is selected
                  if (["active-session", "session", "attendance", "enrollment", "registration"].includes(systemActivitySearch)) {
                    return activity.type === systemActivitySearch;
                  }

                  // Filter by search text if searching
                  if (systemActivitySearch && !["active-session", "session", "attendance", "enrollment", "registration"].includes(systemActivitySearch)) {
                    return activity.searchText.toLowerCase().includes(systemActivitySearch.toLowerCase());
                  }

                  return true;
                })
                .map((activity) => (
                  <div key={activity.id} style={styles.activityItem} className="activity-item">
                    <div style={styles.activityIcon(activity.type)}>
                      {activity.type === "attendance" ? "✅" :
                        activity.type === "session" ? "📚" :
                          activity.type === "active-session" ? "🔴" :
                            activity.type === "enrollment" ? "📝" :
                              activity.type === "registration" ? "👤" : "🔔"}
                    </div>
                    <div style={styles.activityContent}>
                      <div style={styles.activityTitle}>
                        {activity.action}
                        {activity.type === "active-session" && (
                          <span style={styles.activeIndicator}>
                            • {activity.timeRemaining}min left
                          </span>
                        )}
                      </div>
                      <div style={styles.activityDetails}>{activity.details}</div>
                      {activity.type === "active-session" && (
                        <div style={styles.sessionStats}>
                          <span style={styles.statBadge}>
                            {activity.attendanceCount}/{activity.enrolledStudents} Present
                          </span>
                          <span style={styles.statBadge}>
                            {activity.enrolledStudents > 0 ? Math.round((activity.attendanceCount / activity.enrolledStudents) * 100) : 0}% Rate
                          </span>
                        </div>
                      )}
                      <div style={styles.activityTime}>
                        {activity.timestamp.toLocaleDateString()} at {activity.timestamp.toLocaleTimeString()}
                      </div>
                    </div>
                    <div style={styles.activityType}>
                      <span style={styles.typeBadge(activity.type)}>
                        {activity.type === "active-session" ? "Active" :
                          activity.type === "session" ? "Session" :
                            activity.type === "attendance" ? "Attendance" :
                              activity.type === "enrollment" ? "Enrollment" :
                                activity.type === "registration" ? "Registration" : activity.type}
                      </span>
                    </div>
                  </div>
                ))}
              {systemActivity
                .filter(activity => {
                  if (["active-session", "session", "attendance", "enrollment", "registration"].includes(systemActivitySearch)) {
                    return activity.type === systemActivitySearch;
                  }
                  if (systemActivitySearch && !["active-session", "session", "attendance", "enrollment", "registration"].includes(systemActivitySearch)) {
                    return activity.searchText.toLowerCase().includes(systemActivitySearch.toLowerCase());
                  }
                  return true;
                }).length === 0 && (
                  <div style={styles.emptyState}>
                    <div style={styles.emptyIcon}>🔍</div>
                    <div style={styles.emptyTitle}>No activities found</div>
                    <div style={styles.emptyText}>
                      {systemActivitySearch && !["active-session", "session", "attendance", "enrollment", "registration"].includes(systemActivitySearch)
                        ? "Try adjusting your search terms"
                        : "No activities of this type yet"}
                    </div>
                  </div>
                )}
            </div>
          </div>
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
  card: { background: "white", padding: "20px", borderRadius: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" },

  // New monitoring styles
  monitoringContainer: {
    background: "white",
    borderRadius: "15px",
    boxShadow: "0 4px 6px rgba(0, 0, 0, 0.05), 0 10px 15px rgba(0, 0, 0, 0.1)",
    overflow: "hidden"
  },
  monitoringHeader: {
    padding: "24px 30px",
    borderBottom: "1px solid #E2E8F0",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    background: "#F8FAFC"
  },
  monitoringTitle: {
    fontSize: "20px",
    fontWeight: "700",
    color: "#173B66",
    margin: 0
  },
  monitoringCount: {
    fontSize: "14px",
    color: "#64748B",
    fontWeight: "500"
  },
  monitoringTable: {
    overflowX: "auto"
  },
  table: {
    width: "100%",
    borderCollapse: "collapse"
  },
  tableHeaderRow: {
    backgroundColor: "#F8FAFC"
  },
  tableHeaderCell: {
    padding: "16px 24px",
    textAlign: "left",
    fontWeight: "600",
    color: "#374151",
    fontSize: "14px",
    borderBottom: "1px solid #E2E8F0"
  },
  tableRow: {
    borderBottom: "1px solid #F1F5F9",
    transition: "background-color 0.2s ease"
  },
  tableCell: {
    padding: "16px 24px",
    verticalAlign: "middle"
  },
  userInfo: {
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
    fontWeight: "600",
    flexShrink: 0
  },
  subText: {
    fontSize: "12px",
    color: "#64748B",
    marginTop: "2px"
  },
  roleBadge: (role) => ({
    padding: "4px 8px",
    borderRadius: "12px",
    fontSize: "12px",
    fontWeight: "600",
    backgroundColor: role === "student" ? "#DCFCE7" : role === "professor" ? "#FEF3C7" : "#F3F4F6",
    color: role === "student" ? "#16A34A" : role === "professor" ? "#D97706" : "#374151"
  }),
  statusBadge: {
    padding: "4px 8px",
    borderRadius: "12px",
    fontSize: "12px",
    fontWeight: "600",
    backgroundColor: "#DCFCE7",
    color: "#16A34A"
  },
  courseBadge: {
    padding: "4px 8px",
    borderRadius: "12px",
    fontSize: "12px",
    fontWeight: "600",
    backgroundColor: "#EEF2FF",
    color: "#3730A3"
  },

  // Activity feed styles
  activityFeed: {
    maxHeight: "600px",
    overflowY: "auto",
    padding: "0 24px 24px"
  },
  activityItem: {
    display: "flex",
    alignItems: "flex-start",
    gap: "16px",
    padding: "16px",
    borderBottom: "1px solid #F1F5F9",
    transition: "background-color 0.2s ease"
  },
  activityIcon: (type) => ({
    width: "40px",
    height: "40px",
    borderRadius: "50%",
    backgroundColor: type === "attendance" ? "#DCFCE7" :
      type === "session" ? "#FEF3C7" :
        type === "active-session" ? "#FEE2E2" :
          type === "enrollment" ? "#EEF2FF" :
            type === "registration" ? "#F0FDF4" : "#F3F4F6",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "18px",
    flexShrink: 0
  }),
  activityContent: {
    flex: 1
  },
  activityTitle: {
    fontSize: "16px",
    fontWeight: "600",
    color: "#173B66",
    marginBottom: "4px"
  },
  activityDetails: {
    fontSize: "14px",
    color: "#64748B",
    marginBottom: "8px"
  },
  activityTime: {
    fontSize: "12px",
    color: "#94A3B8"
  },
  activityType: {
    flexShrink: 0
  },
  typeBadge: (type) => ({
    padding: "4px 8px",
    borderRadius: "12px",
    fontSize: "12px",
    fontWeight: "600",
    backgroundColor: type === "attendance" ? "#DCFCE7" :
      type === "session" ? "#FEF3C7" :
        type === "active-session" ? "#FEE2E2" :
          type === "enrollment" ? "#EEF2FF" :
            type === "registration" ? "#F0FDF4" : "#F3F4F6",
    color: type === "attendance" ? "#16A34A" :
      type === "session" ? "#D97706" :
        type === "active-session" ? "#DC2626" :
          type === "enrollment" ? "#3730A3" :
            type === "registration" ? "#15803D" : "#374151"
  }),

  // Activity tabs styles
  activityTabs: {
    display: "flex",
    borderBottom: "1px solid #E2E8F0",
    padding: "0 24px"
  },
  activityTab: (active) => ({
    padding: "12px 16px",
    border: "none",
    background: "transparent",
    color: active ? "#173B66" : "#64748B",
    fontWeight: active ? "600" : "500",
    fontSize: "14px",
    cursor: "pointer",
    borderBottom: active ? "2px solid #173B66" : "2px solid transparent",
    transition: "all 0.2s ease"
  }),

  // Search container styles
  searchContainer: {
    padding: "16px 24px",
    borderBottom: "1px solid #F1F5F9"
  },
  searchInput: {
    width: "100%",
    padding: "12px 16px",
    border: "1px solid #E2E8F0",
    borderRadius: "8px",
    fontSize: "14px",
    outline: "none",
    transition: "border-color 0.2s ease"
  },

  // Empty state styles
  emptyState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "60px 20px",
    textAlign: "center"
  },
  emptyIcon: {
    fontSize: "48px",
    marginBottom: "16px",
    opacity: 0.5
  },
  emptyTitle: {
    fontSize: "18px",
    fontWeight: "600",
    color: "#374151",
    marginBottom: "8px"
  },
  emptyText: {
    fontSize: "14px",
    color: "#64748B"
  },

  // Active session specific styles
  activeIndicator: {
    color: "#DC2626",
    fontSize: "14px",
    fontWeight: "600",
    marginLeft: "8px"
  },
  sessionStats: {
    display: "flex",
    gap: "8px",
    marginTop: "8px",
    marginBottom: "4px"
  },
  statBadge: {
    padding: "2px 6px",
    borderRadius: "8px",
    fontSize: "11px",
    fontWeight: "600",
    backgroundColor: "#F1F5F9",
    color: "#64748B"
  }
};

// Add CSS for hover effects
const styleSheet = document.createElement("style");
styleSheet.type = "text/css";
styleSheet.innerText = `
  tr:hover {
    background-color: #F8FAFC !important;
  }
  
  .activity-item:hover {
    background-color: #F8FAFC !important;
  }
  
  .active-session-card:hover {
    transform: translateY(-2px) !important;
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15) !important;
  }
  
  .search-input:focus {
    border-color: #173B66 !important;
    box-shadow: 0 0 0 3px rgba(23, 59, 102, 0.1) !important;
  }
  
  .activity-tab:hover {
    color: #173B66 !important;
  }
`;
document.head.appendChild(styleSheet);

export default AdminDashboard;