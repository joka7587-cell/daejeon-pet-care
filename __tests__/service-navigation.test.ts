import { describe, it, expect } from "vitest";
import { SERVICE_TYPES } from "../lib/mock-data";

describe("Service Navigation", () => {
  // SERVICE_TYPES에 정의된 서비스 ID 확인
  it("owner services have correct IDs for navigation", () => {
    const ownerServiceIds = SERVICE_TYPES.owner.map((s) => s.id);
    expect(ownerServiceIds).toContain("walk_partner");
    expect(ownerServiceIds).toContain("find_caretaker");
    expect(ownerServiceIds).toContain("walk_request");
    expect(ownerServiceIds).toContain("short_care");
    expect(ownerServiceIds).toHaveLength(4);
  });

  it("caretaker services have correct IDs for navigation", () => {
    const caretakerServiceIds = SERVICE_TYPES.caretaker.map((s) => s.id);
    expect(caretakerServiceIds).toContain("emergency");
    expect(caretakerServiceIds).toContain("walk_service");
    expect(caretakerServiceIds).toHaveLength(2);
  });

  it("each owner service has required properties", () => {
    SERVICE_TYPES.owner.forEach((svc) => {
      expect(svc).toHaveProperty("id");
      expect(svc).toHaveProperty("title");
      expect(svc).toHaveProperty("emoji");
      expect(svc).toHaveProperty("color");
      expect(typeof svc.id).toBe("string");
      expect(typeof svc.title).toBe("string");
      expect(svc.title.length).toBeGreaterThan(0);
    });
  });

  it("each caretaker service has required properties", () => {
    SERVICE_TYPES.caretaker.forEach((svc) => {
      expect(svc).toHaveProperty("id");
      expect(svc).toHaveProperty("title");
      expect(svc).toHaveProperty("emoji");
      expect(svc).toHaveProperty("color");
      expect(typeof svc.id).toBe("string");
      expect(typeof svc.title).toBe("string");
      expect(svc.title.length).toBeGreaterThan(0);
    });
  });

  // 서비스별 네비게이션 대상 매핑 테스트
  it("service navigation mapping is correct", () => {
    const navigationMap: Record<string, { type: "explore" | "request_new"; tab?: string }> = {
      walk_partner: { type: "explore", tab: "walk_partner" },
      find_caretaker: { type: "explore", tab: "find_caretaker" },
      walk_request: { type: "request_new" },
      short_care: { type: "explore", tab: "short_care" },
    };

    // walk_request는 요청 작성 화면으로 이동
    expect(navigationMap["walk_request"].type).toBe("request_new");
    expect(navigationMap["walk_request"].tab).toBeUndefined();

    // 나머지는 explore 화면으로 이동하며 탭 파라미터 포함
    expect(navigationMap["walk_partner"].type).toBe("explore");
    expect(navigationMap["walk_partner"].tab).toBe("walk_partner");

    expect(navigationMap["find_caretaker"].type).toBe("explore");
    expect(navigationMap["find_caretaker"].tab).toBe("find_caretaker");

    expect(navigationMap["short_care"].type).toBe("explore");
    expect(navigationMap["short_care"].tab).toBe("short_care");
  });

  // explore 화면의 탭 유효성 검사
  it("owner explore tabs match service IDs", () => {
    const validOwnerTabs = ["walk_partner", "find_caretaker", "walk_request", "short_care"];
    SERVICE_TYPES.owner.forEach((svc) => {
      expect(validOwnerTabs).toContain(svc.id);
    });
  });

  it("caretaker explore tabs match service IDs", () => {
    const validCaretakerTabs = ["emergency", "walk_service"];
    SERVICE_TYPES.caretaker.forEach((svc) => {
      expect(validCaretakerTabs).toContain(svc.id);
    });
  });
});
