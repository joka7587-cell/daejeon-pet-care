/**
 * 산책 시뮬레이션 모드
 * - 실내 시연용: 실제 GPS 대신 미리 정의된 좌표 배열을 5초 간격으로 전송
 * - 대전 엑스포 과학공원 → 한빛탑 → 엑스포다리 → 갑천변 산책로 → 엑스포 시민광장
 * - 관리자 전용 메뉴에서만 접근 가능
 *
 * Phase 61 수정사항:
 * - 건물 관통 버그 수정: 실제 도로/보행로를 따르는 40+ 정밀 좌표
 * - 경유지 마커를 주요 입구 3~4곳으로 축소
 * - 마커 이동이 도로 기반 경로만 따르도록 설정
 * - 줌 레벨 3~4 고정, map.panTo() 부드러운 이동
 */

// ─── 좌표 타입 ───
export interface SimulationCoord {
  latitude: number;
  longitude: number;
  label: string;
  district: string;
}

/**
 * 주요 경유지 (마커로 표시할 곳 - 출발지/주요입구/목적지만)
 * 이 배열의 인덱스는 EXPO_PARK_ROUTE 내 해당 좌표의 인덱스와 매핑됨
 */
export interface Waypoint {
  routeIndex: number; // EXPO_PARK_ROUTE 배열 내 인덱스
  label: string;
  emoji: string;
}

export const WAYPOINTS: Waypoint[] = [
  { routeIndex: 0, label: "엑스포과학공원 정문", emoji: "🚩" },
  { routeIndex: 12, label: "한빛탑 광장", emoji: "🗼" },
  { routeIndex: 22, label: "엑스포 다리 중앙", emoji: "🌉" },
  { routeIndex: 39, label: "엑스포 시민광장", emoji: "🏁" },
];

/**
 * 실제 도로/보행로 기반 정밀 경로 (40개 좌표)
 *
 * 경로 설명:
 * 1) 엑스포과학공원 정문 (대덕대로 480) 출발
 * 2) 공원 내부 보행로를 따라 북쪽으로 이동
 * 3) 한빛탑 광장 도착 (공원 중심)
 * 4) 한빛탑에서 서쪽 엑스포다리 방면 보행로
 * 5) 엑스포다리 (갑천 위 보행 전용 다리) 횡단
 * 6) 갑천 서안 산책로 (갑천변 자전거/보행 겸용도로) 남하
 * 7) 엑스포 시민광장 도착
 *
 * 좌표는 카카오맵/네이버지도 위성 사진 기반으로
 * 실제 보도블록, 공원 산책로, 보행 전용 다리 위에만 배치
 */
