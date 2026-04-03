/**
 * 산책 시뮬레이션 모드 - 멀티 코스 지원
 * - 실내 시연용: 실제 GPS 대신 미리 정의된 좌표 배열을 5초 간격으로 전송
 * - 3개 코스: 엑스포 시민광장(도심형), 유림공원(수변형), 남선공원(숲길형)
 * - 관리자 전용 메뉴에서 코스 선택 후 시뮬레이션 시작
 *
 * Phase 70 수정사항:
 * - 멀티 코스 데이터 구조 (SIMULATION_COURSES 배열)
 * - 코스별 경유지(Waypoint) 및 경로(SimulationCoord[]) 분리
 * - 코스 선택 인터페이스 (SimulationCourse)
 * - 기존 EXPO_PARK_ROUTE / WAYPOINTS 하위 호환 유지
 */

// ─── 좌표 타입 ───
export interface SimulationCoord {
  latitude: number;
  longitude: number;
  label: string;
  district: string;
}

/**
 * 주요 경유지 (마커로 표시할 곳)
 * routeIndex는 해당 코스의 route 배열 내 인덱스
 */
export interface Waypoint {
  routeIndex: number;
  label: string;
  emoji: string;
}

/**
 * 시뮬레이션 코스 정의
 */
export interface SimulationCourse {
  id: string;
  name: string;
  type: string;       // 도심형 / 수변형 / 숲길형
  typeEmoji: string;
  description: string;
  district: string;    // 주요 구
  route: SimulationCoord[];
  waypoints: Waypoint[];
}

// ═══════════════════════════════════════════════════════════════
// 코스 A: 엑스포 시민광장 (도심형)
// 엑스포 시민광장 입구 → 예술의전당 앞 도로 → 엑스포다리 진입로 → 한밭수목원 정문
// ═══════════════════════════════════════════════════════════════
export const COURSE_A_ROUTE: SimulationCoord[] = [
  {
    latitude: 36.368,
    longitude: 127.389,
    label: "엑스포 시민광장 입구",
    district: "유성구",
  },
  {
    latitude: 36.369,
    longitude: 127.389,
    label: "예술의전당 앞 도로",
    district: "유성구",
  },
  {
    latitude: 36.371,
    longitude: 127.389,
    label: "엑스포다리 진입로",
    district: "유성구",
  },
  {
    latitude: 36.372,
    longitude: 127.391,
    label: "한밭수목원 정문",
    district: "유성구",
  },
];

export const COURSE_A_WAYPOINTS: Waypoint[] = [
  { routeIndex: 0, label: "엑스포 시민광장 입구", emoji: "🚩" },
  { routeIndex: 2, label: "엑스포다리 진입로", emoji: "🌳" },
  { routeIndex: 3, label: "한밭수목원 정문", emoji: "🏁" },
];

// ═══════════════════════════════════════════════════════════════
// 코스 B: 유림공원 (수변형)
// 유림공원 남문 → 호수 산책로 → 분수대 광장 → 유림공원 북문
// ═══════════════════════════════════════════════════════════════
export const COURSE_B_ROUTE: SimulationCoord[] = [
  {
    latitude: 36.362,
    longitude: 127.358,
    label: "유림공원 남문",
    district: "서구",
  },
  {
    latitude: 36.363,
    longitude: 127.358,
    label: "호수 산책로",
    district: "서구",
  },
  {
    latitude: 36.364,
    longitude: 127.359,
    label: "분수대 광장",
    district: "서구",
  },
  {
    latitude: 36.365,
    longitude: 127.361,
    label: "유림공원 북문",
    district: "서구",
  },
];

export const COURSE_B_WAYPOINTS: Waypoint[] = [
  { routeIndex: 0, label: "유림공원 남문", emoji: "🚩" },
  { routeIndex: 2, label: "분수대 광장", emoji: "⛲" },
  { routeIndex: 3, label: "유림공원 북문", emoji: "🏁" },
];

// ═══════════════════════════════════════════════════════════════
// 코스 C: 남선공원 (숲길형)
// 남선공원 입구 → 숲길 산책로 → 전망대 방면 → 남선공원 정상
// ═══════════════════════════════════════════════════════════════
export const COURSE_C_ROUTE: SimulationCoord[] = [
  {
    latitude: 36.345,
    longitude: 127.402,
    label: "남선공원 입구",
    district: "서구",
  },
  {
    latitude: 36.346,
    longitude: 127.403,
    label: "숲길 산책로",
    district: "서구",
  },
  {
    latitude: 36.347,
    longitude: 127.404,
    label: "전망대 방면",
    district: "서구",
  },
  {
    latitude: 36.348,
    longitude: 127.405,
    label: "남선공원 정상",
    district: "서구",
  },
];

