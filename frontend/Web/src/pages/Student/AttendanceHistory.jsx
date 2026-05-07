import { useState, useEffect } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { auth } from "../../firebase";
import { getStudentAttendanceHistory } from '../../services/attendanceService';

const AttendanceHistory = () => {
  const { courseId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [courseName, setCourseName] = useState(location.state?.courseName || "Course");

  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true);
      const result = await getStudentAttendanceHistory(courseId, auth.currentUser.uid);

      if (result.success) {
        setSessions(result.data);
      }
      setLoading(false);
    };

    fetchHistory();
  }, [courseId]);

  const attendedCount = sessions.filter(session => session.attended).length;
  const totalSessions = sessions.length;
  const attendancePercentage = totalSessions > 0 ? ((attendedCount / totalSessions) * 100).toFixed(1) : 0;

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <button onClick={() => navigate("/student")} style={styles.backButton}>
          ← Back
        </button>
        <h1 style={styles.headerTitle}>Attendance History</h1>
        <div style={{ width: "80px" }}></div>
      </div>

      {/* Main Content */}
      <div style={styles.mainContent}>
        {/* Course Info Card */}
        <div style={styles.courseCard}>
          <div style={styles.courseHeader}>
            <div style={styles.courseIcon}>
              📚
            </div>
            <div style={styles.courseInfo}>
              <h2 style={styles.courseName}>{courseName}</h2>
              <p style={styles.courseDescription}>
                View all attendance sessions and your status
              </p>
            </div>
            <div style={styles.statsCard}>
              <div style={styles.statItem}>
                <span style={styles.statNumber}>{attendedCount}</span>
                <span style={styles.statLabel}>Present</span>
              </div>
              <div style={styles.statDivider}></div>
              <div style={styles.statItem}>
                <span style={styles.statNumber}>{totalSessions - attendedCount}</span>
                <span style={styles.statLabel}>Absent</span>
              </div>
              <div style={styles.statDivider}></div>
              <div style={styles.statItem}>
                <span style={styles.statNumber}>{attendancePercentage}%</span>
                <span style={styles.statLabel}>Rate</span>
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div style={styles.loadingContainer}>
            <div style={styles.spinner}></div>
            <p style={styles.loadingText}>Loading attendance history...</p>
          </div>
        ) : sessions.length === 0 ? (
          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}>📋</div>
            <h3 style={styles.emptyTitle}>No Sessions Yet</h3>
            <p style={styles.emptyDescription}>
              No attendance sessions have been recorded for this course yet.
            </p>
          </div>
        ) : (
          <div style={styles.tableContainer}>
            <div style={styles.tableHeader}>
              <h3 style={styles.tableTitle}>Session History</h3>
              <span style={styles.sessionCount}>
                {totalSessions} session{totalSessions !== 1 ? 's' : ''} total
              </span>
            </div>
            
            <div style={styles.tableWrapper}>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.tableHeaderRow}>
                    <th style={styles.tableHeaderCell}>Date</th>
                    <th style={styles.tableHeaderCell}>Lecture</th>
                    <th style={styles.tableHeaderCellCenter}>Status</th>
                    <th style={styles.tableHeaderCell}>Time Recorded</th>
                    <th style={styles.tableHeaderCellCenter}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((session, index) => (
                    <tr key={index} style={styles.tableRow}>
                      <td style={styles.tableCell}>
                        <div style={styles.dateCell}>
                          <span style={styles.dateMain}>
                            {new Date(session.date).toLocaleDateString('en-US', {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </span>
                          <span style={styles.dateYear}>
                            {new Date(session.date).getFullYear()}
                          </span>
                        </div>
                      </td>
                      <td style={styles.tableCell}>
                        <span style={styles.lectureNumber}>
                          Lecture {session.lectureNumber || index + 1}
                        </span>
                      </td>
                      <td style={styles.tableCellCenter}>
                        {session.attended ? (
                          <span style={styles.presentBadge}>
                            ✅ Present
                          </span>
                        ) : (
                          <span style={styles.absentBadge}>
                            ❌ Absent
                          </span>
                        )}
                      </td>
                      <td style={styles.tableCell}>
                        <span style={styles.timeText}>
                          {session.attended && session.recordedAt ?
                            new Date(session.recordedAt).toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit'
                            }) :
                            '-'
                          }
                        </span>
                      </td>
                      <td style={styles.tableCellCenter}>
                        {session.attended ? (
                          <button
                            onClick={() => navigate(`/student/review/${session.sessionId}`, {
                              state: {
                                courseName: courseName,
                                lectureNumber: session.lectureNumber || index + 1
                              }
                            })}
                            style={styles.reviewButton}
                          >
                            📝 Review
                          </button>
                        ) : (
                          <span style={styles.noActionText}>-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const styles = {
  container: {
    backgroundColor: "#F8FAFC",
    minHeight: "100vh",
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
  },
  
  header: {
    backgroundColor: "white",
    padding: "20px 40px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
    borderBottom: "1px solid #E2E8F0"
  },
  
  backButton: {
    backgroundColor: "#173B66",
    color: "white",
    border: "none",
    padding: "12px 20px",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "600",
    transition: "all 0.2s ease",
    display: "flex",
    alignItems: "center",
    gap: "8px"
  },
  
  headerTitle: {
    color: "#173B66",
    margin: 0,
    fontSize: "24px",
    fontWeight: "700"
  },
  
  mainContent: {
    padding: "40px",
    maxWidth: "1200px",
    margin: "0 auto"
  },
  
  courseCard: {
    backgroundColor: "white",
    borderRadius: "16px",
    padding: "30px",
    marginBottom: "30px",
    boxShadow: "0 4px 6px rgba(0, 0, 0, 0.05), 0 10px 15px rgba(0, 0, 0, 0.1)",
    border: "1px solid #E2E8F0"
  },
  
  courseHeader: {
    display: "flex",
    alignItems: "center",
    gap: "20px",
    flexWrap: "wrap"
  },
  
  courseIcon: {
    width: "60px",
    height: "60px",
    backgroundColor: "#F0F9FF",
    borderRadius: "12px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "24px",
    flexShrink: 0
  },
  
  courseInfo: {
    flex: 1,
    minWidth: "200px"
  },
  
  courseName: {
    fontSize: "28px",
    fontWeight: "700",
    color: "#173B66",
    margin: "0 0 8px 0"
  },
  
  courseDescription: {
    fontSize: "16px",
    color: "#64748B",
    margin: 0
  },
  
  statsCard: {
    display: "flex",
    alignItems: "center",
    gap: "20px",
    backgroundColor: "#F8FAFC",
    padding: "20px",
    borderRadius: "12px",
    border: "1px solid #E2E8F0"
  },
  
  statItem: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "4px"
  },
  
  statNumber: {
    fontSize: "24px",
    fontWeight: "700",
    color: "#173B66"
  },
  
  statLabel: {
    fontSize: "12px",
    color: "#64748B",
    fontWeight: "500",
    textTransform: "uppercase"
  },
  
  statDivider: {
    width: "1px",
    height: "40px",
    backgroundColor: "#E2E8F0"
  },
  
  loadingContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "80px 20px",
    backgroundColor: "white",
    borderRadius: "16px",
    boxShadow: "0 4px 6px rgba(0, 0, 0, 0.05)"
  },
  
  spinner: {
    width: "40px",
    height: "40px",
    border: "4px solid #E2E8F0",
    borderTop: "4px solid #173B66",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
    marginBottom: "16px"
  },
  
  loadingText: {
    color: "#64748B",
    fontSize: "16px",
    margin: 0
  },
  
  emptyState: {
    backgroundColor: "white",
    borderRadius: "16px",
    padding: "80px 40px",
    textAlign: "center",
    boxShadow: "0 4px 6px rgba(0, 0, 0, 0.05)"
  },
  
  emptyIcon: {
    fontSize: "64px",
    marginBottom: "20px"
  },
  
  emptyTitle: {
    fontSize: "24px",
    fontWeight: "700",
    color: "#173B66",
    margin: "0 0 12px 0"
  },
  
  emptyDescription: {
    fontSize: "16px",
    color: "#64748B",
    margin: 0
  },
  
  tableContainer: {
    backgroundColor: "white",
    borderRadius: "16px",
    boxShadow: "0 4px 6px rgba(0, 0, 0, 0.05), 0 10px 15px rgba(0, 0, 0, 0.1)",
    overflow: "hidden"
  },
  
  tableHeader: {
    padding: "24px 30px",
    borderBottom: "1px solid #E2E8F0",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center"
  },
  
  tableTitle: {
    fontSize: "20px",
    fontWeight: "700",
    color: "#173B66",
    margin: 0
  },
  
  sessionCount: {
    fontSize: "14px",
    color: "#64748B",
    fontWeight: "500"
  },
  
  tableWrapper: {
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
  
  tableHeaderCellCenter: {
    padding: "16px 24px",
    textAlign: "center",
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
    padding: "20px 24px",
    verticalAlign: "middle"
  },
  
  tableCellCenter: {
    padding: "20px 24px",
    textAlign: "center",
    verticalAlign: "middle"
  },
  
  dateCell: {
    display: "flex",
    flexDirection: "column",
    gap: "2px"
  },
  
  dateMain: {
    fontSize: "14px",
    fontWeight: "600",
    color: "#1F2937"
  },
  
  dateYear: {
    fontSize: "12px",
    color: "#64748B"
  },
  
  lectureNumber: {
    fontSize: "14px",
    fontWeight: "500",
    color: "#374151",
    backgroundColor: "#F1F5F9",
    padding: "4px 8px",
    borderRadius: "6px",
    display: "inline-block"
  },
  
  presentBadge: {
    backgroundColor: "#DCFCE7",
    color: "#16A34A",
    padding: "6px 12px",
    borderRadius: "20px",
    fontSize: "12px",
    fontWeight: "600",
    display: "inline-flex",
    alignItems: "center",
    gap: "4px"
  },
  
  absentBadge: {
    backgroundColor: "#FEE2E2",
    color: "#DC2626",
    padding: "6px 12px",
    borderRadius: "20px",
    fontSize: "12px",
    fontWeight: "600",
    display: "inline-flex",
    alignItems: "center",
    gap: "4px"
  },
  
  timeText: {
    fontSize: "14px",
    color: "#64748B",
    fontFamily: "monospace"
  },
  
  reviewButton: {
    backgroundColor: "#173B66",
    color: "white",
    border: "none",
    padding: "8px 16px",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "12px",
    fontWeight: "600",
    transition: "all 0.2s ease",
    display: "inline-flex",
    alignItems: "center",
    gap: "4px"
  },
  
  noActionText: {
    color: "#9CA3AF",
    fontSize: "14px"
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
  
  tr:hover {
    background-color: #F8FAFC !important;
  }
  
  button:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
  }
`;
document.head.appendChild(styleSheet);

export default AttendanceHistory;
