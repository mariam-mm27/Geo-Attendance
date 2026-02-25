import { auth, db } from "./config/firebase.js";

console.log("Auth ready:", !!auth);
console.log("DB ready:", !!db);