import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../../firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { onAuthStateChanged, signOut } from "firebase/auth";

const SessionsList = () => {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        window.location.replace("/login");
        return;
      }
      try {
        const attendanceRef = collection(db, "attendance");
        const q = query(attendanceRef, where("studentId", "==", user.uid));
        const attendanceSnap = await getDocs(q);
        const attendanceList = attendanceSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        const sessionIds = [...new Set(attendanceList.map((a) => a.sessionId))];
        const sessionsSnap = await getDocs(collection(db, "sessions"));
        const allSessions = sessionsSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        const studentSessions = allSessions
          .filter((s) => sessionIds.includes(s.sessionId))
          .map((s) => {
            const record = attendanceList.find((a) => a.sessionId === s.sessionId);
            return { ...s, recordedAt: record?.recordedAt || null };
          })
          .sort((a, b) => {
            if (!a.recordedAt) return 1;
            if (!b.recordedAt) return -1;
            return b.recordedAt.seconds - a.recordedAt.seconds;
          });

        setSessions(studentSessions);
      } catch (err) {
        console.error("Error fetching sessions:", err);
      } finally {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const formatDate = (timestamp) => {
    if (!timestamp) return "—";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString("en-EG", {
      year: "numeric", month: "short", day: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  };

  const handleLogout = async () => {
    await signOut(auth);
    localStorage.clear();
    sessionStorage.clear();
    window.location.replace("/login");
  };

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
        <button
          onClick={() => navigate("/student")}
          style={{
            backgroundColor: "white", border: "1px solid #ddd", color: "#173B66",
            padding: "8px 20px", borderRadius: "8px", cursor: "pointer",
            fontWeight: "600", fontSize: "14px", marginBottom: "30px",
            display: "flex", alignItems: "center", gap: "6px"
          }}
        >
          ← Back to Dashboard
        </button>

        <h1 style={{
          color: "#173B66", fontSize: "36px", fontWeight: "700",
          textAlign: "center", marginBottom: "50px", marginTop: "0"
        }}>
          My Sessions History
        </h1>

        {loading ? (
          <div style={{ textAlign: "center", padding: "60px" }}>
            <p style={{ color: "#64748b", fontSize: "16px" }}>Loading sessions...</p>
          </div>
        ) : sessions.length === 0 ? (
          <div style={{
            backgroundColor: "white", padding: "60px", borderRadius: "15px",
            boxShadow: "0 2px 4px rgba(0,0,0,0.08)", textAlign: "center"
          }}>
            <span style={{ fontSize: "64px", display: "block", marginBottom: "20px" }}>📋</span>
            <p style={{ color: "#64748b", fontSize: "18px", margin: 0 }}>
              No sessions recorded yet.
            </p>
            <p style={{ color: "#94a3b8", fontSize: "14px", marginTop: "10px" }}>
              Scan a QR code in your next lecture to record your attendance.
            </p>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", alignItems: "center", marginBottom: "30px", gap: "12px" }}>
              <h2 style={{ color: "#173B66", margin: 0, fontSize: "24px", fontWeight: "700" }}>
                Attended Sessions
              </h2>
              <span style={{
                backgroundColor: "#e0f2fe", color: "#173B66",
                padding: "4px 14px", borderRadius: "999px",
                fontSize: "13px", fontWeight: "700"
              }}>
                {sessions.length} sessions
              </span>
            </div>

            <div style={{
              display: "grid", gridTemplateColumns: "repeat(3, 1fr)",
              gap: "30px", marginBottom: "50px"
            }}>
              {sessions.map((session) => (
                <div key={session.id} style={{
                  backgroundColor: "white", padding: "30px",
                  borderRadius: "15px", boxShadow: "0 2px 4px rgba(0,0,0,0.08)"
                }}>
                  <div style={{
                    display: "flex", justifyContent: "space-between",
                    alignItems: "flex-start", marginBottom: "15px"
                  }}>
                    <h3 style={{
                      color: "#173B66", fontSize: "20px", fontWeight: "700",
                      marginTop: "0", marginBottom: "0", flex: 1
                    }}>
                      {session.courseName}
                    </h3>
                    <span style={{
                      backgroundColor: "#e0f2fe", color: "#173B66",
                      padding: "4px 10px", borderRadius: "6px",
                      fontSize: "12px", fontWeight: "bold", marginLeft: "10px"
                    }}>
                      {session.courseCode}
                    </span>
                  </div>

                  <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: "15px", marginBottom: "15px" }}>
                    <p style={{ margin: "8px 0", color: "#64748b", fontSize: "14px", display: "flex", alignItems: "center" }}>
                      <span style={{ marginRight: "8px" }}>📖</span>
                      <strong style={{ fontWeight: "600", marginRight: "5px" }}>Lecture:</strong>
                      #{session.lectureNumber}
                    </p>
                    <p style={{ margin: "8px 0", color: "#64748b", fontSize: "14px", display: "flex", alignItems: "center" }}>
                      <span style={{ marginRight: "8px" }}>🆔</span>
                      <strong style={{ fontWeight: "600", marginRight: "5px" }}>Session ID:</strong>
                      <span style={{ fontFamily: "monospace", fontSize: "12px" }}>{session.sessionId}</span>
                    </p>
                  </div>

                  <div style={{
                    padding: "15px", backgroundColor: "#F0F9FF",
                    borderRadius: "8px", border: "1px solid #E0F2FE", marginBottom: "15px"
                  }}>
                    <span style={{ fontSize: "14px", color: "#173B66", fontWeight: "600" }}>
                      ✅ Attended
                    </span>
                    <p style={{ margin: "6px 0 0 0", color: "#64748b", fontSize: "13px" }}>
                      {formatDate(session.recordedAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default SessionsList;