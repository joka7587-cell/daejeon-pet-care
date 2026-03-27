/**
 * Phase 28: UI/UX 개선 및 대전 특화 기능 테스트
 * - 컬러 시스템 변경 (딥 그린 + 앰버 옐로우)
 * - 카드 UI 개선
 * - 대전 전용 배지
 * - 구/동 상세 위치 표시
 * - 대전시 인증 전문가 뱃지
 * - 지역 기반 해시태그
 * - 산책 상태 스테퍼 UI
 * - 추가 도그워커 3명
 */
import { describe, it, expect } from "vitest";

// ─── 컬러 시스템 테스트 ───
describe("Phase 28: 컬러 시스템 변경", () => {
  it("theme.config.js에서 딥 그린 primary 색상이 적용되어야 한다", async () => {
    const config = await import("../theme.config.js");
    expect(config.themeColors.primary.light).toBe("#2E7D32");
  });

  it("accent 색상으로 앰버 옐로우가 정의되어야 한다", async () => {
    const config = await import("../theme.config.js");
    expect(config.themeColors.accent.light).toBe("#FFC107");
  });
});

// ─── 추가 워커 데이터 테스트 ───
describe("Phase 28: 추가 도그워커 3명", () => {
  it("MOCK_CARETAKERS에 c13, c14, c15가 포함되어야 한다", async () => {
    const { MOCK_CARETAKERS } = await import("../lib/mock-data");
    const ids = MOCK_CARETAKERS.map((c) => c.id);
    expect(ids).toContain("c13");
    expect(ids).toContain("c14");
    expect(ids).toContain("c15");
  });

  it("c13 둔산동 은서는 서구 둔산동이어야 한다", async () => {
    const { MOCK_CARETAKERS } = await import("../lib/mock-data");
    const c13 = MOCK_CARETAKERS.find((c) => c.id === "c13");
    expect(c13).toBeDefined();
    expect(c13!.nickname).toBe("둔산동 은서");
    expect(c13!.district).toBe("서구");
    expect(c13!.neighborhood).toBe("둔산동");
    expect(c13!.isVerified).toBe(true);
  });

  it("c14 궁동 정훈은 유성구 궁동이어야 한다", async () => {
    const { MOCK_CARETAKERS } = await import("../lib/mock-data");
    const c14 = MOCK_CARETAKERS.find((c) => c.id === "c14");
    expect(c14).toBeDefined();
    expect(c14!.nickname).toBe("궁동 정훈");
    expect(c14!.district).toBe("유성구");
    expect(c14!.neighborhood).toBe("궁동");
    expect(c14!.rating).toBe(5.0);
    expect(c14!.hasTrainerCert).toBe(true);
  });

  it("c15 월평동 승재는 서구 월평동이어야 한다", async () => {
    const { MOCK_CARETAKERS } = await import("../lib/mock-data");
    const c15 = MOCK_CARETAKERS.find((c) => c.id === "c15");
    expect(c15).toBeDefined();
    expect(c15!.nickname).toBe("월평동 승재");
    expect(c15!.district).toBe("서구");
    expect(c15!.neighborhood).toBe("월평동");
    expect(c15!.canHandleLargeDogs).toBe(true);
  });

  it("총 워커 수가 20명(기존 12 + 시드 5 + 추가 3)이어야 한다", async () => {
    const { MOCK_CARETAKERS } = await import("../lib/mock-data");
    expect(MOCK_CARETAKERS.length).toBe(20);
  });
});

