import { auth, db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";

export const getUserProfile = async () => {
  try {
    const user = auth.currentUser;

    if (!user) return null;

    const snap = await getDoc(doc(db, "users", user.uid));

    if (snap.exists()) {
      return snap.data();
    }

    return null;

  } catch (error) {
    console.log(error);
    return null;
  }
};