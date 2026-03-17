
import admin from "firebase-admin";  
 import { readFileSync } from "fs";
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "",
  authDomain: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: ""
};

const app = initializeApp(firebaseConfig);


 const db = admin.firestore();
export const auth = getAuth(app);
export{db,auth,admin};

