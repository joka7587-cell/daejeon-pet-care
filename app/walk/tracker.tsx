import { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Alert,
  Platform,
  ActivityIndicator,
  ScrollView,
  TextInput,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useApp, WalkSession, WalkRoutePoint } from "@/lib/app-context";
import * as Haptics from "expo-haptics";
import * as Location from "expo-location";
import { useKeepAwake } from "expo-keep-awake";
import { calculateDistance } from "@/lib/location-service";
import { Fonts } from "@/hooks/use-fonts";
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

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function formatDist(km: number): string {
  if (km < 0.01) return "0m";
  if (km < 1) return `${Math.round(km * 1000)}m`;
  return `${km.toFixed(2)}km`;
}

function formatSpeed(kmh: number): string {
  return `${kmh.toFixed(1)} km/h`;
}

// 체크리스트 아이템 타입
interface CheckItem {
  id: string;
  label: string;
  emoji: string;
  checked: boolean;
  checkedAt?: string;
  note?: string;
}

const DEFAULT_CHECKLIST: Omit<CheckItem, "checked">[] = [
  { id: "poop", label: "배변 완료", emoji: "💩" },
  { id: "water", label: "물 섭취", emoji: "💧" },
  { id: "snack", label: "간식 급여", emoji: "🦴" },
  { id: "play", label: "놀이 시간", emoji: "🎾" },
  { id: "social", label: "다른 강아지 만남", emoji: "🐕" },
  { id: "issue", label: "특이사항 발생", emoji: "⚠️" },
];

export default function WalkTrackerScreen() {
  useKeepAwake();

  const { petName, petEmoji, requestId, ownerName } = useLocalSearchParams<{
    petName: string;
    petEmoji: string;
    requestId?: string;
    ownerName?: string;
  }>();
  const router = useRouter();
  const { state, dispatch } = useApp();

  // 산책 세션 상태
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [status, setStatus] = useState<"ready" | "active" | "paused" | "completed">("ready");
  const [elapsedSec, setElapsedSec] = useState(0);
  const [pausedSec, setPausedSec] = useState(0);
  const [distance, setDistance] = useState(0);
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [maxSpeed, setMaxSpeed] = useState(0);
  const [routePoints, setRoutePoints] = useState<WalkRoutePoint[]>([]);
  const [isGpsReady, setIsGpsReady] = useState(false);
  const [pointCount, setPointCount] = useState(0);

  // 라이브 체크리스트
  const [checklist, setChecklist] = useState<CheckItem[]>(
    DEFAULT_CHECKLIST.map((c) => ({ ...c, checked: false }))
  );
  const [showChecklist, setShowChecklist] = useState(false);
  const [issueNote, setIssueNote] = useState("");

  // SOS 상태
  const [sosTriggered, setSosTriggered] = useState(false);
  const [stationaryTimer, setStationaryTimer] = useState(0);
  const lastMovementRef = useRef<number>(Date.now());

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const locationSubRef = useRef<Location.LocationSubscription | null>(null);
  const pauseStartRef = useRef<number | null>(null);

  // 애니메이션
  const pulseScale = useSharedValue(1);
  const pulseAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  useEffect(() => {
    if (status === "active") {
      pulseScale.value = withRepeat(
        withTiming(1.15, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        -1, true
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
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [status]);

  // 정지 감지 (SOS 용) - 5분 이상 정지 시 경고
  useEffect(() => {
    if (status !== "active") return;
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - lastMovementRef.current) / 1000);
      setStationaryTimer(elapsed);
      if (elapsed >= 300 && !sosTriggered) {
        // 5분 이상 정지 - 자동 SOS 알림
        triggerSOS("auto");
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [status, sosTriggered]);

  // GPS 권한
  useEffect(() => {
    (async () => {
      if (Platform.OS === "web") {
        if (navigator.geolocation) setIsGpsReady(true);
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
    return () => { if (locationSubRef.current) locationSubRef.current.remove(); };
  }, []);

  const startLocationTracking = useCallback(async () => {
    if (Platform.OS === "web") {
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
      locationSubRef.current = { remove: () => navigator.geolocation.clearWatch(watchId) } as any;
      return;
    }
    try {
      const sub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, timeInterval: 3000, distanceInterval: 5 },
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

  const handleNewPoint = useCallback((point: WalkRoutePoint, speedMs: number | null) => {
    setRoutePoints((prev) => {
      const newPoints = [...prev, point];
      if (prev.length > 0) {
        const lastPt = prev[prev.length - 1];
        const segDist = calculateDistance(lastPt.lat, lastPt.lng, point.lat, point.lng);
        if (segDist < 0.1) {
          setDistance((d) => d + segDist);
          if (segDist > 0.003) {
            lastMovementRef.current = Date.now();
          }
        }
      }
      return newPoints;
    });
    const speedKmh = speedMs != null && speedMs >= 0 ? speedMs * 3.6 : 0;
    setCurrentSpeed(speedKmh);
    setMaxSpeed((prev) => Math.max(prev, speedKmh));
    setPointCount((c) => c + 1);
  }, []);

  // SOS 트리거
  const triggerSOS = (type: "manual" | "auto") => {
    haptic("error");
    setSosTriggered(true);

    const msg = type === "auto"
      ? `⚠️ ${petName || "반려동물"} 산책 중 5분 이상 이동이 감지되지 않습니다. 확인이 필요합니다.`
      : `🆘 ${state.profile.nickname}님이 긴급 도움을 요청했습니다!`;

    dispatch({
      type: "ADD_NOTIFICATION",
      payload: {
        id: `sos_${Date.now()}`,
        type: "system",
        title: type === "auto" ? "⚠️ 이동 감지 안됨" : "🆘 긴급 SOS",
        body: msg,
        isRead: false,
        createdAt: new Date().toISOString(),
        relatedId: sessionId || undefined,
      },
    });

    if (type === "manual") {
      Alert.alert(
        "🆘 SOS 발송 완료",
        "보호자에게 긴급 알림이 전송되었습니다.\n현재 위치가 공유됩니다.",
        [{ text: "확인" }]
      );
    } else {
      Alert.alert(
        "⚠️ 이동 감지 안됨",
        "5분 이상 이동이 감지되지 않았습니다.\n보호자에게 알림이 전송되었습니다.\n\n괜찮으시면 '확인'을 눌러주세요.",
        [
          { text: "확인", onPress: () => { lastMovementRef.current = Date.now(); setSosTriggered(false); } },
        ]
      );
    }
  };

  // 체크리스트 토글
  const toggleCheckItem = (id: string) => {
    haptic();
    setChecklist((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, checked: !item.checked, checkedAt: !item.checked ? new Date().toISOString() : undefined }
          : item
      )
    );

    // 체크 시 보호자에게 실시간 알림
    const item = checklist.find((c) => c.id === id);
    if (item && !item.checked) {
      dispatch({
        type: "ADD_NOTIFICATION",
        payload: {
          id: `check_${id}_${Date.now()}`,
          type: "match",
          title: `${item.emoji} ${item.label}`,
          body: `${petName || "반려동물"} - ${item.label} (${new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })})`,
          isRead: false,
          createdAt: new Date().toISOString(),
          relatedId: sessionId || undefined,
        },
      });
    }
  };

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
    lastMovementRef.current = Date.now();
    setSosTriggered(false);

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

  const handlePause = () => {
    haptic();
    setStatus("paused");
    pauseStartRef.current = Date.now();
    if (locationSubRef.current) { locationSubRef.current.remove(); locationSubRef.current = null; }
    if (sessionId) dispatch({ type: "PAUSE_WALK_SESSION", payload: sessionId });
  };

  const handleResume = () => {
    haptic();
    setStatus("active");
    lastMovementRef.current = Date.now();
    setSosTriggered(false);
    if (pauseStartRef.current) {
      const pd = Math.floor((Date.now() - pauseStartRef.current) / 1000);
      setPausedSec((prev) => prev + pd);
      pauseStartRef.current = null;
    }
    startLocationTracking();
    if (sessionId) dispatch({ type: "RESUME_WALK_SESSION", payload: sessionId });
  };

  const handleComplete = () => {
    Alert.alert("산책 완료", `${petName || "반려동물"}의 산책을 종료할까요?`, [
      { text: "취소", style: "cancel" },
      {
        text: "완료",
        onPress: () => {
          haptic("success");
          setStatus("completed");
          if (locationSubRef.current) { locationSubRef.current.remove(); locationSubRef.current = null; }
          if (pauseStartRef.current) {
            const pd = Math.floor((Date.now() - pauseStartRef.current) / 1000);
            setPausedSec((prev) => prev + pd);
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
    ]);
  };

  const handleBack = () => {
    if (status === "active" || status === "paused") {
      Alert.alert("산책 중단", "산책을 중단하고 나가시겠습니까?\n기록이 저장되지 않습니다.", [
        { text: "계속 산책", style: "cancel" },
        {
          text: "나가기",
          style: "destructive",
          onPress: () => { if (locationSubRef.current) locationSubRef.current.remove(); router.back(); },
        },
      ]);
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
  const checkedCount = checklist.filter((c) => c.checked).length;

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      {/* 헤더 */}
      <View style={st.header}>
        <Pressable onPress={handleBack} style={({ pressed }) => pressed && { opacity: 0.5 }}>
          <Text style={st.headerBack}>‹ 뒤로</Text>
        </Pressable>
        <Text style={st.headerTitle}>{petEmoji || "🐕"} 산책 추적</Text>
        {(isActive || isPaused) && (
          <Pressable
            onPress={() => { haptic(); setShowChecklist(!showChecklist); }}
            style={st.checklistToggle}
          >
            <Text style={st.checklistToggleText}>📋 {checkedCount}/{checklist.length}</Text>
          </Pressable>
        )}
        {isReady && <View style={{ width: 60 }} />}
        {isCompleted && <View style={{ width: 60 }} />}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        <View style={st.content}>
          {/* 반려동물 정보 */}
          <View style={st.petCard}>
            <View style={st.petAvatar}>
              <Text style={{ fontSize: 32 }}>{petEmoji || "🐕"}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={st.petName}>{petName || "반려동물"}</Text>
              {ownerName && <Text style={st.ownerLabel}>보호자: {ownerName}</Text>}
            </View>
            <View style={[st.statusBadge, {
              backgroundColor: isActive ? "#E8F5E9" : isPaused ? "#FFF8E1" : isCompleted ? "#F5F5F5" : "#FFF5F0",
            }]}>
              <View style={[st.statusDot, {
                backgroundColor: isActive ? "#34C759" : isPaused ? "#FF9500" : isCompleted ? "#AEAEB2" : "#FF6B35",
              }]} />
              <Text style={[st.statusText, {
                color: isActive ? "#34C759" : isPaused ? "#FF9500" : isCompleted ? "#AEAEB2" : "#FF6B35",
              }]}>
                {isReady ? "준비 중" : isActive ? "산책 중" : isPaused ? "일시정지" : "완료"}
              </Text>
            </View>
          </View>

          {/* SOS 버튼 (산책 중에만) */}
          {(isActive || isPaused) && (
            <Pressable
              onPress={() => triggerSOS("manual")}
              style={({ pressed }) => [st.sosBtn, pressed && { opacity: 0.8 }]}
            >
              <Text style={st.sosBtnText}>🆘 긴급 SOS</Text>
              <Text style={st.sosBtnSub}>보호자에게 긴급 알림 전송</Text>
            </Pressable>
          )}

          {/* 정지 경고 */}
          {isActive && stationaryTimer >= 120 && !sosTriggered && (
            <View style={st.stationaryWarn}>
              <Text style={st.stationaryWarnText}>
                ⚠️ {Math.floor(stationaryTimer / 60)}분간 이동이 감지되지 않았습니다
              </Text>
            </View>
          )}

          {/* 메인 타이머 */}
          <View style={st.timerSection}>
            <Animated.View style={[st.timerCircle, isActive && st.timerCircleActive, pulseAnimStyle]}>
              <Text style={st.timerLabel}>시간</Text>
              <Text style={st.timerText}>{formatTime(elapsedSec)}</Text>
              {pausedSec > 0 && (
                <Text style={st.pausedLabel}>정지 {formatTime(pausedSec)}</Text>
              )}
            </Animated.View>
          </View>

          {/* 통계 그리드 */}
          <View style={st.statsGrid}>
            <View style={st.statCard}>
              <Text style={{ fontSize: 18 }}>📏</Text>
              <Text style={st.statValue}>{formatDist(distance)}</Text>
              <Text style={st.statLabel}>총 거리</Text>
            </View>
            <View style={st.statCard}>
              <Text style={{ fontSize: 18 }}>⚡</Text>
              <Text style={st.statValue}>{formatSpeed(currentSpeed)}</Text>
              <Text style={st.statLabel}>현재 속도</Text>
            </View>
            <View style={st.statCard}>
              <Text style={{ fontSize: 18 }}>📊</Text>
              <Text style={st.statValue}>{formatSpeed(avgSpeed)}</Text>
              <Text style={st.statLabel}>평균 속도</Text>
            </View>
            <View style={st.statCard}>
              <Text style={{ fontSize: 18 }}>📍</Text>
              <Text style={st.statValue}>{pointCount}</Text>
              <Text style={st.statLabel}>GPS 포인트</Text>
            </View>
          </View>

          {/* 라이브 체크리스트 (토글) */}
          {showChecklist && (isActive || isPaused) && (
            <View style={st.checklistSection}>
              <Text style={st.checklistTitle}>📋 산책 체크리스트</Text>
              <Text style={st.checklistSub}>체크 시 보호자에게 실시간 알림이 전송됩니다</Text>
              {checklist.map((item) => (
                <Pressable
                  key={item.id}
                  onPress={() => toggleCheckItem(item.id)}
                  style={[st.checkItem, item.checked && st.checkItemChecked]}
                >
                  <View style={[st.checkBox, item.checked && st.checkBoxChecked]}>
                    {item.checked && <Text style={st.checkMark}>✓</Text>}
                  </View>
                  <Text style={{ fontSize: 18 }}>{item.emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[st.checkLabel, item.checked && st.checkLabelChecked]}>
                      {item.label}
                    </Text>
                    {item.checked && item.checkedAt && (
                      <Text style={st.checkTime}>
                        {new Date(item.checkedAt).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
                      </Text>
                    )}
                  </View>
                </Pressable>
              ))}

              {/* 특이사항 메모 */}
              <View style={st.issueSection}>
                <Text style={st.issueLabel}>📝 특이사항 메모</Text>
                <TextInput
                  style={st.issueInput}
                  placeholder="산책 중 특이사항을 기록하세요"
                  placeholderTextColor="#AEAEB2"
                  value={issueNote}
                  onChangeText={setIssueNote}
                  multiline
                  numberOfLines={2}
                  textAlignVertical="top"
                />
              </View>
            </View>
          )}

          {/* GPS 상태 */}
          {!isGpsReady && !isCompleted && (
            <View style={st.gpsWarn}>
              <ActivityIndicator size="small" color="#FF9500" />
              <Text style={st.gpsWarnText}>GPS 신호를 찾고 있습니다...</Text>
            </View>
          )}

          {/* 완료 요약 */}
          {isCompleted && (
            <View style={st.completeSummary}>
              <Text style={{ fontSize: 40 }}>🎉</Text>
              <Text style={st.completeTitle}>산책 완료!</Text>
              <Text style={st.completeStat}>
                {formatDist(distance)} · {formatTime(elapsedSec)} · 평균 {formatSpeed(avgSpeed)}
              </Text>
              {checkedCount > 0 && (
                <View style={st.completeChecklist}>
                  <Text style={st.completeCheckTitle}>체크리스트 ({checkedCount}/{checklist.length})</Text>
                  {checklist.filter((c) => c.checked).map((item) => (
                    <Text key={item.id} style={st.completeCheckItem}>
                      {item.emoji} {item.label}
                    </Text>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* 컨트롤 버튼 */}
          <View style={st.controls}>
            {isReady && (
              <Pressable
                onPress={handleStart}
                disabled={!isGpsReady}
                style={({ pressed }) => [
                  st.startBtn,
                  !isGpsReady && { backgroundColor: "#D1D1D6" },
                  pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] },
                ]}
              >
                <Text style={st.startBtnText}>🐾 산책 시작</Text>
              </Pressable>
            )}

            {isActive && (
              <View style={st.btnRow}>
                <Pressable
                  onPress={handlePause}
                  style={({ pressed }) => [st.ctrlBtn, st.pauseBtn, pressed && { opacity: 0.8 }]}
                >
                  <Text style={st.ctrlBtnText}>⏸ 일시정지</Text>
                </Pressable>
                <Pressable
                  onPress={handleComplete}
                  style={({ pressed }) => [st.ctrlBtn, st.completeBtn, pressed && { opacity: 0.8 }]}
                >
                  <Text style={st.ctrlBtnText}>✅ 완료</Text>
                </Pressable>
              </View>
            )}

            {isPaused && (
              <View style={st.btnRow}>
                <Pressable
                  onPress={handleResume}
                  style={({ pressed }) => [st.ctrlBtn, st.resumeBtn, pressed && { opacity: 0.8 }]}
                >
                  <Text style={st.ctrlBtnText}>▶ 재개</Text>
                </Pressable>
                <Pressable
                  onPress={handleComplete}
                  style={({ pressed }) => [st.ctrlBtn, st.completeBtn, pressed && { opacity: 0.8 }]}
                >
                  <Text style={st.ctrlBtnText}>✅ 완료</Text>
                </Pressable>
              </View>
            )}

            {isCompleted && (
              <View style={st.btnRow}>
                <Pressable
                  onPress={() => router.push("/walk/history" as never)}
                  style={({ pressed }) => [st.ctrlBtn, st.completeBtn, pressed && { opacity: 0.8 }]}
                >
                  <Text style={st.ctrlBtnText}>📋 기록 보기</Text>
                </Pressable>
                <Pressable
                  onPress={() => router.back()}
                  style={({ pressed }) => [st.ctrlBtn, { backgroundColor: "#E5E5EA" }, pressed && { opacity: 0.8 }]}
                >
                  <Text style={[st.ctrlBtnText, { color: "#636366" }]}>홈으로</Text>
                </Pressable>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const st = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  headerBack: { fontFamily: Fonts.semiBold, fontSize: 16, color: "#FF6B35" },
  headerTitle: { fontFamily: Fonts.bold, fontSize: 17, color: "#1A1A1A" },
  checklistToggle: {
    backgroundColor: "#FFF5F0",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FFD9C7",
  },
  checklistToggleText: { fontFamily: Fonts.semiBold, fontSize: 12, color: "#FF6B35" },

  content: { padding: 16, gap: 16 },

  // Pet Card
  petCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: "#F0F0F0",
  },
  petAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#FFF5F0",
    alignItems: "center",
    justifyContent: "center",
  },
  petName: { fontFamily: Fonts.bold, fontSize: 16, color: "#1A1A1A" },
  ownerLabel: { fontFamily: Fonts.regular, fontSize: 12, color: "#8E8E93", marginTop: 2 },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 5,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontFamily: Fonts.semiBold, fontSize: 11 },

  // SOS
  sosBtn: {
    backgroundColor: "#FF3B30",
    borderRadius: 14,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  sosBtnText: { fontFamily: Fonts.bold, fontSize: 16, color: "#FFFFFF" },
  sosBtnSub: { fontFamily: Fonts.regular, fontSize: 11, color: "#FFB3AE" },
  stationaryWarn: {
    backgroundColor: "#FFF8E1",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#FFECB3",
  },
  stationaryWarnText: { fontFamily: Fonts.medium, fontSize: 13, color: "#F57F17" },

  // Timer
  timerSection: { alignItems: "center", paddingVertical: 4 },
  timerCircle: {
    width: 170,
    height: 170,
    borderRadius: 85,
    borderWidth: 4,
    borderColor: "#E5E5EA",
    alignItems: "center",
    justifyContent: "center",
  },
  timerCircleActive: { borderColor: "#FF6B35" },
  timerLabel: { fontFamily: Fonts.medium, fontSize: 12, color: "#AEAEB2", marginBottom: 4 },
  timerText: { fontFamily: Fonts.extraBold, fontSize: 34, color: "#1A1A1A", fontVariant: ["tabular-nums"] },
  pausedLabel: { fontFamily: Fonts.medium, fontSize: 11, color: "#FF9500", marginTop: 4 },

  // Stats
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  statCard: {
    flex: 1,
    minWidth: "46%" as any,
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#F0F0F0",
    gap: 3,
  },
  statValue: { fontFamily: Fonts.bold, fontSize: 16, color: "#1A1A1A", fontVariant: ["tabular-nums"] },
  statLabel: { fontFamily: Fonts.regular, fontSize: 10, color: "#AEAEB2" },

  // Checklist
  checklistSection: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#F0F0F0",
  },
  checklistTitle: { fontFamily: Fonts.bold, fontSize: 16, color: "#1A1A1A", marginBottom: 4 },
  checklistSub: { fontFamily: Fonts.regular, fontSize: 11, color: "#AEAEB2", marginBottom: 12 },
  checkItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F5F5F5",
  },
  checkItemChecked: { opacity: 0.7 },
  checkBox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#D1D1D6",
    alignItems: "center",
    justifyContent: "center",
  },
  checkBoxChecked: { backgroundColor: "#FF6B35", borderColor: "#FF6B35" },
  checkMark: { fontFamily: Fonts.bold, fontSize: 12, color: "#FFFFFF" },
  checkLabel: { fontFamily: Fonts.medium, fontSize: 14, color: "#1A1A1A" },
  checkLabelChecked: { textDecorationLine: "line-through", color: "#AEAEB2" },
  checkTime: { fontFamily: Fonts.regular, fontSize: 10, color: "#AEAEB2", marginTop: 1 },

  issueSection: { marginTop: 12 },
  issueLabel: { fontFamily: Fonts.semiBold, fontSize: 13, color: "#1A1A1A", marginBottom: 6 },
  issueInput: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    color: "#1A1A1A",
    backgroundColor: "#F8F8F8",
    borderRadius: 10,
    padding: 12,
    minHeight: 60,
    borderWidth: 1,
    borderColor: "#E5E5EA",
  },

  // GPS
  gpsWarn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF8E1",
    padding: 12,
    borderRadius: 10,
    gap: 8,
  },
  gpsWarnText: { fontFamily: Fonts.medium, fontSize: 13, color: "#F57F17" },

  // Complete
  completeSummary: {
    alignItems: "center",
    backgroundColor: "#FFF5F0",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "#FFD9C7",
    gap: 8,
  },
  completeTitle: { fontFamily: Fonts.extraBold, fontSize: 22, color: "#FF6B35" },
  completeStat: { fontFamily: Fonts.medium, fontSize: 14, color: "#636366" },
  completeChecklist: {
    marginTop: 12,
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 12,
  },
  completeCheckTitle: { fontFamily: Fonts.bold, fontSize: 13, color: "#1A1A1A", marginBottom: 8 },
  completeCheckItem: { fontFamily: Fonts.regular, fontSize: 12, color: "#636366", paddingVertical: 2 },

  // Controls
  controls: { marginTop: 4 },
  startBtn: {
    backgroundColor: "#FF6B35",
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
  },
  startBtnText: { fontFamily: Fonts.extraBold, color: "#fff", fontSize: 18 },
  btnRow: { flexDirection: "row", gap: 10 },
  ctrlBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  ctrlBtnText: { fontFamily: Fonts.bold, color: "#fff", fontSize: 15 },
  pauseBtn: { backgroundColor: "#FF9500" },
  resumeBtn: { backgroundColor: "#34C759" },
  completeBtn: { backgroundColor: "#FF6B35" },
});
