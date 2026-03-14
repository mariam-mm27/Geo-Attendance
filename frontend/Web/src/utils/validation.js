

export const validateRegister = (data) => {
  const {
    role,
    name,
    email,
    password,
    studentId,
    adminCode,
  } = data;

 
  if (!role || !name || !email || !password) {
    return "All fields are required.";
  }

  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return "Invalid email format.";
  }


  if (password.length < 6) {
    return "Password must be at least 6 characters.";
  }

  if (!/[A-Z]/.test(password)) {
    return "Password must contain at least one uppercase letter.";
  }

  if (!/[a-z]/.test(password)) {
    return "Password must contain at least one lowercase letter.";
  }

  if (!/[0-9]/.test(password)) {
    return "Password must contain at least one number.";
  }

  
  if (!["student", "professor", "admin"].includes(role)) {
    return "Invalid role selected.";
  }

  
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

 
  if (role === "professor") {
    if (!email.endsWith("@sci.cu.edu.eg")) {
      return "Professor email must end with @sci.cu.edu.eg";
    }
  }

 
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
