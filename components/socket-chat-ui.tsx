import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useEffect, useRef, useState } from "react";
import { Fonts } from "@/hooks/use-fonts";
import {
  initSocket,
  sendMessage,
  onMessage,
  sendTyping,
  onTyping,
  isSocketConnected,
} from "@/lib/socket-client";
import * as Haptics from "expo-haptics";

const haptic = () => {
  try {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch {}
};

export interface SocketChatUIProps {
  roomId: string;
  userId: string;
  userName: string;
  userEmoji: string;
  participantName: string;
  participantEmoji: string;
}

interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  type: "text" | "image" | "location";
  locationData?: any;
  createdAt: string;
}

interface TypingUser {
  userId: string;
  isTyping: boolean;
}

export function SocketChatUI({
  roomId,
  userId,
  userName,
  userEmoji,
  participantName,
  participantEmoji,
}: SocketChatUIProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [typingUsers, setTypingUsers] = useState<TyplingUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const scrollViewRef = useRef<ScrollView>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Socket 초기화
  useEffect(() => {
    const socket = initSocket(userId);

    const checkConnection = () => {
      setIsConnected(isSocketConnected());
    };

    const timer = setInterval(checkConnection, 1000);

    // 메시지 수신
    const unsubscribeMessage = onMessage((data: any) => {
      if (data.roomId === roomId) {
        setMessages((prev) => [...prev, data.message]);
        scrollToBottom();
      }
    });

    // 타이항 상태 수신
    const unsubscribeTyping = onTyping((data: any) => {
      if (data.roomId === roomId) {
        setTypingUsers((prev) => {
          const updated = prev.filter((u) => u.userId !== data.userId);
          if (data.isTyping) {
            updated.push({ userId: data.userId, isTyping: true });
          }
          return updated;
        });
      }
    });

    // 채팅방 입장
    socket.emit("join_room", { roomId });

    // 기존 메시지 로드
    socket.on("load_messages", (data: any) => {
      if (data.roomId === roomId) {
        setMessages(data.messages);
        setIsLoading(false);
        scrollToBottom();
      }
    });

    return () => {
      clearInterval(timer);
      unsubscribeMessage?.();
      unsubscribeTyping?.();
      socket.emit("leave_room", { roomId });
    };
  }, [roomId, userId]);

  const scrollToBottom = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const handleInputChange = (text: string) => {
    setInputText(text);

    // 타이핑 상태 전송
    if (text.length > 0) {
      sendTyping(roomId, userId, true);

      // 타이핑 종료 타이머
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      typingTimeoutRef.current = setTimeout(() => {
        sendTyping(roomId, userId, false);
      }, 2000) as unknown as NodeJS.Timeout;
    }
  };

  const handleSendMessage = () => {
    if (!inputText.trim()) return;

    haptic();

    const message: ChatMessage = {
      id: `msg_${Date.now()}`,
      senderId: userId,
      senderName: userName,
      content: inputText,
      type: "text",
      createdAt: new Date().toISOString(),
    };

    // 메시지 전송
    const success = sendMessage(roomId, message);

    if (success) {
      setInputText("");
      sendTyping(roomId, userId, false);
    }
  };

  const getMessageAlignment = (senderId: string) => {
    return senderId === userId ? "flex-end" : "flex-start";
  };

  const getMessageBubbleStyle = (senderId: string) => {
    return senderId === userId
      ? { backgroundColor: "#2E7D32", borderBottomRightRadius: 4 }
      : { backgroundColor: "#F0F0F0", borderBottomLeftRadius: 4 };
  };

  const getMessageTextColor = (senderId: string) => {
    return senderId === userId ? "#fff" : "#1A1A1A";
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={s.container}
    >
      {/* 헤더 */}
      <View style={s.header}>
        <View style={s.headerContent}>
          <Text style={s.headerEmoji}>{participantEmoji}</Text>
          <View style={{ flex: 1 }}>
            <Text style={s.headerName}>{participantName}</Text>
            <Text style={s.headerStatus}>
              {isConnected ? "🟢 온라인" : "🔴 오프라인"}
            </Text>
          </View>
        </View>
      </View>

      {/* 메시지 목록 */}
      <ScrollView
        ref={scrollViewRef}
        style={s.messagesContainer}
        contentContainerStyle={s.messagesContent}
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <View style={s.loadingContainer}>
            <ActivityIndicator size="large" color="#2E7D32" />
            <Text style={s.loadingText}>메시지 로드 중...</Text>
          </View>
        ) : messages.length === 0 ? (
          <View style={s.emptyContainer}>
            <Text style={s.emptyEmoji}>💬</Text>
            <Text style={s.emptyText}>대화를 시작해보세요!</Text>
          </View>
        ) : (
          messages.map((msg) => (
            <View
              key={msg.id}
              style={[
                s.messageRow,
                { justifyContent: getMessageAlignment(msg.senderId) },
              ]}
            >
              {msg.senderId !== userId && (
                <Text style={s.messageEmoji}>{participantEmoji}</Text>
              )}
              <View
                style={[
                  s.messageBubble,
                  getMessageBubbleStyle(msg.senderId),
                ]}
              >
                <Text style={[s.messageText, { color: getMessageTextColor(msg.senderId) }]}>
                  {msg.content}
                </Text>
                <Text style={[s.messageTime, { color: getMessageTextColor(msg.senderId) }]}>
                  {new Date(msg.createdAt).toLocaleTimeString("ko-KR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Text>
              </View>
              {msg.senderId === userId && (
                <Text style={s.messageEmoji}>{userEmoji}</Text>
              )}
            </View>
          ))
        )}

        {/* 타이핑 표시 */}
        {typingUsers.length > 0 && (
          <View style={s.typingContainer}>
            <Text style={s.typingEmoji}>{participantEmoji}</Text>
            <View style={s.typingBubble}>
              <View style={s.typingDot} />
              <View style={s.typingDot} />
              <View style={s.typingDot} />
            </View>
          </View>
        )}
      </ScrollView>

      {/* 입력 영역 */}
      <View style={s.inputContainer}>
        <TextInput
          style={s.input}
          placeholder="메시지를 입력하세요..."
          placeholderTextColor="#999"
          value={inputText}
          onChangeText={handleInputChange}
          multiline
          maxLength={500}
          editable={isConnected}
        />
        <Pressable
          onPress={handleSendMessage}
          disabled={!inputText.trim() || !isConnected}
          style={({ pressed }) => [
            s.sendButton,
            (!inputText.trim() || !isConnected) && s.sendButtonDisabled,
            pressed && { opacity: 0.7 },
          ]}
        >
          <Text style={s.sendButtonText}>전송</Text>
        </Pressable>
      </View>

      {/* 연결 상태 배너 */}
      {!isConnected && (
        <View style={s.connectionBanner}>
          <Text style={s.connectionBannerText}>
            🔴 연결 중... (Socket.io 서버 필요)
          </Text>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },

  // 헤더
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
    backgroundColor: "#fff",
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerEmoji: {
    fontSize: 40,
  },
  headerName: {
    fontFamily: Fonts.bold,
    fontSize: 15,
    color: "#1A1A1A",
  },
  headerStatus: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },

  // 메시지 컨테이너
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },

  // 로딩
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    color: "#999",
    marginTop: 12,
  },

  // 빈 상태
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    fontFamily: Fonts.regular,
    fontSize: 14,
    color: "#999",
  },

  // 메시지 행
  messageRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },
  messageEmoji: {
    fontSize: 28,
    width: 28,
    height: 28,
    lineHeight: 28,
  },

  // 메시지 버블
  messageBubble: {
    maxWidth: "75%",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  messageText: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    lineHeight: 18,
  },
  messageTime: {
    fontFamily: Fonts.regular,
    fontSize: 11,
    marginTop: 4,
    opacity: 0.7,
  },

  // 타이핑 표시
  typingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  typingEmoji: {
    fontSize: 28,
    width: 28,
    height: 28,
    lineHeight: 28,
  },
  typingBubble: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#F0F0F0",
    borderRadius: 12,
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#999",
  },

  // 입력 영역
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
    backgroundColor: "#fff",
  },
  input: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F5F5F5",
    fontFamily: Fonts.regular,
    fontSize: 13,
    color: "#1A1A1A",
    maxHeight: 100,
  },
  sendButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#2E7D32",
    borderRadius: 20,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonText: {
    fontFamily: Fonts.bold,
    fontSize: 12,
    color: "#fff",
  },

  // 연결 상태 배너
  connectionBanner: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#FFE0D0",
    borderTopWidth: 1,
    borderTopColor: "#FFD0B8",
  },
  connectionBannerText: {
    fontFamily: Fonts.medium,
    fontSize: 12,
    color: "#2E7D32",
    textAlign: "center",
  },
});

// 타입 정의 수정
interface TyplingUser {
  userId: string;
  isTyping: boolean;
}
