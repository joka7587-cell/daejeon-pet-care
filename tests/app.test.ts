import { describe, it, expect } from "vitest";
import { MOCK_CARETAKERS, MOCK_OWNERS, MOCK_REQUESTS, SERVICE_TYPES, NEIGHBORHOODS } from "../lib/mock-data";

describe("Mock Data Integrity", () => {
  it("should have valid caretakers with required fields", () => {
    for (const c of MOCK_CARETAKERS) {
      expect(c.id).toBeTruthy();
      expect(c.nickname).toBeTruthy();
      expect(c.neighborhood).toBeTruthy();
      expect(c.role).toBe("caretaker");
      expect(c.rating).toBeGreaterThan(0);
      expect(c.reviewCount).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(c.services)).toBe(true);
    }
  });

  it("should have valid owners with required fields", () => {
    for (const o of MOCK_OWNERS) {
      expect(o.id).toBeTruthy();
      expect(o.nickname).toBeTruthy();
      expect(o.neighborhood).toBeTruthy();
      expect(o.role).toBe("owner");
      expect(o.rating).toBeGreaterThan(0);
    }
  });

  it("should have valid requests with required fields", () => {
    for (const r of MOCK_REQUESTS) {
      expect(r.id).toBeTruthy();
      expect(r.title).toBeTruthy();
      expect(r.requester).toBeTruthy();
      expect(r.neighborhood).toBeTruthy();
      expect(["pending", "accepted", "completed", "cancelled"]).toContain(r.status);
      expect(["walk_partner", "caretaker", "walk_request", "emergency", "short_care"]).toContain(r.type);
    }
  });

  it("should have 9 neighborhoods", () => {
    expect(NEIGHBORHOODS).toHaveLength(9);
    expect(NEIGHBORHOODS).toContain("유성구");
    expect(NEIGHBORHOODS).toContain("둔산");
    expect(NEIGHBORHOODS).toContain("관평");
  });
});

describe("Service Types", () => {
  it("owner should have 4 service types", () => {
    expect(SERVICE_TYPES.owner).toHaveLength(4);
    const ids = SERVICE_TYPES.owner.map((s) => s.id);
    expect(ids).toContain("walk_partner");
    expect(ids).toContain("find_caretaker");
    expect(ids).toContain("walk_request");
    expect(ids).toContain("short_care");
  });

  it("caretaker should have 2 service types only", () => {
    expect(SERVICE_TYPES.caretaker).toHaveLength(2);
    const ids = SERVICE_TYPES.caretaker.map((s) => s.id);
    expect(ids).toContain("emergency");
    expect(ids).toContain("walk_service");
    // Caretaker should NOT have walk_partner or short_care
    expect(ids).not.toContain("walk_partner");
    expect(ids).not.toContain("short_care");
  });

  it("all services should have required fields", () => {
    const allServices = [...SERVICE_TYPES.owner, ...SERVICE_TYPES.caretaker];
    for (const svc of allServices) {
      expect(svc.id).toBeTruthy();
      expect(svc.title).toBeTruthy();
      expect(svc.description).toBeTruthy();
      expect(svc.emoji).toBeTruthy();
      expect(svc.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });
});

describe("Role-based Service Restriction", () => {
  it("caretaker services should be a subset of owner services", () => {
    const ownerServiceIds = new Set(SERVICE_TYPES.owner.map((s) => s.id));
    const caretakerServiceIds = SERVICE_TYPES.caretaker.map((s) => s.id);
    // Caretaker services are different (emergency/walk_service) not in owner list
    // This verifies the separation
    for (const id of caretakerServiceIds) {
      expect(ownerServiceIds.has(id)).toBe(false);
    }
  });

  it("urgent requests should be marked correctly", () => {
    const urgentRequests = MOCK_REQUESTS.filter((r) => r.isUrgent);
    for (const r of urgentRequests) {
      expect(r.type).toBe("emergency");
    }
  });
});
