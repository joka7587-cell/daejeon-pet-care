import { useState, useEffect, useRef, useCallback } from "react";
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
  ScrollView,
  Alert,
} from "react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { ScreenContainer } from "@/components/screen-container";
import { useApp, ChatMessageData } from "@/lib/app-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { DAEJEON_WALK_SPOTS, getSpotsByDistrict, type WalkSpot } from "@/lib/daejeon-spots";
import { Fonts } from "@/hooks/use-fonts";
import { KakaoMapView } from "@/components/kakao-map-webview";
import { WalkReportCard, type WalkReportCardData } from "@/components/walk-report-card";
import { PhotoTimestampBubble, type PhotoData } from "@/components/photo-timestamp-bubble";
import { QuickBookingBar } from "@/components/quick-booking-bar";
import {
  getDistrictFromCoordinates,
  estimateCaloriesBurned,
  estimateSteps,
} from "@/lib/walk-session-model";

function haptic() {
  if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

// ─── 메시지 타입 ───
interface ChatMessage {
  id: string;
  senderId: number;
  senderName: string;
  content: string;
  type: "text" | "image" | "location" | "photo" | "walk_report" | "walk_status";
  imageUri?: string;
  locationData?: {
    spotId: string;
    name: string;
    district: string;
    dong: string;
    emoji: string;
    rating: number;
    walkTime: string;
    latitude: number;
    longitude: number;
  };
  photoData?: PhotoData;
  walkReportData?: WalkReportCardData;
  walkStatusData?: {
    status: "started" | "paused" | "resumed" | "completed";
    district?: string;
    timestamp: string;
  };
  createdAt: string;
}

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// 키워드 기반 자동 응답
const KEYWORD_REPLIES: Record<string, string> = {
  사진: "사진 잘 받았어요! 귀엽네요 🥰",
  이미지: "사진 잘 받았어요! 귀엽네요 🥰",
  시간: "오후 2시~5시 사이에 가능해요!",
  언제: "이번 주말은 어떠세요? 시간 맞춰볼게요!",
  비용: "시간당 15,000원이에요. 결제는 앱에서 가능합니다!",
  가격: "시간당 15,000원이에요. 결제는 앱에서 가능합니다!",
  감사: "별말씀을요! 잘 부탁드려요 😊",
  고마: "별말씀을요! 잘 부탁드려요 😊",
  안녕: "안녕하세요! 반가워요 😊🐾",
  산책: "산책 좋죠! 우리 동네에 좋은 산책로가 많아요 🌳",
  강아지: "강아지 이야기 좋아해요! 어떤 견종이에요? 🐶",
};

const SPOT_REPLIES = [
  "좋은 산책 장소네요! 거기서 만나요 🐾",
  "오, 거기 좋죠! 산책하기 딱 좋은 곳이에요 🌳",
  "그 공원 저도 좋아해요! 시간 맞춰볼게요 😊",
  "거기 반려견 산책하기 정말 좋은 곳이에요! 👍",
  "좋아요! 그 근처에서 만나면 되겠네요 📍",
];

const FRIEND_REPLIES = [
  "안녕하세요! 반가워요 😊",
  "네, 좋아요! 언제 만날까요?",
  "우리 강아지도 산책 좋아해요 🐕",
  "그 동네 산책로 정말 좋죠!",
  "다음에 같이 산책해요~",
  "오늘 날씨가 산책하기 딱 좋네요 ☀️",
  "혹시 이번 주말에 시간 되세요?",
  "우리 아이가 친구를 만나면 정말 좋아할 거예요!",
  "좋은 정보 감사합니다! 👍",
  "네, 알겠습니다! 연락 주세요 🐾",
];

const DISTRICT_TABS = ["전체", "서구", "유성구", "중구", "동구", "대덕구"] as const;

// ─── 데모 산책 시뮬레이션 경로 (대전 유성구 궁동 근처) ───
const DEMO_WALK_ROUTE = [
  { latitude: 36.3550, longitude: 127.3850 },
  { latitude: 36.3555, longitude: 127.3860 },
  { latitude: 36.3560, longitude: 127.3870 },
  { latitude: 36.3565, longitude: 127.3880 },
  { latitude: 36.3570, longitude: 127.3890 },
  { latitude: 36.3575, longitude: 127.3895 },
  { latitude: 36.3580, longitude: 127.3900 },
  { latitude: 36.3585, longitude: 127.3905 },
  { latitude: 36.3590, longitude: 127.3910 },
  { latitude: 36.3595, longitude: 127.3915 },
];

// ─── 산책 명소 선택 모달 ───
function SpotPickerModal({
  visible,
  onClose,
  onSelect,
}: {
  visible: boolean;
  onClose: () => void;
  onSelect: (spot: WalkSpot) => void;
}) {
  const [selectedDistrict, setSelectedDistrict] = useState("전체");

  const spots =
    selectedDistrict === "전체"
      ? DAEJEON_WALK_SPOTS
      : getSpotsByDistrict(selectedDistrict);

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={ms.overlay}>
        <View style={ms.sheet}>
          <View style={ms.sheetHeader}>
            <Text style={ms.sheetTitle}>산책 장소 보내기</Text>
            <Pressable
              onPress={onClose}
              style={({ pressed }) => [ms.closeBtn, pressed && { opacity: 0.7 }]}
            >
              <Text style={ms.closeBtnText}>닫기</Text>
            </Pressable>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 6, paddingVertical: 8 }}
          >
            {DISTRICT_TABS.map((d) => {
              const isActive = selectedDistrict === d;
              return (
                <Pressable
                  key={d}
                  onPress={() => {
                    haptic();
                    setSelectedDistrict(d);
                  }}
                  style={[ms.districtChip, isActive && ms.districtChipActive]}
                >
                  <Text style={[ms.districtChipText, isActive && ms.districtChipTextActive]}>
                    {d}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <FlatList
            data={spots}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => {
                  haptic();
                  onSelect(item);
                }}
                style={({ pressed }) => [ms.spotCard, pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }]}
              >
                <View style={ms.spotEmoji}>
                  <Text style={{ fontSize: 28 }}>{item.emoji}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={ms.spotName}>{item.name}</Text>
                  <Text style={ms.spotMeta}>
                    📍 {item.district} {item.dong} · ⭐ {item.rating} · {item.walkTime}
                  </Text>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 4 }}>
                    {item.features.slice(0, 3).map((f) => (
                      <View key={f} style={ms.featureTag}>
                        <Text style={ms.featureTagText}>{f}</Text>
                      </View>
                    ))}
                  </View>
                </View>
                <View style={ms.pinBtn}>
                  <Text style={ms.pinBtnText}>📍</Text>
                </View>
              </Pressable>
            )}
            ListEmptyComponent={
              <View style={{ alignItems: "center", paddingVertical: 40 }}>
                <Text style={{ fontSize: 32 }}>🔍</Text>
                <Text style={{ fontSize: 14, color: "#8E8E93", marginTop: 8 }}>
                  해당 지역에 등록된 산책 명소가 없어요
                </Text>
              </View>
            }
          />
        </View>
      </View>
    </Modal>
  );
}

