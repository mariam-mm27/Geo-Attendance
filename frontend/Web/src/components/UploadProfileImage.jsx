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
      <h3>Profile Image</h3>

      <input type="file" onChange={handleChange} />

      {preview && (
        <img src={preview} alt="preview" width="150" />
      )}
    </div>
  );
}