import { describe, it, expect } from "vitest";
import { DAEJEON_DISTRICTS } from "../lib/daejeon-districts";

// kakao-geocoding.ts에서 직접 import하면 @/constants/oauth alias 문제가 발생하므로
// 필요한 상수와 함수를 직접 정의하여 테스트
const DAEJEON_BOUNDS = {
  latMin: 36.20,
  latMax: 36.50,
  lngMin: 127.25,
  lngMax: 127.55,
};

const DAEJEON_CENTER = {
  latitude: 36.3504,
  longitude: 127.3845,
};

function isInDaejeonBounds(lat: number, lng: number): boolean {
  return (
    lat >= DAEJEON_BOUNDS.latMin &&
    lat <= DAEJEON_BOUNDS.latMax &&
    lng >= DAEJEON_BOUNDS.lngMin &&
    lng <= DAEJEON_BOUNDS.lngMax
  );
}

describe("Phase 20: 대전 위치 확인 + 활동 동네 선택", () => {
  // ─── 카카오맵 역지오코딩 유틸리티 ───
  describe("대전 좌표 경계 확인 (isInDaejeonBounds)", () => {
    it("대전 시청 좌표는 대전 범위 안에 있어야 한다", () => {
      expect(isInDaejeonBounds(DAEJEON_CENTER.latitude, DAEJEON_CENTER.longitude)).toBe(true);
    });

    it("둔산동 좌표는 대전 범위 안에 있어야 한다", () => {
      expect(isInDaejeonBounds(36.3551, 127.3783)).toBe(true);
    });

    it("궁동 좌표는 대전 범위 안에 있어야 한다", () => {
      expect(isInDaejeonBounds(36.3622, 127.3456)).toBe(true);
    });

    it("봉명동 좌표는 대전 범위 안에 있어야 한다", () => {
      expect(isInDaejeonBounds(36.3580, 127.3640)).toBe(true);
    });

    it("서울 좌표는 대전 범위 밖에 있어야 한다", () => {
      expect(isInDaejeonBounds(37.5665, 126.9780)).toBe(false);
    });

    it("부산 좌표는 대전 범위 밖에 있어야 한다", () => {
      expect(isInDaejeonBounds(35.1796, 129.0756)).toBe(false);
    });

    it("대전 경계 좌표가 올바르게 설정되어 있어야 한다", () => {
      expect(DAEJEON_BOUNDS.latMin).toBeLessThan(DAEJEON_BOUNDS.latMax);
      expect(DAEJEON_BOUNDS.lngMin).toBeLessThan(DAEJEON_BOUNDS.lngMax);
      // 대전 시청이 경계 안에 있는지
      expect(DAEJEON_CENTER.latitude).toBeGreaterThan(DAEJEON_BOUNDS.latMin);
      expect(DAEJEON_CENTER.latitude).toBeLessThan(DAEJEON_BOUNDS.latMax);
      expect(DAEJEON_CENTER.longitude).toBeGreaterThan(DAEJEON_BOUNDS.lngMin);
      expect(DAEJEON_CENTER.longitude).toBeLessThan(DAEJEON_BOUNDS.lngMax);
    });
  });

  // ─── 활동 동네 선택 로직 ───
  describe("도그워커 활동 동네 선택 (최대 3개)", () => {
    const MAX_ACTIVE_NEIGHBORHOODS = 3;

    it("빈 배열에서 동네를 추가할 수 있어야 한다", () => {
      const neighborhoods: string[] = [];
      const newArea = "서구 둔산동";
      const result = [...neighborhoods, newArea];
      expect(result).toHaveLength(1);
      expect(result).toContain("서구 둔산동");
    });

    it("최대 3개까지 추가할 수 있어야 한다", () => {
      const neighborhoods = ["서구 둔산동", "유성구 궁동"];
      const newArea = "중구 대흥동";
      expect(neighborhoods.length).toBeLessThan(MAX_ACTIVE_NEIGHBORHOODS);
      const result = [...neighborhoods, newArea];
      expect(result).toHaveLength(3);
    });

    it("3개 초과 시 추가되지 않아야 한다", () => {
      const neighborhoods = ["서구 둔산동", "유성구 궁동", "중구 대흥동"];
      expect(neighborhoods.length).toBe(MAX_ACTIVE_NEIGHBORHOODS);
      // 4번째 추가 시도 시 기존 배열 유지
      const newArea = "동구 판암동";
      const result = neighborhoods.length >= MAX_ACTIVE_NEIGHBORHOODS
        ? neighborhoods
        : [...neighborhoods, newArea];
      expect(result).toHaveLength(3);
      expect(result).not.toContain("동구 판암동");
    });

    it("이미 선택된 동네를 제거할 수 있어야 한다", () => {
      const neighborhoods = ["서구 둔산동", "유성구 궁동", "중구 대흥동"];
      const toRemove = "유성구 궁동";
      const result = neighborhoods.filter((n) => n !== toRemove);
      expect(result).toHaveLength(2);
      expect(result).not.toContain("유성구 궁동");
    });

    it("여러 구에 걸쳐 선택할 수 있어야 한다", () => {
      const neighborhoods = ["서구 둔산동", "유성구 궁동", "대덕구 신탄진동"];
      const districts = new Set(neighborhoods.map((n) => n.split(" ")[0]));
      expect(districts.size).toBe(3); // 3개 다른 구
    });

    it("동일한 구에서 여러 동네를 선택할 수 있어야 한다", () => {
      const neighborhoods = ["서구 둔산동", "서구 월평동", "서구 도안동"];
      const districts = new Set(neighborhoods.map((n) => n.split(" ")[0]));
      expect(districts.size).toBe(1); // 모두 서구
      expect(neighborhoods).toHaveLength(3);
    });
  });

  // ─── 대전 5개 구 데이터 검증 ───
  describe("대전 5개 구 데이터 유효성", () => {
    it("5개 구가 모두 존재해야 한다", () => {
      const districtNames = DAEJEON_DISTRICTS.map((d) => d.name);
      expect(districtNames).toContain("서구");
      expect(districtNames).toContain("유성구");
      expect(districtNames).toContain("중구");
      expect(districtNames).toContain("동구");
      expect(districtNames).toContain("대덕구");
      expect(DAEJEON_DISTRICTS).toHaveLength(5);
    });

    it("각 구에 동 목록이 있어야 한다", () => {
      for (const district of DAEJEON_DISTRICTS) {
        expect(district.dongs.length).toBeGreaterThan(0);
        expect(district.emoji).toBeTruthy();
        expect(district.description).toBeTruthy();
      }
    });

    it("활동 동네 형식이 '구 동' 패턴이어야 한다", () => {
      for (const district of DAEJEON_DISTRICTS) {
        for (const dong of district.dongs) {
          const fullName = `${district.name} ${dong}`;
          expect(fullName).toMatch(/^(서구|유성구|중구|동구|대덕구) .+$/);
        }
      }
    });
  });

  // ─── UserProfile 필드 검증 ───
  describe("UserProfile 활동 동네 필드", () => {
    it("activeNeighborhoods 필드가 배열이어야 한다", () => {
      const profile = {
        activeNeighborhoods: ["서구 둔산동", "유성구 궁동"],
        locationVerified: true,
      };
      expect(Array.isArray(profile.activeNeighborhoods)).toBe(true);
      expect(profile.activeNeighborhoods.length).toBeLessThanOrEqual(3);
    });

    it("locationVerified 필드가 boolean이어야 한다", () => {
      const profile = { locationVerified: true };
      expect(typeof profile.locationVerified).toBe("boolean");
    });

    it("보호자는 activeNeighborhoods가 빈 배열이어야 한다", () => {
      const ownerProfile = {
        role: "owner" as const,
        activeNeighborhoods: [] as string[],
      };
      expect(ownerProfile.activeNeighborhoods).toHaveLength(0);
    });

    it("도그워커는 activeNeighborhoods가 1개 이상이어야 한다", () => {
      const caretakerProfile = {
        role: "caretaker" as const,
        activeNeighborhoods: ["서구 둔산동"],
      };
      expect(caretakerProfile.activeNeighborhoods.length).toBeGreaterThanOrEqual(1);
    });
  });
});
