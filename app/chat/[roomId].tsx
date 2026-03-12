import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useApp } from "@/lib/app-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";

interface Message {
  id: number;
  senderId: number;
  senderName: string;
  content: string;
  createdAt: string;
  isRead: boolean;
}

export default function ChatScreen() {
  const router = useRouter();
  const { roomId } = useLocalSearchParams();
  const { state } = useApp();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const userId = 1; // TODO: 실제 사용자 ID는 인증 컨텍스트에서 가져오기
  const otherUserName = state.profile.role === "owner" ? "돌보미" : "반려인";

  // 더미 메시지 데이터
  const mockMessages: Message[] = [
    {
      id: 1,
      senderId: 101,
      senderName: "산책쌤 미경",
      content: "안녕하세요! 내일 산책 가능합니다.",
      createdAt: "2025-03-12 10:30",
      isRead: true,
    },
    {
      id: 2,
      senderId: userId,
      senderName: "나",
      content: "좋습니다! 내일 오후 2시에 만날까요?",
      createdAt: "2025-03-12 10:35",
      isRead: true,
    },
    {
      id: 3,
      senderId: 101,
      senderName: "산책쌤 미경",
      content: "네, 좋습니다. 우리집 앞에서 만나요.",
      createdAt: "2025-03-12 10:40",
      isRead: true,
    },
  ];

  useEffect(() => {
    // 메시지 로드
    setTimeout(() => {
      setMessages(mockMessages);
      setLoading(false);
    }, 500);
  }, [roomId]);

  useEffect(() => {
    // 새 메시지 시 스크롤
    if (messages.length > 0) {
      flatListRef.current?.scrollToEnd({ animated: true });
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;

    setSending(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // 새 메시지 추가 (실제로는 API 호출)
    const newMessage: Message = {
      id: messages.length + 1,
      senderId: userId,
      senderName: "나",
      content: inputText,
      createdAt: new Date().toLocaleString(),
      isRead: false,
    };

    setMessages([...messages, newMessage]);
    setInputText("");
    setSending(false);
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isOwn = item.senderId === userId;

    return (
      <View style={[styles.messageRow, isOwn && styles.messageRowOwn]}>
        <View
          style={[
            styles.messageBubble,
            isOwn ? styles.messageBubbleOwn : styles.messageBubbleOther,
          ]}
        >
          {!isOwn && (
            <Text style={styles.senderName}>{item.senderName}</Text>
          )}
          <Text
            style={[
              styles.messageText,
              isOwn && styles.messageTextOwn,
            ]}
          >
            {item.content}
          </Text>
          <Text style={styles.messageTime}>
            {new Date(item.createdAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <ScreenContainer className="bg-background">
      {/* 헤더 */}
      <View style={styles.header}>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.back();
          }}
          style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.7 }]}
        >
          <Text style={styles.backBtnText}>‹</Text>
        </Pressable>
        <View style={styles.headerTitle}>
          <Text style={styles.headerName}>{otherUserName}</Text>
          <Text style={styles.headerStatus}>🟢 온라인</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      {/* 메시지 목록 */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF7043" />
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.messageList}
          scrollEnabled={true}
          onEndReachedThreshold={0.1}
        />
      )}

      {/* 입력창 */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.inputContainer}
      >
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            placeholder="메시지를 입력하세요..."
            placeholderTextColor="#BDBDBD"
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={500}
            editable={!sending}
          />
          <Pressable
            onPress={handleSendMessage}
            disabled={!inputText.trim() || sending}
            style={({ pressed }) => [
              styles.sendBtn,
              (!inputText.trim() || sending) && styles.sendBtnDisabled,
              pressed && { opacity: 0.85 },
            ]}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.sendBtnText}>전송</Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
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
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  backBtnText: { fontSize: 28, color: "#1A1A1A" },
  headerTitle: { flex: 1, marginLeft: 8 },
  headerName: { fontSize: 16, fontWeight: "700", color: "#1A1A1A" },
  headerStatus: { fontSize: 12, color: "#4CAF82", marginTop: 2 },
  headerSpacer: { width: 40 },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  messageList: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
  },
  messageRow: {
    flexDirection: "row",
    justifyContent: "flex-start",
    marginVertical: 4,
  },
  messageRowOwn: {
    justifyContent: "flex-end",
  },
  messageBubble: {
    maxWidth: "80%",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "#F5F5F5",
  },
  messageBubbleOther: {
    backgroundColor: "#F5F5F5",
  },
  messageBubbleOwn: {
    backgroundColor: "#FF7043",
  },
  senderName: {
    fontSize: 11,
    fontWeight: "700",
    color: "#757575",
    marginBottom: 2,
  },
  messageText: {
    fontSize: 14,
    color: "#1A1A1A",
    lineHeight: 20,
  },
  messageTextOwn: {
    color: "#fff",
  },
  messageTime: {
    fontSize: 11,
    color: "#9E9E9E",
    marginTop: 4,
  },
  inputContainer: {
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: "#1A1A1A",
    maxHeight: 100,
  },
  sendBtn: {
    backgroundColor: "#FF7043",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 60,
  },
  sendBtnDisabled: {
    backgroundColor: "#BDBDBD",
    opacity: 0.6,
  },
  sendBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
});
