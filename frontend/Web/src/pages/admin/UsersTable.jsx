import { useNavigate } from "react-router-dom";

const UsersTable = ({ data, onDelete, type = "students", allCourses = [] }) => {
  const navigate = useNavigate();

  const handleDelete = (id, name) => {
    const itemType = type === "courses" ? "course" : "student";
    if (window.confirm(`Are you sure you want to delete ${name}?`)) {
      onDelete(id);
    }
  };

  const handleView = (id) => {
    navigate(`/details/std/${id}`);
  };

  const getEnrolledCourses = (studentId) => {
    return allCourses.filter(course => 
      (course.enrolledStudents || []).includes(studentId)
    );
  };

  if (type === "courses") {
    return (
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #e2e8f0", background: "#F8FAFC" }}>
              <th style={{ ...styles.th, width: "16%" }}>Course Name</th>
              <th style={{ ...styles.th, width: "8%", textAlign: "center" }}>Code</th>
              <th style={{ ...styles.th, width: "10%" }}>Room</th>
              <th style={{ ...styles.th, width: "13%" }}>Time</th>
              <th style={{ ...styles.th, width: "8%", textAlign: "center" }}>Duration</th>
              <th style={{ ...styles.th, width: "13%" }}>Professor</th>
              <th style={{ ...styles.th, width: "8%", textAlign: "center" }}>Reports</th>
              <th style={{ ...styles.th, width: "24%", textAlign: "center" }}>Actions</th>
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
                  <td style={styles.td}>{item.time}</td>
                  <td style={{ ...styles.td, textAlign: "center" }}>{item.duration || "-"}</td>
                  <td style={styles.td}>{item.professorName}</td>
                  <td style={{ ...styles.td, textAlign: "center" }}>
                    <button 
                      style={styles.viewBtn} 
                      onClick={() => navigate(`/course-reports/${item.id}`)}
                    >
                      View
                    </button>
                  </td>
                  <td style={{ ...styles.td, textAlign: "center", display: "flex", gap: "8px", justifyContent: "center" }}>
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
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
        <thead>
          <tr style={{ borderBottom: "2px solid #e2e8f0", background: "#F8FAFC" }}>
            <th style={{ ...styles.th, width: "18%" }}>Name</th>
            <th style={{ ...styles.th, width: "22%" }}>Email</th>
            <th style={{ ...styles.th, width: "10%", textAlign: "center" }}>Student ID</th>
            <th style={{ ...styles.th, width: "15%" }}>Enrolled Courses</th>
            <th style={{ ...styles.th, width: "8%", textAlign: "center" }}>Details</th>
            <th style={{ ...styles.th, width: "10%", textAlign: "center" }}>Attendance</th>
            <th style={{ ...styles.th, width: "17%", textAlign: "center" }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan="7" style={{ ...styles.td, textAlign: "center", color: "#64748b" }}>
                No students found. Click "Add Student" to get started.
              </td>
            </tr>
          ) : (
            data.map(item => {
              const enrolledCourses = getEnrolledCourses(item.id);
              return (
                <tr key={item.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={styles.td}>{item.name}</td>
                  <td style={styles.td}>{item.email}</td>
                  <td style={{ ...styles.td, textAlign: "center" }}>{item.code}</td>
                  <td style={styles.td}>
                    {enrolledCourses.length > 0 ? (
                      <span style={styles.courseCountBadge}>
                        {enrolledCourses.length}
                      </span>
                    ) : (
                      <span style={{ color: "#94a3b8", fontSize: "12px" }}>0</span>
                    )}
                  </td>
                  <td style={{ ...styles.td, textAlign: "center" }}>
                    <button 
                      style={styles.viewBtn} 
                      onClick={() => handleView(item.id)}
                    >
                      View
                    </button>
                  </td>
                  <td style={{ ...styles.td, textAlign: "center" }}>{item.attendance || "0%"}</td>
                  <td style={{ ...styles.td, textAlign: "center" }}>
                    <button 
                      onClick={() => handleDelete(item.id, item.name)} 
                      style={styles.deleteBtn}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              );
            })
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
  }
};

export default UsersTable;
