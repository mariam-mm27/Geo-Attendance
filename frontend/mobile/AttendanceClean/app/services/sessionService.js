import { db, auth } from "../firebase";
import {
  collection,
  addDoc,
  serverTimestamp,
  doc,
  updateDoc,
  getDoc,
  query,
  where,
  getDocs
} from "firebase/firestore";

/* =========================
   1️⃣ Create Session
========================= */
export const createSession = async (courseId, duration) => {
  try {
    const professor = auth.currentUser;

    if (!professor) {
      throw new Error("No authenticated user");
    }

    // تحقق من الرول
    const userRef = doc(db, "users", professor.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists() || userSnap.data().role.toLowerCase() !== "professor") {
      throw new Error("Only Professors can create sessions");
    }

    const sessionRef = await addDoc(collection(db, "sessions"), {
      courseId,
      professorId: professor.uid,
      duration,
      isActive: true,
      createdAt: serverTimestamp(),
    });

    return sessionRef.id;

  } catch (error) {
    console.error("Error creating session:", error);
    throw error;
  }
};

/* =========================
   2️⃣ Close Session (Owner Only)
========================= */
export const closeSession = async (sessionId) => {
  try {
    const professor = auth.currentUser;

    if (!professor) {
      throw new Error("No authenticated user");
    }

    const sessionRef = doc(db, "sessions", sessionId);
    const sessionSnap = await getDoc(sessionRef);

    if (!sessionSnap.exists()) {
      throw new Error("Session not found");
    }

    if (sessionSnap.data().professorId !== professor.uid) {
      throw new Error("You are not allowed to close this session");
    }

    await updateDoc(sessionRef, {
      isActive: false,
    });

  } catch (error) {
    console.error("Error closing session:", error);
    throw error;
  }
};

/* =========================
   3️⃣ Get Sessions For Professor
========================= */
export const getProfessorSessions = async () => {
  try {
    const professor = auth.currentUser;

    if (!professor) {
      throw new Error("No authenticated user");
    }

    const q = query(
      collection(db, "sessions"),
      where("professorId", "==", professor.uid)
    );

    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

  } catch (error) {
    console.error("Error fetching sessions:", error);
    throw error;
  }
};

/* =========================
   4️⃣ Get All Sessions (Admin)
========================= */
export const getAllSessions = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, "sessions"));

    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

  } catch (error) {
    console.error("Error fetching all sessions:", error);
    throw error;
  }
};

/* =========================
   5️⃣ Get Session By ID
========================= */
export const getSessionById = async (sessionId) => {
  try {
    const sessionRef = doc(db, "sessions", sessionId);
    const sessionSnap = await getDoc(sessionRef);

    if (!sessionSnap.exists()) {
      throw new Error("Session not found");
    }

    return {
      id: sessionSnap.id,
      ...sessionSnap.data(),
    };

  } catch (error) {
    console.error("Error fetching session:", error);
    throw error;
  }
};