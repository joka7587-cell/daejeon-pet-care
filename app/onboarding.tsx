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
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useApp, UserRole, Neighborhood } from "@/lib/app-context";
import { NEIGHBORHOODS } from "@/lib/mock-data";
import { useColors } from "@/hooks/use-colors";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

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

export default function OnboardingScreen() {
  const [step, setStep] = useState<"slides" | "role" | "neighborhood" | "profile">("slides");
  const [currentSlide, setCurrentSlide] = useState(0);
  const [selectedRole, setSelectedRole] = useState<UserRole>(null);
  const [selectedNeighborhood, setSelectedNeighborhood] = useState<Neighborhood | null>(null);
  const [nickname, setNickname] = useState("");
  const scrollRef = useRef<ScrollView>(null);
  const { dispatch } = useApp();
  const colors = useColors();

  const haptic = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleSlideNext = () => {
    haptic();
    if (currentSlide < SLIDES.length - 1) {
      const next = currentSlide + 1;
      setCurrentSlide(next);
      scrollRef.current?.scrollTo({ x: next * width, animated: true });
    } else {
      setStep("role");
    }
  };

  const handleRoleSelect = (role: UserRole) => {
    haptic();
    setSelectedRole(role);
    setStep("neighborhood");
  };

  const handleNeighborhoodSelect = (n: Neighborhood) => {
    haptic();
    setSelectedNeighborhood(n);
    setStep("profile");
  };

  const handleComplete = () => {
    haptic();
    const nick = nickname.trim() || (selectedRole === "caretaker" ? "새 돌보미" : "새 반려인");
    dispatch({ type: "SET_ROLE", payload: selectedRole });
    dispatch({ type: "SET_NEIGHBORHOOD", payload: selectedNeighborhood! });
    dispatch({ type: "SET_PROFILE", payload: { nickname: nick } });
    // SET_ONBOARDED를 마지막에 dispatch하여 라우팅 트리거
    setTimeout(() => {
      dispatch({ type: "SET_ONBOARDED", payload: true });
    }, 50);
  };

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
          style={({ pressed }) => [styles.nextBtn, pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] }]}
        >
          <Text style={styles.nextBtnText}>
            {currentSlide < SLIDES.length - 1 ? "다음" : "시작하기"}
          </Text>
        </Pressable>
      </View>
    );
  }

  if (step === "role") {
    return (
      <ScreenContainer className="px-6">
        <View style={styles.stepContainer}>
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
        </View>
      </ScreenContainer>
    );
  }

  if (step === "neighborhood") {
    return (
      <ScreenContainer className="px-6">
        <View style={styles.stepContainer}>
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
        </View>
      </ScreenContainer>
    );
  }

  // Profile step
  return (
    <ScreenContainer className="px-6">
      <View style={styles.stepContainer}>
        <Text style={styles.stepTitle}>닉네임을 입력해주세요</Text>
        <Text style={styles.stepSubtitle}>다른 반려인에게 보여지는 이름이에요</Text>

        <View style={styles.inputWrap}>
          <Text style={styles.inputLabel}>닉네임</Text>
          <TextInput
            style={styles.textInput}
            placeholder="예) 골든이 아빠, 말티즈맘"
            placeholderTextColor="#BDBDBD"
            value={nickname}
            onChangeText={setNickname}
            maxLength={20}
            returnKeyType="done"
            autoFocus={true}
          />
          <View style={styles.quickNicknames}>
            {["골든이 아빠", "말티즈맘", "포메 집사", "비글 아빠", "시바견맘"].map((n) => (
              <Pressable
                key={n}
                onPress={() => { haptic(); setNickname(n); }}
                style={({ pressed }) => [styles.quickNick, pressed && { opacity: 0.7 }]}
              >
                <Text style={styles.quickNickText}>{n}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>선택 정보 확인</Text>
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
            pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
          ]}
        >
          <Text style={styles.completeBtnText}>반려이음 시작하기 🐾</Text>
        </Pressable>
      </View>
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
  slideTitle: { fontSize: 32, fontWeight: "800", color: "#1A1A1A", marginBottom: 8, textAlign: "center" },
  slideSubtitle: { fontSize: 20, fontWeight: "600", color: "#FF7043", marginBottom: 12, textAlign: "center" },
  slideDesc: { fontSize: 16, color: "#555", textAlign: "center", lineHeight: 24 },
  dotsRow: { flexDirection: "row", justifyContent: "center", gap: 8, paddingBottom: 16 },
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
  stepTitle: { fontSize: 26, fontWeight: "800", color: "#1A1A1A", marginBottom: 8 },
  stepSubtitle: { fontSize: 15, color: "#757575", marginBottom: 32 },
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
  roleBadge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, marginTop: 4 },
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
  neighborhoodBtnSelected: { borderColor: "#FF7043", backgroundColor: "#FFF3EE" },
  neighborhoodText: { fontSize: 14, fontWeight: "600", color: "#555" },
  neighborhoodTextSelected: { color: "#FF7043" },
  inputWrap: { marginBottom: 24 },
  inputLabel: { fontSize: 14, fontWeight: "600", color: "#555", marginBottom: 8 },
  textInput: {
    borderWidth: 1.5,
    borderColor: "#E0E0E0",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#fff",
    marginBottom: 12,
    fontSize: 16,
    color: "#1A1A1A",
  },
  quickNicknames: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  quickNick: {
    borderWidth: 1,
    borderColor: "#FF7043",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  quickNickText: { color: "#FF7043", fontSize: 13, fontWeight: "500" },
  summaryCard: {
    backgroundColor: "#F5F5F5",
    borderRadius: 16,
    padding: 16,
    gap: 8,
    marginBottom: 24,
  },
  summaryTitle: { fontSize: 14, fontWeight: "700", color: "#555", marginBottom: 4 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between" },
  summaryLabel: { fontSize: 14, color: "#757575" },
  summaryValue: { fontSize: 14, fontWeight: "600", color: "#1A1A1A" },
  completeBtn: {
    backgroundColor: "#FF7043",
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
  },
  completeBtnText: { color: "#fff", fontSize: 18, fontWeight: "700" },
});
