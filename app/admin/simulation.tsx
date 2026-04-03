/**
 * 관리자 전용 - 산책 시뮬레이션 모드 (멀티 코스)
 * 프로필 > 앱 버전 5번 탭 > 관리자 메뉴 > 산책 시뮬레이션
 *
 * Phase 71: 강제 동기화 시스템
 * - 1초 간격 보간 좌표 전송 (부드러운 마커 이동)
 * - localStorage 키를 'walker_location'으로 통일
 * - 코스명/진행률/상태 정보 함께 전송
 * - 보호자 뷰와 완벽 동기화
 */
import { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Platform,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useApp } from "@/lib/app-context";
import { useRouter } from "expo-router";
import { Fonts } from "@/hooks/use-fonts";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  SIMULATION_COURSES,
  getCourseById,
  SIMULATION_INTERVAL_MS,
  haversineDistance,
  calculateRouteDistance,
  interpolateCoords,
  type SimulationStatus,
  type SimulationCourse,
  type SimulationCoord,
  type Waypoint,
} from "@/lib/walk-simulation";

const haptic = () => {
  if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
};

// ─── 통합 위치 브로드캐스트 (walker_location 키 사용) ───
const STORAGE_KEY = "walker_location";

interface WalkerLocationPayload {
  lat: number;
  lng: number;
  label: string;
  index: number;         // 현재 경유지 인덱스
  courseId: string;
  courseName: string;
  courseType: string;
  progress: number;      // 0~100 진행률
  status: SimulationStatus;
  timestamp: number;
  interpolated: boolean; // 보간 좌표 여부
}

const broadcastWalkerLocation = (payload: WalkerLocationPayload) => {
  const json = JSON.stringify(payload);

  // 웹 localStorage (StorageEvent 트리거)
  if (Platform.OS === "web" && typeof window !== "undefined" && window.localStorage) {
    window.localStorage.setItem(STORAGE_KEY, json);
    // 같은 탭 내 동기화를 위해 CustomEvent도 발행
    try {
      window.dispatchEvent(new CustomEvent("walker_location_update", { detail: payload }));
    } catch {}
  }

  // AsyncStorage (네이티브 + 폴백)
  AsyncStorage.setItem(STORAGE_KEY, json).catch(() => {});
  // 하위 호환: 기존 키도 업데이트
  AsyncStorage.setItem("walk_simulation_current", json).catch(() => {});
};

const clearWalkerLocation = () => {
  if (Platform.OS === "web" && typeof window !== "undefined" && window.localStorage) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ status: "idle", timestamp: Date.now() }));
  }
  AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
  AsyncStorage.removeItem("walk_simulation_current").catch(() => {});
  // 하위 호환: 기존 키도 정리
  if (Platform.OS === "web" && typeof window !== "undefined" && window.localStorage) {
    window.localStorage.removeItem("currentLocation");
  }
};

// 시뮬레이션 상태를 AsyncStorage에 영속 저장
const saveSimState = async (data: any) => {
  try {
    await AsyncStorage.setItem("walk_simulation_state", JSON.stringify({
      ...data,
      lastUpdate: Date.now(),
    }));
  } catch {}
};

const restoreSimState = async () => {
  try {
    const saved = await AsyncStorage.getItem("walk_simulation_state");
    if (saved) {
      const state = JSON.parse(saved);
      const elapsed = Date.now() - state.startTime;
      if (state.isRunning && elapsed < 3600000) {
        return { ...state, elapsedTime: elapsed };
      }
    }
  } catch {}
  return null;
};

