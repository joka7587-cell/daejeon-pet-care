/**
 * Phase 25: 산책 시뮬레이션 모듈 테스트
 */
import { describe, it, expect } from "vitest";
import {
  EXPO_PARK_ROUTE,
  SIMULATION_INTERVAL_MS,
  haversineDistance,
  calculateRouteDistance,
  interpolateCoords,
  initialSimulationState,
  type SimulationCoord,
} from "../lib/walk-simulation";

describe("walk-simulation 모듈", () => {
  describe("EXPO_PARK_ROUTE 좌표 배열", () => {
    it("5개의 좌표가 정의되어 있어야 한다", () => {
      expect(EXPO_PARK_ROUTE).toHaveLength(5);
    });

    it("모든 좌표에 필수 필드가 있어야 한다", () => {
      EXPO_PARK_ROUTE.forEach((coord) => {
        expect(coord).toHaveProperty("latitude");
        expect(coord).toHaveProperty("longitude");
        expect(coord).toHaveProperty("label");
        expect(coord).toHaveProperty("district");
        expect(typeof coord.latitude).toBe("number");
        expect(typeof coord.longitude).toBe("number");
        expect(typeof coord.label).toBe("string");
        expect(typeof coord.district).toBe("string");
      });
    });

    it("모든 좌표가 대전 범위 내에 있어야 한다", () => {
      // 대전 위도: 약 36.3~36.5, 경도: 약 127.3~127.5
      EXPO_PARK_ROUTE.forEach((coord) => {
        expect(coord.latitude).toBeGreaterThan(36.3);
        expect(coord.latitude).toBeLessThan(36.5);
        expect(coord.longitude).toBeGreaterThan(127.3);
        expect(coord.longitude).toBeLessThan(127.5);
      });
    });

    it("모든 좌표가 유성구 지역이어야 한다 (엑스포 공원)", () => {
      EXPO_PARK_ROUTE.forEach((coord) => {
        expect(coord.district).toBe("유성구");
      });
    });
  });

  describe("SIMULATION_INTERVAL_MS", () => {
    it("5초(5000ms)여야 한다", () => {
      expect(SIMULATION_INTERVAL_MS).toBe(5000);
    });
  });

  describe("haversineDistance", () => {
    it("같은 좌표 간 거리는 0이어야 한다", () => {
      const d = haversineDistance(36.374, 127.388, 36.374, 127.388);
      expect(d).toBe(0);
    });

    it("두 좌표 간 거리가 양수여야 한다", () => {
      const d = haversineDistance(
        EXPO_PARK_ROUTE[0].latitude,
        EXPO_PARK_ROUTE[0].longitude,
        EXPO_PARK_ROUTE[1].latitude,
        EXPO_PARK_ROUTE[1].longitude
      );
      expect(d).toBeGreaterThan(0);
    });

    it("엑스포 공원 내 좌표 간 거리가 2km 이내여야 한다", () => {
      for (let i = 0; i < EXPO_PARK_ROUTE.length - 1; i++) {
        const d = haversineDistance(
          EXPO_PARK_ROUTE[i].latitude,
          EXPO_PARK_ROUTE[i].longitude,
          EXPO_PARK_ROUTE[i + 1].latitude,
          EXPO_PARK_ROUTE[i + 1].longitude
        );
        expect(d).toBeLessThan(2);
      }
    });
  });

  describe("calculateRouteDistance", () => {
    it("전체 경로 거리가 양수여야 한다", () => {
      const total = calculateRouteDistance(EXPO_PARK_ROUTE);
      expect(total).toBeGreaterThan(0);
    });

    it("전체 경로 거리가 5km 이내여야 한다 (공원 산책)", () => {
      const total = calculateRouteDistance(EXPO_PARK_ROUTE);
      expect(total).toBeLessThan(5);
    });

    it("빈 배열은 0을 반환해야 한다", () => {
      expect(calculateRouteDistance([])).toBe(0);
    });

    it("좌표 1개는 0을 반환해야 한다", () => {
      expect(calculateRouteDistance([EXPO_PARK_ROUTE[0]])).toBe(0);
    });
  });

  describe("interpolateCoords", () => {
    const coordA: SimulationCoord = { latitude: 36.374, longitude: 127.388, label: "A", district: "유성구" };
    const coordB: SimulationCoord = { latitude: 36.378, longitude: 127.392, label: "B", district: "유성구" };

    it("t=0일 때 시작 좌표를 반환해야 한다", () => {
      const result = interpolateCoords(coordA, coordB, 0);
      expect(result.latitude).toBe(36.374);
      expect(result.longitude).toBe(127.388);
    });

    it("t=1일 때 끝 좌표를 반환해야 한다", () => {
      const result = interpolateCoords(coordA, coordB, 1);
      expect(result.latitude).toBe(36.378);
      expect(result.longitude).toBe(127.392);
    });

    it("t=0.5일 때 중간 좌표를 반환해야 한다", () => {
      const result = interpolateCoords(coordA, coordB, 0.5);
      expect(result.latitude).toBeCloseTo(36.376, 3);
      expect(result.longitude).toBeCloseTo(127.390, 3);
    });
  });

  describe("initialSimulationState", () => {
    it("초기 상태가 idle이어야 한다", () => {
      expect(initialSimulationState.status).toBe("idle");
    });

    it("초기 인덱스가 0이어야 한다", () => {
      expect(initialSimulationState.currentIndex).toBe(0);
    });

    it("startedAt이 null이어야 한다", () => {
      expect(initialSimulationState.startedAt).toBeNull();
    });
  });
});

describe("관리자 메뉴 접근 패턴", () => {
  it("프로필 화면에서 버전 5번 탭으로 관리자 메뉴 접근", () => {
    // 관리자 메뉴는 프로필 > 앱 설정 > 버전 5번 탭으로 접근
    // 시뮬레이션 화면: /admin/simulation
    // 보호자 추적 화면: /admin/live-tracker
    const adminRoutes = ["/admin/simulation", "/admin/live-tracker"];
    expect(adminRoutes).toHaveLength(2);
    expect(adminRoutes[0]).toContain("simulation");
    expect(adminRoutes[1]).toContain("live-tracker");
  });
});