// ─── 위치 메시지 버블 ───
function LocationBubble({
  locationData,
  isOwn,
}: {
  locationData: ChatMessage["locationData"];
  isOwn: boolean;
}) {
  if (!locationData) return null;
  return (
    <View style={[lb.container, isOwn ? lb.containerOwn : lb.containerOther]}>
      <View style={lb.header}>
        <View style={lb.emojiWrap}>
          <Text style={{ fontSize: 22 }}>{locationData.emoji}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[lb.name, isOwn && { color: "#FFFFFF" }]}>{locationData.name}</Text>
          <Text style={[lb.meta, isOwn && { color: "rgba(255,255,255,0.8)" }]}>
            📍 {locationData.district} {locationData.dong}
          </Text>
        </View>
      </View>
      <View style={[lb.infoRow, isOwn && { backgroundColor: "rgba(255,255,255,0.15)" }]}>
        <Text style={[lb.infoText, isOwn && { color: "rgba(255,255,255,0.9)" }]}>
          ⭐ {locationData.rating}
        </Text>
        <Text style={[lb.infoDivider, isOwn && { backgroundColor: "rgba(255,255,255,0.3)" }]} />
        <Text style={[lb.infoText, isOwn && { color: "rgba(255,255,255,0.9)" }]}>
          🕐 {locationData.walkTime}
        </Text>
      </View>
      <View style={[lb.pinBar, isOwn && { borderTopColor: "rgba(255,255,255,0.2)" }]}>
        <Text style={{ fontSize: 14 }}>📍</Text>
        <Text style={[lb.pinText, isOwn && { color: "rgba(255,255,255,0.8)" }]}>
          산책 장소 핀
        </Text>
      </View>
    </View>
  );
}

