import { useState } from "react";
import { storage, db, auth } from "../firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { doc, updateDoc } from "firebase/firestore";

export default function UploadProfileImage() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const selected = e.target.files[0];
    if (!selected) return;

    setFile(selected);
    setPreview(URL.createObjectURL(selected));
  };

  const handleUpload = async () => {
    if (!file) return;

    setLoading(true);

    const user = auth.currentUser;
    const storageRef = ref(storage, `profileImages/${user.uid}`);

    await uploadBytes(storageRef, file);

    const url = await getDownloadURL(storageRef);

    await updateDoc(doc(db, "users", user.uid), {
      photoURL: url
    });

    setLoading(false);
    alert("Image uploaded successfully");
  };

  return (
    <div>
      <h3>Profile Image</h3>

      <input type="file" onChange={handleChange} />

      {preview && (
        <div>
          <img src={preview} width="120" />
        </div>
      )}

      {file && (
        <button onClick={handleUpload} disabled={loading}>
          {loading ? "Uploading..." : "Upload Image"}
        </button>
      )}
    </div>
  );
}