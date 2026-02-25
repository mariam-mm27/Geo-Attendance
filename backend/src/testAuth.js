import {
  registerTeacher,
  login,
} from "./services/authService.js";

const run = async () => {
  const user = await registerTeacher(
    "teacher2@test.com",
    "123456"
  );

  console.log("User created:", user);

  const token = await login(user.uid);
  console.log("Token:", token);
};

run();