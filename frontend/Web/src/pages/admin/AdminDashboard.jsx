import { useState, useEffect } from "react";
import { auth } from "../../firebase";
import { signOut } from "firebase/auth";
import { useNavigate, useSearchParams } from "react-router-dom";

import {
  getProfessors,
  addProfessor,
  deleteProfessor,
  getStudents,
  addStudent,
  deleteStudent,
  getCourses,
  addCourse,
  deleteCourse
} from "../../services/adminService";

import { FaUserGraduate, FaChalkboardTeacher, FaSignOutAlt, FaUserShield } from "react-icons/fa";

import UsersTable from "./UsersTable";
import SubjectsTable from "./SubjectsTable";
import AddModal from "./AddModal";
import Modal from "../../components/Modal";
import { useModal } from "../../hooks/useModal";
import AttendanceLogs from "./AttendanceLogs";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tabFromUrl = searchParams.get("tab") || "professors";

  const [activeTab, setActiveTab] = useState(tabFromUrl);
  const [showModal, setShowModal] = useState(false);

  const [profs, setProfs] = useState([]);
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);

  const [adminInfo, setAdminInfo] = useState({
    name: "Loading...",
    email: auth.currentUser?.email || ""
  });

  const [loading, setLoading] = useState(true);

  const { modalState, closeModal, showSuccess, showError, showWarning } = useModal();
  const [confirmAction, setConfirmAction] = useState(null);

  
  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await getProfessors();
        setProfs(data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await getStudents();
        setStudents(data);
      } catch (error) {
        console.error(error);
      }
    };

    fetchData();
  }, []);

  
  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await getCourses();
        setCourses(data);
      } catch (error) {
        console.error(error);
      }
    };

    fetchData();
  }, []);

  
  const handleLogout = async () => {
    await signOut(auth);
    navigate("/login", { replace: true });
  };

  
  const handleAddProfessor = async (data) => {
    await addProfessor(data);
    setProfs(await getProfessors());
  };

  const handleAddStudent = async (data) => {
    await addStudent(data);
    setStudents(await getStudents());
    showSuccess("Student added successfully!");
  };

  const handleAddCourse = async (data) => {
    await addCourse(data);
    setCourses(await getCourses());
    showSuccess("Course added successfully!");
  };

  const handleDeleteProfessor = async (id) => {
    await deleteProfessor(id);
    setProfs(profs.filter((p) => p.id !== id));
  };

  const handleDeleteStudent = async (id) => {
    await deleteStudent(id);
    setStudents(students.filter((s) => s.id !== id));
  };

  const handleDeleteCourse = async (id) => {
    await deleteCourse(id);
    setCourses(courses.filter((c) => c.id !== id));
  };

  const handleConfirmDelete = (id, name, type = "professor") => {
    setConfirmAction({ id, name, type });

    showWarning(
      `Are you sure you want to delete ${name}?`,
      "Confirm Delete",
      () => {
        if (type === "professor") handleDeleteProfessor(id);
        if (type === "student") handleDeleteStudent(id);
        if (type === "course") handleDeleteCourse(id);
      }
    );
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div style={{ display: "flex", height: "100vh", background: "#F8FAFC" }}>
      
      {/* Sidebar */}
      <nav style={{ width: "260px", background: "#fff", padding: "20px" }}>
        <h2>Admin Panel</h2>

        <div onClick={() => setActiveTab("professors")}>Professors</div>
        <div onClick={() => setActiveTab("students")}>Students</div>
        <div onClick={() => setActiveTab("courses")}>Courses</div>
        <div onClick={() => setActiveTab("logs")}>Attendance Logs</div>

        <button onClick={handleLogout}>
          <FaSignOutAlt /> Logout
        </button>
      </nav>

      {/* Main */}
      <main style={{ flex: 1, padding: "40px" }}>
        
        <h1>
          {activeTab === "logs"
            ? "Attendance Logs"
            : `Manage ${activeTab}`}
        </h1>

        {activeTab === "logs" ? (
          <AttendanceLogs allCourses={courses} />
        ) : activeTab === "professors" ? (
          <SubjectsTable
            data={profs}
            onDelete={handleDeleteProfessor}
            onConfirmDelete={(id, name) => handleConfirmDelete(id, name, "professor")}
          />
        ) : activeTab === "students" ? (
          <UsersTable
            data={students}
            onDelete={handleDeleteStudent}
            onConfirmDelete={(id, name) => handleConfirmDelete(id, name, "student")}
          />
        ) : (
          <UsersTable
            data={courses}
            onDelete={handleDeleteCourse}
            onConfirmDelete={(id, name) => handleConfirmDelete(id, name, "course")}
          />
        )}
      </main>

      {/* Modal */}
      {showModal && (
        <AddModal
          type={activeTab}
          onClose={() => setShowModal(false)}
          onAdd={(data) => {
            if (activeTab === "professors") handleAddProfessor(data);
            if (activeTab === "students") handleAddStudent(data);
            if (activeTab === "courses") handleAddCourse(data);
            setShowModal(false);
          }}
        />
      )}

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

export default AdminDashboard;