// backend/src/config/firebase.js
const admin = require("firebase-admin");
const serviceAccount = require("../../geo-attendance-f0d04-firebase-adminsdk-fbsvc-09b2e10fe1.json"); // تأكدي المسار

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

module.exports = db;