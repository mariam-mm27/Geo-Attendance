export const validateRegister = ({
  role,
  name,
  id,
  email,
  password,
}) => {
  if (!role || !name || !email || !password || (role === "student" && !id)) {
    return "All fields are required.";
  }

  if (role !== "student" && role !== "professor") {
    return "Invalid role selected.";
  }

  // Email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return "Invalid email format.";
  }

  // Password
  if (password.length < 6) {
    return "Password must be at least 6 characters.";
  }

  // Student ID validation
  if (role === "student") {
    const idRegex = /^[0-9]+$/;

    if (!idRegex.test(id)) {
      return "Student ID must contain numbers only.";
    }

    if (id.length !== 7) {
      return "Student ID must be exactly 7 digits.";
    }
  }

  if (role === "student" && !email.endsWith("@std.sci.cu.edu.eg")) {
    return "Student email must end with @std.sci.cu.edu.eg";
  }

  if (role === "professor" && !email.endsWith("@sci.cu.edu.eg")) {
    return "Professor email must end with @sci.cu.edu.eg";
  }

  return null;
};