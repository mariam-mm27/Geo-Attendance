import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "../firebase";
import { doc, getDoc, collection, getDocs, query, where } from "firebase/firestore";
import { calculateStudentAttendance } from '../services/attendanceService';
import { getCourseReport } from "../services/attendanceService";

const Reports = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [courseReport, setCourseReport] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const courseDoc = await getDoc(doc(db, "courses", courseId));
        if (courseDoc.exists()) {
          const courseData = courseDoc.data();
          setCourse({ id: courseDoc.id, ...courseData });

          const reportResult = await getCourseReport(courseId);

          if (reportResult.success) {
          setCourseReport(reportResult.data);
          }

          // Get enrolled students from both course.enrolledStudents and enrollments collection
          const enrolledIds = courseData.enrolledStudents || [];
          console.log("📊 Enrolled student IDs from course:", enrolledIds);
          
          // Also check enrollments collection for this course
          const enrollmentsQuery = query(
            collection(db, "enrollments"),
            where("courseId", "==", courseId)
          );
          const enrollmentsSnap = await getDocs(enrollmentsQuery);
          const enrollmentIds = enrollmentsSnap.docs.map(doc => doc.data().studentId);
          console.log("📊 Enrolled student IDs from enrollments:", enrollmentIds);
          
          // Combine both sources and remove duplicates
          const allEnrolledIds = [...new Set([...enrolledIds, ...enrollmentIds])];
          console.log("📊 Combined enrolled student IDs:", allEnrolledIds);
          console.log("📊 Total unique enrolled IDs:", allEnrolledIds.length);
          
          if (allEnrolledIds.length > 0) {
            const usersSnapshot = await getDocs(collection(db, "users"));
            console.log("👥 Total users in database:", usersSnapshot.size);
            
            // Check each enrolled ID to see if we can find the user
            const foundStudents = [];
            const missingStudents = [];
            
            for (const enrolledId of allEnrolledIds) {
              const userDoc = usersSnapshot.docs.find(doc => 
                doc.id === enrolledId || doc.data().uid === enrolledId
              );
              
              if (userDoc) {
                const userData = { id: userDoc.id, uid: userDoc.id, ...userDoc.data() };
                foundStudents.push(userData);
                console.log("✅ Found enrolled student:", userData.name, userData.uid || userData.id);
              } else {
                missingStudents.push(enrolledId);
                console.log("❌ Missing student with ID:", enrolledId);
              }
            }
            
            console.log("📋 Found students:", foundStudents.length);
            console.log("❌ Missing students:", missingStudents.length, missingStudents);
            
            // If we have missing students, create placeholder entries for them
            const allStudents = [...foundStudents];
            
            for (const missingId of missingStudents) {
              allStudents.push({
                id: missingId,
                uid: missingId,
                name: `Unknown Student (${missingId})`,
                email: "No email found",
                studentId: missingId,
                isMissing: true
              });
              console.log("🔧 Created placeholder for missing student:", missingId);
            }
            
            console.log("📊 Total students (including placeholders):", allStudents.length);
            
            // Calculate attendance for each student
            const studentsWithAttendance = await Promise.all(
              allStudents.map(async (student) => {
                const studentUid = student.uid || student.id;
                
                // Skip attendance calculation for missing students
                if (student.isMissing) {
                  console.log(`⚠️ Skipping attendance calculation for missing student: ${studentUid}`);
                  return {
                    ...student,
                    attendance: "N/A",
                    attendanceData: null,
                    attendedSessions: 0,
                    totalSessions: 0,
                    missedSessions: 0
                  };
                }
                
                const result = await calculateStudentAttendance(courseId, studentUid);
                console.log(`📈 Attendance for ${student.name}:`, result);
                
                return {
                  ...student,
                  attendance: result.success ? `${result.data.percentage}%` : "0%",
                  attendanceData: result.success ? result.data : null,
                  attendedSessions: result.success ? result.data.attendedSessions : 0,
                  totalSessions: result.success ? result.data.totalSessions : 0,
                  missedSessions: result.success ? (result.data.totalSessions - result.data.attendedSessions) : 0
                };
              })
            );
            
            setStudents(studentsWithAttendance);
          }
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [courseId]);

  if (loading) {
    return (
      <div style={{ padding: "40px", backgroundColor: "#F4F7FE", minHeight: "100vh", display: "flex", justifyContent: "center", alignItems: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>📊</div>
          <p style={{ color: "#173B66", fontSize: "18px", fontWeight: "bold" }}>Loading course report...</p>
          <p style={{ color: "#64748B", fontSize: "14px" }}>Please wait while we fetch the attendance data.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: "40px", backgroundColor: "#F4F7FE", minHeight: "100vh", display: "flex", justifyContent: "center", alignItems: "center" }}>
        <div style={{ textAlign: "center", backgroundColor: "white", padding: "40px", borderRadius: "20px", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>❌</div>
          <p style={{ color: "#EF4444", fontSize: "18px", fontWeight: "bold", marginBottom: "8px" }}>Error Loading Report</p>
          <p style={{ color: "#64748B", fontSize: "14px", marginBottom: "20px" }}>{error}</p>
          <button 
            onClick={() => navigate(-1)} 
            style={{ padding: "10px 25px", cursor: "pointer", borderRadius: "8px", border: "none", backgroundColor: "#173B66", color: "white", fontWeight: "bold" }}
          >
            ← Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "40px", backgroundColor: "#F4F7FE", minHeight: "100vh", fontFamily: "sans-serif" }}>
      <button onClick={() => navigate(-1)} style={{ marginBottom: "20px", padding: "10px 25px", cursor: "pointer", borderRadius: "8px", border: "none", backgroundColor: "#173B66", color: "white", fontWeight: "bold" }}>← Back to Dashboard</button>
      
      <div style={{ backgroundColor: "white", padding: "30px", borderRadius: "20px", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}>
        {/* Header Section with Course Info and Summary Side by Side */}
        <div style={{ display: "flex", gap: "30px", marginBottom: "30px", alignItems: "flex-start" }}>
          {/* Left Side - Course Details */}
          <div style={{ flex: "1" }}>
            <h2 style={{ color: "#173B66", marginBottom: "20px", fontSize: "24px", fontWeight: "700" }}>
              Detailed Attendance Report: {course?.name || courseId}
            </h2>
            {course && (
              <div style={{ color: "#64748b", fontSize: "14px", lineHeight: "1.6" }}>
                <p><strong>Course Code:</strong> {course.code}</p>
                <p><strong>Room:</strong> {course.room}</p>
                <p><strong>Time:</strong> {course.time}</p>
                <p><strong>Duration:</strong> {
                  course.duration ? (
                    typeof course.duration === 'number' ? 
                      `${course.duration / 60} hour${course.duration / 60 !== 1 ? 's' : ''}` :
                      // Handle legacy text formats
                      course.duration.includes('hour') ? course.duration : `${course.duration} minutes`
                  ) : "Not specified"
                }</p>
                <p><strong>Professor:</strong> {course.professorName}</p>
              </div>
            )}
          </div>

          {/* Right Side - Course Summary */}
          {courseReport && (
            <div style={{
              flex: "0 0 300px",
              padding: "20px",
              backgroundColor: "#F8FAFC",
              borderRadius: "12px",
              border: "1px solid #E2E8F0"
            }}>
              <h3 style={{ color: "#173B66", marginBottom: "15px", fontSize: "18px", fontWeight: "700" }}>
                Course Summary
              </h3>
              <div style={{ display: "grid", gap: "8px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: "#64748B", fontSize: "14px" }}>Total Students:</span>
                  <span style={{ fontWeight: "700", color: "#173B66", fontSize: "16px" }}>{courseReport.totalStudents}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: "#64748B", fontSize: "14px" }}>Total Sessions:</span>
                  <span style={{ fontWeight: "700", color: "#173B66", fontSize: "16px" }}>{courseReport.totalSessions}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: "#64748B", fontSize: "14px" }}>Average Attendance:</span>
                  <span style={{ 
                    fontWeight: "700", 
                    fontSize: "16px",
                    color: parseFloat(courseReport.averageAttendance) >= 75 ? "#10B981" : 
                           parseFloat(courseReport.averageAttendance) >= 50 ? "#F59E0B" : "#EF4444"
                  }}>
                    {courseReport.averageAttendance}%
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: "#64748B", fontSize: "14px" }}>Absent Students (&lt;75%):</span>
                  <span style={{ 
                    fontWeight: "700", 
                    fontSize: "16px",
                    color: courseReport.absentStudents > 0 ? "#EF4444" : "#10B981"
                  }}>
                    {courseReport.absentStudents}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {students.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px", backgroundColor: "#F8FAFC", borderRadius: "12px" }}>
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>📚</div>
            <p style={{ color: "#64748b", fontSize: "18px", marginBottom: "8px" }}>No students enrolled yet</p>
            <p style={{ color: "#94A3B8", fontSize: "14px" }}>Students will appear here once they enroll in this course.</p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", backgroundColor: "white" }}>
              <thead>
                <tr style={{ backgroundColor: "#F8FAFC" }}>
                  <th style={{ padding: "16px", textAlign: "left", color: "#173B66", fontWeight: "700", borderBottom: "2px solid #E2E8F0" }}>Student</th>
                  <th style={{ padding: "16px", textAlign: "left", color: "#173B66", fontWeight: "700", borderBottom: "2px solid #E2E8F0" }}>Contact</th>
                  <th style={{ padding: "16px", textAlign: "center", color: "#173B66", fontWeight: "700", borderBottom: "2px solid #E2E8F0" }}>Sessions</th>
                  <th style={{ padding: "16px", textAlign: "center", color: "#173B66", fontWeight: "700", borderBottom: "2px solid #E2E8F0" }}>Attendance Rate</th>
                  <th style={{ padding: "16px", textAlign: "center", color: "#173B66", fontWeight: "700", borderBottom: "2px solid #E2E8F0" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student, index) => {
                  const attendancePercent = parseFloat(student.attendance || "0");
                  const attendanceColor = attendancePercent >= 75 ? "#10B981" : 
                                         attendancePercent >= 50 ? "#F59E0B" : "#EF4444";
                  
                  const statusText = attendancePercent >= 75 ? "Good" : 
                                   attendancePercent >= 50 ? "Warning" : "At Risk";
                  
                  const statusBg = attendancePercent >= 75 ? "#DCFCE7" : 
                                 attendancePercent >= 50 ? "#FEF3C7" : "#FEE2E2";

                  return (
                    <tr key={student.id} style={{ 
                      borderBottom: "1px solid #F1F5F9",
                      backgroundColor: index % 2 === 0 ? "#FAFBFC" : "white",
                      transition: "all 0.2s ease"
                    }}>
                      <td style={{ padding: "16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                          <div style={{
                            width: "40px",
                            height: "40px",
                            borderRadius: "50%",
                            backgroundColor: student.isMissing ? "#94A3B8" : "#173B66",
                            color: "white",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: "bold",
                            fontSize: "16px"
                          }}>
                            {student.isMissing ? "?" : (student.name?.charAt(0)?.toUpperCase() || "?")}
                          </div>
                          <div>
                            <div style={{ 
                              fontWeight: "600", 
                              color: student.isMissing ? "#94A3B8" : "#1E293B", 
                              fontSize: "15px" 
                            }}>
                              {student.name || "Unknown"}
                              {student.isMissing && (
                                <span style={{ 
                                  marginLeft: "8px", 
                                  fontSize: "12px", 
                                  color: "#EF4444",
                                  fontWeight: "500"
                                }}>
                                  (Data Missing)
                                </span>
                              )}
                            </div>
                            <div style={{ color: "#64748B", fontSize: "13px" }}>
                              ID: {student.studentId || student.code || student.id || "N/A"}
                            </div>
                          </div>
                        </div>
                      </td>
                      
                      <td style={{ padding: "16px" }}>
                        <div style={{ color: student.isMissing ? "#94A3B8" : "#1E293B", fontSize: "14px" }}>
                          {student.email || "No email"}
                        </div>
                      </td>
                      
                      <td style={{ padding: "16px", textAlign: "center" }}>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
                          <div style={{ 
                            fontWeight: "600", 
                            color: student.isMissing ? "#94A3B8" : "#1E293B", 
                            fontSize: "16px" 
                          }}>
                            {student.isMissing ? "N/A" : `${student.attendedSessions || 0}/${student.totalSessions || 0}`}
                          </div>
                          <div style={{ color: "#64748B", fontSize: "12px" }}>
                            {student.isMissing ? "No data" : `Missed: ${student.missedSessions || 0}`}
                          </div>
                        </div>
                      </td>
                      
                      <td style={{ padding: "16px", textAlign: "center" }}>
                        <div style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          padding: "8px 16px",
                          borderRadius: "20px",
                          backgroundColor: student.isMissing ? "#F1F5F9" : statusBg,
                          color: student.isMissing ? "#64748B" : attendanceColor,
                          fontWeight: "700",
                          fontSize: "14px",
                          minWidth: "80px"
                        }}>
                          {student.isMissing ? "N/A" : student.attendance}
                        </div>
                      </td>
                      
                      <td style={{ padding: "16px", textAlign: "center" }}>
                        <span style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          padding: "6px 12px",
                          borderRadius: "16px",
                          backgroundColor: student.isMissing ? "#F1F5F9" : statusBg,
                          color: student.isMissing ? "#64748B" : attendanceColor,
                          fontWeight: "600",
                          fontSize: "13px"
                        }}>
                          {student.isMissing ? "⚠️" : (attendancePercent >= 75 ? "✅" : attendancePercent >= 50 ? "⚠️" : "❌")}
                          {student.isMissing ? "Missing Data" : statusText}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            
            {/* Summary Statistics */}
            <div style={{ 
              marginTop: "30px", 
              display: "grid", 
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", 
              gap: "20px" 
            }}>
              <div style={{
                padding: "20px",
                backgroundColor: "#DCFCE7",
                borderRadius: "12px",
                textAlign: "center"
              }}>
                <div style={{ fontSize: "24px", fontWeight: "700", color: "#10B981" }}>
                  {students.filter(s => !s.isMissing && parseFloat(s.attendance || "0") >= 75).length}
                </div>
                <div style={{ color: "#059669", fontSize: "14px", fontWeight: "600" }}>
                  Good Attendance (≥75%)
                </div>
              </div>
              
              <div style={{
                padding: "20px",
                backgroundColor: "#FEF3C7",
                borderRadius: "12px",
                textAlign: "center"
              }}>
                <div style={{ fontSize: "24px", fontWeight: "700", color: "#F59E0B" }}>
                  {students.filter(s => {
                    if (s.isMissing) return false;
                    const percent = parseFloat(s.attendance || "0");
                    return percent >= 50 && percent < 75;
                  }).length}
                </div>
                <div style={{ color: "#D97706", fontSize: "14px", fontWeight: "600" }}>
                  Warning (50-74%)
                </div>
              </div>
              
              <div style={{
                padding: "20px",
                backgroundColor: "#FEE2E2",
                borderRadius: "12px",
                textAlign: "center"
              }}>
                <div style={{ fontSize: "24px", fontWeight: "700", color: "#EF4444" }}>
                  {students.filter(s => !s.isMissing && parseFloat(s.attendance || "0") < 50).length}
                </div>
                <div style={{ color: "#DC2626", fontSize: "14px", fontWeight: "600" }}>
                  At Risk (&lt;50%)
                </div>
              </div>
              
              {students.some(s => s.isMissing) && (
                <div style={{
                  padding: "20px",
                  backgroundColor: "#F1F5F9",
                  borderRadius: "12px",
                  textAlign: "center"
                }}>
                  <div style={{ fontSize: "24px", fontWeight: "700", color: "#64748B" }}>
                    {students.filter(s => s.isMissing).length}
                  </div>
                  <div style={{ color: "#64748B", fontSize: "14px", fontWeight: "600" }}>
                    Missing Data
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Reports;