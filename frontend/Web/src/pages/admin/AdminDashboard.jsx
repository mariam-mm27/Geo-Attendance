import { useState, useEffect } from "react";
import { auth, db } from "../../firebase";
import { signOut } from "firebase/auth";
import { collection, getDocs, addDoc, deleteDoc, doc, getDoc } from "firebase/firestore";
import { FaUserGraduate, FaChalkboardTeacher, FaSignOutAlt, FaPlus, FaUserShield } from "react-icons/fa";
import { toast } from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import UsersTable from "./UsersTable";
import SubjectsTable from "./SubjectsTable";
import AddModal from "./AddModal";

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState("professors");
  const [showModal, setShowModal] = useState(false);
  const [profs, setProfs] = useState([]);
  const [students, setStudents] = useState([]);
  const [adminInfo, setAdminInfo] = useState({ 
    name: "Loading...", 
    email: auth.currentUser?.email || "" 
  });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const preventNavigation = () => {
      window.history.pushState(null, '', window.location.href);
    };
    
    window.history.pushState(null, '', window.location.href);
    window.addEventListener('popstate', preventNavigation);
    
    return () => {
      window.removeEventListener('popstate', preventNavigation);
    };
  }, []);

  useEffect(() => {
    const fetchAdminInfo = async (user) => {
      try {
        if (user) {
          const userEmail = user.email;
          
          try {
            const usersSnapshot = await getDocs(collection(db, "users"));
            let foundUser = null;
            let foundDoc = null;
            
            usersSnapshot.forEach((docSnap) => {
              const userData = docSnap.data();
              const userDocEmail = (userData.Email || userData.email || "").toLowerCase();
              const loginEmail = userEmail.toLowerCase();
              
              if (userDocEmail === loginEmail) {
                foundUser = userData;
                foundDoc = docSnap;
                console.log("MATCHED! Name:", userData.Name, "Email:", userData.Email);
                console.log("All keys:", Object.keys(userData));
              }
            });
            
            if (foundUser && foundDoc) {
              const freshData = foundDoc.data();
              let displayName = freshData.Name || freshData.name;
              
              if (!displayName && userEmail === "mariamhany31017@gmail.com") {
                console.log("Name field missing for mariamhany31017, needs to be added in Firestore");
                displayName = "Mariam Hany Hussien"; 
              }
              
              if (!displayName) {
                displayName = userEmail.split('@')[0];
              }
              
              console.log("Fresh data Name:", freshData.Name);
              console.log("Display name:", displayName);
              
              setAdminInfo({
                name: displayName,
                email: userEmail
              });
            } else {
              console.log("No match found for:", userEmail, "Trying UID...");
              const adminDoc = await getDoc(doc(db, "users", user.uid));
              if (adminDoc.exists()) {
                const data = adminDoc.data();
                console.log("Found by UID:", data.Name);
                setAdminInfo({
                  name: data.Name || data.name || userEmail.split('@')[0],
                  email: userEmail
                });
              } else {
                console.log("Not found by UID, using email username");
                setAdminInfo({
                  name: userEmail.split('@')[0],
                  email: userEmail
                });
              }
            }
          } catch (firestoreError) {
            console.error("Firestore error:", firestoreError);
            setAdminInfo({
              name: user.displayName || userEmail.split('@')[0],
              email: userEmail
            });
          }
        } else {
          navigate("/login", { replace: true });
        }
      } catch (error) {
        console.error("Error fetching admin info:", error);
      }
    };

    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        fetchAdminInfo(user);
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  useEffect(() => {
    const fetchProfessors = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "professors"));
        const professorsData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setProfs(professorsData);
      } catch (error) {
        console.error("Error fetching professors:", error);
        setProfs([]);
      } finally {
        setLoading(false);
      }
    };
    fetchProfessors();
  }, []);

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "students"));
        const studentsData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setStudents(studentsData);
      } catch (error) {
        console.error("Error fetching students:", error);
        setStudents([]);
      }
    };
    fetchStudents();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      
      localStorage.clear();
      sessionStorage.clear();
      
      toast.success("Logged out successfully");
      
      window.history.replaceState(null, '', '/login');
      
      navigate("/login", { replace: true });
      window.location.href = "/login";
    } catch (error) {
      toast.error("Logout failed");
    }
  };

  const handleAddProfessor = async (newProf) => {
    try {
      const docRef = await addDoc(collection(db, "professors"), newProf);
      setProfs([...profs, { id: docRef.id, ...newProf }]);
      toast.success("Professor added successfully!");
    } catch (error) {
      console.error("Error adding professor:", error);
      toast.error("Failed to add professor");
    }
  };

  const handleAddStudent = async (newStudent) => {
    try {
      const docRef = await addDoc(collection(db, "students"), newStudent);
      setStudents([...students, { id: docRef.id, ...newStudent }]);
      toast.success("Student added successfully!");
    } catch (error) {
      console.error("Error adding student:", error);
      toast.error("Failed to add student");
    }
  };

  const handleDeleteProfessor = async (id) => {
    try {
      await deleteDoc(doc(db, "professors", id));
      setProfs(profs.filter(prof => prof.id !== id));
      toast.success("Professor deleted successfully!");
    } catch (error) {
      console.error("Error deleting professor:", error);
      toast.error("Failed to delete professor");
    }
  };

  const handleDeleteStudent = async (id) => {
    try {
      await deleteDoc(doc(db, "students", id));
      setStudents(students.filter(student => student.id !== id));
      toast.success("Student deleted successfully!");
    } catch (error) {
      console.error("Error deleting student:", error);
      toast.error("Failed to delete student");
    }
  };

  if (loading) {
    return <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>Loading...</div>;
  }

  return (
    <div style={{ display: "flex", height: "100vh", background: "#F8FAFC" }}>
      <nav style={styles.sidebar}>
        <div style={styles.adminPanelTitle}>
          <h2 style={{ margin: 0, color: "#173B66", fontSize: "20px", fontWeight: "bold", textAlign: "center" }}>
            Admin Panel
          </h2>
        </div>
        <div style={styles.adminProfile}>
          <FaUserShield size={40} color="#173B66" />
          <h3 style={{ margin: "10px 0 5px", color: "#173B66", fontSize: "18px", fontWeight: "bold" }}>
            {adminInfo.name || auth.currentUser?.email?.split('@')[0] || "Loading..."}
          </h3>
          <p style={{ margin: 0, fontSize: "13px", color: "#64748b", wordBreak: "break-word" }}>
            {adminInfo.email || auth.currentUser?.email || ""}
          </p>
        </div>
        <div onClick={() => setActiveTab("professors")} style={styles.navItem(activeTab === "professors")}>
          <FaChalkboardTeacher style={{ marginRight: "8px" }} /> Professors
        </div>
        <div onClick={() => setActiveTab("students")} style={styles.navItem(activeTab === "students")}>
          <FaUserGraduate style={{ marginRight: "8px" }} /> Students
        </div>
        <button onClick={handleLogout} style={styles.logoutBtn}>
          <FaSignOutAlt style={{ marginRight: "8px" }} /> Log Out
        </button>
      </nav>

      <main style={{ flex: 1, padding: "40px", overflow: "auto" }}>
        <div style={styles.header}>
          <h1 style={{ color: "#173B66", margin: 0, fontSize: "28px" }}>
            Manage {activeTab === "professors" ? "Professors" : "Students"}
          </h1>
          <button onClick={() => setShowModal(true)} style={styles.addBtn}>
            <FaPlus style={{ marginRight: "8px" }} /> Add {activeTab === "professors" ? "Professor" : "Student"}
          </button>
        </div>
        <div style={styles.card}>
          {activeTab === "professors" ? 
            <SubjectsTable data={profs} onDelete={handleDeleteProfessor} /> : 
            <UsersTable data={students} onDelete={handleDeleteStudent} />
          }
        </div>
      </main>
      {showModal && (
        <AddModal 
          type={activeTab} 
          onClose={() => setShowModal(false)} 
          onAdd={(newItem) => {
            if (activeTab === "professors") {
              handleAddProfessor(newItem);
            } else {
              handleAddStudent(newItem);
            }
            setShowModal(false);
          }}
        />
      )}
    </div>
  );
};
const styles = {
  sidebar: { width: "260px", background: "#fff", borderRight: "1px solid #e2e8f0", padding: "20px", display: "flex", flexDirection: "column" },
  adminPanelTitle: { 
    textAlign: "center", 
    marginBottom: "20px", 
    paddingBottom: "15px", 
    borderBottom: "2px solid #173B66" 
  },
  adminProfile: { textAlign: "center", marginBottom: "30px", paddingBottom: "20px", borderBottom: "1px solid #e2e8f0" },
  navItem: (active) => ({ 
    padding: "12px", 
    cursor: "pointer", 
    background: active ? "#F1F5F9" : "transparent", 
    color: "#173B66", 
    fontWeight: "bold", 
    borderRadius: "8px", 
    marginBottom: "5px",
    display: "flex",
    alignItems: "center",
    transition: "background 0.2s"
  }),
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" },
  addBtn: { 
    background: "#173B66", 
    color: "white", 
    padding: "10px 20px", 
    border: "none", 
    borderRadius: "8px", 
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    fontSize: "14px",
    fontWeight: "bold"
  },
  logoutBtn: { 
    marginTop: "auto", 
    background: "#173B66", 
    color: "white", 
    padding: "12px", 
    border: "none", 
    borderRadius: "8px", 
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "bold"
  },
  card: { background: "white", padding: "20px", borderRadius: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }
};
export default AdminDashboard;