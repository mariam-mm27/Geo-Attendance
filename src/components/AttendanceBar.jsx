import React from "react";
import { colors } from "../styles/colors";

const AttendanceBar = ({ attendance }) => (
  <div
    style={{
      height: "20px",
      backgroundColor: "#ddd",
      borderRadius: "10px",
      marginTop: "10px",
      position: "relative",
    }}
  >
    <div
      style={{
        width: `${attendance}%`,
        height: "100%",
        background: attendance < 75
          ? "linear-gradient(90deg, red, darkred)"
          : "linear-gradient(90deg, #14B8A6, #0d9488)",
        borderRadius: "10px",
        transition: "width 0.5s ease",
      }}
    />
    <span
      style={{
        position: "absolute",
        top: 0,
        left: "50%",
        transform: "translateX(-50%)",
        fontSize: "12px",
        fontWeight: "bold",
        color: "#fff",
      }}
    >
      {attendance}%
    </span>
  </div>
);

export default AttendanceBar;