import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSy...", // هاتي ده من Firebase Console
  authDomain: "geo-attendance.firebaseapp.com",
  projectId: "geo-attendance-f0d04",
  storageBucket: "geo-attendance.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);