/**
 * 실시간 산책 지도 모달 컴포넌트
 * 도그워커의 현재 위치를 대전 지도 위에 표시
 * 카카오맵/구글맵 대신 SVG 기반 대전 지도 사용 (네이티브 호환)
 */
import { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  Modal,
  Pressable,
  StyleSheet,
  ScrollView,
  Dimensions,
  Platform,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  withSpring,
} from "react-native-reanimated";
import { Fonts } from "@/hooks/use-fonts";
import * as Haptics from "expo-haptics";

const haptic = () => {
  if (Platform.OS !== "web")
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
};

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const MAP_WIDTH = SCREEN_WIDTH - 32;
const MAP_HEIGHT = MAP_WIDTH * 0.85;

// 대전 좌표 범위
const DAEJEON_BOUNDS = {
  minLat: 36.2,
  maxLat: 36.5,
  minLon: 127.3,
  maxLon: 127.55,
};

interface WalkerLocation {
  latitude: number;
  longitude: number;
  timestamp: string;
  district: string;
}

interface RoutePoint {
  latitude: number;
  longitude: number;
}

export interface LiveWalkMapProps {
  visible: boolean;
  onClose: () => void;
  workerName: string;
  workerEmoji: string;
  petName: string;
  petEmoji: string;
  walkStatus: "idle" | "walking" | "paused" | "completed";
  startedAt?: string;
  currentLocation?: WalkerLocation;
  routePoints?: RoutePoint[];
  totalDistanceKm?: number;
  totalDurationSec?: number;
  onEndWalk?: () => void;
}

// 좌표 -> 지도 위 픽셀 위치 변환
function coordToPixel(
  lat: number,
  lon: number
): { x: number; y: number } {
  const x =
    ((lon - DAEJEON_BOUNDS.minLon) / (DAEJEON_BOUNDS.maxLon - DAEJEON_BOUNDS.minLon)) *
    MAP_WIDTH;
  const y =
    ((DAEJEON_BOUNDS.maxLat - lat) / (DAEJEON_BOUNDS.maxLat - DAEJEON_BOUNDS.minLat)) *
    MAP_HEIGHT;
  return { x: Math.max(10, Math.min(MAP_WIDTH - 10, x)), y: Math.max(10, Math.min(MAP_HEIGHT - 10, y)) };
}

// 시간 포맷
function formatDuration(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  if (h > 0) return `${h}시간 ${m}분`;
  if (m > 0) return `${m}분 ${s}초`;
  return `${s}초`;
}

// 대전 주요 지역 랜드마크
const LANDMARKS = [
  { name: "한밭수목원", lat: 36.3685, lon: 127.3882, emoji: "🌳" },
  { name: "유림공원", lat: 36.3562, lon: 127.3785, emoji: "🏞️" },
  { name: "엑스포과학공원", lat: 36.3742, lon: 127.3918, emoji: "🎡" },
  { name: "대전역", lat: 36.3326, lon: 127.4346, emoji: "🚉" },
  { name: "갑천", lat: 36.3550, lon: 127.3950, emoji: "🌊" },
];

// 구 경계 표시용
const DISTRICT_LABELS = [
  { name: "서구", lat: 36.355, lon: 127.375 },
  { name: "유성구", lat: 36.380, lon: 127.365 },
  { name: "중구", lat: 36.330, lon: 127.420 },
  { name: "동구", lat: 36.340, lon: 127.460 },
  { name: "대덕구", lat: 36.400, lon: 127.430 },
];

// ─── 위치 핀 애니메이션 (부드러운 이동 지원) ───
function PulsingPin({
  x,
  y,
  emoji,
  label,
}: {
  x: number;
  y: number;
  emoji: string;
  label: string;
}) {
  const pulseScale = useSharedValue(1);
  const animX = useSharedValue(x - 20);
  const animY = useSharedValue(y - 20);

  useEffect(() => {
    pulseScale.value = withRepeat(
      withTiming(1.6, { duration: 1200, easing: Easing.out(Easing.ease) }),
      -1,
      true
    );
  }, []);

  // 좌표가 변경되면 부드럽게 이동 (4초 애니메이션)
  useEffect(() => {
    animX.value = withTiming(x - 20, { duration: 4000, easing: Easing.inOut(Easing.ease) });
    animY.value = withTiming(y - 20, { duration: 4000, easing: Easing.inOut(Easing.ease) });
  }, [x, y]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: 2 - pulseScale.value,
  }));

  const positionStyle = useAnimatedStyle(() => ({
    left: animX.value,
    top: animY.value,
  }));

  return (
    <Animated.View style={[pinStyles.container, positionStyle]}>
      <Animated.View style={[pinStyles.pulse, pulseStyle]} />
      <View style={pinStyles.pin}>
        <Text style={{ fontSize: 16 }}>{emoji}</Text>
      </View>
      <View style={pinStyles.labelWrap}>
        <Text style={pinStyles.label}>{label}</Text>
      </View>
    </Animated.View>
  );
}

