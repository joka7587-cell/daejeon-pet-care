import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  Pressable,
  ActivityIndicator,
  Alert,
  Platform,
  StyleSheet,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import * as Clipboard from "expo-clipboard";
import { Share } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useApp, Friend } from "@/lib/app-context";
import { getApiBaseUrl } from "@/constants/oauth";

const haptic = () => {
  if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
};

// 서버 API 호출 헬퍼 - 타임아웃 포함
async function apiCall(path: string, body?: any, timeoutMs = 8000): Promise<any> {
  const baseUrl = getApiBaseUrl();
  if (!baseUrl) throw new Error("API URL not configured");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const url = `${baseUrl}/api/trpc/${path}`;
    if (body !== undefined) {
      // mutation (POST)
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ json: body }),
        credentials: "include",
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return data?.result?.data?.json ?? data?.result?.data ?? data;
    } else {
      // query (GET)
      const res = await fetch(url, {
        credentials: "include",
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return data?.result?.data?.json ?? data?.result?.data ?? data;
    }
  } finally {
    clearTimeout(timer);
  }
}

// deviceId 생성 (앱 고유 식별자)
function getDeviceId(friendCode: string): string {
  return `device_${friendCode}`;
}

interface SearchResult {
  userId: number;
  nickname: string;
  emoji: string;
  neighborhood: string;
  role: "owner" | "caretaker";
  isServerUser: boolean;
}

interface FriendRequestItem {
  id: number;
  fromUserId: number;
  fromNickname: string;
  fromEmoji: string | null;
  fromNeighborhood: string | null;
  fromRole: "owner" | "caretaker";
  fromCode: string;
  toNickname: string | null;
  toEmoji: string | null;
  toUserId: number;
  status: string;
  createdAt: string;
}

// 데모 친구 코드 (서버 미연결 시 폴백)
const DEMO_CODES: Record<string, { nickname: string; emoji: string; neighborhood: string; role: "owner" | "caretaker" }> = {
  "ABCD-1234": { nickname: "김민지", emoji: "👩", neighborhood: "유성구", role: "owner" },
  "EFGH-5678": { nickname: "이준호", emoji: "👨", neighborhood: "둔산", role: "caretaker" },
  "JKLM-9012": { nickname: "박서연", emoji: "👧", neighborhood: "관평", role: "owner" },
  "NOPQ-3456": { nickname: "최도윤", emoji: "🧑", neighborhood: "노은", role: "caretaker" },
  "RSTU-7890": { nickname: "정하은", emoji: "👩‍🦰", neighborhood: "봉명", role: "owner" },
};

type TabType = "friends" | "received" | "sent";

