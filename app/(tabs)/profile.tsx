import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
} from "react-native";
import { Image } from "expo-image";
import { ScreenContainer } from "@/components/screen-container";
import { useApp, UserRole, Neighborhood, Pet } from "@/lib/app-context";
import { NEIGHBORHOODS } from "@/lib/mock-data";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";
import { useRouter } from "expo-router";
import { useThemeContext } from "@/lib/theme-provider";

const AVATAR_EMOJIS = [
  "🐶", "🐱", "🐰", "🐻", "🦊", "🐼", "🐨", "🦁",
  "🐯", "🐸", "🐵", "🐷", "🐮", "🐔", "🦄", "🐲",
  "🏠", "🌟", "🌈", "🎀", "🎯", "🍀", "🌸", "🦋",
];

function haptic() {
  if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={[styles.sectionCard, { backgroundColor: "#F8F8F8", borderColor: "#E8E8E8" }]}>
      <Text style={[styles.sectionTitle, { color: "#1A1A1A" }]}>{title}</Text>
      {children}
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={[styles.infoLabel, { color: "#8E8E93" }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: "#1A1A1A" }]}>{value}</Text>
    </View>
  );
}

function MenuRow({ emoji, label, badge, onPress }: { emoji: string; label: string; badge?: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.menuRow, { borderBottomColor: "#E8E8E8" }, pressed && { opacity: 0.7 }]}
    >
      <Text style={{ fontSize: 20 }}>{emoji}</Text>
      <Text style={[styles.menuLabel, { color: "#1A1A1A" }]}>{label}</Text>
      <View style={{ flex: 1 }} />
      {badge && (
        <View style={styles.menuBadge}>
          <Text style={styles.menuBadgeText}>{badge}</Text>
        </View>
      )}
      <Text style={[styles.menuArrow, { color: "#8E8E93" }]}>›</Text>
    </Pressable>
  );
}

