import { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";

function Student() {

  const [userData, setUserData] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      if (auth.currentUser) {
        const ref = doc(db, "users", auth.currentUser.uid);
        const snap = await getDoc(ref);

        if (snap.exists()) {
          setUserData(snap.data());
        }
      }
    };

    fetchUser();
  }, []);

  return (
    <div>
      <h1>Student Dashboard</h1>
      {userData && <p>Welcome {userData.name}</p>}
    </div>
  );
}

export default Student;