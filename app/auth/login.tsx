import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  StyleSheet,
  Animated,
} from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { Fonts, Typography } from "@/hooks/use-fonts";
import { useApp } from "@/lib/app-context";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

type AuthMode = "login" | "register";
type AppRole = "owner" | "walker";

export default function LoginScreen() {
  const router = useRouter();
  const { dispatch } = useApp();

  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [appRole, setAppRole] = useState<AppRole>("owner");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Animation
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const switchMode = (newMode: AuthMode) => {
    Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => {
      setMode(newMode);
      setError("");
      Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    });
  };

  const validateForm = (): boolean => {
    setError("");
    if (!email.trim()) { setError("이메일을 입력해주세요"); return false; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError("유효한 이메일 형식이 아닙니다"); return false; }
    if (!password) { setError("비밀번호를 입력해주세요"); return false; }
    if (password.length < 8) { setError("비밀번호는 8자 이상이어야 합니다"); return false; }
    if (mode === "register") {
      if (!name.trim()) { setError("이름을 입력해주세요"); return false; }
      if (password !== confirmPassword) { setError("비밀번호가 일치하지 않습니다"); return false; }
    }
    return true;
  };

  const handleEmailAuth = async () => {
    if (!validateForm()) return;
    setLoading(true);
    setError("");

    try {
      // tRPC API 호출 (서버 연동)
      const endpoint = mode === "register" ? "/api/trpc/auth.register" : "/api/trpc/auth.login";
      const body = mode === "register"
        ? { email, password, name, appRole }
        : { email, password };

      const response = await fetch(`http://127.0.0.1:3000${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });

      if (response.ok) {
        const data = await response.json();
        if (data?.result?.data?.success) {
          const user = data.result.data.user;
          // AppContext에 로그인 상태 반영
          dispatch({
            type: "SET_PROFILE",
            payload: {
              nickname: user.name || name,
            },
          });
          dispatch({ type: "SET_ROLE", payload: user.appRole === "walker" ? "caretaker" : "owner" });
          if (mode === "register") {
            // 회원가입 성공 → 프로필 등록 화면으로 이동
            router.replace("/auth/register-profile" as never);
          } else {
            // 로그인 성공 → 메인 화면으로 이동
            dispatch({ type: "SET_ONBOARDED", payload: true });
            router.replace("/(tabs)" as never);
          }
        } else {
          setError(data?.result?.data?.message || "인증에 실패했습니다");
        }
      } else {
        setError("서버 연결에 실패했습니다. 잠시 후 다시 시도해주세요.");
      }
    } catch (err) {
      // 서버 미연결 시 로컬 모드로 진행
      dispatch({
        type: "SET_PROFILE",
        payload: {
          nickname: mode === "register" ? name : email.split("@")[0],
        },
      });
      dispatch({ type: "SET_ROLE", payload: appRole === "walker" ? "caretaker" : "owner" });
      if (mode === "register") {
        router.replace("/auth/register-profile" as never);
      } else {
        dispatch({ type: "SET_ONBOARDED", payload: true });
        router.replace("/(tabs)" as never);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleKakaoLogin = async () => {
    setLoading(true);
    setError("");

    try {
      // 카카오 SDK 연동 (실제 구현 시 react-native-kakao-login 사용)
      // 캡스톤 데모에서는 시뮬레이션
      const mockKakaoId = `kakao_${Date.now()}`;
      
      const response = await fetch("http://127.0.0.1:3000/api/trpc/auth.kakaoLogin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ kakaoId: mockKakaoId, appRole }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data?.result?.data?.success) {
          const user = data.result.data.user;
          dispatch({
            type: "SET_PROFILE",
            payload: {
              nickname: user.name || "카카오 사용자",
            },
          });
          dispatch({ type: "SET_ROLE", payload: user.appRole === "walker" ? "caretaker" : "owner" });
          dispatch({ type: "SET_ONBOARDED", payload: true });
          router.replace("/(tabs)" as never);
          return;
        }
      }
      // 서버 미연결 시 로컬 모드 → 프로필 등록으로 이동
      dispatch({
        type: "SET_PROFILE",
        payload: { nickname: "카카오 사용자" },
      });
      dispatch({ type: "SET_ROLE", payload: appRole === "walker" ? "caretaker" : "owner" });
      router.replace("/auth/register-profile" as never);
    } catch {
      dispatch({
        type: "SET_PROFILE",
        payload: { nickname: "카카오 사용자" },
      });
      dispatch({ type: "SET_ROLE", payload: appRole === "walker" ? "caretaker" : "owner" });
      router.replace("/auth/register-profile" as never);
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    // 게스트 모드로 프로필 등록 화면으로 이동
    router.replace("/auth/register-profile" as never);
  };

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#FFFFFF" },
    scrollContent: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 40 },
    header: { alignItems: "center", marginTop: 48, marginBottom: 36 },
    logoCircle: {
      width: 72, height: 72, borderRadius: 36,
      backgroundColor: "#2E7D32", alignItems: "center", justifyContent: "center",
      marginBottom: 16,
    },
    appTitle: { ...Typography.h1, color: "#1A1A1A", marginBottom: 4 },
    appSubtitle: { ...Typography.body, color: "#8E8E93", textAlign: "center" },

    // Tab switcher
    tabRow: {
      flexDirection: "row", backgroundColor: "#F8F8F8",
      borderRadius: 12, padding: 4, marginBottom: 24,
    },
    tab: {
      flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: "center",
    },
    tabActive: { backgroundColor: "#FFFFFF", shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
    tabText: { ...Typography.bodyMedium, color: "#8E8E93" },
    tabTextActive: { ...Typography.bodyMedium, color: "#1A1A1A" },

    // Role selector
    roleSection: { marginBottom: 24 },
    roleSectionTitle: { ...Typography.captionMedium, color: "#8E8E93", marginBottom: 10, textTransform: "uppercase", letterSpacing: 1 },
    roleRow: { flexDirection: "row", gap: 12 },
    roleCard: {
      flex: 1, padding: 16, borderRadius: 14, borderWidth: 2,
      borderColor: "#E8E8E8", backgroundColor: "#F8F8F8", alignItems: "center", gap: 8,
    },
    roleCardActive: { borderColor: "#2E7D32", backgroundColor: `${"#2E7D32"}10` },
    roleIcon: { fontSize: 28 },
    roleLabel: { ...Typography.bodyMedium, color: "#1A1A1A" },
    roleLabelActive: { color: "#2E7D32" },
    roleDesc: { ...Typography.caption, color: "#8E8E93", textAlign: "center" },

    // Input
    inputGroup: { marginBottom: 16 },
    inputLabel: { ...Typography.captionMedium, color: "#8E8E93", marginBottom: 6 },
    inputWrapper: {
      flexDirection: "row", alignItems: "center",
      backgroundColor: "#F8F8F8", borderRadius: 12,
      borderWidth: 1, borderColor: "#E8E8E8", paddingHorizontal: 14,
    },
    inputWrapperFocused: { borderColor: "#2E7D32" },
    inputIcon: { marginRight: 10 },
    input: {
      flex: 1, paddingVertical: 14, fontFamily: Fonts.regular, fontSize: 15,
      color: "#1A1A1A",
    },
    eyeBtn: { padding: 4 },

    // Error
    errorBox: {
      flexDirection: "row", alignItems: "center", gap: 8,
      backgroundColor: `${"#FF3B30"}15`, borderRadius: 10, padding: 12, marginBottom: 16,
    },
    errorText: { ...Typography.caption, color: "#FF3B30", flex: 1 },

    // Buttons
    primaryBtn: {
      backgroundColor: "#2E7D32", borderRadius: 14, paddingVertical: 16,
      alignItems: "center", marginBottom: 12,
    },
    primaryBtnDisabled: { opacity: 0.6 },
    primaryBtnText: { ...Typography.button, color: "#FFFFFF" },

    kakaoBtn: {
      backgroundColor: "#FEE500", borderRadius: 14, paddingVertical: 16,
      flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
      marginBottom: 12,
    },
    kakaoBtnText: { ...Typography.button, color: "#191919" },

    dividerRow: { flexDirection: "row", alignItems: "center", marginVertical: 16 },
    dividerLine: { flex: 1, height: 1, backgroundColor: "#E8E8E8" },
    dividerText: { ...Typography.caption, color: "#8E8E93", marginHorizontal: 16 },

    skipBtn: { alignItems: "center", paddingVertical: 12 },
    skipText: { ...Typography.bodyMedium, color: "#8E8E93", textDecorationLine: "underline" },

    footer: { alignItems: "center", marginTop: 24 },
    footerText: { ...Typography.caption, color: "#8E8E93", textAlign: "center", lineHeight: 18 },
  });

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logoCircle}>
              <Text style={{ fontSize: 36 }}>🐾</Text>
            </View>
            <Text style={styles.appTitle}>반려이음</Text>
            <Text style={styles.appSubtitle}>대전 반려동물 돌봄 매칭 서비스</Text>
          </View>

          <Animated.View style={{ opacity: fadeAnim }}>
            {/* Login / Register Tab */}
            <View style={styles.tabRow}>
              <TouchableOpacity
                style={[styles.tab, mode === "login" && styles.tabActive]}
                onPress={() => switchMode("login")}
                activeOpacity={0.7}
              >
                <Text style={[styles.tabText, mode === "login" && styles.tabTextActive]}>로그인</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, mode === "register" && styles.tabActive]}
                onPress={() => switchMode("register")}
                activeOpacity={0.7}
              >
                <Text style={[styles.tabText, mode === "register" && styles.tabTextActive]}>회원가입</Text>
              </TouchableOpacity>
            </View>

            {/* Role Selector (always visible) */}
            <View style={styles.roleSection}>
              <Text style={styles.roleSectionTitle}>역할 선택</Text>
              <View style={styles.roleRow}>
                <TouchableOpacity
                  style={[styles.roleCard, appRole === "owner" && styles.roleCardActive]}
                  onPress={() => setAppRole("owner")}
                  activeOpacity={0.7}
                >
                  <Text style={styles.roleIcon}>🏠</Text>
                  <Text style={[styles.roleLabel, appRole === "owner" && styles.roleLabelActive]}>보호자</Text>
                  <Text style={styles.roleDesc}>반려동물 산책/돌봄{"\n"}서비스를 이용합니다</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.roleCard, appRole === "walker" && styles.roleCardActive]}
                  onPress={() => setAppRole("walker")}
                  activeOpacity={0.7}
                >
                  <Text style={styles.roleIcon}>🚶</Text>
                  <Text style={[styles.roleLabel, appRole === "walker" && styles.roleLabelActive]}>도그워커</Text>
                  <Text style={styles.roleDesc}>전문 산책/돌봄{"\n"}서비스를 제공합니다</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Name Input (Register only) */}
            {mode === "register" && (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>이름</Text>
                <View style={styles.inputWrapper}>
                  <MaterialIcons name="person" size={20} color="#8E8E93" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="이름을 입력하세요"
                    placeholderTextColor={"#8E8E93"}
                    value={name}
                    onChangeText={setName}
                    autoCapitalize="none"
                    returnKeyType="next"
                  />
                </View>
              </View>
            )}

            {/* Email Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>이메일</Text>
              <View style={styles.inputWrapper}>
                <MaterialIcons name="email" size={20} color="#8E8E93" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="example@email.com"
                  placeholderTextColor={"#8E8E93"}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  returnKeyType="next"
                />
              </View>
            </View>

            {/* Password Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>비밀번호</Text>
              <View style={styles.inputWrapper}>
                <MaterialIcons name="lock" size={20} color="#8E8E93" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="8자 이상 입력하세요"
                  placeholderTextColor={"#8E8E93"}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  returnKeyType={mode === "register" ? "next" : "done"}
                  onSubmitEditing={mode === "login" ? handleEmailAuth : undefined}
                />
                <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPassword(!showPassword)}>
                  <MaterialIcons name={showPassword ? "visibility" : "visibility-off"} size={20} color="#8E8E93" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Confirm Password (Register only) */}
            {mode === "register" && (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>비밀번호 확인</Text>
                <View style={styles.inputWrapper}>
                  <MaterialIcons name="lock-outline" size={20} color="#8E8E93" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="비밀번호를 다시 입력하세요"
                    placeholderTextColor={"#8E8E93"}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    returnKeyType="done"
                    onSubmitEditing={handleEmailAuth}
                  />
                </View>
              </View>
            )}

            {/* Error Message */}
            {error ? (
              <View style={styles.errorBox}>
                <MaterialIcons name="error-outline" size={18} color="#FF3B30" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* Primary Button */}
            <TouchableOpacity
              style={[styles.primaryBtn, loading && styles.primaryBtnDisabled]}
              onPress={handleEmailAuth}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.primaryBtnText}>
                  {mode === "login" ? "로그인" : "회원가입"}
                </Text>
              )}
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>또는</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Kakao Login */}
            <TouchableOpacity
              style={styles.kakaoBtn}
              onPress={handleKakaoLogin}
              disabled={loading}
              activeOpacity={0.8}
            >
              <Text style={{ fontSize: 20 }}>💬</Text>
              <Text style={styles.kakaoBtnText}>카카오로 시작하기</Text>
            </TouchableOpacity>

            {/* Skip */}
            <TouchableOpacity style={styles.skipBtn} onPress={handleSkip}>
              <Text style={styles.skipText}>로그인 없이 둘러보기</Text>
            </TouchableOpacity>

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>
                가입 시 이용약관 및 개인정보 처리방침에{"\n"}동의하는 것으로 간주됩니다.
              </Text>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}
