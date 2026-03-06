import React, { useState } from "react";
import { auth } from "../../firebase";
import { signOut } from "firebase/auth";
import { FaUserGraduate, FaChalkboardTeacher, FaSignOutAlt, FaPlus, FaUserShield } from "react-icons/fa";
import { toast } from "react-hot-toast"; // استيراد التوست
import UsersTable from "./UsersTable";
import SubjectsTable from "./SubjectsTable";
import AddModal from "./AddModal";

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState("professors");
  const [showModal, setShowModal] = useState(false);
  const [profs, setProfs] = useState([{ id: 1, name: "Dr. Ahmed", email: "ahmed@sci.cu.edu.eg", courses: 3, attendance: "95%" }]);
  const [students, setStudents] = useState([{ id: 1, name: "Mariam", email: "mariam@std.sci.cu.edu.eg", code: "2026001", attendance: "98%" }]);

  return (
    <div style={{ display: "flex", height: "100vh", background: "#F8FAFC" }}>
      <nav style={styles.sidebar}>
        <div style={styles.adminProfile}>
          <FaUserShield size={40} color="#173B66" />
          <h3>{auth.currentUser?.displayName || "Admin User"}</h3>
          <p>{auth.currentUser?.email || "admin@sci.cu.edu.eg"}</p>
        </div>
        <div onClick={() => setActiveTab("professors")} style={styles.navItem(activeTab === "professors")}><FaChalkboardTeacher /> Professors</div>
        <div onClick={() => setActiveTab("students")} style={styles.navItem(activeTab === "students")}><FaUserGraduate /> Students</div>
        <button onClick={() => { signOut(auth); toast.success("تم تسجيل الخروج"); }} style={styles.logoutBtn}><FaSignOutAlt /> Log Out</button>
      </nav>

      <main style={{ flex: 1, padding: "40px" }}>
        <div style={styles.header}>
          <h1>Manage {activeTab === "professors" ? "Professors" : "Students"}</h1>
          <button onClick={() => setShowModal(true)} style={styles.addBtn}><FaPlus /> Add {activeTab === "professors" ? "Professor" : "Student"}</button>
        </div>
        <div style={styles.card}>
          {activeTab === "professors" ? 
            <SubjectsTable data={profs} setData={setProfs} /> : 
            <UsersTable data={students} setData={setStudents} />
          }
        </div>
      </main>
      {showModal && <AddModal type={activeTab} onClose={() => setShowModal(false)} onAdd={(newItem) => {
        activeTab === "professors" ? setProfs([...profs, newItem]) : setStudents([...students, newItem]);
        toast.success("تم الإضافة بنجاح!");
      }}/>}
    </div>
  );
};
const styles = {
  sidebar: { width: "260px", background: "#fff", borderRight: "1px solid #e2e8f0", padding: "20px", display: "flex", flexDirection: "column" },
  adminProfile: { textAlign: "center", marginBottom: "30px" },
  navItem: (active) => ({ padding: "12px", cursor: "pointer", background: active ? "#F1F5F9" : "transparent", color: "#173B66", fontWeight: "bold", borderRadius: "8px", marginBottom: "5px" }),
  header: { display: "flex", justifyContent: "space-between", marginBottom: "20px" },
  addBtn: { background: "#173B66", color: "white", padding: "10px 20px", border: "none", borderRadius: "8px", cursor: "pointer" },
  logoutBtn: { marginTop: "auto", background: "#173B66", color: "white", padding: "12px", border: "none", borderRadius: "8px", cursor: "pointer" },
  card: { background: "white", padding: "20px", borderRadius: "12px" }
};
export default AdminDashboard;