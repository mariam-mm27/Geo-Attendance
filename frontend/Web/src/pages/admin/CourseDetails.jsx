import React from "react";
import { useParams } from "react-router-dom"; // عشان نعرف إحنا واقفين على أنهي بروفيسور أو طالب

const CourseDetails = () => {
  const { id } = useParams(); // ده اللي بيجيب الـ ID من الرابط

  return (
    <div style={{ padding: "40px", fontFamily: "sans-serif" }}>
      <h1 style={{ color: "#173B66" }}>Details for User ID: {id}</h1>
      <div style={styles.card}>
        <h3>Course List & Performance</h3>
        <p>• Advanced React: 85% Attendance</p>
        <p>• Database Systems: 92% Attendance</p>
        <p>• Web Security: 78% Attendance</p>
      </div>
    </div>
  );
};

const styles = {
  card: { background: "#fff", padding: "20px", borderRadius: "12px", border: "1px solid #e2e8f0" }
};

export default CourseDetails;