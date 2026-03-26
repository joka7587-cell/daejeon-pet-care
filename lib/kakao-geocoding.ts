/**
 * 카카오맵 역지오코딩 API 유틸리티
 *
 * 사용자의 GPS 좌표를 카카오 REST API로 역지오코딩하여
 * 대전광역시 여부를 확인하고, 구/동 정보를 반환합니다.
 *
 * 서버 프록시(/api/kakao-geocode)를 통해 API 키를 안전하게 사용합니다.
 */

import { getApiBaseUrl } from "@/constants/oauth";

export interface GeocodingResult {
  isDaejeon: boolean;
  city: string;       // 시/도 (예: "대전광역시")
  district: string;   // 구 (예: "유성구")
  dong: string;       // 동 (예: "궁동")
  fullAddress: string; // 전체 주소
  error?: string;
}

/**
 * 좌표를 카카오맵 역지오코딩 API로 변환
 * 서버 프록시를 통해 API 키를 안전하게 사용
 */
export async function reverseGeocode(
  latitude: number,
  longitude: number
): Promise<GeocodingResult> {
  try {
    const baseUrl = getApiBaseUrl();
    const response = await fetch(
      `${baseUrl}/api/kakao-geocode?lat=${latitude}&lng=${longitude}`,
      { method: "GET", headers: { "Content-Type": "application/json" } }
    );

    if (!response.ok) {
      throw new Error(`서버 응답 오류: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error: any) {
    // 서버 연결 실패 시 로컬 폴백 사용
    return localFallbackGeocode(latitude, longitude);
  }
}

/**
 * 대전광역시 좌표 범위 (대략적)
 * 위도: 36.20 ~ 36.50
 * 경도: 127.25 ~ 127.55
 */
export const DAEJEON_BOUNDS = {
  latMin: 36.20,
  latMax: 36.50,
  lngMin: 127.25,
  lngMax: 127.55,
};

/**
 * 대전 5개 구의 대략적 좌표 범위
 */
const DISTRICT_BOUNDS: { name: string; latMin: number; latMax: number; lngMin: number; lngMax: number }[] = [
  { name: "동구",   latMin: 36.28, latMax: 36.38, lngMin: 127.42, lngMax: 127.50 },
  { name: "중구",   latMin: 36.28, latMax: 36.35, lngMin: 127.38, lngMax: 127.44 },
  { name: "서구",   latMin: 36.30, latMax: 36.40, lngMin: 127.33, lngMax: 127.40 },
  { name: "유성구", latMin: 36.33, latMax: 36.43, lngMin: 127.30, lngMax: 127.40 },
  { name: "대덕구", latMin: 36.35, latMax: 36.45, lngMin: 127.40, lngMax: 127.48 },
];

/**
 * 서버 연결 실패 시 로컬 좌표 범위 기반 폴백
 */
function localFallbackGeocode(lat: number, lng: number): GeocodingResult {
  const isDaejeon =
    lat >= DAEJEON_BOUNDS.latMin &&
    lat <= DAEJEON_BOUNDS.latMax &&
    lng >= DAEJEON_BOUNDS.lngMin &&
    lng <= DAEJEON_BOUNDS.lngMax;

  if (!isDaejeon) {
    return {
      isDaejeon: false,
      city: "알 수 없음",
      district: "",
      dong: "",
      fullAddress: "대전 외 지역",
    };
  }

  // 가장 가까운 구 찾기
  let bestDistrict = "서구"; // 기본값
  let bestDistance = Infinity;

  for (const db of DISTRICT_BOUNDS) {
    const centerLat = (db.latMin + db.latMax) / 2;
    const centerLng = (db.lngMin + db.lngMax) / 2;
    const dist = Math.sqrt(
      Math.pow(lat - centerLat, 2) + Math.pow(lng - centerLng, 2)
    );
    if (dist < bestDistance) {
      bestDistance = dist;
      bestDistrict = db.name;
    }
  }

  return {
    isDaejeon: true,
    city: "대전광역시",
    district: bestDistrict,
    dong: "",
    fullAddress: `대전광역시 ${bestDistrict}`,
  };
}

/**
 * 좌표가 대전 범위 내인지 빠르게 확인 (API 호출 없이)
 */
export function isInDaejeonBounds(lat: number, lng: number): boolean {
  return (
    lat >= DAEJEON_BOUNDS.latMin &&
    lat <= DAEJEON_BOUNDS.latMax &&
    lng >= DAEJEON_BOUNDS.lngMin &&
    lng <= DAEJEON_BOUNDS.lngMax
  );
}

/**
 * 대전 시청 좌표 (기본 중심점)
 */
export const DAEJEON_CENTER = {
  latitude: 36.3504,
  longitude: 127.3845,
};
