import { db } from "../firebase";  // ✅ صح
// import { readFileSync } from "fs";

const serviceAccount = JSON.parse(
  readFileSync("./serviceAccount.json", "utf8")
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

export const db = admin.firestore();
export { admin };