/**
 * 보호자용 - 시뮬레이션 산책 실시간 추적 화면
 * walkSimulation 상태를 구독하여 지도 마커가 부드럽게 이동
 */
import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Dimensions,
  Platform,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { ScreenContainer } from "@/components/screen-container";
import { useApp } from "@/lib/app-context";
import { useRouter } from "expo-router";
import { Fonts } from "@/hooks/use-fonts";
import * as Haptics from "expo-haptics";
import {
  EXPO_PARK_ROUTE,
  calculateRouteDistance,
  haversineDistance,
} from "@/lib/walk-simulation";

const haptic = () => {
  if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
};

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const MAP_WIDTH = SCREEN_WIDTH - 32;
const MAP_HEIGHT = MAP_WIDTH * 0.85;

// 대전 좌표 범위 (엑스포 공원 주변 확대)
const BOUNDS = {
  minLat: 36.370,
  maxLat: 36.382,
  minLon: 127.382,
  maxLon: 127.396,
};

function coordToPixel(lat: number, lon: number) {
  const x = ((lon - BOUNDS.minLon) / (BOUNDS.maxLon - BOUNDS.minLon)) * MAP_WIDTH;
  const y = ((BOUNDS.maxLat - lat) / (BOUNDS.maxLat - BOUNDS.minLat)) * MAP_HEIGHT;
  return {
    x: Math.max(20, Math.min(MAP_WIDTH - 20, x)),
    y: Math.max(20, Math.min(MAP_HEIGHT - 20, y)),
  };
}

// 경로 라인 컴포넌트
function RouteLine({ points, activeIndex }: { points: typeof EXPO_PARK_ROUTE; activeIndex: number }) {
  return (
    <>
      {points.slice(0, -1).map((point, i) => {
        const from = coordToPixel(point.latitude, point.longitude);
        const to = coordToPixel(points[i + 1].latitude, points[i + 1].longitude);
        const dx = to.x - from.x;
        const dy = to.y - from.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx) * (180 / Math.PI);
        const isPassed = i < activeIndex;

        return (
          <View
            key={`route_${i}`}
            style={{
              position: "absolute",
              left: from.x,
              top: from.y - 1.5,
              width: length,
              height: 3,
              backgroundColor: isPassed ? "#FF6B35" : "#D0D0D0",
              borderRadius: 1.5,
              transform: [{ rotate: `${angle}deg` }],
              transformOrigin: "left center",
              opacity: isPassed ? 0.8 : 0.4,
            }}
          />
        );
      })}
    </>
  );
}

// 경유지 마커
function WaypointMarker({ coord, index, isActive, isDone }: {
  coord: typeof EXPO_PARK_ROUTE[0];
  index: number;
  isActive: boolean;
  isDone: boolean;
}) {
  const pos = coordToPixel(coord.latitude, coord.longitude);
  return (
    <View style={{
      position: "absolute",
      left: pos.x - 10,
      top: pos.y - 10,
      alignItems: "center",
    }}>
      <View style={{
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: isDone ? "#4CAF82" : isActive ? "#FF6B35" : "#E0E0E0",
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 2,
        borderColor: "#FFFFFF",
      }}>
        <Text style={{ fontSize: 8, color: "#FFFFFF", fontWeight: "800" }}>
          {isDone ? "✓" : index + 1}
        </Text>
      </View>
      <Text style={{
        fontSize: 8,
        color: "#8E8E93",
        marginTop: 2,
        textAlign: "center",
        width: 60,
      }}>
        {coord.label}
      </Text>
    </View>
  );
}

