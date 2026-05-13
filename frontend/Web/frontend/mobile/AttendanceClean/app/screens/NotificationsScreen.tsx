import React, { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, SafeAreaView, ActivityIndicator
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { auth, db } from "../firebase";
import {
  collection, query, where, getDocs,
  onSnapshot, doc, updateDoc
} from "firebase/firestore";

type Notification = {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: any;
  courseName?: string;
  isCalculated?: boolean;
};

export default function NotificationsScreen({ navigation }: any) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [calculatedAlerts, setCalculatedAlerts] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch calculated alerts from course attendance data - generate all warning types with enrollment-based calculation
  const fetchCalculatedAlerts = async (uid: string) => {
    try {
      const coursesSnapshot = await getDocs(collection(db, "courses"));
      const alerts: Notification[] = [];

      // Get read calculated alerts from AsyncStorage
      const readCalculatedAlerts = JSON.parse(
        await AsyncStorage.getItem(`readCalculatedAlerts_${uid}`) || '[]'
      );

      for (const courseDoc of coursesSnapshot.docs) {
        const courseData = courseDoc.data();
        if ((courseData.enrolledStudents || []).includes(uid)) {
          // Get enrollment date for this student in this course
          const enrollmentQuery = query(
            collection(db, "enrollments"),
            where("studentId", "==", uid),
            where("courseId", "==", courseDoc.id)
          );
          const enrollmentSnap = await getDocs(enrollmentQuery);
          
          let enrollmentDate = null;
          if (!enrollmentSnap.empty) {
            const enrollmentData = enrollmentSnap.docs[0].data();
            enrollmentDate = enrollmentData.enrolledAt?.toDate?.() || enrollmentData.enrolledAt;
          }

          // Calculate enrollment-based attendance
          const sessionsQuery = query(
            collection(db, "sessions"),
            where("courseId", "==", courseDoc.id)
          );
          const sessionsSnapshot = await getDocs(sessionsQuery);
          
          // Filter sessions to only count those after enrollment date
          let totalSessions = 0;
          let sessionsAfterEnrollment: string[] = [];
          
          sessionsSnapshot.forEach((sessionDoc) => {
            const sessionData = sessionDoc.data();
            const sessionDate = sessionData.createdAt?.toDate?.() || sessionData.createdAt;
            
            // If no enrollment date found, count all sessions (backward compatibility)
            // If enrollment date exists, only count sessions after enrollment
            if (!enrollmentDate || !sessionDate || sessionDate >= enrollmentDate) {
              totalSessions++;
              sessionsAfterEnrollment.push(sessionData.sessionId);
            }
          });

          // Get attendance records for sessions after enrollment
          const attendanceQuery = query(
            collection(db, "attendance"),
            where("studentId", "==", uid),
            where("courseId", "==", courseDoc.id)
          );
          const attendanceSnapshot = await getDocs(attendanceQuery);
          
          let attendedSessions = 0;
          
          // Count only attendance for sessions after enrollment
          attendanceSnapshot.forEach((attendanceDoc) => {
            const attendanceData = attendanceDoc.data();
            if (sessionsAfterEnrollment.includes(attendanceData.sessionId)) {
              attendedSessions++;
            }
          });

          const attendanceRate = totalSessions > 0 ? (attendedSessions / totalSessions) * 100 : 100;
          const absenceRate = 100 - attendanceRate;
          const sessionsBeforeEnrollment = sessionsSnapshot.size - totalSessions;

          console.log(`📊 Mobile: Course ${courseData.name} - ${attendedSessions}/${totalSessions} = ${attendanceRate.toFixed(2)}% absence: ${absenceRate.toFixed(2)}% (${sessionsBeforeEnrollment} sessions before enrollment excluded)`);

          // Only generate warnings when thresholds are actually exceeded
          if (totalSessions === 0 || absenceRate < 10) continue;

          const enrollmentNote = enrollmentDate ? ` (from enrollment date: ${enrollmentDate.toLocaleDateString()})` : '';

          if (absenceRate >= 25) {
            // 🚫 FINAL EXAM DENIED
            const alertId = `calc-${courseDoc.id}-denied`;
            alerts.push({
              id: alertId,
              type: "absence_deprivation",
              title: "🚫 Denied from Final Exam",
              message: `Your absence in "${courseData.name}" is ${absenceRate.toFixed(1)}% (attended ${attendedSessions}/${totalSessions} sessions). You have been denied from the final exam. You received first warning at 10% and second warning at 20%.${enrollmentNote}`,
              courseName: courseData.name,
              read: readCalculatedAlerts.includes(alertId),
              isCalculated: true,
              createdAt: { seconds: Math.floor(Date.now() / 1000) },
            });
          } else if (absenceRate >= 20) {
            // ⚠️ SECOND WARNING
            const alertId = `calc-${courseDoc.id}-second`;
            alerts.push({
              id: alertId,
              type: "absence_warning",
              title: "⚠️ Second Warning",
              message: `Your absence in "${courseData.name}" is ${absenceRate.toFixed(1)}% (attended ${attendedSessions}/${totalSessions} sessions). This is your second warning. Improve your attendance immediately to avoid being denied from the final exam.${enrollmentNote}`,
              courseName: courseData.name,
              read: readCalculatedAlerts.includes(alertId),
              isCalculated: true,
              createdAt: { seconds: Math.floor(Date.now() / 1000) },
            });
          } else if (absenceRate >= 10) {
            // ⚡ FIRST WARNING
            const alertId = `calc-${courseDoc.id}-first`;
            alerts.push({
              id: alertId,
              type: "absence_alert",
              title: "⚡ First Warning",
              message: `Your absence in "${courseData.name}" is ${absenceRate.toFixed(1)}% (attended ${attendedSessions}/${totalSessions} sessions). Please improve your attendance to avoid further warnings.${enrollmentNote}`,
              courseName: courseData.name,
              read: readCalculatedAlerts.includes(alertId),
              isCalculated: true,
              createdAt: { seconds: Math.floor(Date.now() / 1000) },
            });
          }
        }
      }

      setCalculatedAlerts(alerts);
    } catch (error) {
      console.error("Error fetching calculated alerts:", error);
    }
  };

  useEffect(() => {
    const fetchNotifications = async () => {
      const user = auth.currentUser;
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // Fetch database notifications
        const q = query(
          collection(db, "notifications"),
          where("userId", "==", user.uid)
        );
        const snap = await getDocs(q);
        const dbNotifications = snap.docs
          .map(d => ({ id: d.id, ...d.data() } as Notification))
          .sort((a, b) => {
            const ta = a.createdAt?.seconds ?? 0;
            const tb = b.createdAt?.seconds ?? 0;
            return tb - ta;
          });
        
        setNotifications(dbNotifications);
        
        // Fetch calculated alerts
        await fetchCalculatedAlerts(user.uid);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();

    // Add focus listener to refresh when user returns to this screen
    const unsubscribe = navigation.addListener('focus', () => {
      fetchNotifications();
    });

    return unsubscribe;
  }, [navigation]);
  const markRead = async (id: string, isCalculated?: boolean) => {
    if (isCalculated) {
      // For calculated alerts, update local state and save to AsyncStorage
      setCalculatedAlerts((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
      
      // Save to AsyncStorage
      const user = auth.currentUser;
      if (user) {
        const readCalculatedAlerts = JSON.parse(
          await AsyncStorage.getItem(`readCalculatedAlerts_${user.uid}`) || '[]'
        );
        if (!readCalculatedAlerts.includes(id)) {
          readCalculatedAlerts.push(id);
          await AsyncStorage.setItem(`readCalculatedAlerts_${user.uid}`, JSON.stringify(readCalculatedAlerts));
        }
      }
      return;
    }

    // For database notifications, update in Firestore
    await updateDoc(doc(db, "notifications", id), { read: true });
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  };

  const markAllRead = async () => {
    const user = auth.currentUser;
    if (!user) return;

    // Mark database notifications as read
    const unreadNotifications = notifications.filter(n => !n.read);
    await Promise.all(unreadNotifications.map(n =>
      updateDoc(doc(db, "notifications", n.id), { read: true })
    ));
    
    // Update local state for database notifications
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    
    // Update local state for calculated alerts and save to AsyncStorage
    const unreadCalculatedAlerts = calculatedAlerts.filter(n => !n.read);
    setCalculatedAlerts(prev => prev.map(n => ({ ...n, read: true })));
    
    // Save all calculated alert IDs to AsyncStorage
    const readCalculatedAlerts = JSON.parse(
      await AsyncStorage.getItem(`readCalculatedAlerts_${user.uid}`) || '[]'
    );
    const newReadAlerts = unreadCalculatedAlerts.map(alert => alert.id);
    const updatedReadAlerts = [...new Set([...readCalculatedAlerts, ...newReadAlerts])];
    await AsyncStorage.setItem(`readCalculatedAlerts_${user.uid}`, JSON.stringify(updatedReadAlerts));
  };

  const formatTime = (ts: any) => {
    if (!ts) return "";
    let d: Date;
    if (ts?.toDate) {
      d = ts.toDate();
    } else if (ts?.seconds) {
      d = new Date(ts.seconds * 1000);
    } else if (ts instanceof Date) {
      d = ts;
    } else {
      d = new Date(ts);
    }
    if (isNaN(d.getTime())) return "";
    const diff = (Date.now() - d.getTime()) / 1000;
    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  const getIcon = (type: string) => {
    if (type === "absence_deprivation") return "🚫";
    if (type === "absence_warning") return "⚠️";
    return "🔔";
  };

  const getBorderColor = (type: string) => {
    if (type === "absence_deprivation") return "#EF4444";
    if (type === "absence_warning") return "#F59E0B";
    return "#173B66";
  };

  const getBgColor = (type: string) => {
    if (type === "absence_deprivation") return "#FEF2F2";
    if (type === "absence_warning") return "#FFFBEB";
    return "#F0F9FF";
  };

  // Combine notifications and calculated alerts with filtering
  const getAllNotifications = () => {
    let combined = [...notifications, ...calculatedAlerts];
    
    // Sort by creation date (newest first)
    combined.sort((a, b) => {
      const dateA = a.createdAt?.seconds || a.createdAt || 0;
      const dateB = b.createdAt?.seconds || b.createdAt || 0;
      return dateB - dateA;
    });
    
    return combined;
  };

  const allNotifications = getAllNotifications();
  const unreadCount = allNotifications.filter(n => !n.read).length;

  const renderItem = ({ item }: { item: Notification }) => (
    <TouchableOpacity
      onPress={() => markRead(item.id, item.isCalculated)}
      style={[
        styles.card,
        {
          backgroundColor: item.read ? "white" : getBgColor(item.type),
          borderLeftColor: item.read ? "#E2E8F0" : getBorderColor(item.type),
        }
      ]}
    >
      <View style={styles.cardRow}>
        <Text style={styles.icon}>{getIcon(item.type)}</Text>
        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <Text style={[
              styles.title,
              {
                color: item.type === "absence_deprivation" ? "#991B1B"
                  : item.type === "absence_warning" ? "#92400E"
                    : "#173B66"
              }
            ]}>
              {item.title}
            </Text>
            <Text style={styles.time}>{formatTime(item.createdAt)}</Text>
          </View>
          <Text style={styles.message}>{item.message}</Text>
          {item.courseName && (
            <View style={styles.courseBadge}>
              <Text style={styles.courseBadgeText}>{item.courseName}</Text>
            </View>
          )}
          {!item.read && (
            <View style={[styles.unreadDot, { backgroundColor: getBorderColor(item.type) }]} />
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          🔔 Notifications
        </Text>
        {unreadCount > 0 ? (
          <TouchableOpacity onPress={markAllRead}>
            <Text style={styles.markAllText}>Mark all read</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 80 }} />
        )}
      </View>

      {/* Unread Banner */}
      {unreadCount > 0 && (
        <View style={styles.unreadBanner}>
          <Text style={{ fontSize: 16 }}>📬</Text>
          <Text style={styles.unreadBannerText}>
            You have {unreadCount} unread notification{unreadCount > 1 ? "s" : ""}
          </Text>
        </View>
      )}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#173B66" />
          <Text style={{ color: "#94A3B8", fontSize: 14 }}>Loading...</Text>
        </View>
      ) : allNotifications.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyIcon}>🔔</Text>
          <Text style={styles.emptyText}>No notifications yet</Text>
        </View>
      ) : (
        <FlatList
          data={allNotifications}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: "#173B66", paddingVertical: 16, paddingHorizontal: 20,
    shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 }, elevation: 5,
  },
  backBtn: { padding: 4 },
  backText: { fontSize: 16, color: "white", fontWeight: "600" },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "white" },
  markAllText: { fontSize: 13, color: "rgba(255,255,255,0.85)", fontWeight: "600" },
  list: { padding: 16, gap: 12 },
  card: {
    borderRadius: 16, padding: 16,
    borderLeftWidth: 4, backgroundColor: "white",
    shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 }, elevation: 3,
    marginBottom: 10,
  },
  cardRow: { flexDirection: "row", gap: 12 },
  icon: { fontSize: 28, marginTop: 2 },
  cardContent: { flex: 1 },
  cardHeader: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "flex-start", marginBottom: 6
  },
  title: { fontSize: 14, fontWeight: "700", flex: 1, marginRight: 8, lineHeight: 20 },
  time: { fontSize: 11, color: "#94A3B8", marginTop: 2 },
  message: { fontSize: 13, color: "#64748B", lineHeight: 20, marginTop: 2 },
  courseBadge: {
    marginTop: 10, alignSelf: "flex-start",
    backgroundColor: "#EFF6FF", borderRadius: 8,
    paddingVertical: 4, paddingHorizontal: 12,
    borderWidth: 1, borderColor: "#BFDBFE"
  },
  courseBadgeText: { fontSize: 12, color: "#1D4ED8", fontWeight: "700" },
  unreadDot: {
    position: "absolute", top: 4, right: 4,
    width: 8, height: 8, borderRadius: 4,
  },
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  emptyIcon: { fontSize: 52, marginBottom: 4 },
  emptyText: { fontSize: 16, color: "#94A3B8", fontWeight: "500" },
  unreadBanner: {
    backgroundColor: "#173B66", marginHorizontal: 16, marginTop: 16,
    borderRadius: 12, padding: 12,
    flexDirection: "row", alignItems: "center", gap: 10
  },
  unreadBannerText: { color: "white", fontSize: 13, fontWeight: "600" },
});