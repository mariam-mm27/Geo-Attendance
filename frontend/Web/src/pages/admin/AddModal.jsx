import { useState } from "react";

const AddModal = ({ type, onClose, onAdd, professors = [], onShowWarning }) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [room, setRoom] = useState("");
  const [hour, setHour] = useState("09");
  const [minute, setMinute] = useState("00");
  const [ampm, setAmpm] = useState("AM");
  const [duration, setDuration] = useState("");
  const [professorId, setProfessorId] = useState("");

  // Generate time options
  const hours = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
  const minutes = ['00', '15', '30', '45'];

  const getFormattedTime = () => {
    return `${hour}:${minute} ${ampm}`;
  };

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
      if (!duration) {
        if (onShowWarning) onShowWarning("Please select a duration");
        return;
      }
      if (!professorId) {
        if (onShowWarning) onShowWarning("Please select a professor");
        return;
      }

      const selectedProf = professors.find(p => p.id === professorId);
      const formattedTime = getFormattedTime();
      
      const newCourse = {
        name: name.trim(),
        code: code.trim(),
        room: room.trim(),
        time: formattedTime,
        duration: parseInt(duration),
        professorId: professorId,
        professorEmail: selectedProf?.email || selectedProf?.Email || "",
        professorName: selectedProf?.name || selectedProf?.Name || "",
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

    // ✅ التحقق من الباسورد للدكتور
    if (type === "professors") {
      if (!password.trim()) {
        if (onShowWarning) onShowWarning("Please enter a password");
        return;
      }
      if (password.trim().length < 6) {
        if (onShowWarning) onShowWarning("Password must be at least 6 characters");
        return;
      }
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

    // ✅ ضيف الباسورد للدكتور
    if (type === "professors") {
      newRecord.password = password.trim();
    }

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
            {/* Time Picker with Dropdowns */}
            <div style={styles.timePickerContainer}>
              <label style={styles.timeLabel}>Start Time:</label>
              <div style={styles.timePickerRow}>
                <select 
                  value={hour}
                  onChange={e => setHour(e.target.value)}
                  style={styles.timeSelect}
                >
                  {hours.map(h => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
                <span style={styles.timeSeparator}>:</span>
                <select 
                  value={minute}
                  onChange={e => setMinute(e.target.value)}
                  style={styles.timeSelect}
                >
                  {minutes.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
                <select 
                  value={ampm}
                  onChange={e => setAmpm(e.target.value)}
                  style={styles.timeSelect}
                >
                  <option value="AM">AM</option>
                  <option value="PM">PM</option>
                </select>
              </div>
              <div style={styles.timePreview}>
                🕒 Start time: <strong>{getFormattedTime()}</strong>
              </div>
            </div>
            <select 
              value={duration}
              onChange={e => setDuration(e.target.value)}
              style={styles.input}
            >
              <option value="">Select Duration</option>
              <option value="60">1 hour</option>
              <option value="120">2 hours</option>
              <option value="180">3 hours</option>
              <option value="240">4 hours</option>
              <option value="300">5 hours</option>
            </select>
            {duration && (
              <div style={styles.durationPreview}>
                ⏱️ Duration: <strong>{duration / 60} hour{duration / 60 !== 1 ? 's' : ''}</strong>
              </div>
            )}
            <select 
              value={professorId}
              onChange={e => setProfessorId(e.target.value)}
              style={styles.input}
            >
              <option value="">Select Professor</option>
              {professors.map(prof => (
                <option key={prof.id} value={prof.id}>
                  {prof.name || prof.Name || 'Unknown'} ({prof.email || prof.Email || 'No email'})
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

            {/* ✅ Password field للدكتور بس */}
            {type === "professors" && (
              <input 
                placeholder="Password (min 6 characters)" 
                value={password}
                onChange={e => setPassword(e.target.value)}
                style={styles.input} 
                type="password"
              />
            )}
            
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
  
  // Time Picker Styles
  timePickerContainer: {
    marginBottom: "15px"
  },
  timeLabel: {
    display: "block",
    marginBottom: "8px",
    color: "#173B66",
    fontSize: "14px",
    fontWeight: "600"
  },
  timePickerRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginBottom: "8px"
  },
  timeSelect: {
    padding: "8px 12px",
    border: "1px solid #e2e8f0",
    borderRadius: "6px",
    fontSize: "14px",
    backgroundColor: "white",
    cursor: "pointer",
    minWidth: "60px"
  },
  timeSeparator: {
    fontSize: "18px",
    fontWeight: "bold",
    color: "#173B66"
  },
  timePreview: {
    marginTop: "8px",
    padding: "8px 12px",
    backgroundColor: "#F0F9FF",
    border: "1px solid #E0F2FE",
    borderRadius: "6px",
    fontSize: "13px",
    color: "#173B66"
  },
  durationPreview: {
    marginTop: "8px",
    padding: "8px 12px",
    backgroundColor: "#F0FDF4",
    border: "1px solid #DCFCE7",
    borderRadius: "6px",
    fontSize: "13px",
    color: "#166534"
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