const pinStyles = StyleSheet.create({
  container: { position: "absolute", width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  pulse: {
    position: "absolute",
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,107,53,0.25)",
  },
  pin: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FF6B35",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  labelWrap: {
    position: "absolute",
    top: 38,
    backgroundColor: "rgba(0,0,0,0.7)",
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  label: { fontSize: 9, color: "#FFFFFF", fontWeight: "700" },
});

// ─── 경로 그리기 (SVG 대신 View 기반) ───
function RouteLine({ points }: { points: RoutePoint[] }) {
  if (points.length < 2) return null;

  return (
    <>
      {points.slice(0, -1).map((point, i) => {
        const from = coordToPixel(point.latitude, point.longitude);
        const to = coordToPixel(points[i + 1].latitude, points[i + 1].longitude);
        const dx = to.x - from.x;
        const dy = to.y - from.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx) * (180 / Math.PI);

        return (
          <View
            key={`route_${i}`}
            style={{
              position: "absolute",
              left: from.x,
              top: from.y - 1.5,
              width: length,
              height: 3,
              backgroundColor: "#FF6B35",
              borderRadius: 1.5,
              transform: [{ rotate: `${angle}deg` }],
              transformOrigin: "left center",
              opacity: 0.7,
            }}
          />
        );
      })}
    </>
  );
}

