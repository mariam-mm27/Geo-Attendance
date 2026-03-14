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

  return (
    <div style={{ backgroundColor: "#F8FAFC", minHeight: "100vh" }}>
      {/* Navbar */}
      <div style={{ 
        backgroundColor: "white",
        padding: "20px 40px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
      }}>
        <button 
          onClick={() => navigate("/student")}
          style={{ 
            backgroundColor: "transparent",
            border: "none",
            color: "#173B66",
            cursor: "pointer",
            fontSize: "24px",
            fontWeight: "bold"
          }}
        >
          ← Back
        </button>
        
        <h2 style={{ color: "#173B66", margin: 0 }}>Attendance History</h2>
        <div style={{ width: "60px" }}></div>
      </div>


      {/* Main Content */}
      <div style={{ padding: "50px 100px", maxWidth: "1200px", margin: "0 auto" }}>
        <h1 style={{ 
          color: "#173B66", 
          fontSize: "32px", 
          fontWeight: "700", 
          marginBottom: "10px"
        }}>
          {courseName}
        </h1>
        <p style={{ color: "#64748B", fontSize: "16px", marginBottom: "40px" }}>
          View all attendance sessions and your status
        </p>

        {loading ? (
          <div style={{ textAlign: "center", padding: "60px" }}>
            <p style={{ color: "#64748B", fontSize: "18px" }}>Loading attendance history...</p>
          </div>
        ) : sessions.length === 0 ? (
          <div style={{
            backgroundColor: "white",
            padding: "60px",
            borderRadius: "15px",
            boxShadow: "0 2px 4px rgba(0,0,0,0.08)",
            textAlign: "center"
          }}>
            <p style={{ color: "#64748B", fontSize: "18px", margin: 0 }}>
              No attendance sessions recorded yet for this course.
            </p>
          </div>
        ) : (
          <div style={{ backgroundColor: "white", borderRadius: "15px", boxShadow: "0 2px 4px rgba(0,0,0,0.08)", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ backgroundColor: "#173B66", color: "white" }}>
                  <th style={{ padding: "20px", textAlign: "left", fontWeight: "600" }}>Session Date</th>
                  <th style={{ padding: "20px", textAlign: "left", fontWeight: "600" }}>Lecture #</th>
                  <th style={{ padding: "20px", textAlign: "center", fontWeight: "600" }}>Status</th>
                  <th style={{ padding: "20px", textAlign: "left", fontWeight: "600" }}>Time Recorded</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((session, index) => (
                  <tr key={index} style={{ borderBottom: "1px solid #E2E8F0" }}>
                    <td style={{ padding: "20px", color: "#1E293B" }}>
                      {new Date(session.date).toLocaleDateString('en-US', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </td>
                    <td style={{ padding: "20px", color: "#64748B" }}>
                      Lecture {session.lectureNumber || index + 1}
                    </td>
                    <td style={{ padding: "20px", textAlign: "center" }}>
                      {session.attended ? (
                        <span style={{
                          backgroundColor: "#E0F2FE",
                          color: "#173B66",
                          padding: "6px 16px",
                          borderRadius: "20px",
                          fontSize: "14px",
                          fontWeight: "600"
                        }}>
                          ✅ Present
                        </span>
                      ) : (
                        <span style={{
                          backgroundColor: "#FEE2E2",
                          color: "#991B1B",
                          padding: "6px 16px",
                          borderRadius: "20px",
                          fontSize: "14px",
                          fontWeight: "600"
                        }}>
                          ❌ Absent
                        </span>
                      )}
                    </td>
                    <td style={{ padding: "20px", color: "#64748B" }}>
                      {session.attended && session.recordedAt ? 
                        new Date(session.recordedAt).toLocaleTimeString('en-US', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        }) : 
                        '-'
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AttendanceHistory;
