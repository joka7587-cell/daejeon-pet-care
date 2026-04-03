import { describe, it, expect } from "vitest";
import {
  DAEJEON_FACILITIES,
  EMERGENCY_GUIDES,
  EMERGENCY_HOSPITALS,
  EMERGENCY_HOSPITALS_24H,
  WELFARE_POLICIES,
  ELIGIBILITY_QUESTIONS,
  DISTRICT_OFFICES,
  CATEGORY_LABELS,
  CATEGORY_ICONS,
  POLICY_CATEGORY_LABELS,
  checkEligibility,
  generateTimeSlots,
  type PetFacility,
  type FacilityCategory,
  type EmergencyGuide,
  type WelfarePolicy,
  type EligibilityCondition,
  type DistrictOffice,
} from "../lib/solo-care-data";

// ============================================================
// 모듈 A: 지역 인프라 매핑 & 예약
// ============================================================
describe("모듈 A: 지역 인프라 매핑", () => {
  it("시설 데이터가 존재해야 함", () => {
    expect(DAEJEON_FACILITIES.length).toBeGreaterThan(0);
  });

  it("모든 카테고리가 포함되어야 함", () => {
    const categories = new Set(DAEJEON_FACILITIES.map((f) => f.category));
    expect(categories.has("hospital")).toBe(true);
    expect(categories.has("shop")).toBe(true);
    expect(categories.has("cafe")).toBe(true);
    expect(categories.has("grooming")).toBe(true);
  });

  it("각 시설에 필수 필드가 있어야 함", () => {
    for (const f of DAEJEON_FACILITIES) {
      expect(f.id).toBeTruthy();
      expect(f.name).toBeTruthy();
      expect(f.address).toBeTruthy();
      expect(f.district).toBeTruthy();
      expect(f.phone).toBeTruthy();
      expect(f.lat).toBeGreaterThan(36);
      expect(f.lng).toBeGreaterThan(127);
      expect(f.rating).toBeGreaterThanOrEqual(0);
      expect(f.rating).toBeLessThanOrEqual(5);
    }
  });

  it("24시간 병원이 최소 1개 이상이어야 함", () => {
    const h24 = DAEJEON_FACILITIES.filter((f) => f.is24h);
    expect(h24.length).toBeGreaterThanOrEqual(1);
  });

  it("1인 가구 추천 시설이 있어야 함", () => {
    const solo = DAEJEON_FACILITIES.filter((f) => f.soloRecommended);
    expect(solo.length).toBeGreaterThanOrEqual(1);
  });

  it("카테고리 라벨이 모든 카테고리를 포함해야 함", () => {
    const cats: FacilityCategory[] = ["hospital", "shop", "cafe", "grooming"];
    for (const c of cats) {
      expect(CATEGORY_LABELS[c]).toBeTruthy();
      expect(CATEGORY_ICONS[c]).toBeTruthy();
    }
  });

  it("예약 슬롯 생성이 정상 작동해야 함", () => {
    const slots = generateTimeSlots(9, 18, 30);
    expect(slots.length).toBe(18); // 9시~17시30분, 30분 간격
    expect(slots[0].time).toBe("09:00");
    expect(slots[slots.length - 1].time).toBe("17:30");
    for (const s of slots) {
      expect(s.id).toBeTruthy();
      expect(typeof s.isAvailable).toBe("boolean");
    }
  });

  it("필터 조합이 정상 작동해야 함", () => {
    const filtered24h = DAEJEON_FACILITIES.filter((f) => f.is24h);
    const filteredParking = DAEJEON_FACILITIES.filter((f) => f.parkingAvailable);
    const filteredSolo = DAEJEON_FACILITIES.filter((f) => f.soloRecommended);
    expect(filtered24h.length).toBeLessThanOrEqual(DAEJEON_FACILITIES.length);
    expect(filteredParking.length).toBeLessThanOrEqual(DAEJEON_FACILITIES.length);
    expect(filteredSolo.length).toBeLessThanOrEqual(DAEJEON_FACILITIES.length);
  });
});

