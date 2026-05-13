 import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../../firebase";
import { doc, getDoc, collection, getDocs, query, where, addDoc } from "firebase/firestore";
import { signOut, onAuthStateChanged } from "firebase/auth";
import { FaBell } from "react-icons/fa";
import AttendanceBar from "../../components/AttendanceBar";
import { calculateStudentAttendance } from '../../services/attendanceService';
import { getEmailHistory, isLowAttendance, sendAbsenceAlert } from '../../services/emailService';
import UploadProfileImage from "../../components/UploadProfileImage";

const sendAttendanceNotification = async (userId, course, absencePct, type) => {
  try {
    // Check existing notifications for this course to ensure proper sequence
    const existingNotifications = await getDocs(query(
      collection(db, "notifications"),
      where("userId", "==", userId),
      where("courseId", "==", course.id)
    ));

    const hasFirstWarning = existingNotifications.docs.some(doc => 
      doc.data().type === "absence_alert"
    );
    const hasSecondWarning = existingNotifications.docs.some(doc => 
      doc.data().type === "absence_warning"
    );

    let notificationType, notificationTitle, notificationMessage;
    let shouldSendNotification = false;
    
    if (type === "denied" && hasFirstWarning && hasSecondWarning) {
      // Can only be denied if both warnings were issued
      notificationType = "absence_deprivation";
      notificationTitle = "🚫 Denied from Final Exam";
      notificationMessage = `Your absence in "${course.name}" has exceeded 25% (absence: ${absencePct}%). You have been denied from taking the final exam. You received first warning at 10% and second warning at 20%.`;
      shouldSendNotification = true;
    } else if (type === "second warning" && hasFirstWarning) {
      // Can only get second warning if first warning was issued
      notificationType = "absence_warning";
      notificationTitle = "⚠️ Second Warning";
      notificationMessage = `Your absence in "${course.name}" is between 20% and 25% (absence: ${absencePct}%). This is your second warning. You received your first warning at 10% absence. Improve your attendance immediately to avoid being denied from the final exam.`;
      shouldSendNotification = true;
    } else if (type === "first warning") {
      // First warning - always available at 10%
      notificationType = "absence_alert";
      notificationTitle = "⚠️ First Warning";
      notificationMessage = `Your absence in "${course.name}" is between 10% and 20% (absence: ${absencePct}%). This is your first warning. Please improve your attendance to avoid further warnings and potential denial from the final exam.`;
      shouldSendNotification = true;
    }

    if (!shouldSendNotification) {
      console.log(`Skipping notification for ${course.name} - proper warning sequence not met`);
      return;
    }

    // تحقق لو بعتنا notification من نفس النوع لنفس المادة في آخر 7 أيام
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentNotifQuery = query(
      collection(db, "notifications"),
      where("userId", "==", userId),
      where("courseId", "==", course.id),
      where("type", "==", notificationType)
    );
    const recentNotifications = await getDocs(recentNotifQuery);

    // لو في notification من نفس النوع قديمة، متبعتش تاني
    const recentExists = recentNotifications.docs.some(d => {
      const created = d.data().createdAt?.toDate?.() || new Date(0);
      return created > sevenDaysAgo;
    });
    if (recentExists) {
      console.log(`Recent ${notificationType} notification already exists for ${course.name}`);
      return;
    }

    // ابعت الـ notification في Firestore
    await addDoc(collection(db, "notifications"), {
      userId,
      courseId: course.id,
      courseName: course.name,
      type: notificationType,
      title: notificationTitle,
      message: notificationMessage,
      read: false,
      priority: type === "denied" ? "high" : "normal",
      createdAt: new Date(),
    });

    console.log(`Sent ${notificationType} notification for ${course.name}`);

    // Send email alert via backend API
    console.log(`Sending email alert to student ${userId} for course ${course.id}`);
    const emailResult = await sendAbsenceAlert(userId, course.id);
    if (emailResult.success) {
      console.log("Email alert sent successfully:", emailResult.messageId);
    } else {
      console.error("Failed to send email alert:", emailResult.error);
    }
  } catch (err) {
    console.error("Failed to send notification:", err);
  }
};

