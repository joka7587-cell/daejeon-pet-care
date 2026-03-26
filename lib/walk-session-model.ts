/**
 * 산책 세션 및 리포트 데이터 모델
 * 실시간 산책 추적, 위치 기록, 리포트 생성
 */

export interface LocationPoint {
  latitude: number;
  longitude: number;
  timestamp: string; // ISO 8601
  accuracy?: number; // 미터 단위
  altitude?: number;
}

export interface WalkSessionData {
  id: string;
  workerId: string;
  workerName: string;
  petName: string;
  petEmoji: string;
  roomId: string; // 채팅방 ID
  
  // 산책 상태
  status: "idle" | "walking" | "paused" | "completed";
  startedAt: string;
  endedAt?: string;
  pausedAt?: string;
  
  // 위치 데이터
  locationPoints: LocationPoint[];
  currentLocation?: LocationPoint;
  
  // 산책 통계
  totalDistanceKm: number;
  totalDurationSec: number;
  pausedDurationSec: number;
  avgSpeedKmh: number;
  maxSpeedKmh: number;
  
  // 메타데이터
  startDistrict?: string; // 시작 동네 (예: "유성구 궁동")
  endDistrict?: string;
  weatherCondition?: string; // "맑음", "흐림", "비"
  notes?: string;
}

export interface WalkPhoto {
  id: string;
  uri: string; // 로컬 파일 URI 또는 S3 URL
  timestamp: string;
  latitude: number;
  longitude: number;
  district: string; // "대전 유성구 궁동"
  formattedTime: string; // "14:30"
}

export interface WalkReportData {
  id: string;
  sessionId: string;
  workerId: string;
  workerName: string;
  petName: string;
  petEmoji: string;
  
  // 기본 정보
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  
  // 산책 통계
  durationMin: number;
  distanceKm: number;
  avgSpeedKmh: number;
  maxSpeedKmh: number;
  
  // 건강 지표 (추정)
  caloriesBurned: number; // kcal
  stepsEstimated: number;
  
  // 사진 및 메모
  photos: WalkPhoto[];
  notes: string;
  
  // 평가
  petMood: "happy" | "normal" | "tired" | null; // 반려견 기분
  workerRating?: number; // 1-5
  
  // 타임스탬프
  createdAt: string;
}

/**
 * 거리 계산 (Haversine 공식)
 * @param lat1 시작점 위도
 * @param lon1 시작점 경도
 * @param lat2 종료점 위도
 * @param lon2 종료점 경도
 * @returns 거리 (km)
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // 지구 반지름 (km)
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

/**
 * 총 거리 계산
 */
export function calculateTotalDistance(points: LocationPoint[]): number {
  if (points.length < 2) return 0;
  
  let totalDistance = 0;
  for (let i = 0; i < points.length - 1; i++) {
    totalDistance += calculateDistance(
      points[i].latitude,
      points[i].longitude,
      points[i + 1].latitude,
      points[i + 1].longitude
    );
  }
  return totalDistance;
}

/**
 * 평균 속도 계산 (km/h)
 */
export function calculateAvgSpeed(
  distanceKm: number,
  durationSec: number
): number {
  if (durationSec === 0) return 0;
  const durationHours = durationSec / 3600;
  return Math.round((distanceKm / durationHours) * 10) / 10;
}

/**
 * 최대 속도 계산 (km/h)
 */
export function calculateMaxSpeed(points: LocationPoint[]): number {
  if (points.length < 2) return 0;
  
  let maxSpeed = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const distance = calculateDistance(
      points[i].latitude,
      points[i].longitude,
      points[i + 1].latitude,
      points[i + 1].longitude
    );
    
    const time1 = new Date(points[i].timestamp).getTime();
    const time2 = new Date(points[i + 1].timestamp).getTime();
    const durationSec = (time2 - time1) / 1000;
    
    if (durationSec > 0) {
      const speedKmh = (distance / (durationSec / 3600));
      maxSpeed = Math.max(maxSpeed, speedKmh);
    }
  }
  
  return Math.round(maxSpeed * 10) / 10;
}

/**
 * 칼로리 소모량 추정
 * 반려견 크기와 산책 속도 기반
 */
export function estimateCaloriesBurned(
  durationMin: number,
  distanceKm: number,
  petSize: "소형" | "중형" | "대형" = "중형"
): number {
  // 기본 칼로리 소모량 (분당, 크기별)
  const caloriesPerMinute: Record<string, number> = {
    소형: 2.5, // 소형견: 분당 2.5 kcal
    중형: 4.0, // 중형견: 분당 4.0 kcal
    대형: 5.5, // 대형견: 분당 5.5 kcal
  };
  
  const baseCalories = caloriesPerMinute[petSize] * durationMin;
  
  // 거리 기반 보정 (km당 추가 칼로리)
  const distanceBonus = distanceKm * 50;
  
  return Math.round(baseCalories + distanceBonus);
}

/**
 * 걸음 수 추정
 * 반려견 크기별 보폭 기반
 */