// ─── 산책 상태 메시지 ───
function WalkStatusBubble({ data }: { data: ChatMessage["walkStatusData"] }) {
  if (!data) return null;
  const statusMap: Record<string, { emoji: string; text: string; color: string }> = {
    started: { emoji: "🚶", text: "산책을 시작했습니다", color: "#4CAF82" },
    paused: { emoji: "⏸️", text: "산책을 일시 정지했습니다", color: "#F59E0B" },
    resumed: { emoji: "▶️", text: "산책을 재개했습니다", color: "#4CAF82" },
    completed: { emoji: "🎉", text: "산책이 완료되었습니다", color: "#FF6B35" },
  };
  const info = statusMap[data.status] || statusMap.started;
  return (
    <View style={wsb.container}>
      <View style={[wsb.badge, { backgroundColor: info.color + "15" }]}>
        <Text style={{ fontSize: 16 }}>{info.emoji}</Text>
        <Text style={[wsb.text, { color: info.color }]}>{info.text}</Text>
        {data.district && (
          <Text style={wsb.district}>📍 {data.district}</Text>
        )}
      </View>
    </View>
  );
}

const wsb = StyleSheet.create({
  container: { alignItems: "center", marginVertical: 8 },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  text: { fontFamily: Fonts.semiBold, fontSize: 13 },
  district: { fontFamily: Fonts.regular, fontSize: 11, color: "#8E8E93" },
});

// ─── 메인 채팅 화면 ───
export default function ChatScreen() {
  const router = useRouter();
  const { roomId, friendName, friendEmoji, chatName, chatEmoji } = useLocalSearchParams<{
    roomId: string;
    friendName?: string;
    friendEmoji?: string;
    chatName?: string;
    chatEmoji?: string;
  }>();
  const { state, dispatch } = useApp();
  const [inputText, setInputText] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [showSpotPicker, setShowSpotPicker] = useState(false);
  const [showLiveMap, setShowLiveMap] = useState(false);
  const [showBookingBar, setShowBookingBar] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  // 산책 시뮬레이션 상태
  const [walkStatus, setWalkStatus] = useState<"idle" | "walking" | "paused" | "completed">("idle");
  const [walkStartedAt, setWalkStartedAt] = useState<string | undefined>();
  const [walkRouteIndex, setWalkRouteIndex] = useState(0);
  const [walkRoutePoints, setWalkRoutePoints] = useState<Array<{ latitude: number; longitude: number }>>([]);
  const walkTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const userId = 1;
  const userName = state.profile.nickname || "사용자";

  const decodedFriendName = friendName ? decodeURIComponent(friendName) : null;
  const decodedFriendEmoji = friendEmoji ? decodeURIComponent(friendEmoji) : null;
  const decodedChatName = chatName ? decodeURIComponent(chatName) : null;
  const decodedChatEmoji = chatEmoji ? decodeURIComponent(chatEmoji) : null;

  // chatRooms에서 현재 방 정보 가져오기 (워커 상세에서 생성된 방)
  const chatRoom = state.chatRooms?.find((r) => r.id === roomId);

  const otherUserName = decodedFriendName || decodedChatName || chatRoom?.participantName || "상대방";
  const otherUserEmoji = decodedFriendEmoji || decodedChatEmoji || chatRoom?.participantEmoji || "👤";
  const isFriendChat = !!decodedFriendName;
  // roomId가 "room_worker_xxx" 형태이므로 worker 포함 여부로 판별
  const isWorkerChat = roomId?.includes("worker_") || false;

  const roomKey = `room_${roomId}`;

  // 저장된 메시지 로드
  useEffect(() => {
    if (isInitialized) return;
    const saved = state.chatMessages[roomKey];
    if (saved && saved.length > 0) {
      setMessages(
        saved.map((m) => ({
          id: m.id,
          senderId: m.senderId,
          senderName: m.senderName,
          content: m.content,
          type: m.type as ChatMessage["type"],
          imageUri: m.imageUri,
          locationData: m.locationData,
          photoData: m.photoData as PhotoData | undefined,
          walkReportData: m.walkReportData as WalkReportCardData | undefined,
          walkStatusData: m.walkStatusData,
          createdAt: m.createdAt,
        }))
      );
    }
    setIsInitialized(true);
  }, [roomKey]);

  // 메시지 변경 시 저장
  useEffect(() => {
    if (!isInitialized) return;
    if (messages.length > 0) {
      const toSave: ChatMessageData[] = messages.map((m) => ({
        id: m.id,
        senderId: m.senderId,
        senderName: m.senderName,
        content: m.content,
        type: m.type,
        imageUri: m.imageUri,
        locationData: m.locationData,
        photoData: m.photoData,
        walkReportData: m.walkReportData,
        walkStatusData: m.walkStatusData,
        createdAt: m.createdAt,
      }));
      dispatch({ type: "SET_CHAT_MESSAGES", payload: { roomId: roomKey, messages: toSave } });
    }
  }, [messages, isInitialized]);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length]);

  // 산책 시뮬레이션 타이머
  useEffect(() => {
    if (walkStatus === "walking") {
      walkTimerRef.current = setInterval(() => {
        setWalkRouteIndex((prev) => {
          const next = prev + 1;
          if (next >= DEMO_WALK_ROUTE.length) {
            return prev; // 경로 끝에 도달
          }
          setWalkRoutePoints((pts) => [...pts, DEMO_WALK_ROUTE[next]]);
          return next;
        });
      }, 3000);
    }
    return () => {
      if (walkTimerRef.current) clearInterval(walkTimerRef.current);
    };
  }, [walkStatus]);

  const getAutoReply = useCallback(
    (msg: string): string => {
      const lowerMsg = msg.toLowerCase();
      for (const [keyword, reply] of Object.entries(KEYWORD_REPLIES)) {
        if (lowerMsg.includes(keyword)) return reply;
      }
      if (isFriendChat) {
        return FRIEND_REPLIES[Math.floor(Math.random() * FRIEND_REPLIES.length)];
      }
      return "네, 알겠습니다! 더 궁금한 점 있으시면 말씀해주세요 🐾";
    },
    [isFriendChat]
  );

  // ─── 텍스트 메시지 전송 ───
  const handleSendMessage = () => {
    if (!inputText.trim()) return;
    haptic();

    const newMsg: ChatMessage = {
      id: `msg_${roomId}_${Date.now()}`,
      senderId: userId,
      senderName: userName,
      content: inputText.trim(),
      type: "text",
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, newMsg]);
    const currentInput = inputText;
    setInputText("");

    setTimeout(() => {
      const autoReply: ChatMessage = {
        id: `msg_${roomId}_reply_${Date.now()}`,
        senderId: 2,
        senderName: otherUserName,
        content: getAutoReply(currentInput),
        type: "text",
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, autoReply]);
    }, 1000 + Math.random() * 1500);
  };

  // ─── 산책 명소 핀 전송 ───
  const handleSendSpotPin = (spot: WalkSpot) => {
    haptic();
    setShowSpotPicker(false);

    const newMsg: ChatMessage = {
      id: `msg_${roomId}_loc_${Date.now()}`,
      senderId: userId,
      senderName: userName,
      content: `📍 ${spot.name} (${spot.district} ${spot.dong})`,
      type: "location",
      locationData: {
        spotId: spot.id,
        name: spot.name,
        district: spot.district,
        dong: spot.dong,
        emoji: spot.emoji,
        rating: spot.rating,
        walkTime: spot.walkTime,
        latitude: spot.latitude,
        longitude: spot.longitude,
      },
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, newMsg]);

    setTimeout(() => {
      const reply = SPOT_REPLIES[Math.floor(Math.random() * SPOT_REPLIES.length)];
      const autoReply: ChatMessage = {
        id: `msg_${roomId}_locreply_${Date.now()}`,
        senderId: 2,
        senderName: otherUserName,
        content: reply,
        type: "text",
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, autoReply]);
    }, 1200 + Math.random() * 1000);
  };

  // ─── 사진 업로드 (타임스탬프 + 위치 자동 기록) ───
  const pickImage = async () => {
    haptic();
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        sendPhotoWithTimestamp(result.assets[0].uri);
      }
    } catch (_e) {
      // 데모 모드: 갤러리 접근 불가 시
      sendPhotoWithTimestamp("demo_pet_image");
    }
  };

  const sendPhotoWithTimestamp = (uri: string) => {
    haptic();
    const now = new Date();
    const formattedTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

    // 현재 위치 결정 (산책 중이면 산책 위치, 아니면 기본 위치)
    const currentLat = walkStatus === "walking" && walkRouteIndex < DEMO_WALK_ROUTE.length
      ? DEMO_WALK_ROUTE[walkRouteIndex].latitude
      : 36.3550;
    const currentLon = walkStatus === "walking" && walkRouteIndex < DEMO_WALK_ROUTE.length
      ? DEMO_WALK_ROUTE[walkRouteIndex].longitude
      : 127.3850;
    const district = getDistrictFromCoordinates(currentLat, currentLon);

    const photoData: PhotoData = {
      uri,
      district: `대전 ${district}`,
      formattedTime,
      latitude: currentLat,
      longitude: currentLon,
    };

    const newMsg: ChatMessage = {
      id: `msg_${roomId}_photo_${Date.now()}`,
      senderId: userId,
      senderName: userName,
      content: `📷 대전 ${district} 산책 중 - ${formattedTime}`,
      type: "photo",
      photoData,
      createdAt: now.toISOString(),
    };
    setMessages((prev) => [...prev, newMsg]);
    setSelectedImage(null);

    setTimeout(() => {
      const autoReply: ChatMessage = {
        id: `msg_${roomId}_photoreply_${Date.now()}`,
        senderId: 2,
        senderName: otherUserName,
        content: "사진 잘 받았어요! 정말 귀여운 아이네요 🥰🐾",
        type: "text",
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, autoReply]);
    }, 1500);
  };

  // ─── 산책 시작 시뮬레이션 ───
  const handleStartWalk = () => {
    haptic();
    setWalkStatus("walking");
    setWalkStartedAt(new Date().toISOString());
    setWalkRouteIndex(0);
    setWalkRoutePoints([DEMO_WALK_ROUTE[0]]);

    const district = getDistrictFromCoordinates(
      DEMO_WALK_ROUTE[0].latitude,
      DEMO_WALK_ROUTE[0].longitude
    );

    const statusMsg: ChatMessage = {
      id: `msg_${roomId}_walkstart_${Date.now()}`,
      senderId: 0,
      senderName: "시스템",
      content: `🚶 ${otherUserName}님이 산책을 시작했습니다`,
      type: "walk_status",
      walkStatusData: {
        status: "started",
        district: `대전 ${district}`,
        timestamp: new Date().toISOString(),
      },
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, statusMsg]);
  };

  // ─── 산책 종료 ───
  const handleEndWalk = () => {
    haptic();
    if (walkTimerRef.current) clearInterval(walkTimerRef.current);
    setWalkStatus("completed");

    const endDistrict = walkRouteIndex < DEMO_WALK_ROUTE.length
      ? getDistrictFromCoordinates(
          DEMO_WALK_ROUTE[walkRouteIndex].latitude,
          DEMO_WALK_ROUTE[walkRouteIndex].longitude
        )
      : "유성구 궁동";

    // 산책 종료 상태 메시지
    const statusMsg: ChatMessage = {
      id: `msg_${roomId}_walkend_${Date.now()}`,
      senderId: 0,
      senderName: "시스템",
      content: `🎉 ${otherUserName}님이 산책을 종료했습니다`,
      type: "walk_status",
      walkStatusData: {
        status: "completed",
        district: `대전 ${endDistrict}`,
        timestamp: new Date().toISOString(),
      },
      createdAt: new Date().toISOString(),
    };

    // 산책 리포트 데이터 생성
    const durationMin = walkStartedAt
      ? Math.round((Date.now() - new Date(walkStartedAt).getTime()) / 60000)
      : 45;
    const distanceKm = Math.max(0.5, walkRoutePoints.length * 0.12);
    const caloriesBurned = estimateCaloriesBurned(durationMin, distanceKm);
    const stepsEstimated = estimateSteps(distanceKm);

    const now = new Date();
    const startTime = walkStartedAt ? new Date(walkStartedAt) : now;

    const reportData: WalkReportCardData = {
      reportId: `report_${Date.now()}`,
      workerName: otherUserName,
      petName: state.profile.pets?.[0]?.name || "멍멍이",
      petEmoji: state.profile.pets?.[0]?.emoji || "🐶",
      durationMin: Math.max(durationMin, 1),
      distanceKm: Math.round(distanceKm * 100) / 100,
      caloriesBurned,
      stepsEstimated,
      photoCount: messages.filter((m) => m.type === "photo" || m.type === "image").length,
      date: now.toISOString().split("T")[0],
      startTime: `${String(startTime.getHours()).padStart(2, "0")}:${String(startTime.getMinutes()).padStart(2, "0")}`,
      endTime: `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`,
      petMood: "happy",
    };

    const reportMsg: ChatMessage = {
      id: `msg_${roomId}_report_${Date.now()}`,
      senderId: 2,
      senderName: otherUserName,
      content: "📋 산책 리포트가 도착했습니다!",
      type: "walk_report",
      walkReportData: reportData,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, statusMsg, reportMsg]);
    setShowLiveMap(false);
  };

  // ─── 메시지 렌더링 ───
  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isOwn = item.senderId === userId;
    const isSystem = item.senderId === 0;

    // 시스템 메시지
    if (isSystem && item.type !== "walk_status") {
      return (
        <View style={styles.systemMessageRow}>
          <View style={styles.systemBubble}>
            <Text style={styles.systemText}>{item.content}</Text>
          </View>
        </View>
      );
    }

    // 산책 상태 메시지
    if (item.type === "walk_status") {
      return <WalkStatusBubble data={item.walkStatusData} />;
    }

    // 산책 리포트 카드
    if (item.type === "walk_report" && item.walkReportData) {
      return (
        <View style={[styles.messageRow, isOwn && styles.messageRowOwn]}>
          {!isOwn && (
            <View style={styles.avatarContainer}>
              <Text style={styles.avatarEmoji}>{otherUserEmoji}</Text>
            </View>
          )}
          <View style={{ maxWidth: "85%" }}>
            {!isOwn && <Text style={styles.senderName}>{item.senderName}</Text>}
            <WalkReportCard
              data={item.walkReportData}
              isOwn={isOwn}
              onViewDetail={() => {
                haptic();
                if (Platform.OS === "web") {
                  alert("산책 리포트 상세 보기 (추후 구현)");
                } else {
                  Alert.alert("산책 리포트", "상세 리포트 화면으로 이동합니다.");
                }
              }}
            />
            <Text style={[styles.messageTime, isOwn && { textAlign: "right" }]}>
              {new Date(item.createdAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Text>
          </View>
        </View>
      );
    }

    // 사진 + 타임스탬프 메시지
    if (item.type === "photo" && item.photoData) {
      return (
        <View style={[styles.messageRow, isOwn && styles.messageRowOwn]}>
          {!isOwn && (
            <View style={styles.avatarContainer}>
              <Text style={styles.avatarEmoji}>{otherUserEmoji}</Text>
            </View>
          )}
          <View style={{ maxWidth: "80%" }}>
            {!isOwn && <Text style={styles.senderName}>{item.senderName}</Text>}
            <PhotoTimestampBubble
              photoData={item.photoData}
              isOwn={isOwn}
              isDemo={item.photoData.uri === "demo_pet_image"}
              onPress={() => {
                if (item.photoData?.uri && item.photoData.uri !== "demo_pet_image") {
                  setPreviewImage(item.photoData.uri);
                }
              }}
            />
            <Text style={[styles.messageTime, isOwn && { textAlign: "right" }]}>
              {new Date(item.createdAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Text>
          </View>
        </View>
      );
    }

    // 위치 메시지
    if (item.type === "location" && item.locationData) {
      return (
        <View style={[styles.messageRow, isOwn && styles.messageRowOwn]}>
          {!isOwn && (
            <View style={styles.avatarContainer}>
              <Text style={styles.avatarEmoji}>{otherUserEmoji}</Text>
            </View>
          )}
          <View style={{ maxWidth: "80%" }}>
            {!isOwn && <Text style={styles.senderName}>{item.senderName}</Text>}
            <LocationBubble locationData={item.locationData} isOwn={isOwn} />
            <Text style={[styles.messageTime, isOwn && { textAlign: "right" }]}>
              {new Date(item.createdAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Text>
          </View>
        </View>
      );
    }

    // 일반 텍스트 / 이미지 메시지
    return (
      <View style={[styles.messageRow, isOwn && styles.messageRowOwn]}>
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
              <Pressable onPress={() => haptic()}>
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

  // 현재 워커 위치
  const currentWalkerLocation = walkRouteIndex < DEMO_WALK_ROUTE.length
    ? {
        latitude: DEMO_WALK_ROUTE[walkRouteIndex].latitude,
        longitude: DEMO_WALK_ROUTE[walkRouteIndex].longitude,
        timestamp: new Date().toISOString(),
        district: `대전 ${getDistrictFromCoordinates(
          DEMO_WALK_ROUTE[walkRouteIndex].latitude,
          DEMO_WALK_ROUTE[walkRouteIndex].longitude
        )}`,
      }
    : undefined;

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
              <Text style={styles.headerStatus}>
                {walkStatus === "walking" ? "🟢 산책 중" : "🟢 온라인"}
              </Text>
              {isFriendChat && (
                <View style={styles.friendBadge}>
                  <Text style={styles.friendBadgeText}>친구</Text>
                </View>
              )}
            </View>
          </View>
        </View>
        <View style={{ flexDirection: "row", gap: 6 }}>
          {/* 간편 예약 토글 */}
          {isWorkerChat && (
            <Pressable
              onPress={() => { haptic(); setShowBookingBar(!showBookingBar); }}
              style={({ pressed }) => [styles.headerActionBtn, pressed && { opacity: 0.7 }]}
            >
              <Text style={{ fontSize: 16 }}>📅</Text>
            </Pressable>
          )}
        </View>
      </View>

      {/* 간편 예약 바 */}
      {showBookingBar && isWorkerChat && (
        <QuickBookingBar
          workerName={otherUserName}
          onSubmit={(data) => {
            haptic();
            setShowBookingBar(false);
            const bookingMsg: ChatMessage = {
              id: `msg_${roomId}_booking_${Date.now()}`,
              senderId: userId,
              senderName: userName,
              content: `📅 예약 요청: ${data.date} ${data.time} (${data.duration})`,
              type: "text",
              createdAt: new Date().toISOString(),
            };
            setMessages((prev) => [...prev, bookingMsg]);
            setTimeout(() => {
              const reply: ChatMessage = {
                id: `msg_${roomId}_bookreply_${Date.now()}`,
                senderId: 2,
                senderName: otherUserName,
                content: `네! ${data.date} ${data.time}에 ${data.duration} 산책 예약 확인했습니다! 🐾`,
                type: "text",
                createdAt: new Date().toISOString(),
              };
              setMessages((prev) => [...prev, reply]);
            }, 1500);
          }}
        />
      )}

      {/* 실시간 산책 지도 버튼 */}
      {(walkStatus === "walking" || walkStatus === "completed") && (
        <Pressable
          onPress={() => { haptic(); setShowLiveMap(true); }}
          style={({ pressed }) => [
            styles.liveMapBanner,
            pressed && { opacity: 0.9, transform: [{ scale: 0.99 }] },
          ]}
        >
          <View style={styles.liveMapBannerContent}>
            <View style={styles.liveMapDot} />
            <Text style={styles.liveMapBannerText}>
              {walkStatus === "walking" ? "실시간 산책 지도 보러가기" : "산책 경로 보기"}
            </Text>
            <Text style={styles.liveMapBannerArrow}>→</Text>
          </View>
        </Pressable>
      )}

      {/* 산책 시작 버튼 (데모용 - 워커 채팅방에서만) */}
      {walkStatus === "idle" && isWorkerChat && (
        <Pressable
          onPress={handleStartWalk}
          style={({ pressed }) => [
            styles.startWalkBanner,
            pressed && { opacity: 0.9, transform: [{ scale: 0.99 }] },
          ]}
        >
          <Text style={{ fontSize: 16 }}>🚶</Text>
          <Text style={styles.startWalkText}>산책 시작 (데모)</Text>
        </Pressable>
      )}

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
            {isWorkerChat && (
              <Text style={styles.emptyChatSub}>
                산책 예약, 사진 전송, 위치 공유가 가능합니다
              </Text>
            )}
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
              onPress={() => sendPhotoWithTimestamp(selectedImage)}
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
            style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.7 }]}
          >
            <Text style={styles.actionBtnText}>📷</Text>
          </Pressable>
          <Pressable
            onPress={() => { haptic(); setShowSpotPicker(true); }}
            style={({ pressed }) => [styles.actionBtn, styles.pinActionBtn, pressed && { opacity: 0.7 }]}
          >
            <Text style={styles.actionBtnText}>📍</Text>
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

      {/* 산책 명소 선택 모달 */}
      <SpotPickerModal
        visible={showSpotPicker}
        onClose={() => setShowSpotPicker(false)}
        onSelect={handleSendSpotPin}
      />

      {/* 실시간 산책 지도 모달 */}
      <KakaoMapView
        visible={showLiveMap}
        onClose={() => setShowLiveMap(false)}
        workerName={otherUserName}
        workerEmoji={otherUserEmoji}
        petName={state.profile.pets?.[0]?.name || "멍멍이"}
        petEmoji={state.profile.pets?.[0]?.emoji || "🐶"}
        walkStatus={walkStatus}
        startedAt={walkStartedAt}
        currentLocation={currentWalkerLocation}
        routePoints={walkRoutePoints}
        totalDistanceKm={walkRoutePoints.length * 0.12}
        totalDurationSec={
          walkStartedAt ? (Date.now() - new Date(walkStartedAt).getTime()) / 1000 : 0
        }
        onEndWalk={handleEndWalk}
      />

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

// ─── 메인 채팅 스타일 ───
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
  headerActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FFF5F0",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#FFE0D0",
  },
  friendBadge: {
    backgroundColor: "#FFF3EE",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderWidth: 1,
    borderColor: "#FFCCBC",
  },
  friendBadgeText: { fontSize: 10, color: "#FF7043", fontWeight: "700" },
  liveMapBanner: {
    marginHorizontal: 12,
    marginTop: 8,
    backgroundColor: "#FF6B35",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  liveMapBannerContent: { flexDirection: "row", alignItems: "center", gap: 8 },
  liveMapDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#FFFFFF",
  },
  liveMapBannerText: {
    fontFamily: Fonts.bold,
    fontSize: 14,
    color: "#FFFFFF",
    flex: 1,
  },
  liveMapBannerArrow: { fontSize: 16, color: "#FFFFFF", fontWeight: "700" },
  startWalkBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 12,
    marginTop: 8,
    backgroundColor: "#F0FFF4",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#C6F6D5",
  },
  startWalkText: { fontFamily: Fonts.semiBold, fontSize: 13, color: "#2E7D32" },
  messageList: { paddingHorizontal: 12, paddingVertical: 12, gap: 8, flexGrow: 1 },
  messageRow: { flexDirection: "row", justifyContent: "flex-start", marginVertical: 4, alignItems: "flex-end" },
  messageRowOwn: { justifyContent: "flex-end" },
  systemMessageRow: { alignItems: "center", marginVertical: 8 },
  systemBubble: {
    backgroundColor: "#F0F0F0",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  systemText: { fontSize: 12, color: "#8E8E93", textAlign: "center" },
  avatarContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F8F8F8",
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
    backgroundColor: "#F8F8F8",
  },
  messageBubbleOther: { backgroundColor: "#F8F8F8", borderBottomLeftRadius: 4 },
  messageBubbleOwn: { backgroundColor: "#FF7043", borderBottomRightRadius: 4 },
  imageBubble: { padding: 4, overflow: "hidden" },
  senderName: { fontSize: 11, fontWeight: "700", color: "#8E8E93", marginBottom: 2, marginHorizontal: 4 },
  messageText: { fontSize: 14, color: "#1A1A1A", lineHeight: 20 },
  messageTextOwn: { color: "#FFFFFF" },
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
  emptyChatSub: { fontSize: 12, color: "#BDBDBD", textAlign: "center" },
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
  selectedImageText: { flex: 1, fontSize: 13, color: "#8E8E93" },
  cancelImageBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: "#F8F8F8" },
  cancelImageBtnText: { fontSize: 13, color: "#8E8E93", fontWeight: "600" },
  sendImageBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: "#FF7043" },
  sendImageBtnText: { fontSize: 13, color: "#FFFFFF", fontWeight: "600" },
  inputContainer: {
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  inputWrapper: { flexDirection: "row", alignItems: "flex-end", gap: 6 },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F8F8F8",
    alignItems: "center",
    justifyContent: "center",
  },
  pinActionBtn: {
    backgroundColor: "#FFF5F0",
    borderWidth: 1,
    borderColor: "#FFD9C7",
  },
  actionBtnText: { fontSize: 18 },
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
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 52,
  },
  sendBtnDisabled: { backgroundColor: "#BDBDBD", opacity: 0.6 },
  sendBtnText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
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
  previewCloseBtnText: { color: "#FFFFFF", fontSize: 14, fontWeight: "600" },
});

