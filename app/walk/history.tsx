import { useState } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useRouter } from "expo-router";
import { useApp, WalkSession } from "@/lib/app-context";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

function haptic() {
  if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}시간 ${m}분`;
  if (m > 0) return `${m}분 ${s}초`;
  return `${s}초`;
}

function formatDist(km: number): string {
  if (km < 0.01) return "0m";
  if (km < 1) return `${Math.round(km * 1000)}m`;
  return `${km.toFixed(2)}km`;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const weekdays = ["일", "월", "화", "수", "목", "금", "토"];
  const weekday = weekdays[d.getDay()];
  return `${month}월 ${day}일 (${weekday})`;
}

function formatTimeOnly(dateStr: string): string {
  const d = new Date(dateStr);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

type FilterType = "all" | "completed" | "active";

export default function WalkHistoryScreen() {
  const router = useRouter();
  const { state } = useApp();
  const [filter, setFilter] = useState<FilterType>("all");
  const accentColor = state.profile.role === "caretaker" ? "#4CAF82" : "#FF7043";

  const sessions = (state.walkSessions || []).filter((s) => {
    if (filter === "completed") return s.status === "completed";
    if (filter === "active") return s.status === "active" || s.status === "paused";
    return true;
  });

  // 날짜별 그룹핑
  const grouped = sessions.reduce<Record<string, WalkSession[]>>((acc, s) => {
    const dateKey = formatDate(s.startedAt);
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(s);
    return acc;
  }, {});

  const groupedEntries = Object.entries(grouped);

  // 전체 통계
  const completedSessions = (state.walkSessions || []).filter((s) => s.status === "completed");
  const totalDistance = completedSessions.reduce((sum, s) => sum + s.totalDistanceKm, 0);
  const totalDuration = completedSessions.reduce((sum, s) => sum + s.totalDurationSec, 0);

  const renderSession = ({ item }: { item: WalkSession }) => {
    const statusColor = item.status === "active" ? "#4CAF82" : item.status === "paused" ? "#F59E0B" : "#8E8E93";
    const statusLabel = item.status === "active" ? "진행 중" : item.status === "paused" ? "일시정지" : "완료";

    return (
      <Pressable
        onPress={() => {
          haptic();
          router.push(`/walk/detail?sessionId=${item.id}` as any);
        }}
        style={({ pressed }) => [
          styles.sessionCard,
          { backgroundColor: "#F8F8F8", borderColor: "#E8E8E8" },
          pressed && { opacity: 0.7 },
        ]}
      >
        <View style={styles.sessionLeft}>
          <Text style={{ fontSize: 32 }}>{item.petEmoji || "🐕"}</Text>
        </View>
        <View style={styles.sessionCenter}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Text style={[styles.sessionPetName, { color: "#1A1A1A" }]}>{item.petName}</Text>
            <View style={[styles.statusPill, { backgroundColor: statusColor + "20" }]}>
              <Text style={[styles.statusPillText, { color: statusColor }]}>{statusLabel}</Text>
            </View>
          </View>
          {item.ownerName && (
            <Text style={[styles.sessionOwner, { color: "#8E8E93" }]}>보호자: {item.ownerName}</Text>
          )}
          <Text style={[styles.sessionTime, { color: "#8E8E93" }]}>
            {formatTimeOnly(item.startedAt)}
            {item.endedAt ? ` ~ ${formatTimeOnly(item.endedAt)}` : ""}
          </Text>
        </View>
        <View style={styles.sessionRight}>
          <Text style={[styles.sessionDist, { color: accentColor }]}>{formatDist(item.totalDistanceKm)}</Text>
          <Text style={[styles.sessionDur, { color: "#8E8E93" }]}>{formatTime(item.totalDurationSec)}</Text>
        </View>
      </Pressable>
    );
  };

  const renderHeader = () => (
    <View style={{ gap: 16 }}>
      {/* 전체 통계 */}
      <View style={[styles.summaryCard, { backgroundColor: accentColor + "10", borderColor: accentColor + "30" }]}>
        <Text style={[styles.summaryTitle, { color: accentColor }]}>🐾 산책 통계</Text>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: "#1A1A1A" }]}>{completedSessions.length}</Text>
            <Text style={[styles.summaryLabel, { color: "#8E8E93" }]}>총 산책</Text>
          </View>
          <View style={[styles.summaryDivider, { backgroundColor: "#E8E8E8" }]} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: "#1A1A1A" }]}>{formatDist(totalDistance)}</Text>
            <Text style={[styles.summaryLabel, { color: "#8E8E93" }]}>총 거리</Text>
          </View>
          <View style={[styles.summaryDivider, { backgroundColor: "#E8E8E8" }]} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: "#1A1A1A" }]}>{formatTime(totalDuration)}</Text>
            <Text style={[styles.summaryLabel, { color: "#8E8E93" }]}>총 시간</Text>
          </View>
        </View>
      </View>

      {/* 필터 탭 */}
      <View style={[styles.filterRow, { borderBottomColor: "#E8E8E8" }]}>
        {([
          { key: "all" as FilterType, label: "전체" },
          { key: "completed" as FilterType, label: "완료" },
          { key: "active" as FilterType, label: "진행 중" },
        ]).map((f) => (
          <Pressable
            key={f.key}
            onPress={() => { haptic(); setFilter(f.key); }}
            style={({ pressed }) => [
              styles.filterTab,
              filter === f.key && { borderBottomColor: accentColor, borderBottomWidth: 2 },
              pressed && { opacity: 0.7 },
            ]}
          >
            <Text style={[
              styles.filterText,
              { color: filter === f.key ? accentColor : "#8E8E93" },
              filter === f.key && { fontWeight: "700" },
            ]}>
              {f.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );

  // 날짜별 섹션 헤더 + 세션 카드를 flat 배열로
  const flatData: Array<{ type: "header"; date: string } | { type: "session"; session: WalkSession }> = [];
  for (const [date, items] of groupedEntries) {
    flatData.push({ type: "header", date });
    for (const s of items) {
      flatData.push({ type: "session", session: s });
    }
  }

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      {/* 헤더 */}
      <View style={[styles.header, { borderBottomColor: "#E8E8E8" }]}>
        <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}>
          <Text style={{ fontSize: 24, color: "#1A1A1A" }}>←</Text>
        </Pressable>
        <Text style={[styles.headerTitle, { color: "#1A1A1A" }]}>산책 기록</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={flatData}
        keyExtractor={(item, index) => item.type === "header" ? `h_${item.date}` : `s_${item.session.id}`}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={{ padding: 16, gap: 8 }}
        renderItem={({ item }) => {
          if (item.type === "header") {
            return (
              <Text style={[styles.dateHeader, { color: "#1A1A1A" }]}>{item.date}</Text>
            );
          }
          return renderSession({ item: item.session });
        }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={{ fontSize: 48 }}>🐕‍🦺</Text>
            <Text style={[styles.emptyText, { color: "#8E8E93" }]}>
              아직 산책 기록이 없어요{"\n"}산책을 시작해보세요!
            </Text>
          </View>
        }
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 17, fontWeight: "700" },
  summaryCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  summaryTitle: { fontSize: 15, fontWeight: "700", marginBottom: 12 },
  summaryRow: { flexDirection: "row", alignItems: "center" },
  summaryItem: { flex: 1, alignItems: "center" },
  summaryValue: { fontSize: 18, fontWeight: "800" },
  summaryLabel: { fontSize: 11, marginTop: 4 },
  summaryDivider: { width: 1, height: 32 },
  filterRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
  },
  filterText: { fontSize: 14, fontWeight: "500" },
  dateHeader: {
    fontSize: 14,
    fontWeight: "700",
    marginTop: 8,
    marginBottom: 4,
  },
  sessionCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  sessionLeft: { marginRight: 12 },
  sessionCenter: { flex: 1, gap: 2 },
  sessionPetName: { fontSize: 15, fontWeight: "700" },
  sessionOwner: { fontSize: 12 },
  sessionTime: { fontSize: 12 },
  sessionRight: { alignItems: "flex-end", gap: 2 },
  sessionDist: { fontSize: 16, fontWeight: "800" },
  sessionDur: { fontSize: 12 },
  statusPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  statusPillText: { fontSize: 10, fontWeight: "700" },
  emptyContainer: { alignItems: "center", paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 14, textAlign: "center", lineHeight: 20 },
});
