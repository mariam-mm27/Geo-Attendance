// ========= REGISTER VALIDATION =========

export const validateRegister = (data) => {
  const {
    role,
    name,
    email,
    password,
    studentId,
    adminCode,
  } = data;

  // Common validations
  if (!role || !name || !email || !password) {
    return "All fields are required.";
  }

  // Email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return "Invalid email format.";
  }

  // Password length
  if (password.length < 6) {
    return "Password must be at least 6 characters.";
  }

  // Role validation
  if (!["student", "professor", "admin"].includes(role)) {
    return "Invalid role selected.";
  }

  // Student rules
  if (role === "student") {
    if (!studentId) {
      return "Student ID is required.";
    }

    if (!/^\d{7}$/.test(studentId)) {
      return "Student ID must be exactly 7 digits.";
    }

    if (!email.endsWith("@std.sci.cu.edu.eg")) {
      return "Student email must end with @std.sci.cu.edu.eg";
    }
  }

  // Professor rules
  if (role === "professor") {
    if (!email.endsWith("@std.sci.cu.edu.eg")) {
      return "Professor email must end with @std.sci.cu.edu.eg";
    }
  }

  // Admin rules
  if (role === "admin") {
    if (!adminCode) {
      return "Admin code is required.";
    }

    if (adminCode !== "ADMIN@2025") {
      return "Invalid admin code.";
    }
  }

  return null;
};

// ========= LOGIN VALIDATION =========

export const validateLogin = (data) => {
  const { email, password } = data;

  if (!email || !password) {
    return "Email and password are required.";
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return "Invalid email format.";
  }

  return null;
};