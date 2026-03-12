import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useRouter } from "expo-router";
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
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => {
      setChatRooms(MOCK_CHAT_ROOMS);
      setLoading(false);
    }, 300);
  }, []);

  const handleOpenChat = (roomId: number) => {
    haptic();
    router.push(`/chat/${roomId}` as never);
  };

  const renderChatRoom = ({ item }: { item: ChatRoom }) => (
    <Pressable
      onPress={() => handleOpenChat(item.id)}
      style={({ pressed }) => [
        styles.chatRoomCard,
        pressed && { opacity: 0.8 },
      ]}
    >
      <View style={styles.profileSection}>
        <View style={styles.avatarContainer}>
          <Text style={styles.avatar}>{item.otherUserEmoji}</Text>
          {item.isOnline && <View style={styles.onlineIndicator} />}
        </View>

        <View style={styles.messageInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.userName}>{item.otherUserName}</Text>
            <Text style={styles.time}>{item.lastMessageTime}</Text>
          </View>
          <Text style={styles.lastMessage} numberOfLines={1}>
            {item.lastMessage}
          </Text>
        </View>

        {item.unreadCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
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
        <Text style={styles.subtitle}>{chatRooms.length}개의 대화</Text>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF7043" />
        </View>
      ) : chatRooms.length > 0 ? (
        <FlatList
          data={chatRooms}
          renderItem={renderChatRoom}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>💭</Text>
          <Text style={styles.emptyTitle}>아직 대화가 없어요</Text>
          <Text style={styles.emptyDesc}>
            매칭된 사용자와 대화를 시작해보세요
          </Text>
        </View>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: "#1A1A1A",
  },
  subtitle: {
    fontSize: 13,
    color: "#9E9E9E",
    marginTop: 2,
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
  time: {
    fontSize: 12,
    color: "#9E9E9E",
  },
  lastMessage: {
    fontSize: 13,
    color: "#757575",
    lineHeight: 18,
  },
  badge: {
    backgroundColor: "#FF7043",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  badgeText: {
    color: "#fff",
    fontSize: 12,
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
  },
});
