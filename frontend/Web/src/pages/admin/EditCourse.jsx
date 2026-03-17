import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "../../firebase";
import { doc, getDoc, updateDoc, collection, getDocs } from "firebase/firestore";
import Modal from "../../components/Modal";
import { useModal } from "../../hooks/useModal";

const EditCourse = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [room, setRoom] = useState("");
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState("");
  const [professorId, setProfessorId] = useState("");
  const [professors, setProfessors] = useState([]);
  const [loading, setLoading] = useState(true);
  const { modalState, closeModal, showSuccess, showError, showWarning } = useModal();

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch course details
        const courseDoc = await getDoc(doc(db, "courses", courseId));
        if (courseDoc.exists()) {
          const courseData = courseDoc.data();
          setName(courseData.name || "");
          setCode(courseData.code || "");
          setRoom(courseData.room || "");
          setTime(courseData.time || "");
          setDuration(courseData.duration || "");
          setProfessorId(courseData.professorId || "");
        }

        const profsSnapshot = await getDocs(collection(db, "professors"));
        const profsData = profsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setProfessors(profsData);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [courseId]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!name.trim()) {
      showWarning("Please enter a course name");
      return;
    }
    if (!code.trim()) {
      showWarning("Please enter a course code");
      return;
    }
    if (!room.trim()) {
      showWarning("Please enter a room");
      return;
    }
    if (!time.trim()) {
      showWarning("Please enter a time");
      return;
    }
    if (!duration.trim()) {
      showWarning("Please enter a duration");
      return;
    }
    if (!professorId) {
      showWarning("Please select a professor");
      return;
    }

    try {
      const selectedProf = professors.find(p => p.id === professorId);
      const courseRef = doc(db, "courses", courseId);
      
      await updateDoc(courseRef, {
        name: name.trim(),
        code: code.trim(),
        room: room.trim(),
        time: time.trim(),
        duration: duration.trim(),
        professorId: professorId,
        professorEmail: selectedProf?.email || "",
        professorName: selectedProf?.name || "",
        updatedAt: new Date().toISOString()
      });

      showSuccess("Course updated successfully!", "Success", () => {
        navigate("/admin");
      });
    } catch (error) {
      console.error("Error updating course:", error);
      showError("Failed to update course");
    }
  };

  if (loading) {
    return <div style={styles.loader}>Loading...</div>;
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button onClick={() => navigate("/admin?tab=courses")} style={styles.backBtn}>
          ← Back to Admin
        </button>
        <h1 style={styles.title}>Edit Course</h1>
      </div>

      <div style={styles.card}>
        <form onSubmit={handleSubmit}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Course Name</label>
            <input 
              type="text"
              placeholder="Course Name" 
              value={name}
              onChange={e => setName(e.target.value)} 
              style={styles.input} 
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Course Code</label>
            <input 
              type="text"
              placeholder="Course Code (e.g., CS301)" 
              value={code}
              onChange={e => setCode(e.target.value)}
              style={styles.input} 
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Room</label>
            <input 
              type="text"
              placeholder="Room (e.g., Lab 5)" 
              value={room}
              onChange={e => setRoom(e.target.value)}
              style={styles.input} 
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Time</label>
            <input 
              type="text"
              placeholder="Time (e.g., 09:00 AM - 11:00 AM)" 
              value={time}
              onChange={e => setTime(e.target.value)}
              style={styles.input} 
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Duration</label>
            <input 
              type="text"
              placeholder="Duration (e.g., 2 hours)" 
              value={duration}
              onChange={e => setDuration(e.target.value)}
              style={styles.input} 
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Professor</label>
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
          </div>

          <div style={styles.buttonGroup}>
            <button type="submit" style={styles.saveBtn}>
              Save Changes
            </button>
            <button type="button" onClick={() => navigate("/admin")} style={styles.cancelBtn}>
              Cancel
            </button>
          </div>
        </form>
      </div>
      <Modal 
        isOpen={modalState.isOpen}
        onClose={closeModal}
        title={modalState.title}
        message={modalState.message}
        type={modalState.type}
        confirmText={modalState.confirmText}
        onConfirm={modalState.onConfirm}
      />
    </div>
  );
};

const styles = {
  container: { 
    minHeight: "100vh", 
    background: "#F8FAFC", 
    padding: "40px" 
  },
  header: { 
    marginBottom: "30px" 
  },
  backBtn: {
    background: "#173B66",
    color: "white",
    border: "none",
    padding: "10px 20px",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "bold",
    marginBottom: "20px"
  },
  title: { 
    color: "#173B66", 
    fontSize: "32px", 
    margin: 0 
  },
  card: { 
    background: "white", 
    padding: "40px", 
    borderRadius: "12px", 
    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
    maxWidth: "600px"
  },
  formGroup: {
    marginBottom: "25px"
  },
  label: {
    display: "block",
    color: "#173B66",
    fontSize: "14px",
    fontWeight: "bold",
    marginBottom: "8px"
  },
  input: { 
    width: "100%", 
    padding: "12px", 
    border: "1px solid #e2e8f0",
    borderRadius: "8px",
    fontSize: "14px",
    boxSizing: "border-box"
  },
  buttonGroup: {
    display: "flex",
    gap: "15px",
    marginTop: "30px"
  },
  saveBtn: { 
    flex: 1,
    background: "#173B66", 
    color: "white", 
    padding: "14px", 
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "bold",
    fontSize: "16px"
  }, 
  cancelBtn: { 
    flex: 1,
    background: "#e2e8f0", 
    color: "#64748b",
    padding: "14px", 
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "bold",
    fontSize: "16px"
  },
  loader: { 
    display: "flex", 
    justifyContent: "center", 
    alignItems: "center", 
    height: "100vh",
    fontSize: "18px",
    color: "#173B66",
    fontWeight: "bold"
  }
};

export default EditCourse;
