export const loginUser = async (
  role: string,
  idOrEmail: string,
  password: string
) => {

  // Fake logic
  if (role === 'student') {
    return { success: true, role: 'student' }
  }

  if (role === 'teacher') {
    return { success: true, role: 'teacher' }
  }

  return { success: false }
}