import React, { createContext, useContext, useEffect, useState } from "react";

import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

import { auth, db } from "../firebase";

export const AuthContext = createContext();

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      try {

        // ================= USER LOGGED IN =================

        if (currentUser) {

          await currentUser.reload();

          // ================= EMAIL NOT VERIFIED =================

          if (!currentUser.emailVerified) {
            setUser(null);
            setRole(null);
            setLoading(false);
            return;
          }

          // ================= GET USER ROLE =================

          const userRef = doc(db, "users", currentUser.uid);

          const userSnap = await getDoc(userRef);

          if (userSnap.exists()) {

            const userData = userSnap.data();

            setUser(currentUser);
            setRole(userData.role);

          } else {

            // لو مفيش user document
            setUser(null);
            setRole(null);
          }

        } else {

          // ================= LOGGED OUT =================

          setUser(null);
          setRole(null);
        }

      } catch (error) {

        console.log("AUTH ERROR:", error);

        setUser(null);
        setRole(null);

      } finally {

        setLoading(false);
      }
    });

    return unsubscribe;

  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};