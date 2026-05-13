/**
 * Note: Firebase Auth is disabled in mock/test mode.
 * These functions require a valid serviceAccount.json to work.
 */

export const registerStudent = async (email, password) => {
  try {
    return {
      success: false,
      error: "Firebase Auth is not available in mock mode. Requires serviceAccount.json",
      uid: null
    };
  } catch (error) {
    return { success: false, error: error.message, uid: null };
  }
};