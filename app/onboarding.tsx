import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  Dimensions,
  StyleSheet,
  FlatList,
  Animated as RNAnimated,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useApp, UserRole, Neighborhood } from "@/lib/app-context";
import { NEIGHBORHOODS, MOCK_CARETAKERS, MOCK_OWNERS } from "@/lib/mock-data";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";

const { width } = Dimensions.get("window");

const SLIDES = [
  {
    emoji: "🐾",
    title: "반려이음",
    subtitle: "대전 동네 반려동물\n돌봄 매칭 서비스",
    description: "가까운 이웃과 함께\n반려동물을 돌봐요",
    bg: "#FFF3EE",
  },
  {
    emoji: "🚶",
    title: "산책 친구 찾기",
    subtitle: "혼자 산책하기 심심하다면?",
    description: "같은 동네 반려인과\n함께 산책해요",
    bg: "#F0FFF4",
  },
  {
    emoji: "🏠",
    title: "긴급 돌봄 매칭",
    subtitle: "갑자기 외출이 생겼나요?",
    description: "근처 돌보미에게\n빠르게 요청하세요",
    bg: "#EEF4FF",
  },
];

const PROFILE_AVATARS = [
  "🐶", "🐱", "🐰", "🦊", "🐻",
  "🐼", "🐨", "🐯", "🦁", "🐸",
  "🐵", "🐧", "🐦", "🦄", "🐾",
  "👩", "👨", "👧", "👦", "🧑",
];

// 기존 사용자 닉네임 목록 (중복 검사용)
const EXISTING_NICKNAMES = [
  ...MOCK_CARETAKERS.map((u) => u.nickname),
  ...MOCK_OWNERS.map((u) => u.nickname),
];

type Step = "slides" | "role" | "neighborhood" | "profile";

