import React, { createContext, useState, useEffect } from "react";
import { auth, db } from "../firebase";
import { signOut, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false); // 🔹

  useEffect(() => {
    const initialize = async () => {
      if (!initialized) {
        await signOut(auth); // Force logout مرة واحدة فقط
        setInitialized(true);
      }

      const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
        if (currentUser) {
          try {
            const docRef = doc(db, "users", currentUser.uid);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
              setUser(currentUser);
              setRole(docSnap.data().role);
            } else {
              setUser(null);
              setRole(null);
            }
          } catch (err) {
            console.log(err);
            setUser(null);
            setRole(null);
          }
        } else {
          setUser(null);
          setRole(null);
        }
        setLoading(false); // بعد ما الـ context اتحدث
      });

      return unsubscribe;
    };

    initialize();
  }, [initialized]);

  if (loading) return null; // ممكن تحطي ActivityIndicator بدل null

  return (
    <AuthContext.Provider value={{ user, setUser, role, setRole }}>
      {children}
    </AuthContext.Provider>
  );
};