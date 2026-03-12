import React, { useState } from "react";
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
} from "react-native";
import * as Clipboard from "expo-clipboard";
import { ScreenContainer } from "@/components/screen-container";
import { useApp, Friend } from "@/lib/app-context";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";

function haptic() {
  if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

const MOCK_FRIEND_CODES: Record<string, { nickname: string; emoji: string; neighborhood: string; role: "owner" | "caretaker" }> = {
  "ABCD-1234": { nickname: "강아지사랑 민지", emoji: "👩", neighborhood: "유성구", role: "caretaker" },
  "EFGH-5678": { nickname: "골든리트리버 맘", emoji: "👩", neighborhood: "유성구", role: "owner" },
  "JKLM-9012": { nickname: "산책왕 준혁", emoji: "👨", neighborhood: "둔산", role: "caretaker" },
  "NPQR-3456": { nickname: "말티즈 아빠", emoji: "👨", neighborhood: "둔산", role: "owner" },
  "STUV-7890": { nickname: "펫케어 수빈", emoji: "👩‍🎓", neighborhood: "관평", role: "caretaker" },
};

export default function FriendsScreen() {
  const router = useRouter();
  const { state, dispatch } = useApp();
  const [friendCode, setFriendCode] = useState("");
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [searchResult, setSearchResult] = useState<{ nickname: string; emoji: string; neighborhood: string; role: "owner" | "caretaker" } | null>(null);
  const [searchError, setSearchError] = useState("");
  const [copyFeedback, setCopyFeedback] = useState(false);

  const myCode = state.profile.friendCode;
  const friends = state.profile.friends;

  const handleSearch = () => {
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

    const found = MOCK_FRIEND_CODES[code];
    if (found) {
      setSearchResult(found);
    } else {
      setSearchError("해당 코드의 사용자를 찾을 수 없어요");
    }
  };

  const handleAddFriend = () => {
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
      nickname: searchResult.nickname,
      profileEmoji: searchResult.emoji,
      neighborhood: searchResult.neighborhood,
      role: searchResult.role,
      addedAt: new Date().toISOString(),
    };

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
      // 폴백: web에서 navigator.clipboard 사용
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
      // 폴백
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
    // 친구 ID 기반으로 고유한 채팅방 ID 생성 (일관성 보장)
    const roomId = `friend_${friend.id}`;
    router.push(`/chat/${roomId}?friendName=${encodeURIComponent(friend.nickname)}&friendEmoji=${encodeURIComponent(friend.profileEmoji)}` as never);
  };

  const renderFriend = ({ item }: { item: Friend }) => (
    <View style={styles.friendCard}>
      <Text style={styles.friendEmoji}>{item.profileEmoji}</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.friendName}>{item.nickname}</Text>
        <Text style={styles.friendInfo}>
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

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      {/* 헤더 */}
      <View style={styles.header}>
        <Pressable
          onPress={() => { haptic(); router.back(); }}
          style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.7 }]}
        >
          <Text style={styles.backBtnText}>‹</Text>
        </Pressable>
        <Text style={styles.headerTitle}>친구</Text>
        <Pressable
          onPress={() => { haptic(); setShowCodeInput(!showCodeInput); }}
          style={({ pressed }) => [styles.addBtn, pressed && { opacity: 0.7 }]}
        >
          <Text style={styles.addBtnText}>+ 추가</Text>
        </Pressable>
      </View>

      {/* 내 친구 코드 */}
      <View style={styles.myCodeCard}>
        <Text style={styles.myCodeLabel}>내 친구 코드</Text>
        <View style={styles.myCodeRow}>
          <Text style={styles.myCodeText}>{myCode}</Text>
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
        <Text style={styles.myCodeHint}>코드를 복사하거나 링크로 공유하세요!</Text>
      </View>

      {/* 친구 코드 입력 */}
      {showCodeInput && (
        <View style={styles.codeInputCard}>
          <Text style={styles.codeInputTitle}>친구 코드 입력</Text>
          <View style={styles.codeInputRow}>
            <TextInput
              style={styles.codeInput}
              placeholder="예: ABCD-1234"
              placeholderTextColor="#BDBDBD"
              value={friendCode}
              onChangeText={setFriendCode}
              autoCapitalize="characters"
              maxLength={9}
              returnKeyType="search"
              onSubmitEditing={handleSearch}
            />
            <Pressable
              onPress={handlePasteCode}
              style={({ pressed }) => [styles.pasteBtn, pressed && { opacity: 0.7 }]}
            >
              <Text style={styles.pasteBtnText}>붙여넣기</Text>
            </Pressable>
            <Pressable
              onPress={handleSearch}
              style={({ pressed }) => [styles.searchBtn, pressed && { opacity: 0.85 }]}
            >
              <Text style={styles.searchBtnText}>검색</Text>
            </Pressable>
          </View>

          {searchError ? (
            <Text style={styles.errorText}>{searchError}</Text>
          ) : null}

          {searchResult && (
            <View style={styles.searchResultCard}>
              <Text style={styles.resultEmoji}>{searchResult.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.resultName}>{searchResult.nickname}</Text>
                <Text style={styles.resultInfo}>
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

          <Text style={styles.demoHint}>
            체험용 코드: ABCD-1234, EFGH-5678, JKLM-9012
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
          <Text style={styles.friendListTitle}>
            친구 {friends.length}명
          </Text>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>👥</Text>
            <Text style={styles.emptyText}>아직 친구가 없어요</Text>
            <Text style={styles.emptySubText}>친구 코드를 입력해서 추가해보세요!</Text>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  backBtnText: { fontSize: 28, color: "#1A1A1A" },
  headerTitle: { flex: 1, textAlign: "center", fontSize: 17, fontWeight: "700", color: "#1A1A1A" },
  addBtn: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: "#FF7043", borderRadius: 8 },
  addBtnText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  myCodeCard: {
    margin: 16,
    backgroundColor: "#FFF3EE",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#FFE0D0",
  },
  myCodeLabel: { fontSize: 13, color: "#FF7043", fontWeight: "600" },
  myCodeRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  myCodeText: { fontSize: 28, fontWeight: "800", color: "#1A1A1A", letterSpacing: 2 },
  copyBtn: { backgroundColor: "#FF7043", borderRadius: 8, paddingHorizontal: 14, paddingVertical: 6 },
  copyBtnText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  shareRow: { marginTop: 4 },
  shareBtn: {
    backgroundColor: "#fff",
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#FFCCBC",
  },
  shareBtnText: { fontSize: 13, color: "#FF7043", fontWeight: "600" },
  myCodeHint: { fontSize: 12, color: "#9E9E9E" },
  codeInputCard: {
    marginHorizontal: 16,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#F0F0F0",
    gap: 12,
  },
  codeInputTitle: { fontSize: 15, fontWeight: "700", color: "#1A1A1A" },
  codeInputRow: { flexDirection: "row", gap: 8 },
  codeInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 16,
    color: "#1A1A1A",
    letterSpacing: 1,
  },
  pasteBtn: {
    backgroundColor: "#F5F5F5",
    borderRadius: 10,
    paddingHorizontal: 12,
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  pasteBtnText: { fontSize: 12, color: "#555", fontWeight: "600" },
  searchBtn: { backgroundColor: "#FF7043", borderRadius: 10, paddingHorizontal: 16, justifyContent: "center" },
  searchBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  errorText: { fontSize: 13, color: "#EF5350" },
  searchResultCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#F0FFF4",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#C8E6C9",
  },
  resultEmoji: { fontSize: 32 },
  resultName: { fontSize: 14, fontWeight: "700", color: "#1A1A1A" },
  resultInfo: { fontSize: 12, color: "#757575", marginTop: 2 },
  addFriendBtn: { backgroundColor: "#4CAF82", borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  addFriendBtnText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  demoHint: { fontSize: 11, color: "#BDBDBD", textAlign: "center" },
  friendList: { padding: 16, gap: 10, paddingBottom: 40 },
  friendListTitle: { fontSize: 15, fontWeight: "700", color: "#1A1A1A", marginBottom: 8 },
  friendCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#F0F0F0",
  },
  friendEmoji: { fontSize: 36 },
  friendName: { fontSize: 15, fontWeight: "700", color: "#1A1A1A" },
  friendInfo: { fontSize: 12, color: "#757575", marginTop: 2 },
  chatBtn: { paddingHorizontal: 10, paddingVertical: 6, backgroundColor: "#FF704320", borderRadius: 8, marginRight: 4 },
  chatBtnText: { fontSize: 16 },
  removeBtn: { paddingHorizontal: 10, paddingVertical: 6, backgroundColor: "#FFF3EE", borderRadius: 8 },
  removeBtnText: { fontSize: 12, color: "#EF5350", fontWeight: "600" },
  emptyContainer: { alignItems: "center", paddingVertical: 60, gap: 8 },
  emptyEmoji: { fontSize: 48 },
  emptyText: { fontSize: 16, fontWeight: "600", color: "#555" },
  emptySubText: { fontSize: 13, color: "#9E9E9E" },
});
