import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  StyleSheet,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useApp } from "@/lib/app-context";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { Fonts, Typography } from "@/hooks/use-fonts";
import { DAEJEON_DISTRICTS, type District } from "@/lib/daejeon-districts";

// ─── 상수 ───
const AVATARS = [
  "🐶", "🐱", "🐰", "🦊", "🐻",
  "🐼", "🐨", "🐯", "🦁", "🐸",
  "🐵", "🐮", "🐷", "🐺", "🦄",
];

type Step = "role" | "profile" | "district" | "dong" | "done";

export default function RegisterProfileScreen() {
  const { state, dispatch } = useApp();
  const router = useRouter();

  // ─── 상태 ───
  const [step, setStep] = useState<Step>("role");
  const [role, setRole] = useState<"owner" | "caretaker" | null>(null);
  const [nickname, setNickname] = useState("");
  const [avatar, setAvatar] = useState("🐶");
  const [selectedDistrict, setSelectedDistrict] = useState<District | null>(null);
  const [selectedDong, setSelectedDong] = useState<string | null>(null);
  const [bio, setBio] = useState("");

  // 애니메이션
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const haptic = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const animateTransition = (nextStep: Step) => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      setStep(nextStep);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }).start();
    });
  };

  // ─── 완료 처리 ───
  const handleComplete = () => {
    if (!role || !nickname.trim() || !selectedDistrict || !selectedDong) {
      Alert.alert("알림", "모든 항목을 입력해주세요.");
      return;
    }

    haptic();

    dispatch({
      type: "SET_ROLE",
      payload: role,
    });

    dispatch({
      type: "SET_PROFILE",
      payload: {
        nickname: nickname.trim(),
        avatarEmoji: avatar,
        neighborhood: `${selectedDistrict.name} ${selectedDong}`,
        bio: bio.trim(),
      },
    });

    dispatch({ type: "SET_ONBOARDED", payload: true });

    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    router.replace("/(tabs)" as never);
  };

  // ─── 진행률 ───
  const stepIndex = ["role", "profile", "district", "dong", "done"].indexOf(step);
  const progress = (stepIndex + 1) / 5;

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        {/* 상단 진행 바 */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <Animated.View
              style={[
                styles.progressFill,
                { width: `${progress * 100}%` as any },
              ]}
            />
          </View>
          <Text style={styles.progressText}>
            {stepIndex + 1} / 5
          </Text>
        </View>

        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
          {/* ─── Step 1: 역할 선택 ─── */}
          {step === "role" && (
            <ScrollView
              contentContainerStyle={styles.stepContainer}
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.stepTitle}>어떤 역할로{"\n"}시작하시겠어요?</Text>
              <Text style={styles.stepSubtitle}>
                나중에 설정에서 언제든 변경할 수 있어요
              </Text>

              <View style={styles.roleCards}>
                <Pressable
                  style={({ pressed }) => [
                    styles.roleCard,
                    role === "owner" && styles.roleCardSelected,
                    pressed && { transform: [{ scale: 0.97 }] },
                  ]}
                  onPress={() => { haptic(); setRole("owner"); }}
                >
                  <Text style={styles.roleEmoji}>🐕</Text>
                  <Text style={[
                    styles.roleTitle,
                    role === "owner" && styles.roleTitleSelected,
                  ]}>보호자</Text>
                  <Text style={styles.roleDesc}>
                    반려동물의 산책이나{"\n"}돌봄을 맡길 수 있어요
                  </Text>
                  {role === "owner" && (
                    <View style={styles.checkBadge}>
                      <Text style={styles.checkText}>✓</Text>
                    </View>
                  )}
                </Pressable>

                <Pressable
                  style={({ pressed }) => [
                    styles.roleCard,
                    role === "caretaker" && styles.roleCardSelected,
                    pressed && { transform: [{ scale: 0.97 }] },
                  ]}
                  onPress={() => { haptic(); setRole("caretaker"); }}
                >
                  <Text style={styles.roleEmoji}>🦮</Text>
                  <Text style={[
                    styles.roleTitle,
                    role === "caretaker" && styles.roleTitleSelected,
                  ]}>도그워커</Text>
                  <Text style={styles.roleDesc}>
                    반려동물의 산책이나{"\n"}돌봄 서비스를 제공해요
                  </Text>
                  {role === "caretaker" && (
                    <View style={styles.checkBadge}>
                      <Text style={styles.checkText}>✓</Text>
                    </View>
                  )}
                </Pressable>
              </View>

              <Pressable
                style={({ pressed }) => [
                  styles.nextButton,
                  !role && styles.nextButtonDisabled,
                  pressed && role ? { transform: [{ scale: 0.97 }] } : {},
                ]}
                onPress={() => role && animateTransition("profile")}
                disabled={!role}
              >
                <Text style={[
                  styles.nextButtonText,
                  !role && styles.nextButtonTextDisabled,
                ]}>다음</Text>
              </Pressable>
            </ScrollView>
          )}

          {/* ─── Step 2: 프로필 정보 ─── */}
          {step === "profile" && (
            <ScrollView
              contentContainerStyle={styles.stepContainer}
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.stepTitle}>프로필을{"\n"}설정해주세요</Text>
              <Text style={styles.stepSubtitle}>
                다른 사용자에게 보여질 정보예요
              </Text>

              {/* 아바타 선택 */}
              <View style={styles.avatarSection}>
                <View style={styles.selectedAvatar}>
                  <Text style={{ fontSize: 48 }}>{avatar}</Text>
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.avatarList}
                >
                  {AVATARS.map((a) => (
                    <Pressable
                      key={a}
                      style={({ pressed }) => [
                        styles.avatarItem,
                        avatar === a && styles.avatarItemSelected,
                        pressed && { transform: [{ scale: 0.9 }] },
                      ]}
                      onPress={() => { haptic(); setAvatar(a); }}
                    >
                      <Text style={{ fontSize: 28 }}>{a}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>

              {/* 닉네임 */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>닉네임</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="2~10자 닉네임을 입력하세요"
                  placeholderTextColor="#C7C7CC"
                  value={nickname}
                  onChangeText={setNickname}
                  maxLength={10}
                  returnKeyType="done"
                />
                <Text style={styles.charCount}>{nickname.length}/10</Text>
              </View>

              {/* 자기소개 */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>자기소개 (선택)</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  placeholder="간단한 자기소개를 작성해주세요"
                  placeholderTextColor="#C7C7CC"
                  value={bio}
                  onChangeText={setBio}
                  maxLength={100}
                  multiline
                  numberOfLines={3}
                />
                <Text style={styles.charCount}>{bio.length}/100</Text>
              </View>

              <View style={styles.buttonRow}>
                <Pressable
                  style={({ pressed }) => [
                    styles.backButton,
                    pressed && { transform: [{ scale: 0.97 }] },
                  ]}
                  onPress={() => animateTransition("role")}
                >
                  <Text style={styles.backButtonText}>이전</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [
                    styles.nextButton,
                    { flex: 1 },
                    nickname.trim().length < 2 && styles.nextButtonDisabled,
                    pressed && nickname.trim().length >= 2 ? { transform: [{ scale: 0.97 }] } : {},
                  ]}
                  onPress={() => nickname.trim().length >= 2 && animateTransition("district")}
                  disabled={nickname.trim().length < 2}
                >
                  <Text style={[
                    styles.nextButtonText,
                    nickname.trim().length < 2 && styles.nextButtonTextDisabled,
                  ]}>다음</Text>
                </Pressable>
              </View>
            </ScrollView>
          )}

          {/* ─── Step 3: 구 선택 ─── */}
          {step === "district" && (
            <ScrollView
              contentContainerStyle={styles.stepContainer}
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.stepTitle}>어느 구에{"\n"}거주하시나요?</Text>
              <Text style={styles.stepSubtitle}>
                대전광역시 5개 구 중 선택해주세요
              </Text>

              <View style={styles.districtGrid}>
                {DAEJEON_DISTRICTS.map((district) => (
                  <Pressable
                    key={district.name}
                    style={({ pressed }) => [
                      styles.districtCard,
                      selectedDistrict?.name === district.name && styles.districtCardSelected,
                      pressed && { transform: [{ scale: 0.97 }] },
                    ]}
                    onPress={() => {
                      haptic();
                      setSelectedDistrict(district);
                      setSelectedDong(null);
                    }}
                  >
                    <Text style={styles.districtEmoji}>{district.emoji}</Text>
                    <Text style={[
                      styles.districtName,
                      selectedDistrict?.name === district.name && styles.districtNameSelected,
                    ]}>{district.name}</Text>
                    <Text style={styles.districtDesc}>{district.description}</Text>
                    {selectedDistrict?.name === district.name && (
                      <View style={styles.checkBadgeSmall}>
                        <Text style={styles.checkTextSmall}>✓</Text>
                      </View>
                    )}
                  </Pressable>
                ))}
              </View>

              <View style={styles.buttonRow}>
                <Pressable
                  style={({ pressed }) => [
                    styles.backButton,
                    pressed && { transform: [{ scale: 0.97 }] },
                  ]}
                  onPress={() => animateTransition("profile")}
                >
                  <Text style={styles.backButtonText}>이전</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [
                    styles.nextButton,
                    { flex: 1 },
                    !selectedDistrict && styles.nextButtonDisabled,
                    pressed && selectedDistrict ? { transform: [{ scale: 0.97 }] } : {},
                  ]}
                  onPress={() => selectedDistrict && animateTransition("dong")}
                  disabled={!selectedDistrict}
                >
                  <Text style={[
                    styles.nextButtonText,
                    !selectedDistrict && styles.nextButtonTextDisabled,
                  ]}>다음</Text>
                </Pressable>
              </View>
            </ScrollView>
          )}

          {/* ─── Step 4: 동 선택 ─── */}
          {step === "dong" && selectedDistrict && (
            <ScrollView
              contentContainerStyle={styles.stepContainer}
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.stepTitle}>
                {selectedDistrict.emoji} {selectedDistrict.name}{"\n"}
                세부 동을 선택하세요
              </Text>
              <Text style={styles.stepSubtitle}>
                가장 가까운 동을 선택해주세요
              </Text>

              <View style={styles.dongGrid}>
                {selectedDistrict.dongs.map((dong) => (
                  <Pressable
                    key={dong}
                    style={({ pressed }) => [
                      styles.dongChip,
                      selectedDong === dong && styles.dongChipSelected,
                      pressed && { transform: [{ scale: 0.95 }] },
                    ]}
                    onPress={() => { haptic(); setSelectedDong(dong); }}
                  >
                    <Text style={[
                      styles.dongText,
                      selectedDong === dong && styles.dongTextSelected,
                    ]}>{dong}</Text>
                  </Pressable>
                ))}
              </View>

              {selectedDong && (
                <View style={styles.addressPreview}>
                  <Text style={styles.addressLabel}>선택된 주소</Text>
                  <Text style={styles.addressText}>
                    📍 대전광역시 {selectedDistrict.name} {selectedDong}
                  </Text>
                </View>
              )}

              <View style={styles.buttonRow}>
                <Pressable
                  style={({ pressed }) => [
                    styles.backButton,
                    pressed && { transform: [{ scale: 0.97 }] },
                  ]}
                  onPress={() => animateTransition("district")}
                >
                  <Text style={styles.backButtonText}>이전</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [
                    styles.nextButton,
                    { flex: 1 },
                    !selectedDong && styles.nextButtonDisabled,
                    pressed && selectedDong ? { transform: [{ scale: 0.97 }] } : {},
                  ]}
                  onPress={() => selectedDong && animateTransition("done")}
                  disabled={!selectedDong}
                >
                  <Text style={[
                    styles.nextButtonText,
                    !selectedDong && styles.nextButtonTextDisabled,
                  ]}>다음</Text>
                </Pressable>
              </View>
            </ScrollView>
          )}

          {/* ─── Step 5: 확인 및 완료 ─── */}
          {step === "done" && (
            <ScrollView
              contentContainerStyle={styles.stepContainer}
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.stepTitle}>프로필 확인</Text>
              <Text style={styles.stepSubtitle}>
                아래 정보로 시작할까요?
              </Text>

              <View style={styles.summaryCard}>
                <View style={styles.summaryAvatar}>
                  <Text style={{ fontSize: 56 }}>{avatar}</Text>
                </View>

                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>역할</Text>
                  <View style={[
                    styles.roleBadge,
                    role === "caretaker" ? { backgroundColor: "#E8F5E9" } : { backgroundColor: "#FFF3E0" },
                  ]}>
                    <Text style={[
                      styles.roleBadgeText,
                      role === "caretaker" ? { color: "#2E7D32" } : { color: "#E65100" },
                    ]}>
                      {role === "owner" ? "🐕 보호자" : "🦮 도그워커"}
                    </Text>
                  </View>
                </View>

                <View style={styles.summaryDivider} />

                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>닉네임</Text>
                  <Text style={styles.summaryValue}>{nickname}</Text>
                </View>

                <View style={styles.summaryDivider} />

                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>지역</Text>
                  <Text style={styles.summaryValue}>
                    📍 대전 {selectedDistrict?.name} {selectedDong}
                  </Text>
                </View>

                {bio.trim() && (
                  <>
                    <View style={styles.summaryDivider} />
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>소개</Text>
                      <Text style={[styles.summaryValue, { flex: 1 }]}>{bio}</Text>
                    </View>
                  </>
                )}
              </View>

              <View style={styles.buttonRow}>
                <Pressable
                  style={({ pressed }) => [
                    styles.backButton,
                    pressed && { transform: [{ scale: 0.97 }] },
                  ]}
                  onPress={() => animateTransition("dong")}
                >
                  <Text style={styles.backButtonText}>수정</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [
                    styles.completeButton,
                    pressed && { transform: [{ scale: 0.97 }] },
                  ]}
                  onPress={handleComplete}
                >
                  <Text style={styles.completeButtonText}>시작하기 🎉</Text>
                </Pressable>
              </View>
            </ScrollView>
          )}
        </Animated.View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
    gap: 12,
  },
  progressBar: {
    flex: 1,
    height: 4,
    backgroundColor: "#F0F0F0",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#FF6B35",
    borderRadius: 2,
  },
  progressText: {
    fontFamily: Fonts.medium,
    fontSize: 12,
    color: "#8E8E93",
  },
  content: {
    flex: 1,
  },
  stepContainer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  stepTitle: {
    ...Typography.h1,
    color: "#1A1A1A",
    marginTop: 16,
    marginBottom: 8,
  },
  stepSubtitle: {
    ...Typography.body,
    color: "#8E8E93",
    marginBottom: 32,
  },

  // ─── 역할 선택 ───
  roleCards: {
    gap: 16,
    marginBottom: 32,
  },
  roleCard: {
    backgroundColor: "#F8F8F8",
    borderRadius: 20,
    padding: 24,
    borderWidth: 2,
    borderColor: "transparent",
    position: "relative",
  },
  roleCardSelected: {
    borderColor: "#FF6B35",
    backgroundColor: "#FFF8F5",
  },
  roleEmoji: {
    fontSize: 40,
    marginBottom: 12,
  },
  roleTitle: {
    ...Typography.h3,
    color: "#1A1A1A",
    marginBottom: 6,
  },
  roleTitleSelected: {
    color: "#FF6B35",
  },
  roleDesc: {
    ...Typography.body,
    color: "#8E8E93",
    lineHeight: 20,
  },
  checkBadge: {
    position: "absolute",
    top: 16,
    right: 16,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#FF6B35",
    alignItems: "center",
    justifyContent: "center",
  },
  checkText: {
    color: "#FFFFFF",
    fontFamily: Fonts.bold,
    fontSize: 16,
  },

  // ─── 프로필 ───
  avatarSection: {
    alignItems: "center",
    marginBottom: 28,
  },
  selectedAvatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "#FFF3EE",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    borderWidth: 3,
    borderColor: "#FF6B35",
  },
  avatarList: {
    gap: 8,
    paddingHorizontal: 4,
  },
  avatarItem: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#F8F8F8",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarItemSelected: {
    backgroundColor: "#FFF3EE",
    borderWidth: 2,
    borderColor: "#FF6B35",
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    ...Typography.captionMedium,
    color: "#8E8E93",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  textInput: {
    backgroundColor: "#F8F8F8",
    borderRadius: 14,
    padding: 16,
    fontFamily: Fonts.regular,
    fontSize: 15,
    color: "#1A1A1A",
    borderWidth: 1,
    borderColor: "#E8E8E8",
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  charCount: {
    ...Typography.caption,
    color: "#C7C7CC",
    textAlign: "right",
    marginTop: 4,
  },

  // ─── 구 선택 ───
  districtGrid: {
    gap: 12,
    marginBottom: 32,
  },
  districtCard: {
    backgroundColor: "#F8F8F8",
    borderRadius: 16,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "transparent",
    position: "relative",
  },
  districtCardSelected: {
    borderColor: "#FF6B35",
    backgroundColor: "#FFF8F5",
  },
  districtEmoji: {
    fontSize: 32,
    marginRight: 16,
  },
  districtName: {
    ...Typography.subtitle,
    color: "#1A1A1A",
    marginRight: 8,
  },
  districtNameSelected: {
    color: "#FF6B35",
  },
  districtDesc: {
    ...Typography.caption,
    color: "#8E8E93",
    flex: 1,
  },
  checkBadgeSmall: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#FF6B35",
    alignItems: "center",
    justifyContent: "center",
  },
  checkTextSmall: {
    color: "#FFFFFF",
    fontFamily: Fonts.bold,
    fontSize: 13,
  },

  // ─── 동 선택 ───
  dongGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 24,
  },
  dongChip: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 24,
    backgroundColor: "#F8F8F8",
    borderWidth: 1.5,
    borderColor: "#E8E8E8",
  },
  dongChipSelected: {
    backgroundColor: "#FF6B35",
    borderColor: "#FF6B35",
  },
  dongText: {
    ...Typography.bodyMedium,
    color: "#1A1A1A",
  },
  dongTextSelected: {
    color: "#FFFFFF",
  },
  addressPreview: {
    backgroundColor: "#FFF8F5",
    borderRadius: 14,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#FFE0D0",
  },
  addressLabel: {
    ...Typography.captionMedium,
    color: "#FF6B35",
    marginBottom: 4,
  },
  addressText: {
    ...Typography.subtitle,
    color: "#1A1A1A",
  },

  // ─── 요약 ───
  summaryCard: {
    backgroundColor: "#F8F8F8",
    borderRadius: 20,
    padding: 24,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: "#E8E8E8",
  },
  summaryAvatar: {
    alignItems: "center",
    marginBottom: 20,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  summaryLabel: {
    ...Typography.captionMedium,
    color: "#8E8E93",
    width: 60,
  },
  summaryValue: {
    ...Typography.bodyMedium,
    color: "#1A1A1A",
    textAlign: "right",
  },
  summaryDivider: {
    height: 1,
    backgroundColor: "#E8E8E8",
    marginVertical: 12,
  },
  roleBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  roleBadgeText: {
    fontFamily: Fonts.semiBold,
    fontSize: 13,
  },

  // ─── 버튼 ───
  nextButton: {
    backgroundColor: "#FF6B35",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  nextButtonDisabled: {
    backgroundColor: "#E8E8E8",
  },
  nextButtonText: {
    ...Typography.button,
    color: "#FFFFFF",
  },
  nextButtonTextDisabled: {
    color: "#C7C7CC",
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  backButton: {
    backgroundColor: "#F0F0F0",
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: "center",
  },
  backButtonText: {
    ...Typography.button,
    color: "#8E8E93",
  },
  completeButton: {
    flex: 1,
    backgroundColor: "#FF6B35",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  completeButtonText: {
    ...Typography.button,
    color: "#FFFFFF",
  },
});
