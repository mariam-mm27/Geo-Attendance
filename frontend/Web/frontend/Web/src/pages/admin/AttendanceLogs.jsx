 import { useState } from "react";
import { db } from "../../firebase";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";

const AttendanceLogs = ({ allCourses }) => {
  const [searchId, setSearchId]       = useState("");
  const [logs, setLogs]               = useState([]);
  const [studentInfo, setStudentInfo] = useState(null);
  const [loading, setLoading]         = useState(false);
  const [searched, setSearched]       = useState(false);
  const [error, setError]             = useState("");

  const handleSearch = async () => {
    const trimmed = searchId.trim();
    if (!trimmed) { setError("Please enter a Student ID."); return; }
    setError(""); setLoading(true); setSearched(false); setLogs([]); setStudentInfo(null);

    try {
      const usersSnap = await getDocs(
        query(collection(db, "users"), where("studentId", "==", trimmed))
      );
      if (usersSnap.empty) {
        setError(`No student found with ID "${trimmed}".`);
        setLoading(false); return;
      }

      const userDoc = usersSnap.docs[0];
      const uid = userDoc.id;
      setStudentInfo({ uid, ...userDoc.data() });

      const attSnap = await getDocs(
        query(collection(db, "attendance"), where("studentId", "==", uid))
      );

      const enriched = await Promise.all(
        attSnap.docs.map(async (d) => {
          const data = d.data();
          let sessionInfo = {};
          const sessSnap = await getDocs(
            query(collection(db, "sessions"), where("sessionId", "==", data.sessionId))
          );
          if (!sessSnap.empty) sessionInfo = sessSnap.docs[0].data();

          let courseName = data.courseId;
          if (data.courseId) {
            const courseSnap = await getDoc(doc(db, "courses", data.courseId));
            if (courseSnap.exists()) courseName = courseSnap.data().name || courseName;
          }

          return {
            id: d.id,
            sessionId: data.sessionId,
            courseName,
            lectureNumber: sessionInfo.lectureNumber || "—",
            recordedAt: data.recordedAt,
          };
        })
      );

      enriched.sort((a, b) => (b.recordedAt?.seconds ?? 0) - (a.recordedAt?.seconds ?? 0));
      setLogs(enriched);
      setSearched(true);
    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (ts) => {
    if (!ts) return "—";
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString("en-EG", {
      year: "numeric", month: "short", day: "numeric",
      hour: "2-digit", minute: "2-digit"
    });
  };

  return (
    <div>
      <div style={{ display: "flex", gap: "12px", alignItems: "center", marginBottom: "24px", flexWrap: "wrap" }}>
        <input
          type="text"
          placeholder="Enter Student ID (e.g. 20210001)"
          value={searchId}
          onChange={(e) => { setSearchId(e.target.value); setError(""); }}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          style={{
            padding: "12px 16px", border: "1px solid #ddd", borderRadius: "8px",
            fontSize: "14px", width: "280px", outline: "none", backgroundColor: "white", color: "#1E293B"
          }}
        />
        <button onClick={handleSearch} disabled={loading} style={{
          backgroundColor: loading ? "#94A3B8" : "#173B66", color: "white",
          border: "none", padding: "12px 28px", borderRadius: "8px",
          cursor: loading ? "not-allowed" : "pointer", fontWeight: "700", fontSize: "14px"
        }}>
          {loading ? "Searching..." : "🔍 Search"}
        </button>
        {searchId && (
          <button onClick={() => { setSearchId(""); setLogs([]); setStudentInfo(null); setSearched(false); setError(""); }}
            style={{
              backgroundColor: "white", border: "1px solid #ddd", color: "#64748b",
              padding: "12px 20px", borderRadius: "8px", cursor: "pointer", fontSize: "14px"
            }}>
            Clear
          </button>
        )}
      </div>

      {error && (
        <div style={{
          backgroundColor: "#FEE2E2", border: "1px solid #EF4444", borderRadius: "8px",
          padding: "12px 16px", marginBottom: "20px", color: "#991B1B", fontSize: "14px"
        }}>⚠️ {error}</div>
      )}

      {studentInfo && (
        <div style={{
          backgroundColor: "#F0F9FF", border: "1px solid #BAE6FD", borderRadius: "10px",
          padding: "16px 24px", marginBottom: "24px", display: "flex", gap: "40px", flexWrap: "wrap"
        }}>
          <div>
            <p style={{ margin: 0, fontSize: "12px", color: "#64748b", fontWeight: "600" }}>NAME</p>
            <p style={{ margin: "2px 0 0 0", fontSize: "15px", color: "#173B66", fontWeight: "700" }}>{studentInfo.name}</p>
          </div>
          <div>
            <p style={{ margin: 0, fontSize: "12px", color: "#64748b", fontWeight: "600" }}>STUDENT ID</p>
            <p style={{ margin: "2px 0 0 0", fontSize: "15px", color: "#173B66", fontWeight: "700", fontFamily: "monospace" }}>{studentInfo.studentId}</p>
          </div>
          <div>
            <p style={{ margin: 0, fontSize: "12px", color: "#64748b", fontWeight: "600" }}>EMAIL</p>
            <p style={{ margin: "2px 0 0 0", fontSize: "15px", color: "#173B66", fontWeight: "700" }}>{studentInfo.email}</p>
          </div>
          <div>
            <p style={{ margin: 0, fontSize: "12px", color: "#64748b", fontWeight: "600" }}>TOTAL RECORDS</p>
            <p style={{ margin: "2px 0 0 0", fontSize: "22px", color: "#173B66", fontWeight: "800" }}>{logs.length}</p>
          </div>
        </div>
      )}

      {searched && (
        logs.length === 0 ? (
          <div style={{
            backgroundColor: "white", padding: "40px", borderRadius: "12px",
            textAlign: "center", border: "1px solid #e2e8f0"
          }}>
            <p style={{ color: "#64748b", fontSize: "16px", margin: 0 }}>No attendance records found for this student.</p>
          </div>
        ) : (
          <div style={{ backgroundColor: "white", borderRadius: "12px", overflow: "hidden", border: "1px solid #e2e8f0" }}>
            <div style={{
              display: "grid", gridTemplateColumns: "0.4fr 2fr 1.2fr 2fr",
              padding: "14px 20px", backgroundColor: "#F0F9FF", borderBottom: "1px solid #E0F2FE"
            }}>
              {["#", "Course", "Lecture", "Recorded At"].map(h => (
                <span key={h} style={{ fontSize: "12px", fontWeight: "700", color: "#173B66", textTransform: "uppercase" }}>{h}</span>
              ))}
            </div>
            {logs.map((log, i) => (
              <div key={log.id} style={{
                display: "grid", gridTemplateColumns: "0.4fr 2fr 1.2fr 2fr",
                padding: "14px 20px", borderBottom: "1px solid #f1f5f9",
                backgroundColor: i % 2 === 0 ? "white" : "#FAFCFF", alignItems: "center"
              }}>
                <span style={{ fontSize: "13px", color: "#94a3b8", fontWeight: "700" }}>{i + 1}</span>
                <div>
                  <span style={{ fontSize: "14px", color: "#1E293B", fontWeight: "600" }}>{log.courseName}</span>
                  <br />
                  <span style={{ fontSize: "11px", color: "#94a3b8", fontFamily: "monospace" }}>{log.sessionId}</span>
                </div>
                <span style={{ fontSize: "13px", color: "#64748b" }}>#{log.lectureNumber}</span>
                <span style={{ fontSize: "13px", color: "#64748b" }}>{formatDate(log.recordedAt)}</span>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
};

export default AttendanceLogs;