export default function ProfileScreen() {
  const { state, dispatch, resetApp } = useApp();
  const { profile } = state;
  const router = useRouter();
  const { colorScheme, setColorScheme } = useThemeContext();
  const isCaretaker = profile.role === "caretaker";
  const [showNeighborhoodPicker, setShowNeighborhoodPicker] = useState(false);
  const isDark = colorScheme === "dark";

  // 닉네임 편집 상태
  const [showNicknameModal, setShowNicknameModal] = useState(false);
  const [editNickname, setEditNickname] = useState(profile.nickname || "");

  // 아바타 편집 상태
  const [showAvatarModal, setShowAvatarModal] = useState(false);

  // 현재 아바타 이모지 (profile에 저장된 것 또는 기본값)
  const currentAvatar = (profile as any).avatarEmoji || (isCaretaker ? "🏠" : "🐶");

  const handleToggleDarkMode = () => {
    haptic();
    setColorScheme(isDark ? "light" : "dark");
  };

  const handleRoleSwitch = () => {
    haptic();
    const newRole: UserRole = isCaretaker ? "owner" : "caretaker";
    dispatch({ type: "SET_ROLE", payload: newRole });
  };

  const handleNeighborhoodChange = (n: Neighborhood) => {
    haptic();
    dispatch({ type: "SET_NEIGHBORHOOD", payload: n });
    setShowNeighborhoodPicker(false);
  };

  const handleAddPet = () => {
    haptic();
    router.push("/pet/register" as never);
  };

  const handleSaveNickname = () => {
    const trimmed = editNickname.trim();
    if (trimmed.length === 0) {
      if (Platform.OS === "web") {
        alert("닉네임을 입력해주세요.");
      } else {
        Alert.alert("알림", "닉네임을 입력해주세요.");
      }
      return;
    }
    if (trimmed.length > 12) {
      if (Platform.OS === "web") {
        alert("닉네임은 12자 이하로 입력해주세요.");
      } else {
        Alert.alert("알림", "닉네임은 12자 이하로 입력해주세요.");
      }
      return;
    }
    haptic();
    dispatch({ type: "SET_PROFILE", payload: { nickname: trimmed } });
    setShowNicknameModal(false);
  };

  const handleSelectAvatar = (emoji: string) => {
    haptic();
    dispatch({ type: "SET_PROFILE", payload: { avatarEmoji: emoji } as any });
    setShowAvatarModal(false);
  };

  return (
    <ScreenContainer className="pt-2">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        {/* 프로필 헤더 */}
        <View style={[styles.profileHeader, isCaretaker ? styles.profileHeaderGreen : styles.profileHeaderOrange]}>
          {/* 아바타 - 탭하여 변경 */}
          <Pressable
            onPress={() => { haptic(); setShowAvatarModal(true); }}
            style={({ pressed }) => [pressed && { opacity: 0.8, transform: [{ scale: 0.95 }] }]}
          >
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarEmoji}>{currentAvatar}</Text>
            </View>
            <View style={styles.avatarEditBadge}>
              <Text style={{ fontSize: 12 }}>✏️</Text>
            </View>
          </Pressable>

          {/* 닉네임 - 탭하여 변경 */}
          <Pressable
            onPress={() => {
              haptic();
              setEditNickname(profile.nickname || "");
              setShowNicknameModal(true);
            }}
            style={({ pressed }) => [
              styles.nicknameEditRow,
              pressed && { opacity: 0.7 },
            ]}
          >
            <Text style={styles.profileName}>{profile.nickname || "닉네임 미설정"}</Text>
            <Text style={styles.nicknameEditIcon}>✏️</Text>
          </Pressable>

          <View style={[styles.roleBadge, isCaretaker ? styles.roleBadgeGreen : styles.roleBadgeOrange]}>
            <Text style={styles.roleBadgeText}>
              {isCaretaker ? "🏠 돌보미" : "🐶 반려인"}
            </Text>
          </View>
          <Text style={styles.friendCode}>내 코드: {profile.friendCode || "생성중..."}</Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{profile.rating > 0 ? profile.rating.toFixed(1) : "-"}</Text>
              <Text style={styles.statLabel}>평점</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{profile.reviewCount}</Text>
              <Text style={styles.statLabel}>후기</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{profile.friends.length}</Text>
              <Text style={styles.statLabel}>친구</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{profile.pets.length}</Text>
              <Text style={styles.statLabel}>반려동물</Text>
            </View>
          </View>
        </View>

        <View style={{ paddingHorizontal: 16, gap: 16, marginTop: 16 }}>
          {/* 바로가기 메뉴 */}
          <SectionCard title="나의 활동">
            <MenuRow
              emoji="👫"
              label="친구 관리"
              badge={`${profile.friends.length}명`}
              onPress={() => { haptic(); router.push("/friends" as never); }}
             
            />
            <MenuRow
              emoji="⭐"
              label="받은 후기"
              badge={`${profile.reviewCount}건`}
              onPress={() => { haptic(); router.push("/review/list" as never); }}
             
            />
            <MenuRow
              emoji="💳"
              label="결제 내역"
              badge={`${state.payments.length}건`}
              onPress={() => { haptic(); router.push("/payment/history" as never); }}
             
            />
            <MenuRow
              emoji="📋"
              label="요청 현황"
              onPress={() => { haptic(); router.push("/(tabs)/requests" as never); }}
             
            />
            <MenuRow
              emoji="🐾"
              label="산책 기록"
              badge={`${(state.walkSessions || []).filter((s: any) => s.status === "completed").length}회`}
              onPress={() => { haptic(); router.push("/walk/history" as never); }}
             
            />
            <MenuRow
              emoji="📊"
              label="대시보드"
              onPress={() => { haptic(); router.push("/dashboard" as never); }}
             
            />
            {state.profile.role === "caretaker" && (
              <MenuRow
                emoji={state.walkerVerification?.isVerified ? "✅" : "🛡️"}
                label="도그워커 인증"
                badge={state.walkerVerification?.isVerified ? "인증완료" : "미인증"}
                onPress={() => { haptic(); router.push("/verify" as never); }}
               
              />
            )}
          </SectionCard>

          {/* 기본 정보 */}
          <SectionCard title="기본 정보">
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: "#8E8E93" }]}>닉네임</Text>
              <Pressable
                onPress={() => {
                  haptic();
                  setEditNickname(profile.nickname || "");
                  setShowNicknameModal(true);
                }}
                style={({ pressed }) => [styles.editBtn, { backgroundColor: "#FFFFFF" }, pressed && { opacity: 0.7 }]}
              >
                <Text style={styles.editBtnText}>
                  {profile.nickname || "미설정"} ✏️
                </Text>
              </Pressable>
            </View>
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: "#8E8E93" }]}>동네</Text>
              <Pressable
                onPress={() => { haptic(); setShowNeighborhoodPicker(!showNeighborhoodPicker); }}
                style={({ pressed }) => [styles.editBtn, { backgroundColor: "#FFFFFF" }, pressed && { opacity: 0.7 }]}
              >
                <Text style={styles.editBtnText}>
                  📍 {profile.neighborhood || "미설정"} ✏️
                </Text>
              </Pressable>
            </View>

            {showNeighborhoodPicker && (
              <View style={[styles.neighborhoodPicker, { backgroundColor: "#FFFFFF", borderColor: "#E8E8E8" }]}>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  {NEIGHBORHOODS.map((n) => (
                    <Pressable
                      key={n}
                      onPress={() => handleNeighborhoodChange(n as Neighborhood)}
                      style={({ pressed }) => [
                        styles.neighborhoodChip,
                        { borderColor: "#E8E8E8", backgroundColor: "#F8F8F8" },
                        profile.neighborhood === n && styles.neighborhoodChipActive,
                        pressed && { opacity: 0.7 },
                      ]}
                    >
                      <Text style={[
                        styles.neighborhoodChipText,
                        { color: "#8E8E93" },
                        profile.neighborhood === n && styles.neighborhoodChipTextActive,
                      ]}>
                        {n}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}
          </SectionCard>

          {/* 반려동물 (반려인 전용) */}
          {!isCaretaker && (
            <SectionCard title="내 반려동물">
              {profile.pets.length === 0 ? (
                <Text style={[styles.emptyText, { color: "#8E8E93" }]}>등록된 반려동물이 없어요</Text>
              ) : (
                profile.pets.map((pet) => (
                  <Pressable
                    key={pet.id}
                    onPress={() => { haptic(); router.push(`/pet/${pet.id}` as never); }}
                    style={({ pressed }) => [styles.petCard, { backgroundColor: "#FFFFFF" }, pressed && { opacity: 0.8 }]}
                  >
                    {pet.photoUri ? (
                      <Image
                        source={{ uri: pet.photoUri }}
                        style={styles.petPhotoThumb}
                        contentFit="cover"
                        transition={200}
                      />
                    ) : (
                      <View style={[styles.petEmojiContainer, { backgroundColor: isDark ? "#2C2C2C" : "#FFF3EE" }]}>
                        <Text style={{ fontSize: 28 }}>{pet.emoji}</Text>
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.petName, { color: "#1A1A1A" }]}>{pet.name}</Text>
                      <Text style={[styles.petInfo, { color: "#8E8E93" }]}>{pet.breed} · {pet.age}살 · {pet.size}</Text>
                    </View>
                    <Text style={{ fontSize: 16, color: "#8E8E93" }}>›</Text>
                  </Pressable>
                ))
              )}
              <Pressable
                onPress={handleAddPet}
                style={({ pressed }) => [styles.addPetBtn, pressed && { opacity: 0.7 }]}
              >
                <Text style={styles.addPetBtnText}>+ 반려동물 추가</Text>
              </Pressable>
            </SectionCard>
          )}

          {/* 돌보미 서비스 (돌보미 전용) */}
          {isCaretaker && (
            <SectionCard title="제공 서비스">
              <View style={styles.serviceList}>
                <View style={[styles.serviceItem, { backgroundColor: "#FFFFFF" }]}>
                  <Text style={styles.serviceEmoji}>🚨</Text>
                  <Text style={[styles.serviceText, { color: "#1A1A1A" }]}>긴급 방문 돌봄</Text>
                  <View style={styles.serviceAvailBadge}>
                    <Text style={styles.serviceAvailText}>제공 가능</Text>
                  </View>
                </View>
                <View style={[styles.serviceItem, { backgroundColor: "#FFFFFF" }]}>
                  <Text style={styles.serviceEmoji}>🦮</Text>
                  <Text style={[styles.serviceText, { color: "#1A1A1A" }]}>대신 산책</Text>
                  <View style={styles.serviceAvailBadge}>
                    <Text style={styles.serviceAvailText}>제공 가능</Text>
                  </View>
                </View>
              </View>
              <View style={styles.caretakerNote}>
                <Text style={styles.caretakerNoteText}>
                  💡 돌보미는 긴급 방문 돌봄과 대신 산책 서비스만 제공할 수 있어요
                </Text>
              </View>
            </SectionCard>
          )}

          {/* 역할 전환 */}
          <SectionCard title="역할 설정">
            <Text style={[styles.roleDesc, { color: "#8E8E93" }]}>
              현재 역할: <Text style={{ fontWeight: "700", color: isCaretaker ? "#4CAF82" : "#FF7043" }}>
                {isCaretaker ? "돌보미" : "반려인"}
              </Text>
            </Text>
            <Text style={[styles.roleSubDesc, { color: "#8E8E93" }]}>
              {isCaretaker
                ? "반려인으로 전환하면 모든 서비스를 이용할 수 있어요"
                : "돌보미로 전환하면 요청을 받고 서비스를 제공할 수 있어요"}
            </Text>
            <Pressable
              onPress={handleRoleSwitch}
              style={({ pressed }) => [
                styles.roleSwitchBtn,
                isCaretaker ? styles.roleSwitchBtnOrange : styles.roleSwitchBtnGreen,
                pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
              ]}
            >
              <Text style={styles.roleSwitchBtnText}>
                {isCaretaker ? "🐶 반려인으로 전환" : "🏠 돌보미로 전환"}
              </Text>
            </Pressable>
          </SectionCard>

          {/* 활동 상태 */}
          <SectionCard title="활동 상태">
            <Pressable
              onPress={() => {
                haptic();
                dispatch({ type: "TOGGLE_ONLINE" });
                if (Platform.OS !== "web") {
                  Haptics.notificationAsync(
                    state.profile.isOnline
                      ? Haptics.NotificationFeedbackType.Warning
                      : Haptics.NotificationFeedbackType.Success
                  );
                }
              }}
              style={({ pressed }) => [styles.settingRow, pressed && { opacity: 0.7 }]}
            >
              <View>
                <Text style={[styles.settingText, { color: "#8E8E93" }]}>
                  {state.profile.isOnline ? "🟢 온라인" : "🔴 오프라인"}
                </Text>
                <Text style={{ fontSize: 11, color: "#8E8E93", marginTop: 2 }}>
                  {state.profile.isOnline ? "새 요청과 메시지를 받습니다" : "새 요청을 받지 않습니다"}
                </Text>
              </View>
              <View style={[
                styles.toggleTrack,
                state.profile.isOnline && styles.toggleTrackActive,
              ]}>
                <View style={[
                  styles.toggleThumb,
                  state.profile.isOnline && styles.toggleThumbActive,
                ]} />
              </View>
            </Pressable>
          </SectionCard>

          {/* 앱 설정 */}
          <SectionCard title="앱 설정">
            <Pressable
              onPress={handleToggleDarkMode}
              style={({ pressed }) => [styles.settingRow, pressed && { opacity: 0.7 }]}
            >
              <Text style={[styles.settingText, { color: "#8E8E93" }]}>{isDark ? "🌙 다크 모드" : "☀️ 라이트 모드"}</Text>
              <View style={[
                styles.toggleTrack,
                isDark && styles.toggleTrackActive,
              ]}>
                <View style={[
                  styles.toggleThumb,
                  isDark && styles.toggleThumbActive,
                ]} />
              </View>
            </Pressable>
            <View style={[styles.settingDivider, { backgroundColor: "#E8E8E8" }]} />
            <Pressable
              onPress={() => { haptic(); dispatch({ type: "SET_ONBOARDED", payload: false }); }}
              style={({ pressed }) => [styles.settingRow, pressed && { opacity: 0.7 }]}
            >
              <Text style={[styles.settingText, { color: "#8E8E93" }]}>온보딩 다시 보기</Text>
              <Text style={[styles.settingArrow, { color: "#8E8E93" }]}>›</Text>
            </Pressable>
            <View style={[styles.settingDivider, { backgroundColor: "#E8E8E8" }]} />
            <Pressable
              onPress={() => {
                haptic();
                const doReset = () => {
                  resetApp();
                  if (Platform.OS !== "web") {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  }
                };
                if (Platform.OS === "web") {
                  if (confirm("앱을 초기화하시겠습니까?\n모든 데이터가 삭제되고 온보딩부터 다시 시작합니다.")) {
                    doReset();
                  }
                } else {
                  Alert.alert(
                    "앱 초기화",
                    "모든 데이터가 삭제되고 온보딩부터 다시 시작합니다.\n이 작업은 되돌릴 수 없습니다.",
                    [
                      { text: "취소", style: "cancel" },
                      { text: "초기화", style: "destructive", onPress: doReset },
                    ]
                  );
                }
              }}
              style={({ pressed }) => [styles.resetRow, pressed && { opacity: 0.7 }]}
            >
              <Text style={styles.resetText}>앱 초기화 (데이터 전체 삭제)</Text>
              <Text style={[styles.settingArrow, { color: "#8E8E93" }]}>›</Text>
            </Pressable>
          </SectionCard>
        </View>
      </ScrollView>

      {/* 닉네임 편집 모달 */}
      <Modal
        visible={showNicknameModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowNicknameModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <Pressable style={styles.modalOverlay} onPress={() => setShowNicknameModal(false)}>
            <Pressable style={[styles.modalContent, { backgroundColor: "#F8F8F8" }]} onPress={(e) => e.stopPropagation()}>
              <Text style={[styles.modalTitle, { color: "#1A1A1A" }]}>닉네임 변경</Text>
              <Text style={[styles.modalSubtitle, { color: "#8E8E93" }]}>
                다른 사용자에게 표시되는 이름이에요
              </Text>
              <TextInput
                style={[styles.nicknameInput, { color: "#1A1A1A", borderColor: "#E8E8E8", backgroundColor: "#FFFFFF" }]}
                value={editNickname}
                onChangeText={setEditNickname}
                placeholder="닉네임을 입력하세요"
                placeholderTextColor={"#8E8E93"}
                maxLength={12}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={handleSaveNickname}
              />
              <Text style={[styles.charCount, { color: "#8E8E93" }]}>
                {editNickname.length}/12자
              </Text>
              <View style={styles.modalActions}>
                <Pressable
                  onPress={() => setShowNicknameModal(false)}
                  style={({ pressed }) => [styles.modalCancelBtn, { backgroundColor: "#FFFFFF" }, pressed && { opacity: 0.7 }]}
                >
                  <Text style={[styles.modalCancelText, { color: "#8E8E93" }]}>취소</Text>
                </Pressable>
                <Pressable
                  onPress={handleSaveNickname}
                  style={({ pressed }) => [styles.modalSaveBtn, pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] }]}
                >
                  <Text style={styles.modalSaveText}>저장</Text>
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      {/* 아바타 선택 모달 */}
      <Modal
        visible={showAvatarModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAvatarModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowAvatarModal(false)}>
          <Pressable style={[styles.modalContent, { backgroundColor: "#F8F8F8" }]} onPress={(e) => e.stopPropagation()}>
            <Text style={[styles.modalTitle, { color: "#1A1A1A" }]}>아바타 변경</Text>
            <Text style={[styles.modalSubtitle, { color: "#8E8E93" }]}>
              프로필에 표시될 이모지를 선택하세요
            </Text>
            <View style={styles.emojiGrid}>
              {AVATAR_EMOJIS.map((emoji) => (
                <Pressable
                  key={emoji}
                  onPress={() => handleSelectAvatar(emoji)}
                  style={({ pressed }) => [
                    styles.emojiOption,
                    { backgroundColor: "#FFFFFF", borderColor: "#E8E8E8" },
                    currentAvatar === emoji && styles.emojiOptionActive,
                    pressed && { opacity: 0.7, transform: [{ scale: 0.9 }] },
                  ]}
                >
                  <Text style={styles.emojiOptionText}>{emoji}</Text>
                  {currentAvatar === emoji && (
                    <View style={styles.emojiCheckmark}>
                      <Text style={{ fontSize: 10, color: "#FFFFFF" }}>✓</Text>
                    </View>
                  )}
                </Pressable>
              ))}
            </View>
            <Pressable
              onPress={() => setShowAvatarModal(false)}
              style={({ pressed }) => [styles.modalFullBtn, { backgroundColor: "#FFFFFF" }, pressed && { opacity: 0.7 }]}
            >
              <Text style={[styles.modalCancelText, { color: "#8E8E93" }]}>닫기</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  profileHeader: {
    alignItems: "center",
    paddingVertical: 28,
    paddingHorizontal: 16,
    gap: 8,
  },
  profileHeaderOrange: { backgroundColor: "#FFF3EE" },
  profileHeaderGreen: { backgroundColor: "#F0FFF4" },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 4,
  },
  avatarEmoji: { fontSize: 40 },
  avatarEditBadge: {
    position: "absolute",
    bottom: 2,
    right: -4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  nicknameEditRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  nicknameEditIcon: {
    fontSize: 14,
    opacity: 0.6,
  },
  profileName: { fontSize: 22, fontWeight: "800", color: "#1A1A1A" },
  roleBadge: { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 5 },
  roleBadgeOrange: { backgroundColor: "#FF7043" },
  roleBadgeGreen: { backgroundColor: "#4CAF82" },
  roleBadgeText: { color: "#FFFFFF", fontSize: 13, fontWeight: "700" },
  friendCode: { fontSize: 13, color: "#9E9E9E", fontWeight: "600", letterSpacing: 1 },
  statsRow: { flexDirection: "row", alignItems: "center", marginTop: 8, gap: 20 },
  statItem: { alignItems: "center", gap: 2 },
  statValue: { fontSize: 20, fontWeight: "800", color: "#1A1A1A" },
  statLabel: { fontSize: 11, color: "#8E8E93" },
  statDivider: { width: 1, height: 28, backgroundColor: "#E0E0E0" },
  sectionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#F0F0F0",
    gap: 12,
  },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#1A1A1A" },
  infoRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  infoLabel: { fontSize: 14, color: "#8E8E93" },
  infoValue: { fontSize: 14, fontWeight: "600", color: "#1A1A1A" },
  editBtn: { paddingHorizontal: 10, paddingVertical: 4, backgroundColor: "#F8F8F8", borderRadius: 8 },
  editBtnText: { fontSize: 13, color: "#FF7043", fontWeight: "600" },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F8F8F8",
  },
  menuLabel: { fontSize: 15, fontWeight: "600", color: "#1A1A1A" },
  menuBadge: { backgroundColor: "#FF704320", borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  menuBadgeText: { fontSize: 12, fontWeight: "700", color: "#FF7043" },
  menuArrow: { fontSize: 20, color: "#C0C0C0" },
  neighborhoodPicker: {
    backgroundColor: "#FAFAFA",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#F0F0F0",
  },
  neighborhoodChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    backgroundColor: "#FFFFFF",
  },
  neighborhoodChipActive: { borderColor: "#FF7043", backgroundColor: "#FFF3EE" },
  neighborhoodChipText: { fontSize: 13, color: "#8E8E93" },
  neighborhoodChipTextActive: { color: "#FF7043", fontWeight: "700" },
  emptyText: { fontSize: 13, color: "#9E9E9E", textAlign: "center", paddingVertical: 8 },
  petCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FAFAFA",
    borderRadius: 12,
    padding: 12,
  },
  petPhotoThumb: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  petEmojiContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#FFF3EE",
    alignItems: "center",
    justifyContent: "center",
  },
  petName: { fontSize: 15, fontWeight: "700", color: "#1A1A1A" },
  petInfo: { fontSize: 12, color: "#8E8E93", marginTop: 2 },
  addPetBtn: {
    borderWidth: 1.5,
    borderColor: "#FF7043",
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center",
    borderStyle: "dashed",
  },
  addPetBtnText: { color: "#FF7043", fontSize: 14, fontWeight: "600" },
  serviceList: { gap: 10 },
  serviceItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#FAFAFA",
    borderRadius: 12,
    padding: 12,
  },
  serviceEmoji: { fontSize: 24 },
  serviceText: { flex: 1, fontSize: 14, fontWeight: "600", color: "#1A1A1A" },
  serviceAvailBadge: { backgroundColor: "#F0FFF4", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  serviceAvailText: { fontSize: 11, color: "#4CAF82", fontWeight: "700" },
  caretakerNote: {
    backgroundColor: "#F0FFF4",
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: "#C8E6C9",
  },
  caretakerNoteText: { fontSize: 12, color: "#4CAF82", lineHeight: 18 },
  roleDesc: { fontSize: 14, color: "#8E8E93" },
  roleSubDesc: { fontSize: 13, color: "#9E9E9E", lineHeight: 18 },
  roleSwitchBtn: {
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  roleSwitchBtnOrange: { backgroundColor: "#FF7043" },
  roleSwitchBtnGreen: { backgroundColor: "#4CAF82" },
  roleSwitchBtnText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
  settingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
  settingText: { fontSize: 14, color: "#8E8E93" },
  settingArrow: { fontSize: 20, color: "#9E9E9E" },
  settingDivider: { height: 1, backgroundColor: "#F0F0F0", marginVertical: 4 },
  resetRow: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    paddingVertical: 4,
  },
  resetText: { fontSize: 14, color: "#EF5350", fontWeight: "600" as const },
  toggleTrack: {
    width: 44,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#E0E0E0",
    padding: 2,
    justifyContent: "center" as const,
  },
  toggleTrackActive: {
    backgroundColor: "#4CAF82",
  },
  toggleThumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleThumbActive: {
    alignSelf: "flex-end" as const,
  },
  // 모달 스타일
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "85%",
    maxWidth: 360,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    gap: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    textAlign: "center",
  },
  modalSubtitle: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
  },
  nicknameInput: {
    borderWidth: 1.5,
    borderColor: "#E0E0E0",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: "600",
    marginTop: 4,
  },
  charCount: {
    fontSize: 12,
    textAlign: "right",
    marginTop: -4,
  },
  modalActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  modalCancelText: {
    fontSize: 15,
    fontWeight: "600",
  },
  modalSaveBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: "#FF7043",
  },
  modalSaveText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  modalFullBtn: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 4,
  },
  // 이모지 그리드
  emojiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "center",
    marginTop: 8,
    marginBottom: 4,
  },
  emojiOption: {
    width: 52,
    height: 52,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "#E0E0E0",
    alignItems: "center",
    justifyContent: "center",
  },
  emojiOptionActive: {
    borderColor: "#FF7043",
    backgroundColor: "#FFF3EE",
  },
  emojiOptionText: {
    fontSize: 28,
  },
  emojiCheckmark: {
    position: "absolute",
    top: -4,
    right: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#FF7043",
    alignItems: "center",
    justifyContent: "center",
  },
});
