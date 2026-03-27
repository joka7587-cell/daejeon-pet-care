/**
 * 산책 시뮬레이션 모드
 * - 실내 시연용: 실제 GPS 대신 미리 정의된 좌표 배열을 5초 간격으로 전송
 * - 대전 엑스포 과학공원 근처 5개 좌표
 * - 관리자 전용 메뉴에서만 접근 가능
 */

// ─── 대전 엑스포 과학공원 근처 시뮬레이션 경로 (5개 좌표) ───
export interface SimulationCoord {
  latitude: number;
  longitude: number;
  label: string;
  district: string;
}

export const EXPO_PARK_ROUTE: SimulationCoord[] = [
  {
    latitude: 36.3742,
    longitude: 127.3918,
    label: "엑스포 과학공원 정문",
    district: "유성구",
  },
  {
    latitude: 36.3755,
    longitude: 127.3935,
    label: "한빛탑 광장",
    district: "유성구",
  },
  {
    latitude: 36.3768,
    longitude: 127.3910,
    label: "엑스포 다리 방면",
    district: "유성구",
  },
  {
    latitude: 36.3780,
    longitude: 127.3880,
    label: "갑천 산책로",
    district: "유성구",
  },
  {
    latitude: 36.3765,
    longitude: 127.3860,
    label: "엑스포 시민광장",
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
