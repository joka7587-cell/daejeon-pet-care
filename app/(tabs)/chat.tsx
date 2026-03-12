import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Platform,
  SectionList,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useRouter } from "expo-router";
import { useApp, Friend } from "@/lib/app-context";
import * as Haptics from "expo-haptics";

function haptic() {
  if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

interface ChatRoom {
  id: number;
  otherUserName: string;
  otherUserEmoji: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  isOnline: boolean;
  isFriend?: boolean;
  friendId?: string;
}

const MOCK_CHAT_ROOMS: ChatRoom[] = [
  {
    id: 1,
    otherUserName: "산책쌤 미경",
    otherUserEmoji: "👩",
    lastMessage: "네, 좋습니다. 우리집 앞에서 만나요.",
    lastMessageTime: "10:40",
    unreadCount: 0,
    isOnline: true,
  },
  {
    id: 2,
    otherUserName: "강아지 친구 준호",
    otherUserEmoji: "👨",
    lastMessage: "내일 오후 2시 괜찮으세요?",
    lastMessageTime: "어제",
    unreadCount: 2,
    isOnline: false,
  },
  {
    id: 3,
    otherUserName: "돌봄 전문 지은",
    otherUserEmoji: "👩",
    lastMessage: "긴급 돌봄 요청 받았습니다.",
    lastMessageTime: "3일전",
    unreadCount: 0,
    isOnline: true,
  },
];

export default function ChatTabScreen() {
  const router = useRouter();
  const { state } = useApp();
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"all" | "friends">("all");

  useEffect(() => {
    setTimeout(() => {
      // 친구 채팅방도 포함
      const friendRooms: ChatRoom[] = state.profile.friends.map((f, idx) => ({
        id: 100 + idx,
        otherUserName: f.nickname,
        otherUserEmoji: f.profileEmoji,
        lastMessage: "대화를 시작해보세요!",
        lastMessageTime: "",
        unreadCount: 0,
        isOnline: Math.random() > 0.5,
        isFriend: true,
        friendId: f.id,
      }));
      setChatRooms([...MOCK_CHAT_ROOMS, ...friendRooms]);
      setLoading(false);
    }, 300);
  }, [state.profile.friends]);

  const handleOpenChat = (roomId: number) => {
    haptic();
    router.push(`/chat/${roomId}` as never);
  };

  const handleStartFriendChat = (friend: Friend) => {
    haptic();
    // 친구와의 채팅방 ID 생성 (friendId 기반)
    const roomId = Math.abs(friend.id.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % 10000) + 200;
    router.push(`/chat/${roomId}?friendName=${encodeURIComponent(friend.nickname)}&friendEmoji=${encodeURIComponent(friend.profileEmoji)}` as never);
  };

  const filteredRooms = activeTab === "friends"
    ? chatRooms.filter((r) => r.isFriend)
    : chatRooms;

  const totalUnread = chatRooms.reduce((sum, r) => sum + r.unreadCount, 0);

  const renderChatRoom = ({ item }: { item: ChatRoom }) => (
    <Pressable
      onPress={() => handleOpenChat(item.id)}
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
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <Text style={styles.userName}>{item.otherUserName}</Text>
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

  const renderFriendItem = ({ item }: { item: Friend }) => (
    <Pressable
      onPress={() => handleStartFriendChat(item)}
      style={({ pressed }) => [
        styles.friendChatCard,
        pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] },
      ]}
    >
      <View style={styles.friendChatAvatar}>
        <Text style={{ fontSize: 28 }}>{item.profileEmoji}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.friendChatName}>{item.nickname}</Text>
        <Text style={styles.friendChatInfo}>
          📍 {item.neighborhood} · {item.role === "owner" ? "🐶 반려인" : "🏠 돌보미"}
        </Text>
      </View>
      <View style={styles.chatStartBtn}>
        <Text style={styles.chatStartBtnText}>💬 채팅</Text>
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
            전체 ({chatRooms.length})
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

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF7043" />
        </View>
      ) : activeTab === "friends" && state.profile.friends.length > 0 ? (
        <FlatList
          data={state.profile.friends}
          renderItem={renderFriendItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View style={styles.friendChatHeader}>
              <Text style={styles.friendChatHeaderText}>
                친구와 바로 대화를 시작할 수 있어요
              </Text>
            </View>
          }
        />
      ) : filteredRooms.length > 0 ? (
        <FlatList
          data={filteredRooms}
          renderItem={renderChatRoom}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      ) : (
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
      )}
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
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
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
    position: "relative",
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#FFF3EE",
    alignItems: "center",
    justifyContent: "center",
  },
  friendAvatarContainer: {
    backgroundColor: "#E8F5E9",
  },
  avatar: {
    fontSize: 28,
  },
  onlineIndicator: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#4CAF82",
    borderWidth: 2,
    borderColor: "#fff",
  },
  friendBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  messageInfo: {
    flex: 1,
    justifyContent: "center",
  },
  nameRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  userName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1A1A1A",
  },
  friendTag: {
    backgroundColor: "#E8F5E9",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  friendTagText: {
    fontSize: 10,
    color: "#4CAF82",
    fontWeight: "700",
  },
  time: {
    fontSize: 12,
    color: "#9E9E9E",
  },
  lastMessage: {
    fontSize: 13,
    color: "#757575",
    lineHeight: 18,
  },
  unreadBadge: {
    backgroundColor: "#FF7043",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  unreadBadgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  // 친구 채팅 카드
  friendChatHeader: {
    backgroundColor: "#F0FFF4",
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#C8E6C9",
  },
  friendChatHeaderText: {
    fontSize: 13,
    color: "#4CAF82",
    fontWeight: "600",
    textAlign: "center",
  },
  friendChatCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#F0F0F0",
  },
  friendChatAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#E8F5E9",
    alignItems: "center",
    justifyContent: "center",
  },
  friendChatName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1A1A1A",
  },
  friendChatInfo: {
    fontSize: 12,
    color: "#757575",
    marginTop: 2,
  },
  chatStartBtn: {
    backgroundColor: "#FF7043",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chatStartBtnText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  emptyEmoji: {
    fontSize: 48,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#555",
  },
  emptyDesc: {
    fontSize: 13,
    color: "#9E9E9E",
    textAlign: "center",
    paddingHorizontal: 40,
  },
  addFriendBtn: {
    marginTop: 12,
    backgroundColor: "#FF7043",
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  addFriendBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
});
