export const loginUser = async (
  role: string,
  idOrEmail: string,
  password: string
) => {

  if (role === 'student') {
    return { success: true, role: 'student' }
  }

  if (role === 'teacher') {
    return { success: true, role: 'teacher' }
  }

  return { success: false }
}