// 애니메이션 워커 핀
function AnimatedWalkerPin({ x, y, emoji }: { x: number; y: number; emoji: string }) {
  const pulseScale = useSharedValue(1);
  const animX = useSharedValue(x - 22);
  const animY = useSharedValue(y - 22);

  useEffect(() => {
    pulseScale.value = withRepeat(
      withTiming(1.5, { duration: 1000, easing: Easing.out(Easing.ease) }),
      -1,
      true
    );
  }, []);

  // 좌표 변경 시 4초에 걸쳐 부드럽게 이동
  useEffect(() => {
    animX.value = withTiming(x - 22, { duration: 4000, easing: Easing.inOut(Easing.ease) });
    animY.value = withTiming(y - 22, { duration: 4000, easing: Easing.inOut(Easing.ease) });
  }, [x, y]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: 2 - pulseScale.value,
  }));

  const posStyle = useAnimatedStyle(() => ({
    left: animX.value,
    top: animY.value,
  }));

  return (
    <Animated.View style={[{
      position: "absolute",
      width: 44,
      height: 44,
      alignItems: "center",
      justifyContent: "center",
      zIndex: 100,
    }, posStyle]}>
      <Animated.View style={[{
        position: "absolute",
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: "rgba(255,107,53,0.25)",
      }, pulseStyle]} />
      <View style={{
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: "#FF6B35",
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 3,
        borderColor: "#FFFFFF",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 6,
      }}>
        <Text style={{ fontSize: 18 }}>{emoji}</Text>
      </View>
    </Animated.View>
  );
}

