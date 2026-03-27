import React, { useState, useRef, useCallback } from "react";
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
  ActivityIndicator,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useApp } from "@/lib/app-context";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { Fonts, Typography } from "@/hooks/use-fonts";
import { DAEJEON_DISTRICTS, type District } from "@/lib/daejeon-districts";
import {
  reverseGeocode,
  isInDaejeonBounds,
  DAEJEON_CENTER,
  type GeocodingResult,
} from "@/lib/kakao-geocoding";

// ─── 상수 ───
const AVATARS = [
  "🐶", "🐱", "🐰", "🦊", "🐻",
  "🐼", "🐨", "🐯", "🦁", "🐸",
  "🐵", "🐮", "🐷", "🐺", "🦄",
];

const MAX_ACTIVE_NEIGHBORHOODS = 3;

type Step = "role" | "profile" | "location" | "district" | "dong" | "activeAreas" | "done";

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

  // 위치 확인 상태
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationResult, setLocationResult] = useState<GeocodingResult | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [locationVerified, setLocationVerified] = useState(false);
  const [skipLocation, setSkipLocation] = useState(false);

  // 도그워커 활동 동네 선택 상태
  const [activeDistrict, setActiveDistrict] = useState<District | null>(null);
  const [activeNeighborhoods, setActiveNeighborhoods] = useState<string[]>([]);

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

  // ─── 위치 확인 ───
  const handleLocationCheck = useCallback(async () => {
    setLocationLoading(true);
    setLocationError(null);
    setLocationResult(null);

    try {
      let latitude = DAEJEON_CENTER.latitude;
      let longitude = DAEJEON_CENTER.longitude;

      // 실제 GPS 위치 가져오기 시도
      if (Platform.OS === "web") {
        try {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 10000,
            });
          });
          latitude = pos.coords.latitude;
          longitude = pos.coords.longitude;
        } catch {
          // 위치 권한 거부 시 대전 시청 좌표 사용 (데모)
        }
      } else {
        // React Native에서는 expo-location 사용
        try {
          const Location = require("expo-location");
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status === "granted") {
            const loc = await Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.Balanced,
            });
            latitude = loc.coords.latitude;
            longitude = loc.coords.longitude;
          }
        } catch {
          // expo-location 사용 불가 시 대전 시청 좌표 사용
        }
      }

      // 카카오맵 역지오코딩 API 호출
      const result = await reverseGeocode(latitude, longitude);
      setLocationResult(result);
      setLocationVerified(result.isDaejeon);

      if (result.isDaejeon) {
        if (Platform.OS !== "web") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        // 감지된 구로 자동 선택
        const detectedDistrict = DAEJEON_DISTRICTS.find(
          (d) => result.district.includes(d.name) || d.name.includes(result.district)
        );
        if (detectedDistrict) {
          setSelectedDistrict(detectedDistrict);
          // 감지된 동이 있으면 자동 선택
          if (result.dong) {
            const matchedDong = detectedDistrict.dongs.find(
              (d) => result.dong.includes(d) || d.includes(result.dong)
            );
            if (matchedDong) {
              setSelectedDong(matchedDong);
            }
          }
        }
      } else {
        if (Platform.OS !== "web") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        }
      }
    } catch (error: any) {
      setLocationError("위치 확인 중 오류가 발생했습니다. 수동으로 선택해주세요.");
    } finally {
      setLocationLoading(false);
    }
  }, []);

  // ─── 활동 동네 토글 ───
  const toggleActiveNeighborhood = (districtName: string, dong: string) => {
    const fullName = `${districtName} ${dong}`;
    setActiveNeighborhoods((prev) => {
      if (prev.includes(fullName)) {
        return prev.filter((n) => n !== fullName);
      }
      if (prev.length >= MAX_ACTIVE_NEIGHBORHOODS) {
        if (Platform.OS !== "web") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        }
        Alert.alert("알림", `활동 동네는 최대 ${MAX_ACTIVE_NEIGHBORHOODS}개까지 선택할 수 있습니다.`);
        return prev;
      }
      return [...prev, fullName];
    });
    haptic();
  };

  // ─── 완료 처리 ───
  const handleComplete = () => {
    if (!role || !nickname.trim() || !selectedDistrict || !selectedDong) {
      Alert.alert("알림", "모든 항목을 입력해주세요.");
      return;
    }

    if (role === "caretaker" && activeNeighborhoods.length === 0) {
      Alert.alert("알림", "활동 동네를 최소 1개 이상 선택해주세요.");
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
        activeNeighborhoods: role === "caretaker" ? activeNeighborhoods : [],
        locationVerified,
      },
    });

    dispatch({ type: "SET_ONBOARDED", payload: true });

    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    router.replace("/(tabs)" as never);
  };

  // ─── 진행률 ───
  const allSteps: Step[] = role === "caretaker"
    ? ["role", "profile", "location", "district", "dong", "activeAreas", "done"]
    : ["role", "profile", "location", "district", "dong", "done"];
  const stepIndex = allSteps.indexOf(step);
  const progress = (stepIndex + 1) / allSteps.length;

  // ─── 다음 스텝 결정 ───
  const getNextAfterDong = (): Step => {
    return role === "caretaker" ? "activeAreas" : "done";
  };

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
            {stepIndex + 1} / {allSteps.length}
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
                  onPress={() => nickname.trim().length >= 2 && animateTransition("location")}
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

          {/* ─── Step 3: 위치 확인 (카카오맵 역지오코딩) ─── */}
          {step === "location" && (
            <ScrollView
              contentContainerStyle={styles.stepContainer}
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.stepTitle}>현재 위치를{"\n"}확인할게요</Text>
              <Text style={styles.stepSubtitle}>
                반려이음은 대전광역시 전용 서비스입니다.{"\n"}
                위치 확인으로 대전 거주 여부를 인증해요.
              </Text>

              {/* 위치 확인 카드 */}
              <View style={styles.locationCard}>
                <Text style={{ fontSize: 48, textAlign: "center", marginBottom: 16 }}>📍</Text>

                {!locationResult && !locationLoading && !locationError && (
                  <>
                    <Text style={styles.locationCardTitle}>
                      위치 권한을 허용하면{"\n"}자동으로 대전 여부를 확인합니다
                    </Text>
                    <Pressable
                      style={({ pressed }) => [
                        styles.locationButton,
                        pressed && { transform: [{ scale: 0.97 }], opacity: 0.9 },
                      ]}
                      onPress={handleLocationCheck}
                    >
                      <Text style={styles.locationButtonText}>현재 위치 확인하기</Text>
                    </Pressable>
                  </>
                )}

                {locationLoading && (
                  <View style={styles.locationLoadingBox}>
                    <ActivityIndicator size="large" color="#2E7D32" />
                    <Text style={styles.locationLoadingText}>
                      카카오맵 API로 위치를 확인하고 있어요...
                    </Text>
                  </View>
                )}

                {locationResult && locationResult.isDaejeon && (
                  <View style={styles.locationSuccessBox}>
                    <Text style={{ fontSize: 36, textAlign: "center", marginBottom: 8 }}>✅</Text>
                    <Text style={styles.locationSuccessTitle}>대전 거주 확인 완료!</Text>
                    <Text style={styles.locationSuccessAddress}>
                      {locationResult.fullAddress}
                    </Text>
                    {locationResult.district && (
                      <View style={styles.detectedDistrictBadge}>
                        <Text style={styles.detectedDistrictText}>
                          감지된 구: {locationResult.district}
                        </Text>
                      </View>
                    )}
                  </View>
                )}

                {locationResult && !locationResult.isDaejeon && (
                  <View style={styles.locationWarningBox}>
                    <Text style={{ fontSize: 36, textAlign: "center", marginBottom: 8 }}>⚠️</Text>
                    <Text style={styles.locationWarningTitle}>대전 외 지역이 감지되었습니다</Text>
                    <Text style={styles.locationWarningDesc}>
                      감지된 위치: {locationResult.fullAddress || "알 수 없음"}{"\n\n"}
                      반려이음은 대전광역시 전용 서비스입니다.{"\n"}
                      대전에 거주하신다면 아래에서 수동으로 지역을 선택해주세요.
                    </Text>
                    <Pressable
                      style={({ pressed }) => [
                        styles.retryButton,
                        pressed && { transform: [{ scale: 0.97 }] },
                      ]}
                      onPress={handleLocationCheck}
                    >
                      <Text style={styles.retryButtonText}>다시 확인하기</Text>
                    </Pressable>
                  </View>
                )}

                {locationError && (
                  <View style={styles.locationWarningBox}>
                    <Text style={{ fontSize: 36, textAlign: "center", marginBottom: 8 }}>❌</Text>
                    <Text style={styles.locationWarningTitle}>위치 확인 실패</Text>
                    <Text style={styles.locationWarningDesc}>{locationError}</Text>
                    <Pressable
                      style={({ pressed }) => [
                        styles.retryButton,
                        pressed && { transform: [{ scale: 0.97 }] },
                      ]}
                      onPress={handleLocationCheck}
                    >
                      <Text style={styles.retryButtonText}>다시 시도</Text>
                    </Pressable>
                  </View>
                )}
              </View>

              {/* 수동 선택 옵션 */}
              {(locationResult?.isDaejeon === false || locationError || skipLocation) && (
                <View style={styles.manualSelectNotice}>
                  <Text style={styles.manualSelectText}>
                    위치 확인 없이 수동으로 지역을 선택할 수 있습니다.
                  </Text>
                </View>
              )}

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
                    pressed ? { transform: [{ scale: 0.97 }] } : {},
                  ]}
                  onPress={() => {
                    if (!locationResult && !locationError && !skipLocation) {
                      setSkipLocation(true);
                    }
                    animateTransition("district");
                  }}
                >
                  <Text style={styles.nextButtonText}>
                    {locationVerified ? "다음" : "수동으로 선택하기"}
                  </Text>
                </Pressable>
              </View>
            </ScrollView>
          )}

          {/* ─── Step 4: 구 선택 ─── */}
          {step === "district" && (
            <ScrollView
              contentContainerStyle={styles.stepContainer}
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.stepTitle}>어느 구에{"\n"}거주하시나요?</Text>
              <Text style={styles.stepSubtitle}>
                대전광역시 5개 구 중 선택해주세요
                {locationVerified && locationResult?.district
                  ? `\n(${locationResult.district}이(가) 감지되었습니다)`
                  : ""}
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
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                        <Text style={[
                          styles.districtName,
                          selectedDistrict?.name === district.name && styles.districtNameSelected,
                        ]}>{district.name}</Text>
                        {locationVerified && locationResult?.district?.includes(district.name) && (
                          <View style={styles.detectedBadge}>
                            <Text style={styles.detectedBadgeText}>GPS 감지</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.districtDesc}>{district.description}</Text>
                    </View>
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
                  onPress={() => animateTransition("location")}
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

          {/* ─── Step 5: 동 선택 ─── */}
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
                  onPress={() => selectedDong && animateTransition(getNextAfterDong())}
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

          {/* ─── Step 6: 도그워커 활동 동네 선택 (최대 3개) ─── */}
          {step === "activeAreas" && role === "caretaker" && (
            <ScrollView
              contentContainerStyle={styles.stepContainer}
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.stepTitle}>활동할 동네를{"\n"}선택해주세요</Text>
              <Text style={styles.stepSubtitle}>
                산책 서비스를 제공할 동네를 최대 {MAX_ACTIVE_NEIGHBORHOODS}개까지 선택할 수 있어요.{"\n"}
                여러 구에 걸쳐 선택할 수 있습니다.
              </Text>

              {/* 선택된 동네 표시 */}
              {activeNeighborhoods.length > 0 && (
                <View style={styles.selectedAreasBox}>
                  <Text style={styles.selectedAreasTitle}>
                    선택된 활동 동네 ({activeNeighborhoods.length}/{MAX_ACTIVE_NEIGHBORHOODS})
                  </Text>
                  <View style={styles.selectedAreaChips}>
                    {activeNeighborhoods.map((area) => (
                      <Pressable
                        key={area}
                        style={({ pressed }) => [
                          styles.selectedAreaChip,
                          pressed && { opacity: 0.7 },
                        ]}
                        onPress={() => {
                          haptic();
                          setActiveNeighborhoods((prev) => prev.filter((n) => n !== area));
                        }}
                      >
                        <Text style={styles.selectedAreaChipText}>{area}</Text>
                        <Text style={styles.selectedAreaRemove}>✕</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              )}

              {/* 구 선택 탭 */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.areaDistrictTabs}
              >
                {DAEJEON_DISTRICTS.map((district) => {
                  const isSelected = activeDistrict?.name === district.name;
                  const countInDistrict = activeNeighborhoods.filter(
                    (n) => n.startsWith(district.name)
                  ).length;
                  return (
                    <Pressable
                      key={district.name}
                      style={({ pressed }) => [
                        styles.areaDistrictTab,
                        isSelected && styles.areaDistrictTabSelected,
                        pressed && { transform: [{ scale: 0.95 }] },
                      ]}
                      onPress={() => { haptic(); setActiveDistrict(district); }}
                    >
                      <Text style={[
                        styles.areaDistrictTabText,
                        isSelected && styles.areaDistrictTabTextSelected,
                      ]}>
                        {district.emoji} {district.name}
                        {countInDistrict > 0 ? ` (${countInDistrict})` : ""}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              {/* 동네 목록 */}
              {activeDistrict && (
                <View style={styles.areaDongGrid}>
                  {activeDistrict.dongs.map((dong) => {
                    const fullName = `${activeDistrict.name} ${dong}`;
                    const isActive = activeNeighborhoods.includes(fullName);
                    const isDisabled = !isActive && activeNeighborhoods.length >= MAX_ACTIVE_NEIGHBORHOODS;
                    return (
                      <Pressable
                        key={dong}
                        style={({ pressed }) => [
                          styles.areaDongChip,
                          isActive && styles.areaDongChipActive,
                          isDisabled && styles.areaDongChipDisabled,
                          pressed && !isDisabled && { transform: [{ scale: 0.95 }] },
                        ]}
                        onPress={() => !isDisabled && toggleActiveNeighborhood(activeDistrict.name, dong)}
                        disabled={isDisabled && !isActive}
                      >
                        <Text style={[
                          styles.areaDongText,
                          isActive && styles.areaDongTextActive,
                          isDisabled && styles.areaDongTextDisabled,
                        ]}>{dong}</Text>
                        {isActive && <Text style={styles.areaDongCheck}>✓</Text>}
                      </Pressable>
                    );
                  })}
                </View>
              )}

              {!activeDistrict && (
                <View style={styles.areaPlaceholder}>
                  <Text style={styles.areaPlaceholderText}>
                    위에서 구를 선택하면 동네 목록이 표시됩니다
                  </Text>
                </View>
              )}

              <View style={styles.buttonRow}>
                <Pressable
                  style={({ pressed }) => [
                    styles.backButton,
                    pressed && { transform: [{ scale: 0.97 }] },
                  ]}
                  onPress={() => animateTransition("dong")}
                >
                  <Text style={styles.backButtonText}>이전</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [
                    styles.nextButton,
                    { flex: 1 },
                    activeNeighborhoods.length === 0 && styles.nextButtonDisabled,
                    pressed && activeNeighborhoods.length > 0 ? { transform: [{ scale: 0.97 }] } : {},
                  ]}
                  onPress={() => activeNeighborhoods.length > 0 && animateTransition("done")}
                  disabled={activeNeighborhoods.length === 0}
                >
                  <Text style={[
                    styles.nextButtonText,
                    activeNeighborhoods.length === 0 && styles.nextButtonTextDisabled,
                  ]}>다음</Text>
                </Pressable>
              </View>
            </ScrollView>
          )}

          {/* ─── 최종: 확인 및 완료 ─── */}
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
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Text style={styles.summaryValue}>
                      📍 대전 {selectedDistrict?.name} {selectedDong}
                    </Text>
                    {locationVerified && (
                      <View style={styles.verifiedBadge}>
                        <Text style={styles.verifiedBadgeText}>인증됨</Text>
                      </View>
                    )}
                  </View>
                </View>

                {role === "caretaker" && activeNeighborhoods.length > 0 && (
                  <>
                    <View style={styles.summaryDivider} />
                    <View style={{ paddingVertical: 4 }}>
                      <Text style={styles.summaryLabel}>활동 동네</Text>
                      <View style={styles.summaryActiveAreas}>
                        {activeNeighborhoods.map((area) => (
                          <View key={area} style={styles.summaryAreaChip}>
                            <Text style={styles.summaryAreaChipText}>{area}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  </>
                )}

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
                  onPress={() => animateTransition(role === "caretaker" ? "activeAreas" : "dong")}
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
    backgroundColor: "#2E7D32",
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
  roleCards: { gap: 16, marginBottom: 32 },
  roleCard: {
    backgroundColor: "#F8F8F8",
    borderRadius: 20,
    padding: 24,
    borderWidth: 2,
    borderColor: "transparent",
    position: "relative",
  },
  roleCardSelected: { borderColor: "#2E7D32", backgroundColor: "#E8F5E9" },
  roleEmoji: { fontSize: 40, marginBottom: 12 },
  roleTitle: { ...Typography.h3, color: "#1A1A1A", marginBottom: 6 },
  roleTitleSelected: { color: "#2E7D32" },
  roleDesc: { ...Typography.body, color: "#8E8E93", lineHeight: 20 },
  checkBadge: {
    position: "absolute",
    top: 16,
    right: 16,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#2E7D32",
    alignItems: "center",
    justifyContent: "center",
  },
  checkText: { color: "#FFFFFF", fontFamily: Fonts.bold, fontSize: 16 },

  // ─── 프로필 ───
  avatarSection: { alignItems: "center", marginBottom: 28 },
  selectedAvatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "#E8F5E9",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    borderWidth: 3,
    borderColor: "#2E7D32",
  },
  avatarList: { gap: 8, paddingHorizontal: 4 },
  avatarItem: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#F8F8F8",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarItemSelected: { backgroundColor: "#E8F5E9", borderWidth: 2, borderColor: "#2E7D32" },
  inputGroup: { marginBottom: 20 },
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
  textArea: { minHeight: 80, textAlignVertical: "top" },
  charCount: { ...Typography.caption, color: "#C7C7CC", textAlign: "right", marginTop: 4 },

  // ─── 위치 확인 ───
  locationCard: {
    backgroundColor: "#F8F8F8",
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#E8E8E8",
  },
  locationCardTitle: {
    ...Typography.bodyMedium,
    color: "#1A1A1A",
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 22,
  },
  locationButton: {
    backgroundColor: "#2E7D32",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  locationButtonText: { ...Typography.button, color: "#FFFFFF" },
  locationLoadingBox: { alignItems: "center", gap: 12, paddingVertical: 8 },
  locationLoadingText: { ...Typography.body, color: "#8E8E93", textAlign: "center" },
  locationSuccessBox: { alignItems: "center", paddingVertical: 4 },
  locationSuccessTitle: { ...Typography.h3, color: "#2E7D32", marginBottom: 8 },
  locationSuccessAddress: { ...Typography.body, color: "#1A1A1A", textAlign: "center" },
  detectedDistrictBadge: {
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 12,
  },
  detectedDistrictText: { fontFamily: Fonts.semiBold, fontSize: 13, color: "#2E7D32" },
  locationWarningBox: { alignItems: "center", paddingVertical: 4 },
  locationWarningTitle: { ...Typography.h3, color: "#E65100", marginBottom: 8 },
  locationWarningDesc: { ...Typography.body, color: "#8E8E93", textAlign: "center", lineHeight: 20, marginBottom: 16 },
  retryButton: {
    backgroundColor: "#FFF3E0",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  retryButtonText: { fontFamily: Fonts.semiBold, fontSize: 14, color: "#E65100" },
  manualSelectNotice: {
    backgroundColor: "#E8F5E9",
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#FFE0D0",
  },
  manualSelectText: { ...Typography.caption, color: "#2E7D32", textAlign: "center" },
  detectedBadge: {
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  detectedBadgeText: { fontFamily: Fonts.medium, fontSize: 10, color: "#2E7D32" },

  // ─── 구 선택 ───
  districtGrid: { gap: 12, marginBottom: 32 },
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
  districtCardSelected: { borderColor: "#2E7D32", backgroundColor: "#E8F5E9" },
  districtEmoji: { fontSize: 32, marginRight: 16 },
  districtName: { ...Typography.subtitle, color: "#1A1A1A", marginRight: 8 },
  districtNameSelected: { color: "#2E7D32" },
  districtDesc: { ...Typography.caption, color: "#8E8E93" },
  checkBadgeSmall: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#2E7D32",
    alignItems: "center",
    justifyContent: "center",
  },
  checkTextSmall: { color: "#FFFFFF", fontFamily: Fonts.bold, fontSize: 13 },

  // ─── 동 선택 ───
  dongGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 24 },
  dongChip: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 24,
    backgroundColor: "#F8F8F8",
    borderWidth: 1.5,
    borderColor: "#E8E8E8",
  },
  dongChipSelected: { backgroundColor: "#2E7D32", borderColor: "#2E7D32" },
  dongText: { ...Typography.bodyMedium, color: "#1A1A1A" },
  dongTextSelected: { color: "#FFFFFF" },
  addressPreview: {
    backgroundColor: "#E8F5E9",
    borderRadius: 14,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#FFE0D0",
  },
  addressLabel: { ...Typography.captionMedium, color: "#2E7D32", marginBottom: 4 },
  addressText: { ...Typography.subtitle, color: "#1A1A1A" },

  // ─── 활동 동네 선택 ───
  selectedAreasBox: {
    backgroundColor: "#E8F5E9",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#FFE0D0",
  },
  selectedAreasTitle: {
    fontFamily: Fonts.semiBold,
    fontSize: 13,
    color: "#2E7D32",
    marginBottom: 10,
  },
  selectedAreaChips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  selectedAreaChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2E7D32",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  selectedAreaChipText: { fontFamily: Fonts.medium, fontSize: 13, color: "#FFFFFF" },
  selectedAreaRemove: { fontSize: 12, color: "#FFFFFF", opacity: 0.8 },
  areaDistrictTabs: { gap: 8, marginBottom: 16, paddingVertical: 4 },
  areaDistrictTab: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    backgroundColor: "#F0F0F0",
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  areaDistrictTabSelected: { backgroundColor: "#E8F5E9", borderColor: "#2E7D32" },
  areaDistrictTabText: { fontFamily: Fonts.medium, fontSize: 13, color: "#8E8E93" },
  areaDistrictTabTextSelected: { color: "#2E7D32" },
  areaDongGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 24 },
  areaDongChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 22,
    backgroundColor: "#F8F8F8",
    borderWidth: 1.5,
    borderColor: "#E8E8E8",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  areaDongChipActive: { backgroundColor: "#2E7D32", borderColor: "#2E7D32" },
  areaDongChipDisabled: { opacity: 0.4 },
  areaDongText: { fontFamily: Fonts.medium, fontSize: 14, color: "#1A1A1A" },
  areaDongTextActive: { color: "#FFFFFF" },
  areaDongTextDisabled: { color: "#C7C7CC" },
  areaDongCheck: { fontSize: 12, color: "#FFFFFF", fontFamily: Fonts.bold },
  areaPlaceholder: {
    backgroundColor: "#F8F8F8",
    borderRadius: 16,
    padding: 32,
    alignItems: "center",
    marginBottom: 24,
  },
  areaPlaceholderText: { ...Typography.body, color: "#C7C7CC", textAlign: "center" },

  // ─── 요약 ───
  summaryCard: {
    backgroundColor: "#F8F8F8",
    borderRadius: 20,
    padding: 24,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: "#E8E8E8",
  },
  summaryAvatar: { alignItems: "center", marginBottom: 20 },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  summaryLabel: { ...Typography.captionMedium, color: "#8E8E93", width: 70 },
  summaryValue: { ...Typography.bodyMedium, color: "#1A1A1A", textAlign: "right" },
  summaryDivider: { height: 1, backgroundColor: "#E8E8E8", marginVertical: 12 },
  roleBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  roleBadgeText: { fontFamily: Fonts.semiBold, fontSize: 13 },
  verifiedBadge: {
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  verifiedBadgeText: { fontFamily: Fonts.semiBold, fontSize: 10, color: "#2E7D32" },
  summaryActiveAreas: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 },
  summaryAreaChip: {
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#FFE0D0",
  },
  summaryAreaChipText: { fontFamily: Fonts.medium, fontSize: 12, color: "#2E7D32" },

  // ─── 버튼 ───
  nextButton: {
    backgroundColor: "#2E7D32",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  nextButtonDisabled: { backgroundColor: "#E8E8E8" },
  nextButtonText: { ...Typography.button, color: "#FFFFFF" },
  nextButtonTextDisabled: { color: "#C7C7CC" },
  buttonRow: { flexDirection: "row", gap: 12, marginTop: 8 },
  backButton: {
    backgroundColor: "#F0F0F0",
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: "center",
  },
  backButtonText: { ...Typography.button, color: "#8E8E93" },
  completeButton: {
    flex: 1,
    backgroundColor: "#2E7D32",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  completeButtonText: { ...Typography.button, color: "#FFFFFF" },
});