const getAttendanceStatus = (attendance) => {
  const absence = 100 - parseFloat(attendance);

  if (absence >= 25) return "danger";
  if (absence >= 10) return "warning";

  return "ok";
};

const StudentProfile = () => {
  const navigate = useNavigate();
  const [studentData, setStudentData] = useState({ name: "...", studentId: "", email: "" });
  const [courses, setCourses] = useState([]);
  const [coursesWithAttendance, setCoursesWithAttendance] = useState([]);
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [emailHistory, setEmailHistory] = useState([]);
  const [loadingEmailHistory, setLoadingEmailHistory] = useState(false);
  const notificationsSentRef = useRef(false);

  // Fetch unread notification count (including all calculated alerts)
  const fetchUnreadCount = async (userId) => {
    try {
      // Get database notifications
      const notifQuery = query(
        collection(db, "notifications"),
        where("userId", "==", userId),
        where("read", "==", false)
      );
      const snapshot = await getDocs(notifQuery);
      let dbUnreadCount = snapshot.size;

      // Get calculated alerts from course attendance data - always generate all 3 types
      const coursesSnapshot = await getDocs(collection(db, "courses"));
      let calculatedAlertsCount = 0;

      // Get read calculated alerts from localStorage
      const readCalculatedAlerts = JSON.parse(localStorage.getItem(`readCalculatedAlerts_${userId}`) || '[]');

      for (const courseDoc of coursesSnapshot.docs) {
        const courseData = courseDoc.data();
        if ((courseData.enrolledStudents || []).includes(userId)) {
          // Always count all 3 types of alerts for each course
          const firstAlertId = `calc-${courseDoc.id}-first`;
          const secondAlertId = `calc-${courseDoc.id}-second`;
          const deniedAlertId = `calc-${courseDoc.id}-denied`;

          if (!readCalculatedAlerts.includes(firstAlertId)) {
            calculatedAlertsCount++;
          }
          if (!readCalculatedAlerts.includes(secondAlertId)) {
            calculatedAlertsCount++;
          }
          if (!readCalculatedAlerts.includes(deniedAlertId)) {
            calculatedAlertsCount++;
          }
        }
      }

      const totalUnreadCount = dbUnreadCount + calculatedAlertsCount;
      
      // Debug logging
      console.log('🔔 Notification Count Debug:', {
        dbUnreadCount,
        calculatedAlertsCount,
        totalUnreadCount,
        readCalculatedAlerts: readCalculatedAlerts.length,
        coursesCount: coursesSnapshot.size
      });

      // Set total unread count (database + unread calculated alerts)
      setUnreadCount(totalUnreadCount);
    } catch (error) {
      console.error("Error fetching unread count:", error);
    }
  };

  useEffect(() => {
    const preventBack = () => {
      window.history.forward();
    };

    window.history.pushState(null, null, window.location.href);
    window.history.pushState(null, null, window.location.href);
    window.history.pushState(null, null, window.location.href);

    window.addEventListener("popstate", preventBack);
    setTimeout(preventBack, 0);

    // Add focus event listener to refresh notification count when user returns to page
    const handleFocus = () => {
      if (auth.currentUser) {
        // Add a small delay to ensure localStorage is updated
        setTimeout(() => {
          fetchUnreadCount(auth.currentUser.uid);
        }, 100);
      }
    };

    // Add visibility change event listener to refresh count when tab becomes visible
    const handleVisibilityChange = () => {
      if (!document.hidden && auth.currentUser) {
        // Add a small delay to ensure localStorage is updated
        setTimeout(() => {
          fetchUnreadCount(auth.currentUser.uid);
        }, 100);
      }
    };

    // Add storage event listener to refresh count when localStorage changes
    const handleStorageChange = (e) => {
      if (e.key && e.key.startsWith('readCalculatedAlerts_') && auth.currentUser) {
        fetchUnreadCount(auth.currentUser.uid);
      }
    };

    // Add page show event listener (fires when user navigates back)
    const handlePageShow = () => {
      if (auth.currentUser) {
        setTimeout(() => {
          fetchUnreadCount(auth.currentUser.uid);
        }, 200);
      }
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("pageshow", handlePageShow);

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setStudentData(docSnap.data());

          // Fetch unread notification count
          await fetchUnreadCount(user.uid);

          const coursesSnapshot = await getDocs(collection(db, "courses"));
          const enrolledCourses = [];
          coursesSnapshot.forEach((courseDoc) => {
            const courseData = courseDoc.data();
            if ((courseData.enrolledStudents || []).includes(user.uid)) {
              enrolledCourses.push({
                id: courseDoc.id,
                name: courseData.name,
                code: courseData.code,
                room: courseData.room,
                time: courseData.time,
                duration: courseData.duration,
                professorName: courseData.professorName,
                attendance: 0
              });
            }
          });
          setCourses(enrolledCourses);
        }
      } else {
        window.location.replace("/login");
      }
    });

    return () => {
      window.removeEventListener("popstate", preventBack);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("pageshow", handlePageShow);
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    const fetchAttendanceForCourses = async () => {
      if (!studentData.studentId || courses.length === 0) return;
      setLoadingAttendance(true);

      const updatedCourses = await Promise.all(
        courses.map(async (course) => {
          console.log(`🔍 Calculating attendance for course: ${course.name} (${course.id})`);
          const result = await calculateStudentAttendance(course.id, auth.currentUser.uid);
          console.log(`📊 Attendance result for ${course.name}:`, result);
          return {
            ...course,
            attendance: result.success ? result.data.percentage : "0",
            attendanceDetails: result.success ? result.data : null
          };
        })
      );

      setCoursesWithAttendance(updatedCourses);

      // Load email history
      let uid = auth.currentUser?.uid;
      if (uid) {
        setLoadingEmailHistory(true);
        const historyResult = await getEmailHistory(uid);
        if (historyResult.success) {
          setEmailHistory(historyResult.data || []);
        }
        setLoadingEmailHistory(false);
      }

      // بعت notifications مرة واحدة بس في الجلسة
      if (uid && !notificationsSentRef.current) {
        notificationsSentRef.current = true;

        const coursesToNotify = updatedCourses.filter(c => {
          const status = getAttendanceStatus(c.attendance);
          return status === "denied" || status === "second warning" || status === "first warning";
        });

        for (const c of coursesToNotify) {
          const status = getAttendanceStatus(c.attendance);
          const absencePct = (100 - parseFloat(c.attendance)).toFixed(1);
          await sendAttendanceNotification(uid, c, absencePct, status);
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      setLoadingAttendance(false);
    };

    fetchAttendanceForCourses();
  }, [courses]);

  const handleLogout = async () => {
    try {
      setStudentData({ name: "...", studentId: "", email: "" });
      setCourses([]);

      await signOut(auth);
      localStorage.clear();
      sessionStorage.clear();

      window.history.pushState(null, null, "/login");
      window.location.replace("/login");
    } catch (error) {
      console.error("Logout error:", error);
      window.location.replace("/login");
    }
  };

  const handleViewHistory = (courseId, courseName) => {
    navigate(`/student/attendance-history/${courseId}`, {
      state: { courseName, courseId }
    });
  };

  const getAttendanceColor = (attendancePct) => {
    const status = getAttendanceStatus(attendancePct);
    if (status === "denied") return { bg: "#FEE2E2", text: "#991B1B", border: "#FECACA", barColor: "#EF4444" };
    if (status === "second warning") return { bg: "#FEF3C7", text: "#92400E", border: "#FCD34D", barColor: "#F59E0B" };
    if (status === "first warning") return { bg: "#FEF9C3", text: "#854D0E", border: "#FDE047", barColor: "#EAB308" };
    return { bg: "#F0F9FF", text: "#173B66", border: "#E0F2FE", barColor: "#173B66" };
  };

  return (
    <div style={{ backgroundColor: "#F8FAFC", minHeight: "100vh", position: "relative" }}>
      {/* Sidebar */}
      {isSidebarOpen && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "250px",
          height: "100%",
          backgroundColor: "white",
          boxShadow: "2px 0 5px rgba(0,0,0,0.1)",
          zIndex: 1000,
          padding: "80px 20px"
        }}>
          <h3 style={{ color: "#173B66" }}>Settings</h3>

          <button
            onClick={() => navigate("/reset-password")}
            style={{
              display: "block",
              width: "100%",
              padding: "10px",
              margin: "10px 0",
              border: "1px solid #ddd",
              borderRadius: "5px",
              cursor: "pointer",
              textAlign: "left",
              background: "white"
            }}
          >
            🔑 Reset Password
          </button>

          <button
            onClick={() => setIsSidebarOpen(false)}
            style={{
              marginTop: "20px",
              color: "red",
              border: "none",
              background: "none",
              cursor: "pointer"
            }}
          >
            Close
          </button>
        </div>
      )}

      {/* Navbar */}
      <div style={{
        backgroundColor: "white",
        padding: "20px 40px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
      }}>
        <div
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          style={{ cursor: "pointer", fontSize: "24px", color: "#173B66" }}
        >
          ☰
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          {/* Bell Icon with Badge */}
          <div
            onClick={() => {
              // Refresh count before navigating
              if (auth.currentUser) {
                fetchUnreadCount(auth.currentUser.uid);
              }
              navigate("/student/notifications");
            }}
            style={{
              position: "relative",
              cursor: "pointer",
              width: "44px",
              height: "44px",
              backgroundColor: "#F0F9FF",
              borderRadius: "10px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.2s",
              border: "2px solid transparent",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#DBEAFE";
              e.currentTarget.style.transform = "scale(1.05)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "#F0F9FF";
              e.currentTarget.style.transform = "scale(1)";
            }}
          >
            <FaBell size={20} color="#173B66" />
            {unreadCount > 0 && (
              <span
                style={{
                  position: "absolute",
                  top: "-6px",
                  right: "-6px",
                  backgroundColor: "#DC2626",
                  color: "white",
                  borderRadius: "50%",
                  minWidth: "22px",
                  height: "22px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "11px",
                  fontWeight: "800",
                  border: "2px solid white",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
                  padding: "0 4px",
                }}
              >
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </div>

          <button onClick={handleLogout} style={{
            backgroundColor: "#173B66", color: "white", border: "none",
            padding: "10px 24px", borderRadius: "8px", cursor: "pointer",
            fontWeight: "600", fontSize: "14px",
            transition: "all 0.2s"
          }}
          onMouseEnter={(e) => e.target.style.backgroundColor = "#0F2744"}
          onMouseLeave={(e) => e.target.style.backgroundColor = "#173B66"}
          >
            Log Out
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ padding: "50px 100px", maxWidth: "1600px", margin: "0 auto" }}>
        {/* Title */}
        <h1 style={{
          color: "#173B66",
          fontSize: "36px",
          fontWeight: "700",
          textAlign: "center",
          marginBottom: "50px",
          marginTop: "0"
        }}>
          Student Dashboard
        </h1>

        {/* Email Alert History */}
        {emailHistory.length > 0 && (
          <div style={{
            backgroundColor: "#FEF2F2", border: "1.5px solid #FCA5A5",
            borderRadius: "12px", padding: "18px 24px",
            marginBottom: "24px"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
              <span style={{ fontSize: "20px" }}>📧</span>
              <h3 style={{ margin: 0, color: "#991B1B", fontSize: "16px", fontWeight: "700" }}>
                Email Alerts Sent
              </h3>
            </div>
            <p style={{ margin: "0 0 12px 0", color: "#7F1D1D", fontSize: "14px" }}>
              You have received attendance warning emails for the following courses:
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {emailHistory.slice(0, 3).map((email, index) => (
                <div key={index} style={{
                  backgroundColor: "white",
                  padding: "10px 14px",
                  borderRadius: "8px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center"
                }}>
                  <div>
                    <span style={{ fontWeight: "600", color: "#1F2937", fontSize: "14px" }}>
                      {email.type === 'absence_alert' ? 'Attendance Warning' : 'Notification'}
                    </span>
                    <span style={{ color: "#6B7280", fontSize: "12px", marginLeft: "10px" }}>
                      {new Date(email.sentAt?.toDate?.() || email.sentAt).toLocaleDateString()}
                    </span>
                  </div>
                  <span style={{
                    backgroundColor: email.status === 'sent' ? '#D1FAE5' : '#FEE2E2',
                    color: email.status === 'sent' ? '#065F46' : '#991B1B',
                    padding: "4px 10px",
                    borderRadius: "12px",
                    fontSize: "12px",
                    fontWeight: "600"
                  }}>
                    {email.status === 'sent' ? '✓ Sent' : '✗ Failed'}
                  </span>
                </div>
              ))}
              {emailHistory.length > 3 && (
                <p style={{ margin: "8px 0 0 0", color: "#991B1B", fontSize: "12px", textAlign: "center" }}>
                  +{emailHistory.length - 3} more email(s) sent
                </p>
              )}
            </div>
            <p style={{ margin: "12px 0 0 0", color: "#7F1D1D", fontSize: "12px", fontStyle: "italic" }}>
              Check your email inbox for detailed attendance reports and warnings.
            </p>
          </div>
        )}

        {/* Profile & Actions Row */}
        <div style={{
          display: "flex",
          gap: "30px",
          marginBottom: "40px",
          flexWrap: "wrap",
          alignItems: "flex-start"
        }}>
          {/* Profile Card */}
          <div style={{
            flex: "1",
            minWidth: "300px",
            backgroundColor: "white",
            padding: "30px",
            borderRadius: "15px",
            boxShadow: "0 2px 4px rgba(0,0,0,0.08)"
          }}>
            <h2 style={{
              color: "#173B66",
              margin: "0 0 20px 0",
              fontSize: "20px",
              fontWeight: "700"
            }}>
              Profile Information
            </h2>

            {/* Profile Image Section */}
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "20px",
              marginBottom: "25px"
            }}>
              {studentData.photoURL ? (
                <img
                  src={studentData.photoURL}
                  alt="profile"
                  style={{
                    width: "80px",
                    height: "80px",
                    borderRadius: "50%",
                    objectFit: "cover",
                    border: "3px solid #173B66"
                  }}
                />
              ) : (
                <div style={{
                  width: "80px",
                  height: "80px",
                  borderRadius: "50%",
                  backgroundColor: "#E0F2FE",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "3px solid #173B66",
                  fontSize: "32px"
                }}>
                  👤
                </div>
              )}
