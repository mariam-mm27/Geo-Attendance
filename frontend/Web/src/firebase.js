import { initializeApp } from "firebase/app";
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';


const firebaseConfig = {
  apiKey: "AIzaSyASFFQCKoJ8tOvfroQk2OsTa-_O3SzH69o",
  authDomain: "geo-attendance-f0d04.firebaseapp.com",
  projectId: "geo-attendance-f0d04",
  storageBucket: "geo-attendance-f0d04.firebasestorage.app",
  messagingSenderId: "897500805947",
  appId: "1:897500805947:web:5dc2250cae5e8bab14d51e",
  measurementId: "G-95WE3S8D8M"
};

<<<<<<< HEAD
// Initialize Firebase
=======
>>>>>>> 8b9578bc1e2302e3a75ac27510a86a584aaa425f
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };