import { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Alert,
  Platform,
  ActivityIndicator,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useApp, WalkSession, WalkRoutePoint } from "@/lib/app-context";
import { useColors } from "@/hooks/use-colors";
import * as Haptics from "expo-haptics";
import * as Location from "expo-location";
import { useKeepAwake } from "expo-keep-awake";
import { calculateDistance } from "@/lib/location-service";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  Easing,
} from "react-native-reanimated";

function haptic(type: "light" | "success" | "error" = "light") {
  if (Platform.OS === "web") return;
  if (type === "success") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  else if (type === "error") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  else Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

// 시간 포맷 (HH:MM:SS)
function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// 거리 포맷
function formatDist(km: number): string {
  if (km < 0.01) return "0m";
  if (km < 1) return `${Math.round(km * 1000)}m`;
  return `${km.toFixed(2)}km`;
}

// 속도 포맷
function formatSpeed(kmh: number): string {
  return `${kmh.toFixed(1)} km/h`;
}

export default function WalkTrackerScreen() {
  useKeepAwake(); // 산책 중 화면 꺼짐 방지

  const { petName, petEmoji, requestId, ownerName } = useLocalSearchParams<{
    petName: string;
    petEmoji: string;
    requestId?: string;
    ownerName?: string;
  }>();
  const router = useRouter();
  const { state, dispatch } = useApp();
  const colors = useColors();

  // 산책 세션 상태
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [status, setStatus] = useState<"ready" | "active" | "paused" | "completed">("ready");
  const [elapsedSec, setElapsedSec] = useState(0);
  const [pausedSec, setPausedSec] = useState(0);
  const [distance, setDistance] = useState(0); // km
  const [currentSpeed, setCurrentSpeed] = useState(0); // km/h
  const [maxSpeed, setMaxSpeed] = useState(0);
  const [routePoints, setRoutePoints] = useState<WalkRoutePoint[]>([]);
  const [isGpsReady, setIsGpsReady] = useState(false);
  const [pointCount, setPointCount] = useState(0);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const locationSubRef = useRef<Location.LocationSubscription | null>(null);
  const lastPointRef = useRef<WalkRoutePoint | null>(null);
  const pauseStartRef = useRef<number | null>(null);

  // 애니메이션 - 활성 산책 중 펄스
  const pulseScale = useSharedValue(1);
  const pulseAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  useEffect(() => {
    if (status === "active") {
      pulseScale.value = withRepeat(
        withTiming(1.15, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
    } else {
      pulseScale.value = withTiming(1, { duration: 200 });
    }
  }, [status]);

  // 타이머
  useEffect(() => {
    if (status === "active") {
      timerRef.current = setInterval(() => {
        setElapsedSec((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [status]);

  // GPS 권한 요청 및 준비
  useEffect(() => {
    (async () => {
      if (Platform.OS === "web") {
        // 웹에서는 Geolocation API 사용 가능 여부 확인
        if (navigator.geolocation) {
          setIsGpsReady(true);
        }
        return;
      }
      try {
        const { status: permStatus } = await Location.requestForegroundPermissionsAsync();
        if (permStatus === "granted") {
          setIsGpsReady(true);
        } else {
          Alert.alert("위치 권한 필요", "산책 추적을 위해 위치 권한이 필요합니다.");
        }
      } catch (e) {
        console.warn("Location permission error:", e);
      }
    })();

    return () => {
      // cleanup
      if (locationSubRef.current) {
        locationSubRef.current.remove();
      }
    };
  }, []);

  // GPS 위치 추적 시작
  const startLocationTracking = useCallback(async () => {
    if (Platform.OS === "web") {
      // 웹에서는 watchPosition 사용
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          const point: WalkRoutePoint = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            timestamp: new Date().toISOString(),
          };
          handleNewPoint(point, position.coords.speed);
        },
        (error) => console.warn("Geolocation error:", error),
        { enableHighAccuracy: true, maximumAge: 5000 }
      );
      // 웹에서는 LocationSubscription 대신 watchId 저장
      locationSubRef.current = { remove: () => navigator.geolocation.clearWatch(watchId) } as any;
      return;
    }

    try {
      const sub = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 3000, // 3초마다
          distanceInterval: 5, // 5m 이동 시
        },
        (location) => {
          const point: WalkRoutePoint = {
            lat: location.coords.latitude,
            lng: location.coords.longitude,
            timestamp: new Date().toISOString(),
          };
          handleNewPoint(point, location.coords.speed);
        }
      );
      locationSubRef.current = sub;
    } catch (e) {
      console.warn("Location tracking error:", e);
    }
  }, []);

  // 새 GPS 포인트 처리
  const handleNewPoint = useCallback((point: WalkRoutePoint, speedMs: number | null) => {
    setRoutePoints((prev) => {
      const newPoints = [...prev, point];
      // 거리 계산
      if (prev.length > 0) {
        const lastPt = prev[prev.length - 1];
        const segDist = calculateDistance(lastPt.lat, lastPt.lng, point.lat, point.lng);
        // 비현실적인 점프 필터링 (100m 이상 순간이동은 무시)
        if (segDist < 0.1) {
          setDistance((d) => d + segDist);
        }
      }
      return newPoints;
    });

    // 속도 계산 (m/s -> km/h)
    const speedKmh = speedMs != null && speedMs >= 0 ? speedMs * 3.6 : 0;
    setCurrentSpeed(speedKmh);
    setMaxSpeed((prev) => Math.max(prev, speedKmh));
    setPointCount((c) => c + 1);
    lastPointRef.current = point;
  }, []);

  // 산책 시작
  const handleStart = () => {
    haptic("success");
    const id = `walk_${Date.now()}`;
    setSessionId(id);
    setStatus("active");
    setElapsedSec(0);
    setDistance(0);
    setPausedSec(0);
    setCurrentSpeed(0);
    setMaxSpeed(0);
    setRoutePoints([]);
    setPointCount(0);

    const session: WalkSession = {
      id,
      requestId: requestId || undefined,
      petName: petName || "반려동물",
      petEmoji: petEmoji || "🐕",
      ownerName: ownerName || undefined,
      caretakerName: state.profile.nickname || "돌보미",
      neighborhood: state.profile.neighborhood || "대전",
      status: "active",
      startedAt: new Date().toISOString(),
      totalDistanceKm: 0,
      totalDurationSec: 0,
      routePoints: [],
      avgSpeedKmh: 0,
      maxSpeedKmh: 0,
      pausedDurationSec: 0,
    };

    dispatch({ type: "START_WALK_SESSION", payload: session });
    startLocationTracking();
  };

  // 일시정지
  const handlePause = () => {
    haptic();
    setStatus("paused");
    pauseStartRef.current = Date.now();
    if (locationSubRef.current) {
      locationSubRef.current.remove();
      locationSubRef.current = null;
    }
    if (sessionId) {
      dispatch({ type: "PAUSE_WALK_SESSION", payload: sessionId });
    }
  };

  // 재개
  const handleResume = () => {
    haptic();
    setStatus("active");
    if (pauseStartRef.current) {
      const pauseDuration = Math.floor((Date.now() - pauseStartRef.current) / 1000);
      setPausedSec((prev) => prev + pauseDuration);
      pauseStartRef.current = null;
    }
    startLocationTracking();
    if (sessionId) {
      dispatch({ type: "RESUME_WALK_SESSION", payload: sessionId });
    }
  };

  // 산책 완료
  const handleComplete = () => {
    Alert.alert(
      "산책 완료",
      `${petName || "반려동물"}의 산책을 종료할까요?`,
      [
        { text: "취소", style: "cancel" },
        {
          text: "완료",
          style: "default",
          onPress: () => {
            haptic("success");
            setStatus("completed");

            // GPS 추적 중지
            if (locationSubRef.current) {
              locationSubRef.current.remove();
              locationSubRef.current = null;
            }

            // 일시정지 중이었다면 일시정지 시간 추가
            if (pauseStartRef.current) {
              const pauseDuration = Math.floor((Date.now() - pauseStartRef.current) / 1000);
              setPausedSec((prev) => prev + pauseDuration);
              pauseStartRef.current = null;
            }

            const activeDuration = elapsedSec - pausedSec;
            const avgSpeed = activeDuration > 0 ? (distance / (activeDuration / 3600)) : 0;

            if (sessionId) {
              dispatch({
                type: "UPDATE_WALK_SESSION",
                payload: {
                  sessionId,
                  updates: {
                    totalDistanceKm: distance,
                    totalDurationSec: elapsedSec,
                    routePoints,
                    avgSpeedKmh: Math.round(avgSpeed * 10) / 10,
                    maxSpeedKmh: Math.round(maxSpeed * 10) / 10,
                    pausedDurationSec: pausedSec,
                  },
                },
              });
              dispatch({ type: "COMPLETE_WALK_SESSION", payload: sessionId });

              // 완료 알림
              dispatch({
                type: "ADD_NOTIFICATION",
                payload: {
                  id: `notif_walk_${Date.now()}`,
                  type: "match",
                  title: "산책 완료 🐾",
                  body: `${petName || "반려동물"}의 산책이 완료되었습니다! ${formatDist(distance)}, ${formatTime(elapsedSec)}`,
                  fromNickname: state.profile.nickname,
                  fromEmoji: petEmoji || "🐕",
                  isRead: false,
                  createdAt: new Date().toISOString(),
                  relatedId: sessionId,
                },
              });
            }
          },
        },
      ]
    );
  };

  // 뒤로가기
  const handleBack = () => {
    if (status === "active" || status === "paused") {
      Alert.alert(
        "산책 중단",
        "산책을 중단하고 나가시겠습니까?\n기록이 저장되지 않습니다.",
        [
          { text: "계속 산책", style: "cancel" },
          {
            text: "나가기",
            style: "destructive",
            onPress: () => {
              if (locationSubRef.current) {
                locationSubRef.current.remove();
              }
              router.back();
            },
          },
        ]
      );
    } else {
      router.back();
    }
  };

  const activeDuration = elapsedSec - pausedSec;
  const avgSpeed = activeDuration > 0 ? (distance / (activeDuration / 3600)) : 0;
  const isActive = status === "active";
  const isPaused = status === "paused";
  const isCompleted = status === "completed";
  const isReady = status === "ready";

  const accentColor = state.profile.role === "caretaker" ? "#4CAF82" : "#FF7043";

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      {/* 헤더 */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={handleBack} style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}>
          <Text style={{ fontSize: 24, color: colors.foreground }}>←</Text>
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          {petEmoji || "🐕"} {petName || "산책"} 추적
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        {/* 반려동물 정보 */}
        <View style={[styles.petInfoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={{ fontSize: 40 }}>{petEmoji || "🐕"}</Text>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={[styles.petName, { color: colors.foreground }]}>{petName || "반려동물"}</Text>
            {ownerName && (
              <Text style={[styles.ownerLabel, { color: colors.muted }]}>보호자: {ownerName}</Text>
            )}
            <View style={{ flexDirection: "row", alignItems: "center", marginTop: 4 }}>
              <View style={[styles.statusDot, {
                backgroundColor: isActive ? "#4CAF82" : isPaused ? "#F59E0B" : isCompleted ? colors.muted : colors.border,
              }]} />
              <Text style={[styles.statusText, { color: colors.muted }]}>
                {isReady ? "준비 중" : isActive ? "산책 중" : isPaused ? "일시정지" : "완료"}
              </Text>
            </View>
          </View>
        </View>

        {/* 메인 타이머 & 거리 */}
        <View style={styles.mainStats}>
          <Animated.View style={[styles.timerCircle, { borderColor: isActive ? accentColor : colors.border }, pulseAnimStyle]}>
            <Text style={[styles.timerLabel, { color: colors.muted }]}>시간</Text>
            <Text style={[styles.timerText, { color: colors.foreground }]}>{formatTime(elapsedSec)}</Text>
            {pausedSec > 0 && (
              <Text style={[styles.pausedLabel, { color: colors.warning }]}>
                정지 {formatTime(pausedSec)}
              </Text>
            )}
          </Animated.View>
        </View>

        {/* 통계 카드 그리드 */}
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={{ fontSize: 20 }}>📏</Text>
            <Text style={[styles.statValue, { color: colors.foreground }]}>{formatDist(distance)}</Text>
            <Text style={[styles.statLabel, { color: colors.muted }]}>총 거리</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={{ fontSize: 20 }}>⚡</Text>
            <Text style={[styles.statValue, { color: colors.foreground }]}>{formatSpeed(currentSpeed)}</Text>
            <Text style={[styles.statLabel, { color: colors.muted }]}>현재 속도</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={{ fontSize: 20 }}>📊</Text>
            <Text style={[styles.statValue, { color: colors.foreground }]}>{formatSpeed(avgSpeed)}</Text>
            <Text style={[styles.statLabel, { color: colors.muted }]}>평균 속도</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={{ fontSize: 20 }}>📍</Text>
            <Text style={[styles.statValue, { color: colors.foreground }]}>{pointCount}</Text>
            <Text style={[styles.statLabel, { color: colors.muted }]}>GPS 포인트</Text>
          </View>
        </View>

        {/* GPS 상태 */}
        {!isGpsReady && !isCompleted && (
          <View style={[styles.gpsWarning, { backgroundColor: "#FFF3CD" }]}>
            <ActivityIndicator size="small" color="#F59E0B" />
            <Text style={{ color: "#856404", marginLeft: 8, fontSize: 13 }}>
              GPS 신호를 찾고 있습니다...
            </Text>
          </View>
        )}

        {/* 완료 요약 */}
        {isCompleted && (
          <View style={[styles.completeSummary, { backgroundColor: accentColor + "15", borderColor: accentColor + "40" }]}>
            <Text style={{ fontSize: 28 }}>🎉</Text>
            <Text style={[styles.completeTitle, { color: accentColor }]}>산책 완료!</Text>
            <Text style={[styles.completeStat, { color: colors.foreground }]}>
              {formatDist(distance)} · {formatTime(elapsedSec)} · 평균 {formatSpeed(avgSpeed)}
            </Text>
          </View>
        )}

        {/* 컨트롤 버튼 */}
        <View style={styles.controls}>
          {isReady && (
            <Pressable
              onPress={handleStart}
              disabled={!isGpsReady}
              style={({ pressed }) => [
                styles.startBtn,
                { backgroundColor: isGpsReady ? accentColor : colors.muted },
                pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] },
              ]}
            >
              <Text style={styles.startBtnText}>🐾 산책 시작</Text>
            </Pressable>
          )}

          {isActive && (
            <View style={styles.activeControls}>
              <Pressable
                onPress={handlePause}
                style={({ pressed }) => [
                  styles.controlBtn,
                  { backgroundColor: "#F59E0B" },
                  pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] },
                ]}
              >
                <Text style={styles.controlBtnText}>⏸ 일시정지</Text>
              </Pressable>
              <Pressable
                onPress={handleComplete}
                style={({ pressed }) => [
                  styles.controlBtn,
                  { backgroundColor: accentColor },
                  pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] },
                ]}
              >
                <Text style={styles.controlBtnText}>✅ 완료</Text>
              </Pressable>
            </View>
          )}

          {isPaused && (
            <View style={styles.activeControls}>
              <Pressable
                onPress={handleResume}
                style={({ pressed }) => [
                  styles.controlBtn,
                  { backgroundColor: "#4CAF82" },
                  pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] },
                ]}
              >
                <Text style={styles.controlBtnText}>▶ 재개</Text>
              </Pressable>
              <Pressable
                onPress={handleComplete}
                style={({ pressed }) => [
                  styles.controlBtn,
                  { backgroundColor: accentColor },
                  pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] },
                ]}
              >
                <Text style={styles.controlBtnText}>✅ 완료</Text>
              </Pressable>
            </View>
          )}

          {isCompleted && (
            <View style={styles.activeControls}>
              <Pressable
                onPress={() => router.push("/walk/history" as never)}
                style={({ pressed }) => [
                  styles.controlBtn,
                  { backgroundColor: accentColor },
                  pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] },
                ]}
              >
                <Text style={styles.controlBtnText}>📋 기록 보기</Text>
              </Pressable>
              <Pressable
                onPress={() => router.back()}
                style={({ pressed }) => [
                  styles.controlBtn,
                  { backgroundColor: colors.muted },
                  pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] },
                ]}
              >
                <Text style={styles.controlBtnText}>홈으로</Text>
              </Pressable>
            </View>
          )}
        </View>
      </View>
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
  content: { flex: 1, padding: 16, gap: 16 },
  petInfoCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  petName: { fontSize: 18, fontWeight: "700" },
  ownerLabel: { fontSize: 13, marginTop: 2 },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  statusText: { fontSize: 12, fontWeight: "600" },
  mainStats: { alignItems: "center", paddingVertical: 8 },
  timerCircle: {
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  timerLabel: { fontSize: 13, fontWeight: "500", marginBottom: 4 },
  timerText: { fontSize: 36, fontWeight: "800", fontVariant: ["tabular-nums"] },
  pausedLabel: { fontSize: 11, marginTop: 4, fontWeight: "600" },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  statCard: {
    flex: 1,
    minWidth: "45%",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
  },
  statValue: { fontSize: 18, fontWeight: "700", fontVariant: ["tabular-nums"] },
  statLabel: { fontSize: 11, fontWeight: "500" },
  gpsWarning: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 10,
  },
  completeSummary: {
    alignItems: "center",
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
  },
  completeTitle: { fontSize: 20, fontWeight: "800" },
  completeStat: { fontSize: 14, fontWeight: "500" },
  controls: { marginTop: 8 },
  startBtn: {
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
  },
  startBtnText: { color: "#fff", fontSize: 18, fontWeight: "800" },
  activeControls: { flexDirection: "row", gap: 12 },
  controlBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  controlBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});
