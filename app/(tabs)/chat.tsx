import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  Platform,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useRouter } from "expo-router";
import { useApp } from "@/lib/app-context";
import * as Haptics from "expo-haptics";

function haptic() {
  if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

function timeAgo(dateStr: string): string {
  if (!dateStr) return "";
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

interface ChatRoom {
  id: string;
  roomKey: string;
  otherUserName: string;
  otherUserEmoji: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  isOnline: boolean;
  isFriend: boolean;
  isRequest: boolean;
  isWorker: boolean;
  friendId?: string;
}

export default function ChatTabScreen() {
  const router = useRouter();
  const { state } = useApp();
  const [activeTab, setActiveTab] = useState<"all" | "friends" | "workers" | "requests">("all");

  // 친구 채팅방 (친구 ID 기반 고유 키)
  const friendRooms: ChatRoom[] = useMemo(() => {
    return state.profile.friends.map((f) => {
      const roomId = `friend_${f.id}`;
      const roomKey = `room_${roomId}`;
      const savedMessages = state.chatMessages[roomKey];
      const lastMsg = savedMessages && savedMessages.length > 0
        ? savedMessages[savedMessages.length - 1]
        : null;

      return {
        id: roomId,
        roomKey,
        otherUserName: f.nickname,
        otherUserEmoji: f.profileEmoji,
        lastMessage: lastMsg ? lastMsg.content : "대화를 시작해보세요! 👋",
        lastMessageTime: lastMsg ? timeAgo(lastMsg.createdAt) : "",
        unreadCount: 0,
        isOnline: true,
        isFriend: true,
        isRequest: false,
        isWorker: false,
        friendId: f.id,
      };
    });
  }, [state.profile.friends, state.chatMessages]);

  // 요청 관련 채팅방 (수락된 요청에서 생성된 채팅방)
  const requestRooms: ChatRoom[] = useMemo(() => {
    const rooms: ChatRoom[] = [];
    // chatMessages에서 request_ 로 시작하는 방 찾기
    Object.keys(state.chatMessages).forEach((key) => {
      if (key.startsWith("room_request_")) {
        const msgs = state.chatMessages[key];
        if (msgs && msgs.length > 0) {
          const lastMsg = msgs[msgs.length - 1];
          const roomId = key.replace("room_", "");
          const reqId = roomId.replace("request_", "");

          // 요청 정보에서 제목 가져오기
          const request = state.requests.find(r => r.id === reqId);
          const requestTitle = request ? request.title : "돌봄 요청";

          rooms.push({
            id: roomId,
            roomKey: key,
            otherUserName: request?.requester || "요청자",
            otherUserEmoji: "🐾",
            isWorker: false,
            lastMessage: lastMsg.content,
            lastMessageTime: timeAgo(lastMsg.createdAt),
            unreadCount: 0,
            isOnline: true,
            isFriend: false,
            isRequest: true,
          });
        }
      }
    });
    return rooms;
  }, [state.chatMessages, state.requests]);

  // 워커 채팅방 (워커 상세에서 생성된 방)
  const workerRooms: ChatRoom[] = useMemo(() => {
    return (state.chatRooms || []).filter((r) => r.type === "worker").map((r) => {
      const roomKey = `room_${r.id}`;
      const savedMessages = state.chatMessages[roomKey];
      const lastMsg = savedMessages && savedMessages.length > 0
        ? savedMessages[savedMessages.length - 1]
        : null;

      return {
        id: r.id,
        roomKey,
        otherUserName: r.participantName,
        otherUserEmoji: r.participantEmoji,
        lastMessage: lastMsg ? lastMsg.content : r.lastMessage || "대화를 시작해보세요! 👋",
        lastMessageTime: lastMsg ? timeAgo(lastMsg.createdAt) : timeAgo(r.lastMessageTime),
        unreadCount: r.unreadCount,
        isOnline: true,
        isFriend: false,
        isRequest: false,
        isWorker: true,
      };
    });
  }, [state.chatRooms, state.chatMessages]);

  const allRooms = [...friendRooms, ...workerRooms, ...requestRooms];
  const filteredRooms = activeTab === "friends"
    ? allRooms.filter((r) => r.isFriend)
    : activeTab === "workers"
    ? workerRooms
    : activeTab === "requests"
    ? allRooms.filter((r) => r.isRequest)
    : allRooms;

  const totalUnread = allRooms.reduce((sum, r) => sum + r.unreadCount, 0);

  const handleOpenChat = (room: ChatRoom) => {
    haptic();
    const params: Record<string, string> = {};
    if (room.isFriend) {
      params.friendName = encodeURIComponent(room.otherUserName);
      params.friendEmoji = encodeURIComponent(room.otherUserEmoji);
    } else {
      params.chatName = encodeURIComponent(room.otherUserName);
      params.chatEmoji = encodeURIComponent(room.otherUserEmoji);
    }
    const queryStr = Object.entries(params).map(([k, v]) => `${k}=${v}`).join("&");
    router.push(`/chat/${room.id}?${queryStr}` as never);
  };

  const renderChatRoom = ({ item }: { item: ChatRoom }) => (
    <Pressable
      onPress={() => handleOpenChat(item)}
      style={({ pressed }) => [
        styles.chatRoomCard,
        { backgroundColor: "#F8F8F8", borderColor: "#E8E8E8" },
        pressed && { opacity: 0.8 },
      ]}
    >
      <View style={styles.profileSection}>
        <View style={[
          styles.avatarContainer,
          { backgroundColor: "#FFFFFF" },
          item.isFriend && styles.friendAvatarContainer,
          item.isRequest && styles.requestAvatarContainer,
        ]}>
          <Text style={styles.avatar}>{item.otherUserEmoji}</Text>
          {item.isOnline && <View style={styles.onlineIndicator} />}
          {item.isFriend && (
            <View style={styles.friendBadge}>
              <Text style={{ fontSize: 8 }}>👫</Text>
            </View>
          )}
          {item.isRequest && (
            <View style={styles.requestBadge}>
              <Text style={{ fontSize: 8 }}>📋</Text>
            </View>
          )}
          {item.isWorker && (
            <View style={[styles.friendBadge, { backgroundColor: "#E8F5E9" }]}>
              <Text style={{ fontSize: 8 }}>🚶</Text>
            </View>
          )}
        </View>

        <View style={styles.messageInfo}>
          <View style={styles.nameRow}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4, flex: 1 }}>
              <Text style={[styles.userName, { color: "#1A1A1A" }]} numberOfLines={1}>
                {item.otherUserName}
              </Text>
              {item.isFriend && (
                <View style={styles.friendTag}>
                  <Text style={styles.friendTagText}>친구</Text>
                </View>
              )}
              {item.isRequest && (
                <View style={styles.requestTag}>
                  <Text style={styles.requestTagText}>요청</Text>
                </View>
              )}
              {item.isWorker && (
                <View style={[styles.friendTag, { backgroundColor: "#E8F5E9" }]}>
                  <Text style={[styles.friendTagText, { color: "#2E7D32" }]}>워커</Text>
                </View>
              )}
            </View>
            {item.lastMessageTime ? (
              <Text style={[styles.time, { color: "#8E8E93" }]}>{item.lastMessageTime}</Text>
            ) : null}
          </View>
          <Text style={[styles.lastMessage, { color: "#8E8E93" }]} numberOfLines={1}>
            {item.lastMessage}
          </Text>
        </View>

        {item.unreadCount > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadBadgeText}>
              {item.unreadCount > 9 ? "9+" : item.unreadCount}
            </Text>
          </View>
        )}
      </View>
    </Pressable>
  );

  return (
    <ScreenContainer className="pt-2">
      <View style={styles.header}>
        <Text style={[styles.title, { color: "#1A1A1A" }]}>메시지</Text>
        {totalUnread > 0 && (
          <View style={styles.headerBadge}>
            <Text style={styles.headerBadgeText}>{totalUnread}</Text>
          </View>
        )}
      </View>

      {/* 탭 전환 */}
      <View style={styles.tabRow}>
        {(["all", "friends", "workers", "requests"] as const).map((tab) => {
          const label = tab === "all"
            ? `전체 (${allRooms.length})`
            : tab === "friends"
            ? `👫 친구 (${friendRooms.length})`
            : tab === "workers"
            ? `🚶 워커 (${workerRooms.length})`
            : `📋 요청 (${requestRooms.length})`;
          const isActive = activeTab === tab;
          return (
            <Pressable
              key={tab}
              onPress={() => { haptic(); setActiveTab(tab); }}
              style={({ pressed }) => [
                styles.tab,
                { backgroundColor: "#F8F8F8", borderColor: "#E8E8E8" },
                isActive && styles.tabActive,
                pressed && { opacity: 0.8 },
              ]}
            >
              <Text style={[styles.tabText, { color: "#8E8E93" }, isActive && styles.tabTextActive]}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <FlatList
        data={filteredRooms}
        renderItem={renderChatRoom}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>
              {activeTab === "friends" ? "👫" : activeTab === "workers" ? "🚶" : activeTab === "requests" ? "📋" : "💬"}
            </Text>
            <Text style={[styles.emptyTitle, { color: "#1A1A1A" }]}>
              {activeTab === "friends"
                ? "아직 친구와의 대화가 없어요"
                : activeTab === "workers"
                ? "아직 워커와의 대화가 없어요"
                : activeTab === "requests"
                ? "아직 요청 관련 대화가 없어요"
                : "아직 대화가 없어요"}
            </Text>
            <Text style={[styles.emptyDesc, { color: "#8E8E93" }]}>
              {activeTab === "friends"
                ? "프로필에서 친구를 추가하고 대화를 시작해보세요"
                : activeTab === "workers"
                ? "홈 화면에서 워커를 선택하고 상담을 시작해보세요"
                : activeTab === "requests"
                ? "돌봄 요청을 수락하면 채팅방이 생성됩니다"
                : "친구를 추가하거나 요청을 수락해보세요"}
            </Text>
            {activeTab === "friends" && (
              <Pressable
                onPress={() => { haptic(); router.push("/friends" as never); }}
                style={({ pressed }) => [styles.addFriendBtn, pressed && { opacity: 0.85 }]}
              >
                <Text style={styles.addFriendBtnText}>+ 친구 추가하기</Text>
              </Pressable>
            )}
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
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
  },
  headerBadge: {
    backgroundColor: "#2E7D32",
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  headerBadgeText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  tabRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 6,
    marginBottom: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
  },
  tabActive: {
    backgroundColor: "#E8F5E9",
    borderColor: "#2E7D32",
  },
  tabText: {
    fontSize: 12,
    fontWeight: "600",
  },
  tabTextActive: {
    color: "#2E7D32",
    fontWeight: "700",
  },
  listContent: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  chatRoomCard: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 4,
    borderWidth: 1,
  },
  profileSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatarContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  friendAvatarContainer: {
    backgroundColor: "#E8F5E9",
    borderWidth: 1.5,
    borderColor: "#C8E6C9",
  },
  requestAvatarContainer: {
    backgroundColor: "#E3F2FD",
    borderWidth: 1.5,
    borderColor: "#90CAF9",
  },
  avatar: { fontSize: 24 },
  onlineIndicator: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#4CAF82",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  friendBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    backgroundColor: "#E8F5E9",
    borderRadius: 8,
    width: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#C8E6C9",
  },
  requestBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    backgroundColor: "#E3F2FD",
    borderRadius: 8,
    width: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#90CAF9",
  },
  messageInfo: { flex: 1 },
  nameRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  userName: { fontSize: 15, fontWeight: "700" },
  friendTag: {
    backgroundColor: "#E8F5E9",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderWidth: 1,
    borderColor: "#C8E6C9",
  },
  friendTagText: { fontSize: 10, color: "#2E7D32", fontWeight: "700" },
  requestTag: {
    backgroundColor: "#E3F2FD",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderWidth: 1,
    borderColor: "#90CAF9",
  },
  requestTagText: { fontSize: 10, color: "#1976D2", fontWeight: "700" },
  time: { fontSize: 12 },
  lastMessage: { fontSize: 13, lineHeight: 18 },
  unreadBadge: {
    backgroundColor: "#2E7D32",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  unreadBadgeText: { color: "#FFFFFF", fontSize: 11, fontWeight: "700" },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 60,
    gap: 8,
  },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: { fontSize: 16, fontWeight: "600" },
  emptyDesc: { fontSize: 13, textAlign: "center", lineHeight: 20 },
  addFriendBtn: {
    marginTop: 12,
    backgroundColor: "#2E7D32",
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  addFriendBtnText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
});
