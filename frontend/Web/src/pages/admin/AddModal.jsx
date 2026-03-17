import { useState } from "react";

const AddModal = ({ type, onClose, onAdd, professors = [], onShowWarning }) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [room, setRoom] = useState("");
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState("");
  const [professorId, setProfessorId] = useState("");

  const validateEmail = (email) => {
    if (type === "professors") {
      return email.endsWith("@sci.cu.edu.eg");
    } else {
      return email.endsWith("@std.sci.cu.edu.eg");
    }
  };

  const handleSubmit = () => {
   
    if (!name.trim()) {
      if (onShowWarning) onShowWarning("Please enter a name");
      return;
    }

    if (type === "courses") {
      if (!code.trim()) {
        if (onShowWarning) onShowWarning("Please enter a course code");
        return;
      }
      if (!room.trim()) {
        if (onShowWarning) onShowWarning("Please enter a room");
        return;
      }
      if (!time.trim()) {
        if (onShowWarning) onShowWarning("Please enter a time");
        return;
      }
      if (!duration.trim()) {
        if (onShowWarning) onShowWarning("Please enter a duration");
        return;
      }
      if (!professorId) {
        if (onShowWarning) onShowWarning("Please select a professor");
        return;
      }

      const selectedProf = professors.find(p => p.id === professorId);
      const newCourse = {
        name: name.trim(),
        code: code.trim(),
        room: room.trim(),
        time: time.trim(),
        duration: duration.trim(),
        professorId: professorId,
        professorEmail: selectedProf?.email || "",
        professorName: selectedProf?.name || "",
        enrolledStudents: [],
        createdAt: new Date().toISOString()
      };
      onAdd(newCourse);
      return;
    }

    if (!email.trim()) {
      if (onShowWarning) onShowWarning("Please enter an email");
      return;
    }

    if (!validateEmail(email)) {
      if (type === "professors") {
        if (onShowWarning) onShowWarning("Professor email must end with @sci.cu.edu.eg");
      } else {
        if (onShowWarning) onShowWarning("Student email must end with @std.sci.cu.edu.eg");
      }
      return;
    }

    if (type === "students" && !code.trim()) {
      if (onShowWarning) onShowWarning("Please enter a student ID");
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
          Add {type === "professors" ? "Professor" : type === "students" ? "Student" : "Course"}
        </h3>
        
        {type === "courses" ? (
          <>
            <input 
              placeholder="Course Name" 
              value={name}
              onChange={e => setName(e.target.value)} 
              style={styles.input} 
            />
            <input 
              placeholder="Course Code (e.g., CS301)" 
              value={code}
              onChange={e => setCode(e.target.value)}
              style={styles.input} 
            />
            <input 
              placeholder="Room (e.g., Lab 5)" 
              value={room}
              onChange={e => setRoom(e.target.value)}
              style={styles.input} 
            />
            <input 
              placeholder="Time (e.g., 09:00 AM - 11:00 AM)" 
              value={time}
              onChange={e => setTime(e.target.value)}
              style={styles.input} 
            />
            <input 
              placeholder="Duration (e.g., 2 hours)" 
              value={duration}
              onChange={e => setDuration(e.target.value)}
              style={styles.input} 
            />
            <select 
              value={professorId}
              onChange={e => setProfessorId(e.target.value)}
              style={styles.input}
            >
              <option value="">Select Professor</option>
              {professors.map(prof => (
                <option key={prof.id} value={prof.id}>
                  {prof.name} ({prof.email})
                </option>
              ))}
            </select>
          </>
        ) : (
          <>
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
          </>
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