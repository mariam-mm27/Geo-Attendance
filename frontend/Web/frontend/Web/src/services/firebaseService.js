import {
collection,
getDocs,
getDoc,
doc,
} from "firebase/firestore";

import { db } from "../firebase";

export const getStudentData = async (userId) => {
const snapshot = await getDoc(
doc(db, "users", userId)
);

if (!snapshot.exists()) return null;

return snapshot.data();
};

export const getCourses = async () => {
const snapshot = await getDocs(
collection(db, "courses")
);

return snapshot.docs.map(doc => ({
id: doc.id,
...doc.data(),
}));
};

export const getProfessors = async () => {
const snapshot = await getDocs(
collection(db, "professors")
);

return snapshot.docs.map(doc => ({
id: doc.id,
...doc.data(),
}));
};

export const getEnrollments = async () => {
const snapshot = await getDocs(
collection(db, "enrollments")
);

return snapshot.docs.map(doc => ({
id: doc.id,
...doc.data(),
}));
};
