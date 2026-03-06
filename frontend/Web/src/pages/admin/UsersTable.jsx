import { useNavigate } from "react-router-dom";

const UsersTable = ({ data, onDelete }) => {
  const navigate = useNavigate();

  const handleDelete = (id, name) => {
    if (window.confirm(`Are you sure you want to delete ${name}?`)) {
      onDelete(id);
    }
  };

  const handleView = (id) => {
    navigate(`/details/std/${id}`);
  };

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
        <thead>
          <tr style={{ borderBottom: "2px solid #e2e8f0", background: "#F8FAFC" }}>
            <th style={{ ...styles.th, width: "20%" }}>Name</th>
            <th style={{ ...styles.th, width: "25%" }}>Email</th>
            <th style={{ ...styles.th, width: "12%", textAlign: "center" }}>Student ID</th>
            <th style={{ ...styles.th, width: "10%", textAlign: "center" }}>Details</th>
            <th style={{ ...styles.th, width: "12%", textAlign: "center" }}>Attendance</th>
            <th style={{ ...styles.th, width: "21%", textAlign: "center" }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan="6" style={{ ...styles.td, textAlign: "center", color: "#64748b" }}>
                No students found. Click "Add Student" to get started.
              </td>
            </tr>
          ) : (
            data.map(item => (
              <tr key={item.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                <td style={styles.td}>{item.name}</td>
                <td style={styles.td}>{item.email}</td>
                <td style={{ ...styles.td, textAlign: "center" }}>{item.code}</td>
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
  }
};

export default UsersTable;
