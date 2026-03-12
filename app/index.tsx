import { useEffect } from "react";
import { useRouter } from "expo-router";
import { useApp } from "@/lib/app-context";
import { View } from "react-native";

export default function RootIndexScreen() {
  const router = useRouter();
  const { state } = useApp();

  useEffect(() => {
    // 온보딩 완료 여부에 따라 라우팅
    if (state.isOnboarded) {
      router.replace("/(tabs)" as never);
    } else {
      router.replace("/onboarding" as never);
    }
  }, [state.isOnboarded]);

  return <View style={{ flex: 1, backgroundColor: "#fff" }} />;
}
