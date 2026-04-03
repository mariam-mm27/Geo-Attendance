import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { auth, db } from "../../firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { onAuthStateChanged, signOut } from "firebase/auth";

const SessionAttendance = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [attendees, setAttendees] = useState([]);
  const [sessionInfo, setSessionInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        window.location.replace("/login");
        return;
      }
      try {
        // جيب تفاصيل الـ session
        const sessionQ = query(
          collection(db, "sessions"),
          where("sessionId", "==", sessionId)
        );
        const sessionSnap = await getDocs(sessionQ);
        if (!sessionSnap.empty) {
          setSessionInfo({ id: sessionSnap.docs[0].id, ...sessionSnap.docs[0].data() });
        }

        // جيب كل attendance records بتاعت الـ session دي
        const attendanceQ = query(
          collection(db, "attendance"),
          where("sessionId", "==", sessionId)
        );
        const attendanceSnap = await getDocs(attendanceQ);
        const data = attendanceSnap.docs
          .map((doc) => ({ id: doc.id, ...doc.data() }))
          .sort((a, b) => {
            if (!a.recordedAt) return 1;
            if (!b.recordedAt) return -1;
            return a.recordedAt.seconds - b.recordedAt.seconds;
          });
        setAttendees(data);
      } catch (err) {
        console.error("Error fetching attendance:", err);
      } finally {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, [sessionId]);

  const formatDate = (timestamp) => {
    if (!timestamp) return "—";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString("en-EG", {
      year: "numeric", month: "short", day: "numeric",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
    });
  };

  const handleLogout = async () => {
    await signOut(auth);
    localStorage.clear();
    sessionStorage.clear();
    window.location.replace("/login");
  };

  const filtered = attendees.filter((a) =>
    a.studentEmail?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ backgroundColor: "#F8FAFC", minHeight: "100vh" }}>
      {/* Sidebar */}
      {isSidebarOpen && (
        <div style={{
          position: "fixed", top: 0, left: 0, width: "250px", height: "100%",
          backgroundColor: "white", boxShadow: "2px 0 5px rgba(0,0,0,0.1)",
          zIndex: 1000, padding: "80px 20px"
        }}>
          <h3 style={{ color: "#173B66" }}>Settings</h3>
          <button onClick={() => navigate("/reset-password")} style={{
            display: "block", width: "100%", padding: "10px", margin: "10px 0",
            border: "1px solid #ddd", borderRadius: "5px", cursor: "pointer",
            textAlign: "left", background: "white"
          }}>
            🔑 Reset Password
          </button>
          <button onClick={() => setIsSidebarOpen(false)} style={{
            marginTop: "20px", color: "red", border: "none", background: "none", cursor: "pointer"
          }}>
            Close
          </button>
        </div>
      )}

      {/* Navbar */}
      <div style={{
        backgroundColor: "white", padding: "20px 40px",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
      }}>
        <div onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          style={{ cursor: "pointer", fontSize: "24px", color: "#173B66" }}>
          ☰
        </div>
        <button onClick={handleLogout} style={{
          backgroundColor: "#173B66", color: "white", border: "none",
          padding: "10px 24px", borderRadius: "8px", cursor: "pointer",
          fontWeight: "600", fontSize: "14px"
        }}>
          Log Out
        </button>
      </div>

      {/* Main Content */}
      <div style={{ padding: "50px 100px", maxWidth: "1600px", margin: "0 auto" }}>
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          style={{
            backgroundColor: "white", border: "1px solid #ddd", color: "#173B66",
            padding: "8px 20px", borderRadius: "8px", cursor: "pointer",
            fontWeight: "600", fontSize: "14px", marginBottom: "30px",
            display: "flex", alignItems: "center", gap: "6px"
          }}
        >
          ← Back
        </button>

        <h1 style={{
          color: "#173B66", fontSize: "36px", fontWeight: "700",
          textAlign: "center", marginBottom: "40px", marginTop: "0"
        }}>
          Session Attendance
        </h1>

        {/* Session Info Card */}
        {sessionInfo && (
          <div style={{
            backgroundColor: "white", padding: "35px 45px",
            borderRadius: "15px", boxShadow: "0 2px 4px rgba(0,0,0,0.08)",
            marginBottom: "40px"
          }}>
            <div style={{
              display: "flex", justifyContent: "space-between",
              alignItems: "center", flexWrap: "wrap", gap: "16px"
            }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "10px" }}>
                  <h2 style={{ color: "#173B66", margin: 0, fontSize: "22px", fontWeight: "700" }}>
                    {sessionInfo.courseName}
                  </h2>
                  <span style={{
                    backgroundColor: "#e0f2fe", color: "#173B66",
                    padding: "4px 10px", borderRadius: "6px",
                    fontSize: "12px", fontWeight: "bold"
                  }}>
                    {sessionInfo.courseCode}
                  </span>
                </div>
                <div style={{ lineHeight: "2" }}>
                  <p style={{ margin: "4px 0", color: "#64748b", fontSize: "14px" }}>
                    <strong style={{ fontWeight: "600", color: "#1E293B" }}>Lecture:</strong> #{sessionInfo.lectureNumber}
                  </p>
                  <p style={{ margin: "4px 0", color: "#64748b", fontSize: "14px" }}>
                    <strong style={{ fontWeight: "600", color: "#1E293B" }}>Session ID:</strong>{" "}
                    <span style={{ fontFamily: "monospace" }}>{sessionId}</span>
                  </p>
                  <p style={{ margin: "4px 0", color: "#64748b", fontSize: "14px" }}>
                    <strong style={{ fontWeight: "600", color: "#1E293B" }}>Created:</strong> {formatDate(sessionInfo.createdAt)}
                  </p>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
                <div style={{
                  backgroundColor: "#F0F9FF", padding: "20px 40px",
                  borderRadius: "12px", border: "1px solid #E0F2FE", textAlign: "center"
                }}>
                  <p style={{ margin: 0, fontSize: "42px", fontWeight: "800", color: "#173B66", lineHeight: 1 }}>
                    {attendees.length}
                  </p>
                  <p style={{ margin: "4px 0 0 0", color: "#64748b", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    Students Present
                  </p>
                </div>
                <span style={{
                  backgroundColor: sessionInfo.active ? "#dcfce7" : "#f1f5f9",
                  color: sessionInfo.active ? "#166534" : "#64748b",
                  padding: "6px 16px", borderRadius: "999px",
                  fontSize: "13px", fontWeight: "600"
                }}>
                  {sessionInfo.active ? "🟢 Active" : "⚫ Closed"}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Search */}
        <div style={{ marginBottom: "20px" }}>
          <input
            type="text"
            placeholder="🔍  Search by student email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              padding: "12px 16px", border: "1px solid #ddd", borderRadius: "8px",
              fontSize: "14px", width: "320px", outline: "none",
              backgroundColor: "white", color: "#1E293B"
            }}
          />
        </div>

        {/* Table */}
        {loading ? (
          <div style={{ textAlign: "center", padding: "60px" }}>
            <p style={{ color: "#64748b", fontSize: "16px" }}>Loading attendance...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{
            backgroundColor: "white", padding: "60px", borderRadius: "15px",
            boxShadow: "0 2px 4px rgba(0,0,0,0.08)", textAlign: "center"
          }}>
            <p style={{ color: "#64748b", fontSize: "18px", margin: 0 }}>
              {search ? "No students match your search." : "No attendance recorded for this session."}
            </p>
          </div>
        ) : (
          <div style={{
            backgroundColor: "white", borderRadius: "15px",
            boxShadow: "0 2px 4px rgba(0,0,0,0.08)", overflow: "hidden"
          }}>
            {/* Table Header */}
            <div style={{
              display: "grid", gridTemplateColumns: "0.3fr 2.5fr 2.5fr 2fr",
              padding: "16px 30px", backgroundColor: "#F0F9FF",
              borderBottom: "1px solid #E0F2FE"
            }}>
              {["#", "Student Email", "Student ID", "Recorded At"].map((h) => (
                <span key={h} style={{ fontSize: "13px", fontWeight: "700", color: "#173B66", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  {h}
                </span>
              ))}
            </div>

            {/* Table Rows */}
            {filtered.map((record, index) => (
              <div
                key={record.id}
                style={{
                  display: "grid", gridTemplateColumns: "0.3fr 2.5fr 2.5fr 2fr",
                  padding: "16px 30px", borderBottom: "1px solid #f1f5f9",
                  alignItems: "center",
                  backgroundColor: index % 2 === 0 ? "white" : "#FAFCFF"
                }}
              >
                <span style={{ fontSize: "14px", color: "#94a3b8", fontWeight: "700" }}>
                  {index + 1}
                </span>
                <span style={{ fontSize: "14px", color: "#1E293B", fontWeight: "500" }}>
                  {record.studentEmail}
                </span>
                <span style={{ fontSize: "13px", color: "#64748b", fontFamily: "monospace" }}>
                  {record.studentId}
                </span>
                <span style={{ fontSize: "13px", color: "#64748b" }}>
                  {formatDate(record.recordedAt)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SessionAttendance;