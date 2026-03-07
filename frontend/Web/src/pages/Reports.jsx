import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "../firebase";
import { doc, getDoc, collection, getDocs } from "firebase/firestore";

const Reports = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch course details
        const courseDoc = await getDoc(doc(db, "courses", courseId));
        if (courseDoc.exists()) {
          const courseData = courseDoc.data();
          setCourse({ id: courseDoc.id, ...courseData });

          // Fetch enrolled students
          const enrolledIds = courseData.enrolledStudents || [];
          if (enrolledIds.length > 0) {
            const studentsSnapshot = await getDocs(collection(db, "students"));
            const enrolledStudents = studentsSnapshot.docs
              .map(doc => ({ id: doc.id, ...doc.data() }))
              .filter(student => enrolledIds.includes(student.id));
            setStudents(enrolledStudents);
          }
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [courseId]);

  if (loading) {
    return (
      <div style={{ padding: "40px", backgroundColor: "#F4F7FE", minHeight: "100vh", display: "flex", justifyContent: "center", alignItems: "center" }}>
        <p style={{ color: "#173B66", fontSize: "18px", fontWeight: "bold" }}>Loading...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: "40px", backgroundColor: "#F4F7FE", minHeight: "100vh", fontFamily: "sans-serif" }}>
      <button onClick={() => navigate(-1)} style={{ marginBottom: "20px", padding: "10px 25px", cursor: "pointer", borderRadius: "8px", border: "none", backgroundColor: "#173B66", color: "white", fontWeight: "bold" }}>← Back to Dashboard</button>
      
      <div style={{ backgroundColor: "white", padding: "30px", borderRadius: "20px", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}>
        <h2 style={{ color: "#173B66", marginBottom: "10px" }}>
          Detailed Attendance Report: {course?.name || courseId}
        </h2>
        {course && (
          <div style={{ marginBottom: "20px", color: "#64748b", fontSize: "14px" }}>
            <p><strong>Course Code:</strong> {course.code}</p>
            <p><strong>Room:</strong> {course.room}</p>
            <p><strong>Time:</strong> {course.time}</p>
            <p><strong>Duration:</strong> {course.duration || "Not specified"}</p>
            <p><strong>Professor:</strong> {course.professorName}</p>
          </div>
        )}
        
        {students.length === 0 ? (
          <p style={{ textAlign: "center", color: "#64748b", padding: "40px" }}>
            No students enrolled in this course yet.
          </p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left", borderBottom: "2px solid #E2E8F0" }}>
                <th style={{ padding: "12px", color: "#173B66" }}>Student Name</th>
                <th style={{ color: "#173B66" }}>Student ID</th>
                <th style={{ color: "#173B66" }}>Email Address</th>
                <th style={{ color: "#173B66" }}>Attendance Rate</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <tr key={s.id} style={{ borderBottom: "1px solid #F1F5F9" }}>
                  <td style={{ padding: "15px", color: "#1E293B" }}>{s.name}</td>
                  <td style={{ color: "#1E293B" }}>{s.code}</td>
                  <td style={{ color: "#1E293B" }}>{s.email}</td>
                  <td style={{ fontWeight: "bold", color: "#10B981" }}>{s.attendance || "0%"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default Reports;