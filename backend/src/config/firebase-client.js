import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyASFFQCKoJ8tOvfroQk2OsTa-_O3SzH69o",
  authDomain: "geo-attendance-f0d04.firebaseapp.com",
  projectId: "geo-attendance-f0d04",
  storageBucket: "geo-attendance-f0d04.appspot.com",
  messagingSenderId: "897500805947",
  appId: "1:897500805947:web:5dc2250cae5e8bab14d51e",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

console.log("✅ Firebase Client SDK initialized");
