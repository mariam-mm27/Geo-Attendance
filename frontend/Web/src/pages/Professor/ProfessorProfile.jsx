import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../../firebase";
import { doc, getDoc, collection, addDoc, onSnapshot } from "firebase/firestore";
import { signOut, onAuthStateChanged } from "firebase/auth";

const ProfessorProfile = () => {
  const navigate = useNavigate();
  const [profData, setProfData] = useState({ name: "", email: "" });
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const [courses, setCourses] = useState([
    { id: "CS301", name: "Data Structures & Algorithms", code: "CS301", count: "...", room: "Lab 5", time: "09:00 AM - 11:00 AM" },
    { id: "CS402", name: "Artificial Intelligence", code: "CS402", count: "...", room: "Hall B", time: "11:00 AM - 01:00 PM" },
    { id: "CS205", name: "Database Management", code: "CS205", count: "...", room: "Hall C", time: "01:00 PM - 03:00 PM" },
    { id: "CS101", name: "Introduction to CS", code: "CS101", count: "...", room: "Main Hall", time: "03:00 PM - 05:00 PM" },
  ]);

  const [selectedCourse, setSelectedCourse] = useState("");
  const [newStudent, setNewStudent] = useState({ name: "", id: "", email: "" });
  const [error, setError] = useState("");
  useEffect(() => {
    const stopBack = () => window.history.pushState(null, null, window.location.href);
    window.history.pushState(null, null, window.location.href);
    window.addEventListener("popstate", stopBack);

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        navigate("/login", { replace: true });
      } else {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (snap.exists()) setProfData(snap.data());
        setLoading(false);
      }
    });

    const listeners = courses.map(course => {
      return onSnapshot(collection(db, "courses", course.id, "students"), (snapshot) => {
        setCourses(prev => prev.map(c => 
          c.id === course.id ? { ...c, count: snapshot.size } : c
        ));
      });
    });

    return () => {
      window.removeEventListener("popstate", stopBack);
      unsubscribeAuth();
      listeners.forEach(unsub => unsub());
    };
  }, [navigate]);

  const handleAddStudent = async () => {
    const emailSuffix = "@std.sci.cu.edu.eg";
    if (!newStudent.name || !newStudent.id || !newStudent.email) return setError("Fill all fields!");
    if (!newStudent.email.endsWith(emailSuffix)) return setError(`Must end with ${emailSuffix}`);

    try {
      await addDoc(collection(db, "courses", selectedCourse, "students"), {
        name: newStudent.name,
        studentId: newStudent.id,
        email: newStudent.email,
        attendance: "0%"
      });
      
      setIsModalOpen(false);
      setNewStudent({ name: "", id: "", email: "" });
      setError("");
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } catch (e) { setError("Error adding student."); }
  };

  if (loading) return <div style={styles.loader}>Loading...</div>;
  return (
    <div style={styles.pageWrapper}>
      {showToast && (
        <div style={styles.toastContainer}>
          <div style={styles.toast}>Student Added Successfully!✅ </div>
        </div>
      )}
      {isSidebarOpen && (
        <div style={styles.sidebarOverlay} onClick={() => setIsSidebarOpen(false)}>
          <div style={styles.sidebar} onClick={e => e.stopPropagation()}>
            <div style={{ padding: "20px", fontSize: "18px", fontWeight: "bold", color: "#173B66" }}>Menu</div>
            <div style={styles.sidebarItem} onClick={() => navigate("/reset-password")}>🔑 Reset Password</div>
            <div style={{...styles.sidebarItem, color: "#173B66", fontWeight: "bold"}} onClick={() => setIsSidebarOpen(false)}> Close</div>
          </div>
        </div>
      )}

      <nav style={styles.navbar}>
        <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
          <div style={styles.menuBtn} onClick={() => setIsSidebarOpen(true)}>☰</div>
          <div style={styles.navTitle}>Professor Dashboard</div>
        </div>
        <button onClick={() => signOut(auth)} style={styles.logoutBtn}>Logout</button>
      </nav>

      <main style={styles.mainContent}>
        <section style={styles.profileSection}>
          <h2 style={styles.sectionHeading}>Profile Information</h2>
          <div style={styles.profileCard}>
            <div style={styles.avatarLarge}>{profData.name?.charAt(0)}</div>
            <div style={styles.infoText}>
              <div style={styles.label}>Name</div><div style={styles.value}>{profData.name}</div>
              <div style={styles.label}>Email</div><div style={styles.value}>{profData.email}</div>
            </div>
          </div>
        </section>

        <div style={styles.statsBar}>
          <div style={styles.statItem}><div style={styles.statNumber}>{courses.length}</div><div style={styles.statLabel}>Active Courses</div></div>
          <div style={styles.statItem}><div style={styles.statNumber}>475</div><div style={styles.statLabel}>Total Students</div></div>
          <div style={styles.statItem}><div style={styles.statNumber}>92%</div><div style={styles.statLabel}>Attendance Rate</div></div>
        </div>

        <h2 style={styles.sectionHeading}>Course Management</h2>
        <div style={styles.grid}>
          {courses.map((course) => (
            <div key={course.id} style={styles.courseCard}>
              <div style={styles.cardHeader}>
                <span style={styles.codeBadge}>{course.code}</span>
                <button onClick={() => { setSelectedCourse(course.id); setIsModalOpen(true); }} style={styles.addStudentBtn}>+ Add Student</button>
              </div>
              <h3 style={styles.courseTitle}>{course.name}</h3>
              <div style={styles.courseDetails}>
                <p>📍 Location: <strong>{course.room}</strong></p>
                <p>🕒 Time: <strong>{course.time}</strong></p>
                <p>👥 Enrolled: <strong style={{color: "#173B66"}}>{course.count} Students</strong></p>
              </div>
              <button onClick={() => navigate(`/reports/${course.id}`)} style={styles.reportBtn}>Reports</button>
            </div>
          ))}
        </div>
      </main>

      {isModalOpen && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <h3 style={{ color: "#173B66", marginTop: 0 }}>Add New Student</h3>
            {error && <p style={styles.errorMessage}>{error}</p>}
            <input type="text" placeholder="Name" style={styles.input} value={newStudent.name} onChange={e => setNewStudent({...newStudent, name: e.target.value})} />
            <input type="text" placeholder="ID" style={styles.input} value={newStudent.id} onChange={e => setNewStudent({...newStudent, id: e.target.value})} />
            <input type="email" placeholder="Email (@std.sci.cu.edu.eg)" style={styles.input} value={newStudent.email} onChange={e => setNewStudent({...newStudent, email: e.target.value})} />
            <div style={styles.modalActions}>
              <button onClick={handleAddStudent} style={styles.confirmBtn}>Confirm</button>
              <button onClick={() => setIsModalOpen(false)} style={styles.cancelBtn}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  pageWrapper: { backgroundColor: "#F8FAFC", minHeight: "100vh", fontFamily: "sans-serif" },
  navbar: { height: "70px", backgroundColor: "#173B66", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 5%", color: "white" },
  menuBtn: { fontSize: "28px", cursor: "pointer", color: "white" },
  navTitle: { fontSize: "20px", fontWeight: "bold" },
  logoutBtn: { backgroundColor: "transparent", border: "1px solid white", color: "white", padding: "8px 18px", borderRadius: "20px", cursor: "pointer" },
  sidebarOverlay: { position: "fixed", top: 0, left: 0, width: "100%", height: "100%", backgroundColor: "rgba(0,0,0,0.4)", zIndex: 6000 },
  sidebar: { width: "260px", height: "100%", backgroundColor: "white", position: "absolute", left: 0, top: 0, boxShadow: "2px 0 10px rgba(0,0,0,0.1)" },
  sidebarItem: { padding: "15px 20px", color: "#173B66", cursor: "pointer", borderBottom: "1px solid #F1F5F9", fontSize: "16px" },
  toastContainer: { position: "fixed", top: "20px", left: 0, width: "100%", display: "flex", justifyContent: "center", zIndex: 7000 },
  toast: { backgroundColor: "#173B66", color: "white", padding: "12px 25px", borderRadius: "50px" },
  mainContent: { padding: "30px 5%" },
  profileSection: { marginBottom: "30px" },
  profileCard: { backgroundColor: "white", padding: "25px", borderRadius: "15px", display: "flex", alignItems: "center", gap: "25px", boxShadow: "0 2px 10px rgba(0,0,0,0.05)" },
  avatarLarge: { width: "70px", height: "70px", backgroundColor: "#173B66", color: "white", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "28px" },
  infoText: { display: "grid", gap: "2px" },
  label: { color: "#94A3B8", fontSize: "11px", fontWeight: "bold" },
  value: { color: "#1E293B", fontSize: "15px", fontWeight: "600" },
  statsBar: { display: "flex", gap: "20px", marginBottom: "40px" },
  statItem: { flex: 1, backgroundColor: "#173B66", padding: "20px", borderRadius: "15px", textAlign: "center", color: "white" },
  statNumber: { fontSize: "30px", fontWeight: "bold" },
  statLabel: { fontSize: "14px", opacity: 0.8 },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "25px" },
  courseCard: { backgroundColor: "white", padding: "25px", borderRadius: "20px", boxShadow: "0 10px 20px rgba(0,0,0,0.05)" },
  cardHeader: { display: "flex", justifyContent: "space-between", marginBottom: "15px" },
  codeBadge: { backgroundColor: "#F1F5F9", color: "#173B66", padding: "4px 10px", borderRadius: "8px", fontSize: "12px", fontWeight: "bold" },
  addStudentBtn: { backgroundColor: "#173B66", color: "white", border: "none", padding: "6px 12px", borderRadius: "6px", cursor: "pointer", fontSize: "11px" },
  courseTitle: { fontSize: "19px", color: "#173B66", fontWeight: "bold", marginBottom: "15px" },
  courseDetails: { marginBottom: "20px", borderTop: "1px solid #F1F5F9", paddingTop: "15px" },
  reportBtn: { width: "100%", padding: "12px", borderRadius: "10px", border: "none", backgroundColor: "#173B66", color: "white", fontWeight: "bold", cursor: "pointer" },
  modalOverlay: { position: "fixed", top: 0, left: 0, width: "100%", height: "100%", backgroundColor: "rgba(0,0,0,0.4)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 6500 },
  modalContent: { backgroundColor: "white", padding: "30px", borderRadius: "20px", width: "380px" },
  input: { width: "100%", padding: "12px", margin: "8px 0", borderRadius: "8px", border: "1px solid #CBD5E1", boxSizing: "border-box" },
  errorMessage: { color: "#EF4444", fontSize: "12px" },
  modalActions: { display: "flex", gap: "10px", marginTop: "15px" },
  confirmBtn: { flex: 1, padding: "12px", backgroundColor: "#173B66", color: "white", border: "none", borderRadius: "8px", cursor: "pointer" },
  cancelBtn: { flex: 1, padding: "12px", backgroundColor: "white", color: "#64748B", border: "1px solid #E2E8F0", borderRadius: "8px", cursor: "pointer" },
  loader: { textAlign: "center", marginTop: "100px", color: "#173B66", fontWeight: "bold" },
  sectionHeading: { color: "#173B66", fontSize: "22px", fontWeight: "bold", marginBottom: "20px" }
};

export default ProfessorProfile;