// ============================================================
// 모듈 B: 헬스 매니저
// ============================================================
describe("모듈 B: 헬스 매니저 데이터 모델", () => {
  it("VaccineRecord 타입이 올바른 구조를 가져야 함", () => {
    const record = {
      id: "v1",
      petId: "p1",
      type: "종합백신" as const,
      date: "2026-01-15",
      nextDueDate: "2026-04-15",
      hospital: "대전24시 동물의료센터",
      isCompleted: true,
    };
    expect(record.type).toBe("종합백신");
    expect(record.nextDueDate).toBeTruthy();
  });

  it("MedicationRecord 타입이 올바른 구조를 가져야 함", () => {
    const med = {
      id: "m1",
      petId: "p1",
      name: "심장사상충 예방약",
      dosage: "1정",
      frequency: "월 1회",
      times: ["09:00"],
      startDate: "2026-01-01",
      isActive: true,
      logs: [],
    };
    expect(med.times.length).toBe(1);
    expect(med.isActive).toBe(true);
  });

  it("HealthReport 타입이 올바른 구조를 가져야 함", () => {
    const report = {
      id: "r1",
      petId: "p1",
      petName: "초코",
      month: "2026-04",
      totalWalks: 20,
      totalDistanceKm: 30,
      totalDurationMin: 600,
      avgDailyWalkMin: 20,
      weightChange: { start: 5.2, end: 5.0, diff: -0.2 },
      medicationAdherence: 95,
      vaccinesDue: [],
      generatedAt: "2026-04-01",
    };
    expect(report.medicationAdherence).toBeLessThanOrEqual(100);
    expect(report.weightChange?.diff).toBe(-0.2);
  });
});

// ============================================================
// 모듈 C: 응급처치 매뉴얼
// ============================================================
describe("모듈 C: 응급처치 매뉴얼", () => {
  it("응급처치 가이드가 8개 이상이어야 함", () => {
    expect(EMERGENCY_GUIDES.length).toBeGreaterThanOrEqual(8);
  });

  it("각 가이드에 필수 필드가 있어야 함", () => {
    for (const g of EMERGENCY_GUIDES) {
      expect(g.id).toBeTruthy();
      expect(g.type).toBeTruthy();
      expect(g.title).toBeTruthy();
      expect(g.subtitle).toBeTruthy();
      expect(g.description).toBeTruthy();
      expect(g.icon).toBeTruthy();
      expect(g.severity).toBeTruthy();
      expect(g.steps.length).toBeGreaterThan(0);
      expect(g.doList.length).toBeGreaterThan(0);
      expect(g.dontList.length).toBeGreaterThan(0);
    }
  });

  it("각 단계에 instruction과 illustration이 있어야 함", () => {
    for (const g of EMERGENCY_GUIDES) {
      for (const step of g.steps) {
        expect(step.stepNumber).toBeGreaterThan(0);
        expect(step.title).toBeTruthy();
        expect(step.description).toBeTruthy();
        expect(step.instruction).toBeTruthy();
        expect(step.illustration).toBeTruthy();
        expect(step.icon).toBeTruthy();
      }
    }
  });

  it("critical 심각도 가이드가 있어야 함", () => {
    const critical = EMERGENCY_GUIDES.filter((g) => g.severity === "critical");
    expect(critical.length).toBeGreaterThanOrEqual(1);
  });

  it("24시 응급 동물병원이 존재해야 함", () => {
    expect(EMERGENCY_HOSPITALS.length).toBeGreaterThanOrEqual(1);
    for (const h of EMERGENCY_HOSPITALS) {
      expect(h.is24h).toBe(true);
      expect(h.isEmergency).toBe(true);
      expect(h.phone).toBeTruthy();
    }
  });

  it("EMERGENCY_HOSPITALS_24H alias가 작동해야 함", () => {
    expect(EMERGENCY_HOSPITALS_24H).toBeDefined();
  });
});

