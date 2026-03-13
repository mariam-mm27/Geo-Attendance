import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebase";
import { View, ActivityIndicator, StyleSheet } from "react-native";

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
      try {
        if (firebaseUser) {
          setUser(firebaseUser);

          const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));

          if (userDoc.exists()) {
            const data = userDoc.data();
            setRole(data.role?.toLowerCase() as Role);
          } else {
            setRole(null);
          }
        } else {
          setUser(null);
          setRole(null);
        }
      } catch (error) {
        console.error("Auth state change error:", error);
        setUser(null);
        setRole(null);
      } finally {
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#173B66" />
      </View>
    );
  }

  return (
    <AuthContext.Provider value={{ user, role, loading, setUser, setRole }}>
      {children}
    </AuthContext.Provider>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
  },
});


export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
};
