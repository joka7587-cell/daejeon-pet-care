import React, { useState, useRef } from "react";
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
import { getCurrentLocation, findNearestNeighborhood } from "@/lib/location-service";

const { width } = Dimensions.get("window");

const SLIDES = [
  {
    emoji: "🐾",
    title: "반려이음",
    subtitle: "대전 동네 반려동물\n돌봄 매칭 서비스",
    description: "가까운 이웃과 함께\n반려동물을 돌봐요",
    bg: "#FFF3EE", // This will be handled dynamically
  },
  {
    emoji: "🚶",
    title: "산책 친구 찾기",
    subtitle: "혼자 산책하기 심심하다면?",
    description: "같은 동네 반려인과\n함께 산책해요",
    bg: "#F0FFF4", // This will be handled dynamically
  },
  {
    emoji: "🏠",
    title: "긴급 돌봄 매칭",
    subtitle: "갑자기 외출이 생겼나요?",
    description: "근처 돌보미에게\n빠르게 요청하세요",
    bg: "#EEF4FF", // This will be handled dynamically
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

type Step = "slides" | "role" | "neighborhood" | "caretaker_setup" | "profile";

const CARETAKER_SERVICES = [
  { id: "walk", emoji: "🚶", label: "대신 산책해주기", desc: "반려동물 산책 대행" },
  { id: "visit", emoji: "🏠", label: "방문 돌봄", desc: "집에 방문하여 돌봄" },
  { id: "emergency", emoji: "🚨", label: "긴급 돌봄", desc: "긴급 상황 시 돌봄" },
  { id: "daycare", emoji: "☀️", label: "데이케어", desc: "낮 시간 돌봄" },
  { id: "grooming", emoji: "✂️", label: "그루밍 도움", desc: "목욕, 빗질 등" },
  { id: "training", emoji: "🎓", label: "기본 훈련", desc: "기본 예절 훈련" },
];

export default function OnboardingScreen() {
  const [step, setStep] = useState<Step>("slides");
  const [currentSlide, setCurrentSlide] = useState(0);
  const [selectedRole, setSelectedRole] = useState<UserRole>(null);
  const [selectedNeighborhood, setSelectedNeighborhood] = useState<Neighborhood | null>(null);
  const [nickname, setNickname] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState("🐾");
  const [nicknameError, setNicknameError] = useState("");
  const [isCompleting, setIsCompleting] = useState(false);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [caretakerBio, setCaretakerBio] = useState("");
  const scrollRef = useRef<ScrollView>(null);
  const { dispatch } = useApp();
  const router = useRouter();

  const fadeAnim = useRef(new RNAnimated.Value(1)).current;
  const slideAnim = useRef(new RNAnimated.Value(0)).current;
  const completeFadeAnim = useRef(new RNAnimated.Value(0)).current;

  const haptic = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

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
    if (selectedRole === "caretaker") {
      animateStepTransition("caretaker_setup");
    } else {
      animateStepTransition("profile");
    }
  };

  const toggleService = (serviceId: string) => {
    haptic();
    setSelectedServices((prev) =>
      prev.includes(serviceId)
        ? prev.filter((s) => s !== serviceId)
        : [...prev, serviceId]
    );
  };

  const handleCaretakerSetupComplete = () => {
    haptic();
    animateStepTransition("profile");
  };

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

    RNAnimated.timing(completeFadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start(() => {
      const nick = nickname.trim() || (selectedRole === "caretaker" ? "새 돌보미" : "새 반려인");
      dispatch({ type: "SET_ROLE", payload: selectedRole });
      dispatch({ type: "SET_NEIGHBORHOOD", payload: selectedNeighborhood! });
      const bio = selectedRole === "caretaker" && caretakerBio.trim()
        ? caretakerBio.trim()
        : `${selectedAvatar} ${selectedNeighborhood}에서 활동하는 ${selectedRole === "owner" ? "반려인" : "돌보미"}입니다.`;
      dispatch({
        type: "SET_PROFILE",
        payload: {
          nickname: nick,
          bio,
          caretakerServices: selectedServices,
          isCaretakerActive: selectedRole === "caretaker",
        },
      });
      setTimeout(() => {
        dispatch({ type: "SET_ONBOARDED", payload: true });
        setTimeout(() => {
          router.replace("/(tabs)" as never);
        }, 200);
      }, 100);
    });
  };

  const canComplete = nickname.trim().length >= 2 && !nicknameError;

  if (step === "slides") {
    const slideBgColors = ["#F8F8F8", "#F0FFF4", "#EEF4FF"];
    return (
      <View style={[styles.container, { backgroundColor: slideBgColors[currentSlide] }]}>
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
              <Text style={[styles.slideTitle, { color: "#1A1A1A" }]}>{slide.title}</Text>
              <Text style={styles.slideSubtitle}>{slide.subtitle}</Text>
              <Text style={[styles.slideDesc, { color: "#8E8E93" }]}>{slide.description}</Text>
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

  if (isCompleting) {
    return (
      <RNAnimated.View
        style={[
          styles.completeOverlay,
          { opacity: completeFadeAnim, backgroundColor: "#F8F8F8" },
        ]}
      >
        <Text style={styles.completeEmoji}>{selectedAvatar}</Text>
        <Text style={styles.completeTitle}>환영합니다!</Text>
        <Text style={[styles.completeSubtitle, { color: "#8E8E93" }]}>
          {nickname}님, 반려이음을 시작합니다
        </Text>
      </RNAnimated.View>
    );
  }

  if (step === "role") {
    return (
      <ScreenContainer className="px-6">
        <RNAnimated.View
          style={[
            styles.stepContainer,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}
        >
          <Text style={[styles.stepTitle, { color: "#1A1A1A" }]}>어떤 역할로 시작할까요?</Text>
          <Text style={[styles.stepSubtitle, { color: "#8E8E93" }]}>나중에 프로필에서 변경할 수 있어요</Text>

          <View style={styles.roleCards}>
            <Pressable
              onPress={() => handleRoleSelect("owner")}
              style={({ pressed }) => [
                styles.roleCard,
                { borderColor: "#FF7043", backgroundColor: "#F8F8F8" },
                pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
              ]}
            >
              <Text style={styles.roleEmoji}>🐶</Text>
              <Text style={[styles.roleTitle, { color: "#FF7043" }]}>반려인</Text>
              <Text style={[styles.roleDesc, { color: "#8E8E93" }]}>
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
              <Text style={[styles.roleDesc, { color: "#8E8E93" }]}>
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

  if (step === "caretaker_setup") {
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
              <Text style={[styles.stepTitle, { color: "#1A1A1A" }]}>돌보미 서비스 설정</Text>
              <Text style={[styles.stepSubtitle, { color: "#8E8E93" }]}>제공할 수 있는 서비스를 선택해주세요</Text>

              <View style={{ gap: 10, marginBottom: 24 }}>
                {CARETAKER_SERVICES.map((svc) => {
                  const isSelected = selectedServices.includes(svc.id);
                  return (
                    <Pressable
                      key={svc.id}
                      onPress={() => toggleService(svc.id)}
                      style={({ pressed }) => [
                        styles.serviceCard,
                        { backgroundColor: "#FFFFFF", borderColor: "#E8E8E8" },
                        isSelected && styles.serviceCardSelected,
                        pressed && { opacity: 0.85 },
                      ]}
                    >
                      <Text style={{ fontSize: 28 }}>{svc.emoji}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={[
                          styles.serviceLabel,
                          { color: "#1A1A1A" },
                          isSelected && { color: "#4CAF82" },
                        ]}>{svc.label}</Text>
                        <Text style={[styles.serviceDesc, { color: "#8E8E93" }]}>{svc.desc}</Text>
                      </View>
                      <View style={[
                        styles.serviceCheck,
                        { borderColor: "#E8E8E8" },
                        isSelected && styles.serviceCheckSelected,
                      ]}>
                        <Text style={{ color: isSelected ? "#FFFFFF" : "#ccc", fontSize: 14 }}>
                          {isSelected ? "✓" : ""}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>

              <View style={styles.inputWrap}>
                <Text style={[styles.sectionLabel, { color: "#1A1A1A" }]}>자기소개 (선택)</Text>
                <TextInput
                  style={[styles.textInput, { height: 80, textAlignVertical: "top", backgroundColor: "#FFFFFF", borderColor: "#E8E8E8", color: "#1A1A1A" }]}
                  placeholder="예) 반려동물 돌봄 경력 3년, 대형견도 가능해요!"
                  placeholderTextColor={"#8E8E93"}
                  value={caretakerBio}
                  onChangeText={setCaretakerBio}
                  maxLength={100}
                  multiline
                  returnKeyType="done"
                />
                <Text style={[styles.hintText, { color: "#8E8E93" }]}>{caretakerBio.length}/100</Text>
              </View>

              <Pressable
                onPress={handleCaretakerSetupComplete}
                style={({ pressed }) => [
                  styles.completeBtn,
                  selectedServices.length === 0 && styles.completeBtnDisabled,
                  pressed && selectedServices.length > 0 && { opacity: 0.85, transform: [{ scale: 0.97 }] },
                ]}
                disabled={selectedServices.length === 0}
              >
                <Text style={[
                  styles.completeBtnText,
                  selectedServices.length === 0 && styles.completeBtnTextDisabled,
                ]}>
                  다음 ({selectedServices.length}개 선택)
                </Text>
              </Pressable>
            </RNAnimated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </ScreenContainer>
    );
  }

  if (step === "neighborhood") {
    return (
      <ScreenContainer className="px-6">
        <RNAnimated.View
          style={[
            styles.stepContainer,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}
        >
          <Text style={[styles.stepTitle, { color: "#1A1A1A" }]}>우리 동네를 선택해주세요</Text>
          <Text style={[styles.stepSubtitle, { color: "#8E8E93" }]}>대전 동네 단위로 매칭해드려요</Text>

          <Pressable
            onPress={async () => {
              haptic();
              const loc = await getCurrentLocation();
              if (loc) {
                const nearest = findNearestNeighborhood(loc.lat, loc.lng);
                handleNeighborhoodSelect(nearest as Neighborhood);
              }
            }}
            style={({ pressed }) => [
              styles.autoDetectBtn,
              pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] },
            ]}
          >
            <Text style={styles.autoDetectText}>📍 현재 위치로 자동 감지</Text>
          </Pressable>

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
                  { backgroundColor: "#FFFFFF", borderColor: "#E8E8E8" },
                  selectedNeighborhood === item && [styles.neighborhoodBtnSelected, { backgroundColor: "#F8F8F8" }],
                  pressed && { opacity: 0.8 },
                ]}
              >
                <Text
                  style={[
                    styles.neighborhoodText,
                    { color: "#8E8E93" },
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
            <Text style={[styles.stepTitle, { color: "#1A1A1A" }]}>프로필을 설정해주세요</Text>
            <Text style={[styles.stepSubtitle, { color: "#8E8E93" }]}>다른 반려인에게 보여지는 정보예요</Text>

            <View style={styles.avatarSection}>
              <Text style={[styles.sectionLabel, { color: "#1A1A1A" }]}>프로필 아바타</Text>
              <View style={styles.selectedAvatarWrap}>
                <View style={[styles.selectedAvatarCircle, { backgroundColor: "#F8F8F8" }]}>
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
                      { backgroundColor: "#F8F8F8" },
                      selectedAvatar === emoji && [styles.avatarBtnSelected, { backgroundColor: "#F8F8F8" }],
                      pressed && { opacity: 0.7 },
                    ]}
                  >
                    <Text style={styles.avatarEmoji}>{emoji}</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.inputWrap}>
              <Text style={[styles.sectionLabel, { color: "#1A1A1A" }]}>닉네임</Text>
              <TextInput
                style={[
                  styles.textInput,
                  { backgroundColor: "#FFFFFF", borderColor: "#E8E8E8", color: "#1A1A1A" },
                  nicknameError ? styles.textInputError : null,
                  nickname.trim().length >= 2 && !nicknameError ? styles.textInputValid : null,
                ]}
                placeholder="예) 골든이 아빠, 말티즈맘"
                placeholderTextColor={"#8E8E93"}
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
                <Text style={[styles.hintText, { color: "#8E8E93" }]}>2~20자 사이로 입력해주세요</Text>
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

            <View style={[styles.summaryCard, { backgroundColor: "#F8F8F8" }]}>
              <Text style={[styles.summaryTitle, { color: "#8E8E93" }]}>선택 정보 확인</Text>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: "#8E8E93" }]}>프로필</Text>
                <Text style={[styles.summaryValue, { color: "#1A1A1A" }]}>
                  {selectedAvatar} {nickname || "미입력"}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: "#8E8E93" }]}>역할</Text>
                <Text style={[styles.summaryValue, { color: "#1A1A1A" }]}>
                  {selectedRole === "owner" ? "🐶 반려인" : "🏠 돌보미"}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: "#8E8E93" }]}>동네</Text>
                <Text style={[styles.summaryValue, { color: "#1A1A1A" }]}>📍 {selectedNeighborhood}</Text>
              </View>
            </View>

            <Pressable
              onPress={handleComplete}
              style={({ pressed }) => [
                styles.completeBtn,
                !canComplete && [styles.completeBtnDisabled, { backgroundColor: "#E8E8E8" }],
                pressed && canComplete && { opacity: 0.85, transform: [{ scale: 0.97 }] },
              ]}
              disabled={!canComplete}
            >
              <Text
                style={[
                  styles.completeBtnText,
                  !canComplete && [styles.completeBtnTextDisabled, { color: "#8E8E93" }],
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
  slideDesc: { fontSize: 16, textAlign: "center", lineHeight: 24 },
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
  nextBtnText: { color: "#FFFFFF", fontSize: 18, fontWeight: "700" },
  stepContainer: { flex: 1, paddingTop: 40 },
  stepTitle: {
    fontSize: 26,
    fontWeight: "800",
    marginBottom: 8,
  },
  stepSubtitle: { fontSize: 15, marginBottom: 28 },
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
  roleDesc: { fontSize: 13, textAlign: "center", lineHeight: 20 },
  roleBadge: {
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginTop: 4,
  },
  roleBadgeText: { color: "#FFFFFF", fontSize: 11, fontWeight: "600" },
  autoDetectBtn: {
    backgroundColor: "#4CAF82",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center" as const,
    marginBottom: 16,
  },
  autoDetectText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700" as const,
  },
  neighborhoodBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  neighborhoodBtnSelected: {
    borderColor: "#FF7043",
  },
  neighborhoodText: { fontSize: 14, fontWeight: "600" },
  neighborhoodTextSelected: { color: "#FF7043" },

  avatarSection: { marginBottom: 24 },
  sectionLabel: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 12,
  },
  selectedAvatarWrap: { alignItems: "center", marginBottom: 16 },
  selectedAvatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
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
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "transparent",
  },
  avatarBtnSelected: {
    borderColor: "#FF7043",
  },
  avatarEmoji: { fontSize: 24 },

  serviceCard: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  serviceCardSelected: {
    borderColor: "#4CAF82",
    backgroundColor: "#F0FFF4",
  },
  serviceLabel: {
    fontSize: 15,
    fontWeight: "700" as const,
  },
  serviceDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  serviceCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  serviceCheckSelected: {
    backgroundColor: "#4CAF82",
    borderColor: "#4CAF82",
  },

  inputWrap: { marginBottom: 24 },
  textInput: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 6,
    fontSize: 16,
  },
  textInputError: { borderColor: "#EF5350" },
  textInputValid: { borderColor: "#4CAF82" },
  errorText: { fontSize: 12, color: "#EF5350", marginBottom: 8 },
  validText: { fontSize: 12, color: "#4CAF82", marginBottom: 8 },
  hintText: { fontSize: 12, marginBottom: 8 },
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
  quickNickTextSelected: { color: "#FFFFFF" },

  summaryCard: {
    borderRadius: 16,
    padding: 16,
    gap: 8,
    marginBottom: 24,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 4,
  },
  summaryRow: { flexDirection: "row", justifyContent: "space-between" },
  summaryLabel: { fontSize: 14 },
  summaryValue: { fontSize: 14, fontWeight: "600" },

  completeBtn: {
    backgroundColor: "#FF7043",
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
  },
  completeBtnDisabled: {
    backgroundColor: "#E0E0E0",
  },
  completeBtnText: { color: "#FFFFFF", fontSize: 18, fontWeight: "700" },
  completeBtnTextDisabled: { color: "#9E9E9E" },

  completeOverlay: {
    flex: 1,
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
    textAlign: "center",
  },
});
