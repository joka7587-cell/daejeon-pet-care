import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  StyleSheet,
  Platform,
  Alert,
  Share,
  ActivityIndicator,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import { ScreenContainer } from "@/components/screen-container";
import { useApp, Friend } from "@/lib/app-context";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { trpc } from "@/lib/trpc";
import { useColors } from "@/hooks/use-colors";

function haptic() {
  if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

// 로컬 데모 코드 (서버 연결 실패 시 폴백)
const MOCK_FRIEND_CODES: Record<string, { nickname: string; emoji: string; neighborhood: string; role: "owner" | "caretaker" }> = {
  "ABCD-1234": { nickname: "강아지사랑 민지", emoji: "👩", neighborhood: "유성구", role: "caretaker" },
  "EFGH-5678": { nickname: "골든리트리버 맘", emoji: "👩", neighborhood: "유성구", role: "owner" },
  "JKLM-9012": { nickname: "산책왕 준혁", emoji: "👨", neighborhood: "둔산", role: "caretaker" },
  "NPQR-3456": { nickname: "말티즈 아빠", emoji: "👨", neighborhood: "둔산", role: "owner" },
  "STUV-7890": { nickname: "펫케어 수빈", emoji: "👩‍🎓", neighborhood: "관평", role: "caretaker" },
};

// 기기 고유 ID 생성 (AsyncStorage에 저장)
import AsyncStorage from "@react-native-async-storage/async-storage";

async function getDeviceId(): Promise<string> {
  const key = "@petcare_device_id";
  let id = await AsyncStorage.getItem(key);
  if (!id) {
    id = `device_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    await AsyncStorage.setItem(key, id);
  }
  return id;
}

export default function FriendsScreen() {
  const router = useRouter();
  const { state, dispatch } = useApp();
  const colors = useColors();
  const [friendCode, setFriendCode] = useState("");
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [searchResult, setSearchResult] = useState<{
    userId?: number;
    nickname: string;
    emoji: string;
    neighborhood: string;
    role: "owner" | "caretaker";
    isServerUser: boolean;
  } | null>(null);
  const [searchError, setSearchError] = useState("");
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [serverRegistered, setServerRegistered] = useState(false);

  const myCode = state.profile.friendCode;
  const friends = state.profile.friends;

  // 서버에 내 친구 코드 등록 (앱 시작 시)
  const registerMyCode = useCallback(async () => {
    if (!state.profile.nickname || !state.profile.role || isRegistering) return;
    setIsRegistering(true);
    try {
      const deviceId = await getDeviceId();
      const response = await fetch(getApiUrl("/api/trpc/friends.registerCode"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          json: {
            deviceId,
            code: myCode,
            nickname: state.profile.nickname,
            profileEmoji: state.profile.avatarEmoji || "🐶",
            neighborhood: state.profile.neighborhood || "",
            role: state.profile.role,
          },
        }),
      });
      if (response.ok) {
        setServerRegistered(true);
      }
    } catch (_) {
      // 서버 연결 실패 - 로컬 모드로 동작
    } finally {
      setIsRegistering(false);
    }
  }, [state.profile.nickname, state.profile.role, myCode, state.profile.avatarEmoji, state.profile.neighborhood, isRegistering]);

  useEffect(() => {
    if (state.profile.nickname && state.profile.role) {
      registerMyCode();
    }
  }, [state.profile.nickname, state.profile.role]);

  // API base URL 가져오기
  function getApiUrl(path: string): string {
    // 서버 API URL
    if (Platform.OS === "web") {
      return path;
    }
    // 네이티브에서는 절대 URL 필요
    const Constants = require("expo-constants").default;
    const expoUrl = Constants.expoConfig?.hostUri?.split(":").shift() || "localhost";
    return `http://${expoUrl}:3000${path}`;
  }

  const handleSearch = async () => {
    haptic();
    const code = friendCode.trim().toUpperCase();
    setSearchError("");
    setSearchResult(null);

    if (!code) {
      setSearchError("친구 코드를 입력해주세요");
      return;
    }

    if (code === myCode) {
      setSearchError("자신의 코드는 입력할 수 없어요");
      return;
    }

    setIsSearching(true);

    // 1. 서버에서 검색 시도
    try {
      const response = await fetch(getApiUrl(`/api/trpc/friends.searchByCode?input=${encodeURIComponent(JSON.stringify({ json: { code } }))}`));
      if (response.ok) {
        const data = await response.json();
        const result = data?.result?.data?.json;
        if (result) {
          setSearchResult({
            userId: result.userId,
            nickname: result.nickname,
            emoji: result.profileEmoji || "🐶",
            neighborhood: result.neighborhood || "대전",
            role: result.role,
            isServerUser: true,
          });
          setIsSearching(false);
          return;
        }
      }
    } catch (_) {
      // 서버 연결 실패 - 로컬 폴백
    }

    // 2. 로컬 데모 코드에서 검색
    const found = MOCK_FRIEND_CODES[code];
    if (found) {
      setSearchResult({
        nickname: found.nickname,
        emoji: found.emoji,
        neighborhood: found.neighborhood,
        role: found.role,
        isServerUser: false,
      });
    } else {
      setSearchError("해당 코드의 사용자를 찾을 수 없어요.\n코드를 다시 확인해주세요.");
    }

    setIsSearching(false);
  };

  const handleAddFriend = async () => {
    if (!searchResult) return;
    haptic();

    const alreadyFriend = friends.some((f) => f.nickname === searchResult.nickname);
    if (alreadyFriend) {
      if (Platform.OS === "web") {
        alert("이미 친구로 추가된 사용자입니다!");
      } else {
        Alert.alert("알림", "이미 친구로 추가된 사용자입니다!");
      }
      return;
    }

    const newFriend: Friend = {
      id: `f_${Date.now()}`,
      serverUserId: searchResult.userId,
      nickname: searchResult.nickname,
      profileEmoji: searchResult.emoji,
      neighborhood: searchResult.neighborhood,
      role: searchResult.role,
      addedAt: new Date().toISOString(),
    };

    // 서버에도 친구 추가 (서버 사용자인 경우)
    if (searchResult.isServerUser && searchResult.userId) {
      try {
        const deviceId = await getDeviceId();
        await fetch(getApiUrl("/api/trpc/friends.addFriend"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            json: {
              deviceId,
              friendUserId: searchResult.userId,
              friendNickname: searchResult.nickname,
              friendEmoji: searchResult.emoji,
              friendNeighborhood: searchResult.neighborhood,
              friendRole: searchResult.role,
            },
          }),
        });
      } catch (_) {
        // 서버 저장 실패해도 로컬에는 저장
      }
    }

    dispatch({ type: "ADD_FRIEND", payload: newFriend });

    // 친구 추가 알림
    dispatch({
      type: "ADD_NOTIFICATION",
      payload: {
        id: `notif_${Date.now()}`,
        type: "friend_add",
        title: "새 친구 추가",
        body: `${searchResult.nickname}님을 친구로 추가했어요!`,
        fromNickname: searchResult.nickname,
        fromEmoji: searchResult.emoji,
        isRead: false,
        createdAt: new Date().toISOString(),
      },
    });

    setSearchResult(null);
    setFriendCode("");
    setShowCodeInput(false);

    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const handleRemoveFriend = (friendId: string) => {
    haptic();
    const doRemove = () => {
      dispatch({ type: "REMOVE_FRIEND", payload: friendId });
    };
    if (Platform.OS === "web") {
      if (confirm("이 친구를 삭제하시겠어요?")) doRemove();
    } else {
      Alert.alert("친구 삭제", "이 친구를 삭제하시겠어요?", [
        { text: "취소", style: "cancel" },
        { text: "삭제", style: "destructive", onPress: doRemove },
      ]);
    }
  };

  const handleCopyCode = async () => {
    haptic();
    try {
      await Clipboard.setStringAsync(myCode);
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2000);
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (_) {
      try {
        await navigator.clipboard?.writeText(myCode);
        setCopyFeedback(true);
        setTimeout(() => setCopyFeedback(false), 2000);
      } catch (__) {
        if (Platform.OS === "web") {
          alert(`친구 코드: ${myCode}\n직접 복사해주세요!`);
        }
      }
    }
  };

  const handlePasteCode = async () => {
    haptic();
    try {
      const text = await Clipboard.getStringAsync();
      if (text) {
        setFriendCode(text.trim().toUpperCase());
      }
    } catch (_) {
      try {
        const text = await navigator.clipboard?.readText();
        if (text) setFriendCode(text.trim().toUpperCase());
      } catch (__) {}
    }
  };

  const handleShareCode = async () => {
    haptic();
    try {
      await Share.share({
        message: `반려이음에서 친구 추가해주세요!\n내 친구 코드: ${myCode}\n\n앱에서 친구 > + 추가 > 코드 입력으로 추가할 수 있어요!`,
      });
    } catch (_) {}
  };

  const handleStartChat = (friend: Friend) => {
    haptic();
    const roomId = `friend_${friend.id}`;
    router.push(`/chat/${roomId}?friendName=${encodeURIComponent(friend.nickname)}&friendEmoji=${encodeURIComponent(friend.profileEmoji)}` as never);
  };

  const renderFriend = ({ item }: { item: Friend }) => (
    <View style={[styles.friendCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={styles.friendEmoji}>{item.profileEmoji}</Text>
      <View style={{ flex: 1 }}>
        <Text style={[styles.friendName, { color: colors.foreground }]}>{item.nickname}</Text>
        <Text style={[styles.friendInfo, { color: colors.muted }]}>
          📍 {item.neighborhood} · {item.role === "owner" ? "🐶 반려인" : "🏠 돌보미"}
          {item.serverUserId ? " · 🌐" : ""}
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

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      {/* 헤더 */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable
          onPress={() => { haptic(); router.back(); }}
          style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.7 }]}
        >
          <Text style={[styles.backBtnText, { color: colors.primary }]}>‹</Text>
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>친구</Text>
        <Pressable
          onPress={() => { haptic(); setShowCodeInput(!showCodeInput); }}
          style={({ pressed }) => [styles.addBtn, pressed && { opacity: 0.7 }]}
        >
          <Text style={[styles.addBtnText, { color: colors.primary }]}>+ 추가</Text>
        </Pressable>
      </View>

      {/* 내 친구 코드 */}
      <View style={[styles.myCodeCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.myCodeHeader}>
          <Text style={[styles.myCodeLabel, { color: colors.foreground }]}>내 친구 코드</Text>
          {serverRegistered && (
            <View style={styles.serverBadge}>
              <Text style={styles.serverBadgeText}>🌐 서버 등록됨</Text>
            </View>
          )}
        </View>
        <View style={styles.myCodeRow}>
          <Text style={[styles.myCodeText, { color: colors.primary }]}>{myCode}</Text>
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
        <Text style={[styles.myCodeHint, { color: colors.muted }]}>
          이 코드를 친구에게 공유하면 서로 친구 추가할 수 있어요!
        </Text>
      </View>

      {/* 친구 코드 입력 */}
      {showCodeInput && (
        <View style={[styles.codeInputCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.codeInputTitle, { color: colors.foreground }]}>친구 코드 입력</Text>
          <View style={styles.codeInputRow}>
            <TextInput
              style={[styles.codeInput, { backgroundColor: colors.background, color: colors.foreground, borderColor: colors.border }]}
              placeholder="예: ABCD-1234"
              placeholderTextColor={colors.muted}
              value={friendCode}
              onChangeText={setFriendCode}
              autoCapitalize="characters"
              maxLength={9}
              returnKeyType="search"
              onSubmitEditing={handleSearch}
            />
            <Pressable
              onPress={handlePasteCode}
              style={({ pressed }) => [styles.pasteBtn, { borderColor: colors.border }, pressed && { opacity: 0.7 }]}
            >
              <Text style={[styles.pasteBtnText, { color: colors.primary }]}>붙여넣기</Text>
            </Pressable>
            <Pressable
              onPress={handleSearch}
              disabled={isSearching}
              style={({ pressed }) => [styles.searchBtn, pressed && { opacity: 0.85 }]}
            >
              {isSearching ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.searchBtnText}>검색</Text>
              )}
            </Pressable>
          </View>

          {searchError ? (
            <Text style={styles.errorText}>{searchError}</Text>
          ) : null}

          {searchResult && (
            <View style={[styles.searchResultCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <Text style={styles.resultEmoji}>{searchResult.emoji}</Text>
              <View style={{ flex: 1 }}>
                <View style={styles.resultNameRow}>
                  <Text style={[styles.resultName, { color: colors.foreground }]}>{searchResult.nickname}</Text>
                  {searchResult.isServerUser && (
                    <View style={styles.realUserBadge}>
                      <Text style={styles.realUserBadgeText}>실제 사용자</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.resultInfo, { color: colors.muted }]}>
                  📍 {searchResult.neighborhood} · {searchResult.role === "owner" ? "🐶 반려인" : "🏠 돌보미"}
                </Text>
              </View>
              <Pressable
                onPress={handleAddFriend}
                style={({ pressed }) => [styles.addFriendBtn, pressed && { opacity: 0.85 }]}
              >
                <Text style={styles.addFriendBtnText}>추가</Text>
              </Pressable>
            </View>
          )}

          <Text style={[styles.demoHint, { color: colors.muted }]}>
            {serverRegistered
              ? "상대방의 친구 코드를 입력하면 서버에서 검색합니다"
              : "체험용 코드: ABCD-1234, EFGH-5678, JKLM-9012"}
          </Text>
        </View>
      )}

      {/* 친구 목록 */}
      <FlatList
        data={friends}
        renderItem={renderFriend}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.friendList}
        ListHeaderComponent={
          <Text style={[styles.friendListTitle, { color: colors.foreground }]}>
            친구 {friends.length}명
          </Text>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>👋</Text>
            <Text style={[styles.emptyText, { color: colors.muted }]}>
              아직 친구가 없어요{"\n"}위의 + 추가 버튼으로 친구를 추가해보세요!
            </Text>
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
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  backBtn: { padding: 4 },
  backBtnText: { fontSize: 28, fontWeight: "600" },
  headerTitle: { fontSize: 18, fontWeight: "700" },
  addBtn: { padding: 4 },
  addBtnText: { fontSize: 15, fontWeight: "600" },
  myCodeCard: {
    margin: 16,
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
    gap: 8,
    marginBottom: 8,
  },
  myCodeText: { fontSize: 24, fontWeight: "800", letterSpacing: 2 },
  copyBtn: {
    backgroundColor: "#FF8A50",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  copyBtnText: { color: "#fff", fontWeight: "600", fontSize: 13 },
  shareRow: { marginBottom: 6 },
  shareBtn: {
    backgroundColor: "#E3F2FD",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  shareBtnText: { fontSize: 13, color: "#1565C0", fontWeight: "600" },
  myCodeHint: { fontSize: 12, marginTop: 4 },
  codeInputCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  codeInputTitle: { fontSize: 15, fontWeight: "700", marginBottom: 10 },
  codeInputRow: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
  },
  codeInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 1,
  },
  pasteBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  pasteBtnText: { fontSize: 12, fontWeight: "600" },
  searchBtn: {
    backgroundColor: "#FF8A50",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minWidth: 50,
    alignItems: "center",
  },
  searchBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  errorText: { color: "#EF4444", fontSize: 13, marginTop: 8, textAlign: "center" },
  searchResultCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 10,
    gap: 10,
  },
  resultEmoji: { fontSize: 32 },
  resultNameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  resultName: { fontSize: 15, fontWeight: "700" },
  realUserBadge: {
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  realUserBadgeText: { fontSize: 10, color: "#2E7D32", fontWeight: "600" },
  resultInfo: { fontSize: 12, marginTop: 2 },
  addFriendBtn: {
    backgroundColor: "#FF8A50",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  addFriendBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  demoHint: { fontSize: 11, marginTop: 10, textAlign: "center" },
  friendList: { paddingHorizontal: 16, paddingBottom: 40 },
  friendListTitle: { fontSize: 15, fontWeight: "700", marginBottom: 10 },
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
  friendName: { fontSize: 15, fontWeight: "600" },
  friendInfo: { fontSize: 12, marginTop: 2 },
  chatBtn: {
    backgroundColor: "#E3F2FD",
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  chatBtnText: { fontSize: 18 },
  removeBtn: { padding: 6 },
  removeBtnText: { color: "#EF4444", fontSize: 12, fontWeight: "600" },
  emptyContainer: { alignItems: "center", paddingTop: 40 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 14, textAlign: "center", lineHeight: 22 },
});
