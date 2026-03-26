/**
 * 산책 리포트 카드 컴포넌트
 * 산책 종료 시 채팅방에 자동으로 나타나는 리포트 카드 UI
 */
import { View, Text, Pressable, StyleSheet, Platform } from "react-native";
import { Fonts } from "@/hooks/use-fonts";
import * as Haptics from "expo-haptics";

const haptic = () => {
  if (Platform.OS !== "web")
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
};

export interface WalkReportCardData {
  reportId: string;
  workerName: string;
  petName: string;
  petEmoji: string;
  durationMin: number;
  distanceKm: number;
  caloriesBurned: number;
  stepsEstimated: number;
  photoCount: number;
  date: string;
  startTime: string;
  endTime: string;
  petMood: "happy" | "normal" | "tired" | null;
}

interface WalkReportCardProps {
  data: WalkReportCardData;
  isOwn: boolean;
  onViewDetail?: () => void;
}

const MOOD_MAP: Record<string, { emoji: string; label: string }> = {
  happy: { emoji: "😊", label: "기분 좋음" },
  normal: { emoji: "😐", label: "보통" },
  tired: { emoji: "😴", label: "피곤함" },
};

export function WalkReportCard({ data, isOwn, onViewDetail }: WalkReportCardProps) {
  const moodInfo = data.petMood ? MOOD_MAP[data.petMood] : null;

  return (
    <View style={[s.container, isOwn ? s.containerOwn : s.containerOther]}>
      {/* 헤더 */}
      <View style={s.header}>
        <View style={[s.badge, isOwn && { backgroundColor: "rgba(255,255,255,0.2)" }]}>
          <Text style={{ fontSize: 14 }}>📋</Text>
          <Text style={[s.badgeText, isOwn && { color: "#FFFFFF" }]}>산책 리포트</Text>
        </View>
      </View>

      {/* 반려견 정보 */}
      <View style={s.petRow}>
        <Text style={{ fontSize: 24 }}>{data.petEmoji}</Text>
        <View style={{ flex: 1 }}>
          <Text style={[s.petName, isOwn && { color: "#FFFFFF" }]}>
            {data.petName}의 산책
          </Text>
          <Text style={[s.dateText, isOwn && { color: "rgba(255,255,255,0.7)" }]}>
            {data.date} · {data.startTime} ~ {data.endTime}
          </Text>
        </View>
        {moodInfo && (
          <View style={[s.moodBadge, isOwn && { backgroundColor: "rgba(255,255,255,0.15)" }]}>
            <Text style={{ fontSize: 16 }}>{moodInfo.emoji}</Text>
            <Text style={[s.moodText, isOwn && { color: "rgba(255,255,255,0.8)" }]}>
              {moodInfo.label}
            </Text>
          </View>
        )}
      </View>

      {/* 통계 그리드 */}
      <View style={[s.statsGrid, isOwn && { backgroundColor: "rgba(255,255,255,0.12)" }]}>
        <View style={s.statItem}>
          <Text style={s.statIcon}>⏱️</Text>
          <Text style={[s.statValue, isOwn && { color: "#FFFFFF" }]}>
            {data.durationMin}분
          </Text>
          <Text style={[s.statLabel, isOwn && { color: "rgba(255,255,255,0.7)" }]}>
            산책 시간
          </Text>
        </View>
        <View style={s.statItem}>
          <Text style={s.statIcon}>📏</Text>
          <Text style={[s.statValue, isOwn && { color: "#FFFFFF" }]}>
            {data.distanceKm.toFixed(2)}km
          </Text>
          <Text style={[s.statLabel, isOwn && { color: "rgba(255,255,255,0.7)" }]}>
            이동 거리
          </Text>
        </View>
        <View style={s.statItem}>
          <Text style={s.statIcon}>🔥</Text>
          <Text style={[s.statValue, isOwn && { color: "#FFFFFF" }]}>
            {data.caloriesBurned}kcal
          </Text>
          <Text style={[s.statLabel, isOwn && { color: "rgba(255,255,255,0.7)" }]}>
            칼로리
          </Text>
        </View>
        <View style={s.statItem}>
          <Text style={s.statIcon}>🐾</Text>
          <Text style={[s.statValue, isOwn && { color: "#FFFFFF" }]}>
            {data.stepsEstimated.toLocaleString()}
          </Text>
          <Text style={[s.statLabel, isOwn && { color: "rgba(255,255,255,0.7)" }]}>
            걸음 수
          </Text>
        </View>
      </View>

      {/* 사진 수 */}
      {data.photoCount > 0 && (
        <View style={[s.photoRow, isOwn && { backgroundColor: "rgba(255,255,255,0.1)" }]}>
          <Text style={{ fontSize: 14 }}>📷</Text>
          <Text style={[s.photoText, isOwn && { color: "rgba(255,255,255,0.8)" }]}>
            산책 사진 {data.photoCount}장
          </Text>
        </View>
      )}

      {/* 상세 보기 버튼 */}
      <Pressable
        onPress={() => {
          haptic();
          onViewDetail?.();
        }}
        style={({ pressed }) => [
          s.detailBtn,
          isOwn && { backgroundColor: "rgba(255,255,255,0.2)", borderColor: "rgba(255,255,255,0.3)" },
          pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] },
        ]}
      >
        <Text style={[s.detailBtnText, isOwn && { color: "#FFFFFF" }]}>
          산책 리포트 보기
        </Text>
        <Text style={{ fontSize: 12 }}>→</Text>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 14,
    width: 280,
  },
  containerOwn: { backgroundColor: "#FF7043" },
  containerOther: { backgroundColor: "#F8F8F8" },
  header: { marginBottom: 10 },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FFF5F0",
    alignSelf: "flex-start",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: { fontFamily: Fonts.bold, fontSize: 12, color: "#FF6B35" },
  petRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
  petName: { fontFamily: Fonts.bold, fontSize: 15, color: "#1A1A1A" },
  dateText: { fontFamily: Fonts.regular, fontSize: 11, color: "#8E8E93", marginTop: 2 },
  moodBadge: {
    backgroundColor: "#F8F8F8",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignItems: "center",
    gap: 2,
  },
  moodText: { fontFamily: Fonts.medium, fontSize: 9, color: "#8E8E93" },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    backgroundColor: "#F0F0F0",
    borderRadius: 12,
    padding: 10,
    gap: 4,
  },
  statItem: { width: "48%", alignItems: "center", paddingVertical: 6 },
  statIcon: { fontSize: 16, marginBottom: 2 },
  statValue: { fontFamily: Fonts.bold, fontSize: 13, color: "#1A1A1A" },
  statLabel: { fontFamily: Fonts.regular, fontSize: 10, color: "#8E8E93", marginTop: 1 },
  photoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
    backgroundColor: "#F5F5F5",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  photoText: { fontFamily: Fonts.medium, fontSize: 12, color: "#8E8E93" },
  detailBtn: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 10,
    paddingVertical: 10,
  },
  detailBtnText: { fontFamily: Fonts.bold, fontSize: 13, color: "#FF6B35" },
});
