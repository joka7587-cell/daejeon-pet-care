import { useEffect, useRef, useState } from "react";
import { useRouter } from "expo-router";
import { useApp } from "@/lib/app-context";
import { View, ActivityIndicator, Text, Platform } from "react-native";
import { Image } from "expo-image";
import { Fonts } from "@/hooks/use-fonts";

export default function RootIndexScreen() {
  const router = useRouter();
  const { state } = useApp();
  const hasNavigated = useRef(false);
  const [showResetSplash, setShowResetSplash] = useState(false);

  // 초기화 후 진입 감지 (localStorage에 reset 플래그가 있으면 Splash 메시지 표시)
  useEffect(() => {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      try {
        const resetFlag = window.localStorage.getItem("system_reset_in_progress");
        if (resetFlag === "true") {
          setShowResetSplash(true);
          window.localStorage.removeItem("system_reset_in_progress");
          // 1.5초 후 정상 플로우 진행
          const timer = setTimeout(() => {
            setShowResetSplash(false);
          }, 1500);
          return () => clearTimeout(timer);
        }
      } catch (_) {}
    }
  }, []);

  useEffect(() => {
    // 리셋 Splash 표시 중이면 네비게이션 대기
    if (showResetSplash) return;
    // 상태가 로드될 때까지 대기
    if (!state.isLoaded) return;
    // 중복 네비게이션 방지
    if (hasNavigated.current) return;
    hasNavigated.current = true;

    // 약간의 딜레이를 주어 라우터가 완전히 마운트되도록 함
    const timer = setTimeout(() => {
      if (state.isOnboarded) {
        // 이미 온보딩 완료 → 메인 화면
        router.replace("/(tabs)" as never);
      } else {
        // 로그인/회원가입 화면으로 이동
        router.replace("/auth/login" as never);
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [state.isLoaded, state.isOnboarded, showResetSplash]);

  // 초기화 후 Splash 화면
  if (showResetSplash) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: "#FFFFFF",
          justifyContent: "center",
          alignItems: "center",
          paddingHorizontal: 40,
        }}
      >
        <Image
          source={require("@/assets/images/icon.png")}
          style={{ width: 100, height: 100, borderRadius: 24, marginBottom: 24 }}
          contentFit="contain"
        />
        <Text
          style={{
            fontSize: 22,
            fontFamily: Fonts.bold,
            color: "#2E7D32",
            marginBottom: 12,
            textAlign: "center",
          }}
        >
          반려이음
        </Text>
        <Text
          style={{
            fontSize: 14,
            fontFamily: Fonts.medium,
            color: "#8E8E93",
            textAlign: "center",
            lineHeight: 20,
            marginBottom: 24,
          }}
        >
          데이터를 초기화하고{"\n"}시스템을 재시작합니다...
        </Text>
        <ActivityIndicator size="large" color="#2E7D32" />
      </View>
    );
  }

  // 기본 로딩 화면
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#FFFFFF",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <ActivityIndicator size="large" color="#2E7D32" />
    </View>
  );
}