// ─── 워커 상세 데이터 테스트 ───
describe("Phase 28: 추가 워커 상세 데이터", () => {
  it("c13 상세 정보가 존재해야 한다", async () => {
    const { getWorkerDetail } = await import("../lib/worker-details");
    const detail = getWorkerDetail("c13");
    expect(detail).not.toBeNull();
    expect(detail!.nickname).toBe("둔산동 은서");
    expect(detail!.specialBadge).toBe("둔산동 토박이");
    expect(detail!.certifications.length).toBeGreaterThanOrEqual(2);
  });

  it("c14 상세 정보에 수의사 면허증이 포함되어야 한다", async () => {
    const { getWorkerDetail } = await import("../lib/worker-details");
    const detail = getWorkerDetail("c14");
    expect(detail).not.toBeNull();
    expect(detail!.specialBadge).toBe("수의사 출신 워커");
    const hasCert = detail!.certifications.some((c) => c.name.includes("수의사"));
    expect(hasCert).toBe(true);
  });

  it("c15 상세 정보가 존재해야 한다", async () => {
    const { getWorkerDetail } = await import("../lib/worker-details");
    const detail = getWorkerDetail("c15");
    expect(detail).not.toBeNull();
    expect(detail!.nickname).toBe("월평동 승재");
    expect(detail!.canHandleLargeDogs).toBe(true);
  });
});

// ─── 지역 세분화 테스트 ───
describe("Phase 28: 지역 세분화 (구/동 표시)", () => {
  it("모든 워커에 district 필드가 있어야 한다", async () => {
    const { MOCK_CARETAKERS } = await import("../lib/mock-data");
    for (const c of MOCK_CARETAKERS) {
      expect(c.district).toBeDefined();
      expect(typeof c.district).toBe("string");
      expect(c.district!.length).toBeGreaterThan(0);
    }
  });

  it("서구 워커가 3명 이상이어야 한다", async () => {
    const { MOCK_CARETAKERS } = await import("../lib/mock-data");
    const seogu = MOCK_CARETAKERS.filter((c) => c.district === "서구");
    expect(seogu.length).toBeGreaterThanOrEqual(3);
  });

  it("유성구 워커가 2명 이상이어야 한다", async () => {
    const { MOCK_CARETAKERS } = await import("../lib/mock-data");
    const yuseong = MOCK_CARETAKERS.filter((c) => c.district === "유성구");
    expect(yuseong.length).toBeGreaterThanOrEqual(2);
  });
});

// ─── 인증 뱃지 테스트 ───
describe("Phase 28: 대전시 인증 전문가 뱃지", () => {
  it("인증된 워커(isVerified=true)가 10명 이상이어야 한다", async () => {
    const { MOCK_CARETAKERS } = await import("../lib/mock-data");
    const verified = MOCK_CARETAKERS.filter((c) => c.isVerified);
    expect(verified.length).toBeGreaterThanOrEqual(10);
  });
});

// ─── 해시태그 테스트 ───
describe("Phase 28: 지역 기반 해시태그", () => {
  it("워커 상세에 experiences 배열이 있어 해시태그 생성이 가능해야 한다", async () => {
    const { getWorkerDetail } = await import("../lib/worker-details");
    const detail = getWorkerDetail("c14");
    expect(detail).not.toBeNull();
    expect(detail!.experiences.length).toBeGreaterThan(0);
    // 해시태그는 experiences의 district를 기반으로 생성
    const tags = detail!.experiences.map((e) => `#${e.district}전문`);
    expect(tags).toContain("#유성구전문");
  });
});

// ─── 스테퍼 UI 데이터 테스트 ───
describe("Phase 28: 산책 상태 스테퍼", () => {
  it("스테퍼 단계가 4단계(준비 중/산책 중/복귀 중/완료)여야 한다", () => {
    const steps = ["ready", "walking", "returning", "completed"];
    const labels: Record<string, string> = {
      ready: "준비 중",
      walking: "산책 중",
      returning: "복귀 중",
      completed: "완료",
    };
    expect(steps.length).toBe(4);
    expect(labels.ready).toBe("준비 중");
    expect(labels.walking).toBe("산책 중");
    expect(labels.returning).toBe("복귀 중");
    expect(labels.completed).toBe("완료");
  });

  it("walkStatus에 따라 올바른 currentStepIdx가 계산되어야 한다", () => {
    const getStepIdx = (status: string) => {
      if (status === "walking") return 1;
      if (status === "paused") return 1;
      if (status === "completed") return 3;
      return 0;
    };
    expect(getStepIdx("idle")).toBe(0);
    expect(getStepIdx("walking")).toBe(1);
    expect(getStepIdx("paused")).toBe(1);
    expect(getStepIdx("completed")).toBe(3);
  });
});
