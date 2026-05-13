import { markAttendance } from "../backend/src/models/attendance.js"; // المسار النسبي مضبوط

const testAttendance = async () => {
  try {
    const result = await markAttendance("student123", "session456");
    console.log({ success: true, data: result });
  } catch (error) {
    console.log({ success: false, message: error.message });
  }
};

testAttendance();