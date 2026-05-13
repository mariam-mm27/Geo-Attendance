import { useState, useEffect } from "react";
import { db } from "../../firebase";
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  doc,
  getDoc,
} from "firebase/firestore";
import {
  FaBell,
  FaExclamationTriangle,
  FaCheckCircle,
  FaEnvelope,
  FaUser,
  FaBook,
  FaFilter,
  FaSpinner,
  FaEye,
  FaEyeSlash,
} from "react-icons/fa";

const AlertsSection = ({ courses, students: studentsProp, showSuccess, showError }) => {
  const [selectedStudent, setSelectedStudent] = useState("");
  const [selectedCourse, setSelectedCourse] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedAlert, setExpandedAlert] = useState(null);
  const [allStudents, setAllStudents] = useState([]);

  // Fetch students from users collection with role="student"
  useEffect(() => {
    const fetchStudents = async () => {
      try {
        // First try to use the prop
        if (studentsProp && studentsProp.length > 0) {
          setAllStudents(studentsProp);
          return;
        }

        // Otherwise fetch from users collection
        const usersSnapshot = await getDocs(collection(db, "users"));
        const studentsData = usersSnapshot.docs
          .map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }))
          .filter((user) => user.role === "student" || user.Role === "student");

        setAllStudents(studentsData);
      } catch (error) {
        console.error("Error fetching students:", error);
      }
    };

    fetchStudents();
  }, [studentsProp]);

  // Fetch all alerts with filters
  useEffect(() => {
    const fetchAlerts = async () => {
      setLoading(true);
      try {
        let alertsQuery = collection(db, "notifications");

        // Build query with filters - avoid composite index issues
        let queryRef;
        
        if (selectedStudent) {
          // Filter by student only
          queryRef = query(alertsQuery, where("userId", "==", selectedStudent));
        } else if (selectedCourse) {
          // Filter by course only
          queryRef = query(alertsQuery, where("courseId", "==", selectedCourse));
        } else if (selectedType) {
          // Filter by type only
          queryRef = query(alertsQuery, where("type", "==", selectedType));
        } else {
          // No filters - get all with ordering
          queryRef = query(alertsQuery, orderBy("createdAt", "desc"));
        }

        const querySnapshot = await getDocs(queryRef);

        let alertsData = querySnapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }));

        // Client-side filtering for multiple filters
        if (selectedStudent && selectedCourse) {
          alertsData = alertsData.filter(
            (alert) => alert.userId === selectedStudent && alert.courseId === selectedCourse
          );
        }
        // Filter by percentage-based type
        if (selectedType) {
          if (selectedType === "absence_10") {
            alertsData = alertsData.filter((alert) => {
              const absenceRate = alert.absenceRate || alert.absence || 
                (alert.attendanceRate ? 100 - parseFloat(alert.attendanceRate) : 0);
              return absenceRate >= 10 && absenceRate < 20;
            });
          } else if (selectedType === "absence_20") {
            alertsData = alertsData.filter((alert) => {
              const absenceRate = alert.absenceRate || alert.absence || 
                (alert.attendanceRate ? 100 - parseFloat(alert.attendanceRate) : 0);
              return absenceRate >= 20 && absenceRate < 25;
            });
          } else if (selectedType === "absence_25") {
            alertsData = alertsData.filter((alert) => {
              const absenceRate = alert.absenceRate || alert.absence || 
                (alert.attendanceRate ? 100 - parseFloat(alert.attendanceRate) : 0);
              return absenceRate >= 25;
            });
          } else {
            // Other type filters
            alertsData = alertsData.filter((alert) => alert.type === selectedType);
          }
        }

        // Sort by createdAt desc if not already sorted by query
        if (selectedStudent || selectedCourse || selectedType) {
          alertsData.sort((a, b) => {
            const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt || 0);
            const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt || 0);
            return dateB - dateA;
          });
        }

        // Enrich with student and course names
        const enrichedAlerts = await Promise.all(
          alertsData.map(async (alert) => {
            // Get student info
            if (alert.userId) {
              const studentFromList = allStudents.find((s) => s.id === alert.userId);
              if (studentFromList) {
                alert.studentName = studentFromList.name || studentFromList.Name || "Unknown";
                alert.studentEmail = studentFromList.email || studentFromList.Email || "";
              } else {
                const studentDoc = await getDoc(doc(db, "users", alert.userId));
                if (studentDoc.exists()) {
                  const studentData = studentDoc.data();
                  alert.studentName = studentData.name || studentData.Name || "Unknown";
                  alert.studentEmail = studentData.email || studentData.Email || "";
                }
              }
            }

            // Get course info
            if (alert.courseId) {
              const courseFromList = courses.find((c) => c.id === alert.courseId);
              if (courseFromList) {
                alert.courseName = courseFromList.name;
              } else {
                const courseDoc = await getDoc(doc(db, "courses", alert.courseId));
                if (courseDoc.exists()) {
                  alert.courseName = courseDoc.data().name || "Unknown";
                }
              }
            }

            return alert;
          })
        );

        setAlerts(enrichedAlerts);
      } catch (error) {
        console.error("Error fetching alerts:", error);
        showError("Failed to fetch alerts: " + error.message);
      }
      setLoading(false);
    };

    fetchAlerts();
  }, [selectedStudent, selectedCourse, selectedType, allStudents, courses]);

  // Get alert icon based on type
  const getAlertIcon = (type) => {
    switch (type) {
      case "absence_alert":
      case "absence_warning":
        return <FaExclamationTriangle color="#F59E0B" />;
      case "absence_deprivation":
        return <FaExclamationTriangle color="#DC2626" />;
      case "email_sent":
      case "email_alert":
        return <FaEnvelope color="#2563EB" />;
      case "session_created":
        return <FaCheckCircle color="#10B981" />;
      default:
        return <FaBell color="#64748B" />;
    }
  };

  // Get alert background color based on absence percentage
  const getAlertStyle = (alert) => {
    const category = getAbsenceCategory(alert);
    const threshold = category.threshold;

    // 25% absence (75% attendance) - Red/Danger
    if (threshold >= 25) {
      return {
        bg: "#FEE2E2",
        border: "#FCA5A5",
        text: "#991B1B",
      };
    }
    // 20% absence (80% attendance) - Orange/Warning
    if (threshold >= 20) {
      return {
        bg: "#FEF3C7",
        border: "#FCD34D",
        text: "#92400E",
      };
    }
    // 10% absence (90% attendance) - Yellow/Caution
    if (threshold >= 10) {
      return {
        bg: "#FEF9C3",
        border: "#FDE047",
        text: "#854D0E",
      };
    }
    // Other types
    const type = alert.type || "";
    if (type.includes("email")) {
      return {
        bg: "#DBEAFE",
        border: "#93C5FD",
        text: "#1E40AF",
      };
    }
    return {
      bg: "#F0F9FF",
      border: "#BAE6FD",
      text: "#0369A1",
    };
  };

  // Get alert category based on absence rate
  const getAbsenceCategory = (alert) => {
    const absenceRate = alert.absenceRate || alert.absence || 
      (alert.attendanceRate ? 100 - parseFloat(alert.attendanceRate) : null);
    
    if (absenceRate >= 25) return { key: "absence_25", label: "Absence 25% - Deprivation Risk", threshold: 25 };
    if (absenceRate >= 20) return { key: "absence_20", label: "Absence 20% - Warning", threshold: 20 };
    if (absenceRate >= 10) return { key: "absence_10", label: "Absence 10% - Alert", threshold: 10 };
    return { key: alert.type, label: alert.type?.replace(/_/g, " ").toUpperCase(), threshold: 0 };
  };

  // Get alert type label
  const getAlertTypeLabel = (type, alert) => {
    // If we have the full alert object with attendance data, calculate category
    if (alert && (alert.absenceRate || alert.attendanceRate || alert.absence)) {
      const category = getAbsenceCategory(alert);
      return category.label;
    }
    
    const labels = {
      absence_alert: "Absence Alert",
      absence_warning: "Absence Warning",
      absence_deprivation: "Deprivation Risk",
      absence_10: "Absence 10% - Alert",
      absence_20: "Absence 20% - Warning",
      absence_25: "Absence 25% - Deprivation Risk",
      email_sent: "Email Sent",
      email_alert: "Email Alert",
      session_created: "New Session",
      general: "General",
    };
    return labels[type] || type.replace(/_/g, " ").toUpperCase();
  };

  // Clear all filters
  const clearFilters = () => {
    setSelectedStudent("");
    setSelectedCourse("");
    setSelectedType("");
  };

  // Count alerts by absence percentage categories
  const getAlertCounts = () => {
    const counts = {
      total: alerts.length,
      absence10: 0,
      absence20: 0,
      absence25: 0,
    };
    
    alerts.forEach((alert) => {
      const category = getAbsenceCategory(alert);
      if (category.threshold >= 25) counts.absence25++;
      else if (category.threshold >= 20) counts.absence20++;
      else if (category.threshold >= 10) counts.absence10++;
    });
    
    return counts;
  };

  const alertCounts = getAlertCounts();

  // Check all courses and send alerts
  const handleCheckAllCourses = async () => {
    setLoading(true);
    try {
      const response = await fetch("http://localhost:3001/api/email/check-all", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();
      
      if (data.success) {
        showSuccess(
          `✅ Checked ${data.totalCourses} courses and sent ${data.totalAlertsSent} email alerts!`
        );
        // Refresh alerts after sending
        window.location.reload();
      } else {
        showError(`❌ Failed to check courses: ${data.message || data.error}`);
      }
    } catch (error) {
      console.error("Error checking courses:", error);
      showError(`❌ Error: ${error.message}`);
    }
    setLoading(false);
  };

  return (
    <div style={{ padding: "20px 0" }}>
      {/* Header */}
      <div
        style={{
          backgroundColor: "#F0F9FF",
          border: "1px solid #BAE6FD",
          borderRadius: "12px",
          padding: "20px",
          marginBottom: "24px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <FaBell size={24} color="#0369A1" />
            <div>
              <h3 style={{ margin: "0 0 5px 0", color: "#0369A1", fontSize: "18px" }}>
                Student Alerts & Notifications
              </h3>
              <p style={{ margin: 0, color: "#0C4A6E", fontSize: "14px" }}>
                View all attendance warnings, deprivation risks, and system notifications
              </p>
            </div>
          </div>
          <button
            onClick={handleCheckAllCourses}
            disabled={loading}
            style={{
              padding: "12px 24px",
              backgroundColor: loading ? "#9CA3AF" : "#DC2626",
              color: "white",
              border: "none",
              borderRadius: "8px",
              fontSize: "14px",
              fontWeight: "600",
              cursor: loading ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              transition: "background-color 0.2s",
            }}
          >
            {loading ? (
              <>
                <FaSpinner style={{ animation: "spin 1s linear infinite" }} />
                Checking...
              </>
            ) : (
              <>
                <FaEnvelope />
                Check All Courses & Send Alerts
              </>
            )}
          </button>
        </div>
      </div>

      {/* Statistics Cards by Absence Percentage */}
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
              color: "#0369A1",
              margin: "0 0 5px 0",
            }}
          >
            {alertCounts.total}
          </p>
          <p style={{ margin: 0, color: "#64748B", fontSize: "14px" }}>
            Total Alerts
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
            {alertCounts.absence10}
          </p>
          <p style={{ margin: 0, color: "#854D0E", fontSize: "14px" }}>
            Absence 10%
          </p>
          <p style={{ margin: "4px 0 0 0", color: "#A16207", fontSize: "11px" }}>
            (90% attendance)
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
            {alertCounts.absence20}
          </p>
          <p style={{ margin: 0, color: "#92400E", fontSize: "14px" }}>
            Absence 20%
          </p>
          <p style={{ margin: "4px 0 0 0", color: "#B45309", fontSize: "11px" }}>
            (80% attendance)
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
            {alertCounts.absence25}
          </p>
          <p style={{ margin: 0, color: "#991B1B", fontSize: "14px" }}>
            Absence 25%
          </p>
          <p style={{ margin: "4px 0 0 0", color: "#B91C1C", fontSize: "11px" }}>
            Deprivation Risk
          </p>
        </div>
      </div>

      {/* Filters */}
      <div
        style={{
          backgroundColor: "white",
          borderRadius: "12px",
          padding: "24px",
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
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "16px",
            marginBottom: "16px",
          }}
        >
          {/* Student Filter */}
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
              Student
            </label>
            <select
              value={selectedStudent}
              onChange={(e) => setSelectedStudent(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 14px",
                borderRadius: "8px",
                border: "1px solid #D1D5DB",
                fontSize: "14px",
                backgroundColor: "white",
              }}
            >
              <option value="">All Students</option>
              {allStudents.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.name || student.Name || student.email || student.Email || student.studentId || "Unknown"}
                </option>
              ))}
            </select>
          </div>

          {/* Course Filter */}
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
              Course
            </label>
            <select
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 14px",
                borderRadius: "8px",
                border: "1px solid #D1D5DB",
                fontSize: "14px",
                backgroundColor: "white",
              }}
            >
              <option value="">All Courses</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.name} ({course.code})
                </option>
              ))}
            </select>
          </div>

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
              <option value="">All Alerts</option>
              <option value="absence_10">Absence 10% (90% attendance)</option>
              <option value="absence_20">Absence 20% (80% attendance)</option>
              <option value="absence_25">Absence 25% (75% attendance) - Deprivation Risk</option>
              <option value="email_sent">Email Sent</option>
              <option value="session_created">New Session</option>
              <option value="general">General</option>
            </select>
          </div>
        </div>

        {/* Clear Filters */}
        {(selectedStudent || selectedCourse || selectedType) && (
          <button
            onClick={clearFilters}
            style={{
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

      {/* Loading State */}
      {loading && (
        <div style={{ textAlign: "center", padding: "40px" }}>
          <FaSpinner
            size={32}
            color="#173B66"
            style={{ animation: "spin 1s linear infinite" }}
          />
          <p style={{ color: "#64748B", marginTop: "10px" }}>
            Loading alerts...
          </p>
        </div>
      )}

      {/* Alerts List */}
      {!loading && (
        <div
          style={{
            backgroundColor: "white",
            borderRadius: "12px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
            overflow: "hidden",
          }}
        >
          {/* Alerts Header */}
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
              Alert History
            </h3>
            <span style={{ color: "#64748B", fontSize: "14px" }}>
              Showing {alerts.length} alert(s)
            </span>
          </div>

          {/* Alerts Content */}
          {alerts.length === 0 ? (
            <div
              style={{
                padding: "60px",
                textAlign: "center",
                backgroundColor: "#F9FAFB",
              }}
            >
              <FaCheckCircle size={48} color="#10B981" style={{ marginBottom: "16px" }} />
              <p style={{ color: "#065F46", fontSize: "16px", margin: 0 }}>
                No alerts found
              </p>
              <p style={{ color: "#6B7280", fontSize: "14px", margin: "8px 0 0 0" }}>
                {selectedStudent || selectedCourse || selectedType
                  ? "Try adjusting your filters"
                  : "All students are in good standing"}
              </p>
            </div>
          ) : (
            <div style={{ maxHeight: "600px", overflowY: "auto" }}>
              {alerts.map((alert) => {
                const style = getAlertStyle(alert);
                const isExpanded = expandedAlert === alert.id;

                return (
                  <div
                    key={alert.id}
                    style={{
                      padding: "16px 24px",
                      borderBottom: "1px solid #E5E7EB",
                      backgroundColor: alert.read ? "white" : style.bg,
                      cursor: "pointer",
                    }}
                    onClick={() => setExpandedAlert(isExpanded ? null : alert.id)}
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
                        {getAlertIcon(alert.type)}
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
                          <div>
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
                                marginBottom: "4px",
                              }}
                            >
                              {getAlertTypeLabel(alert.type, alert)}
                            </span>
                            {!alert.read && (
                              <span
                                style={{
                                  display: "inline-block",
                                  padding: "2px 6px",
                                  borderRadius: "4px",
                                  fontSize: "10px",
                                  fontWeight: "700",
                                  backgroundColor: "#DC2626",
                                  color: "white",
                                  marginLeft: "8px",
                                }}
                              >
                                NEW
                              </span>
                            )}
                          </div>
                          <span style={{ color: "#9CA3AF", fontSize: "12px" }}>
                            {alert.createdAt
                              ? new Date(
                                  alert.createdAt.toDate?.() || alert.createdAt
                                ).toLocaleString()
                              : "Unknown date"}
                          </span>
                        </div>

                        <h4
                          style={{
                            margin: "4px 0",
                            color: "#1F2937",
                            fontSize: "14px",
                            fontWeight: "600",
                          }}
                        >
                          {alert.title}
                        </h4>

                        {/* Student & Course Info */}
                        <div
                          style={{
                            display: "flex",
                            gap: "16px",
                            marginTop: "8px",
                            fontSize: "12px",
                            color: "#6B7280",
                          }}
                        >
                          {alert.studentName && (
                            <span
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "4px",
                              }}
                            >
                              <FaUser size={12} />
                              {alert.studentName}
                            </span>
                          )}
                          {alert.courseName && (
                            <span
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "4px",
                              }}
                            >
                              <FaBook size={12} />
                              {alert.courseName}
                            </span>
                          )}
                          <span
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "4px",
                            }}
                          >
                            {isExpanded ? (
                              <FaEyeSlash size={12} />
                            ) : (
                              <FaEye size={12} />
                            )}
                            {isExpanded ? "Hide" : "View"} details
                          </span>
                        </div>

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
                              {alert.message}
                            </p>
                            {alert.attendanceRate && (
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
                                  Attendance Rate: {alert.attendanceRate}%
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AlertsSection;
