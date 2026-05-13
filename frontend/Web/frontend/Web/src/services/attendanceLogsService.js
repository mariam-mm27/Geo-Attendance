import { db } from "../firebase";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc
} from "firebase/firestore";

export const searchStudentLogs = async (studentId) => {
  try {
    const usersSnap = await getDocs(
      query(collection(db, "users"), where("studentId", "==", studentId))
    );

    if (usersSnap.empty) {
      return {
        success: false,
        message: "Student not found"
      };
    }

    const userDoc = usersSnap.docs[0];
    const uid = userDoc.id;

    const studentInfo = {
      uid,
      ...userDoc.data()
    };

    
    const attSnap = await getDocs(
      query(collection(db, "attendance"), where("studentId", "==", uid))
    );

    const logs = await Promise.all(
      attSnap.docs.map(async (d) => {
        const data = d.data();

        let sessionInfo = {};
        if (data.sessionId) {
          const sessSnap = await getDocs(
            query(
              collection(db, "sessions"),
              where("sessionId", "==", data.sessionId)
            )
          );
          if (!sessSnap.empty) {
            sessionInfo = sessSnap.docs[0].data();
          }
        }

        let courseName = data.courseId;

        if (data.courseId) {
          const courseSnap = await getDoc(
            doc(db, "courses", data.courseId)
          );

          if (courseSnap.exists()) {
            courseName = courseSnap.data().name || courseName;
          }
        }

        return {
          id: d.id,
          sessionId: data.sessionId,
          courseName,
          lectureNumber: sessionInfo.lectureNumber || "—",
          recordedAt: data.recordedAt
        };
      })
    );

    logs.sort(
      (a, b) =>
        (b.recordedAt?.seconds ?? 0) -
        (a.recordedAt?.seconds ?? 0)
    );

    return {
      success: true,
      studentInfo,
      logs
    };

  } catch (error) {
    return {
      success: false,
      message: error.message
    };
  }
};