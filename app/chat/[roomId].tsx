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
  Modal,
  Dimensions,
} from "react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { ScreenContainer } from "@/components/screen-container";
import { useApp } from "@/lib/app-context";
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

const DEMO_MESSAGES: ChatMessage[] = [
  {
    id: "m1",
    senderId: 2,
    senderName: "돌보미",
    content: "안녕하세요! 돌봄 요청 확인했습니다 😊",
    type: "text",
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: "m2",
    senderId: 1,
    senderName: "나",
    content: "감사합니다! 우리 강아지 사진 보내드릴게요",
    type: "text",
    createdAt: new Date(Date.now() - 3000000).toISOString(),
  },
  {
    id: "m3",
    senderId: 2,
    senderName: "돌보미",
    content: "네! 사진 보내주시면 미리 파악하고 있을게요 🐾",
    type: "text",
    createdAt: new Date(Date.now() - 2400000).toISOString(),
  },
];

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function ChatScreen() {
  const router = useRouter();
  const { roomId } = useLocalSearchParams();
  const { state } = useApp();
  const [inputText, setInputText] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>(DEMO_MESSAGES);
  const [sending, setSending] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);

  const userId = 1;
  const userName = state.profile.nickname || "사용자";
  const otherUserName = state.profile.role === "owner" ? "돌보미" : "반려인";

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages]);

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
    setInputText("");

    // 자동 응답 시뮬레이션
    setTimeout(() => {
      const autoReply: ChatMessage = {
        id: `m${Date.now() + 1}`,
        senderId: 2,
        senderName: otherUserName,
        content: getAutoReply(inputText),
        type: "text",
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, autoReply]);
    }, 1500);
  };

  const getAutoReply = (msg: string): string => {
    if (msg.includes("사진") || msg.includes("이미지")) return "사진 잘 받았어요! 귀엽네요 🥰";
    if (msg.includes("시간") || msg.includes("언제")) return "오후 2시~5시 사이에 가능해요!";
    if (msg.includes("비용") || msg.includes("가격")) return "시간당 15,000원이에요. 결제는 앱에서 가능합니다!";
    if (msg.includes("감사") || msg.includes("고마")) return "별말씀을요! 잘 부탁드려요 😊";
    return "네, 알겠습니다! 더 궁금한 점 있으시면 말씀해주세요 🐾";
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
      // 웹 환경에서 에러 시 데모 이미지 사용
      sendDemoImage();
    }
  };

  const sendDemoImage = () => {
    haptic();
    const demoUri = "demo_pet_image";
    const newMsg: ChatMessage = {
      id: `m${Date.now()}`,
      senderId: userId,
      senderName: userName,
      content: "📷 반려동물 사진",
      type: "image",
      imageUri: demoUri,
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
        <View style={styles.headerTitle}>
          <Text style={styles.headerName}>{otherUserName}</Text>
          <Text style={styles.headerStatus}>🟢 온라인</Text>
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
  headerTitle: { flex: 1, marginLeft: 8 },
  headerName: { fontSize: 16, fontWeight: "700", color: "#1A1A1A" },
  headerStatus: { fontSize: 12, color: "#4CAF82", marginTop: 2 },
  headerSpacer: { width: 40 },
  messageList: { paddingHorizontal: 12, paddingVertical: 12, gap: 8 },
  messageRow: { flexDirection: "row", justifyContent: "flex-start", marginVertical: 4 },
  messageRowOwn: { justifyContent: "flex-end" },
  messageBubble: {
    maxWidth: "80%",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: "#F5F5F5",
  },
  messageBubbleOther: { backgroundColor: "#F5F5F5", borderBottomLeftRadius: 4 },
  messageBubbleOwn: { backgroundColor: "#FF7043", borderBottomRightRadius: 4 },
  imageBubble: { padding: 4, overflow: "hidden" },
  senderName: { fontSize: 11, fontWeight: "700", color: "#757575", marginBottom: 2, marginHorizontal: 8 },
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
