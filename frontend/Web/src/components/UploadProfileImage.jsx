import { useState } from "react";

export default function UploadProfileImage() {
  const [preview, setPreview] = useState(null);

  const handleChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setPreview(URL.createObjectURL(file));
  };

  return (
    <div>
      <input 
        type="file" 
        onChange={handleChange} 
        style={{ display: 'none' }}
        id="profile-image-input"
      />
      <label 
        htmlFor="profile-image-input"
        style={{
          backgroundColor: "#173B66",
          color: "white",
          padding: "8px 16px",
          borderRadius: "6px",
          cursor: "pointer",
          fontSize: "12px",
          fontWeight: "600",
          border: "none",
          display: "inline-block"
        }}
      >
        📷 Change Photo
      </label>

      {preview && (
        <img src={preview} alt="preview" width="150" style={{ marginTop: "10px" }} />
      )}
    </div>
  );
}