export default function LiveTrackerScreen() {
  const { state } = useApp();
  const router = useRouter();
  const { walkSimulation } = state;
  const [elapsedSec, setElapsedSec] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const simStatus = walkSimulation.status;
  const currentIndex = walkSimulation.currentIndex;
  const currentCoord = EXPO_PARK_ROUTE[currentIndex] || EXPO_PARK_ROUTE[0];
  const currentPixel = coordToPixel(currentCoord.latitude, currentCoord.longitude);

  // 경과 시간 타이머
  useEffect(() => {
    if (simStatus === "running" && walkSimulation.startedAt) {
      timerRef.current = setInterval(() => {
        const elapsed = (Date.now() - new Date(walkSimulation.startedAt!).getTime()) / 1000;
        setElapsedSec(Math.floor(elapsed));
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [simStatus, walkSimulation.startedAt]);

  // 이동 거리 계산
  let distanceSoFar = 0;
  for (let i = 1; i <= currentIndex && i < EXPO_PARK_ROUTE.length; i++) {
    distanceSoFar += haversineDistance(
      EXPO_PARK_ROUTE[i - 1].latitude,
      EXPO_PARK_ROUTE[i - 1].longitude,
      EXPO_PARK_ROUTE[i].latitude,
      EXPO_PARK_ROUTE[i].longitude
    );
  }

  const totalDistance = calculateRouteDistance(EXPO_PARK_ROUTE);
  const progressPercent = ((currentIndex + 1) / EXPO_PARK_ROUTE.length) * 100;

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return m > 0 ? `${m}분 ${s}초` : `${s}초`;
  };

  return (
    <ScreenContainer edges={["top", "left", "right", "bottom"]} className="p-0">
      {/* 헤더 */}
      <View style={s.header}>
        <Pressable
          onPress={() => { haptic(); router.back(); }}
          style={({ pressed }) => [s.backBtn, pressed && { opacity: 0.7 }]}
        >
          <Text style={s.backBtnText}>‹ 뒤로</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>실시간 산책 추적</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 }}>
            <View style={[s.statusDot, {
              backgroundColor: simStatus === "running" ? "#4CAF82" : simStatus === "paused" ? "#F59E0B" : "#8E8E93",
            }]} />
            <Text style={[s.statusText, {
              color: simStatus === "running" ? "#4CAF82" : simStatus === "paused" ? "#F59E0B" : "#8E8E93",
            }]}>
              {simStatus === "running" ? "산책 중" : simStatus === "paused" ? "일시정지" : simStatus === "completed" ? "산책 완료" : "대기 중"}
            </Text>
          </View>
        </View>
        <View style={s.simBadge}>
          <Text style={s.simBadgeText}>SIM</Text>
        </View>
      </View>

      {/* 지도 */}
      <View style={s.mapContainer}>
        <View style={s.map}>
          {/* 배경 그리드 */}
          {Array.from({ length: 4 }).map((_, i) => (
            <View key={`h_${i}`} style={{
              position: "absolute", left: 0, right: 0,
              top: (MAP_HEIGHT / 4) * (i + 1), height: 1,
              backgroundColor: "rgba(0,0,0,0.04)",
            }} />
          ))}
          {Array.from({ length: 4 }).map((_, i) => (
            <View key={`v_${i}`} style={{
              position: "absolute", top: 0, bottom: 0,
              left: (MAP_WIDTH / 4) * (i + 1), width: 1,
              backgroundColor: "rgba(0,0,0,0.04)",
            }} />
          ))}

          {/* 경로 라인 */}
          <RouteLine points={EXPO_PARK_ROUTE} activeIndex={currentIndex} />

          {/* 경유지 마커 */}
          {EXPO_PARK_ROUTE.map((coord, i) => (
            <WaypointMarker
              key={i}
              coord={coord}
              index={i}
              isActive={i === currentIndex && simStatus === "running"}
              isDone={i < currentIndex || simStatus === "completed"}
            />
          ))}

          {/* 워커 애니메이션 핀 */}
          {(simStatus === "running" || simStatus === "paused") && (
            <AnimatedWalkerPin
              x={currentPixel.x}
              y={currentPixel.y}
              emoji={walkSimulation.walkerEmoji}
            />
          )}

          {/* 지도 라벨 */}
          <View style={s.mapLabel}>
            <Text style={s.mapLabelText}>엑스포 과학공원 일대</Text>
          </View>
        </View>
      </View>

      {/* 워커 정보 카드 */}
      <View style={s.infoCard}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View style={s.walkerAvatar}>
            <Text style={{ fontSize: 24 }}>{walkSimulation.walkerEmoji}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.walkerName}>{walkSimulation.walkerName}</Text>
            <Text style={s.walkerSub}>
              {walkSimulation.petEmoji} {walkSimulation.petName}와 산책 중
            </Text>
          </View>
          <View style={s.locationBadge}>
            <Text style={s.locationBadgeText}>📍 {currentCoord.district}</Text>
          </View>
        </View>
      </View>

      {/* 산책 통계 */}
      <View style={s.statsRow}>
        <View style={s.statItem}>
          <Text style={s.statIcon}>⏱️</Text>
          <Text style={s.statValue}>{formatTime(elapsedSec)}</Text>
          <Text style={s.statLabel}>경과 시간</Text>
        </View>
        <View style={s.statDivider} />
        <View style={s.statItem}>
          <Text style={s.statIcon}>📏</Text>
          <Text style={s.statValue}>{distanceSoFar.toFixed(2)} km</Text>
          <Text style={s.statLabel}>이동 거리</Text>
        </View>
        <View style={s.statDivider} />
        <View style={s.statItem}>
          <Text style={s.statIcon}>📍</Text>
          <Text style={s.statValue}>{currentIndex + 1}/{EXPO_PARK_ROUTE.length}</Text>
          <Text style={s.statLabel}>경유지</Text>
        </View>
      </View>

      {/* 진행 바 */}
      <View style={s.progressBar}>
        <View style={s.progressBg}>
          <View style={[s.progressFill, { width: `${progressPercent}%` }]} />
        </View>
        <Text style={s.progressText}>{currentCoord.label}</Text>
      </View>

      {/* 완료 배너 */}
      {simStatus === "completed" && (
        <View style={s.completedBanner}>
          <Text style={s.completedEmoji}>🎉</Text>
          <Text style={s.completedText}>산책이 완료되었습니다!</Text>
          <Text style={s.completedSub}>
            총 {totalDistance.toFixed(2)}km · {EXPO_PARK_ROUTE.length}개 경유지
          </Text>
        </View>
      )}

      {simStatus === "idle" && (
        <View style={s.idleBanner}>
          <Text style={s.idleEmoji}>⏳</Text>
          <Text style={s.idleText}>시뮬레이션 대기 중</Text>
          <Text style={s.idleSub}>관리자 메뉴에서 시뮬레이션을 시작하세요</Text>
        </View>
      )}
    </ScreenContainer>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
    gap: 12,
  },
  backBtn: { paddingVertical: 4, paddingRight: 8 },
  backBtnText: { fontFamily: Fonts.semiBold, fontSize: 17, color: "#FF6B35" },
  headerTitle: { fontFamily: Fonts.bold, fontSize: 18, color: "#1A1A1A", letterSpacing: -0.3 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontFamily: Fonts.semiBold, fontSize: 12 },
  simBadge: {
    backgroundColor: "#FF6B35",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  simBadgeText: { fontFamily: Fonts.bold, fontSize: 10, color: "#FFFFFF", letterSpacing: 1 },
  mapContainer: { paddingHorizontal: 16, paddingTop: 12 },
  map: {
    width: MAP_WIDTH,
    height: MAP_HEIGHT,
    backgroundColor: "#F5F8F0",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E0E8D8",
    overflow: "hidden",
    position: "relative",
  },
  mapLabel: {
    position: "absolute",
    bottom: 8,
    right: 8,
    backgroundColor: "rgba(255,255,255,0.85)",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  mapLabelText: { fontFamily: Fonts.semiBold, fontSize: 9, color: "#8E8E93" },
  infoCard: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: "#FFF8F5",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#FFE8DD",
  },
  walkerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FF6B35",
  },
  walkerName: { fontFamily: Fonts.bold, fontSize: 15, color: "#1A1A1A" },
  walkerSub: { fontFamily: Fonts.regular, fontSize: 12, color: "#8E8E93", marginTop: 2 },
  locationBadge: {
    backgroundColor: "#FF6B35",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  locationBadgeText: { fontSize: 11, color: "#FFFFFF", fontWeight: "700" },
  statsRow: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginTop: 10,
    backgroundColor: "#F8F8F8",
    borderRadius: 14,
    padding: 14,
    alignItems: "center",
  },
  statItem: { flex: 1, alignItems: "center", gap: 3 },
  statIcon: { fontSize: 18 },
  statValue: { fontFamily: Fonts.bold, fontSize: 14, color: "#1A1A1A" },
  statLabel: { fontFamily: Fonts.regular, fontSize: 10, color: "#8E8E93" },
  statDivider: { width: 1, height: 36, backgroundColor: "#E0E0E0" },
  progressBar: {
    marginHorizontal: 16,
    marginTop: 10,
    gap: 6,
  },
  progressBg: {
    height: 6,
    backgroundColor: "#F0F0F0",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: 6,
    backgroundColor: "#FF6B35",
    borderRadius: 3,
  },
  progressText: {
    fontFamily: Fonts.regular,
    fontSize: 11,
    color: "#8E8E93",
    textAlign: "center",
  },
  completedBanner: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: "#F0FFF4",
    borderRadius: 14,
    padding: 20,
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: "#C6F6D5",
  },
  completedEmoji: { fontSize: 32 },
  completedText: { fontFamily: Fonts.bold, fontSize: 16, color: "#2E7D32" },
  completedSub: { fontFamily: Fonts.regular, fontSize: 12, color: "#4CAF82" },
  idleBanner: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: "#F8F8F8",
    borderRadius: 14,
    padding: 20,
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  idleEmoji: { fontSize: 32 },
  idleText: { fontFamily: Fonts.bold, fontSize: 16, color: "#8E8E93" },
  idleSub: { fontFamily: Fonts.regular, fontSize: 12, color: "#BDBDBD" },
});
