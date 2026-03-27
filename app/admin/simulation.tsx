/**
 * 관리자 전용 - 산책 시뮬레이션 모드
 * 프로필 > 앱 버전 5번 탭 > 관리자 메뉴 > 산책 시뮬레이션
 * 대전 엑스포 과학공원 근처 5개 좌표를 5초 간격으로 전송
 */
import { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Alert,
  Platform,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useApp } from "@/lib/app-context";
import { useRouter } from "expo-router";
import { Fonts } from "@/hooks/use-fonts";
import * as Haptics from "expo-haptics";
import {
  EXPO_PARK_ROUTE,
  SimulationCoord,
  SIMULATION_INTERVAL_MS,
  haversineDistance,
  calculateRouteDistance,
  interpolateCoords,
  type SimulationStatus,
} from "@/lib/walk-simulation";

const haptic = () => {
  if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
};

export default function SimulationScreen() {
  const { state, dispatch } = useApp();
  const router = useRouter();
  const { walkSimulation } = state;
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const elapsedRef = useRef(0);
  const stepRef = useRef(0);

  const totalDistance = calculateRouteDistance(EXPO_PARK_ROUTE);

  // 시뮬레이션 시작
  const handleStart = useCallback(() => {
    haptic();
    setCurrentStep(0);
    stepRef.current = 0;
    setElapsedSec(0);
    elapsedRef.current = 0;
    setIsRunning(true);

    const startTime = new Date().toISOString();

    // 첫 번째 좌표 즉시 전송
    dispatch({
      type: "SET_WALK_SIMULATION",
      payload: {
        status: "running" as SimulationStatus,
        currentIndex: 0,
        startedAt: startTime,
        walkerName: "자양동 하늘이맘",
        walkerEmoji: "👩‍🦰",
        petName: "초코",
        petEmoji: "🐕",
      },
    });

    // 5초 간격으로 다음 좌표 전송
    timerRef.current = setInterval(() => {
      elapsedRef.current += 5;
      setElapsedSec(elapsedRef.current);

      const nextStep = stepRef.current + 1;
      if (nextStep >= EXPO_PARK_ROUTE.length) {
        // 모든 좌표 전송 완료
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = null;
        setIsRunning(false);
        dispatch({
          type: "SET_WALK_SIMULATION",
          payload: {
            status: "completed" as SimulationStatus,
            currentIndex: EXPO_PARK_ROUTE.length - 1,
          },
        });
        if (Platform.OS !== "web") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        return;
      }

      stepRef.current = nextStep;
      setCurrentStep(nextStep);
      dispatch({
        type: "SET_WALK_SIMULATION",
        payload: {
          status: "running" as SimulationStatus,
          currentIndex: nextStep,
        },
      });
    }, SIMULATION_INTERVAL_MS);
  }, [dispatch]);

  // 시뮬레이션 일시정지
  const handlePause = useCallback(() => {
    haptic();
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsRunning(false);
    dispatch({
      type: "SET_WALK_SIMULATION",
      payload: { status: "paused" as SimulationStatus },
    });
  }, [dispatch]);

  // 시뮬레이션 재개
  const handleResume = useCallback(() => {
    haptic();
    setIsRunning(true);
    dispatch({
      type: "SET_WALK_SIMULATION",
      payload: { status: "running" as SimulationStatus },
    });

    timerRef.current = setInterval(() => {
      elapsedRef.current += 5;
      setElapsedSec(elapsedRef.current);

      const nextStep = stepRef.current + 1;
      if (nextStep >= EXPO_PARK_ROUTE.length) {
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = null;
        setIsRunning(false);
        dispatch({
          type: "SET_WALK_SIMULATION",
          payload: {
            status: "completed" as SimulationStatus,
            currentIndex: EXPO_PARK_ROUTE.length - 1,
          },
        });
        if (Platform.OS !== "web") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        return;
      }

      stepRef.current = nextStep;
      setCurrentStep(nextStep);
      dispatch({
        type: "SET_WALK_SIMULATION",
        payload: {
          status: "running" as SimulationStatus,
          currentIndex: nextStep,
        },
      });
    }, SIMULATION_INTERVAL_MS);
  }, [dispatch]);

  // 시뮬레이션 초기화
  const handleReset = useCallback(() => {
    haptic();
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsRunning(false);
    setCurrentStep(0);
    stepRef.current = 0;
    setElapsedSec(0);
    elapsedRef.current = 0;
    dispatch({
      type: "SET_WALK_SIMULATION",
      payload: {
        status: "idle" as SimulationStatus,
        currentIndex: 0,
        startedAt: null,
      },
    });
  }, [dispatch]);

  // cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const simStatus = walkSimulation.status;
  const progressPercent = ((currentStep + 1) / EXPO_PARK_ROUTE.length) * 100;

  return (
    <ScreenContainer edges={["top", "left", "right", "bottom"]} className="p-0">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* 헤더 */}
        <View style={s.header}>
          <Pressable
            onPress={() => { haptic(); router.back(); }}
            style={({ pressed }) => [s.backBtn, pressed && { opacity: 0.7 }]}
          >
            <Text style={s.backBtnText}>‹ 뒤로</Text>
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={s.headerTitle}>산책 시뮬레이션</Text>
            <Text style={s.headerSub}>관리자 전용 · 시연 모드</Text>
          </View>
          <View style={s.adminBadge}>
            <Text style={s.adminBadgeText}>ADMIN</Text>
          </View>
        </View>

        {/* 경고 배너 */}
        <View style={s.warningBanner}>
          <Text style={s.warningEmoji}>⚠️</Text>
          <Text style={s.warningText}>
            이 기능은 시연 전용입니다. 실제 GPS 대신 미리 정의된 좌표를 5초 간격으로 전송합니다.
          </Text>
        </View>

        {/* 경로 정보 카드 */}
        <View style={s.routeCard}>
          <Text style={s.routeTitle}>📍 시뮬레이션 경로</Text>
          <Text style={s.routeSubtitle}>대전 엑스포 과학공원 일대</Text>
          <View style={s.routeStats}>
            <View style={s.routeStat}>
              <Text style={s.routeStatValue}>{EXPO_PARK_ROUTE.length}</Text>
              <Text style={s.routeStatLabel}>경유지</Text>
            </View>
            <View style={s.routeStatDivider} />
            <View style={s.routeStat}>
              <Text style={s.routeStatValue}>{totalDistance.toFixed(2)} km</Text>
              <Text style={s.routeStatLabel}>총 거리</Text>
            </View>
            <View style={s.routeStatDivider} />
            <View style={s.routeStat}>
              <Text style={s.routeStatValue}>{EXPO_PARK_ROUTE.length * 5}초</Text>
              <Text style={s.routeStatLabel}>소요 시간</Text>
            </View>
          </View>
        </View>

        {/* 좌표 목록 */}
        <View style={s.coordList}>
          <Text style={s.coordListTitle}>경유지 목록</Text>
          {EXPO_PARK_ROUTE.map((coord, i) => {
            const isActive = i === currentStep && simStatus === "running";
            const isDone = i < currentStep || simStatus === "completed";
            return (
              <View
                key={i}
                style={[
                  s.coordItem,
                  isActive && s.coordItemActive,
                  isDone && s.coordItemDone,
                ]}
              >
                <View style={[
                  s.coordIndex,
                  isActive && s.coordIndexActive,
                  isDone && s.coordIndexDone,
                ]}>
                  <Text style={[
                    s.coordIndexText,
                    (isActive || isDone) && { color: "#FFFFFF" },
                  ]}>
                    {isDone ? "✓" : i + 1}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.coordLabel, isActive && { color: "#2E7D32", fontWeight: "700" }]}>
                    {coord.label}
                  </Text>
                  <Text style={s.coordDetail}>
                    {coord.latitude.toFixed(4)}, {coord.longitude.toFixed(4)} · {coord.district}
                  </Text>
                </View>
                {isActive && (
                  <View style={s.liveIndicator}>
                    <View style={s.liveDot} />
                    <Text style={s.liveText}>전송 중</Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {/* 진행 상태 */}
        {simStatus !== "idle" && (
          <View style={s.progressCard}>
            <View style={s.progressHeader}>
              <Text style={s.progressTitle}>진행 상태</Text>
              <Text style={[
                s.progressStatus,
                simStatus === "running" && { color: "#4CAF82" },
                simStatus === "paused" && { color: "#F59E0B" },
                simStatus === "completed" && { color: "#8E8E93" },
              ]}>
                {simStatus === "running" ? "● 실행 중" : simStatus === "paused" ? "● 일시정지" : "● 완료"}
              </Text>
            </View>
            <View style={s.progressBarBg}>
              <View style={[s.progressBarFill, { width: `${progressPercent}%` }]} />
            </View>
            <View style={s.progressInfo}>
              <Text style={s.progressInfoText}>
                {currentStep + 1} / {EXPO_PARK_ROUTE.length} 좌표 전송
              </Text>
              <Text style={s.progressInfoText}>
                경과: {elapsedSec}초
              </Text>
            </View>
          </View>
        )}

        {/* 컨트롤 버튼 */}
        <View style={s.controls}>
          {simStatus === "idle" && (
            <Pressable
              onPress={handleStart}
              style={({ pressed }) => [s.startBtn, pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] }]}
            >
              <Text style={s.startBtnText}>▶ 시뮬레이션 시작</Text>
            </Pressable>
          )}

          {simStatus === "running" && (
            <View style={s.controlRow}>
              <Pressable
                onPress={handlePause}
                style={({ pressed }) => [s.pauseBtn, pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] }]}
              >
                <Text style={s.pauseBtnText}>⏸ 일시정지</Text>
              </Pressable>
              <Pressable
                onPress={handleReset}
                style={({ pressed }) => [s.resetBtn, pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] }]}
              >
                <Text style={s.resetBtnText}>⏹ 중지</Text>
              </Pressable>
            </View>
          )}

          {simStatus === "paused" && (
            <View style={s.controlRow}>
              <Pressable
                onPress={handleResume}
                style={({ pressed }) => [s.startBtn, { flex: 1 }, pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] }]}
              >
                <Text style={s.startBtnText}>▶ 재개</Text>
              </Pressable>
              <Pressable
                onPress={handleReset}
                style={({ pressed }) => [s.resetBtn, pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] }]}
              >
                <Text style={s.resetBtnText}>⏹ 중지</Text>
              </Pressable>
            </View>
          )}

          {simStatus === "completed" && (
            <View style={s.completedCard}>
              <Text style={s.completedEmoji}>🎉</Text>
              <Text style={s.completedText}>시뮬레이션 완료!</Text>
              <Text style={s.completedSub}>
                보호자 앱의 지도에서 마커 이동을 확인하세요.
              </Text>
              <Pressable
                onPress={handleReset}
                style={({ pressed }) => [s.restartBtn, pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] }]}
              >
                <Text style={s.restartBtnText}>↻ 다시 시작</Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* 워커/반려견 정보 */}
        <View style={s.infoCard}>
          <Text style={s.infoTitle}>시뮬레이션 정보</Text>
          <View style={s.infoRow}>
            <Text style={s.infoLabel}>도그워커</Text>
            <Text style={s.infoValue}>👩‍🦰 자양동 하늘이맘</Text>
          </View>
          <View style={s.infoRow}>
            <Text style={s.infoLabel}>반려견</Text>
            <Text style={s.infoValue}>🐕 초코 (말티즈)</Text>
          </View>
          <View style={s.infoRow}>
            <Text style={s.infoLabel}>전송 간격</Text>
            <Text style={s.infoValue}>5초</Text>
          </View>
          <View style={s.infoRow}>
            <Text style={s.infoLabel}>지역</Text>
            <Text style={s.infoValue}>유성구 · 엑스포 과학공원</Text>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
    gap: 12,
  },
  backBtn: {
    paddingVertical: 4,
    paddingRight: 8,
  },
  backBtnText: {
    fontFamily: Fonts.semiBold,
    fontSize: 17,
    color: "#2E7D32",
  },
  headerTitle: {
    fontFamily: Fonts.bold,
    fontSize: 18,
    color: "#1A1A1A",
    letterSpacing: -0.3,
  },
  headerSub: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    color: "#8E8E93",
    marginTop: 2,
  },
  adminBadge: {
    backgroundColor: "#1A1A1A",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  adminBadgeText: {
    fontFamily: Fonts.bold,
    fontSize: 10,
    color: "#FFFFFF",
    letterSpacing: 1,
  },
  warningBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: "#FFF8E1",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#FFE082",
  },
  warningEmoji: { fontSize: 20 },
  warningText: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    color: "#F57F17",
    flex: 1,
    lineHeight: 18,
  },
  routeCard: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: "#F0F8FF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#D0E8FF",
  },
  routeTitle: {
    fontFamily: Fonts.bold,
    fontSize: 16,
    color: "#1A1A1A",
  },
  routeSubtitle: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    color: "#8E8E93",
    marginTop: 4,
  },
  routeStats: {
    flexDirection: "row",
    marginTop: 14,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
  },
  routeStat: { flex: 1, alignItems: "center", gap: 4 },
  routeStatValue: {
    fontFamily: Fonts.bold,
    fontSize: 15,
    color: "#1A1A1A",
  },
  routeStatLabel: {
    fontFamily: Fonts.regular,
    fontSize: 11,
    color: "#8E8E93",
  },
  routeStatDivider: { width: 1, height: 30, backgroundColor: "#E0E8F0" },
  coordList: {
    marginHorizontal: 16,
    marginTop: 16,
  },
  coordListTitle: {
    fontFamily: Fonts.bold,
    fontSize: 15,
    color: "#1A1A1A",
    marginBottom: 10,
  },
  coordItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 6,
    backgroundColor: "#F8F8F8",
    borderWidth: 1,
    borderColor: "#F0F0F0",
  },
  coordItemActive: {
    backgroundColor: "#E8F5E9",
    borderColor: "#2E7D32",
  },
  coordItemDone: {
    backgroundColor: "#F0FFF4",
    borderColor: "#C6F6D5",
  },
  coordIndex: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#E0E0E0",
    alignItems: "center",
    justifyContent: "center",
  },
  coordIndexActive: {
    backgroundColor: "#2E7D32",
  },
  coordIndexDone: {
    backgroundColor: "#4CAF82",
  },
  coordIndexText: {
    fontFamily: Fonts.bold,
    fontSize: 12,
    color: "#8E8E93",
  },
  coordLabel: {
    fontFamily: Fonts.semiBold,
    fontSize: 14,
    color: "#1A1A1A",
  },
  coordDetail: {
    fontFamily: Fonts.regular,
    fontSize: 11,
    color: "#8E8E93",
    marginTop: 2,
  },
  liveIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#2E7D32",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#FFFFFF",
  },
  liveText: {
    fontFamily: Fonts.bold,
    fontSize: 10,
    color: "#FFFFFF",
  },
  progressCard: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#F0F0F0",
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  progressTitle: {
    fontFamily: Fonts.bold,
    fontSize: 14,
    color: "#1A1A1A",
  },
  progressStatus: {
    fontFamily: Fonts.bold,
    fontSize: 12,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: "#F0F0F0",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBarFill: {
    height: 8,
    backgroundColor: "#2E7D32",
    borderRadius: 4,
  },
  progressInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  progressInfoText: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    color: "#8E8E93",
  },
  controls: {
    marginHorizontal: 16,
    marginTop: 16,
  },
  startBtn: {
    backgroundColor: "#2E7D32",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  startBtnText: {
    fontFamily: Fonts.bold,
    fontSize: 16,
    color: "#FFFFFF",
  },
  controlRow: {
    flexDirection: "row",
    gap: 10,
  },
  pauseBtn: {
    flex: 1,
    backgroundColor: "#F59E0B",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  pauseBtnText: {
    fontFamily: Fonts.bold,
    fontSize: 16,
    color: "#FFFFFF",
  },
  resetBtn: {
    backgroundColor: "#EF5350",
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: "center",
  },
  resetBtnText: {
    fontFamily: Fonts.bold,
    fontSize: 16,
    color: "#FFFFFF",
  },
  completedCard: {
    backgroundColor: "#F0FFF4",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#C6F6D5",
  },
  completedEmoji: { fontSize: 40 },
  completedText: {
    fontFamily: Fonts.bold,
    fontSize: 18,
    color: "#2E7D32",
  },
  completedSub: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    color: "#4CAF82",
    textAlign: "center",
    lineHeight: 18,
  },
  restartBtn: {
    marginTop: 8,
    backgroundColor: "#4CAF82",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  restartBtnText: {
    fontFamily: Fonts.bold,
    fontSize: 14,
    color: "#FFFFFF",
  },
  infoCard: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: "#F8F8F8",
    borderRadius: 14,
    padding: 16,
    gap: 10,
  },
  infoTitle: {
    fontFamily: Fonts.bold,
    fontSize: 14,
    color: "#1A1A1A",
    marginBottom: 4,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  infoLabel: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    color: "#8E8E93",
  },
  infoValue: {
    fontFamily: Fonts.semiBold,
    fontSize: 13,
    color: "#1A1A1A",
  },
});
