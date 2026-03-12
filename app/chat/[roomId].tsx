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
  Modal,
  Dimensions,
} from "react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { ScreenContainer } from "@/components/screen-container";
import { useApp, ChatMessageData } from "@/lib/app-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";

function haptic() {
  if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

interface ChatMessage {
  id: string;
  senderId: number;
  senderName: string;
  content: string;
  type: "text" | "image";
  imageUri?: string;
  createdAt: string;
}

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// 친구별 자동 응답 (더 자연스러운 대화)
const FRIEND_AUTO_REPLIES = [
  "안녕하세요! 반가워요 😊",
  "네, 좋아요! 언제 만날까요?",
  "우리 강아지도 산책 좋아해요 🐕",
  "그 동네 산책로 정말 좋죠!",
  "다음에 같이 산책해요~",
  "사진 보내주세요! 보고 싶어요 🥰",
  "오늘 날씨가 산책하기 딱 좋네요 ☀️",
  "혹시 이번 주말에 시간 되세요?",
  "우리 아이가 친구를 만나면 정말 좋아할 거예요!",
  "좋은 정보 감사합니다! 👍",
];

const GENERAL_AUTO_REPLIES: Record<string, string> = {
  "사진": "사진 잘 받았어요! 귀엽네요 🥰",
  "이미지": "사진 잘 받았어요! 귀엽네요 🥰",
  "시간": "오후 2시~5시 사이에 가능해요!",
  "언제": "이번 주말은 어떠세요? 시간 맞춰볼게요!",
  "비용": "시간당 15,000원이에요. 결제는 앱에서 가능합니다!",
  "가격": "시간당 15,000원이에요. 결제는 앱에서 가능합니다!",
  "감사": "별말씀을요! 잘 부탁드려요 😊",
  "고마": "별말씀을요! 잘 부탁드려요 😊",
  "안녕": "안녕하세요! 반가워요 😊🐾",
  "산책": "산책 좋죠! 우리 동네에 좋은 산책로가 많아요 🌳",
  "강아지": "강아지 이야기 좋아해요! 어떤 견종이에요? 🐶",
};

export default function ChatScreen() {
  const router = useRouter();
  const { roomId, friendName, friendEmoji } = useLocalSearchParams<{
    roomId: string;
    friendName?: string;
    friendEmoji?: string;
  }>();
  const { state, dispatch } = useApp();
  const [inputText, setInputText] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);

  const userId = 1;
  const userName = state.profile.nickname || "사용자";

  // 친구 이름 결정 (URL 파라미터 > 기본값)
  const decodedFriendName = friendName ? decodeURIComponent(friendName) : null;
  const decodedFriendEmoji = friendEmoji ? decodeURIComponent(friendEmoji) : null;
  const otherUserName = decodedFriendName || (state.profile.role === "owner" ? "돌보미" : "반려인");
  const otherUserEmoji = decodedFriendEmoji || "👤";
  const isFriendChat = !!decodedFriendName;

  const roomKey = `room_${roomId}`;

  // 저장된 메시지 로드
  useEffect(() => {
    const saved = state.chatMessages[roomKey];
    if (saved && saved.length > 0) {
      setMessages(saved.map((m) => ({
        id: m.id,
        senderId: m.senderId,
        senderName: m.senderName,
        content: m.content,
        type: m.type,
        imageUri: m.imageUri,
        createdAt: m.createdAt,
      })));
    } else if (!isFriendChat) {
      // 기존 채팅방은 데모 메시지 표시
      setMessages([
        {
          id: "m1",
          senderId: 2,
          senderName: otherUserName,
          content: `안녕하세요! ${otherUserName}입니다 😊`,
          type: "text",
          createdAt: new Date(Date.now() - 3600000).toISOString(),
        },
        {
          id: "m2",
          senderId: 1,
          senderName: userName,
          content: "안녕하세요! 반갑습니다",
          type: "text",
          createdAt: new Date(Date.now() - 3000000).toISOString(),
        },
        {
          id: "m3",
          senderId: 2,
          senderName: otherUserName,
          content: "궁금한 점 있으시면 편하게 말씀해주세요 🐾",
          type: "text",
          createdAt: new Date(Date.now() - 2400000).toISOString(),
        },
      ]);
    } else {
      // 친구와의 새 채팅방 - 환영 메시지
      setMessages([
        {
          id: `welcome_${Date.now()}`,
          senderId: 2,
          senderName: otherUserName,
          content: `안녕하세요! ${otherUserName}입니다. 반가워요! 🐾`,
          type: "text",
          createdAt: new Date().toISOString(),
        },
      ]);
    }
  }, [roomKey]);

  // 메시지 변경 시 저장
  useEffect(() => {
    if (messages.length > 0) {
      const toSave: ChatMessageData[] = messages.map((m) => ({
        id: m.id,
        senderId: m.senderId,
        senderName: m.senderName,
        content: m.content,
        type: m.type,
        imageUri: m.imageUri,
        createdAt: m.createdAt,
      }));
      dispatch({ type: "SET_CHAT_MESSAGES", payload: { roomId: roomKey, messages: toSave } });
    }
  }, [messages]);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages]);

  const getAutoReply = (msg: string): string => {
    // 키워드 매칭
    for (const [keyword, reply] of Object.entries(GENERAL_AUTO_REPLIES)) {
      if (msg.includes(keyword)) return reply;
    }
    // 친구 채팅이면 랜덤 친구 응답
    if (isFriendChat) {
      return FRIEND_AUTO_REPLIES[Math.floor(Math.random() * FRIEND_AUTO_REPLIES.length)];
    }
    return "네, 알겠습니다! 더 궁금한 점 있으시면 말씀해주세요 🐾";
  };

  const handleSendMessage = () => {
    if (!inputText.trim()) return;
    haptic();

    const newMsg: ChatMessage = {
      id: `m${Date.now()}`,
      senderId: userId,
      senderName: userName,
      content: inputText,
      type: "text",
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, newMsg]);
    const currentInput = inputText;
    setInputText("");

    // 자동 응답 시뮬레이션
    setTimeout(() => {
      const autoReply: ChatMessage = {
        id: `m${Date.now() + 1}`,
        senderId: 2,
        senderName: otherUserName,
        content: getAutoReply(currentInput),
        type: "text",
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, autoReply]);
    }, 1000 + Math.random() * 1500);
  };

  const pickImage = async () => {
    haptic();
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedImage(result.assets[0].uri);
      }
    } catch (e) {
      sendDemoImage();
    }
  };

  const sendDemoImage = () => {
    haptic();
    const newMsg: ChatMessage = {
      id: `m${Date.now()}`,
      senderId: userId,
      senderName: userName,
      content: "📷 반려동물 사진",
      type: "image",
      imageUri: "demo_pet_image",
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, newMsg]);

    setTimeout(() => {
      const autoReply: ChatMessage = {
        id: `m${Date.now() + 1}`,
        senderId: 2,
        senderName: otherUserName,
        content: "사진 잘 받았어요! 정말 귀여운 아이네요 🥰🐾",
        type: "text",
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, autoReply]);
    }, 1500);
  };

  const sendImageMessage = () => {
    if (!selectedImage) return;
    haptic();

    const newMsg: ChatMessage = {
      id: `m${Date.now()}`,
      senderId: userId,
      senderName: userName,
      content: "📷 사진",
      type: "image",
      imageUri: selectedImage,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, newMsg]);
    setSelectedImage(null);

    setTimeout(() => {
      const autoReply: ChatMessage = {
        id: `m${Date.now() + 1}`,
        senderId: 2,
        senderName: otherUserName,
        content: "사진 잘 받았어요! 정말 귀여운 아이네요 🥰🐾",
        type: "text",
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, autoReply]);
    }, 1500);
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isOwn = item.senderId === userId;

    return (
      <View style={[styles.messageRow, isOwn && styles.messageRowOwn]}>
        {/* 상대방 아바타 */}
        {!isOwn && (
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarEmoji}>{otherUserEmoji}</Text>
          </View>
        )}
        <View
          style={[
            styles.messageBubble,
            isOwn ? styles.messageBubbleOwn : styles.messageBubbleOther,
            item.type === "image" && styles.imageBubble,
          ]}
        >
          {!isOwn && <Text style={styles.senderName}>{item.senderName}</Text>}

          {item.type === "image" && item.imageUri ? (
            item.imageUri === "demo_pet_image" ? (
              <Pressable onPress={() => { haptic(); }}>
                <View style={styles.demoImageContainer}>
                  <Text style={styles.demoImageEmoji}>🐶</Text>
                  <Text style={styles.demoImageText}>반려동물 사진</Text>
                </View>
              </Pressable>
            ) : (
              <Pressable onPress={() => { haptic(); setPreviewImage(item.imageUri!); }}>
                <Image
                  source={{ uri: item.imageUri }}
                  style={styles.chatImage}
                  contentFit="cover"
                  transition={200}
                />
              </Pressable>
            )
          ) : (
            <Text style={[styles.messageText, isOwn && styles.messageTextOwn]}>
              {item.content}
            </Text>
          )}

          <Text style={[styles.messageTime, isOwn && { color: "rgba(255,255,255,0.7)" }]}>
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
          onPress={() => { haptic(); router.back(); }}
          style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.7 }]}
        >
          <Text style={styles.backBtnText}>‹</Text>
        </Pressable>
        <View style={styles.headerInfo}>
          <Text style={styles.headerEmoji}>{otherUserEmoji}</Text>
          <View>
            <Text style={styles.headerName}>{otherUserName}</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <Text style={styles.headerStatus}>🟢 온라인</Text>
              {isFriendChat && (
                <View style={styles.friendBadge}>
                  <Text style={styles.friendBadgeText}>친구</Text>
                </View>
              )}
            </View>
          </View>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      {/* 메시지 목록 */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messageList}
        scrollEnabled={true}
        ListEmptyComponent={
          <View style={styles.emptyChat}>
            <Text style={styles.emptyChatEmoji}>{otherUserEmoji}</Text>
            <Text style={styles.emptyChatText}>{otherUserName}님과의 대화를 시작해보세요!</Text>
          </View>
        }
      />

      {/* 선택된 이미지 미리보기 */}
      {selectedImage && (
        <View style={styles.selectedImageBar}>
          <Image source={{ uri: selectedImage }} style={styles.selectedImageThumb} contentFit="cover" />
          <Text style={styles.selectedImageText}>사진 1장 선택됨</Text>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Pressable
              onPress={() => setSelectedImage(null)}
              style={({ pressed }) => [styles.cancelImageBtn, pressed && { opacity: 0.7 }]}
            >
              <Text style={styles.cancelImageBtnText}>취소</Text>
            </Pressable>
            <Pressable
              onPress={sendImageMessage}
              style={({ pressed }) => [styles.sendImageBtn, pressed && { opacity: 0.85 }]}
            >
              <Text style={styles.sendImageBtnText}>전송</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* 입력창 */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.inputContainer}
      >
        <View style={styles.inputWrapper}>
          <Pressable
            onPress={pickImage}
            style={({ pressed }) => [styles.photoBtn, pressed && { opacity: 0.7 }]}
          >
            <Text style={styles.photoBtnText}>📷</Text>
          </Pressable>
          <TextInput
            style={styles.input}
            placeholder="메시지를 입력하세요..."
            placeholderTextColor="#BDBDBD"
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={500}
            returnKeyType="send"
            onSubmitEditing={handleSendMessage}
          />
          <Pressable
            onPress={handleSendMessage}
            disabled={!inputText.trim()}
            style={({ pressed }) => [
              styles.sendBtn,
              !inputText.trim() && styles.sendBtnDisabled,
              pressed && { opacity: 0.85 },
            ]}
          >
            <Text style={styles.sendBtnText}>전송</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      {/* 이미지 전체화면 미리보기 */}
      <Modal visible={!!previewImage} transparent animationType="fade">
        <Pressable
          style={styles.previewOverlay}
          onPress={() => setPreviewImage(null)}
        >
          {previewImage && (
            <Image
              source={{ uri: previewImage }}
              style={styles.previewImage}
              contentFit="contain"
            />
          )}
          <Pressable
            onPress={() => setPreviewImage(null)}
            style={({ pressed }) => [styles.previewCloseBtn, pressed && { opacity: 0.7 }]}
          >
            <Text style={styles.previewCloseBtnText}>닫기</Text>
          </Pressable>
        </Pressable>
      </Modal>
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
  headerInfo: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10, marginLeft: 4 },
  headerEmoji: { fontSize: 28 },
  headerName: { fontSize: 16, fontWeight: "700", color: "#1A1A1A" },
  headerStatus: { fontSize: 12, color: "#4CAF82", marginTop: 1 },
  headerSpacer: { width: 40 },
  friendBadge: {
    backgroundColor: "#FFF3EE",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderWidth: 1,
    borderColor: "#FFCCBC",
  },
  friendBadgeText: { fontSize: 10, color: "#FF7043", fontWeight: "700" },
  messageList: { paddingHorizontal: 12, paddingVertical: 12, gap: 8, flexGrow: 1 },
  messageRow: { flexDirection: "row", justifyContent: "flex-start", marginVertical: 4, alignItems: "flex-end" },
  messageRowOwn: { justifyContent: "flex-end" },
  avatarContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F5F5F5",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 6,
    marginBottom: 2,
  },
  avatarEmoji: { fontSize: 18 },
  messageBubble: {
    maxWidth: "75%",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: "#F5F5F5",
  },
  messageBubbleOther: { backgroundColor: "#F5F5F5", borderBottomLeftRadius: 4 },
  messageBubbleOwn: { backgroundColor: "#FF7043", borderBottomRightRadius: 4 },
  imageBubble: { padding: 4, overflow: "hidden" },
  senderName: { fontSize: 11, fontWeight: "700", color: "#757575", marginBottom: 2, marginHorizontal: 4 },
  messageText: { fontSize: 14, color: "#1A1A1A", lineHeight: 20 },
  messageTextOwn: { color: "#fff" },
  messageTime: { fontSize: 10, color: "#9E9E9E", marginTop: 4, marginHorizontal: 4 },
  chatImage: { width: SCREEN_WIDTH * 0.55, height: SCREEN_WIDTH * 0.55, borderRadius: 12 },
  demoImageContainer: {
    width: SCREEN_WIDTH * 0.55,
    height: SCREEN_WIDTH * 0.4,
    borderRadius: 12,
    backgroundColor: "#FFF3EE",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  demoImageEmoji: { fontSize: 48 },
  demoImageText: { fontSize: 13, color: "#FF7043", fontWeight: "600" },
  emptyChat: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
    gap: 12,
  },
  emptyChatEmoji: { fontSize: 48 },
  emptyChatText: { fontSize: 14, color: "#9E9E9E", textAlign: "center" },
  selectedImageBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#FFF3EE",
    borderTopWidth: 1,
    borderTopColor: "#FFE0D0",
    gap: 10,
  },
  selectedImageThumb: { width: 40, height: 40, borderRadius: 8 },
  selectedImageText: { flex: 1, fontSize: 13, color: "#555" },
  cancelImageBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: "#F5F5F5" },
  cancelImageBtnText: { fontSize: 13, color: "#757575", fontWeight: "600" },
  sendImageBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: "#FF7043" },
  sendImageBtnText: { fontSize: 13, color: "#fff", fontWeight: "600" },
  inputContainer: {
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  inputWrapper: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  photoBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F5F5F5",
    alignItems: "center",
    justifyContent: "center",
  },
  photoBtnText: { fontSize: 20 },
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
    minWidth: 56,
  },
  sendBtnDisabled: { backgroundColor: "#BDBDBD", opacity: 0.6 },
  sendBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  previewOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
    alignItems: "center",
    justifyContent: "center",
  },
  previewImage: { width: "90%", height: "70%" },
  previewCloseBtn: {
    position: "absolute",
    top: 60,
    right: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  previewCloseBtnText: { color: "#fff", fontSize: 14, fontWeight: "600" },
});
