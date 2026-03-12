import * as Location from "expo-location";
import { Platform } from "react-native";

// 대전 주요 동네 좌표 및 범위
export const DAEJEON_NEIGHBORHOODS: Record<string, { lat: number; lng: number; radius: number }> = {
  유성구: { lat: 36.3623, lng: 127.3562, radius: 3.0 },
  둔산: { lat: 36.3516, lng: 127.3825, radius: 2.0 },
  관평: { lat: 36.4180, lng: 127.3920, radius: 2.0 },
  노은: { lat: 36.3778, lng: 127.3278, radius: 2.0 },
  봉명: { lat: 36.3521, lng: 127.3456, radius: 1.5 },
  대덕구: { lat: 36.3468, lng: 127.4153, radius: 3.0 },
  중구: { lat: 36.3254, lng: 127.4213, radius: 2.5 },
  동구: { lat: 36.3120, lng: 127.4550, radius: 3.0 },
  서구: { lat: 36.3553, lng: 127.3836, radius: 2.5 },
};

// 대전 중심 좌표
export const DAEJEON_CENTER = { lat: 36.3504, lng: 127.3845 };

/**
 * 위치 권한 요청
 */
export async function requestLocationPermission(): Promise<boolean> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    return status === "granted";
  } catch (e) {
    console.warn("Location permission error:", e);
    return false;
  }
}

/**
 * 현재 위치 가져오기
 */
export async function getCurrentLocation(): Promise<{ lat: number; lng: number } | null> {
  try {
    if (Platform.OS === "web") {
      // 웹에서는 Geolocation API 사용
      return new Promise((resolve) => {
        if (!navigator.geolocation) {
          resolve(null);
          return;
        }
        navigator.geolocation.getCurrentPosition(
          (position) => {
            resolve({
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            });
          },
          () => resolve(null),
          { enableHighAccuracy: false, timeout: 10000 }
        );
      });
    }

    const hasPermission = await requestLocationPermission();
    if (!hasPermission) return null;

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    return {
      lat: location.coords.latitude,
      lng: location.coords.longitude,
    };
  } catch (e) {
    console.warn("Location error:", e);
    return null;
  }
}

/**
 * 두 좌표 간 거리 계산 (km) - Haversine 공식
 */
export function calculateDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371; // 지구 반지름 (km)
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

/**
 * 좌표로 가장 가까운 동네 찾기
 */
export function findNearestNeighborhood(lat: number, lng: number): string {
  let nearest = "유성구";
  let minDist = Infinity;

  for (const [name, coords] of Object.entries(DAEJEON_NEIGHBORHOODS)) {
    const dist = calculateDistance(lat, lng, coords.lat, coords.lng);
    if (dist < minDist) {
      minDist = dist;
      nearest = name;
    }
  }

  return nearest;
}

/**
 * 거리를 사람이 읽기 쉬운 형태로 변환
 */
export function formatDistance(km: number): string {
  if (km < 0.1) return "100m 이내";
  if (km < 1) return `${Math.round(km * 1000)}m`;
  return `${km.toFixed(1)}km`;
}

/**
 * 동네 주변에 랜덤 좌표 생성 (더미 데이터용)
 */
export function generateNearbyCoords(
  centerLat: number,
  centerLng: number,
  radiusKm: number = 1.5
): { lat: number; lng: number } {
  const latOffset = (Math.random() - 0.5) * 2 * (radiusKm / 111);
  const lngOffset = (Math.random() - 0.5) * 2 * (radiusKm / (111 * Math.cos(toRad(centerLat))));
  return {
    lat: centerLat + latOffset,
    lng: centerLng + lngOffset,
  };
}
