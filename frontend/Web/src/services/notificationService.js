import { db } from '../firebase';
import { collection, query, where, orderBy, limit, getDocs, doc, updateDoc } from 'firebase/firestore';

const API_BASE_URL = 'http://YOUR_BACKEND_URL:3000/api/notifications';

/**
 * Check if student's absence exceeds threshold
 */
export const checkStudentAbsence = async (studentId, courseId) => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/check-absence/${studentId}/${courseId}`
    );
    const data = await response.json();

    if (data.success) {
      return data.data;
    }
    return null;
  } catch (error) {
    console.error('Error checking absence:', error);
    return null;
  }
};

/**
 * Get user notifications from Firestore
 */
export const getUserNotifications = async (userId, limitCount = 20) => {
  try {
    const notificationsRef = collection(db, 'notifications');
    const q = query(
      notificationsRef,
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );

    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        readAt: data.readAt?.toDate(),
      };
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return [];
  }
};

/**
 * Mark notification as read
 */
export const markNotificationAsRead = async (notificationId) => {
  try {
    const notificationRef = doc(db, 'notifications', notificationId);
    await updateDoc(notificationRef, {
      read: true,
      readAt: new Date(),
    });
    return true;
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return false;
  }
};

/**
 * Get unread notification count
 */
export const getUnreadCount = async (userId) => {
  try {
    const notificationsRef = collection(db, 'notifications');
    const q = query(
      notificationsRef,
      where('userId', '==', userId),
      where('read', '==', false)
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.size;
  } catch (error) {
    console.error('Error getting unread count:', error);
    return 0;
  }
};

/**
 * Trigger absence check for all students in a course (Professor only)
 */
export const checkCourseAbsences = async (courseId) => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/check-course-absences/${courseId}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
    const data = await response.json();

    if (data.success) {
      return data.data;
    }
    return null;
  } catch (error) {
    console.error('Error checking course absences:', error);
    return null;
  }
};