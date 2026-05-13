import React from "react";
import AttendanceBar from "./AttendanceBar";

const AttendanceCard = ({ analysis }) => {
  if (!analysis) return null;

  const getStatusColor = (risk) => {
    if (risk === "HIGH_RISK") return "#991B1B";
    if (risk === "WARNING") return "#92400E";
    return "#065F46";
  };

  const getStatusBg = (risk) => {
    if (risk === "HIGH_RISK") return "#FEE2E2";
    if (risk === "WARNING") return "#FEF3C7";
    return "#DCFCE7";
  };

  const getStatusText = (risk) => {
    if (risk === "HIGH_RISK") return "🚨 High Risk";
    if (risk === "WARNING") return "⚠️ Warning";
    return "✅ Safe";
  };

  return (
    <div
      style={{
        padding: "20px",
        borderRadius: "12px",
        background: "#fff",
        boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
        marginBottom: "25px",
        border: `1px solid ${getStatusColor(analysis.risk)}`      }}
    >
      {/* Title */}
      <h3 style={{ marginBottom: "15px", color: "#173B66" }}>
        📊 AI Attendance Report
      </h3>

      {/* Progress Bar */}
      <AttendanceBar attendance={analysis.percentage} />

      {/* Percentage */}
      <p style={{ marginTop: "10px" }}>
        <strong>Attendance:</strong>{" "}
        {analysis.percentage.toFixed(1)}%
      </p>

      {/* Status */}
      <div
        style={{
          display: "inline-block",
          padding: "6px 12px",
          borderRadius: "20px",
          backgroundColor: getStatusBg(analysis.risk),
          color: getStatusColor(analysis.risk),
          fontWeight: "600",
          fontSize: "14px",
          marginTop: "8px"
        }}
      >
        {getStatusText(analysis.risk)}
      </div>

      {/* Advice */}
      <p style={{ marginTop: "12px", color: "#475569" }}>
        <strong>Advice:</strong> {analysis.advice}
      </p>
    </div>
  );
};

export default AttendanceCard;