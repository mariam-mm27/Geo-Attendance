import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  getUserNotifications,
  markNotificationAsRead,
} from '../services/notificationService';
import './NotificationPage.css';

export default function NotificationsPage() {
  const { currentUser } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, unread, read

  useEffect(() => {
    loadNotifications();
  }, [currentUser]);

  const loadNotifications = async () => {
    if (!currentUser?.uid) return;

    try {
      const data = await getUserNotifications(currentUser.uid);
      setNotifications(data);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationClick = async (notification) => {
    if (!notification.read) {
      await markNotificationAsRead(notification.id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n))
      );
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'absence_alert':
        return '⚠️';
      case 'success':
        return '✅';
      case 'warning':
        return '⚡';
      default:
        return 'ℹ️';
    }
  };

  const formatDate = (date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const filteredNotifications = notifications.filter((n) => {
    if (filter === 'unread') return !n.read;
    if (filter === 'read') return n.read;
    return true;
  });

  if (loading) {
    return (
      <div className="notifications-page">
        <div className="loading">Loading notifications...</div>
      </div>
    );
  }

  return (
    <div className="notifications-page">
      <div className="notifications-header">
        <h1>Notifications</h1>
        <div className="filter-buttons">
          <button
            className={filter === 'all' ? 'active' : ''}
            onClick={() => setFilter('all')}
          >
            All ({notifications.length})
          </button>
          <button
            className={filter === 'unread' ? 'active' : ''}
            onClick={() => setFilter('unread')}
          >
            Unread ({notifications.filter((n) => !n.read).length})
          </button>
          <button
            className={filter === 'read' ? 'active' : ''}
            onClick={() => setFilter('read')}
          >
            Read ({notifications.filter((n) => n.read).length})
          </button>
        </div>
      </div>

      {filteredNotifications.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🔔</div>
          <p>No notifications to display</p>
        </div>
      ) : (
        <div className="notifications-list">
          {filteredNotifications.map((notification) => (
            <div
              key={notification.id}
              className={`notification-card ${!notification.read ? 'unread' : ''}`}
              onClick={() => handleNotificationClick(notification)}
            >
              <div className="notification-icon">
                {getNotificationIcon(notification.type)}
              </div>
              <div className="notification-content">
                <h3>{notification.title}</h3>
                <p>{notification.message}</p>
                {notification.courseName && (
                  <div className="course-tag">📚 {notification.courseName}</div>
                )}
                {notification.attendanceRate !== undefined && (
                  <div className="attendance-info">
                    Attendance: {notification.attendanceRate}% | Absence:{' '}
                    {notification.absenceRate}%
                  </div>
                )}
                <div className="notification-footer">
                  <span className="timestamp">{formatDate(notification.createdAt)}</span>
                  {notification.priority === 'high' && (
                    <span className="priority-badge">High Priority</span>
                  )}
                </div>
              </div>
              {!notification.read && <div className="unread-dot"></div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}