import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "../firebase";
import { collection, getDocs } from "firebase/firestore";

const Reports = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);

  useEffect(() => {
    const fetchStudents = async () => {
      const querySnapshot = await getDocs(collection(db, "courses", courseId, "students"));
      const list = [];
      querySnapshot.forEach((doc) => list.push({ id: doc.id, ...doc.data() }));
      
      const dummyList = [
        { name: "Mariam Ahmed", studentId: "20210542", email: "mariam@std.sci.cu.edu.eg", attendance: "98%" },
        { name: "Ali Mahmoud", studentId: "20210123", email: "ali@std.sci.cu.edu.eg", attendance: "85%" },
        { name: "Sara Hassan", studentId: "20210987", email: "sara@std.sci.cu.edu.eg", attendance: "92%" },
        ...list 
      ];
      setStudents(dummyList);
    };
    fetchStudents();
  }, [courseId]);

  return (
    <div style={{ padding: "40px", backgroundColor: "#F4F7FE", minHeight: "100vh", fontFamily: "sans-serif" }}>
      <button onClick={() => navigate(-1)} style={{ marginBottom: "20px", padding: "10px 25px", cursor: "pointer", borderRadius: "8px", border: "none", backgroundColor: "#173B66", color: "white", fontWeight: "bold" }}>← Back to Dashboard</button>
      
      <div style={{ backgroundColor: "white", padding: "30px", borderRadius: "20px", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}>
        <h2 style={{ color: "#173B66", marginBottom: "20px" }}>Detailed Attendance Report: {courseId}</h2>
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
            {students.map((s, i) => (
              <tr key={i} style={{ borderBottom: "1px solid #F1F5F9" }}>
                <td style={{ padding: "15px", color: "#1E293B" }}>{s.name}</td>
                <td style={{ color: "#1E293B" }}>{s.studentId}</td>
                <td style={{ color: "#1E293B" }}>{s.email}</td>
                <td style={{ fontWeight: "bold", color: "#10B981" }}>{s.attendance}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Reports;