export const EXPO_PARK_ROUTE: SimulationCoord[] = [
  // ── 구간 1: 엑스포과학공원 정문 → 공원 내부 진입 ──
  {
    latitude: 36.37420,
    longitude: 127.39180,
    label: "엑스포과학공원 정문",
    district: "유성구",
  },
  {
    latitude: 36.37438,
    longitude: 127.39195,
    label: "정문 광장",
    district: "유성구",
  },
  {
    latitude: 36.37460,
    longitude: 127.39215,
    label: "공원 진입로",
    district: "유성구",
  },
  {
    latitude: 36.37485,
    longitude: 127.39240,
    label: "공원 내부 산책로 시작",
    district: "유성구",
  },

  // ── 구간 2: 공원 내부 산책로 → 한빛탑 방면 ──
  {
    latitude: 36.37510,
    longitude: 127.39265,
    label: "과학공원 산책로",
    district: "유성구",
  },
  {
    latitude: 36.37530,
    longitude: 127.39285,
    label: "분수대 앞",
    district: "유성구",
  },
  {
    latitude: 36.37548,
    longitude: 127.39310,
    label: "전시관 앞 보행로",
    district: "유성구",
  },
  {
    latitude: 36.37565,
    longitude: 127.39330,
    label: "전시관 북측 산책로",
    district: "유성구",
  },
  {
    latitude: 36.37580,
    longitude: 127.39345,
    label: "한빛탑 남쪽 광장",
    district: "유성구",
  },
  {
    latitude: 36.37595,
    longitude: 127.39355,
    label: "한빛탑 남서쪽 보행로",
    district: "유성구",
  },
  {
    latitude: 36.37610,
    longitude: 127.39360,
    label: "한빛탑 서측 진입로",
    district: "유성구",
  },
  {
    latitude: 36.37625,
    longitude: 127.39358,
    label: "한빛탑 광장 남측",
    district: "유성구",
  },

  // ── 구간 3: 한빛탑 광장 ──
  {
    latitude: 36.37640,
    longitude: 127.39350,
    label: "한빛탑 광장",
    district: "유성구",
  },
  {
    latitude: 36.37655,
    longitude: 127.39338,
    label: "한빛탑 광장 북측",
    district: "유성구",
  },

  // ── 구간 4: 한빛탑 → 엑스포다리 방면 (서쪽 보행로) ──
  {
    latitude: 36.37668,
    longitude: 127.39318,
    label: "엑스포다리 방면 보행로",
    district: "유성구",
  },
  {
    latitude: 36.37680,
    longitude: 127.39295,
    label: "갑천 방면 산책로",
    district: "유성구",
  },
  {
    latitude: 36.37695,
    longitude: 127.39268,
    label: "갑천 제방 진입",
    district: "유성구",
  },
  {
    latitude: 36.37710,
    longitude: 127.39240,
    label: "갑천 동안 보행로",
    district: "유성구",
  },
  {
    latitude: 36.37725,
    longitude: 127.39210,
    label: "엑스포다리 동측 입구",
    district: "유성구",
  },

  // ── 구간 5: 엑스포다리 횡단 (보행 전용 다리) ──
  {
    latitude: 36.37740,
    longitude: 127.39175,
    label: "엑스포다리 진입",
    district: "유성구",
  },
  {
    latitude: 36.37758,
    longitude: 127.39130,
    label: "엑스포다리 동쪽 구간",
    district: "유성구",
  },
  {
    latitude: 36.37775,
    longitude: 127.39080,
    label: "엑스포다리 중앙부",
    district: "유성구",
  },
  {
    latitude: 36.37790,
    longitude: 127.39025,
    label: "엑스포다리 중앙",
    district: "유성구",
  },
  {
    latitude: 36.37805,
    longitude: 127.38970,
    label: "엑스포다리 서쪽 구간",
    district: "유성구",
  },
  {
    latitude: 36.37818,
    longitude: 127.38915,
    label: "엑스포다리 서측 출구",
    district: "유성구",
  },

  // ── 구간 6: 갑천 서안 산책로 (남쪽으로 이동) ──
  {
    latitude: 36.37830,
    longitude: 127.38870,
    label: "갑천 서안 산책로 진입",
    district: "서구",
  },
  {
    latitude: 36.37815,
    longitude: 127.38840,
    label: "갑천변 산책로",
    district: "서구",
  },
  {
    latitude: 36.37795,
    longitude: 127.38815,
    label: "갑천변 보행로",
    district: "서구",
  },
  {
    latitude: 36.37775,
    longitude: 127.38795,
    label: "갑천변 자전거도로 옆",
    district: "서구",
  },
  {
    latitude: 36.37750,
    longitude: 127.38778,
    label: "갑천변 산책로 중간",
    district: "서구",
  },
  {
    latitude: 36.37725,
    longitude: 127.38765,
    label: "갑천변 벤치 구간",
    district: "서구",
  },
  {
    latitude: 36.37700,
    longitude: 127.38755,
    label: "갑천변 남쪽 산책로",
    district: "서구",
  },

  // ── 구간 7: 갑천변 → 엑스포 시민광장 방면 ──
  {
    latitude: 36.37675,
    longitude: 127.38750,
    label: "시민광장 방면 분기점",
    district: "서구",
  },
  {
    latitude: 36.37650,
    longitude: 127.38755,
    label: "시민광장 북쪽 산책로",
    district: "서구",
  },
  {
    latitude: 36.37625,
    longitude: 127.38765,
    label: "시민광장 진입로",
    district: "서구",
  },
  {
    latitude: 36.37600,
    longitude: 127.38780,
    label: "시민광장 외곽 보행로",
    district: "유성구",
  },

  // ── 구간 8: 엑스포 시민광장 도착 ──
  {
    latitude: 36.37580,
    longitude: 127.38800,
    label: "시민광장 잔디밭 북측",
    district: "유성구",
  },
  {
    latitude: 36.37560,
    longitude: 127.38825,
    label: "시민광장 잔디밭",
    district: "유성구",
  },
  {
    latitude: 36.37540,
    longitude: 127.38850,
    label: "시민광장 중앙",
    district: "유성구",
  },
  {
    latitude: 36.37520,
    longitude: 127.38870,
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
