import React, { useState } from "react";
import { colors } from "../styles/colors";

const AddSubjectModal = ({ show, onClose, onAddSubject, subjects }) => {
  const [newSubjectName, setNewSubjectName] = useState("");

  if (!show) return null;

  const handleAdd = () => {
    if (newSubjectName.trim() === "") return alert("Please enter subject name");
    if (subjects.some((s) => s.name.toLowerCase() === newSubjectName.toLowerCase()))
      return alert("Subject already exists");

    onAddSubject(newSubjectName);
    setNewSubjectName("");
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        backgroundColor: "rgba(0,0,0,0.5)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <div
        style={{
          backgroundColor: "white",
          padding: "30px",
          borderRadius: "10px",
          width: "400px",
          position: "relative",
        }}
      >
        <button
          style={{
            position: "absolute",
            top: "10px",
            right: "10px",
            background: "transparent",
            border: "none",
            fontSize: "18px",
            cursor: "pointer",
          }}
          onClick={onClose}
        >
          ×
        </button>

        <h2 style={{ color: colors.primary }}>Add New Subject</h2>
        <input
          type="text"
          placeholder="Subject Name"
          value={newSubjectName}
          onChange={(e) => setNewSubjectName(e.target.value)}
          style={{
            width: "100%",
            padding: "10px",
            marginTop: "10px",
            borderRadius: "5px",
            border: "1px solid #ccc",
          }}
        />
        <div style={{ marginTop: "20px", display: "flex", justifyContent: "flex-end" }}>
          <button
            style={{
              backgroundColor: colors.accent,
              color: "white",
              padding: "10px 20px",
              borderRadius: "8px",
              border: "none",
              cursor: "pointer",
            }}
            onClick={handleAdd}
          >
            Add
          </button>
          <button
            style={{
              marginLeft: "10px",
              backgroundColor: "#ccc",
              color: "white",
              padding: "10px 20px",
              borderRadius: "8px",
              border: "none",
              cursor: "pointer",
            }}
            onClick={onClose}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddSubjectModal;