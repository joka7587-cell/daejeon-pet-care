import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Platform } from "react-native";

import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Fonts } from "@/hooks/use-fonts";
import { useApp } from "@/lib/app-context";

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { state } = useApp();
  const isCaretaker = state.profile.role === "caretaker";
  const bottomPadding = Platform.OS === "web" ? 12 : Math.max(insets.bottom, 8);
  const tabBarHeight = 52 + bottomPadding;

  const accentColor = "#2E7D32";

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: accentColor,
        tabBarInactiveTintColor: "#8E8E93",
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          paddingTop: 6,
          paddingBottom: bottomPadding,
          height: tabBarHeight,
          backgroundColor: "#FFFFFF",
          borderTopColor: "#E8E8E8",
          borderTopWidth: 0.5,
        },
        tabBarLabelStyle: {
          fontFamily: Fonts.semiBold,
          fontSize: 10,
          marginTop: 2,
          letterSpacing: -0.2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "홈",
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="house.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: "찾기",
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="magnifyingglass" color={color} />,
        }}
      />
      <Tabs.Screen
        name="community"
        options={{
          title: "커뮤니티",
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="text.bubble.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: "채팅",
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="bubble.left.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "프로필",
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="person.fill" color={color} />,
        }}
      />
      {/* 숨김 탭 */}
      <Tabs.Screen name="requests" options={{ href: null }} />
      <Tabs.Screen name="map" options={{ href: null }} />
    </Tabs>
  );
}
