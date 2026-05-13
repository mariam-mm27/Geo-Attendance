import { db } from "../config/firebase.js";

async function fixEnrollments() {
  const snapshot = await db.collection("enrollments").get();

  const promises = [];

  snapshot.forEach(doc => {
    const data = doc.data();
    if (data.IsActive === undefined) {
      promises.push(
        db.collection("enrollments").doc(doc.id).update({ IsActive: true })
      );
    }
  });

  await Promise.all(promises);
  console.log("✅ All enrollments fixed!");
}

fixEnrollments().then(() => process.exit());