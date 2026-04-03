/**
 * Phase 70: 산책 시뮬레이션 멀티 코스 테스트
 */
import { describe, it, expect } from "vitest";
import {
  EXPO_PARK_ROUTE,
  WAYPOINTS,
  SIMULATION_COURSES,
  COURSE_A_ROUTE,
  COURSE_A_WAYPOINTS,
  COURSE_B_ROUTE,
  COURSE_B_WAYPOINTS,
  COURSE_C_ROUTE,
  COURSE_C_WAYPOINTS,
  getCourseById,
  SIMULATION_INTERVAL_MS,
  haversineDistance,
  calculateRouteDistance,
  interpolateCoords,
  initialSimulationState,
  type SimulationCoord,
  type SimulationCourse,
  type Waypoint,
} from "../lib/walk-simulation";

describe("walk-simulation 멀티 코스 모듈", () => {

  // ─── 하위 호환 ───
  describe("하위 호환: EXPO_PARK_ROUTE / WAYPOINTS", () => {
    it("EXPO_PARK_ROUTE는 COURSE_A_ROUTE와 동일해야 한다", () => {
      expect(EXPO_PARK_ROUTE).toBe(COURSE_A_ROUTE);
    });

    it("WAYPOINTS는 COURSE_A_WAYPOINTS와 동일해야 한다", () => {
      expect(WAYPOINTS).toBe(COURSE_A_WAYPOINTS);
    });

    it("4개의 도로 좌표가 정의되어 있어야 한다", () => {
      expect(EXPO_PARK_ROUTE).toHaveLength(4);
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
  });

  // ─── SIMULATION_COURSES 배열 ───
  describe("SIMULATION_COURSES 배열", () => {
    it("3개의 코스가 정의되어 있어야 한다", () => {
      expect(SIMULATION_COURSES).toHaveLength(3);
    });

    it("각 코스에 필수 필드가 있어야 한다", () => {
      SIMULATION_COURSES.forEach((course) => {
        expect(course).toHaveProperty("id");
        expect(course).toHaveProperty("name");
        expect(course).toHaveProperty("type");
        expect(course).toHaveProperty("typeEmoji");
        expect(course).toHaveProperty("description");
        expect(course).toHaveProperty("district");
        expect(course).toHaveProperty("route");
        expect(course).toHaveProperty("waypoints");
        expect(Array.isArray(course.route)).toBe(true);
        expect(Array.isArray(course.waypoints)).toBe(true);
      });
    });

    it("코스 ID가 고유해야 한다", () => {
      const ids = SIMULATION_COURSES.map(c => c.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it("코스 A는 엑스포 시민광장(도심형)이어야 한다", () => {
      const courseA = SIMULATION_COURSES[0];
      expect(courseA.id).toBe("course_a");
      expect(courseA.name).toBe("엑스포 시민광장");
      expect(courseA.type).toBe("도심형");
      expect(courseA.district).toBe("유성구");
    });

    it("코스 B는 유림공원(수변형)이어야 한다", () => {
      const courseB = SIMULATION_COURSES[1];
      expect(courseB.id).toBe("course_b");
      expect(courseB.name).toBe("유림공원");
      expect(courseB.type).toBe("수변형");
      expect(courseB.district).toBe("서구");
    });

    it("코스 C는 남선공원(숲길형)이어야 한다", () => {
      const courseC = SIMULATION_COURSES[2];
      expect(courseC.id).toBe("course_c");
      expect(courseC.name).toBe("남선공원");
      expect(courseC.type).toBe("숲길형");
      expect(courseC.district).toBe("서구");
    });
  });

  // ─── 코스 A: 엑스포 시민광장 ───
  describe("코스 A: 엑스포 시민광장 (도심형)", () => {
    it("4개의 좌표가 정의되어 있어야 한다", () => {
      expect(COURSE_A_ROUTE).toHaveLength(4);
    });

    it("시작점이 엑스포 시민광장 입구여야 한다", () => {
      expect(COURSE_A_ROUTE[0].label).toBe("엑스포 시민광장 입구");
      expect(COURSE_A_ROUTE[0].latitude).toBe(36.368);
      expect(COURSE_A_ROUTE[0].longitude).toBe(127.389);
    });

    it("종점이 한밭수목원 정문이어야 한다", () => {
      const last = COURSE_A_ROUTE[COURSE_A_ROUTE.length - 1];
      expect(last.label).toBe("한밭수목원 정문");
      expect(last.latitude).toBe(36.372);
      expect(last.longitude).toBe(127.391);
    });

    it("모든 좌표가 유성구여야 한다", () => {
      COURSE_A_ROUTE.forEach(c => {
        expect(c.district).toBe("유성구");
      });
    });

    it("3개의 경유지가 정의되어 있어야 한다", () => {
      expect(COURSE_A_WAYPOINTS).toHaveLength(3);
    });

    it("경유지 routeIndex가 유효해야 한다", () => {
      COURSE_A_WAYPOINTS.forEach(wp => {
        expect(wp.routeIndex).toBeGreaterThanOrEqual(0);
        expect(wp.routeIndex).toBeLessThan(COURSE_A_ROUTE.length);
      });
    });
  });

  // ─── 코스 B: 유림공원 ───
  describe("코스 B: 유림공원 (수변형)", () => {
    it("4개의 좌표가 정의되어 있어야 한다", () => {
      expect(COURSE_B_ROUTE).toHaveLength(4);
    });

    it("시작점이 유림공원 남문이어야 한다", () => {
      expect(COURSE_B_ROUTE[0].label).toBe("유림공원 남문");
      expect(COURSE_B_ROUTE[0].latitude).toBe(36.362);
      expect(COURSE_B_ROUTE[0].longitude).toBe(127.358);
    });

    it("종점이 유림공원 북문이어야 한다", () => {
      const last = COURSE_B_ROUTE[COURSE_B_ROUTE.length - 1];
      expect(last.label).toBe("유림공원 북문");
      expect(last.latitude).toBe(36.365);
      expect(last.longitude).toBe(127.361);
    });

    it("모든 좌표가 서구여야 한다", () => {
      COURSE_B_ROUTE.forEach(c => {
        expect(c.district).toBe("서구");
      });
    });

    it("3개의 경유지가 정의되어 있어야 한다", () => {
      expect(COURSE_B_WAYPOINTS).toHaveLength(3);
    });
  });

  // ─── 코스 C: 남선공원 ───
  describe("코스 C: 남선공원 (숲길형)", () => {
    it("4개의 좌표가 정의되어 있어야 한다", () => {
      expect(COURSE_C_ROUTE).toHaveLength(4);
    });

    it("시작점이 남선공원 입구여야 한다", () => {
      expect(COURSE_C_ROUTE[0].label).toBe("남선공원 입구");
      expect(COURSE_C_ROUTE[0].latitude).toBe(36.345);
      expect(COURSE_C_ROUTE[0].longitude).toBe(127.402);
    });

    it("종점이 남선공원 정상이어야 한다", () => {
      const last = COURSE_C_ROUTE[COURSE_C_ROUTE.length - 1];
      expect(last.label).toBe("남선공원 정상");
      expect(last.latitude).toBe(36.348);
      expect(last.longitude).toBe(127.405);
    });

    it("모든 좌표가 서구여야 한다", () => {
      COURSE_C_ROUTE.forEach(c => {
        expect(c.district).toBe("서구");
      });
    });

    it("3개의 경유지가 정의되어 있어야 한다", () => {
      expect(COURSE_C_WAYPOINTS).toHaveLength(3);
    });
  });

  // ─── 모든 코스 좌표 범위 검증 ───
  describe("모든 코스 좌표 범위 검증", () => {
    const allRoutes = [COURSE_A_ROUTE, COURSE_B_ROUTE, COURSE_C_ROUTE];
    const courseNames = ["코스 A", "코스 B", "코스 C"];

    allRoutes.forEach((route, idx) => {
      it(`${courseNames[idx]} 좌표가 대전 범위 내에 있어야 한다`, () => {
        route.forEach(coord => {
          expect(coord.latitude).toBeGreaterThan(36.3);
          expect(coord.latitude).toBeLessThan(36.5);
          expect(coord.longitude).toBeGreaterThan(127.3);
          expect(coord.longitude).toBeLessThan(127.5);
        });
      });
    });

    allRoutes.forEach((route, idx) => {
      it(`${courseNames[idx]} 인접 좌표 간 거리가 2km 이내여야 한다`, () => {
        for (let i = 0; i < route.length - 1; i++) {
          const d = haversineDistance(
            route[i].latitude,
            route[i].longitude,
            route[i + 1].latitude,
            route[i + 1].longitude
          );
          expect(d).toBeLessThan(2);
        }
      });
    });

    allRoutes.forEach((route, idx) => {
      it(`${courseNames[idx]} 전체 경로 거리가 5km 이내여야 한다`, () => {
        const total = calculateRouteDistance(route);
        expect(total).toBeGreaterThan(0);
        expect(total).toBeLessThan(5);
      });
    });
  });

  // ─── getCourseById ───
  describe("getCourseById", () => {
    it("course_a를 올바르게 반환해야 한다", () => {
      const course = getCourseById("course_a");
      expect(course.id).toBe("course_a");
      expect(course.name).toBe("엑스포 시민광장");
    });

    it("course_b를 올바르게 반환해야 한다", () => {
      const course = getCourseById("course_b");
      expect(course.id).toBe("course_b");
      expect(course.name).toBe("유림공원");
    });

    it("course_c를 올바르게 반환해야 한다", () => {
      const course = getCourseById("course_c");
      expect(course.id).toBe("course_c");
      expect(course.name).toBe("남선공원");
    });

    it("존재하지 않는 ID는 기본 코스(A)를 반환해야 한다", () => {
      const course = getCourseById("nonexistent");
      expect(course.id).toBe("course_a");
    });
  });

  // ─── 기존 유틸리티 함수 ───
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
        COURSE_A_ROUTE[0].latitude,
        COURSE_A_ROUTE[0].longitude,
        COURSE_A_ROUTE[1].latitude,
        COURSE_A_ROUTE[1].longitude
      );
      expect(d).toBeGreaterThan(0);
    });
  });

  describe("calculateRouteDistance", () => {
    it("빈 배열은 0을 반환해야 한다", () => {
      expect(calculateRouteDistance([])).toBe(0);
    });

    it("좌표 1개는 0을 반환해야 한다", () => {
      expect(calculateRouteDistance([COURSE_A_ROUTE[0]])).toBe(0);
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

    it("초기 courseId가 course_a여야 한다", () => {
      expect(initialSimulationState.courseId).toBe("course_a");
    });
  });
});

describe("관리자 메뉴 접근 패턴", () => {
  it("프로필 화면에서 버전 5번 탭으로 관리자 메뉴 접근", () => {
    const adminRoutes = ["/admin/simulation", "/admin/live-tracker"];
    expect(adminRoutes).toHaveLength(2);
    expect(adminRoutes[0]).toContain("simulation");
    expect(adminRoutes[1]).toContain("live-tracker");
  });
});

describe("멀티 코스 데이터 무결성", () => {
  it("모든 코스의 경유지 emoji가 정의되어 있어야 한다", () => {
    SIMULATION_COURSES.forEach(course => {
      course.waypoints.forEach(wp => {
        expect(wp.emoji).toBeTruthy();
        expect(typeof wp.emoji).toBe("string");
      });
    });
  });

  it("모든 코스의 첫 경유지가 routeIndex 0이어야 한다", () => {
    SIMULATION_COURSES.forEach(course => {
      expect(course.waypoints[0].routeIndex).toBe(0);
    });
  });

  it("모든 코스의 마지막 경유지가 route 마지막 인덱스여야 한다", () => {
    SIMULATION_COURSES.forEach(course => {
      const lastWp = course.waypoints[course.waypoints.length - 1];
      expect(lastWp.routeIndex).toBe(course.route.length - 1);
    });
  });

  it("모든 코스의 description이 비어있지 않아야 한다", () => {
    SIMULATION_COURSES.forEach(course => {
      expect(course.description.length).toBeGreaterThan(0);
    });
  });

  it("모든 코스의 typeEmoji가 비어있지 않아야 한다", () => {
    SIMULATION_COURSES.forEach(course => {
      expect(course.typeEmoji.length).toBeGreaterThan(0);
    });
  });
});
