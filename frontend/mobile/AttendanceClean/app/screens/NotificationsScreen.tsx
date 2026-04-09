import React, { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, SafeAreaView, ActivityIndicator
} from "react-native";
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
};

export default function NotificationsScreen({ navigation }: any) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const fetchNotifications = async () => {
      const user = auth.currentUser;
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const q = query(
          collection(db, "notifications"),
          where("userId", "==", user.uid)
        );
        const snap = await getDocs(q);
        const data = snap.docs
          .map(d => ({ id: d.id, ...d.data() } as Notification))
          .sort((a, b) => {
            const ta = a.createdAt?.seconds ?? 0;
            const tb = b.createdAt?.seconds ?? 0;
            return tb - ta;
          });
        setNotifications(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();
  }, []);
  const markRead = async (id: string) => {
    await updateDoc(doc(db, "notifications", id), { read: true });
  };

  const markAllRead = async () => {
    const unread = notifications.filter(n => !n.read);
    await Promise.all(unread.map(n =>
      updateDoc(doc(db, "notifications", n.id), { read: true })
    ));
  };

  const formatTime = (ts: any) => {
    if (!ts) return "";
    const d = ts.toDate ? ts.toDate() : new Date(ts);
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

  const unreadCount = notifications.filter(n => !n.read).length;

  const renderItem = ({ item }: { item: Notification }) => (
    <TouchableOpacity
      onPress={() => markRead(item.id)}
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
      ) : notifications.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyIcon}>🔔</Text>
          <Text style={styles.emptyText}>No notifications yet</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
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