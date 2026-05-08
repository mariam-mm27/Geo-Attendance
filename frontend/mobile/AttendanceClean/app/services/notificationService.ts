import { db, auth } from '../firebase';
import { collection, query, where, orderBy, limit, getDocs, doc, updateDoc, Timestamp } from 'firebase/firestore';

const API_BASE_URL = 'http://192.168.1.2:5000/api/notifications';

export interface Notification {
  id: string;
  userId: string;
  type: 'absence_alert' | 'info' | 'warning' | 'success';
  title: string;
  message: string;
  courseId?: string;
  courseName?: string;
  attendanceRate?: number;
  absenceRate?: number;
  read: boolean;
  createdAt: Date;
  priority: 'high' | 'normal' | 'low';
  readAt?: Date;
}

export interface AbsenceCheckResult {
  exceeded: boolean;
  attendanceRate: number;
  absenceRate: number;
  totalSessions: number;
  attendedSessions: number;
  missedSessions: number;
}

/**
 * Check if student's absence exceeds threshold
 */
export const checkStudentAbsence = async (
  studentId: string,
  courseId: string
): Promise<AbsenceCheckResult | null> => {
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
 * Get user notifications from Firestore (real-time)
 */
export const getUserNotifications = async (
  userId: string,
  limitCount: number = 20
): Promise<Notification[]> => {
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
      } as Notification;
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return [];
  }
};

/**
 * Mark notification as read
 */
export const markNotificationAsRead = async (
  notificationId: string
): Promise<boolean> => {
  try {
    const notificationRef = doc(db, 'notifications', notificationId);
    await updateDoc(notificationRef, {
      read: true,
      readAt: Timestamp.now(),
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
export const getUnreadCount = async (userId: string): Promise<number> => {
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
export const checkCourseAbsences = async (
  courseId: string
): Promise<{ alertsSent: number; studentsChecked: number } | null> => {
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