import { useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { auth, db } from "../firebase";

export default function UploadProfileImage({ onUploadSuccess, currentPhotoURL }) {
  const [uploading, setUploading] = useState(false);

  const hasPhoto = currentPhotoURL && currentPhotoURL !== "";

  const handleChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    uploadImage(file);
  };

  const uploadImage = (file) => {
    const user = auth.currentUser;
    if (!user) return;

    // تحقق من حجم الصورة — لازم تكون أقل من 500KB
    if (file.size > 500 * 1024) {
      alert("Image too large! Please choose an image smaller than 500KB.");
      return;
    }

    setUploading(true);

    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const base64 = reader.result;
        await updateDoc(doc(db, "users", user.uid), { photoURL: base64 });
        setUploading(false);
        if (onUploadSuccess) onUploadSuccess(base64);
      } catch (err) {
        console.error("Error saving image:", err);
        setUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDelete = async () => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      await updateDoc(doc(db, "users", user.uid), { photoURL: "" });
      if (onUploadSuccess) onUploadSuccess("");
    } catch (err) {
      console.error("Error deleting image:", err);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      <input
        type="file"
        accept="image/*"
        onChange={handleChange}
        style={{ display: "none" }}
        id="profile-image-input"
      />

      {/* Choose أو Change حسب الحالة */}
      <label
        htmlFor="profile-image-input"
        style={{
          backgroundColor: uploading ? "#94a3b8" : "#173B66",
          color: "white",
          padding: "6px 14px",
          borderRadius: "6px",
          cursor: uploading ? "not-allowed" : "pointer",
          fontSize: "12px",
          fontWeight: "600",
          display: "inline-block",
          textAlign: "center",
        }}
      >
        {uploading ? "Uploading..." : hasPhoto ? "📷 Change Photo" : "📷 Choose Photo"}
      </label>

      {/* Delete - بيظهر بس لو في صورة */}
      {hasPhoto && !uploading && (
        <button
          onClick={handleDelete}
          style={{
            backgroundColor: "transparent",
            color: "#EF4444",
            padding: "4px 14px",
            borderRadius: "6px",
            cursor: "pointer",
            fontSize: "11px",
            fontWeight: "500",
            border: "1px solid #EF4444",
            textAlign: "center",
          }}
        >
          🗑️ Delete Photo
        </button>
      )}
    </div>
  );
}