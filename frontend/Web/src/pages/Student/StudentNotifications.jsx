import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../../firebase";
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  doc,
  deleteDoc,
  updateDoc,
  getDoc,
} from "firebase/firestore";
import { signOut, onAuthStateChanged } from "firebase/auth";
import { calculateStudentAttendance } from "../../services/attendanceService";
import {
  FaBell,
  FaExclamationTriangle,
  FaCheckCircle,
  FaEnvelope,
  FaFilter,
  FaSpinner,
  FaTrash,
  FaArrowLeft,
  FaCheck,
  FaBook,
  FaEye,
  FaEyeSlash,
} from "react-icons/fa";

const StudentNotifications = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState("");
  const [selectedStatus, setSelectedSelectedStatus] = useState("");
  const [expandedNotification, setExpandedNotification] = useState(null);
  const [userId, setUserId] = useState(null);
  const [calculatedAlerts, setCalculatedAlerts] = useState([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUserId(user.uid);
        await fetchNotifications(user.uid);
        await fetchCalculatedAlerts(user.uid);
      } else {
        navigate("/login");
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  // Fetch notifications when filters change
  useEffect(() => {
    if (userId) {
      fetchNotifications(userId);
      fetchCalculatedAlerts(userId);
    }
  }, [selectedType, selectedStatus, userId]);

  // Fetch calculated alerts from course attendance data - generate all warning types
  const fetchCalculatedAlerts = async (uid) => {
    try {
      const coursesSnapshot = await getDocs(collection(db, "courses"));
      const alerts = [];

      // Get read calculated alerts from localStorage
      const readCalculatedAlerts = JSON.parse(localStorage.getItem(`readCalculatedAlerts_${uid}`) || '[]');

      for (const courseDoc of coursesSnapshot.docs) {
        const courseData = courseDoc.data();
        if ((courseData.enrolledStudents || []).includes(uid)) {
          // Calculate attendance
          const attendanceResult = await calculateStudentAttendance(courseDoc.id, uid);
          if (attendanceResult.success) {
            const attendance = parseFloat(attendanceResult.data.percentage);
            const absence = 100 - attendance;

            // Always generate all three types of warnings for each course
            // First Warning (10%)
            const firstAlertId = `calc-${courseDoc.id}-first`;
            const isFirstRead = readCalculatedAlerts.includes(firstAlertId);
            alerts.push({
              id: firstAlertId,
              type: "absence_alert",
              title: "⚠️ First Warning",
              message: `Your attendance in "${courseData.name}" is ${attendance.toFixed(1)}% (absence: ${absence.toFixed(1)}%). This is your first warning. Please improve your attendance to avoid further warnings.`,
              courseId: courseDoc.id,
              courseName: courseData.name,
              attendanceRate: attendance.toFixed(1),
              absenceRate: absence.toFixed(1),
              read: isFirstRead,
              isCalculated: true,
              createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
            });

            // Second Warning (20%)
            const secondAlertId = `calc-${courseDoc.id}-second`;
            const isSecondRead = readCalculatedAlerts.includes(secondAlertId);
            alerts.push({
              id: secondAlertId,
              type: "absence_warning",
              title: "⚠️ Second Warning",
              message: `Your attendance in "${courseData.name}" is ${attendance.toFixed(1)}% (absence: ${absence.toFixed(1)}%). This is your second warning. You received your first warning at 10% absence. Improve your attendance immediately to avoid being denied from the final exam.`,
              courseId: courseDoc.id,
              courseName: courseData.name,
              attendanceRate: attendance.toFixed(1),
              absenceRate: absence.toFixed(1),
              read: isSecondRead,
              isCalculated: true,
              createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
            });

            // Denied from Final Exam (25%)
            const deniedAlertId = `calc-${courseDoc.id}-denied`;
            const isDeniedRead = readCalculatedAlerts.includes(deniedAlertId);
            alerts.push({
              id: deniedAlertId,
              type: "absence_deprivation",
              title: "🚫 Denied from Final Exam",
              message: `Your attendance in "${courseData.name}" is ${attendance.toFixed(1)}% (absence: ${absence.toFixed(1)}%). You have been denied from taking the final exam due to excessive absence. You received first warning at 10% and second warning at 20%.`,
              courseId: courseDoc.id,
              courseName: courseData.name,
              attendanceRate: attendance.toFixed(1),
              absenceRate: absence.toFixed(1),
              read: isDeniedRead,
              isCalculated: true,
              createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
            });
          }
        }
      }

      setCalculatedAlerts(alerts);
    } catch (error) {
      console.error("Error fetching calculated alerts:", error);
    }
  };

  const fetchNotifications = async (uid) => {
    setLoading(true);
    try {
      let notifQuery = collection(db, "notifications");
      let constraints = [where("userId", "==", uid)];

      if (selectedType) {
        constraints.push(where("type", "==", selectedType));
      }

      if (selectedStatus === "unread") {
        constraints.push(where("read", "==", false));
      } else if (selectedStatus === "read") {
        constraints.push(where("read", "==", true));
      }

      constraints.push(orderBy("createdAt", "desc"));

      const querySnapshot = await getDocs(query(notifQuery, ...constraints));

      const notificationsData = await Promise.all(
        querySnapshot.docs.map(async (docSnap) => {
          const notification = { id: docSnap.id, ...docSnap.data() };

          // Get course name if courseId exists
          if (notification.courseId) {
            const courseDoc = await getDoc(doc(db, "courses", notification.courseId));
            if (courseDoc.exists()) {
              notification.courseName = courseDoc.data().name || "Unknown";
            }
          }

          return notification;
        })
      );

      setNotifications(notificationsData);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    }
    setLoading(false);
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/");
  };

  const markAsRead = async (notificationId, isCalculated) => {
    if (isCalculated) {
      // For calculated alerts, update local state and save to localStorage
      setCalculatedAlerts((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
      );
      
      // Save to localStorage
      const readCalculatedAlerts = JSON.parse(localStorage.getItem(`readCalculatedAlerts_${userId}`) || '[]');
      if (!readCalculatedAlerts.includes(notificationId)) {
        readCalculatedAlerts.push(notificationId);
        localStorage.setItem(`readCalculatedAlerts_${userId}`, JSON.stringify(readCalculatedAlerts));
      }
      return;
    }

    // For database notifications, update in Firestore
    try {
      await updateDoc(doc(db, "notifications", notificationId), {
        read: true,
      });
      // Update local state
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
      );
    } catch (error) {
      console.error("Error marking as read:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      // Mark database notifications as read
      const unreadNotifications = notifications.filter((n) => !n.read);
      await Promise.all(
        unreadNotifications.map((n) =>
          updateDoc(doc(db, "notifications", n.id), { read: true })
        )
      );
      
      // Update local state for database notifications
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      
      // Update local state for calculated alerts and save to localStorage
      const unreadCalculatedAlerts = calculatedAlerts.filter((n) => !n.read);
      setCalculatedAlerts((prev) => prev.map((n) => ({ ...n, read: true })));
      
      // Save all calculated alert IDs to localStorage
      const readCalculatedAlerts = JSON.parse(localStorage.getItem(`readCalculatedAlerts_${userId}`) || '[]');
      const newReadAlerts = unreadCalculatedAlerts.map(alert => alert.id);
      const updatedReadAlerts = [...new Set([...readCalculatedAlerts, ...newReadAlerts])];
      localStorage.setItem(`readCalculatedAlerts_${userId}`, JSON.stringify(updatedReadAlerts));
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  };

  const deleteNotification = async (notificationId, isCalculated) => {
    if (!window.confirm("Are you sure you want to delete this notification?")) {
      return;
    }

    if (isCalculated) {
      // For calculated alerts, just remove from local state
      setCalculatedAlerts((prev) => prev.filter((n) => n.id !== notificationId));
    } else {
      // For database notifications, delete from Firestore
      try {
        await deleteDoc(doc(db, "notifications", notificationId));
        setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
      } catch (error) {
        console.error("Error deleting notification:", error);
      }
    }
  };

  const deleteAllNotifications = async () => {
    if (!window.confirm("Are you sure you want to delete all notifications?")) {
      return;
    }

    try {
      // Delete database notifications
      const deletePromises = notifications.map((n) =>
        deleteDoc(doc(db, "notifications", n.id))
      );
      await Promise.all(deletePromises);
      setNotifications([]);
      // Clear calculated alerts too
      setCalculatedAlerts([]);
    } catch (error) {
      console.error("Error deleting all notifications:", error);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case "absence_alert":
        return <FaExclamationTriangle color="#F59E0B" />;
      case "absence_warning":
        return <FaExclamationTriangle color="#F59E0B" />;
      case "absence_deprivation":
        return <FaExclamationTriangle color="#DC2626" />;
      default:
        return <FaBell color="#64748B" />;
    }
  };

  const getNotificationStyle = (type, read) => {
    if (read) {
      return {
        bg: "#F9FAFB",
        border: "#E5E7EB",
        text: "#6B7280",
      };
    }

    switch (type) {
      case "absence_deprivation":
        return {
          bg: "#FEE2E2",
          border: "#FCA5A5",
          text: "#991B1B",
        };
      case "absence_warning":
        return {
          bg: "#FEF3C7",
          border: "#FCD34D",
          text: "#92400E",
        };
      case "absence_alert":
        return {
          bg: "#FEF9C3",
          border: "#FDE047",
          text: "#854D0E",
        };
      default:
        return {
          bg: "#F0F9FF",
          border: "#BAE6FD",
          text: "#173B66",
        };
    }
  };

  const getNotificationLabel = (type) => {
    const labels = {
      absence_alert: "First Warning",
      absence_warning: "Second Warning", 
      absence_deprivation: "Denied from Final Exam",
      general: "General",
    };
    return labels[type] || type.replace(/_/g, " ").toUpperCase();
  };

  // Combine notifications and calculated alerts with filtering
  const getFilteredNotifications = () => {
    let combined = [...notifications, ...calculatedAlerts];
    
    // Apply type filter
    if (selectedType) {
      combined = combined.filter(n => n.type === selectedType);
    }
    
    // Apply status filter
    if (selectedStatus === "unread") {
      combined = combined.filter(n => !n.read);
    } else if (selectedStatus === "read") {
      combined = combined.filter(n => n.read);
    }
    
    // Sort by creation date (newest first)
    combined.sort((a, b) => {
      const dateA = a.createdAt?.toDate?.() || a.createdAt || new Date(0);
      const dateB = b.createdAt?.toDate?.() || b.createdAt || new Date(0);
      return dateB - dateA;
    });
    
    return combined;
  };

  // Combine notifications and calculated alerts
  const allNotifications = getFilteredNotifications();
  const unreadCount = [...notifications, ...calculatedAlerts].filter((n) => !n.read).length;

  // Calculate absence percentage categories
  const getAbsenceCategory = (notification) => {
    const absenceRate =
      notification.absenceRate ||
      notification.absence ||
      (notification.attendanceRate
        ? 100 - parseFloat(notification.attendanceRate)
        : 0);

    if (absenceRate >= 25) return "25%";
    if (absenceRate >= 20) return "20%";
    if (absenceRate >= 10) return "10%";
    return null;
  };

  return (
    <div style={{ minHeight: "100vh", background: "#F8FAFC" }}>
      {/* Navbar */}
      <div
        style={{
          backgroundColor: "white",
          padding: "20px 40px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
        }}
      >
        <div
          onClick={() => navigate("/student")}
          style={{
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            color: "#173B66",
            fontWeight: "600",
          }}
        >
          <FaArrowLeft />
          Back to Dashboard
        </div>

        <button
          onClick={handleLogout}
          style={{
            backgroundColor: "#173B66",
            color: "white",
            border: "none",
            padding: "10px 24px",
            borderRadius: "8px",
            cursor: "pointer",
            fontWeight: "600",
            fontSize: "14px",
          }}
        >
          Log Out
        </button>
      </div>

      {/* Main Content */}
      <div
        style={{
          padding: "40px",
          maxWidth: "1200px",
          margin: "0 auto",
        }}
      >
        {/* Header */}
        <div
          style={{
            backgroundColor: "#F0F9FF",
            border: "1px solid #BAE6FD",
            borderRadius: "12px",
            padding: "24px",
            marginBottom: "24px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "16px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div
              style={{
                position: "relative",
                width: "48px",
                height: "48px",
                backgroundColor: "#173B66",
                borderRadius: "12px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <FaBell size={24} color="white" />
              {unreadCount > 0 && (
                <span
                  style={{
                    position: "absolute",
                    top: "-4px",
                    right: "-4px",
                    backgroundColor: "#DC2626",
                    color: "white",
                    borderRadius: "50%",
                    width: "20px",
                    height: "20px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "12px",
                    fontWeight: "700",
                  }}
                >
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </div>
            <div>
              <h1
                style={{
                  margin: "0",
                  color: "#173B66",
                  fontSize: "24px",
                  fontWeight: "700",
                }}
              >
                My Notifications
              </h1>
              <p style={{ margin: "4px 0 0 0", color: "#173B66", fontSize: "14px" }}>
                {unreadCount} unread of {allNotifications.length} total
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: "flex", gap: "12px" }}>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                style={{
                  padding: "10px 16px",
                  backgroundColor: "#173B66",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: "600",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <FaCheck />
                Mark All Read
              </button>
            )}
            {allNotifications.length > 0 && (
              <button
                onClick={deleteAllNotifications}
                style={{
                  padding: "10px 16px",
                  backgroundColor: "#DC2626",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: "600",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <FaTrash />
                Delete All
              </button>
            )}
          </div>
        </div>

        {/* Statistics */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: "16px",
            marginBottom: "24px",
          }}
        >
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "12px",
              padding: "20px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
              textAlign: "center",
            }}
          >
            <p
              style={{
                fontSize: "28px",
                fontWeight: "700",
                color: "#173B66",
                margin: "0 0 5px 0",
              }}
            >
              {allNotifications.length}
            </p>
            <p style={{ margin: 0, color: "#64748B", fontSize: "14px" }}>
              Total
            </p>
          </div>

          <div
            style={{
              backgroundColor: "#FEF9C3",
              borderRadius: "12px",
              padding: "20px",
              textAlign: "center",
              border: "1px solid #FDE047",
            }}
          >
            <p
              style={{
                fontSize: "28px",
                fontWeight: "700",
                color: "#854D0E",
                margin: "0 0 5px 0",
              }}
            >
              {
                allNotifications.filter((n) => n.type === "absence_alert").length
              }
            </p>
            <p style={{ margin: 0, color: "#854D0E", fontSize: "14px" }}>
              First Warning (10%)
            </p>
          </div>

          <div
            style={{
              backgroundColor: "#FEF3C7",
              borderRadius: "12px",
              padding: "20px",
              textAlign: "center",
              border: "1px solid #FCD34D",
            }}
          >
            <p
              style={{
                fontSize: "28px",
                fontWeight: "700",
                color: "#92400E",
                margin: "0 0 5px 0",
              }}
            >
              {
                allNotifications.filter((n) => n.type === "absence_warning").length
              }
            </p>
            <p style={{ margin: 0, color: "#92400E", fontSize: "14px" }}>
              Second Warning (20%)
            </p>
          </div>

          <div
            style={{
              backgroundColor: "#FEE2E2",
              borderRadius: "12px",
              padding: "20px",
              textAlign: "center",
              border: "1px solid #FCA5A5",
            }}
          >
            <p
              style={{
                fontSize: "28px",
                fontWeight: "700",
                color: "#991B1B",
                margin: "0 0 5px 0",
              }}
            >
              {
                allNotifications.filter((n) => n.type === "absence_deprivation").length
              }
            </p>
            <p style={{ margin: 0, color: "#991B1B", fontSize: "14px" }}>
              Denied from Final Exam (25%)
            </p>
          </div>
        </div>

        {/* Filters */}
        <div
          style={{
            backgroundColor: "white",
            borderRadius: "12px",
            padding: "20px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
            marginBottom: "24px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "16px",
            }}
          >
            <FaFilter color="#64748B" />
            <span style={{ fontWeight: "600", color: "#173B66" }}>Filters</span>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, 1fr)",
              gap: "16px",
            }}
          >
            {/* Type Filter */}
            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: "8px",
                  color: "#374151",
                  fontSize: "14px",
                  fontWeight: "500",
                }}
              >
                Alert Type
              </label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: "8px",
                  border: "1px solid #D1D5DB",
                  fontSize: "14px",
                  backgroundColor: "white",
                }}
              >
                <option value="">All Types</option>
                <option value="absence_alert">Absence 10% - First Warning</option>
                <option value="absence_warning">Absence 20% - Second Warning</option>
                <option value="absence_deprivation">Absence 25% - Denied from Final Exam</option>
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: "8px",
                  color: "#374151",
                  fontSize: "14px",
                  fontWeight: "500",
                }}
              >
                Status
              </label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedSelectedStatus(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: "8px",
                  border: "1px solid #D1D5DB",
                  fontSize: "14px",
                  backgroundColor: "white",
                }}
              >
                <option value="">All</option>
                <option value="unread">Unread</option>
                <option value="read">Read</option>
              </select>
            </div>
          </div>

          {(selectedType || selectedStatus) && (
            <button
              onClick={() => {
                setSelectedType("");
                setSelectedSelectedStatus("");
              }}
              style={{
                marginTop: "16px",
                padding: "8px 16px",
                backgroundColor: "#F3F4F6",
                border: "none",
                borderRadius: "6px",
                color: "#374151",
                fontSize: "14px",
                cursor: "pointer",
              }}
            >
              Clear Filters
            </button>
          )}
        </div>

        {/* Notifications List */}
        {loading ? (
          <div style={{ textAlign: "center", padding: "60px" }}>
            <FaSpinner
              size={32}
              color="#173B66"
              style={{ animation: "spin 1s linear infinite" }}
            />
            <p style={{ color: "#64748B", marginTop: "10px" }}>
              Loading notifications...
            </p>
          </div>
        ) : allNotifications.length === 0 ? (
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "12px",
              padding: "60px",
              textAlign: "center",
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
            }}
          >
            <FaCheckCircle size={48} color="#10B981" style={{ marginBottom: "16px" }} />
            <p style={{ color: "#065F46", fontSize: "18px", margin: 0 }}>
              No notifications
            </p>
            <p style={{ color: "#6B7280", fontSize: "14px", margin: "8px 0 0 0" }}>
              You're all caught up!
            </p>
          </div>
        ) : (
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "12px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
              overflow: "hidden",
            }}
          >
            {/* List Header */}
            <div
              style={{
                padding: "20px 24px",
                borderBottom: "1px solid #E5E7EB",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <h3 style={{ margin: 0, color: "#173B66", fontSize: "18px" }}>
                Notification History
              </h3>
              <span style={{ color: "#64748B", fontSize: "14px" }}>
                Showing {allNotifications.length} notification(s)
              </span>
            </div>

            {/* Notifications */}
            <div style={{ maxHeight: "600px", overflowY: "auto" }}>
              {allNotifications.map((notification) => {
                const style = getNotificationStyle(notification.type, notification.read);
                const isExpanded = expandedNotification === notification.id;
                const absenceCat = getAbsenceCategory(notification);

                return (
                  <div
                    key={notification.id}
                    style={{
                      padding: "16px 24px",
                      borderBottom: "1px solid #E5E7EB",
                      backgroundColor: notification.read ? "white" : style.bg,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "12px",
                      }}
                    >
                      {/* Icon */}
                      <div
                        style={{
                          width: "40px",
                          height: "40px",
                          borderRadius: "8px",
                          backgroundColor: style.bg,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        {getNotificationIcon(notification.type)}
                      </div>

                      {/* Content */}
                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "flex-start",
                            marginBottom: "4px",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span
                              style={{
                                display: "inline-block",
                                padding: "2px 8px",
                                borderRadius: "4px",
                                fontSize: "11px",
                                fontWeight: "600",
                                textTransform: "uppercase",
                                backgroundColor: style.bg,
                                color: style.text,
                              }}
                            >
                              {getNotificationLabel(notification.type)}
                            </span>
                            {absenceCat && (
                              <span
                                style={{
                                  display: "inline-block",
                                  padding: "2px 6px",
                                  borderRadius: "4px",
                                  fontSize: "10px",
                                  fontWeight: "700",
                                  backgroundColor:
                                    absenceCat === "25%"
                                      ? "#DC2626"
                                      : absenceCat === "20%"
                                      ? "#F59E0B"
                                      : "#EAB308",
                                  color: "white",
                                }}
                              >
                                {absenceCat} Absence
                              </span>
                            )}
                            {!notification.read && (
                              <span
                                style={{
                                  display: "inline-block",
                                  padding: "2px 6px",
                                  borderRadius: "4px",
                                  fontSize: "10px",
                                  fontWeight: "700",
                                  backgroundColor: "#DC2626",
                                  color: "white",
                                }}
                              >
                                NEW
                              </span>
                            )}
                          </div>
                          <span style={{ color: "#9CA3AF", fontSize: "12px" }}>
                            {notification.createdAt
                              ? new Date(
                                  notification.createdAt.toDate?.() || notification.createdAt
                                ).toLocaleString()
                              : "Unknown date"}
                          </span>
                        </div>

                        <h4
                          style={{
                            margin: "4px 0",
                            color: notification.read ? "#6B7280" : "#1F2937",
                            fontSize: "14px",
                            fontWeight: "600",
                          }}
                        >
                          {notification.title}
                        </h4>

                        {/* Course Info */}
                        {notification.courseName && (
                          <p
                            style={{
                              margin: "4px 0",
                              fontSize: "12px",
                              color: "#6B7280",
                              display: "flex",
                              alignItems: "center",
                              gap: "4px",
                            }}
                          >
                            <FaBook size={12} />
                            {notification.courseName}
                          </p>
                        )}

                        {/* Expanded Message */}
                        {isExpanded && (
                          <div
                            style={{
                              marginTop: "12px",
                              padding: "12px",
                              backgroundColor: "white",
                              borderRadius: "8px",
                              border: `1px solid ${style.border}`,
                            }}
                          >
                            <p
                              style={{
                                margin: 0,
                                color: "#374151",
                                fontSize: "14px",
                                lineHeight: "1.5",
                              }}
                            >
                              {notification.message}
                            </p>
                            {notification.attendanceRate && (
                              <div
                                style={{
                                  marginTop: "8px",
                                  padding: "8px",
                                  backgroundColor: style.bg,
                                  borderRadius: "4px",
                                }}
                              >
                                <span
                                  style={{
                                    fontSize: "12px",
                                    color: style.text,
                                    fontWeight: "600",
                                  }}
                                >
                                  Attendance Rate: {notification.attendanceRate}% | Absence: {getAbsenceCategory(notification)}
                                </span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Actions */}
                        <div
                          style={{
                            display: "flex",
                            gap: "8px",
                            marginTop: "12px",
                          }}
                        >
                          <button
                            onClick={() =>
                              setExpandedNotification(isExpanded ? null : notification.id)
                            }
                            style={{
                              padding: "6px 12px",
                              backgroundColor: "#F3F4F6",
                              border: "none",
                              borderRadius: "6px",
                              color: "#374151",
                              fontSize: "12px",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: "4px",
                            }}
                          >
                            {isExpanded ? <FaEyeSlash size={12} /> : <FaEye size={12} />}
                            {isExpanded ? "Hide" : "View"}
                          </button>

                          {!notification.read && (
                            <button
                              onClick={() => markAsRead(notification.id, notification.isCalculated)}
                              style={{
                                padding: "6px 12px",
                                backgroundColor: "#173B66",
                                border: "none",
                                borderRadius: "6px",
                                color: "white",
                                fontSize: "12px",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                gap: "4px",
                              }}
                            >
                              <FaCheck size={12} />
                              Mark Read
                            </button>
                          )}

                          <button
                            onClick={() => deleteNotification(notification.id, notification.isCalculated)}
                            style={{
                              padding: "6px 12px",
                              backgroundColor: "#DC2626",
                              border: "none",
                              borderRadius: "6px",
                              color: "white",
                              fontSize: "12px",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: "4px",
                            }}
                          >
                            <FaTrash size={12} />
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentNotifications;
