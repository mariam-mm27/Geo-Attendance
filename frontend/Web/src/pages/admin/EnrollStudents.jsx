import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "../../firebase";
import {
  doc,
  getDoc,
  collection,
  getDocs,
  updateDoc,
  arrayUnion,
  arrayRemove
} from "firebase/firestore";

import Modal from "../../components/Modal";
import { useModal } from "../../hooks/useModal";

const EnrollStudents = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();

  const [course, setCourse] = useState(null);
  const [allStudents, setAllStudents] = useState([]);
  const [enrolledStudents, setEnrolledStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [searchedStudent, setSearchedStudent] = useState(null);

  const { modalState, closeModal, showSuccess, showError } = useModal();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const courseDoc = await getDoc(doc(db, "courses", courseId));

        if (courseDoc.exists()) {
          const data = courseDoc.data();
          setCourse({ id: courseDoc.id, ...data });
          setEnrolledStudents(data.enrolledStudents || []);
        }

        const snap = await getDocs(collection(db, "students"));

        const students = snap.docs.map(d => ({
          id: d.id,
          ...d.data()
        }));

        setAllStudents(students);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [courseId]);

  // ⭐ FIXED SEARCH (IMPORTANT)
  const handleSearch = async () => {
    if (!search) {
      showError("Enter student info");
      return;
    }

    const snap = await getDocs(collection(db, "students"));

    let found = null;

    snap.forEach((d) => {
      const data = d.data();

      if (
        d.id === search ||        // doc id
        data.code === search ||   // student code (IMPORTANT)
        data.name === search ||   // optional
        data.email === search     // optional
      ) {
        found = {
          id: d.id,
          ...data
        };
      }
    });

    if (found) {
      setSearchedStudent(found);
      showSuccess("Student found");
    } else {
      setSearchedStudent(null);
      showError("Student not found");
    }
  };

  const handleEnroll = async (studentId) => {
    try {
      const ref = doc(db, "courses", courseId);

      await updateDoc(ref, {
        enrolledStudents: arrayUnion(studentId)
      });

      setEnrolledStudents(prev => [...prev, studentId]);
      showSuccess("Student enrolled successfully");
    } catch (err) {
      console.error(err);
      showError("Enroll failed");
    }
  };

  const handleUnenroll = async (studentId) => {
    try {
      const ref = doc(db, "courses", courseId);

      await updateDoc(ref, {
        enrolledStudents: arrayRemove(studentId)
      });

      setEnrolledStudents(prev =>
        prev.filter(id => id !== studentId)
      );

      showSuccess("Student unenrolled");
    } catch (err) {
      console.error(err);
      showError("Unenroll failed");
    }
  };

  if (loading) return <div style={styles.loader}>Loading...</div>;
  if (!course) return <div style={styles.loader}>Course not found</div>;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button onClick={() => navigate("/admin?tab=courses")} style={styles.backBtn}>
          ← Back
        </button>

        <h1 style={styles.title}>Enroll Students</h1>
      </div>

      {/* COURSE INFO */}
      <div style={styles.card}>
        <h2>{course.name} ({course.code})</h2>
      </div>

      {/* SEARCH */}
      <div style={styles.card}>
        <h3>Search Student</h3>

        <input
          placeholder="Search by code / name / email / id"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={styles.input}
        />

        <button onClick={handleSearch} style={styles.btn}>
          Search
        </button>

        {searchedStudent && (
          <div style={styles.result}>
            <p><b>Name:</b> {searchedStudent.name}</p>
            <p><b>Code:</b> {searchedStudent.code}</p>

            {enrolledStudents.includes(searchedStudent.id) ? (
              <button
                onClick={() => handleUnenroll(searchedStudent.id)}
                style={styles.unenroll}
              >
                Unenroll
              </button>
            ) : (
              <button
                onClick={() => handleEnroll(searchedStudent.id)}
                style={styles.btn}
              >
                Enroll
              </button>
            )}
          </div>
        )}
      </div>

      {/* TABLE */}
      <div style={styles.card}>
        <h3>All Students</h3>

        <table style={styles.table}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Code</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>

          <tbody>
            {allStudents.map((s) => {
              const isEnrolled = enrolledStudents.includes(s.id);

              return (
                <tr key={s.id}>
                  <td>{s.name}</td>
                  <td>{s.email}</td>
                  <td>{s.code}</td>
                  <td>{isEnrolled ? "Enrolled" : "Not Enrolled"}</td>
                  <td>
                    {isEnrolled ? (
                      <button
                        onClick={() => handleUnenroll(s.id)}
                        style={styles.unenroll}
                      >
                        Unenroll
                      </button>
                    ) : (
                      <button
                        onClick={() => handleEnroll(s.id)}
                        style={styles.btn}
                      >
                        Enroll
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Modal
        isOpen={modalState.isOpen}
        onClose={closeModal}
        title={modalState.title}
        message={modalState.message}
        type={modalState.type}
      />
    </div>
  );
};

export default EnrollStudents;

/* ================= STYLES ================= */

const styles = {
  container: {
    padding: 30,
    background: "#f8fafc",
    minHeight: "100vh"
  },
  header: {
    marginBottom: 20
  },
  backBtn: {
    padding: 10,
    background: "#333",
    color: "#fff",
    border: 0
  },
  title: {
    fontSize: 28,
    marginTop: 10
  },
  card: {
    background: "#fff",
    padding: 20,
    marginBottom: 20,
    borderRadius: 10
  },
  input: {
    padding: 10,
    marginRight: 10,
    border: "1px solid #ccc"
  },
  btn: {
    padding: "8px 12px",
    background: "#173B66",
    color: "#fff",
    border: 0,
    cursor: "pointer"
  },
  unenroll: {
    padding: "8px 12px",
    background: "red",
    color: "#fff",
    border: 0
  },
  table: {
    width: "100%",
    borderCollapse: "collapse"
  },
  loader: {
    textAlign: "center",
    marginTop: 100
  },
  result: {
    marginTop: 15,
    padding: 10,
    border: "1px solid #ddd"
  }
};