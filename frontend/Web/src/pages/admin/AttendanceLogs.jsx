import { useState } from "react";

const AttendanceLogs = ({ searchStudentLogs }) => {
  const [searchId, setSearchId] = useState("");
  const [logs, setLogs] = useState([]);
  const [studentInfo, setStudentInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState("");

  const handleSearch = async () => {
    const trimmed = searchId.trim();
    if (!trimmed) {
      setError("Please enter a Student ID.");
      return;
    }

    setLoading(true);
    setError("");
    setSearched(false);

    try {
      // 👇 هنا بقى الباك اتشال خالص
      const result = await searchStudentLogs(trimmed);

      if (!result.success) {
        setError(result.message);
        setLoading(false);
        return;
      }

      setStudentInfo(result.studentInfo);
      setLogs(result.logs);
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
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  return (
    <div>
      {/* UI 그대로 زي ما هو (نفس التصميم بتاعك) */}

      <div style={{ display: "flex", gap: "12px", marginBottom: "24px" }}>
        <input
          value={searchId}
          onChange={(e) => setSearchId(e.target.value)}
          placeholder="Enter Student ID"
        />

        <button onClick={handleSearch}>
          {loading ? "Searching..." : "Search"}
        </button>
      </div>

      {error && <p style={{ color: "red" }}>{error}</p>}

      {studentInfo && (
        <div>
          <p>{studentInfo.name}</p>
          <p>{studentInfo.studentId}</p>
          <p>{studentInfo.email}</p>
        </div>
      )}

      {searched && logs.length === 0 && (
        <p>No logs found</p>
      )}

      {logs.map((log, i) => (
        <div key={i}>
          <p>{log.courseName}</p>
          <p>{log.sessionId}</p>
          <p>{log.lectureNumber}</p>
          <p>{formatDate(log.recordedAt)}</p>
        </div>
      ))}
    </div>
  );
};

export default AttendanceLogs;