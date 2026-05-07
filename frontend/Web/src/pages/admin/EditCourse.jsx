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
  const [timeHour, setTimeHour] = useState("09");
  const [timeMinute, setTimeMinute] = useState("00");
  const [timePeriod, setTimePeriod] = useState("AM");
  const [duration, setDuration] = useState("");
  const [professorId, setProfessorId] = useState("");
  const [professors, setProfessors] = useState([]);
  const [loading, setLoading] = useState(true);
  const { modalState, closeModal, showSuccess, showError, showWarning } = useModal();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const courseDoc = await getDoc(doc(db, "courses", courseId));
        if (courseDoc.exists()) {
          const courseData = courseDoc.data();
          setName(courseData.name || "");
          setCode(courseData.code || "");
          setRoom(courseData.room || "");
          setDuration(courseData.duration || "");
          setProfessorId(courseData.professorId || "");

          // Parse existing time string e.g. "09:00 AM"
          const existingTime = courseData.time || "";
          const match = existingTime.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
          if (match) {
            setTimeHour(match[1].padStart(2, "0"));
            setTimeMinute(match[2]);
            setTimePeriod(match[3].toUpperCase());
          }
        }

        // Fetch professors from both professors collection and users collection
        const professorsData = [];
        
        // Get from professors collection
        const profsSnapshot = await getDocs(collection(db, "professors"));
        profsSnapshot.docs.forEach(doc => {
          professorsData.push({
            id: doc.id,
            source: "professors",
            ...doc.data()
          });
        });
        
        // Get from users collection with professor role
        const usersSnapshot = await getDocs(collection(db, "users"));
        usersSnapshot.docs.forEach(doc => {
          const userData = doc.data();
          const userRole = (userData.role || userData.Role || "").toLowerCase();
          const userName = userData.name || userData.Name || "Unknown";
          const userEmail = userData.email || userData.Email || "Unknown";
          
          if (userRole === "professor" || userRole === "prof") {
            // Check if this professor is not already in the professors collection
            const existingProf = professorsData.find(p => {
              const pEmail = (p.email || p.Email || "").toLowerCase();
              const uEmail = userEmail.toLowerCase();
              return pEmail === uEmail;
            });
            
            if (!existingProf) {
              professorsData.push({
                id: doc.id,
                uid: userData.uid || doc.id,
                source: "users",
                name: userName,
                email: userEmail,
                // Map user fields to professor fields for consistency
                Name: userName,
                Email: userEmail,
                ...userData
              });
            }
          }
        });
        
        setProfessors(professorsData);
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
    if (!duration) {
      showWarning("Please select a duration");
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
        time: `${timeHour}:${timeMinute} ${timePeriod}`, // Start time only
        duration: parseInt(duration), // Duration in minutes
        professorId: professorId,
        professorEmail: selectedProf?.email || selectedProf?.Email || "",
        professorName: selectedProf?.name || selectedProf?.Name || "",
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

          {/* Time Picker */}
          <div style={styles.formGroup}>
            <label style={styles.label}>Start Time</label>
            <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>

              {/* Hour */}
              <div style={{ flex: 1 }}>
                <label style={styles.subLabel}>Hour</label>
                <select
                  value={timeHour}
                  onChange={e => setTimeHour(e.target.value)}
                  style={styles.input}
                >
                  {Array.from({ length: 12 }, (_, i) =>
                    String(i + 1).padStart(2, "0")
                  ).map(h => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>

              <span style={{ fontSize: "24px", fontWeight: "700", color: "#173B66", marginTop: "18px" }}>
                :
              </span>

              {/* Minute */}
              <div style={{ flex: 1 }}>
                <label style={styles.subLabel}>Minute</label>
                <select
                  value={timeMinute}
                  onChange={e => setTimeMinute(e.target.value)}
                  style={styles.input}
                >
                  {["00", "15", "30", "45"].map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              {/* AM/PM */}
              <div style={{ flex: 1 }}>
                <label style={styles.subLabel}>AM / PM</label>
                <select
                  value={timePeriod}
                  onChange={e => setTimePeriod(e.target.value)}
                  style={styles.input}
                >
                  <option value="AM">AM</option>
                  <option value="PM">PM</option>
                </select>
              </div>

            </div>

            {/* Preview */}
            <div style={styles.timePreview}>
              🕒 Start time: <strong>{timeHour}:{timeMinute} {timePeriod}</strong>
            </div>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Duration</label>
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
                  {prof.name || prof.Name || 'Unknown'} ({prof.email || prof.Email || 'No email'})
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
  subLabel: {
    display: "block",
    color: "#64748b",
    fontSize: "12px",
    fontWeight: "600",
    marginBottom: "6px"
  },
  input: {
    width: "100%",
    padding: "12px",
    border: "1px solid #e2e8f0",
    borderRadius: "8px",
    fontSize: "14px",
    boxSizing: "border-box",
    backgroundColor: "white",
    color: "#1E293B",
    cursor: "pointer"
  },
  timePreview: {
    marginTop: "12px",
    padding: "10px 16px",
    backgroundColor: "#F0F9FF",
    border: "1px solid #E0F2FE",
    borderRadius: "8px",
    fontSize: "14px",
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