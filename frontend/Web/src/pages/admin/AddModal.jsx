import React, { useState } from "react";
const AddModal = ({ type, onClose, onAdd }) => {
  const [name, setName] = useState("");
  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <h3>Add {type === "professors" ? "Professor" : "Student"}</h3>
        <input placeholder="Name" onChange={e => setName(e.target.value)} style={styles.input} />
        <input placeholder="Email" style={styles.input} />
        {type === "students" && <input placeholder="Code" style={styles.input} />}
        <button onClick={() => { onAdd({ id: Date.now(), name, attendance: "0%" }); onClose(); }} style={styles.saveBtn}>Save Record</button>
        <button onClick={onClose} style={styles.cancelBtn}>Cancel</button>
      </div>
    </div>
  );
};
const styles = {
  overlay: { position: "fixed", top:0, left:0, width:"100%", height:"100%", background:"rgba(0,0,0,0.5)", display:"flex", justifyContent:"center", alignItems:"center" },
  modal: { background:"white", padding:"20px", borderRadius:"10px", width:"300px", display:"flex", flexDirection:"column", gap:"10px" },
  input: { padding:"10px" }, saveBtn: { background:"#173B66", color:"white", padding:"10px", border:"none" }, cancelBtn: { background:"#ccc", padding:"10px", border:"none" }
};
export default AddModal;