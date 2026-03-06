import React from "react";
const SubjectsTable = ({ data, setData }) => {
  const handleDelete = (id) => { setData(data.filter(item => item.id !== id)); alert("تم الحذف بنجاح!"); };
  return (
    <table style={{ width: "100%", borderCollapse: "collapse" }}>
      <thead><tr style={{ borderBottom: "2px solid #ddd" }}><th style={styles.th}>Name</th><th style={styles.th}>Email</th><th style={styles.th}>Courses</th><th style={styles.th}>Attendance</th><th style={styles.th}>Actions</th></tr></thead>
      <tbody>{data.map(item => (
        <tr key={item.id} style={{ borderBottom: "1px solid #eee" }}>
          <td style={styles.td}>{item.name}</td><td style={styles.td}>{item.email}</td><td style={styles.td}>{item.courses}</td><td style={styles.td}>{item.attendance}</td>
          <td style={styles.td}>
            <button style={styles.btn} onClick={() => window.location.href=`/details/prof/${item.id}`}>View</button>
            <button onClick={() => handleDelete(item.id)} style={{...styles.btn, background: "#dc2626"}}>Delete</button>
          </td>
        </tr>
      ))}</tbody>
    </table>
  );
};
const styles = { th: { padding: "15px", textAlign: "left" }, td: { padding: "15px" }, btn: { background: "#173B66", color: "white", border: "none", padding: "5px 10px", margin: "0 5px", cursor: "pointer", borderRadius: "4px" } };
export default SubjectsTable;