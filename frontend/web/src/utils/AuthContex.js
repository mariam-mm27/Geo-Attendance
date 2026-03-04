import { createContext, useEffect, useState } from "react";
import { auth, db } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      try {
        if (currentUser) {
          const docRef = doc(db, "users", currentUser.uid);
          const docSnap = await getDoc(docRef);

          if (docSnap.exists()) {
            setUser(currentUser);
            setRole(docSnap.data().role);
          } else {
            setUser(currentUser);
            setRole(null);
          }
        } else {
          setUser(null);
          setRole(null);
        }
      } catch (error) {
        console.log("Auth error:", error);
      }

      setLoading(false); 
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return <div>Loading...</div>; 
  }

  return (
    <AuthContext.Provider value={{ user, role }}>
      {children}
    </AuthContext.Provider>
  );
};