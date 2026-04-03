import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../../firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { onAuthStateChanged, signOut } from "firebase/auth";

const CourseSessions = () => {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        window.location.replace("/login");
        return;
      }
      try {
        const sessionsRef = collection(db, "sessions");
        const q = query(sessionsRef, where("professorId", "==", user.uid));
        const snap = await getDocs(q);
        const data = snap.docs
          .map((doc) => ({ id: doc.id, ...doc.data() }))
          .sort((a, b) => {
            if (!a.createdAt) return 1;
            if (!b.createdAt) return -1;
            return b.createdAt.seconds - a.createdAt.seconds;
          });
        setSessions(data);
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

  const filtered = sessions.filter((s) => {
    if (filter === "active") return s.active === true;
    if (filter === "closed") return s.active === false;
    return true;
  });

  // Group by courseCode
  const grouped = filtered.reduce((acc, session) => {
    const key = session.courseCode || "Unknown";
    if (!acc[key]) acc[key] = { courseName: session.courseName, sessions: [] };
    acc[key].sessions.push(session);
    return acc;
  }, {});

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
        <h1 style={{
          color: "#173B66", fontSize: "36px", fontWeight: "700",
          textAlign: "center", marginBottom: "50px", marginTop: "0"
        }}>
          Course Sessions
        </h1>

        {/* Filter + Count */}
        <div style={{
          display: "flex", justifyContent: "space-between",
          alignItems: "center", marginBottom: "30px", flexWrap: "wrap", gap: "16px"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <h2 style={{ color: "#173B66", margin: 0, fontSize: "24px", fontWeight: "700" }}>
              All Sessions
            </h2>
            <span style={{
              backgroundColor: "#e0f2fe", color: "#173B66",
              padding: "4px 14px", borderRadius: "999px",
              fontSize: "13px", fontWeight: "700"
            }}>
              {sessions.length} total
            </span>
          </div>

          <div style={{ display: "flex", gap: "8px" }}>
            {["all", "active", "closed"].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  padding: "8px 20px",
                  borderRadius: "8px",
                  border: "1px solid #ddd",
                  backgroundColor: filter === f ? "#173B66" : "white",
                  color: filter === f ? "white" : "#64748b",
                  cursor: "pointer",
                  fontWeight: "600",
                  fontSize: "13px",
                }}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "60px" }}>
            <p style={{ color: "#64748b", fontSize: "16px" }}>Loading sessions...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{
            backgroundColor: "white", padding: "60px", borderRadius: "15px",
            boxShadow: "0 2px 4px rgba(0,0,0,0.08)", textAlign: "center"
          }}>
            <p style={{ color: "#64748b", fontSize: "18px", margin: 0 }}>No sessions found.</p>
          </div>
        ) : (
          Object.entries(grouped).map(([code, { courseName, sessions: groupSessions }]) => (
            <div key={code} style={{ marginBottom: "40px" }}>
              {/* Course Header */}
              <div style={{
                display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px"
              }}>
                <span style={{
                  backgroundColor: "#e0f2fe", color: "#173B66",
                  padding: "4px 10px", borderRadius: "6px",
                  fontSize: "12px", fontWeight: "bold"
                }}>
                  {code}
                </span>
                <h3 style={{ color: "#173B66", margin: 0, fontSize: "18px", fontWeight: "700" }}>
                  {courseName}
                </h3>
                <span style={{ color: "#64748b", fontSize: "13px", marginLeft: "auto" }}>
                  {groupSessions.length} sessions
                </span>
              </div>

              {/* Sessions Cards */}
              <div style={{
                display: "grid", gridTemplateColumns: "repeat(3, 1fr)",
                gap: "24px", marginBottom: "10px"
              }}>
                {groupSessions.map((session) => (
                  <div key={session.id} style={{
                    backgroundColor: "white", padding: "24px",
                    borderRadius: "15px", boxShadow: "0 2px 4px rgba(0,0,0,0.08)"
                  }}>
                    <div style={{
                      display: "flex", justifyContent: "space-between",
                      alignItems: "center", marginBottom: "15px"
                    }}>
                      <span style={{
                        color: "#173B66", fontFamily: "monospace",
                        fontSize: "13px", fontWeight: "700"
                      }}>
                        {session.sessionId}
                      </span>
                      <span style={{
                        backgroundColor: session.active ? "#dcfce7" : "#f1f5f9",
                        color: session.active ? "#166534" : "#64748b",
                        padding: "4px 12px", borderRadius: "999px",
                        fontSize: "12px", fontWeight: "600"
                      }}>
                        {session.active ? "🟢 Active" : "⚫ Closed"}
                      </span>
                    </div>

                    <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: "15px", marginBottom: "15px" }}>
                      <p style={{ margin: "8px 0", color: "#64748b", fontSize: "14px", display: "flex", alignItems: "center" }}>
                        <span style={{ marginRight: "8px" }}>📖</span>
                        <strong style={{ fontWeight: "600", marginRight: "5px" }}>Lecture:</strong>
                        #{session.lectureNumber}
                      </p>
                      <p style={{ margin: "8px 0", color: "#64748b", fontSize: "14px", display: "flex", alignItems: "center" }}>
                        <span style={{ marginRight: "8px" }}>🕒</span>
                        <strong style={{ fontWeight: "600", marginRight: "5px" }}>Created:</strong>
                        {formatDate(session.createdAt)}
                      </p>
                      <p style={{ margin: "8px 0", color: "#64748b", fontSize: "14px", display: "flex", alignItems: "center" }}>
                        <span style={{ marginRight: "8px" }}>⏱️</span>
                        <strong style={{ fontWeight: "600", marginRight: "5px" }}>Expires:</strong>
                        {formatDate(session.expiresAt)}
                      </p>
                    </div>

                    <button
                      onClick={() => navigate(`/professor/sessions/${session.sessionId}/attendance`)}
                      style={{
                        backgroundColor: "#173B66", border: "none", color: "white",
                        padding: "10px", borderRadius: "6px", cursor: "pointer",
                        width: "100%", fontSize: "14px", fontWeight: "600"
                      }}
                      onMouseEnter={(e) => e.target.style.backgroundColor = "#0F2744"}
                      onMouseLeave={(e) => e.target.style.backgroundColor = "#173B66"}
                    >
                      📋 View Attendance
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default CourseSessions;