// ─── 산책 명소 선택 모달 스타일 ───
const ms = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "80%",
    paddingTop: 8,
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  sheetTitle: { fontFamily: Fonts.bold, fontSize: 18, color: "#1A1A1A", letterSpacing: -0.3 },
  closeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#F5F5F5",
  },
  closeBtnText: { fontFamily: Fonts.semiBold, fontSize: 13, color: "#8E8E93" },
  districtChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: "#F5F5F5",
    borderWidth: 1,
    borderColor: "#E8E8E8",
  },
  districtChipActive: { backgroundColor: "#FF6B35", borderColor: "#FF6B35" },
  districtChipText: { fontFamily: Fonts.semiBold, fontSize: 12, color: "#8E8E93" },
  districtChipTextActive: { color: "#FFFFFF", fontFamily: Fonts.bold },
  spotCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F5F5F5",
  },
  spotEmoji: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#FFF5F0",
    alignItems: "center",
    justifyContent: "center",
  },
  spotName: { fontFamily: Fonts.bold, fontSize: 15, color: "#1A1A1A" },
  spotMeta: { fontFamily: Fonts.regular, fontSize: 11, color: "#8E8E93", marginTop: 2 },
  featureTag: { backgroundColor: "#F0FFF4", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  featureTagText: { fontFamily: Fonts.medium, fontSize: 10, color: "#2E7D32" },
  pinBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FF6B35",
    alignItems: "center",
    justifyContent: "center",
  },
  pinBtnText: { fontSize: 16 },
});

// ─── 위치 버블 스타일 ───
const lb = StyleSheet.create({
  container: { borderRadius: 16, padding: 12, width: SCREEN_WIDTH * 0.65 },
  containerOwn: { backgroundColor: "#FF7043" },
  containerOther: { backgroundColor: "#F8F8F8" },
  header: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  emojiWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  name: { fontFamily: Fonts.bold, fontSize: 14, color: "#1A1A1A" },
  meta: { fontFamily: Fonts.regular, fontSize: 11, color: "#8E8E93", marginTop: 1 },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0F0F0",
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    gap: 8,
  },
  infoText: { fontFamily: Fonts.medium, fontSize: 11, color: "#1A1A1A" },
  infoDivider: { width: 1, height: 12, backgroundColor: "#D0D0D0" },
  pinBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#E8E8E8",
  },
  pinText: { fontFamily: Fonts.medium, fontSize: 11, color: "#8E8E93" },
});
