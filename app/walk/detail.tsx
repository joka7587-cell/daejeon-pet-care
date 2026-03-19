import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Dimensions,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useApp, WalkRoutePoint } from "@/lib/app-context";
import { useColors } from "@/hooks/use-colors";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";
import Svg, { Polyline, Circle } from "react-native-svg";

function haptic() {
  if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}시간 ${m}분 ${s}초`;
  if (m > 0) return `${m}분 ${s}초`;
  return `${s}초`;
}

function formatDist(km: number): string {
  if (km < 0.01) return "0m";
  if (km < 1) return `${Math.round(km * 1000)}m`;
  return `${km.toFixed(2)}km`;
}

function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr);
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${month}월 ${day}일 ${h}:${m}`;
}

// 경로 포인트를 SVG 좌표로 변환
function routeToSvgPoints(
  points: WalkRoutePoint[],
  width: number,
  height: number,
  padding: number = 20
): string {
  if (points.length < 2) return "";

  const lats = points.map((p) => p.lat);
  const lngs = points.map((p) => p.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);

  const latRange = maxLat - minLat || 0.001;
  const lngRange = maxLng - minLng || 0.001;

  const drawW = width - padding * 2;
  const drawH = height - padding * 2;

  return points
    .map((p) => {
      const x = padding + ((p.lng - minLng) / lngRange) * drawW;
      const y = padding + ((maxLat - p.lat) / latRange) * drawH; // Y축 반전
      return `${x},${y}`;
    })
    .join(" ");
}

function getStartEndCoords(
  points: WalkRoutePoint[],
  width: number,
  height: number,
  padding: number = 20
): { start: { x: number; y: number }; end: { x: number; y: number } } | null {
  if (points.length < 2) return null;

  const lats = points.map((p) => p.lat);
  const lngs = points.map((p) => p.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);

  const latRange = maxLat - minLat || 0.001;
  const lngRange = maxLng - minLng || 0.001;

  const drawW = width - padding * 2;
  const drawH = height - padding * 2;

  const first = points[0];
  const last = points[points.length - 1];

  return {
    start: {
      x: padding + ((first.lng - minLng) / lngRange) * drawW,
      y: padding + ((maxLat - first.lat) / latRange) * drawH,
    },
    end: {
      x: padding + ((last.lng - minLng) / lngRange) * drawW,
      y: padding + ((maxLat - last.lat) / latRange) * drawH,
    },
  };
}

const SCREEN_WIDTH = Dimensions.get("window").width;
const MAP_WIDTH = SCREEN_WIDTH - 64;
const MAP_HEIGHT = 220;