export const COURSE_C_WAYPOINTS: Waypoint[] = [
  { routeIndex: 0, label: "남선공원 입구", emoji: "🚩" },
  { routeIndex: 2, label: "전망대 방면", emoji: "🏔️" },
  { routeIndex: 3, label: "남선공원 정상", emoji: "🏁" },
];

// ═══════════════════════════════════════════════════════════════
// 전체 코스 목록
// ═══════════════════════════════════════════════════════════════
export const SIMULATION_COURSES: SimulationCourse[] = [
  {
    id: "course_a",
    name: "엑스포 시민광장",
    type: "도심형",
    typeEmoji: "🏙️",
    description: "엑스포 시민광장 → 예술의전당 → 엑스포다리 → 한밭수목원",
    district: "유성구",
    route: COURSE_A_ROUTE,
    waypoints: COURSE_A_WAYPOINTS,
  },
  {
    id: "course_b",
    name: "유림공원",
    type: "수변형",
    typeEmoji: "💧",
    description: "유림공원 남문 → 호수 산책로 → 분수대 광장 → 북문",
    district: "서구",
    route: COURSE_B_ROUTE,
    waypoints: COURSE_B_WAYPOINTS,
  },
  {
    id: "course_c",
    name: "남선공원",
    type: "숲길형",
    typeEmoji: "🌲",
    description: "남선공원 입구 → 숲길 산책로 → 전망대 → 정상",
    district: "서구",
    route: COURSE_C_ROUTE,
    waypoints: COURSE_C_WAYPOINTS,
  },
];

// ─── 하위 호환: 기존 코드에서 사용하는 EXPO_PARK_ROUTE / WAYPOINTS ───
export const EXPO_PARK_ROUTE = COURSE_A_ROUTE;
export const WAYPOINTS = COURSE_A_WAYPOINTS;

// ─── 코스 ID로 코스 찾기 ───
export function getCourseById(courseId: string): SimulationCourse {
  return SIMULATION_COURSES.find(c => c.id === courseId) || SIMULATION_COURSES[0];
}

// ─── 시뮬레이션 상태 ───
export type SimulationStatus = "idle" | "running" | "paused" | "completed";

export interface WalkSimulationState {
  status: SimulationStatus;
  currentIndex: number;
  totalPoints: number;
  route: SimulationCoord[];
  startedAt: string | null;
  walkerName: string;
  walkerEmoji: string;
  petName: string;
  petEmoji: string;
  courseId: string;
}

export const initialSimulationState: WalkSimulationState = {
  status: "idle",
  currentIndex: 0,
  totalPoints: EXPO_PARK_ROUTE.length,
  route: EXPO_PARK_ROUTE,
  startedAt: null,
  walkerName: "자양동 하늘이맘",
  walkerEmoji: "👩‍🦰",
  petName: "초코",
  petEmoji: "🐕",
  courseId: "course_a",
};

// ─── 두 좌표 사이 거리 계산 (Haversine, km) ───
export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// ─── 시뮬레이션 경로 총 거리 계산 ───
export function calculateRouteDistance(route: SimulationCoord[]): number {
  let total = 0;
  for (let i = 1; i < route.length; i++) {
    total += haversineDistance(
      route[i - 1].latitude,
      route[i - 1].longitude,
      route[i].latitude,
      route[i].longitude
    );
  }
  return total;
}

// ─── 두 좌표 사이 보간 (애니메이션용) ───
export function interpolateCoords(
  from: SimulationCoord,
  to: SimulationCoord,
  progress: number // 0~1
): { latitude: number; longitude: number } {
  return {
    latitude: from.latitude + (to.latitude - from.latitude) * progress,
    longitude: from.longitude + (to.longitude - from.longitude) * progress,
  };
}

// ─── 시뮬레이션 간격 (ms) ───
export const SIMULATION_INTERVAL_MS = 5000;

// ─── 관리자 비밀 코드 (프로필 화면에서 버전 5번 탭) ───
export const ADMIN_TAP_COUNT = 5;
export const ADMIN_TAP_TIMEOUT_MS = 3000;
