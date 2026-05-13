export const analyzeAttendance = (sessions) => {
  if (!sessions || sessions.length === 0) {
    return {
      percentage: 0,
      risk: "HIGH_RISK",
      advice: "No attendance records found"
    };
  }

  const total = sessions.length;
  const attended = sessions.filter(s => s.attended).length;

  const percentage = (attended / total) * 100;

  let risk = "SAFE";
  let advice = "Good attendance. Keep it up!";

  if (percentage < 60) {
    risk = "HIGH_RISK";
    advice = "You are at risk! You may fail this course.";
  } else if (percentage < 75) {
    risk = "WARNING";
    advice = "Try to improve your attendance.";
  }

  return {
    percentage,
    risk,
    advice
  };
};