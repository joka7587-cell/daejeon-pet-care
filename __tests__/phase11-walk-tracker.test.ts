import { describe, it, expect } from "vitest";

// ==============================
// Phase 11: 산책 GPS 추적 기능 테스트
// ==============================

// --- 유틸리티 함수 테스트 ---

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function formatDist(km: number): string {
  if (km < 0.01) return "0m";
  if (km < 1) return `${Math.round(km * 1000)}m`;
  return `${km.toFixed(2)}km`;
}

function formatSpeed(kmh: number): string {
  return `${kmh.toFixed(1)} km/h`;
}

describe("산책 시간 포맷팅", () => {
  it("0초는 00:00", () => {
    expect(formatTime(0)).toBe("00:00");
  });

  it("59초는 00:59", () => {
    expect(formatTime(59)).toBe("00:59");
  });

  it("60초는 01:00", () => {
    expect(formatTime(60)).toBe("01:00");
  });

  it("3661초는 1:01:01", () => {
    expect(formatTime(3661)).toBe("1:01:01");
  });

  it("7200초는 2:00:00", () => {
    expect(formatTime(7200)).toBe("2:00:00");
  });
});

describe("거리 포맷팅", () => {
  it("0km는 0m", () => {
    expect(formatDist(0)).toBe("0m");
  });

  it("0.005km는 0m (10m 미만)", () => {
    expect(formatDist(0.005)).toBe("0m");
  });

  it("0.5km는 500m", () => {
    expect(formatDist(0.5)).toBe("500m");
  });

  it("1.23km는 1.23km", () => {
    expect(formatDist(1.23)).toBe("1.23km");
  });

  it("0.01km는 10m", () => {
    expect(formatDist(0.01)).toBe("10m");
  });
});

describe("속도 포맷팅", () => {
  it("0 km/h", () => {
    expect(formatSpeed(0)).toBe("0.0 km/h");
  });

  it("4.5 km/h", () => {
    expect(formatSpeed(4.5)).toBe("4.5 km/h");
  });

  it("12.34 km/h", () => {
    expect(formatSpeed(12.34)).toBe("12.3 km/h");
  });
});

// --- WalkSession 데이터 모델 테스트 ---

interface WalkRoutePoint {
  lat: number;
  lng: number;
  timestamp: string;
}

interface WalkSession {
  id: string;
  requestId?: string;
  petName: string;
  petEmoji: string;
  ownerName?: string;
  caretakerName?: string;
  neighborhood: string;
  status: "active" | "paused" | "completed";
  startedAt: string;
  endedAt?: string;
  totalDistanceKm: number;
  totalDurationSec: number;
  routePoints: WalkRoutePoint[];
  avgSpeedKmh: number;
  maxSpeedKmh: number;
  pausedDurationSec: number;
}

describe("WalkSession 데이터 모델", () => {
  it("새 세션 생성", () => {
    const session: WalkSession = {
      id: "walk_123",
      requestId: "req_1",
      petName: "코코",
      petEmoji: "🐕",
      ownerName: "김반려",
      caretakerName: "이돌봄",
      neighborhood: "유성구 봉명동",
      status: "active",
      startedAt: new Date().toISOString(),
      totalDistanceKm: 0,
      totalDurationSec: 0,
      routePoints: [],
      avgSpeedKmh: 0,
      maxSpeedKmh: 0,
      pausedDurationSec: 0,
    };

    expect(session.status).toBe("active");
    expect(session.totalDistanceKm).toBe(0);
    expect(session.routePoints).toHaveLength(0);
    expect(session.petName).toBe("코코");
  });

  it("세션 완료 처리", () => {
    const session: WalkSession = {
      id: "walk_456",
      petName: "뭉치",
      petEmoji: "🐩",
      neighborhood: "서구 둔산동",
      status: "active",
      startedAt: "2026-03-19T10:00:00.000Z",
      totalDistanceKm: 2.5,
      totalDurationSec: 1800,
      routePoints: [
        { lat: 36.35, lng: 127.38, timestamp: "2026-03-19T10:00:00.000Z" },
        { lat: 36.351, lng: 127.381, timestamp: "2026-03-19T10:30:00.000Z" },
      ],
      avgSpeedKmh: 5.0,
      maxSpeedKmh: 6.5,
      pausedDurationSec: 0,
    };

    // 완료 처리
    const completed: WalkSession = {
      ...session,
      status: "completed",
      endedAt: "2026-03-19T10:30:00.000Z",
    };

    expect(completed.status).toBe("completed");
    expect(completed.endedAt).toBeDefined();
    expect(completed.totalDistanceKm).toBe(2.5);
  });

  it("일시정지 시간 계산", () => {
    const session: WalkSession = {
      id: "walk_789",
      petName: "초코",
      petEmoji: "🐕‍🦺",
      neighborhood: "중구 대흥동",
      status: "completed",
      startedAt: "2026-03-19T10:00:00.000Z",
      endedAt: "2026-03-19T10:40:00.000Z",
      totalDistanceKm: 1.8,
      totalDurationSec: 2400, // 40분
      routePoints: [],
      avgSpeedKmh: 4.5,
      maxSpeedKmh: 5.8,
      pausedDurationSec: 300, // 5분 정지
    };

    const activeDuration = session.totalDurationSec - session.pausedDurationSec;
    expect(activeDuration).toBe(2100); // 35분 실제 이동
  });
});

// --- Reducer 액션 테스트 ---

interface AppState {
  walkSessions: WalkSession[];
  activeWalkSessionId: string | null;
}

type AppAction =
  | { type: "START_WALK_SESSION"; payload: WalkSession }
  | { type: "UPDATE_WALK_SESSION"; payload: { sessionId: string; updates: Partial<WalkSession> } }
  | { type: "ADD_WALK_ROUTE_POINT"; payload: { sessionId: string; point: WalkRoutePoint } }
  | { type: "COMPLETE_WALK_SESSION"; payload: string }
  | { type: "PAUSE_WALK_SESSION"; payload: string }
  | { type: "RESUME_WALK_SESSION"; payload: string };

function walkReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "START_WALK_SESSION":
      return {
        ...state,
        walkSessions: [action.payload, ...state.walkSessions],
        activeWalkSessionId: action.payload.id,
      };
    case "UPDATE_WALK_SESSION":
      return {
        ...state,
        walkSessions: state.walkSessions.map((s) =>
          s.id === action.payload.sessionId ? { ...s, ...action.payload.updates } : s
        ),
      };
    case "ADD_WALK_ROUTE_POINT":
      return {
        ...state,
        walkSessions: state.walkSessions.map((s) =>
          s.id === action.payload.sessionId
            ? { ...s, routePoints: [...s.routePoints, action.payload.point] }
            : s
        ),
      };
    case "PAUSE_WALK_SESSION":
      return {
        ...state,
        walkSessions: state.walkSessions.map((s) =>
          s.id === action.payload ? { ...s, status: "paused" as const } : s
        ),
      };
    case "RESUME_WALK_SESSION":
      return {
        ...state,
        walkSessions: state.walkSessions.map((s) =>
          s.id === action.payload ? { ...s, status: "active" as const } : s
        ),
      };
    case "COMPLETE_WALK_SESSION":
      return {
        ...state,
        walkSessions: state.walkSessions.map((s) =>
          s.id === action.payload
            ? { ...s, status: "completed" as const, endedAt: new Date().toISOString() }
            : s
        ),
        activeWalkSessionId: state.activeWalkSessionId === action.payload ? null : state.activeWalkSessionId,
      };
    default:
      return state;
  }
}

describe("산책 세션 Reducer", () => {
  const initialState: AppState = {
    walkSessions: [],
    activeWalkSessionId: null,
  };

  const mockSession: WalkSession = {
    id: "walk_test_1",
    petName: "코코",
    petEmoji: "🐕",
    neighborhood: "유성구",
    status: "active",
    startedAt: new Date().toISOString(),
    totalDistanceKm: 0,
    totalDurationSec: 0,
    routePoints: [],
    avgSpeedKmh: 0,
    maxSpeedKmh: 0,
    pausedDurationSec: 0,
  };

  it("START_WALK_SESSION - 새 세션 시작", () => {
    const state = walkReducer(initialState, {
      type: "START_WALK_SESSION",
      payload: mockSession,
    });

    expect(state.walkSessions).toHaveLength(1);
    expect(state.activeWalkSessionId).toBe("walk_test_1");
    expect(state.walkSessions[0].status).toBe("active");
  });

  it("ADD_WALK_ROUTE_POINT - GPS 포인트 추가", () => {
    const stateWithSession = walkReducer(initialState, {
      type: "START_WALK_SESSION",
      payload: mockSession,
    });

    const point: WalkRoutePoint = {
      lat: 36.35,
      lng: 127.38,
      timestamp: new Date().toISOString(),
    };

    const state = walkReducer(stateWithSession, {
      type: "ADD_WALK_ROUTE_POINT",
      payload: { sessionId: "walk_test_1", point },
    });

    expect(state.walkSessions[0].routePoints).toHaveLength(1);
    expect(state.walkSessions[0].routePoints[0].lat).toBe(36.35);
  });

  it("PAUSE_WALK_SESSION - 일시정지", () => {
    const stateWithSession = walkReducer(initialState, {
      type: "START_WALK_SESSION",
      payload: mockSession,
    });

    const state = walkReducer(stateWithSession, {
      type: "PAUSE_WALK_SESSION",
      payload: "walk_test_1",
    });

    expect(state.walkSessions[0].status).toBe("paused");
  });

  it("RESUME_WALK_SESSION - 재개", () => {
    let state = walkReducer(initialState, {
      type: "START_WALK_SESSION",
      payload: mockSession,
    });
    state = walkReducer(state, {
      type: "PAUSE_WALK_SESSION",
      payload: "walk_test_1",
    });
    state = walkReducer(state, {
      type: "RESUME_WALK_SESSION",
      payload: "walk_test_1",
    });

    expect(state.walkSessions[0].status).toBe("active");
  });

  it("COMPLETE_WALK_SESSION - 완료", () => {
    const stateWithSession = walkReducer(initialState, {
      type: "START_WALK_SESSION",
      payload: mockSession,
    });

    const state = walkReducer(stateWithSession, {
      type: "COMPLETE_WALK_SESSION",
      payload: "walk_test_1",
    });

    expect(state.walkSessions[0].status).toBe("completed");
    expect(state.walkSessions[0].endedAt).toBeDefined();
    expect(state.activeWalkSessionId).toBeNull();
  });

  it("UPDATE_WALK_SESSION - 통계 업데이트", () => {
    const stateWithSession = walkReducer(initialState, {
      type: "START_WALK_SESSION",
      payload: mockSession,
    });

    const state = walkReducer(stateWithSession, {
      type: "UPDATE_WALK_SESSION",
      payload: {
        sessionId: "walk_test_1",
        updates: {
          totalDistanceKm: 2.5,
          totalDurationSec: 1800,
          avgSpeedKmh: 5.0,
          maxSpeedKmh: 6.5,
        },
      },
    });

    expect(state.walkSessions[0].totalDistanceKm).toBe(2.5);
    expect(state.walkSessions[0].totalDurationSec).toBe(1800);
    expect(state.walkSessions[0].avgSpeedKmh).toBe(5.0);
  });

  it("여러 세션 관리", () => {
    const session2: WalkSession = {
      ...mockSession,
      id: "walk_test_2",
      petName: "뭉치",
    };

    let state = walkReducer(initialState, {
      type: "START_WALK_SESSION",
      payload: mockSession,
    });
    state = walkReducer(state, {
      type: "COMPLETE_WALK_SESSION",
      payload: "walk_test_1",
    });
    state = walkReducer(state, {
      type: "START_WALK_SESSION",
      payload: session2,
    });

    expect(state.walkSessions).toHaveLength(2);
    expect(state.activeWalkSessionId).toBe("walk_test_2");
    expect(state.walkSessions[0].petName).toBe("뭉치"); // 최신이 앞에
    expect(state.walkSessions[1].petName).toBe("코코");
  });
});

// --- SVG 경로 변환 테스트 ---

function routeToSvgPoints(
  points: WalkRoutePoint[],
  width: number,
  height: number,
  padding: number = 20
): string {
  if (points.length < 2) return "";

  const lats = points.map((p) => p.lat);
  const lngs = points.map((p) => p.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);

  const latRange = maxLat - minLat || 0.001;
  const lngRange = maxLng - minLng || 0.001;

  const drawW = width - padding * 2;
  const drawH = height - padding * 2;

  return points
    .map((p) => {
      const x = padding + ((p.lng - minLng) / lngRange) * drawW;
      const y = padding + ((maxLat - p.lat) / latRange) * drawH;
      return `${x},${y}`;
    })
    .join(" ");
}

describe("SVG 경로 변환", () => {
  it("포인트가 1개 미만이면 빈 문자열", () => {
    expect(routeToSvgPoints([], 300, 200)).toBe("");
    expect(routeToSvgPoints([{ lat: 36.35, lng: 127.38, timestamp: "" }], 300, 200)).toBe("");
  });

  it("2개 포인트로 SVG 좌표 생성", () => {
    const points: WalkRoutePoint[] = [
      { lat: 36.35, lng: 127.38, timestamp: "2026-03-19T10:00:00Z" },
      { lat: 36.36, lng: 127.39, timestamp: "2026-03-19T10:30:00Z" },
    ];

    const result = routeToSvgPoints(points, 300, 200, 20);
    expect(result).toBeTruthy();
    expect(result.split(" ")).toHaveLength(2);
  });

  it("여러 포인트로 SVG 좌표 생성", () => {
    const points: WalkRoutePoint[] = [
      { lat: 36.35, lng: 127.38, timestamp: "2026-03-19T10:00:00Z" },
      { lat: 36.355, lng: 127.385, timestamp: "2026-03-19T10:10:00Z" },
      { lat: 36.36, lng: 127.39, timestamp: "2026-03-19T10:20:00Z" },
      { lat: 36.358, lng: 127.388, timestamp: "2026-03-19T10:30:00Z" },
    ];

    const result = routeToSvgPoints(points, 300, 200, 20);
    expect(result.split(" ")).toHaveLength(4);
  });
});

// --- 날짜 포맷 테스트 ---

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const weekdays = ["일", "월", "화", "수", "목", "금", "토"];
  const weekday = weekdays[d.getDay()];
  return `${month}월 ${day}일 (${weekday})`;
}

describe("날짜 포맷팅", () => {
  it("날짜 포맷 (요일 포함)", () => {
    // 2026-03-19 is Thursday (목요일)
    const result = formatDate("2026-03-19T10:00:00.000Z");
    expect(result).toContain("3월");
    expect(result).toContain("19일");
  });
});