export default function FriendsScreen() {
  const { state, dispatch } = useApp();
  const router = useRouter();
  const { profile } = state;
  const friends = profile.friends;
  const myCode = profile.friendCode;

  const [activeTab, setActiveTab] = useState<TabType>("friends");
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [friendCode, setFriendCode] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
  const [searchError, setSearchError] = useState("");
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [serverRegistered, setServerRegistered] = useState(false);
  const [isSendingRequest, setIsSendingRequest] = useState(false);
  const [receivedRequests, setReceivedRequests] = useState<FriendRequestItem[]>([]);
  const [sentRequests, setSentRequests] = useState<FriendRequestItem[]>([]);
  const [isLoadingRequests, setIsLoadingRequests] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // 서버에 친구 코드 등록
  useEffect(() => {
    if (!myCode || !profile.nickname) return;
    const deviceId = getDeviceId(myCode);
    (async () => {
      try {
        await apiCall("friends.registerCode", {
          deviceId,
          code: myCode,
          nickname: profile.nickname,
          profileEmoji: profile.avatarEmoji || "🐶",
          neighborhood: profile.neighborhood || "유성구",
          role: profile.role || "owner",
        });
        setServerRegistered(true);
      } catch (_) {
        // 서버 미연결 시 무시
      }
    })();
  }, [myCode, profile.nickname]);

  // 받은/보낸 요청 로드
  const loadRequests = useCallback(async () => {
    if (!myCode) return;
    const deviceId = getDeviceId(myCode);
    setIsLoadingRequests(true);
    try {
      const [received, sent] = await Promise.all([
        apiCall(`friends.receivedRequests?input=${encodeURIComponent(JSON.stringify({ json: { deviceId } }))}`).catch(() => []),
        apiCall(`friends.sentRequests?input=${encodeURIComponent(JSON.stringify({ json: { deviceId } }))}`).catch(() => []),
      ]);
      setReceivedRequests(Array.isArray(received) ? received : []);
      setSentRequests(Array.isArray(sent) ? sent : []);
    } catch (_) {}
    setIsLoadingRequests(false);
  }, [myCode]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRequests();
    setRefreshing(false);
  };

  // 친구 코드 복사
  const handleCopyCode = async () => {
    haptic();
    try {
      if (Platform.OS === "web") {
        await navigator.clipboard.writeText(myCode);
      } else {
        await Clipboard.setStringAsync(myCode);
      }
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2000);
    } catch (_) {
      Alert.alert("복사 실패", "클립보드 접근이 제한되었습니다.");
    }
  };

  // 붙여넣기
  const handlePasteCode = async () => {
    haptic();
    try {
      let text = "";
      if (Platform.OS === "web") {
        text = await navigator.clipboard.readText();
      } else {
        text = await Clipboard.getStringAsync();
      }
      if (text) {
        const cleaned = text.trim().toUpperCase();
        setFriendCode(cleaned);
        setSearchResult(null);
        setSearchError("");
      }
    } catch (_) {}
  };

  // 코드 공유
  const handleShareCode = async () => {
    haptic();
    try {
      await Share.share({
        message: `반려이음에서 친구 추가해주세요!\n내 친구 코드: ${myCode}\n\n앱에서 친구 > + 추가 > 코드 입력으로 추가할 수 있어요!`,
      });
    } catch (_) {}
  };

  // 검색
  const handleSearch = async () => {
    const code = friendCode.trim().toUpperCase();
    if (!code) {
      setSearchError("친구 코드를 입력해주세요");
      return;
    }
    if (code === myCode) {
      setSearchError("자신의 코드는 검색할 수 없어요");
      return;
    }

    setIsSearching(true);
    setSearchResult(null);
    setSearchError("");

    // 1) 서버 검색 시도
    try {
      const result = await apiCall(
        `friends.searchByCode?input=${encodeURIComponent(JSON.stringify({ json: { code } }))}`
      );
      if (result && result.userId) {
        setSearchResult({
          userId: result.userId,
          nickname: result.nickname || "사용자",
          emoji: result.profileEmoji || "🐶",
          neighborhood: result.neighborhood || "대전",
          role: result.role || "owner",
          isServerUser: true,
        });
        setIsSearching(false);
        return;
      }
    } catch (_) {
      // 서버 실패 → 로컬 폴백
    }

    // 2) 로컬 데모 코드 검색
    const demo = DEMO_CODES[code];
    if (demo) {
      setSearchResult({
        userId: 0,
        nickname: demo.nickname,
        emoji: demo.emoji,
        neighborhood: demo.neighborhood,
        role: demo.role,
        isServerUser: false,
      });
    } else {
      setSearchError("해당 코드의 사용자를 찾을 수 없어요.\n코드를 다시 확인해주세요.");
    }
    setIsSearching(false);
  };

  // 친구 요청 보내기 (서버 사용자) 또는 바로 추가 (데모)
  const handleAddFriend = async () => {
    if (!searchResult) return;
    haptic();

    // 이미 친구인지 확인
    const alreadyFriend = friends.some(
      (f) => f.serverUserId === searchResult.userId || f.nickname === searchResult.nickname
    );
    if (alreadyFriend) {
      Alert.alert("알림", "이미 친구로 추가된 사용자입니다.");
      return;
    }

    if (searchResult.isServerUser && searchResult.userId > 0) {
      // 서버 사용자 → 친구 요청 보내기
      setIsSendingRequest(true);
      try {
        const deviceId = getDeviceId(myCode);
        const result = await apiCall("friends.sendRequest", {
          deviceId,
          toUserId: searchResult.userId,
          fromNickname: profile.nickname || "사용자",
          fromEmoji: profile.avatarEmoji || "🐶",
          fromNeighborhood: profile.neighborhood || "유성구",
          fromRole: profile.role || "owner",
          fromCode: myCode,
          toNickname: searchResult.nickname,
          toEmoji: searchResult.emoji,
        });

        if (result?.success) {
          Alert.alert("요청 완료", `${searchResult.nickname}님에게 친구 요청을 보냈습니다.\n상대방이 수락하면 친구가 됩니다!`);
          setSearchResult(null);
          setFriendCode("");
          setShowCodeInput(false);
          loadRequests(); // 보낸 요청 목록 새로고침
        } else {
          Alert.alert("알림", result?.message || "요청을 보낼 수 없습니다.");
        }
      } catch (e: any) {
        if (e.name === "AbortError") {
          Alert.alert("시간 초과", "서버 응답이 없습니다. 나중에 다시 시도해주세요.");
        } else {
          Alert.alert("오류", "친구 요청을 보내지 못했습니다.");
        }
      }
      setIsSendingRequest(false);
    } else {
      // 데모 사용자 → 바로 추가
      const newFriend: Friend = {
        id: `friend_${Date.now()}`,
        nickname: searchResult.nickname,
        profileEmoji: searchResult.emoji,
        neighborhood: searchResult.neighborhood,
        role: searchResult.role,
        addedAt: new Date().toISOString(),
      };
      dispatch({ type: "ADD_FRIEND", payload: newFriend });
      dispatch({
        type: "ADD_NOTIFICATION",
        payload: {
          id: `notif_${Date.now()}`,
          type: "friend_add",
          title: "새 친구 추가",
          body: `${searchResult.nickname}님과 친구가 되었습니다!`,
          createdAt: new Date().toISOString(),
          isRead: false,
        },
      });
      Alert.alert("친구 추가 완료", `${searchResult.nickname}님이 친구로 추가되었습니다!`);
      setSearchResult(null);
      setFriendCode("");
      setShowCodeInput(false);
    }
  };

  // 친구 요청 수락
  const handleAcceptRequest = async (request: FriendRequestItem) => {
    haptic();
    try {
      const result = await apiCall("friends.acceptRequest", { requestId: request.id });
      if (result?.success) {
        // 로컬에도 친구 추가
        const newFriend: Friend = {
          id: `friend_server_${request.fromUserId}`,
          serverUserId: request.fromUserId,
          nickname: request.fromNickname,
          profileEmoji: request.fromEmoji || "🐶",
          neighborhood: request.fromNeighborhood || "대전",
          role: request.fromRole,
          addedAt: new Date().toISOString(),
        };
        dispatch({ type: "ADD_FRIEND", payload: newFriend });
        dispatch({
          type: "ADD_NOTIFICATION",
          payload: {
            id: `notif_${Date.now()}`,
            type: "friend_add",
            title: "친구 요청 수락",
            body: `${request.fromNickname}님과 친구가 되었습니다!`,
            createdAt: new Date().toISOString(),
            isRead: false,
          },
        });
        Alert.alert("수락 완료", `${request.fromNickname}님과 친구가 되었습니다!`);
        loadRequests();
      } else {
        Alert.alert("오류", result?.message || "요청을 수락할 수 없습니다.");
      }
    } catch (e: any) {
      if (e.name === "AbortError") {
        Alert.alert("시간 초과", "서버 응답이 없습니다.");
      } else {
        Alert.alert("오류", "요청 수락에 실패했습니다.");
      }
    }
  };

  // 친구 요청 거절
  const handleRejectRequest = async (request: FriendRequestItem) => {
    haptic();
    Alert.alert(
      "친구 요청 거절",
      `${request.fromNickname}님의 요청을 거절하시겠습니까?`,
      [
        { text: "취소", style: "cancel" },
        {
          text: "거절",
          style: "destructive",
          onPress: async () => {
            try {
              await apiCall("friends.rejectRequest", { requestId: request.id });
              Alert.alert("거절 완료", "친구 요청을 거절했습니다.");
              loadRequests();
            } catch (_) {
              Alert.alert("오류", "요청 거절에 실패했습니다.");
            }
          },
        },
      ]
    );
  };

  // 친구 삭제
  const handleRemoveFriend = (friendId: string) => {
    haptic();
    Alert.alert("친구 삭제", "정말 이 친구를 삭제하시겠어요?", [
      { text: "취소", style: "cancel" },
      {
        text: "삭제",
        style: "destructive",
        onPress: () => dispatch({ type: "REMOVE_FRIEND", payload: friendId }),
      },
    ]);
  };

  // 채팅 시작
  const handleStartChat = (friend: Friend) => {
    haptic();
    const roomId = `friend_${friend.id}`;
    router.push(
      `/chat/${roomId}?friendName=${encodeURIComponent(friend.nickname)}&friendEmoji=${encodeURIComponent(friend.profileEmoji)}` as never
    );
  };

  // 탭 렌더링
  const renderTabs = () => (
    <View style={[styles.tabBar, { borderBottomColor: "#E8E8E8" }]}>
      {([
        { key: "friends" as TabType, label: `친구 ${friends.length}`, badgeCount: 0 },
        { key: "received" as TabType, label: `받은 요청`, badgeCount: receivedRequests.length },
        { key: "sent" as TabType, label: `보낸 요청`, badgeCount: sentRequests.filter(r => r.status === "pending").length },
      ]).map((tab) => (
        <Pressable
          key={tab.key}
          onPress={() => { haptic(); setActiveTab(tab.key); }}
          style={({ pressed }) => [
            styles.tab,
            activeTab === tab.key && { borderBottomColor: "#FF6B35", borderBottomWidth: 2 },
            pressed && { opacity: 0.7 },
          ]}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Text
              style={[
                styles.tabText,
                { color: activeTab === tab.key ? "#FF6B35" : "#8E8E93" },
                activeTab === tab.key && { fontWeight: "700" },
              ]}
            >
              {tab.label}
            </Text>
            {tab.badgeCount > 0 && (
              <View style={styles.tabBadge}>
                <Text style={styles.tabBadgeText}>{tab.badgeCount}</Text>
              </View>
            )}
          </View>
        </Pressable>
      ))}
    </View>
  );

  // 친구 카드
  const renderFriend = ({ item }: { item: Friend }) => (
    <View style={[styles.friendCard, { backgroundColor: "#F8F8F8", borderColor: "#E8E8E8" }]}>
      <Text style={styles.friendEmoji}>{item.profileEmoji}</Text>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Text style={[styles.friendName, { color: "#1A1A1A" }]}>{item.nickname}</Text>
          {item.serverUserId ? (
            <View style={[styles.badge, { backgroundColor: "#E8F5E9" }]}>
              <Text style={[styles.badgeText, { color: "#2E7D32" }]}>🌐</Text>
            </View>
          ) : null}
        </View>
        <Text style={[styles.friendInfo, { color: "#8E8E93" }]}>
          📍 {item.neighborhood} · {item.role === "owner" ? "🐶 반려인" : "🏠 돌보미"}
        </Text>
      </View>
      <Pressable
        onPress={() => handleStartChat(item)}
        style={({ pressed }) => [styles.chatBtn, pressed && { opacity: 0.85 }]}
      >
        <Text style={styles.chatBtnText}>💬</Text>
      </Pressable>
      <Pressable
        onPress={() => handleRemoveFriend(item.id)}
        style={({ pressed }) => [styles.removeBtn, pressed && { opacity: 0.7 }]}
      >
        <Text style={styles.removeBtnText}>삭제</Text>
      </Pressable>
    </View>
  );

  // 받은 요청 카드
  const renderReceivedRequest = ({ item }: { item: FriendRequestItem }) => (
    <View style={[styles.friendCard, { backgroundColor: "#F8F8F8", borderColor: "#E8E8E8" }]}>
      <Text style={styles.friendEmoji}>{item.fromEmoji || "🐶"}</Text>
      <View style={{ flex: 1 }}>
        <Text style={[styles.friendName, { color: "#1A1A1A" }]}>{item.fromNickname}</Text>
        <Text style={[styles.friendInfo, { color: "#8E8E93" }]}>
          📍 {item.fromNeighborhood || "대전"} · {item.fromRole === "owner" ? "🐶 반려인" : "🏠 돌보미"}
        </Text>
      </View>
      <Pressable
        onPress={() => handleAcceptRequest(item)}
        style={({ pressed }) => [styles.acceptBtn, pressed && { opacity: 0.85 }]}
      >
        <Text style={styles.acceptBtnText}>수락</Text>
      </Pressable>
      <Pressable
        onPress={() => handleRejectRequest(item)}
        style={({ pressed }) => [styles.rejectBtn, pressed && { opacity: 0.7 }]}
      >
        <Text style={styles.rejectBtnText}>거절</Text>
      </Pressable>
    </View>
  );

  // 보낸 요청 카드
  const renderSentRequest = ({ item }: { item: FriendRequestItem }) => {
    const statusLabel = item.status === "pending" ? "대기 중" : item.status === "accepted" ? "수락됨" : "거절됨";
    const statusColor = item.status === "pending" ? "#FF9500" : item.status === "accepted" ? "#34C759" : "#FF3B30";
    const displayName = item.toNickname || `코드: ${item.fromCode}`;
    const displayEmoji = item.toEmoji || "📤";
    return (
      <View style={[styles.friendCard, { backgroundColor: "#F8F8F8", borderColor: "#E8E8E8" }]}>
        <Text style={styles.friendEmoji}>{displayEmoji}</Text>
        <View style={{ flex: 1 }}>
          <Text style={[styles.friendName, { color: "#1A1A1A" }]}>{displayName}</Text>
          <Text style={[styles.friendInfo, { color: "#8E8E93" }]}>
            {new Date(item.createdAt).toLocaleDateString("ko-KR")}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusColor + "20" }]}>
          <Text style={[styles.statusBadgeText, { color: statusColor }]}>{statusLabel}</Text>
        </View>
      </View>
    );
  };

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      {/* 헤더 */}
      <View style={[styles.header, { borderBottomColor: "#E8E8E8" }]}>
        <Pressable
          onPress={() => { haptic(); router.back(); }}
          style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.7 }]}
        >
          <Text style={[styles.backBtnText, { color: "#FF6B35" }]}>‹</Text>
        </Pressable>
        <Text style={[styles.headerTitle, { color: "#1A1A1A" }]}>친구</Text>
        <Pressable
          onPress={() => { haptic(); setShowCodeInput(!showCodeInput); }}
          style={({ pressed }) => [styles.addBtn, pressed && { opacity: 0.7 }]}
        >
          <Text style={[styles.addBtnText, { color: "#FF6B35" }]}>+ 추가</Text>
        </Pressable>
      </View>

      {/* 내 친구 코드 */}
      <View style={[styles.myCodeCard, { backgroundColor: "#F8F8F8", borderColor: "#E8E8E8" }]}>
        <View style={styles.myCodeHeader}>
          <Text style={[styles.myCodeLabel, { color: "#1A1A1A" }]}>내 친구 코드</Text>
          {serverRegistered && (
            <View style={styles.serverBadge}>
              <Text style={styles.serverBadgeText}>🌐 서버 등록됨</Text>
            </View>
          )}
        </View>
        <View style={styles.myCodeRow}>
          <Text style={[styles.myCodeText, { color: "#FF6B35" }]}>{myCode}</Text>
          <Pressable
            onPress={handleCopyCode}
            style={({ pressed }) => [
              styles.copyBtn,
              copyFeedback && { backgroundColor: "#4CAF82" },
              pressed && { opacity: 0.7 },
            ]}
          >
            <Text style={styles.copyBtnText}>{copyFeedback ? "✓ 복사됨" : "복사"}</Text>
          </Pressable>
        </View>
        <View style={styles.shareRow}>
          <Pressable
            onPress={handleShareCode}
            style={({ pressed }) => [styles.shareBtn, pressed && { opacity: 0.7 }]}
          >
            <Text style={styles.shareBtnText}>📤 링크로 공유하기</Text>
          </Pressable>
        </View>
        <Text style={[styles.myCodeHint, { color: "#8E8E93" }]}>
          이 코드를 친구에게 공유하면 서로 친구 추가할 수 있어요!
        </Text>
      </View>

      {/* 친구 코드 입력 */}
      {showCodeInput && (
        <View style={[styles.codeInputCard, { backgroundColor: "#F8F8F8", borderColor: "#E8E8E8" }]}>
          <Text style={[styles.codeInputTitle, { color: "#1A1A1A" }]}>친구 코드 입력</Text>
          <View style={styles.codeInputRow}>
            <TextInput
              style={[styles.codeInput, { backgroundColor: "#FFFFFF", color: "#1A1A1A", borderColor: "#E8E8E8" }]}
              placeholder="예: ABCD-1234"
              placeholderTextColor={"#8E8E93"}
              value={friendCode}
              onChangeText={(t) => { setFriendCode(t); setSearchResult(null); setSearchError(""); }}
              autoCapitalize="characters"
              maxLength={9}
              returnKeyType="search"
              onSubmitEditing={handleSearch}
            />
            <Pressable
              onPress={handlePasteCode}
              style={({ pressed }) => [styles.pasteBtn, { borderColor: "#E8E8E8" }, pressed && { opacity: 0.7 }]}
            >
              <Text style={[styles.pasteBtnText, { color: "#FF6B35" }]}>붙여넣기</Text>
            </Pressable>
            <Pressable
              onPress={handleSearch}
              disabled={isSearching}
              style={({ pressed }) => [styles.searchBtn, pressed && { opacity: 0.85 }]}
            >
              {isSearching ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.searchBtnText}>검색</Text>
              )}
            </Pressable>
          </View>

          {searchError ? <Text style={styles.errorText}>{searchError}</Text> : null}

          {searchResult && (
            <View style={[styles.searchResultCard, { backgroundColor: "#FFFFFF", borderColor: "#E8E8E8" }]}>
              <Text style={styles.resultEmoji}>{searchResult.emoji}</Text>
              <View style={{ flex: 1 }}>
                <View style={styles.resultNameRow}>
                  <Text style={[styles.resultName, { color: "#1A1A1A" }]}>{searchResult.nickname}</Text>
                  {searchResult.isServerUser && (
                    <View style={styles.realUserBadge}>
                      <Text style={styles.realUserBadgeText}>실제 사용자</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.resultInfo, { color: "#8E8E93" }]}>
                  📍 {searchResult.neighborhood} · {searchResult.role === "owner" ? "🐶 반려인" : "🏠 돌보미"}
                </Text>
              </View>
              <Pressable
                onPress={handleAddFriend}
                disabled={isSendingRequest}
                style={({ pressed }) => [styles.addFriendBtn, pressed && { opacity: 0.85 }]}
              >
                {isSendingRequest ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.addFriendBtnText}>
                    {searchResult.isServerUser ? "요청" : "추가"}
                  </Text>
                )}
              </Pressable>
            </View>
          )}

          <Text style={[styles.demoHint, { color: "#8E8E93" }]}>
            {serverRegistered
              ? "상대방의 친구 코드를 입력하면 서버에서 검색합니다.\n서버 사용자에게는 친구 요청을 보내고, 수락 후 친구가 됩니다."
              : "체험용 코드: ABCD-1234, EFGH-5678, JKLM-9012"}
          </Text>
        </View>
      )}

      {/* 탭 */}
      {renderTabs()}

      {/* 탭 내용 */}
      {activeTab === "friends" && (
        <FlatList
          data={friends}
          renderItem={renderFriend}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>👋</Text>
              <Text style={[styles.emptyText, { color: "#8E8E93" }]}>
                아직 친구가 없어요{"\n"}위의 + 추가 버튼으로 친구를 추가해보세요!
              </Text>
            </View>
          }
        />
      )}

      {activeTab === "received" && (
        <FlatList
          data={receivedRequests}
          renderItem={renderReceivedRequest}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListHeaderComponent={
            isLoadingRequests ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#FF6B35" />
                <Text style={[styles.loadingText, { color: "#8E8E93" }]}>요청 불러오는 중...</Text>
              </View>
            ) : null
          }
          ListEmptyComponent={
            !isLoadingRequests ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyEmoji}>📭</Text>
                <Text style={[styles.emptyText, { color: "#8E8E93" }]}>
                  받은 친구 요청이 없어요{"\n"}친구 코드를 공유해서 요청을 받아보세요!
                </Text>
              </View>
            ) : null
          }
        />
      )}

      {activeTab === "sent" && (
        <FlatList
          data={sentRequests}
          renderItem={renderSentRequest}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>📬</Text>
              <Text style={[styles.emptyText, { color: "#8E8E93" }]}>
                보낸 친구 요청이 없어요
              </Text>
            </View>
          }
        />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  backBtn: { padding: 4 },
  backBtnText: { fontSize: 28, fontWeight: "300" },
  headerTitle: { fontSize: 18, fontWeight: "700" },
  addBtn: { padding: 4 },
  addBtnText: { fontSize: 15, fontWeight: "600" },
  myCodeCard: {
    margin: 16,
    marginBottom: 8,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  myCodeHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  myCodeLabel: { fontSize: 14, fontWeight: "600" },
  serverBadge: {
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  serverBadgeText: { fontSize: 11, color: "#2E7D32" },
  myCodeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  myCodeText: { fontSize: 24, fontWeight: "800", letterSpacing: 2 },
  copyBtn: {
    backgroundColor: "#0a7ea4",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  copyBtnText: { color: "#FFFFFF", fontSize: 13, fontWeight: "600" },
  shareRow: { marginBottom: 4 },
  shareBtn: {
    backgroundColor: "#F0F4FF",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  shareBtnText: { fontSize: 13, color: "#3B82F6" },
  myCodeHint: { fontSize: 12, marginTop: 4 },
  codeInputCard: {
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  codeInputTitle: { fontSize: 15, fontWeight: "700", marginBottom: 10 },
  codeInputRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  codeInput: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 1,
  },
  pasteBtn: {
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  pasteBtnText: { fontSize: 12, fontWeight: "600" },
  searchBtn: {
    backgroundColor: "#0a7ea4",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    minWidth: 56,
    alignItems: "center",
  },
  searchBtnText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
  errorText: { color: "#EF4444", fontSize: 13, marginTop: 8, textAlign: "center" },
  searchResultCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 12,
    gap: 10,
  },
  resultEmoji: { fontSize: 32 },
  resultNameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  resultName: { fontSize: 15, fontWeight: "700" },
  realUserBadge: {
    backgroundColor: "#E3F2FD",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  realUserBadgeText: { fontSize: 10, color: "#1565C0", fontWeight: "600" },
  resultInfo: { fontSize: 12, marginTop: 2 },
  addFriendBtn: {
    backgroundColor: "#0a7ea4",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    minWidth: 56,
    alignItems: "center",
  },
  addFriendBtnText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
  demoHint: { fontSize: 11, marginTop: 10, textAlign: "center", lineHeight: 16 },
  tabBar: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    marginHorizontal: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabText: { fontSize: 13, fontWeight: "500" },
  listContent: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 100 },
  friendCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
    gap: 10,
  },
  friendEmoji: { fontSize: 32 },
  friendName: { fontSize: 15, fontWeight: "700" },
  friendInfo: { fontSize: 12, marginTop: 2 },
  badge: { paddingHorizontal: 4, paddingVertical: 1, borderRadius: 4 },
  badgeText: { fontSize: 10 },
  chatBtn: {
    backgroundColor: "#E3F2FD",
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  chatBtnText: { fontSize: 18 },
  removeBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  removeBtnText: { fontSize: 12, color: "#EF4444", fontWeight: "600" },
  acceptBtn: {
    backgroundColor: "#4CAF50",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  acceptBtnText: { color: "#FFFFFF", fontSize: 13, fontWeight: "700" },
  rejectBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
  },
  rejectBtnText: { fontSize: 12, color: "#EF4444", fontWeight: "600" },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusBadgeText: { fontSize: 12, fontWeight: "600" },
  emptyContainer: { alignItems: "center", paddingTop: 40, gap: 12 },
  emptyEmoji: { fontSize: 48 },
  emptyText: { fontSize: 14, textAlign: "center", lineHeight: 20 },
  loadingContainer: { flexDirection: "row", alignItems: "center", justifyContent: "center", padding: 16, gap: 8 },
  loadingText: { fontSize: 13 },
  tabBadge: {
    backgroundColor: "#EF4444",
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingHorizontal: 4,
  },
  tabBadgeText: { color: "#FFFFFF", fontSize: 10, fontWeight: "700" as const },
});
