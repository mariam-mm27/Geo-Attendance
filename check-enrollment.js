// Simple script to check enrollment data
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJ",
  authDomain: "geo-attendance-f0d04.firebaseapp.com",
  projectId: "geo-attendance-f0d04",
  storageBucket: "geo-attendance-f0d04.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdefghijklmnop"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkData() {
  try {
    console.log('🔍 Checking enrollment data...');
    
    // Get all enrollments
    const enrollmentsSnapshot = await getDocs(collection(db, 'enrollments'));
    console.log(`📋 Total enrollments: ${enrollmentsSnapshot.size}`);
    
    enrollmentsSnapshot.forEach(doc => {
      const data = doc.data();
      console.log(`- Student: ${data.studentId}, Course: ${data.courseId}, Date: ${data.enrolledAt?.toDate?.() || data.enrolledAt}`);
    });
    
    // Get Data Structures course
    const coursesQuery = query(collection(db, 'courses'), where('name', '==', 'Data Structures'));
    const coursesSnapshot = await getDocs(coursesQuery);
    
    if (!coursesSnapshot.empty) {
      const courseDoc = coursesSnapshot.docs[0];
      const courseData = courseDoc.data();
      console.log(`\n📚 Data Structures Course (${courseDoc.id}):`);
      console.log(`- Enrolled Students: ${JSON.stringify(courseData.enrolledStudents || [])}`);
      
      // Get sessions for this course
      const sessionsQuery = query(collection(db, 'sessions'), where('courseId', '==', courseDoc.id));
      const sessionsSnapshot = await getDocs(sessionsQuery);
      console.log(`\n🎓 Sessions (${sessionsSnapshot.size} total):`);
      
      sessionsSnapshot.forEach(sessionDoc => {
        const sessionData = sessionDoc.data();
        console.log(`- Session ${sessionData.sessionId}: ${sessionData.createdAt?.toDate?.() || sessionData.createdAt}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkData();