/**
 * 사진 메시지 버블 - 타임스탬프 및 위치 오버레이
 * "대전 [동네이름] 산책 중 - 14:30" 형태로 표시
 */
import { View, Text, Pressable, StyleSheet, Platform, Dimensions } from "react-native";
import { Image } from "expo-image";
import { Fonts } from "@/hooks/use-fonts";
import * as Haptics from "expo-haptics";

const haptic = () => {
  if (Platform.OS !== "web")
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
};

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export interface PhotoData {
  uri: string;
  district: string; // "대전 유성구 궁동"
  formattedTime: string; // "14:30"
  latitude: number;
  longitude: number;
}

interface PhotoTimestampBubbleProps {
  photoData: PhotoData;
  isOwn: boolean;
  isDemo?: boolean;
  onPress?: () => void;
}

export function PhotoTimestampBubble({
  photoData,
  isOwn,
  isDemo = false,
  onPress,
}: PhotoTimestampBubbleProps) {
  return (
    <View style={[s.container, isOwn ? s.containerOwn : s.containerOther]}>
      <Pressable
        onPress={() => {
          haptic();
          onPress?.();
        }}
        style={({ pressed }) => [pressed && { opacity: 0.9 }]}
      >
        {isDemo ? (
          <View style={s.demoImage}>
            <Text style={s.demoEmoji}>🐶</Text>
            <Text style={s.demoText}>산책 중 사진</Text>
          </View>
        ) : (
          <Image
            source={{ uri: photoData.uri }}
            style={s.image}
            contentFit="cover"
            transition={200}
          />
        )}

        {/* 타임스탬프 + 위치 오버레이 */}
        <View style={s.overlay}>
          <View style={s.overlayContent}>
            <Text style={s.overlayIcon}>📍</Text>
            <Text style={s.overlayText}>
              {photoData.district} 산책 중 - {photoData.formattedTime}
            </Text>
          </View>
        </View>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    borderRadius: 14,
    overflow: "hidden",
    width: SCREEN_WIDTH * 0.6,
  },
  containerOwn: { backgroundColor: "#2E7D32" },
  containerOther: { backgroundColor: "#F8F8F8" },
  image: {
    width: "100%",
    height: SCREEN_WIDTH * 0.5,
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
  },
  demoImage: {
    width: "100%",
    height: SCREEN_WIDTH * 0.4,
    backgroundColor: "#E8F5E9",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  demoEmoji: { fontSize: 48 },
  demoText: { fontSize: 13, color: "#2E7D32", fontWeight: "600" },
  overlay: {
    backgroundColor: "rgba(0,0,0,0.55)",
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  overlayContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  overlayIcon: { fontSize: 12 },
  overlayText: {
    fontFamily: Fonts.semiBold,
    fontSize: 11,
    color: "#FFFFFF",
    letterSpacing: -0.2,
  },
});
