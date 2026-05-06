import { useState } from "react";
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage";
import { doc, updateDoc } from "firebase/firestore";
import { auth, db, storage } from "../firebase";
export default function UploadProfileImage({ onUploadSuccess, currentPhotoURL }) {
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [progress, setProgress] = useState(0);

  const hasPhoto = preview || currentPhotoURL;

  const handleChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    uploadImage(file);
  };

  const uploadImage = (file) => {
    const user = auth.currentUser;
    if (!user) return;

    setUploading(true);
    const storageRef = ref(storage, `profileImages/${user.uid}`);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on(
      "state_changed",
      (snapshot) => {
        const pct = Math.round(
          (snapshot.bytesTransferred / snapshot.totalBytes) * 100
        );
        setProgress(pct);
      },
      (error) => {
        console.error("Upload failed:", error);
        setUploading(false);
      },
      async () => {
        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
        await updateDoc(doc(db, "users", user.uid), { photoURL: downloadURL });
        setUploading(false);
        setProgress(0);
        if (onUploadSuccess) onUploadSuccess(downloadURL);
      }
    );
  };

  const handleDelete = async () => {
    const user = auth.currentUser;
    if (!user) return;

    setDeleting(true);
    try {
      const storageRef = ref(storage, `profileImages/${user.uid}`);
      await deleteObject(storageRef);
    } catch (error) {
      console.log("No image in storage or already deleted");
    }

    await updateDoc(doc(db, "users", user.uid), { photoURL: "" });
    setPreview(null);
    setDeleting(false);
    if (onUploadSuccess) onUploadSuccess("");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      {/* Change Photo */}
      <input
        type="file"
        accept="image/*"
        onChange={handleChange}
        style={{ display: "none" }}
        id="profile-image-input"
      />
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
        {uploading ? `Uploading... ${progress}%` : "📷 Change Photo"}
      </label>

      {/* Delete - بيظهر دايما لو في صورة */}
      {hasPhoto && (
        <button
          onClick={handleDelete}
          disabled={deleting}
          style={{
            backgroundColor: "transparent",
            color: deleting ? "#94a3b8" : "#EF4444",
            padding: "4px 14px",
            borderRadius: "6px",
            cursor: deleting ? "not-allowed" : "pointer",
            fontSize: "11px",
            fontWeight: "500",
            border: "1px solid #EF4444",
            textAlign: "center",
          }}
        >
          {deleting ? "Deleting..." : "🗑️ Delete Photo"}
        </button>
      )}
    </div>
  );
}