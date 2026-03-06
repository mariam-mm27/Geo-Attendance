import { useState } from "react";
import { toast } from "react-hot-toast";

const AddModal = ({ type, onClose, onAdd }) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");

  const validateEmail = (email) => {
    if (type === "professors") {
      return email.endsWith("@sci.cu.edu.eg");
    } else {
      return email.endsWith("@std.sci.cu.edu.eg");
    }
  };

  const handleSubmit = () => {
   
    if (!name.trim()) {
      toast.error("Please enter a name");
      return;
    }

    if (!email.trim()) {
      toast.error("Please enter an email");
      return;
    }

    if (!validateEmail(email)) {
      if (type === "professors") {
        toast.error("Professor email must end with @sci.cu.edu.eg");
      } else {
        toast.error("Student email must end with @std.sci.cu.edu.eg");
      }
      return;
    }

    if (type === "students" && !code.trim()) {
      toast.error("Please enter a student ID");
      return;
    }

    const newRecord = {
      name: name.trim(),
      email: email.trim(),
      courses: type === "professors" ? 0 : [],
      attendance: "0%",
      createdAt: new Date().toISOString()
    };

    if (type === "students") {
      newRecord.code = code.trim();
    }

    onAdd(newRecord);
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ color: "#173B66", marginTop: 0 }}>
          Add {type === "professors" ? "Professor" : "Student"}
        </h3>
        
        <input 
          placeholder="Full Name" 
          value={name}
          onChange={e => setName(e.target.value)} 
          style={styles.input} 
        />
        
        <input 
          placeholder={type === "professors" ? "Email (@sci.cu.edu.eg)" : "Email (@std.sci.cu.edu.eg)"} 
          value={email}
          onChange={e => setEmail(e.target.value)}
          style={styles.input} 
          type="email"
        />
        
        {type === "students" && (
          <input 
            placeholder="Student ID (Code)" 
            value={code}
            onChange={e => setCode(e.target.value)}
            style={styles.input} 
          />
        )}
        
        <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
          <button onClick={handleSubmit} style={styles.saveBtn}>
            Save Record
          </button>
          <button onClick={onClose} style={styles.cancelBtn}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
const styles = {
  overlay: { 
    position: "fixed", 
    top: 0, 
    left: 0, 
    width: "100%", 
    height: "100%", 
    background: "rgba(0,0,0,0.5)", 
    display: "flex", 
    justifyContent: "center", 
    alignItems: "center",
    zIndex: 1000
  },
  modal: { 
    background: "white", 
    padding: "30px", 
    borderRadius: "12px", 
    width: "400px", 
    boxShadow: "0 4px 6px rgba(0,0,0,0.1)"
  },
  input: { 
    width: "100%", 
    padding: "12px", 
    marginBottom: "15px",
    border: "1px solid #e2e8f0",
    borderRadius: "8px",
    fontSize: "14px",
    boxSizing: "border-box"
  }, 
  saveBtn: { 
    flex: 1,
    background: "#173B66", 
    color: "white", 
    padding: "12px", 
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "bold",
    fontSize: "14px"
  }, 
  cancelBtn: { 
    flex: 1,
    background: "#e2e8f0", 
    color: "#64748b",
    padding: "12px", 
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "bold",
    fontSize: "14px"
  }
};
export default AddModal;