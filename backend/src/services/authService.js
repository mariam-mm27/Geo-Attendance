import { auth } from "../config/firebase.js";

/**
 * Helper for handling Firebase Auth errors
 */
const handleAuthError = (error) => {
  console.error("Auth Error:", error.code, error.message);

  if (error.code === "auth/email-already-exists") {
    throw new Error("Email already in use");
  }

  if (error.code === "auth/invalid-password") {
    throw new Error("Weak password (min 6 chars)");
  }

  if (error.code === "auth/user-not-found") {
    throw new Error("User not found");
  }

  if (error.code === "auth/invalid-uid") {
    throw new Error("Invalid user id");
  }

  throw new Error("Authentication failed");
};

/**
 * Register Teacher
 */
export const registerTeacher = async (email, password) => {
  try {
    const userRecord = await auth.createUser({
      email,
      password,
    });

    return {
      uid: userRecord.uid,
      email: userRecord.email,
      role: "teacher",
    };
  } catch (error) {
    handleAuthError(error);
  }
};

/**
 * Register Student
 */
export const registerStudent = async (email, password) => {
  try {
    const userRecord = await auth.createUser({
      email,
      password,
    });

    return {
      uid: userRecord.uid,
      email: userRecord.email,
      role: "student",
    };
  } catch (error) {
    handleAuthError(error);
  }
};

/**
 * Login (generate custom token)
 */
export const login = async (uid) => {
  try {
    const token = await auth.createCustomToken(uid);
    return { token };
  } catch (error) {
    handleAuthError(error);
  }
};

/**
 * Logout (revoke refresh tokens)
 */
export const logout = async (uid) => {
  try {
    await auth.revokeRefreshTokens(uid);
    return { message: "User logged out" };
  } catch (error) {
    handleAuthError(error);
  }
};