export default function WalkDetailScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const router = useRouter();
  const { state } = useApp();
  const colors = useColors();
  const accentColor = state.profile.role === "caretaker" ? "#4CAF82" : "#FF7043";

  const session = (state.walkSessions || []).find((s) => s.id === sessionId);

  if (!session) {
    return (
      <ScreenContainer className="p-6">
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ fontSize: 48 }}>😕</Text>
          <Text style={{ fontSize: 18, fontWeight: "700", color: "#555", marginTop: 12 }}>
            산책 기록을 찾을 수 없어요
          </Text>
          <Pressable onPress={() => router.back()} style={styles.errorBackBtn}>
            <Text style={styles.errorBackBtnText}>돌아가기</Text>
          </Pressable>
        </View>
      </ScreenContainer>
    );
  }

  const activeDuration = session.totalDurationSec - session.pausedDurationSec;
  const svgPoints = routeToSvgPoints(session.routePoints, MAP_WIDTH, MAP_HEIGHT);
  const startEnd = getStartEndCoords(session.routePoints, MAP_WIDTH, MAP_HEIGHT);

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      {/* 헤더 */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}>
          <Text style={{ fontSize: 24, color: colors.foreground }}>←</Text>
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>산책 상세</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 40 }}>
        {/* 반려동물 정보 */}
        <View style={[styles.petCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={{ fontSize: 44 }}>{session.petEmoji || "🐕"}</Text>
          <View style={{ flex: 1, marginLeft: 14 }}>
            <Text style={[styles.petName, { color: colors.foreground }]}>{session.petName}</Text>
            {session.ownerName && (
              <Text style={[styles.ownerText, { color: colors.muted }]}>보호자: {session.ownerName}</Text>
            )}
            <Text style={[styles.dateText, { color: colors.muted }]}>
              {formatDateTime(session.startedAt)}
              {session.endedAt ? ` ~ ${formatDateTime(session.endedAt)}` : ""}
            </Text>
          </View>
          <View style={[styles.statusBadge, {
            backgroundColor: session.status === "completed" ? accentColor + "20" : "#F59E0B20",
          }]}>
            <Text style={[styles.statusBadgeText, {
              color: session.status === "completed" ? accentColor : "#F59E0B",
            }]}>
              {session.status === "completed" ? "완료" : session.status === "active" ? "진행 중" : "일시정지"}
            </Text>
          </View>
        </View>

        {/* 경로 시각화 */}
        <View style={[styles.mapCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>🗺️ 산책 경로</Text>
          {session.routePoints.length >= 2 ? (
            <View style={[styles.mapContainer, { backgroundColor: colors.background }]}>
              <Svg width={MAP_WIDTH} height={MAP_HEIGHT}>
                <Polyline
                  points={svgPoints}
                  fill="none"
                  stroke={accentColor}
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {startEnd && (
                  <>
                    <Circle cx={startEnd.start.x} cy={startEnd.start.y} r="6" fill="#4CAF82" />
                    <Circle cx={startEnd.end.x} cy={startEnd.end.y} r="6" fill="#EF4444" />
                  </>
                )}
              </Svg>
              <View style={styles.mapLegend}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: "#4CAF82" }]} />
                  <Text style={[styles.legendText, { color: colors.muted }]}>출발</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: "#EF4444" }]} />
                  <Text style={[styles.legendText, { color: colors.muted }]}>도착</Text>
                </View>
              </View>
            </View>
          ) : (
            <View style={[styles.noRouteContainer, { backgroundColor: colors.background }]}>
              <Text style={{ fontSize: 32 }}>📍</Text>
              <Text style={[styles.noRouteText, { color: colors.muted }]}>
                GPS 경로 데이터가 부족합니다{"\n"}(최소 2개 포인트 필요)
              </Text>
            </View>
          )}
        </View>

        {/* 상세 통계 */}
        <View style={[styles.statsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>📊 산책 통계</Text>

          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={{ fontSize: 24 }}>📏</Text>
              <Text style={[styles.statValue, { color: colors.foreground }]}>
                {formatDist(session.totalDistanceKm)}
              </Text>
              <Text style={[styles.statLabel, { color: colors.muted }]}>총 거리</Text>
            </View>

            <View style={styles.statItem}>
              <Text style={{ fontSize: 24 }}>⏱️</Text>
              <Text style={[styles.statValue, { color: colors.foreground }]}>
                {formatTime(session.totalDurationSec)}
              </Text>
              <Text style={[styles.statLabel, { color: colors.muted }]}>총 시간</Text>
            </View>

            <View style={styles.statItem}>
              <Text style={{ fontSize: 24 }}>🚶</Text>
              <Text style={[styles.statValue, { color: colors.foreground }]}>
                {formatTime(activeDuration)}
              </Text>
              <Text style={[styles.statLabel, { color: colors.muted }]}>실제 이동</Text>
            </View>

            <View style={styles.statItem}>
              <Text style={{ fontSize: 24 }}>⏸️</Text>
              <Text style={[styles.statValue, { color: colors.foreground }]}>
                {formatTime(session.pausedDurationSec)}
              </Text>
              <Text style={[styles.statLabel, { color: colors.muted }]}>정지 시간</Text>
            </View>

            <View style={styles.statItem}>
              <Text style={{ fontSize: 24 }}>📊</Text>
              <Text style={[styles.statValue, { color: colors.foreground }]}>
                {session.avgSpeedKmh.toFixed(1)} km/h
              </Text>
              <Text style={[styles.statLabel, { color: colors.muted }]}>평균 속도</Text>
            </View>

            <View style={styles.statItem}>
              <Text style={{ fontSize: 24 }}>⚡</Text>
              <Text style={[styles.statValue, { color: colors.foreground }]}>
                {session.maxSpeedKmh.toFixed(1)} km/h
              </Text>
              <Text style={[styles.statLabel, { color: colors.muted }]}>최고 속도</Text>
            </View>
          </View>
        </View>

        {/* GPS 포인트 정보 */}
        <View style={[styles.infoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>📍 GPS 정보</Text>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.muted }]}>기록된 포인트</Text>
            <Text style={[styles.infoValue, { color: colors.foreground }]}>{session.routePoints.length}개</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.muted }]}>동네</Text>
            <Text style={[styles.infoValue, { color: colors.foreground }]}>{session.neighborhood}</Text>
          </View>
          {session.caretakerName && (
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: colors.muted }]}>돌보미</Text>
              <Text style={[styles.infoValue, { color: colors.foreground }]}>{session.caretakerName}</Text>
            </View>
          )}
        </View>
      </ScrollView>
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
  petCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  petName: { fontSize: 20, fontWeight: "800" },
  ownerText: { fontSize: 13, marginTop: 2 },
  dateText: { fontSize: 12, marginTop: 4 },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  statusBadgeText: { fontSize: 12, fontWeight: "700" },
  mapCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  sectionTitle: { fontSize: 16, fontWeight: "700", marginBottom: 12 },
  mapContainer: {
    borderRadius: 12,
    overflow: "hidden",
    padding: 4,
  },
  mapLegend: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
    marginTop: 8,
  },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 12 },
  noRouteContainer: {
    alignItems: "center",
    padding: 32,
    borderRadius: 12,
    gap: 8,
  },
  noRouteText: { fontSize: 13, textAlign: "center", lineHeight: 18 },
  statsCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  statItem: {
    width: "46%",
    alignItems: "center",
    padding: 12,
    gap: 4,
  },
  statValue: { fontSize: 18, fontWeight: "700" },
  statLabel: { fontSize: 11, fontWeight: "500" },
  infoCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  infoLabel: { fontSize: 14 },
  infoValue: { fontSize: 14, fontWeight: "600" },
  errorBackBtn: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: "#FF7043",
    borderRadius: 12,
  },
  errorBackBtnText: { color: "#fff", fontWeight: "700" },
});
