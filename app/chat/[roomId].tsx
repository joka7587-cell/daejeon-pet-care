import React, { useState, useRef, useEffect } from "react";
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
import { useSocketChat } from "@/hooks/use-socket-chat";

export default function ChatScreen() {
  const router = useRouter();
  const { roomId } = useLocalSearchParams();
  const { state } = useApp();
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const userId = 1;
  const userName = state.profile.nickname || "사용자";
  const otherUserName = state.profile.role === "owner" ? "돌보미" : "반려인";

  // Socket.io 채팅 후크
  const chatRoomId = typeof roomId === "string" ? parseInt(roomId) : 1;
  const { messages, isConnected, sendMessage, setIsTyping } = useSocketChat({
    chatRoomId,
    userId,
    userName,
    serverUrl: "http://localhost:3000",
  });

  useEffect(() => {
    if (messages.length > 0) {
      flatListRef.current?.scrollToEnd({ animated: true });
    }
  }, [messages]);

  const handleSendMessage = () => {
    if (!inputText.trim() || !isConnected) return;

    setSending(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    sendMessage(inputText);
    setInputText("");
    setSending(false);
  };

  const renderMessage = ({ item }: { item: any }) => {
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
          <Text style={styles.headerStatus}>
            {isConnected ? "🟢 온라인" : "🔴 오프라인"}
          </Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      {/* 메시지 목록 */}
      {!isConnected ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF7043" />
          <Text style={styles.connectingText}>연결 중...</Text>
        </View>
      ) : messages.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>메시지가 없습니다</Text>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => (item.id || Math.random()).toString()}
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
            editable={!sending && isConnected}
            onFocus={() => setIsTyping(true)}
            onBlur={() => setIsTyping(false)}
          />
          <Pressable
            onPress={handleSendMessage}
            disabled={!inputText.trim() || sending || !isConnected}
            style={({ pressed }) => [
              styles.sendBtn,
              (!inputText.trim() || sending || !isConnected) && styles.sendBtnDisabled,
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
  connectingText: {
    fontSize: 14,
    color: "#9E9E9E",
    marginTop: 12,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    fontSize: 14,
    color: "#9E9E9E",
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