<UploadProfileImage
  currentPhotoURL={studentData.photoURL}
  onUploadSuccess={(url) =>
    setStudentData((prev) => ({ ...prev, photoURL: url }))
  }
/>            </div>

            {/* Personal Info */}
            <div style={{ lineHeight: "1.8" }}>
              <p style={{ margin: "6px 0", color: "#1E293B", fontSize: "15px" }}>
                <strong style={{ fontWeight: "600", color: "#173B66" }}>Name:</strong> {studentData.name}
              </p>
              <p style={{ margin: "6px 0", color: "#1E293B", fontSize: "15px" }}>
                <strong style={{ fontWeight: "600", color: "#173B66" }}>ID:</strong> {studentData.studentId}
              </p>
              <p style={{ margin: "6px 0", color: "#1E293B", fontSize: "15px" }}>
                <strong style={{ fontWeight: "600", color: "#173B66" }}>Email:</strong> {studentData.email}
              </p>
            </div>
          </div>

          {/* Quick Actions Card */}
          <div style={{
            minWidth: "300px",
            backgroundColor: "white",
            padding: "30px",
            borderRadius: "15px",
            boxShadow: "0 2px 4px rgba(0,0,0,0.08)",
            display: "flex",
            flexDirection: "column"
          }}>
            <h2 style={{
              color: "#173B66",
              margin: "0 0 20px 0",
              fontSize: "20px",
              fontWeight: "700"
            }}>
              Quick Actions
            </h2>

            <div style={{
              display: "flex",
              flexDirection: "column",
              gap: "12px",
              flex: "1"
            }}>
              <button
                onClick={() => navigate("/student-enroll")}
                style={{
                  padding: "14px 20px",
                  borderRadius: "10px",
                  border: "none",
                  backgroundColor: "#173B66",
                  color: "white",
                  fontWeight: "600",
                  cursor: "pointer",
                  fontSize: "14px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  transition: "all 0.2s",
                  boxShadow: "0 2px 4px rgba(23, 59, 102, 0.3)"
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = "#0F2744";
                  e.target.style.transform = "translateY(-2px)";
                  e.target.style.boxShadow = "0 4px 8px rgba(23, 59, 102, 0.4)";
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = "#173B66";
                  e.target.style.transform = "translateY(0)";
                  e.target.style.boxShadow = "0 2px 4px rgba(23, 59, 102, 0.3)";
                }}
              >
                <span>📚</span> Enroll in Courses
              </button>

              <button
                onClick={() => navigate("/student/sessions")}
                style={{
                  padding: "14px 20px",
                  borderRadius: "10px",
                  border: "none",
                  backgroundColor: "#10B981",
                  color: "white",
                  fontWeight: "600",
                  cursor: "pointer",
                  fontSize: "14px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  transition: "all 0.2s",
                  boxShadow: "0 2px 4px rgba(16, 185, 129, 0.3)"
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = "#059669";
                  e.target.style.transform = "translateY(-2px)";
                  e.target.style.boxShadow = "0 4px 8px rgba(16, 185, 129, 0.4)";
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = "#10B981";
                  e.target.style.transform = "translateY(0)";
                  e.target.style.boxShadow = "0 2px 4px rgba(16, 185, 129, 0.3)";
                }}
              >
                <span>📋</span> My Sessions History
              </button>
            </div>
          </div>
        </div>

        {/* My Courses Header */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "30px"
        }}>
          <h2 style={{
            color: "#173B66",
            margin: "0",
            fontSize: "24px",
            fontWeight: "700"
          }}>
            My Courses
          </h2>
        </div>

        {/* Courses Grid */}
        {courses.length === 0 ? (
          <div style={{
            backgroundColor: "white",
            padding: "60px",
            borderRadius: "15px",
            boxShadow: "0 2px 4px rgba(0,0,0,0.08)",
            textAlign: "center"
          }}>
            <p style={{ color: "#64748b", fontSize: "18px", margin: 0 }}>
              You are not enrolled in any courses yet. Click "Enroll in Course" to get started.
            </p>
          </div>
        ) : loadingAttendance ? (
          <div style={{ textAlign: "center", padding: "60px" }}>
            <div style={{
              width: "40px", height: "40px", margin: "0 auto 16px",
              border: "4px solid #e0f2fe",
              borderTop: "4px solid #173B66",
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite"
            }} />
            <p style={{ color: "#64748b", fontSize: "16px" }}>Loading attendance data...</p>
          </div>
        ) : (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "30px",
            marginBottom: "50px"
          }}>
            {coursesWithAttendance.map((course) => {
              const colors = getAttendanceColor(course.attendance);
              return (
                <div key={course.id} style={{
                  backgroundColor: "white",
                  padding: "30px",
                  borderRadius: "15px",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.08)"
                }}>
                  <div style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: "15px"
                  }}>
                    <h3 style={{
                      color: "#173B66",
                      fontSize: "20px",
                      fontWeight: "700",
                      marginTop: "0",
                      marginBottom: "0",
                      flex: 1
                    }}>
                      {course.name}
                    </h3>
                    <span style={{
                      backgroundColor: "#e0f2fe",
                      color: "#173B66",
                      padding: "4px 10px",
                      borderRadius: "6px",
                      fontSize: "12px",
                      fontWeight: "bold",
                      marginLeft: "10px"
                    }}>
                      {course.code}
                    </span>
                  </div>

                  <div style={{ marginBottom: "20px", paddingTop: "15px", borderTop: "1px solid #f1f5f9" }}>
                    <p style={{
                      margin: "8px 0",
                      color: "#64748b",
                      fontSize: "14px",
                      display: "flex",
                      alignItems: "center"
                    }}>
                      <span style={{ marginRight: "8px" }}>📍</span>
                      <strong style={{ fontWeight: "600", marginRight: "5px" }}>Room:</strong>
                      {course.room}
                    </p>
                    <p style={{
                      margin: "8px 0",
                      color: "#64748b",
                      fontSize: "14px",
                      display: "flex",
                      alignItems: "center"
                    }}>
                      <span style={{ marginRight: "8px" }}>🕒</span>
                      <strong style={{ fontWeight: "600", marginRight: "5px" }}>Time:</strong>
                      {course.time}
                    </p>
                    <p style={{
                      margin: "8px 0",
                      color: "#64748b",
                      fontSize: "14px",
                      display: "flex",
                      alignItems: "center"
                    }}>
                      <span style={{ marginRight: "8px" }}>⏱️</span>
                      <strong style={{ fontWeight: "600", marginRight: "5px" }}>Duration:</strong>
                      {course.duration ? (
                        typeof course.duration === 'number' ? 
                          `${course.duration / 60} hour${course.duration / 60 !== 1 ? 's' : ''}` :
                          // Handle legacy text formats
                          course.duration.includes('hour') ? course.duration : `${course.duration} minutes`
                      ) : "Not specified"}
                    </p>
                    <p style={{
                      margin: "8px 0",
                      color: "#64748b",
                      fontSize: "14px",
                      display: "flex",
                      alignItems: "center"
                    }}>
                      <span style={{ marginRight: "8px" }}>👨‍🏫</span>
                      <strong style={{ fontWeight: "600", marginRight: "5px" }}>Professor:</strong>
                      {course.professorName || "Not assigned"}
                    </p>
                  </div>

                  {/* Attendance Section */}
                  <div style={{
                    padding: "15px",
                    backgroundColor: colors.bg,
                    borderRadius: "8px",
                    border: `1px solid ${colors.border}`,
                    marginBottom: "15px"
                  }}>
                    <div style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: "8px",
                      alignItems: "center"
                    }}>
                      <span style={{ fontSize: "14px", color: colors.text, fontWeight: "600" }}>
                        Attendance Rate
                      </span>
                      <span style={{ fontSize: "24px", fontWeight: "700", color: colors.text }}>
                        {course.attendance}%
                      </span>
                    </div>
                    <AttendanceBar attendance={parseFloat(course.attendance)} />
                    <div style={{ marginTop: "8px", fontSize: "12px" }}>
                      {getAttendanceStatus(course.attendance) === "denied" && (
                        <span style={{ color: "#991B1B", fontWeight: "700" }}>
                          🚫 Denied from Final Exam — absence {(100 - parseFloat(course.attendance)).toFixed(1)}%
                        </span>
                      )}
                      {getAttendanceStatus(course.attendance) === "second warning" && (
                        <span style={{ color: "#92400E", fontWeight: "600" }}>
                          ⚠️ Second Warning — absence {(100 - parseFloat(course.attendance)).toFixed(1)}%
                        </span>
                      )}
                      {getAttendanceStatus(course.attendance) === "first warning" && (
                        <span style={{ color: "#854D0E", fontWeight: "600" }}>
                          ⚠️ First Warning — absence {(100 - parseFloat(course.attendance)).toFixed(1)}%
                        </span>
                      )}
                      {getAttendanceStatus(course.attendance) === "good" && (
                        <span style={{ color: "#065F46" }}>✅ Good standing</span>
                      )}
                    </div>
                    {course.attendanceDetails && (
                      <div style={{
                        marginTop: "10px",
                        fontSize: "13px",
                        color: colors.text,
                        display: "flex",
                        justifyContent: "space-between"
                      }}>
                        <span>✅ {course.attendanceDetails.attendedSessions} attended</span>
                        <span>📚 {course.attendanceDetails.totalSessions} total</span>
                      </div>
                    )}
                  </div>

                  {/* History Button */}
                  <button
                    onClick={() => handleViewHistory(course.id, course.name)}
                    style={{
                      backgroundColor: "#173B66",
                      border: "none",
                      color: "white",
                      padding: "10px",
                      borderRadius: "6px",
                      cursor: "pointer",
                      width: "100%",
                      fontSize: "14px",
                      fontWeight: "600",
                      transition: "0.3s"
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.backgroundColor = "#0F2744";
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor = "#173B66";
                    }}
                  >
                    📋 View Attendance History
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentProfile;