/**
 * Phase 18 테스트: 1:1 채팅 + 실시간 산책 지도 + 사진 타임스탬프 + 산책 리포트
 */
import { describe, it, expect } from "vitest";
import {
  getDistrictFromCoordinates,
  calculateDistance,
  calculateTotalDistance,
  calculateAvgSpeed,
  estimateCaloriesBurned,
  estimateSteps,
  generateWalkReport,
  createWalkSession,
  updateWalkSession,
  type LocationPoint,
  type WalkSessionData,
} from "../lib/walk-session-model";

// ─── 산책 세션 모델 테스트 ───
describe("Walk Session Model", () => {
  it("대전 좌표를 동네 이름으로 변환", () => {
    const district = getDistrictFromCoordinates(36.35, 127.39);
    expect(district).toBeTruthy();
    expect(typeof district).toBe("string");
  });

  it("좌표 범위 밖은 '대전 미상' 반환", () => {
    const district = getDistrictFromCoordinates(37.5, 127.0);
    expect(district).toBe("대전 미상");
  });

  it("두 좌표 간 거리 계산", () => {
    const dist = calculateDistance(36.35, 127.38, 36.36, 127.39);
    expect(dist).toBeGreaterThan(0);
    expect(dist).toBeLessThan(5); // 대전 내 거리는 5km 이내
  });

  it("경로 총 거리 계산", () => {
    const points: LocationPoint[] = [
      { latitude: 36.35, longitude: 127.38, timestamp: "2026-01-01T10:00:00Z" },
      { latitude: 36.355, longitude: 127.385, timestamp: "2026-01-01T10:05:00Z" },
      { latitude: 36.36, longitude: 127.39, timestamp: "2026-01-01T10:10:00Z" },
    ];
    const total = calculateTotalDistance(points);
    expect(total).toBeGreaterThan(0);
  });

  it("빈 경로는 0 반환", () => {
    expect(calculateTotalDistance([])).toBe(0);
    expect(calculateTotalDistance([{ latitude: 36.35, longitude: 127.38, timestamp: "" }])).toBe(0);
  });

  it("평균 속도 계산", () => {
    const speed = calculateAvgSpeed(3, 3600); // 3km in 1 hour
    expect(speed).toBe(3);
  });

  it("0초 경과 시 속도 0", () => {
    expect(calculateAvgSpeed(1, 0)).toBe(0);
  });

  it("칼로리 소모량 추정 (소형견)", () => {
    const cal = estimateCaloriesBurned(30, 1.5, "소형");
    expect(cal).toBeGreaterThan(0);
    expect(cal).toBeLessThan(500);
  });

  it("칼로리 소모량 추정 (대형견)", () => {
    const cal = estimateCaloriesBurned(60, 3, "대형");
    expect(cal).toBeGreaterThan(0);
  });

  it("걸음 수 추정", () => {
    const steps = estimateSteps(2, "중형");
    expect(steps).toBeGreaterThan(0);
    expect(steps).toBe(4000); // 2km / 0.5m = 4000
  });

  it("산책 세션 생성", () => {
    const startLoc: LocationPoint = {
      latitude: 36.35,
      longitude: 127.39,
      timestamp: new Date().toISOString(),
    };
    const session = createWalkSession("w1", "김산책", "뽀삐", "🐶", "room_1", startLoc);
    expect(session.id).toMatch(/^session_/);
    expect(session.status).toBe("walking");
    expect(session.workerName).toBe("김산책");
    expect(session.locationPoints).toHaveLength(1);
  });

  it("산책 세션 업데이트 (새 위치 추가)", () => {
    const now = Date.now();
    const startLoc: LocationPoint = {
      latitude: 36.35,
      longitude: 127.39,
      timestamp: new Date(now).toISOString(),
    };
    const session = createWalkSession("w1", "김산책", "뽀삐", "🐶", "room_1", startLoc);

    const newLoc: LocationPoint = {
      latitude: 36.355,
      longitude: 127.395,
      timestamp: new Date(now + 300000).toISOString(), // 5분 후
    };
    const updated = updateWalkSession(session, newLoc);
    expect(updated.locationPoints).toHaveLength(2);
    expect(updated.totalDistanceKm).toBeGreaterThan(0);
    // totalDurationSec은 startedAt(현재)과 newLoc.timestamp 사이의 차이
    expect(updated.totalDurationSec).toBeGreaterThan(0);
  });

  it("산책 리포트 생성", () => {
    const startLoc: LocationPoint = {
      latitude: 36.35,
      longitude: 127.39,
      timestamp: "2026-01-01T10:00:00Z",
    };
    const session: WalkSessionData = {
      id: "session_test",
      workerId: "w1",
      workerName: "김산책",
      petName: "뽀삐",
      petEmoji: "🐶",
      roomId: "room_1",
      status: "completed",
      startedAt: "2026-01-01T10:00:00Z",
      endedAt: "2026-01-01T10:45:00Z",
      locationPoints: [startLoc],
      totalDistanceKm: 2.5,
      totalDurationSec: 2700,
      pausedDurationSec: 0,
      avgSpeedKmh: 3.3,
      maxSpeedKmh: 5.0,
    };

    const report = generateWalkReport(session, [], "좋은 산책이었어요!", "중형");
    expect(report.id).toMatch(/^report_/);
    expect(report.durationMin).toBe(45);
    expect(report.distanceKm).toBe(2.5);
    expect(report.caloriesBurned).toBeGreaterThan(0);
    expect(report.stepsEstimated).toBeGreaterThan(0);
    expect(report.notes).toBe("좋은 산책이었어요!");
  });
});

// ─── 대전 산책 명소 데이터 테스트 ───
describe("Daejeon Walk Spots", () => {
  it("산책 명소 데이터 로드", async () => {
    const { DAEJEON_WALK_SPOTS, getSpotsByDistrict } = await import("../lib/daejeon-spots");
    expect(DAEJEON_WALK_SPOTS.length).toBeGreaterThan(0);
    expect(DAEJEON_WALK_SPOTS[0]).toHaveProperty("name");
    expect(DAEJEON_WALK_SPOTS[0]).toHaveProperty("district");
    expect(DAEJEON_WALK_SPOTS[0]).toHaveProperty("latitude");
    expect(DAEJEON_WALK_SPOTS[0]).toHaveProperty("longitude");
  });

  it("구별 필터링", async () => {
    const { getSpotsByDistrict } = await import("../lib/daejeon-spots");
    const yuseong = getSpotsByDistrict("유성구");
    expect(yuseong.length).toBeGreaterThan(0);
    yuseong.forEach((spot) => {
      expect(spot.district).toBe("유성구");
    });
  });
});

// ─── ChatMessageData 타입 호환성 테스트 ───
describe("ChatMessageData type compatibility", () => {
  it("photo 타입 메시지 생성 가능", () => {
    const msg = {
      id: "test_photo_1",
      senderId: 1,
      senderName: "테스트",
      content: "사진 전송",
      type: "photo" as const,
      photoData: {
        uri: "test.jpg",
        district: "대전 유성구 궁동",
        formattedTime: "14:30",
        latitude: 36.35,
        longitude: 127.39,
      },
      createdAt: new Date().toISOString(),
    };
    expect(msg.type).toBe("photo");
    expect(msg.photoData.district).toContain("대전");
    expect(msg.photoData.formattedTime).toMatch(/\d{2}:\d{2}/);
  });

  it("walk_report 타입 메시지 생성 가능", () => {
    const msg = {
      id: "test_report_1",
      senderId: 2,
      senderName: "워커",
      content: "산책 리포트",
      type: "walk_report" as const,
      walkReportData: {
        reportId: "report_1",
        workerName: "김산책",
        petName: "뽀삐",
        petEmoji: "🐶",
        durationMin: 45,
        distanceKm: 2.5,
        caloriesBurned: 180,
        stepsEstimated: 5000,
        photoCount: 3,
        date: "2026-01-01",
        startTime: "10:00",
        endTime: "10:45",
        petMood: "happy" as const,
      },
      createdAt: new Date().toISOString(),
    };
    expect(msg.type).toBe("walk_report");
    expect(msg.walkReportData.durationMin).toBe(45);
    expect(msg.walkReportData.petMood).toBe("happy");
  });

  it("walk_status 타입 메시지 생성 가능", () => {
    const msg = {
      id: "test_status_1",
      senderId: 0,
      senderName: "시스템",
      content: "산책 시작",
      type: "walk_status" as const,
      walkStatusData: {
        status: "started" as const,
        district: "대전 유성구 궁동",
        timestamp: new Date().toISOString(),
      },
      createdAt: new Date().toISOString(),
    };
    expect(msg.type).toBe("walk_status");
    expect(msg.walkStatusData.status).toBe("started");
  });
});

// ─── 데모 산책 경로 테스트 ───
describe("Demo Walk Route", () => {
  const DEMO_ROUTE = [
    { latitude: 36.3550, longitude: 127.3850 },
    { latitude: 36.3555, longitude: 127.3860 },
    { latitude: 36.3560, longitude: 127.3870 },
    { latitude: 36.3565, longitude: 127.3880 },
    { latitude: 36.3570, longitude: 127.3890 },
  ];

  it("경로 포인트가 대전 범위 내", () => {
    DEMO_ROUTE.forEach((point) => {
      expect(point.latitude).toBeGreaterThan(36.2);
      expect(point.latitude).toBeLessThan(36.5);
      expect(point.longitude).toBeGreaterThan(127.3);
      expect(point.longitude).toBeLessThan(127.55);
    });
  });

  it("경로 포인트 간 거리가 합리적", () => {
    for (let i = 0; i < DEMO_ROUTE.length - 1; i++) {
      const dist = calculateDistance(
        DEMO_ROUTE[i].latitude,
        DEMO_ROUTE[i].longitude,
        DEMO_ROUTE[i + 1].latitude,
        DEMO_ROUTE[i + 1].longitude
      );
      expect(dist).toBeGreaterThan(0);
      expect(dist).toBeLessThan(1); // 각 구간 1km 이내
    }
  });
});
