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
import { useApp, Friend } from "@/lib/app-context";
import * as Haptics from "expo-haptics";

function haptic() {
  if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

function friendToRoomId(friendId: string): number {
  return Math.abs(friendId.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % 10000) + 200;
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
  id: number;
  roomKey: string;
  otherUserName: string;
  otherUserEmoji: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  isOnline: boolean;
  isFriend: boolean;
  friendId?: string;
}

const MOCK_CHAT_ROOMS: ChatRoom[] = [
  {
    id: 1,
    roomKey: "room_1",
    otherUserName: "산책쌤 미경",
    otherUserEmoji: "👩",
    lastMessage: "네, 좋습니다. 우리집 앞에서 만나요.",
    lastMessageTime: "10:40",
    unreadCount: 0,
    isOnline: true,
    isFriend: false,
  },
  {
    id: 2,
    roomKey: "room_2",
    otherUserName: "강아지 친구 준호",
    otherUserEmoji: "👨",
    lastMessage: "내일 오후 2시 괜찮으세요?",
    lastMessageTime: "어제",
    unreadCount: 2,
    isOnline: false,
    isFriend: false,
  },
  {
    id: 3,
    roomKey: "room_3",
    otherUserName: "돌봄 전문 지은",
    otherUserEmoji: "👩",
    lastMessage: "긴급 돌봄 요청 받았습니다.",
    lastMessageTime: "3일전",
    unreadCount: 0,
    isOnline: true,
    isFriend: false,
  },
];

export default function ChatTabScreen() {
  const router = useRouter();
  const { state } = useApp();
  const [activeTab, setActiveTab] = useState<"all" | "friends">("all");

  // 친구 채팅방 생성 (저장된 메시지 기반으로 마지막 메시지 표시)
  const friendRooms: ChatRoom[] = useMemo(() => {
    return state.profile.friends.map((f) => {
      const roomId = friendToRoomId(f.id);
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
        friendId: f.id,
      };
    });
  }, [state.profile.friends, state.chatMessages]);

  const allRooms = [...friendRooms, ...MOCK_CHAT_ROOMS];
  const filteredRooms = activeTab === "friends"
    ? allRooms.filter((r) => r.isFriend)
    : allRooms;

  const totalUnread = allRooms.reduce((sum, r) => sum + r.unreadCount, 0);

  const handleOpenChat = (room: ChatRoom) => {
    haptic();
    if (room.isFriend) {
      router.push(`/chat/${room.id}?friendName=${encodeURIComponent(room.otherUserName)}&friendEmoji=${encodeURIComponent(room.otherUserEmoji)}` as never);
    } else {
      router.push(`/chat/${room.id}` as never);
    }
  };

  const renderChatRoom = ({ item }: { item: ChatRoom }) => (
    <Pressable
      onPress={() => handleOpenChat(item)}
      style={({ pressed }) => [
        styles.chatRoomCard,
        pressed && { opacity: 0.8 },
      ]}
    >
      <View style={styles.profileSection}>
        <View style={[styles.avatarContainer, item.isFriend && styles.friendAvatarContainer]}>
          <Text style={styles.avatar}>{item.otherUserEmoji}</Text>
          {item.isOnline && <View style={styles.onlineIndicator} />}
          {item.isFriend && (
            <View style={styles.friendBadge}>
              <Text style={{ fontSize: 8 }}>👫</Text>
            </View>
          )}
        </View>

        <View style={styles.messageInfo}>
          <View style={styles.nameRow}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4, flex: 1 }}>
              <Text style={styles.userName} numberOfLines={1}>{item.otherUserName}</Text>
              {item.isFriend && (
                <View style={styles.friendTag}>
                  <Text style={styles.friendTagText}>친구</Text>
                </View>
              )}
            </View>
            {item.lastMessageTime ? (
              <Text style={styles.time}>{item.lastMessageTime}</Text>
            ) : null}
          </View>
          <Text style={styles.lastMessage} numberOfLines={1}>
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
        <Text style={styles.title}>메시지</Text>
        {totalUnread > 0 && (
          <View style={styles.headerBadge}>
            <Text style={styles.headerBadgeText}>{totalUnread}</Text>
          </View>
        )}
      </View>

      {/* 탭 전환 */}
      <View style={styles.tabRow}>
        <Pressable
          onPress={() => { haptic(); setActiveTab("all"); }}
          style={({ pressed }) => [
            styles.tab,
            activeTab === "all" && styles.tabActive,
            pressed && { opacity: 0.8 },
          ]}
        >
          <Text style={[styles.tabText, activeTab === "all" && styles.tabTextActive]}>
            전체 ({allRooms.length})
          </Text>
        </Pressable>
        <Pressable
          onPress={() => { haptic(); setActiveTab("friends"); }}
          style={({ pressed }) => [
            styles.tab,
            activeTab === "friends" && styles.tabActive,
            pressed && { opacity: 0.8 },
          ]}
        >
          <Text style={[styles.tabText, activeTab === "friends" && styles.tabTextActive]}>
            👫 친구 ({state.profile.friends.length})
          </Text>
        </Pressable>
      </View>

      <FlatList
        data={filteredRooms}
        renderItem={renderChatRoom}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>
              {activeTab === "friends" ? "👫" : "💭"}
            </Text>
            <Text style={styles.emptyTitle}>
              {activeTab === "friends" ? "아직 친구가 없어요" : "아직 대화가 없어요"}
            </Text>
            <Text style={styles.emptyDesc}>
              {activeTab === "friends"
                ? "프로필에서 친구 코드로 친구를 추가해보세요"
                : "매칭된 사용자와 대화를 시작해보세요"}
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
    color: "#1A1A1A",
  },
  headerBadge: {
    backgroundColor: "#FF7043",
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  headerBadgeText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },
  tabRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: "#F5F5F5",
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  tabActive: {
    backgroundColor: "#FFF3EE",
    borderColor: "#FF7043",
  },
  tabText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#757575",
  },
  tabTextActive: {
    color: "#FF7043",
    fontWeight: "700",
  },
  listContent: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  chatRoomCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: "#F0F0F0",
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
    backgroundColor: "#F5F5F5",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  friendAvatarContainer: {
    backgroundColor: "#FFF3EE",
    borderWidth: 1.5,
    borderColor: "#FFCCBC",
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
    borderColor: "#fff",
  },
  friendBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    backgroundColor: "#FFF3EE",
    borderRadius: 8,
    width: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#FFCCBC",
  },
  messageInfo: { flex: 1 },
  nameRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  userName: { fontSize: 15, fontWeight: "700", color: "#1A1A1A" },
  friendTag: {
    backgroundColor: "#FFF3EE",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderWidth: 1,
    borderColor: "#FFCCBC",
  },
  friendTagText: { fontSize: 10, color: "#FF7043", fontWeight: "700" },
  time: { fontSize: 12, color: "#9E9E9E" },
  lastMessage: { fontSize: 13, color: "#757575", lineHeight: 18 },
  unreadBadge: {
    backgroundColor: "#FF7043",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  unreadBadgeText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 60,
    gap: 8,
  },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: { fontSize: 16, fontWeight: "600", color: "#555" },
  emptyDesc: { fontSize: 13, color: "#9E9E9E", textAlign: "center", lineHeight: 20 },
  addFriendBtn: {
    marginTop: 12,
    backgroundColor: "#FF7043",
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  addFriendBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },
});
