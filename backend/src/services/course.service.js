import admin from '../config/firebase.js';
const db = admin.firestore();

/**
 * Update course details
 * @param {string} courseId - Course ID
 * @param {object} courseData - Course data to update
 * @returns {Promise<object>} Success/error response
 */
const updateCourse = async (courseId, courseData) => {
  try {
    const courseRef = db.collection('courses').doc(courseId);
    
    // Check if course exists
    const courseDoc = await courseRef.get();
    if (!courseDoc.exists) {
      return { success: false, message: 'Course not found' };
    }

    // Update course
    await courseRef.update({
      ...courseData,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return { success: true, message: 'Course updated successfully' };
  } catch (error) {
    console.error('Error updating course:', error);
    return { success: false, message: error.message };
  }
};

/**
 * Delete course and all related data (sessions, attendance, enrollments)
 * @param {string} courseId - Course ID
 * @returns {Promise<object>} Success/error response
 */
const deleteCourse = async (courseId) => {
  try {
    const batch = db.batch();
    
    const courseRef = db.collection('courses').doc(courseId);
    const courseDoc = await courseRef.get();
    if (!courseDoc.exists) {
      return { success: false, message: 'Course not found' };
    }

    const sessionsSnapshot = await db.collection('sessions')
      .where('courseId', '==', courseId)
      .get();
    
    sessionsSnapshot.forEach(doc => {
      batch.delete(doc.ref);
    });

    const attendanceSnapshot = await db.collection('attendance')
      .where('courseId', '==', courseId)
      .get();
    
    attendanceSnapshot.forEach(doc => {
      batch.delete(doc.ref);
    });

    const enrollmentsSnapshot = await db.collection('enrollments')
      .where('courseId', '==', courseId)
      .get();
    
    enrollmentsSnapshot.forEach(doc => {
      batch.delete(doc.ref);
    });

    batch.delete(courseRef);

    await batch.commit();

    return { 
      success: true, 
      message: 'Course and all related data deleted successfully',
      deletedSessions: sessionsSnapshot.size,
      deletedAttendance: attendanceSnapshot.size,
      deletedEnrollments: enrollmentsSnapshot.size
    };
  } catch (error) {
    console.error('Error deleting course:', error);
    return { success: false, message: error.message };
  }
};

/**
 * Get all sessions for a specific course
 * @param {string} courseId - Course ID
 * @returns {Promise<object>} Sessions array with success status
 */
const getCourseSessions = async (courseId) => {
  try {
    const courseRef = db.collection('courses').doc(courseId);
    const courseDoc = await courseRef.get();
    if (!courseDoc.exists) {
      return { success: false, message: 'Course not found', sessions: [] };
    }

    const sessionsSnapshot = await db.collection('sessions')
      .where('courseId', '==', courseId)
      .orderBy('createdAt', 'desc')
      .get();

    const sessions = [];
    sessionsSnapshot.forEach(doc => {
      sessions.push({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || null
      });
    });

    return { 
      success: true, 
      sessions,
      totalSessions: sessions.length,
      activeSessions: sessions.filter(s => s.active).length,
      expiredSessions: sessions.filter(s => !s.active).length
    };
  } catch (error) {
    console.error('Error fetching course sessions:', error);
    return { success: false, message: error.message, sessions: [] };
  }
};

/**
 * Get course details by ID
 * @param {string} courseId - Course ID
 * @returns {Promise<object>} Course data
 */
const getCourseById = async (courseId) => {
  try {
    const courseDoc = await db.collection('courses').doc(courseId).get();
    
    if (!courseDoc.exists) {
      return { success: false, message: 'Course not found' };
    }

    return { 
      success: true, 
      course: { id: courseDoc.id, ...courseDoc.data() } 
    };
  } catch (error) {
    console.error('Error fetching course:', error);
    return { success: false, message: error.message };
  }
};

/**
 * Get all courses
 * @returns {Promise<object>} Courses array
 */
const getAllCourses = async () => {
  try {
    const coursesSnapshot = await db.collection('courses').get();
    
    const courses = [];
    coursesSnapshot.forEach(doc => {
      courses.push({
        id: doc.id,
        ...doc.data()
      });
    });

    return { success: true, courses };
  } catch (error) {
    console.error('Error fetching courses:', error);
    return { success: false, message: error.message, courses: [] };
  }
};

export {
  updateCourse,
  deleteCourse,
  getCourseSessions,
  getCourseById,
  getAllCourses
};