export function estimateSteps(
  distanceKm: number,
  petSize: "소형" | "중형" | "대형" = "중형"
): number {
  // 반려견 크기별 평균 보폭 (m)
  const strideLength: Record<string, number> = {
    소형: 0.3, // 소형견: 30cm
    중형: 0.5, // 중형견: 50cm
    대형: 0.7, // 대형견: 70cm
  };
  
  const distanceMeters = distanceKm * 1000;
  return Math.round(distanceMeters / strideLength[petSize]);
}

/**
 * 산책 리포트 생성
 */
export function generateWalkReport(
  session: WalkSessionData,
  photos: WalkPhoto[] = [],
  notes: string = "",
  petSize: "소형" | "중형" | "대형" = "중형"
): WalkReportData {
  const startTime = new Date(session.startedAt);
  const endTime = session.endedAt ? new Date(session.endedAt) : new Date();
  
  const durationMin = Math.round(session.totalDurationSec / 60);
  const caloriesBurned = estimateCaloriesBurned(
    durationMin,
    session.totalDistanceKm,
    petSize
  );
  const stepsEstimated = estimateSteps(session.totalDistanceKm, petSize);
  
  return {
    id: `report_${Date.now()}`,
    sessionId: session.id,
    workerId: session.workerId,
    workerName: session.workerName,
    petName: session.petName,
    petEmoji: session.petEmoji,
    date: startTime.toISOString().split("T")[0],
    startTime: `${String(startTime.getHours()).padStart(2, "0")}:${String(startTime.getMinutes()).padStart(2, "0")}`,
    endTime: `${String(endTime.getHours()).padStart(2, "0")}:${String(endTime.getMinutes()).padStart(2, "0")}`,
    durationMin,
    distanceKm: Math.round(session.totalDistanceKm * 100) / 100,
    avgSpeedKmh: session.avgSpeedKmh,
    maxSpeedKmh: session.maxSpeedKmh,
    caloriesBurned,
    stepsEstimated,
    photos,
    notes,
    petMood: null,
    createdAt: new Date().toISOString(),
  };
}

/**
 * 동네 이름 역지오코딩 (대전 기본 매핑)
 */
export function getDistrictFromCoordinates(
  latitude: number,
  longitude: number
): string {
  // 대전 주요 동네 좌표 범위 (간단한 예시)
  const districts: Array<{
    name: string;
    lat: [number, number];
    lon: [number, number];
  }> = [
    {
      name: "유성구 궁동",
      lat: [36.34, 36.36],
      lon: [127.38, 127.40],
    },
    {
      name: "유성구 둔산동",
      lat: [36.35, 36.37],
      lon: [127.39, 127.41],
    },
    {
      name: "서구 둔산동",
      lat: [36.33, 36.35],
      lon: [127.37, 127.39],
    },
    {
      name: "중구 중앙동",
      lat: [36.32, 36.34],
      lon: [127.41, 127.43],
    },
    {
      name: "동구 신문동",
      lat: [36.31, 36.33],
      lon: [127.42, 127.44],
    },
    {
      name: "대덕구 신탄진동",
      lat: [36.30, 36.32],
      lon: [127.40, 127.42],
    },
  ];
  
  for (const district of districts) {
    if (
      latitude >= district.lat[0] &&
      latitude <= district.lat[1] &&
      longitude >= district.lon[0] &&
      longitude <= district.lon[1]
    ) {
      return district.name;
    }
  }
  
  return "대전 미상";
}

/**
 * 산책 세션 초기화
 */
export function createWalkSession(
  workerId: string,
  workerName: string,
  petName: string,
  petEmoji: string,
  roomId: string,
  startLocation: LocationPoint
): WalkSessionData {
  return {
    id: `session_${Date.now()}`,
    workerId,
    workerName,
    petName,
    petEmoji,
    roomId,
    status: "walking",
    startedAt: new Date().toISOString(),
    locationPoints: [startLocation],
    currentLocation: startLocation,
    totalDistanceKm: 0,
    totalDurationSec: 0,
    pausedDurationSec: 0,
    avgSpeedKmh: 0,
    maxSpeedKmh: 0,
    startDistrict: getDistrictFromCoordinates(
      startLocation.latitude,
      startLocation.longitude
    ),
  };
}

/**
 * 산책 세션 업데이트 (새 위치 추가)
 */
export function updateWalkSession(
  session: WalkSessionData,
  newLocation: LocationPoint
): WalkSessionData {
  const updatedPoints = [...session.locationPoints, newLocation];
  const totalDistance = calculateTotalDistance(updatedPoints);
  const startTime = new Date(session.startedAt).getTime();
  const endTime = new Date(newLocation.timestamp).getTime();
  const totalDurationSec = (endTime - startTime) / 1000;
  
  return {
    ...session,
    locationPoints: updatedPoints,
    currentLocation: newLocation,
    totalDistanceKm: totalDistance,
    totalDurationSec,
    avgSpeedKmh: calculateAvgSpeed(totalDistance, totalDurationSec),
    maxSpeedKmh: calculateMaxSpeed(updatedPoints),
  };
}
