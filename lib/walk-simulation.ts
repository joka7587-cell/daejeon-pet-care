/**
 * 산책 시뮬레이션 모드
 * - 실내 시연용: 실제 GPS 대신 미리 정의된 좌표 배열을 5초 간격으로 전송
 * - 대전 엑스포 시민광장 → 예술의전당 앞 도로 → 엑스포다리 진입로 → 한밭수목원 정문
 * - 관리자 전용 메뉴에서만 접근 가능
 *
 * Phase 63 수정사항:
 * - 경로를 4개 도로 좌표로 단순화 (건물 관통 완전 방지)
 * - 경유지 UI를 3개로 최적화 (출발/경유/도착)
 * - Polyline 색상 #3366FF, strokeWeight 5
 * - 마커가 도로 좌표만 따라 이동
 */

// ─── 좌표 타입 ───
export interface SimulationCoord {
  latitude: number;
  longitude: number;
  label: string;
  district: string;
}

/**
 * 주요 경유지 (마커로 표시할 곳 - 출발/경유/도착 3개)
 * routeIndex는 EXPO_PARK_ROUTE 배열 내 해당 좌표의 인덱스
 */
export interface Waypoint {
  routeIndex: number;
  label: string;
  emoji: string;
}

export const WAYPOINTS: Waypoint[] = [
  { routeIndex: 0, label: "엑스포 시민광장 입구", emoji: "🚩" },
  { routeIndex: 2, label: "한밭수목원 산책로", emoji: "🌳" },
  { routeIndex: 3, label: "수목원 정문 (관리소)", emoji: "🏁" },
];

/**
 * 실제 도로 기반 경로 (4개 좌표)
 *
 * 경로 설명:
 * 1) 시작점: 엑스포 시민광장 입구 (36.368, 127.389)
 * 2) 경유지 1: 예술의전당 앞 도로 (36.369, 127.389)
 * 3) 경유지 2: 엑스포다리 진입로 (36.371, 127.389)
 * 4) 목적지: 한밭수목원 정문 (36.372, 127.391)
 *
 * 좌표는 카카오맵 기준 실제 도로/인도 위에만 배치
 */
export const EXPO_PARK_ROUTE: SimulationCoord[] = [
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