export default function SimulationScreen() {
  const { state, dispatch } = useApp();
  const router = useRouter();
  const { walkSimulation } = state;

  // 타이머 refs
  const mainTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const interpTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [currentStep, setCurrentStep] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const elapsedRef = useRef(0);
  const stepRef = useRef(0);

  // ─── 멀티 코스 선택 상태 ───
  const [selectedCourseId, setSelectedCourseId] = useState<string>("course_a");
  const [showCourseDropdown, setShowCourseDropdown] = useState(false);

  const selectedCourse = getCourseById(selectedCourseId);
  const activeRoute = selectedCourse.route;
  const activeWaypoints = selectedCourse.waypoints;
  const totalDistance = calculateRouteDistance(activeRoute);

  // 보간 전송 시작 (두 경유지 사이를 1초 간격으로 보간)
  const startInterpolation = useCallback((
    fromCoord: SimulationCoord,
    toCoord: SimulationCoord,
    fromIndex: number,
    toIndex: number,
    courseId: string,
    course: SimulationCourse,
    routeLength: number,
  ) => {
    // 기존 보간 타이머 정리
    if (interpTimerRef.current) {
      clearInterval(interpTimerRef.current);
      interpTimerRef.current = null;
    }

    const totalSteps = Math.floor(SIMULATION_INTERVAL_MS / 1000); // 5단계 (5초 / 1초)
    let interpStep = 0;

    interpTimerRef.current = setInterval(() => {
      interpStep++;
      if (interpStep >= totalSteps) {
        // 보간 완료 - 정확한 목표 좌표 전송
        if (interpTimerRef.current) {
          clearInterval(interpTimerRef.current);
          interpTimerRef.current = null;
        }
        return;
      }

      const t = interpStep / totalSteps;
      const interp = interpolateCoords(fromCoord, toCoord, t);
      const progress = ((fromIndex + t) / (routeLength - 1)) * 100;

      broadcastWalkerLocation({
        lat: interp.latitude,
        lng: interp.longitude,
        label: `${fromCoord.label} → ${toCoord.label}`,
        index: fromIndex,
        courseId,
        courseName: course.name,
        courseType: course.type,
        progress: Math.min(progress, 100),
        status: "running",
        timestamp: Date.now(),
        interpolated: true,
      });
    }, 1000);
  }, []);

  // 경유지 좌표 전송 + 보간 시작
  const sendWaypointAndInterpolate = useCallback((
    stepIndex: number,
    route: SimulationCoord[],
    courseId: string,
    course: SimulationCourse,
  ) => {
    const coord = route[stepIndex];
    const progress = (stepIndex / (route.length - 1)) * 100;

    // 정확한 경유지 좌표 전송
    broadcastWalkerLocation({
      lat: coord.latitude,
      lng: coord.longitude,
      label: coord.label,
      index: stepIndex,
      courseId,
      courseName: course.name,
      courseType: course.type,
      progress: Math.min(progress, 100),
      status: "running",
      timestamp: Date.now(),
      interpolated: false,
    });

    // 다음 경유지가 있으면 보간 시작
    if (stepIndex < route.length - 1) {
      startInterpolation(
        coord,
        route[stepIndex + 1],
        stepIndex,
        stepIndex + 1,
        courseId,
        course,
        route.length,
      );
    }
  }, [startInterpolation]);

  // 모든 타이머 정리
  const clearAllTimers = useCallback(() => {
    if (mainTimerRef.current) {
      clearInterval(mainTimerRef.current);
      mainTimerRef.current = null;
    }
    if (interpTimerRef.current) {
      clearInterval(interpTimerRef.current);
      interpTimerRef.current = null;
    }
  }, []);

  // 코스 선택 핸들러
  const handleSelectCourse = useCallback((courseId: string) => {
    haptic();
    setSelectedCourseId(courseId);
    setShowCourseDropdown(false);
    clearAllTimers();
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
  }, [dispatch, clearAllTimers]);

  // ─── 시뮬레이션 시작 ───
  const handleStart = useCallback(() => {
    haptic();
    clearAllTimers();
    setCurrentStep(0);
    stepRef.current = 0;
    setElapsedSec(0);
    elapsedRef.current = 0;
    setIsRunning(true);

    const startTime = new Date().toISOString();
    const route = activeRoute;
    const courseId = selectedCourseId;
    const course = selectedCourse;

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

    // 첫 경유지 전송 + 보간 시작
    sendWaypointAndInterpolate(0, route, courseId, course);

    saveSimState({
      isRunning: true,
      startTime: Date.now(),
      currentPath: { lat: route[0].latitude, lng: route[0].longitude, index: 0, courseId },
    });

    // 5초 간격으로 다음 경유지 전송
    mainTimerRef.current = setInterval(() => {
      elapsedRef.current += 5;
      setElapsedSec(elapsedRef.current);

      const nextStep = stepRef.current + 1;
      if (nextStep >= route.length) {
        clearAllTimers();
        setIsRunning(false);

        // 완료 상태 전송
        const lastCoord = route[route.length - 1];
        broadcastWalkerLocation({
          lat: lastCoord.latitude,
          lng: lastCoord.longitude,
          label: lastCoord.label,
          index: route.length - 1,
          courseId,
          courseName: course.name,
          courseType: course.type,
          progress: 100,
          status: "completed",
          timestamp: Date.now(),
          interpolated: false,
        });

        dispatch({
          type: "SET_WALK_SIMULATION",
          payload: {
            status: "completed" as SimulationStatus,
            currentIndex: route.length - 1,
          },
        });
        AsyncStorage.removeItem("walk_simulation_state").catch(() => {});
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

      // 경유지 전송 + 보간
      sendWaypointAndInterpolate(nextStep, route, courseId, course);

      saveSimState({
        isRunning: true,
        startTime: Date.now() - elapsedRef.current * 1000,
        currentPath: { lat: route[nextStep].latitude, lng: route[nextStep].longitude, index: nextStep, courseId },
      });
    }, SIMULATION_INTERVAL_MS);
  }, [dispatch, activeRoute, selectedCourseId, selectedCourse, clearAllTimers, sendWaypointAndInterpolate]);

  // ─── 일시정지 ───
  const handlePause = useCallback(() => {
    haptic();
    clearAllTimers();
    setIsRunning(false);

    const route = activeRoute;
    const course = selectedCourse;
    const coord = route[stepRef.current];

    broadcastWalkerLocation({
      lat: coord.latitude,
      lng: coord.longitude,
      label: coord.label,
      index: stepRef.current,
      courseId: selectedCourseId,
      courseName: course.name,
      courseType: course.type,
      progress: (stepRef.current / (route.length - 1)) * 100,
      status: "paused",
      timestamp: Date.now(),
      interpolated: false,
    });

    dispatch({
      type: "SET_WALK_SIMULATION",
      payload: { status: "paused" as SimulationStatus },
    });
  }, [dispatch, activeRoute, selectedCourse, selectedCourseId, clearAllTimers]);

  // ─── 재개 ───
  const handleResume = useCallback(() => {
    haptic();
    setIsRunning(true);
    dispatch({
      type: "SET_WALK_SIMULATION",
      payload: { status: "running" as SimulationStatus },
    });

    const route = activeRoute;
    const courseId = selectedCourseId;
    const course = selectedCourse;

    // 현재 위치 재전송 + 보간
    sendWaypointAndInterpolate(stepRef.current, route, courseId, course);

    mainTimerRef.current = setInterval(() => {
      elapsedRef.current += 5;
      setElapsedSec(elapsedRef.current);

      const nextStep = stepRef.current + 1;
      if (nextStep >= route.length) {
        clearAllTimers();
        setIsRunning(false);

        const lastCoord = route[route.length - 1];
        broadcastWalkerLocation({
          lat: lastCoord.latitude,
          lng: lastCoord.longitude,
          label: lastCoord.label,
          index: route.length - 1,
          courseId,
          courseName: course.name,
          courseType: course.type,
          progress: 100,
          status: "completed",
          timestamp: Date.now(),
          interpolated: false,
        });

        dispatch({
          type: "SET_WALK_SIMULATION",
          payload: {
            status: "completed" as SimulationStatus,
            currentIndex: route.length - 1,
          },
        });
        AsyncStorage.removeItem("walk_simulation_state").catch(() => {});
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

      sendWaypointAndInterpolate(nextStep, route, courseId, course);

      saveSimState({
        isRunning: true,
        startTime: Date.now() - elapsedRef.current * 1000,
        currentPath: { lat: route[nextStep].latitude, lng: route[nextStep].longitude, index: nextStep, courseId },
      });
    }, SIMULATION_INTERVAL_MS);
  }, [dispatch, activeRoute, selectedCourseId, selectedCourse, clearAllTimers, sendWaypointAndInterpolate]);

  // ─── 초기화 ───
  const handleReset = useCallback(() => {
    haptic();
    clearAllTimers();
    setIsRunning(false);
    setCurrentStep(0);
    stepRef.current = 0;
    setElapsedSec(0);
    elapsedRef.current = 0;
    clearWalkerLocation();
    AsyncStorage.removeItem("walk_simulation_state").catch(() => {});
    dispatch({
      type: "SET_WALK_SIMULATION",
      payload: {
        status: "idle" as SimulationStatus,
        currentIndex: 0,
        startedAt: null,
      },
    });
  }, [dispatch, clearAllTimers]);

  // ─── 화면 재진입 시 상태 복구 ───
  useEffect(() => {
    const restore = async () => {
      const savedState = await restoreSimState();
      if (savedState && savedState.isRunning) {
        const courseId = savedState.currentPath?.courseId || "course_a";
        setSelectedCourseId(courseId);
        const course = getCourseById(courseId);
        const route = course.route;

        const elapsedMs = savedState.elapsedTime;
        const elapsedSeconds = Math.floor(elapsedMs / 1000);
        const calculatedStep = Math.min(
          Math.floor(elapsedMs / SIMULATION_INTERVAL_MS),
          route.length - 1
        );

        setCurrentStep(calculatedStep);
        stepRef.current = calculatedStep;
        setElapsedSec(elapsedSeconds);
        elapsedRef.current = elapsedSeconds;
        setIsRunning(true);

        dispatch({
          type: "SET_WALK_SIMULATION",
          payload: {
            status: "running" as SimulationStatus,
            currentIndex: calculatedStep,
            startedAt: new Date(savedState.startTime).toISOString(),
          },
        });

        // 현재 위치 즉시 전송
        sendWaypointAndInterpolate(calculatedStep, route, courseId, course);

        if (calculatedStep < route.length - 1) {
          mainTimerRef.current = setInterval(() => {
            elapsedRef.current += 5;
            setElapsedSec(elapsedRef.current);

            const nextStep = stepRef.current + 1;
            if (nextStep >= route.length) {
              clearAllTimers();
              setIsRunning(false);

              const lastCoord = route[route.length - 1];
              broadcastWalkerLocation({
                lat: lastCoord.latitude,
                lng: lastCoord.longitude,
                label: lastCoord.label,
                index: route.length - 1,
                courseId,
                courseName: course.name,
                courseType: course.type,
                progress: 100,
                status: "completed",
                timestamp: Date.now(),
                interpolated: false,
              });

              dispatch({
                type: "SET_WALK_SIMULATION",
                payload: {
                  status: "completed" as SimulationStatus,
                  currentIndex: route.length - 1,
                },
              });
              AsyncStorage.removeItem("walk_simulation_state").catch(() => {});
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

            sendWaypointAndInterpolate(nextStep, route, courseId, course);

            saveSimState({
              isRunning: true,
              startTime: Date.now() - elapsedRef.current * 1000,
              currentPath: { lat: route[nextStep].latitude, lng: route[nextStep].longitude, index: nextStep, courseId },
            });
          }, SIMULATION_INTERVAL_MS);
        } else {
          setIsRunning(false);
          dispatch({
            type: "SET_WALK_SIMULATION",
            payload: {
              status: "completed" as SimulationStatus,
              currentIndex: route.length - 1,
            },
          });
        }
      }
    };
    restore();

    return () => { clearAllTimers(); };
  }, [dispatch, clearAllTimers, sendWaypointAndInterpolate]);

  const simStatus = walkSimulation.status;
  const progressPercent = ((currentStep + 1) / activeRoute.length) * 100;

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
            이 기능은 시연 전용입니다. 1초 간격 보간 좌표로 부드러운 마커 이동을 제공합니다.
          </Text>
        </View>

        {/* ─── 코스 선택 드롭다운 ─── */}
        <View style={s.courseSelector}>
          <Text style={s.courseSelectorTitle}>🗺️ 산책 코스 선택</Text>
          <Pressable
            onPress={() => {
              if (simStatus === "idle") {
                haptic();
                setShowCourseDropdown(!showCourseDropdown);
              }
            }}
            style={({ pressed }) => [
              s.courseDropdownBtn,
              pressed && simStatus === "idle" && { opacity: 0.85 },
              simStatus !== "idle" && { opacity: 0.5 },
            ]}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}>
              <Text style={{ fontSize: 20 }}>{selectedCourse.typeEmoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.courseDropdownName}>{selectedCourse.name}</Text>
                <Text style={s.courseDropdownType}>
                  {selectedCourse.type} · {selectedCourse.district}
                </Text>
              </View>
            </View>
            <Text style={{ fontSize: 14, color: "#8E8E93" }}>
              {showCourseDropdown ? "▲" : "▼"}
            </Text>
          </Pressable>

          {showCourseDropdown && (
            <View style={s.courseDropdownList}>
              {SIMULATION_COURSES.map((course) => {
                const isSelected = course.id === selectedCourseId;
                return (
                  <Pressable
                    key={course.id}
                    onPress={() => handleSelectCourse(course.id)}
                    style={({ pressed }) => [
                      s.courseDropdownItem,
                      isSelected && s.courseDropdownItemSelected,
                      pressed && { opacity: 0.85 },
                    ]}
                  >
                    <Text style={{ fontSize: 24 }}>{course.typeEmoji}</Text>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                        <Text style={[
                          s.courseDropdownItemName,
                          isSelected && { color: "#2E7D32" },
                        ]}>
                          {course.name}
                        </Text>
                        <View style={[
                          s.courseTypeBadge,
                          isSelected && { backgroundColor: "#2E7D32" },
                        ]}>
                          <Text style={s.courseTypeBadgeText}>{course.type}</Text>
                        </View>
                      </View>
                      <Text style={s.courseDropdownItemDesc}>{course.description}</Text>
                      <Text style={s.courseDropdownItemMeta}>
                        {course.district} · {course.route.length}개 좌표 · {calculateRouteDistance(course.route).toFixed(2)}km
                      </Text>
                    </View>
                    {isSelected && (
                      <Text style={{ fontSize: 16, color: "#2E7D32" }}>✓</Text>
                    )}
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>

        {/* 경로 정보 카드 */}
        <View style={s.routeCard}>
          <Text style={s.routeTitle}>📍 시뮬레이션 경로</Text>
          <Text style={s.routeSubtitle}>
            {selectedCourse.name} ({selectedCourse.type}) · {selectedCourse.district}
          </Text>
          <View style={s.routeStats}>
            <View style={s.routeStat}>
              <Text style={s.routeStatValue}>{activeRoute.length}</Text>
              <Text style={s.routeStatLabel}>경유지</Text>
            </View>
            <View style={s.routeStatDivider} />
            <View style={s.routeStat}>
              <Text style={s.routeStatValue}>{totalDistance.toFixed(2)} km</Text>
              <Text style={s.routeStatLabel}>총 거리</Text>
            </View>
            <View style={s.routeStatDivider} />
            <View style={s.routeStat}>
              <Text style={s.routeStatValue}>{activeRoute.length * 5}초</Text>
              <Text style={s.routeStatLabel}>소요 시간</Text>
            </View>
          </View>
        </View>

        {/* 경유지 목록 */}
        <View style={s.coordList}>
          <Text style={s.coordListTitle}>산책 경로</Text>
          {activeWaypoints.map((wp, i) => {
            const coord = activeRoute[wp.routeIndex];
            const isActive = currentStep >= wp.routeIndex && (
              i === activeWaypoints.length - 1 || currentStep < activeWaypoints[i + 1].routeIndex
            ) && simStatus === "running";
            const isDone = currentStep > wp.routeIndex || simStatus === "completed";
            const tag = i === 0 ? "출발" : i === activeWaypoints.length - 1 ? "도착" : "경유";
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
                    {isDone ? "✓" : wp.emoji}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <View style={{
                      backgroundColor: i === 0 ? "#2E7D32" : i === activeWaypoints.length - 1 ? "#D32F2F" : "#1565C0",
                      borderRadius: 4,
                      paddingHorizontal: 6,
                      paddingVertical: 2,
                    }}>
                      <Text style={{ fontSize: 10, color: "#FFFFFF", fontWeight: "700" }}>{tag}</Text>
                    </View>
                    <Text style={[s.coordLabel, isActive && { color: "#2E7D32", fontWeight: "700" }]}>
                      {wp.label}
                    </Text>
                  </View>
                  <Text style={s.coordDetail}>
                    {coord.latitude.toFixed(3)}, {coord.longitude.toFixed(3)} · {coord.district}
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
                {currentStep + 1} / {activeRoute.length} 좌표 전송
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
            <Text style={s.infoLabel}>전송 방식</Text>
            <Text style={s.infoValue}>1초 보간 · 5초 경유지</Text>
          </View>
          <View style={s.infoRow}>
            <Text style={s.infoLabel}>선택 코스</Text>
            <Text style={s.infoValue}>{selectedCourse.typeEmoji} {selectedCourse.name} ({selectedCourse.type})</Text>
          </View>
          <View style={s.infoRow}>
            <Text style={s.infoLabel}>지역</Text>
            <Text style={s.infoValue}>{selectedCourse.district}</Text>
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
  backBtn: { paddingVertical: 4, paddingRight: 8 },
  backBtnText: { fontFamily: Fonts.semiBold, fontSize: 17, color: "#2E7D32" },
  headerTitle: { fontFamily: Fonts.bold, fontSize: 18, color: "#1A1A1A", letterSpacing: -0.3 },
  headerSub: { fontFamily: Fonts.regular, fontSize: 12, color: "#8E8E93", marginTop: 2 },
  adminBadge: { backgroundColor: "#1A1A1A", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  adminBadgeText: { fontFamily: Fonts.bold, fontSize: 10, color: "#FFFFFF", letterSpacing: 1 },
  warningBanner: {
    flexDirection: "row", alignItems: "center", gap: 8,
    marginHorizontal: 16, marginTop: 12,
    backgroundColor: "#FFF8E1", borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: "#FFE082",
  },
  warningEmoji: { fontSize: 20 },
  warningText: { fontFamily: Fonts.regular, fontSize: 13, color: "#F57F17", flex: 1, lineHeight: 18 },
  courseSelector: { marginHorizontal: 16, marginTop: 16 },
  courseSelectorTitle: { fontFamily: Fonts.bold, fontSize: 15, color: "#1A1A1A", marginBottom: 8 },
  courseDropdownBtn: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#FFFFFF", borderRadius: 14, padding: 14,
    borderWidth: 2, borderColor: "#2E7D32",
  },
  courseDropdownName: { fontFamily: Fonts.bold, fontSize: 15, color: "#1A1A1A" },
  courseDropdownType: { fontFamily: Fonts.regular, fontSize: 12, color: "#8E8E93", marginTop: 2 },
  courseDropdownList: {
    marginTop: 6, backgroundColor: "#FFFFFF", borderRadius: 14,
    borderWidth: 1, borderColor: "#E0E0E0", overflow: "hidden",
  },
  courseDropdownItem: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingVertical: 14, paddingHorizontal: 14,
    borderBottomWidth: 1, borderBottomColor: "#F5F5F5",
  },
  courseDropdownItemSelected: { backgroundColor: "#F0FFF4" },
  courseDropdownItemName: { fontFamily: Fonts.bold, fontSize: 14, color: "#1A1A1A" },
  courseDropdownItemDesc: { fontFamily: Fonts.regular, fontSize: 12, color: "#666666", marginTop: 3, lineHeight: 16 },
  courseDropdownItemMeta: { fontFamily: Fonts.regular, fontSize: 11, color: "#8E8E93", marginTop: 2 },
  courseTypeBadge: { backgroundColor: "#1565C0", borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  courseTypeBadgeText: { fontFamily: Fonts.bold, fontSize: 10, color: "#FFFFFF" },
  routeCard: {
    marginHorizontal: 16, marginTop: 16,
    backgroundColor: "#F0F8FF", borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: "#D0E8FF",
  },
  routeTitle: { fontFamily: Fonts.bold, fontSize: 16, color: "#1A1A1A" },
  routeSubtitle: { fontFamily: Fonts.regular, fontSize: 13, color: "#8E8E93", marginTop: 4 },
  routeStats: {
    flexDirection: "row", marginTop: 14,
    backgroundColor: "#FFFFFF", borderRadius: 12, padding: 12, alignItems: "center",
  },
  routeStat: { flex: 1, alignItems: "center", gap: 4 },
  routeStatValue: { fontFamily: Fonts.bold, fontSize: 15, color: "#1A1A1A" },
  routeStatLabel: { fontFamily: Fonts.regular, fontSize: 11, color: "#8E8E93" },
  routeStatDivider: { width: 1, height: 30, backgroundColor: "#E0E8F0" },
  coordList: { marginHorizontal: 16, marginTop: 16 },
  coordListTitle: { fontFamily: Fonts.bold, fontSize: 15, color: "#1A1A1A", marginBottom: 10 },
  coordItem: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12, marginBottom: 6,
    backgroundColor: "#F8F8F8", borderWidth: 1, borderColor: "#F0F0F0",
  },
  coordItemActive: { backgroundColor: "#E8F5E9", borderColor: "#2E7D32" },
  coordItemDone: { backgroundColor: "#F0FFF4", borderColor: "#C6F6D5" },
  coordIndex: { width: 28, height: 28, borderRadius: 14, backgroundColor: "#E0E0E0", alignItems: "center", justifyContent: "center" },
  coordIndexActive: { backgroundColor: "#2E7D32" },
  coordIndexDone: { backgroundColor: "#4CAF82" },
  coordIndexText: { fontFamily: Fonts.bold, fontSize: 12, color: "#8E8E93" },
  coordLabel: { fontFamily: Fonts.semiBold, fontSize: 14, color: "#1A1A1A" },
  coordDetail: { fontFamily: Fonts.regular, fontSize: 11, color: "#8E8E93", marginTop: 2 },
  liveIndicator: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "#2E7D32", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#FFFFFF" },
  liveText: { fontFamily: Fonts.bold, fontSize: 10, color: "#FFFFFF" },
  progressCard: {
    marginHorizontal: 16, marginTop: 16,
    backgroundColor: "#FFFFFF", borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: "#F0F0F0",
  },
  progressHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  progressTitle: { fontFamily: Fonts.bold, fontSize: 14, color: "#1A1A1A" },
  progressStatus: { fontFamily: Fonts.bold, fontSize: 12 },
  progressBarBg: { height: 8, backgroundColor: "#F0F0F0", borderRadius: 4, overflow: "hidden" },
  progressBarFill: { height: 8, backgroundColor: "#2E7D32", borderRadius: 4 },
  progressInfo: { flexDirection: "row", justifyContent: "space-between", marginTop: 8 },
  progressInfoText: { fontFamily: Fonts.regular, fontSize: 12, color: "#8E8E93" },
  controls: { marginHorizontal: 16, marginTop: 16 },
  startBtn: { backgroundColor: "#2E7D32", borderRadius: 14, paddingVertical: 16, alignItems: "center" },
  startBtnText: { fontFamily: Fonts.bold, fontSize: 16, color: "#FFFFFF" },
  controlRow: { flexDirection: "row", gap: 10 },
  pauseBtn: { flex: 1, backgroundColor: "#F59E0B", borderRadius: 14, paddingVertical: 16, alignItems: "center" },
  pauseBtnText: { fontFamily: Fonts.bold, fontSize: 16, color: "#FFFFFF" },
  resetBtn: { backgroundColor: "#EF5350", borderRadius: 14, paddingVertical: 16, paddingHorizontal: 24, alignItems: "center" },
  resetBtnText: { fontFamily: Fonts.bold, fontSize: 16, color: "#FFFFFF" },
  completedCard: {
    backgroundColor: "#F0FFF4", borderRadius: 16, padding: 24,
    alignItems: "center", gap: 8, borderWidth: 1, borderColor: "#C6F6D5",
  },
  completedEmoji: { fontSize: 40 },
  completedText: { fontFamily: Fonts.bold, fontSize: 18, color: "#2E7D32" },
  completedSub: { fontFamily: Fonts.regular, fontSize: 13, color: "#4CAF82", textAlign: "center", lineHeight: 18 },
  restartBtn: { marginTop: 8, backgroundColor: "#4CAF82", borderRadius: 12, paddingVertical: 12, paddingHorizontal: 24 },
  restartBtnText: { fontFamily: Fonts.bold, fontSize: 14, color: "#FFFFFF" },
  infoCard: { marginHorizontal: 16, marginTop: 16, backgroundColor: "#F8F8F8", borderRadius: 14, padding: 16, gap: 10 },
  infoTitle: { fontFamily: Fonts.bold, fontSize: 14, color: "#1A1A1A", marginBottom: 4 },
  infoRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  infoLabel: { fontFamily: Fonts.regular, fontSize: 13, color: "#8E8E93" },
  infoValue: { fontFamily: Fonts.semiBold, fontSize: 13, color: "#1A1A1A" },
});
