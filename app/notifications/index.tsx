import React, { useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  Platform,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useApp, Notification } from "@/lib/app-context";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";

function haptic() {
  if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "방금 전";
  if (mins < 60) return `${mins}분 전`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}일 전`;
  return `${Math.floor(days / 7)}주 전`;
}

const NOTIFICATION_ICONS: Record<Notification["type"], string> = {
  comment: "💬",
  like: "❤️",
  match_request: "🤝",
  message: "✉️",
  friend_add: "👫",
  match: "✅",
};

const NOTIFICATION_COLORS: Record<Notification["type"], string> = {
  comment: "#2196F3",
  like: "#EF5350",
  match_request: "#FF7043",
  message: "#4CAF82",
  friend_add: "#9C27B0",
  match: "#4CAF82",
};

// 데모 알림 데이터
const DEMO_NOTIFICATIONS: Notification[] = [
  {
    id: "n1",
    type: "comment",
    title: "새 댓글",
    body: "골든리트리버 맘님이 회원님의 게시글에 댓글을 남겼습니다.",
    fromNickname: "골든리트리버 맘",
    fromEmoji: "👩",
    isRead: false,
    createdAt: new Date(Date.now() - 1800000).toISOString(),
  },
  {
    id: "n2",
    type: "like",
    title: "좋아요",
    body: "말티즈 아빠님이 회원님의 게시글을 좋아합니다.",
    fromNickname: "말티즈 아빠",
    fromEmoji: "👨",
    isRead: false,
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: "n3",
    type: "match_request",
    title: "돌봄 요청",
    body: "관평동 강아지맘님이 산책 돌봄을 요청했습니다.",
    fromNickname: "관평동 강아지맘",
    fromEmoji: "👩",
    relatedId: "req_1",
    isRead: false,
    createdAt: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    id: "n4",
    type: "message",
    title: "새 메시지",
    body: "산책쌤 미경님이 메시지를 보냈습니다: \"네, 좋습니다!\"",
    fromNickname: "산책쌤 미경",
    fromEmoji: "👩",
    relatedId: "chat_1",
    isRead: true,
    createdAt: new Date(Date.now() - 14400000).toISOString(),
  },
  {
    id: "n5",
    type: "friend_add",
    title: "친구 추가",
    body: "펫케어 수빈님이 회원님을 친구로 추가했습니다.",
    fromNickname: "펫케어 수빈",
    fromEmoji: "👩‍🎓",
    isRead: true,
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: "n6",
    type: "like",
    title: "좋아요",
    body: "봉명동 태양님 외 3명이 회원님의 게시글을 좋아합니다.",
    fromNickname: "봉명동 태양",
    fromEmoji: "👴",
    isRead: true,
    createdAt: new Date(Date.now() - 172800000).toISOString(),
  },
  {
    id: "n7",
    type: "match_request",
    title: "돌봄 수락",
    body: "강아지사랑 민지님이 회원님의 돌봄 요청을 수락했습니다.",
    fromNickname: "강아지사랑 민지",
    fromEmoji: "👩",
    isRead: true,
    createdAt: new Date(Date.now() - 259200000).toISOString(),
  },
];

export default function NotificationsScreen() {
  const router = useRouter();
  const { state, dispatch } = useApp();

  // 데모 알림 + 실제 알림 합치기
  const allNotifications = [...(state.notifications || []), ...DEMO_NOTIFICATIONS];
  const unreadCount = allNotifications.filter((n) => !n.isRead).length;

  const handleNotificationPress = (notification: Notification) => {
    haptic();

    // 읽음 처리
    if (!notification.isRead && !notification.id.startsWith("n")) {
      dispatch({ type: "MARK_NOTIFICATION_READ", payload: notification.id });
    }

    // 알림 종류별 네비게이션
    switch (notification.type) {
      case "message":
        router.push("/(tabs)/chat" as never);
        break;
      case "match_request":
        router.push("/(tabs)/requests" as never);
        break;
      case "comment":
      case "like":
        router.push("/(tabs)/community" as never);
        break;
      case "friend_add":
        router.push("/friends" as never);
        break;
    }
  };

  const handleMarkAllRead = () => {
    haptic();
    dispatch({ type: "MARK_ALL_NOTIFICATIONS_READ" });
  };

  const renderNotification = ({ item }: { item: Notification }) => {
    const icon = NOTIFICATION_ICONS[item.type];
    const color = NOTIFICATION_COLORS[item.type];

    return (
      <Pressable
        onPress={() => handleNotificationPress(item)}
        style={({ pressed }) => [
          styles.notificationCard,
          !item.isRead && styles.notificationUnread,
          pressed && { opacity: 0.8 },
        ]}
      >
        <View style={[styles.iconContainer, { backgroundColor: color + "15" }]}>
          <Text style={styles.icon}>{icon}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.notificationHeader}>
            <Text style={[styles.notificationType, { color }]}>{item.title}</Text>
            <Text style={styles.notificationTime}>{timeAgo(item.createdAt)}</Text>
          </View>
          <Text style={styles.notificationBody} numberOfLines={2}>
            {item.body}
          </Text>
          {item.fromNickname && (
            <View style={styles.fromRow}>
              <Text style={{ fontSize: 14 }}>{item.fromEmoji || "👤"}</Text>
              <Text style={styles.fromName}>{item.fromNickname}</Text>
            </View>
          )}
        </View>
        {!item.isRead && <View style={styles.unreadDot} />}
      </Pressable>
    );
  };

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      {/* 헤더 */}
      <View style={styles.header}>
        <Pressable
          onPress={() => { haptic(); router.back(); }}
          style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.7 }]}
        >
          <Text style={styles.backBtnText}>‹</Text>
        </Pressable>
        <Text style={styles.headerTitle}>알림</Text>
        {unreadCount > 0 ? (
          <Pressable
            onPress={handleMarkAllRead}
            style={({ pressed }) => [styles.markReadBtn, pressed && { opacity: 0.7 }]}
          >
            <Text style={styles.markReadBtnText}>모두 읽음</Text>
          </Pressable>
        ) : (
          <View style={{ width: 60 }} />
        )}
      </View>

      {/* 안읽은 알림 카운트 */}
      {unreadCount > 0 && (
        <View style={styles.unreadBanner}>
          <Text style={styles.unreadBannerText}>
            📬 읽지 않은 알림 {unreadCount}개
          </Text>
        </View>
      )}

      {/* 알림 목록 */}
      <FlatList
        data={allNotifications}
        renderItem={renderNotification}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>🔔</Text>
            <Text style={styles.emptyTitle}>알림이 없어요</Text>
            <Text style={styles.emptyDesc}>
              새로운 댓글, 좋아요, 매칭 요청이 오면{"\n"}여기에서 확인할 수 있어요
            </Text>
          </View>
        }
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  backBtnText: { fontSize: 28, color: "#1A1A1A" },
  headerTitle: { flex: 1, textAlign: "center", fontSize: 17, fontWeight: "700", color: "#1A1A1A" },
  markReadBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#FF704320",
    borderRadius: 8,
  },
  markReadBtnText: { fontSize: 12, color: "#FF7043", fontWeight: "700" },
  unreadBanner: {
    backgroundColor: "#FFF3EE",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#FFCCBC",
  },
  unreadBannerText: {
    fontSize: 13,
    color: "#FF7043",
    fontWeight: "600",
    textAlign: "center",
  },
  listContent: {
    padding: 12,
    gap: 8,
    paddingBottom: 40,
  },
  notificationCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#F0F0F0",
  },
  notificationUnread: {
    backgroundColor: "#FFFBF8",
    borderColor: "#FFCCBC",
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  icon: { fontSize: 22 },
  notificationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  notificationType: {
    fontSize: 13,
    fontWeight: "700",
  },
  notificationTime: {
    fontSize: 11,
    color: "#9E9E9E",
  },
  notificationBody: {
    fontSize: 13,
    color: "#555",
    lineHeight: 19,
  },
  fromRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 6,
  },
  fromName: {
    fontSize: 12,
    color: "#757575",
    fontWeight: "600",
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#FF7043",
    marginTop: 4,
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 80,
    gap: 8,
  },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: "#555" },
  emptyDesc: { fontSize: 13, color: "#9E9E9E", textAlign: "center", lineHeight: 20 },
});
