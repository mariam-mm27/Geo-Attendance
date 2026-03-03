import { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";

function Profile() {

  const [profile, setProfile] = useState(null);

  useEffect(() => {

    const fetchProfile = async () => {

      if (!auth.currentUser) return;

      const uid = auth.currentUser.uid;

      const userSnap = await getDoc(
        doc(db, "users", uid)
      );

      if (userSnap.exists()) {
        setProfile(userSnap.data());
      }

    };

    fetchProfile();

  }, []);

  if (!profile) return <p>Loading profile...</p>;

  return (
    <div style={{ padding: "30px" }}>
      <h1>Profile Page</h1>

      <h2>Name: {profile.name}</h2>
      <h3>Email: {profile.email}</h3>
      <h3>Role: {profile.role}</h3>
      {profile.studentId && <h3>ID: {profile.studentId}</h3>}

    </div>
  );
}

export default Profile;