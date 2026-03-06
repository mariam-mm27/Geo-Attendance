import React, { useState } from "react";
const UsersTable = () => {
  const [data, setData] = useState([{ id: 1, name: "Mariam", email: "m@std.sci.cu.edu.eg", code: "2026001", attendance: "98%" }]);
  const handleDelete = (id) => { setData(data.filter(item => item.id !== id)); alert("تم الحذف بنجاح!"); };
  return (
    <table style={{ width: "100%", borderCollapse: "collapse" }}>
      <thead><tr style={{ borderBottom: "2px solid #F1F5F9" }}><th style={styles.th}>Name</th><th style={styles.th}>Email</th><th style={styles.th}>ID</th><th style={styles.th}>Attendance</th><th style={styles.th}>Actions</th></tr></thead>
      <tbody>{data.map(item => (
        <tr key={item.id} style={{ borderBottom: "1px solid #F1F5F9" }}>
          <td style={styles.td}>{item.name}</td><td style={styles.td}>{item.email}</td><td style={styles.td}>{item.code}</td><td style={styles.td}>{item.attendance}</td>
          <td style={styles.td}><button style={styles.btn} onClick={() => window.location.href=`/details/std/${item.id}`}>View</button><button onClick={() => handleDelete(item.id)} style={styles.btn}>Delete</button></td>
        </tr>
      ))}</tbody>
    </table>
  );
};
const styles = { th: { padding: "15px", textAlign: "left" }, td: { padding: "15px" }, btn: { background: "#173B66", color: "white", border: "none", padding: "6px 12px", margin: "0 5px", borderRadius: "4px", cursor: "pointer" } };
export default UsersTable;