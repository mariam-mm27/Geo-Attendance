// backend/src/config/firebase.js
import admin from "firebase-admin";
import { readFileSync } from "node:fs";
import { join } from "node:path";


const serviceAccountPath = join(process.cwd(), "backend", "serviceAccount.json");

let serviceAccount;
try {
  serviceAccount = JSON.parse(readFileSync(serviceAccountPath, "utf-8"));
} catch (err) {
  console.error("Error reading serviceAccount.json:", err.message);
  process.exit(1);
}


admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

export const db = admin.firestore();

console.log("Firebase initialized and Firestore connected!");