export function LiveWalkMap({
  visible,
  onClose,
  workerName,
  workerEmoji,
  petName,
  petEmoji,
  walkStatus,
  startedAt,
  currentLocation,
  routePoints = [],
  totalDistanceKm = 0,
  totalDurationSec = 0,
  onEndWalk,
}: LiveWalkMapProps) {
  const [elapsedSec, setElapsedSec] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 경과 시간 타이머
  useEffect(() => {
    if (walkStatus === "walking" && startedAt) {
      timerRef.current = setInterval(() => {
        const elapsed = (Date.now() - new Date(startedAt).getTime()) / 1000;
        setElapsedSec(elapsed);
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [walkStatus, startedAt]);

  const statusLabel =
    walkStatus === "walking"
      ? "산책 중"
      : walkStatus === "paused"
        ? "일시 정지"
        : walkStatus === "completed"
          ? "산책 완료"
          : "대기 중";

  const statusColor =
    walkStatus === "walking"
      ? "#4CAF82"
      : walkStatus === "paused"
        ? "#F59E0B"
        : walkStatus === "completed"
          ? "#8E8E93"
          : "#BDBDBD";

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={s.overlay}>
        <View style={s.sheet}>
          {/* 헤더 */}
          <View style={s.header}>
            <View style={{ flex: 1 }}>
              <Text style={s.title}>실시간 산책 지도</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 }}>
                <View style={[s.statusDot, { backgroundColor: statusColor }]} />
                <Text style={[s.statusText, { color: statusColor }]}>{statusLabel}</Text>
              </View>
            </View>
            <Pressable
              onPress={() => {
                haptic();
                onClose();
              }}
              style={({ pressed }) => [s.closeBtn, pressed && { opacity: 0.7 }]}
            >
              <Text style={s.closeBtnText}>닫기</Text>
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* 지도 영역 */}
            <View style={s.mapContainer}>
              <View style={s.map}>
                {/* 배경 그리드 */}
                {Array.from({ length: 5 }).map((_, i) => (
                  <View
                    key={`hline_${i}`}
                    style={{
                      position: "absolute",
                      left: 0,
                      right: 0,
                      top: (MAP_HEIGHT / 5) * (i + 1),
                      height: 1,
                      backgroundColor: "rgba(0,0,0,0.05)",
                    }}
                  />
                ))}
                {Array.from({ length: 5 }).map((_, i) => (
                  <View
                    key={`vline_${i}`}
                    style={{
                      position: "absolute",
                      top: 0,
                      bottom: 0,
                      left: (MAP_WIDTH / 5) * (i + 1),
                      width: 1,
                      backgroundColor: "rgba(0,0,0,0.05)",
                    }}
                  />
                ))}

                {/* 구 라벨 */}
                {DISTRICT_LABELS.map((d) => {
                  const pos = coordToPixel(d.lat, d.lon);
                  return (
                    <View
                      key={d.name}
                      style={{
                        position: "absolute",
                        left: pos.x - 20,
                        top: pos.y - 8,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 10,
                          color: "rgba(0,0,0,0.2)",
                          fontWeight: "700",
                          textAlign: "center",
                          width: 40,
                        }}
                      >
                        {d.name}
                      </Text>
                    </View>
                  );
                })}

                {/* 랜드마크 */}
                {LANDMARKS.map((lm) => {
                  const pos = coordToPixel(lm.lat, lm.lon);
                  return (
                    <View
                      key={lm.name}
                      style={{
                        position: "absolute",
                        left: pos.x - 10,
                        top: pos.y - 10,
                        alignItems: "center",
                      }}
                    >
                      <Text style={{ fontSize: 14 }}>{lm.emoji}</Text>
                      <Text
                        style={{
                          fontSize: 8,
                          color: "#8E8E93",
                          marginTop: 1,
                          textAlign: "center",
                          width: 50,
                        }}
                      >
                        {lm.name}
                      </Text>
                    </View>
                  );
                })}

                {/* 산책 경로 */}
                <RouteLine points={routePoints} />

                {/* 워커 현재 위치 핀 */}
                {currentLocation && (
                  <PulsingPin
                    x={coordToPixel(currentLocation.latitude, currentLocation.longitude).x}
                    y={coordToPixel(currentLocation.latitude, currentLocation.longitude).y}
                    emoji={workerEmoji}
                    label={workerName}
                  />
                )}

                {/* 지도 라벨 */}
                <View style={s.mapLabel}>
                  <Text style={s.mapLabelText}>대전광역시</Text>
                </View>
              </View>
            </View>

            {/* 워커 정보 카드 */}
            <View style={s.infoCard}>
              <View style={s.infoRow}>
                <View style={s.infoAvatar}>
                  <Text style={{ fontSize: 24 }}>{workerEmoji}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.infoName}>{workerName}</Text>
                  <Text style={s.infoSub}>
                    {petEmoji} {petName}와 산책 중
                  </Text>
                </View>
                {currentLocation && (
                  <View style={s.districtBadge}>
                    <Text style={s.districtBadgeText}>
                      📍 {currentLocation.district}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* 산책 통계 */}
            <View style={s.statsRow}>
              <View style={s.statItem}>
                <Text style={s.statIcon}>⏱️</Text>
                <Text style={s.statValue}>
                  {formatDuration(walkStatus === "walking" ? elapsedSec : totalDurationSec)}
                </Text>
                <Text style={s.statLabel}>경과 시간</Text>
              </View>
              <View style={s.statDivider} />
              <View style={s.statItem}>
                <Text style={s.statIcon}>📏</Text>
                <Text style={s.statValue}>{totalDistanceKm.toFixed(2)} km</Text>
                <Text style={s.statLabel}>이동 거리</Text>
              </View>
              <View style={s.statDivider} />
              <View style={s.statItem}>
                <Text style={s.statIcon}>🚶</Text>
                <Text style={s.statValue}>
                  {totalDurationSec > 0
                    ? ((totalDistanceKm / (totalDurationSec / 3600)) || 0).toFixed(1)
                    : "0.0"}{" "}
                  km/h
                </Text>
                <Text style={s.statLabel}>평균 속도</Text>
              </View>
            </View>

            {/* 산책 종료 버튼 (워커용) */}
            {walkStatus === "walking" && onEndWalk && (
              <Pressable
                onPress={() => {
                  haptic();
                  onEndWalk();
                }}
                style={({ pressed }) => [
                  s.endWalkBtn,
                  pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
                ]}
              >
                <Text style={s.endWalkBtnText}>산책 종료</Text>
              </Pressable>
            )}

            {walkStatus === "completed" && (
              <View style={s.completedBanner}>
                <Text style={s.completedEmoji}>🎉</Text>
                <Text style={s.completedText}>산책이 완료되었습니다!</Text>
              </View>
            )}

            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: SCREEN_HEIGHT * 0.9,
    paddingTop: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  title: { fontFamily: Fonts.bold, fontSize: 18, color: "#1A1A1A", letterSpacing: -0.3 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 13, fontWeight: "600" },
  closeBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#F5F5F5",
  },
  closeBtnText: { fontFamily: Fonts.semiBold, fontSize: 13, color: "#8E8E93" },
  mapContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  map: {
    width: MAP_WIDTH,
    height: MAP_HEIGHT,
    backgroundColor: "#F8FBF5",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E8ECE0",
    overflow: "hidden",
    position: "relative",
  },
  mapLabel: {
    position: "absolute",
    bottom: 8,
    right: 8,
    backgroundColor: "rgba(255,255,255,0.8)",
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  mapLabelText: { fontSize: 9, color: "#8E8E93", fontWeight: "600" },
  infoCard: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: "#FFF8F5",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#FFE8DD",
  },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  infoAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FF6B35",
  },
  infoName: { fontFamily: Fonts.bold, fontSize: 15, color: "#1A1A1A" },
  infoSub: { fontFamily: Fonts.regular, fontSize: 12, color: "#8E8E93", marginTop: 2 },
  districtBadge: {
    backgroundColor: "#FF6B35",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  districtBadgeText: { fontSize: 11, color: "#FFFFFF", fontWeight: "700" },
  statsRow: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: "#F8F8F8",
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
  },
  statItem: { flex: 1, alignItems: "center", gap: 4 },
  statIcon: { fontSize: 20 },
  statValue: { fontFamily: Fonts.bold, fontSize: 14, color: "#1A1A1A" },
  statLabel: { fontFamily: Fonts.regular, fontSize: 11, color: "#8E8E93" },
  statDivider: { width: 1, height: 40, backgroundColor: "#E0E0E0" },
  endWalkBtn: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: "#FF3B30",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  endWalkBtnText: { fontFamily: Fonts.bold, fontSize: 16, color: "#FFFFFF" },
  completedBanner: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: "#F0FFF4",
    borderRadius: 14,
    paddingVertical: 20,
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#C6F6D5",
  },
  completedEmoji: { fontSize: 32 },
  completedText: { fontFamily: Fonts.bold, fontSize: 15, color: "#2E7D32" },
});
