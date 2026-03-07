import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebase";

type Role = "professor" | "student" | null;

interface AuthContextType {
  user: User | null;
  role: Role;
  loading: boolean;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  setRole: React.Dispatch<React.SetStateAction<Role>>;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<Role>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
<<<<<<< HEAD
=======

>>>>>>> 8b9578bc1e2302e3a75ac27510a86a584aaa425f
      if (firebaseUser) {
        setUser(firebaseUser);

        const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));

        if (userDoc.exists()) {
          const data = userDoc.data();
          setRole(data.role as Role);
        } else {
          setRole(null);
        }
<<<<<<< HEAD
=======

>>>>>>> 8b9578bc1e2302e3a75ac27510a86a584aaa425f
      } else {
        setUser(null);
        setRole(null);
      }

      setLoading(false);
<<<<<<< HEAD
    });

    return unsubscribe;
=======

    });

    return unsubscribe;

>>>>>>> 8b9578bc1e2302e3a75ac27510a86a584aaa425f
  }, []);

  return (
    <AuthContext.Provider value={{ user, role, loading, setUser, setRole }}>
<<<<<<< HEAD
      {children}
=======
      {loading ? null : children}
>>>>>>> 8b9578bc1e2302e3a75ac27510a86a584aaa425f
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
};