import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyASFFQCKoJ8tOvfroQk2OsTa-_O3SzH69o",
  authDomain: "geo-attendance-f0d04.firebaseapp.com",
  projectId: "geo-attendance-f0d04",
  storageBucket: "geo-attendance-f0d04.appspot.com",
  messagingSenderId: "897500805947",
  appId: "1:897500805947:web:5dc2250cae5e8bab14d51e",
  measurementId: "G-95WE3S8D8M"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export { firebaseConfig };