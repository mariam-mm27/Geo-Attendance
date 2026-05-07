import { useNavigate } from "react-router-dom";

const UsersTable = ({ data, onDelete, type = "students", allCourses = [], onConfirmDelete }) => {
  const navigate = useNavigate();

  const handleDelete = (id, name) => {
    if (onConfirmDelete) {
      onConfirmDelete(id, name, type);
    } else {
      onDelete(id);
    }
  };

  const handleView = (id) => {
    if (type === "students") {
      navigate(`/details/std/${id}`);
    } else if (type === "professors") {
      navigate(`/details/prof/${id}`);
    }
  };

  if (type === "courses") {
    return (
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #e2e8f0", background: "#F8FAFC" }}>
              <th style={{ ...styles.th, width: "20%" }}>Course Name</th>
              <th style={{ ...styles.th, width: "10%", textAlign: "center" }}>Code</th>
              <th style={{ ...styles.th, width: "12%" }}>Room</th>
              <th style={{ ...styles.th, width: "15%" }}>Time</th>
              <th style={{ ...styles.th, width: "10%", textAlign: "center" }}>Duration</th>
              <th style={{ ...styles.th, width: "15%" }}>Professor</th>
              <th style={{ ...styles.th, width: "8%", textAlign: "center" }}>Details</th>
              <th style={{ ...styles.th, width: "15%", textAlign: "center" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td colSpan="8" style={{ ...styles.td, textAlign: "center", color: "#64748b" }}>
                  No courses found. Click "Add Course" to get started.
                </td>
              </tr>
            ) : (
              data.map(item => (
                <tr key={item.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={styles.td}>{item.name}</td>
                  <td style={{ ...styles.td, textAlign: "center" }}>{item.code}</td>
                  <td style={styles.td}>{item.room}</td>
                  <td style={styles.td}>
                    {item.time ? (
                      <div style={styles.timeDisplay}>
                        <span style={styles.timeText}>
                          {item.time.includes('AM') || item.time.includes('PM') ? item.time : `${item.time} AM`}
                        </span>
                      </div>
                    ) : (
                      <span style={{ color: "#94a3b8", fontSize: "12px" }}>Not set</span>
                    )}
                  </td>
                  <td style={{ ...styles.td, textAlign: "center" }}>
                    {item.duration ? (
                      typeof item.duration === 'number' ? 
                        `${item.duration / 60} hour${item.duration / 60 !== 1 ? 's' : ''}` :
                        // Handle legacy text formats
                        item.duration.includes('hour') ? item.duration : `${item.duration} minutes`
                    ) : "-"}
                  </td>
                  <td style={styles.td}>{item.professorName}</td>
                  <td style={{ ...styles.td, textAlign: "center" }}>
                    <button 
                      style={styles.viewBtn} 
                      onClick={() => navigate(`/course-reports/${item.id}`)}
                      onMouseEnter={(e) => e.target.style.backgroundColor = '#0F2744'}
                      onMouseLeave={(e) => e.target.style.backgroundColor = '#173B66'}
                    >
                      View
                    </button>
                  </td>
                  <td style={{ ...styles.td, textAlign: "center" }}>
                    <div style={{ display: "flex", gap: "8px", justifyContent: "center", flexWrap: "wrap" }}>
                      <button 
                        onClick={() => navigate(`/enroll-students/${item.id}`)} 
                        style={styles.enrollBtn}
                      >
                        Enroll
                      </button>
                      <button 
                        onClick={() => navigate(`/edit-course/${item.id}`)} 
                        style={styles.editBtn}
                      >
                        Edit
                      </button>
                      <button 
                        onClick={() => handleDelete(item.id, item.name)} 
                        style={styles.deleteBtn}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    );
  }

  // For students and professors - table with different columns based on type
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
        <thead>
          <tr style={{ borderBottom: "2px solid #e2e8f0", background: "#F8FAFC" }}>
            <th style={{ ...styles.th, width: type === "professors" ? "15%" : "20%" }}>Name</th>
            <th style={{ ...styles.th, width: type === "professors" ? "20%" : "25%" }}>Email</th>
            {type === "students" && (
              <>
                <th style={{ ...styles.th, width: "10%", textAlign: "center" }}>ID</th>
                <th style={{ ...styles.th, width: "12%", textAlign: "center" }}>Attendance Rate</th>
              </>
            )}
            {type === "professors" && (
              <>
                <th style={{ ...styles.th, width: "10%", textAlign: "center" }}>Courses Count</th>
                <th style={{ ...styles.th, width: "12%", textAlign: "center" }}>Attendance Rate</th>
                <th style={{ ...styles.th, width: "12%", textAlign: "center" }}>Absent Rate</th>
              </>
            )}
            <th style={{ ...styles.th, width: type === "students" ? "10%" : "8%", textAlign: "center" }}>Details</th>
            <th style={{ ...styles.th, width: type === "students" ? "13%" : "13%", textAlign: "center" }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={type === "students" ? "6" : type === "professors" ? "7" : "4"} style={{ ...styles.td, textAlign: "center", color: "#64748b" }}>
                No {type} found. Click "Add {type === "students" ? "Student" : "Professor"}" to get started.
              </td>
            </tr>
          ) : (
            data.map(item => (
              <tr key={item.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                <td style={styles.td}>
                  <div style={styles.nameCell}>
                    <div style={styles.avatar}>
                      {(item.name || item.Name || 'U').charAt(0).toUpperCase()}
                    </div>
                    <span>{item.name || item.Name || 'Unknown'}</span>
                  </div>
                </td>
                <td style={styles.td}>{item.email || item.Email || 'No email'}</td>
                {type === "students" && (
                  <>
                    <td style={{ ...styles.td, textAlign: "center" }}>
                      {item.code || item.studentId || item.uid?.slice(-6) || 'N/A'}
                    </td>
                    <td style={{ ...styles.td, textAlign: "center" }}>
                      <span style={{
                        ...styles.attendanceBadge,
                        backgroundColor: item.attendanceRate === "N/A" || item.attendanceRate === "Error" 
                          ? "#f1f5f9" 
                          : parseFloat(item.attendanceRate) >= 75 
                            ? "#dcfce7" 
                            : parseFloat(item.attendanceRate) >= 50 
                              ? "#fef3c7" 
                              : "#fee2e2",
                        color: item.attendanceRate === "N/A" || item.attendanceRate === "Error"
                          ? "#64748b"
                          : parseFloat(item.attendanceRate) >= 75 
                            ? "#166534" 
                            : parseFloat(item.attendanceRate) >= 50 
                              ? "#92400e" 
                              : "#dc2626"
                      }}>
                        {item.attendanceRate || 'N/A'}
                      </span>
                    </td>
                  </>
                )}
                {type === "professors" && (
                  <>
                    <td style={{ ...styles.td, textAlign: "center" }}>
                      <span style={styles.courseCountBadge}>
                        {item.numberOfCourses || 0}
                      </span>
                    </td>
                    <td style={{ ...styles.td, textAlign: "center" }}>
                      <span style={{
                        ...styles.attendanceBadge,
                        backgroundColor: item.averageAttendanceRate === "N/A" || item.averageAttendanceRate === "Error" 
                          ? "#f1f5f9" 
                          : parseFloat(item.averageAttendanceRate) >= 75 
                            ? "#dcfce7" 
                            : parseFloat(item.averageAttendanceRate) >= 50 
                              ? "#fef3c7" 
                              : "#fee2e2",
                        color: item.averageAttendanceRate === "N/A" || item.averageAttendanceRate === "Error"
                          ? "#64748b"
                          : parseFloat(item.averageAttendanceRate) >= 75 
                            ? "#166534" 
                            : parseFloat(item.averageAttendanceRate) >= 50 
                              ? "#92400e" 
                              : "#dc2626"
                      }}>
                        {item.averageAttendanceRate || 'N/A'}
                      </span>
                    </td>
                    <td style={{ ...styles.td, textAlign: "center" }}>
                      <span style={{
                        ...styles.attendanceBadge,
                        backgroundColor: item.averageAbsentRate === "N/A" || item.averageAbsentRate === "Error" 
                          ? "#f1f5f9" 
                          : parseFloat(item.averageAbsentRate) >= 50 
                            ? "#fee2e2" 
                            : parseFloat(item.averageAbsentRate) >= 25 
                              ? "#fef3c7" 
                              : "#dcfce7",
                        color: item.averageAbsentRate === "N/A" || item.averageAbsentRate === "Error"
                          ? "#64748b"
                          : parseFloat(item.averageAbsentRate) >= 50 
                            ? "#dc2626" 
                            : parseFloat(item.averageAbsentRate) >= 25 
                              ? "#92400e" 
                              : "#166534"
                      }}>
                        {item.averageAbsentRate || 'N/A'}
                      </span>
                    </td>
                  </>
                )}
                <td style={{ ...styles.td, textAlign: "center" }}>
                  <button 
                    style={styles.viewBtn} 
                    onClick={() => handleView(item.id)}
                  >
                    View
                  </button>
                </td>
                <td style={{ ...styles.td, textAlign: "center" }}>
                  <button 
                    onClick={() => handleDelete(item.id, item.name || item.Name)} 
                    style={styles.deleteBtn}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

const styles = { 
  th: { 
    padding: "15px 10px", 
    textAlign: "left",
    color: "#173B66",
    fontWeight: "bold",
    fontSize: "14px"
  }, 
  td: { 
    padding: "15px 10px",
    color: "#334155",
    fontSize: "14px",
    wordBreak: "break-word"
  }, 
  
  // Name cell with avatar
  nameCell: {
    display: "flex",
    alignItems: "center",
    gap: "12px"
  },
  avatar: {
    width: "40px",
    height: "40px",
    borderRadius: "50%",
    backgroundColor: "#173B66",
    color: "white",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "16px",
    fontWeight: "600",
    flexShrink: 0
  },
  
  // Time display
  timeDisplay: {
    display: "flex",
    alignItems: "center",
    gap: "8px"
  },
  timeText: {
    backgroundColor: "#F0F9FF",
    color: "#173B66",
    padding: "4px 8px",
    borderRadius: "6px",
    fontSize: "12px",
    fontWeight: "600"
  },
  
  // Buttons
  viewBtn: { 
    background: "#173B66", 
    color: "white", 
    border: "none", 
    padding: "8px 16px", 
    cursor: "pointer", 
    borderRadius: "6px",
    fontSize: "13px",
    fontWeight: "500",
    transition: "background 0.2s",
    whiteSpace: "nowrap"
  },
  deleteBtn: {
    background: "#173B66", 
    color: "white", 
    border: "none", 
    padding: "8px 16px", 
    cursor: "pointer", 
    borderRadius: "6px",
    fontSize: "13px",
    fontWeight: "500",
    transition: "background 0.2s",
    whiteSpace: "nowrap"
  },
  enrollBtn: {
    background: "#173B66", 
    color: "white", 
    border: "none", 
    padding: "8px 16px", 
    cursor: "pointer", 
    borderRadius: "6px",
    fontSize: "13px",
    fontWeight: "500",
    transition: "background 0.2s",
    whiteSpace: "nowrap"
  },
  editBtn: {
    background: "#173B66", 
    color: "white", 
    border: "none", 
    padding: "8px 16px", 
    cursor: "pointer", 
    borderRadius: "6px",
    fontSize: "13px",
    fontWeight: "500",
    transition: "background 0.2s",
    whiteSpace: "nowrap"
  },
  courseBadge: {
    background: "#e0f2fe",
    color: "#173B66",
    padding: "2px 8px",
    borderRadius: "4px",
    fontSize: "11px",
    fontWeight: "bold",
    display: "inline-block"
  },
  courseCountBadge: {
    background: "#e0f2fe",
    color: "#173B66",
    padding: "4px 12px",
    borderRadius: "12px",
    fontSize: "13px",
    fontWeight: "bold",
    display: "inline-block"
  },
  attendanceBadge: {
    background: "#e0f2fe",
    color: "#173B66",
    padding: "4px 8px",
    borderRadius: "8px",
    fontSize: "12px",
    fontWeight: "bold",
    display: "inline-block"
  }
};

export default UsersTable;
