import { useEffect, useRef } from "react";
import { useRouter } from "expo-router";
import { useApp } from "@/lib/app-context";
import { View } from "react-native";

export default function RootIndexScreen() {
  const router = useRouter();
  const { state } = useApp();
  const hasNavigated = useRef(false);

  useEffect(() => {
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
  }, []);

  return <View style={{ flex: 1, backgroundColor: "#FFFFFF" }} />;
}