export default function OnboardingScreen() {
  const [step, setStep] = useState<Step>("slides");
  const [currentSlide, setCurrentSlide] = useState(0);
  const [selectedRole, setSelectedRole] = useState<UserRole>(null);
  const [selectedNeighborhood, setSelectedNeighborhood] = useState<Neighborhood | null>(null);
  const [nickname, setNickname] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState("🐾");
  const [nicknameError, setNicknameError] = useState("");
  const [isCompleting, setIsCompleting] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const { dispatch } = useApp();
  const router = useRouter();

  // 페이드 애니메이션 값
  const fadeAnim = useRef(new RNAnimated.Value(1)).current;
  const slideAnim = useRef(new RNAnimated.Value(0)).current;
  const completeFadeAnim = useRef(new RNAnimated.Value(0)).current;

  const haptic = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  // 스텝 전환 시 페이드 애니메이션
  const animateStepTransition = (nextStep: Step) => {
    RNAnimated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setStep(nextStep);
      slideAnim.setValue(30);
      fadeAnim.setValue(0);
      RNAnimated.parallel([
        RNAnimated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        RNAnimated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    });
  };

  const handleSlideNext = () => {
    haptic();
    if (currentSlide < SLIDES.length - 1) {
      const next = currentSlide + 1;
      setCurrentSlide(next);
      scrollRef.current?.scrollTo({ x: next * width, animated: true });
    } else {
      animateStepTransition("role");
    }
  };

  const handleRoleSelect = (role: UserRole) => {
    haptic();
    setSelectedRole(role);
    animateStepTransition("neighborhood");
  };

  const handleNeighborhoodSelect = (n: Neighborhood) => {
    haptic();
    setSelectedNeighborhood(n);
    animateStepTransition("profile");
  };

  // 닉네임 중복 검사
  const validateNickname = (name: string): string => {
    const trimmed = name.trim();
    if (trimmed.length === 0) return "";
    if (trimmed.length < 2) return "닉네임은 2자 이상이어야 해요";
    if (trimmed.length > 20) return "닉네임은 20자 이하여야 해요";
    const isDuplicate = EXISTING_NICKNAMES.some(
      (existing) => existing.toLowerCase() === trimmed.toLowerCase()
    );
    if (isDuplicate) return "이미 사용 중인 닉네임이에요";
    return "";
  };

  const handleNicknameChange = (text: string) => {
    setNickname(text);
    const error = validateNickname(text);
    setNicknameError(error);
  };

  const handleQuickNickname = (name: string) => {
    haptic();
    setNickname(name);
    const error = validateNickname(name);
    setNicknameError(error);
  };

  const handleComplete = () => {
    const error = validateNickname(nickname);
    if (error) {
      setNicknameError(error);
      return;
    }

    haptic();
    setIsCompleting(true);

    // 완료 애니메이션
    RNAnimated.timing(completeFadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start(() => {
      const nick = nickname.trim() || (selectedRole === "caretaker" ? "새 돌보미" : "새 반려인");
      dispatch({ type: "SET_ROLE", payload: selectedRole });
      dispatch({ type: "SET_NEIGHBORHOOD", payload: selectedNeighborhood! });
      dispatch({
        type: "SET_PROFILE",
        payload: {
          nickname: nick,
          bio: `${selectedAvatar} ${selectedNeighborhood}에서 활동하는 ${selectedRole === "owner" ? "반려인" : "돌보미"}입니다.`,
        },
      });
      setTimeout(() => {
        dispatch({ type: "SET_ONBOARDED", payload: true });
        // 직접 홈 화면으로 이동
        setTimeout(() => {
          router.replace("/(tabs)" as never);
        }, 200);
      }, 100);
    });
  };

  const canComplete = nickname.trim().length >= 2 && !nicknameError;

  // 슬라이드 화면
  if (step === "slides") {
    return (
      <View style={[styles.container, { backgroundColor: SLIDES[currentSlide].bg }]}>
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          scrollEnabled={false}
          showsHorizontalScrollIndicator={false}
          style={{ flex: 1 }}
        >
          {SLIDES.map((slide, i) => (
            <View key={i} style={[styles.slide, { width }]}>
              <Text style={styles.slideEmoji}>{slide.emoji}</Text>
              <Text style={styles.slideTitle}>{slide.title}</Text>
              <Text style={styles.slideSubtitle}>{slide.subtitle}</Text>
              <Text style={styles.slideDesc}>{slide.description}</Text>
            </View>
          ))}
        </ScrollView>

        <View style={styles.dotsRow}>
          {SLIDES.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                { backgroundColor: i === currentSlide ? "#FF7043" : "#FFCCBC" },
              ]}
            />
          ))}
        </View>

        <Pressable
          onPress={handleSlideNext}
          style={({ pressed }) => [
            styles.nextBtn,
            pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
          ]}
        >
          <Text style={styles.nextBtnText}>
            {currentSlide < SLIDES.length - 1 ? "다음" : "시작하기"}
          </Text>
        </Pressable>
      </View>
    );
  }

  // 완료 오버레이
  if (isCompleting) {
    return (
      <RNAnimated.View
        style={[
          styles.completeOverlay,
          { opacity: completeFadeAnim },
        ]}
      >
        <Text style={styles.completeEmoji}>{selectedAvatar}</Text>
        <Text style={styles.completeTitle}>환영합니다!</Text>
        <Text style={styles.completeSubtitle}>
          {nickname}님, 반려이음을 시작합니다
        </Text>
      </RNAnimated.View>
    );
  }

  // 역할 선택
  if (step === "role") {
    return (
      <ScreenContainer className="px-6">
        <RNAnimated.View
          style={[
            styles.stepContainer,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}
        >
          <Text style={styles.stepTitle}>어떤 역할로 시작할까요?</Text>
          <Text style={styles.stepSubtitle}>나중에 프로필에서 변경할 수 있어요</Text>

          <View style={styles.roleCards}>
            <Pressable
              onPress={() => handleRoleSelect("owner")}
              style={({ pressed }) => [
                styles.roleCard,
                { borderColor: "#FF7043", backgroundColor: "#FFF3EE" },
                pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
              ]}
            >
              <Text style={styles.roleEmoji}>🐶</Text>
              <Text style={[styles.roleTitle, { color: "#FF7043" }]}>반려인</Text>
              <Text style={styles.roleDesc}>
                산책 친구 찾기{"\n"}돌보미 찾기{"\n"}산책 부탁하기{"\n"}단기 돌봄 교환
              </Text>
              <View style={[styles.roleBadge, { backgroundColor: "#FF7043" }]}>
                <Text style={styles.roleBadgeText}>모든 서비스 이용 가능</Text>
              </View>
            </Pressable>

            <Pressable
              onPress={() => handleRoleSelect("caretaker")}
              style={({ pressed }) => [
                styles.roleCard,
                { borderColor: "#4CAF82", backgroundColor: "#F0FFF4" },
                pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
              ]}
            >
              <Text style={styles.roleEmoji}>🏠</Text>
              <Text style={[styles.roleTitle, { color: "#4CAF82" }]}>돌보미</Text>
              <Text style={styles.roleDesc}>
                긴급 방문 돌봄{"\n"}대신 산책해주기
              </Text>
              <View style={[styles.roleBadge, { backgroundColor: "#4CAF82" }]}>
                <Text style={styles.roleBadgeText}>서비스 제공자</Text>
              </View>
            </Pressable>
          </View>
        </RNAnimated.View>
      </ScreenContainer>
    );
  }

  // 동네 선택
  if (step === "neighborhood") {
    return (
      <ScreenContainer className="px-6">
        <RNAnimated.View
          style={[
            styles.stepContainer,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}
        >
          <Text style={styles.stepTitle}>우리 동네를 선택해주세요</Text>
          <Text style={styles.stepSubtitle}>대전 동네 단위로 매칭해드려요</Text>

          <FlatList
            data={NEIGHBORHOODS}
            keyExtractor={(item) => item}
            numColumns={3}
            contentContainerStyle={{ gap: 10, paddingBottom: 20 }}
            columnWrapperStyle={{ gap: 10 }}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => handleNeighborhoodSelect(item as Neighborhood)}
                style={({ pressed }) => [
                  styles.neighborhoodBtn,
                  selectedNeighborhood === item && styles.neighborhoodBtnSelected,
                  pressed && { opacity: 0.8 },
                ]}
              >
                <Text
                  style={[
                    styles.neighborhoodText,
                    selectedNeighborhood === item && styles.neighborhoodTextSelected,
                  ]}
                >
                  {item}
                </Text>
              </Pressable>
            )}
          />
        </RNAnimated.View>
      </ScreenContainer>
    );
  }

  // 프로필 설정 (닉네임 + 아바타)
  return (
    <ScreenContainer className="px-6">
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <RNAnimated.View
            style={[
              styles.stepContainer,
              { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
            ]}
          >
            <Text style={styles.stepTitle}>프로필을 설정해주세요</Text>
            <Text style={styles.stepSubtitle}>다른 반려인에게 보여지는 정보예요</Text>

            {/* 아바타 선택 */}
            <View style={styles.avatarSection}>
              <Text style={styles.sectionLabel}>프로필 아바타</Text>
              <View style={styles.selectedAvatarWrap}>
                <View style={styles.selectedAvatarCircle}>
                  <Text style={styles.selectedAvatarEmoji}>{selectedAvatar}</Text>
                </View>
              </View>
              <View style={styles.avatarGrid}>
                {PROFILE_AVATARS.map((emoji) => (
                  <Pressable
                    key={emoji}
                    onPress={() => { haptic(); setSelectedAvatar(emoji); }}
                    style={({ pressed }) => [
                      styles.avatarBtn,
                      selectedAvatar === emoji && styles.avatarBtnSelected,
                      pressed && { opacity: 0.7 },
                    ]}
                  >
                    <Text style={styles.avatarEmoji}>{emoji}</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* 닉네임 입력 */}
            <View style={styles.inputWrap}>
              <Text style={styles.sectionLabel}>닉네임</Text>
              <TextInput
                style={[
                  styles.textInput,
                  nicknameError ? styles.textInputError : null,
                  nickname.trim().length >= 2 && !nicknameError ? styles.textInputValid : null,
                ]}
                placeholder="예) 골든이 아빠, 말티즈맘"
                placeholderTextColor="#BDBDBD"
                value={nickname}
                onChangeText={handleNicknameChange}
                maxLength={20}
                returnKeyType="done"
              />
              {nicknameError ? (
                <Text style={styles.errorText}>{nicknameError}</Text>
              ) : nickname.trim().length >= 2 ? (
                <Text style={styles.validText}>사용 가능한 닉네임이에요</Text>
              ) : (
                <Text style={styles.hintText}>2~20자 사이로 입력해주세요</Text>
              )}
              <View style={styles.quickNicknames}>
                {["골든이 아빠", "말티즈맘", "포메 집사", "비글 아빠", "시바견맘"].map((n) => (
                  <Pressable
                    key={n}
                    onPress={() => handleQuickNickname(n)}
                    style={({ pressed }) => [
                      styles.quickNick,
                      nickname === n && styles.quickNickSelected,
                      pressed && { opacity: 0.7 },
                    ]}
                  >
                    <Text
                      style={[
                        styles.quickNickText,
                        nickname === n && styles.quickNickTextSelected,
                      ]}
                    >
                      {n}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* 선택 정보 확인 */}
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>선택 정보 확인</Text>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>프로필</Text>
                <Text style={styles.summaryValue}>
                  {selectedAvatar} {nickname || "미입력"}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>역할</Text>
                <Text style={styles.summaryValue}>
                  {selectedRole === "owner" ? "🐶 반려인" : "🏠 돌보미"}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>동네</Text>
                <Text style={styles.summaryValue}>📍 {selectedNeighborhood}</Text>
              </View>
            </View>

            <Pressable
              onPress={handleComplete}
              style={({ pressed }) => [
                styles.completeBtn,
                !canComplete && styles.completeBtnDisabled,
                pressed && canComplete && { opacity: 0.85, transform: [{ scale: 0.97 }] },
              ]}
              disabled={!canComplete}
            >
              <Text
                style={[
                  styles.completeBtnText,
                  !canComplete && styles.completeBtnTextDisabled,
                ]}
              >
                반려이음 시작하기 🐾
              </Text>
            </Pressable>
          </RNAnimated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  slide: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    paddingTop: 80,
    paddingBottom: 40,
  },
  slideEmoji: { fontSize: 80, marginBottom: 24 },
  slideTitle: {
    fontSize: 32,
    fontWeight: "800",
    color: "#1A1A1A",
    marginBottom: 8,
    textAlign: "center",
  },
  slideSubtitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#FF7043",
    marginBottom: 12,
    textAlign: "center",
  },
  slideDesc: { fontSize: 16, color: "#555", textAlign: "center", lineHeight: 24 },
  dotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    paddingBottom: 16,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  nextBtn: {
    marginHorizontal: 24,
    marginBottom: 40,
    backgroundColor: "#FF7043",
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
  },
  nextBtnText: { color: "#fff", fontSize: 18, fontWeight: "700" },
  stepContainer: { flex: 1, paddingTop: 40 },
  stepTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: "#1A1A1A",
    marginBottom: 8,
  },
  stepSubtitle: { fontSize: 15, color: "#757575", marginBottom: 28 },
  roleCards: { flexDirection: "row", gap: 12 },
  roleCard: {
    flex: 1,
    borderWidth: 2,
    borderRadius: 20,
    padding: 20,
    alignItems: "center",
    gap: 8,
  },
  roleEmoji: { fontSize: 48 },
  roleTitle: { fontSize: 20, fontWeight: "800" },
  roleDesc: { fontSize: 13, color: "#555", textAlign: "center", lineHeight: 20 },
  roleBadge: {
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginTop: 4,
  },
  roleBadgeText: { color: "#fff", fontSize: 11, fontWeight: "600" },
  neighborhoodBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: "#E0E0E0",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    backgroundColor: "#fff",
  },
  neighborhoodBtnSelected: {
    borderColor: "#FF7043",
    backgroundColor: "#FFF3EE",
  },
  neighborhoodText: { fontSize: 14, fontWeight: "600", color: "#555" },
  neighborhoodTextSelected: { color: "#FF7043" },

  // 아바타 섹션
  avatarSection: { marginBottom: 24 },
  sectionLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#333",
    marginBottom: 12,
  },
  selectedAvatarWrap: { alignItems: "center", marginBottom: 16 },
  selectedAvatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#FFF3EE",
    borderWidth: 3,
    borderColor: "#FF7043",
    alignItems: "center",
    justifyContent: "center",
  },
  selectedAvatarEmoji: { fontSize: 44 },
  avatarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "center",
  },
  avatarBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#F5F5F5",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "transparent",
  },
  avatarBtnSelected: {
    borderColor: "#FF7043",
    backgroundColor: "#FFF3EE",
  },
  avatarEmoji: { fontSize: 24 },

  // 닉네임 입력
  inputWrap: { marginBottom: 24 },
  textInput: {
    borderWidth: 1.5,
    borderColor: "#E0E0E0",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#fff",
    marginBottom: 6,
    fontSize: 16,
    color: "#1A1A1A",
  },
  textInputError: { borderColor: "#EF5350" },
  textInputValid: { borderColor: "#4CAF82" },
  errorText: { fontSize: 12, color: "#EF5350", marginBottom: 8 },
  validText: { fontSize: 12, color: "#4CAF82", marginBottom: 8 },
  hintText: { fontSize: 12, color: "#9E9E9E", marginBottom: 8 },
  quickNicknames: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  quickNick: {
    borderWidth: 1,
    borderColor: "#FF7043",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  quickNickSelected: {
    backgroundColor: "#FF7043",
  },
  quickNickText: { color: "#FF7043", fontSize: 13, fontWeight: "500" },
  quickNickTextSelected: { color: "#fff" },

  // 요약 카드
  summaryCard: {
    backgroundColor: "#F5F5F5",
    borderRadius: 16,
    padding: 16,
    gap: 8,
    marginBottom: 24,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#555",
    marginBottom: 4,
  },
  summaryRow: { flexDirection: "row", justifyContent: "space-between" },
  summaryLabel: { fontSize: 14, color: "#757575" },
  summaryValue: { fontSize: 14, fontWeight: "600", color: "#1A1A1A" },

  // 완료 버튼
  completeBtn: {
    backgroundColor: "#FF7043",
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
  },
  completeBtnDisabled: {
    backgroundColor: "#E0E0E0",
  },
  completeBtnText: { color: "#fff", fontSize: 18, fontWeight: "700" },
  completeBtnTextDisabled: { color: "#9E9E9E" },

  // 완료 오버레이
  completeOverlay: {
    flex: 1,
    backgroundColor: "#FFF3EE",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  completeEmoji: { fontSize: 80 },
  completeTitle: {
    fontSize: 32,
    fontWeight: "800",
    color: "#FF7043",
  },
  completeSubtitle: {
    fontSize: 18,
    color: "#555",
    textAlign: "center",
  },
});