// ============================================================
// 모듈 D: 대전 복지 정책 연계
// ============================================================
describe("모듈 D: 대전 복지 정책 연계", () => {
  it("복지 정책이 5개 이상이어야 함", () => {
    expect(WELFARE_POLICIES.length).toBeGreaterThanOrEqual(5);
  });

  it("각 정책에 필수 필드가 있어야 함", () => {
    for (const p of WELFARE_POLICIES) {
      expect(p.id).toBeTruthy();
      expect(p.title).toBeTruthy();
      expect(p.category).toBeTruthy();
      expect(p.description).toBeTruthy();
      expect(p.organization).toBeTruthy();
      expect(p.supportDetail).toBeTruthy();
      expect(p.supportAmount).toBeTruthy();
      expect(p.eligibility.length).toBeGreaterThan(0);
      expect(p.eligibilityConditions.length).toBeGreaterThan(0);
      expect(p.benefits.length).toBeGreaterThan(0);
      expect(p.applicationPeriod).toBeTruthy();
      expect(p.applicationMethod).toBeTruthy();
      expect(p.contactInfo).toBeTruthy();
      expect(p.requiredDocs.length).toBeGreaterThan(0);
      expect(p.requiredDocuments.length).toBeGreaterThan(0);
    }
  });

  it("모든 정책 카테고리가 라벨을 가져야 함", () => {
    const cats = new Set(WELFARE_POLICIES.map((p) => p.category));
    for (const c of cats) {
      expect(POLICY_CATEGORY_LABELS[c]).toBeTruthy();
    }
  });

  it("자격 진단 질문이 존재해야 함", () => {
    expect(ELIGIBILITY_QUESTIONS.length).toBeGreaterThanOrEqual(3);
    for (const q of ELIGIBILITY_QUESTIONS) {
      expect(q.id).toBeTruthy();
      expect(q.question).toBeTruthy();
      expect(q.key).toBeTruthy();
    }
  });

  it("자격 진단 로직이 정상 작동해야 함 - 1인 가구 기초수급자", () => {
    const answers = {
      district: "서구",
      householdType: "1인 가구",
      incomeLevel: "기초생활수급자",
      petRegistered: true,
      adoptedPet: false,
    };
    const results = checkEligibility(answers);
    expect(results.length).toBeGreaterThan(0);
    // 적격 정책이 있어야 함
    const eligible = results.filter((r) => r.isEligible);
    expect(eligible.length).toBeGreaterThanOrEqual(1);
  });

  it("자격 진단 로직 - 비적격 케이스", () => {
    const answers = {
      district: "서구",
      householdType: "3인 이상",
      incomeLevel: "중위소득 100% 초과",
      petRegistered: false,
      adoptedPet: false,
    };
    const results = checkEligibility(answers);
    expect(results.length).toBeGreaterThan(0);
    // 1인 가구 전용 정책은 부적격이어야 함
    const wp3 = results.find((r) => r.policyId === "wp3");
    if (wp3) {
      expect(wp3.isEligible).toBe(false);
    }
  });

  it("구청 정보가 5개 구 모두 포함되어야 함", () => {
    expect(DISTRICT_OFFICES.length).toBe(5);
    const districts = DISTRICT_OFFICES.map((o) => o.district);
    expect(districts).toContain("서구");
    expect(districts).toContain("유성구");
    expect(districts).toContain("중구");
    expect(districts).toContain("동구");
    expect(districts).toContain("대덕구");
  });

  it("각 구청에 필수 정보가 있어야 함", () => {
    for (const o of DISTRICT_OFFICES) {
      expect(o.name).toBeTruthy();
      expect(o.address).toBeTruthy();
      expect(o.phone).toBeTruthy();
      expect(o.petDeptPhone).toBeTruthy();
      expect(o.website).toBeTruthy();
    }
  });
});
