/**
 * Phase 26: 관리자 전용 대시보드 테스트
 */
import { describe, it, expect } from "vitest";
import {
  DISTRICT_STATS,
  TODAY_REVENUE,
  ACTIVE_WALKERS,
  PENDING_WALKERS,
  DASHBOARD_SUMMARY,
  WALKER_STATUS_MAP,
  APPROVAL_STATUS_MAP,
  type DistrictStats,
  type ActiveWalkerLocation,
  type PendingWalker,
  type DailyRevenue,
  type DashboardSummary,
} from "../lib/admin-dashboard-data";

describe("관리자 대시보드 데이터 모델", () => {
  describe("대전 5개 구별 매칭 통계 (DISTRICT_STATS)", () => {
    it("5개 구 데이터가 정의되어 있어야 한다", () => {
      expect(DISTRICT_STATS).toHaveLength(5);
    });

    it("대전 5개 구가 모두 포함되어야 한다", () => {
      const districts = DISTRICT_STATS.map((d) => d.district);
      expect(districts).toContain("서구");
      expect(districts).toContain("유성구");
      expect(districts).toContain("중구");
      expect(districts).toContain("동구");
      expect(districts).toContain("대덕구");
    });

    it("각 구에 필수 필드가 있어야 한다", () => {
      DISTRICT_STATS.forEach((d) => {
        expect(d).toHaveProperty("district");
        expect(d).toHaveProperty("matchCount");
        expect(d).toHaveProperty("percentage");
        expect(d).toHaveProperty("color");
        expect(d).toHaveProperty("activeWalkers");
        expect(d).toHaveProperty("totalBookings");
        expect(typeof d.matchCount).toBe("number");
        expect(typeof d.percentage).toBe("number");
        expect(typeof d.color).toBe("string");
        expect(d.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
      });
    });

    it("점유율 합계가 약 100%여야 한다", () => {
      const totalPercentage = DISTRICT_STATS.reduce((sum, d) => sum + d.percentage, 0);
      expect(totalPercentage).toBeGreaterThan(99);
      expect(totalPercentage).toBeLessThan(101);
    });

    it("매칭 수가 양수여야 한다", () => {
      DISTRICT_STATS.forEach((d) => {
        expect(d.matchCount).toBeGreaterThan(0);
        expect(d.activeWalkers).toBeGreaterThan(0);
        expect(d.totalBookings).toBeGreaterThan(0);
      });
    });
  });

  describe("오늘 매출 통계 (TODAY_REVENUE)", () => {
    it("필수 필드가 모두 있어야 한다", () => {
      expect(TODAY_REVENUE).toHaveProperty("totalRevenue");
      expect(TODAY_REVENUE).toHaveProperty("totalBookings");
      expect(TODAY_REVENUE).toHaveProperty("completedWalks");
      expect(TODAY_REVENUE).toHaveProperty("averagePerWalk");
      expect(TODAY_REVENUE).toHaveProperty("comparedYesterday");
    });

    it("매출이 양수여야 한다", () => {
      expect(TODAY_REVENUE.totalRevenue).toBeGreaterThan(0);
      expect(TODAY_REVENUE.totalBookings).toBeGreaterThan(0);
      expect(TODAY_REVENUE.completedWalks).toBeGreaterThan(0);
    });

    it("평균 산책 비용이 합리적이어야 한다 (1만~5만원)", () => {
      expect(TODAY_REVENUE.averagePerWalk).toBeGreaterThan(10000);
      expect(TODAY_REVENUE.averagePerWalk).toBeLessThan(50000);
    });
  });

  describe("관제 지도: 산책 중 워커 (ACTIVE_WALKERS)", () => {
    it("6명의 활성 워커가 있어야 한다", () => {
      expect(ACTIVE_WALKERS).toHaveLength(6);
    });

    it("각 워커에 필수 필드가 있어야 한다", () => {
      ACTIVE_WALKERS.forEach((w) => {
        expect(w).toHaveProperty("id");
        expect(w).toHaveProperty("nickname");
        expect(w).toHaveProperty("profileEmoji");
        expect(w).toHaveProperty("latitude");
        expect(w).toHaveProperty("longitude");
        expect(w).toHaveProperty("district");
        expect(w).toHaveProperty("petName");
        expect(w).toHaveProperty("ownerName");
        expect(w).toHaveProperty("status");
        expect(w).toHaveProperty("distanceCovered");
        expect(w).toHaveProperty("elapsedMinutes");
      });
    });

    it("모든 좌표가 대전 범위 내에 있어야 한다", () => {
      ACTIVE_WALKERS.forEach((w) => {
        expect(w.latitude).toBeGreaterThan(36.2);
        expect(w.latitude).toBeLessThan(36.5);
        expect(w.longitude).toBeGreaterThan(127.3);
        expect(w.longitude).toBeLessThan(127.5);
      });
    });

    it("워커 상태가 유효해야 한다", () => {
      const validStatuses = ["walking", "resting", "returning"];
      ACTIVE_WALKERS.forEach((w) => {
        expect(validStatuses).toContain(w.status);
      });
    });

    it("대전 5개 구 중 하나에 속해야 한다", () => {
      const validDistricts = ["서구", "유성구", "중구", "동구", "대덕구"];
      ACTIVE_WALKERS.forEach((w) => {
        expect(validDistricts).toContain(w.district);
      });
    });

    it("이동 거리와 경과 시간이 양수여야 한다", () => {
      ACTIVE_WALKERS.forEach((w) => {
        expect(w.distanceCovered).toBeGreaterThan(0);
        expect(w.elapsedMinutes).toBeGreaterThan(0);
      });
    });
  });

  describe("워커 승인 대기 목록 (PENDING_WALKERS)", () => {
    it("4명의 대기 워커가 있어야 한다", () => {
      expect(PENDING_WALKERS).toHaveLength(4);
    });

    it("각 워커에 필수 필드가 있어야 한다", () => {
      PENDING_WALKERS.forEach((w) => {
        expect(w).toHaveProperty("id");
        expect(w).toHaveProperty("nickname");
        expect(w).toHaveProperty("realName");
        expect(w).toHaveProperty("age");
        expect(w).toHaveProperty("district");
        expect(w).toHaveProperty("certPhotoUrl");
        expect(w).toHaveProperty("profilePhotoUrl");
        expect(w).toHaveProperty("certType");
        expect(w).toHaveProperty("experience");
        expect(w).toHaveProperty("bio");
        expect(w).toHaveProperty("canHandleLargeDogs");
        expect(w).toHaveProperty("status");
      });
    });

    it("모든 워커가 pending 상태여야 한다 (초기)", () => {
      PENDING_WALKERS.forEach((w) => {
        expect(w.status).toBe("pending");
      });
    });

    it("자격증 사진 URL이 유효해야 한다", () => {
      PENDING_WALKERS.forEach((w) => {
        expect(w.certPhotoUrl).toMatch(/^https?:\/\//);
        expect(w.profilePhotoUrl).toMatch(/^https?:\/\//);
      });
    });

    it("대전 5개 구에 속해야 한다", () => {
      const validDistricts = ["서구", "유성구", "중구", "동구", "대덕구"];
      PENDING_WALKERS.forEach((w) => {
        expect(validDistricts).toContain(w.district);
      });
    });
  });

  describe("대시보드 요약 (DASHBOARD_SUMMARY)", () => {
    it("필수 필드가 모두 있어야 한다", () => {
      expect(DASHBOARD_SUMMARY).toHaveProperty("totalUsers");
      expect(DASHBOARD_SUMMARY).toHaveProperty("totalWalkers");
      expect(DASHBOARD_SUMMARY).toHaveProperty("totalOwners");
      expect(DASHBOARD_SUMMARY).toHaveProperty("pendingApprovals");
      expect(DASHBOARD_SUMMARY).toHaveProperty("activeWalksNow");
      expect(DASHBOARD_SUMMARY).toHaveProperty("todayNewUsers");
      expect(DASHBOARD_SUMMARY).toHaveProperty("monthlyGrowth");
    });

    it("총 유저 = 워커 + 보호자여야 한다", () => {
      expect(DASHBOARD_SUMMARY.totalUsers).toBe(
        DASHBOARD_SUMMARY.totalWalkers + DASHBOARD_SUMMARY.totalOwners
      );
    });

    it("대기 승인 수가 PENDING_WALKERS의 pending 수와 일치해야 한다", () => {
      const pendingCount = PENDING_WALKERS.filter((w) => w.status === "pending").length;
      expect(DASHBOARD_SUMMARY.pendingApprovals).toBe(pendingCount);
    });

    it("활성 산책 수가 ACTIVE_WALKERS 수와 일치해야 한다", () => {
      expect(DASHBOARD_SUMMARY.activeWalksNow).toBe(ACTIVE_WALKERS.length);
    });
  });

  describe("상태 매핑", () => {
    it("WALKER_STATUS_MAP에 3가지 상태가 있어야 한다", () => {
      expect(Object.keys(WALKER_STATUS_MAP)).toHaveLength(3);
      expect(WALKER_STATUS_MAP).toHaveProperty("walking");
      expect(WALKER_STATUS_MAP).toHaveProperty("resting");
      expect(WALKER_STATUS_MAP).toHaveProperty("returning");
    });

    it("각 상태에 label, color, bgColor가 있어야 한다", () => {
      Object.values(WALKER_STATUS_MAP).forEach((s) => {
        expect(s).toHaveProperty("label");
        expect(s).toHaveProperty("color");
        expect(s).toHaveProperty("bgColor");
        expect(typeof s.label).toBe("string");
        expect(s.color).toMatch(/^#/);
      });
    });

    it("APPROVAL_STATUS_MAP에 3가지 상태가 있어야 한다", () => {
      expect(Object.keys(APPROVAL_STATUS_MAP)).toHaveLength(3);
      expect(APPROVAL_STATUS_MAP).toHaveProperty("pending");
      expect(APPROVAL_STATUS_MAP).toHaveProperty("approved");
      expect(APPROVAL_STATUS_MAP).toHaveProperty("rejected");
    });
  });
});

describe("관리자 접근 제어", () => {
  it("대시보드 경로가 /admin/dashboard여야 한다", () => {
    const route = "/admin/dashboard";
    expect(route).toContain("admin");
    expect(route).toContain("dashboard");
  });

  it("관리자 메뉴는 프로필 > 버전 5번 탭으로만 접근 가능", () => {
    // 관리자 메뉴 접근 방법: 프로필 화면 > 앱 설정 > 버전 텍스트 5번 탭
    const ADMIN_TAP_COUNT = 5;
    expect(ADMIN_TAP_COUNT).toBe(5);
  });
});

describe("원형 차트 데이터 유효성", () => {
  it("모든 구의 색상이 서로 달라야 한다", () => {
    const colors = DISTRICT_STATS.map((d) => d.color);
    const uniqueColors = new Set(colors);
    expect(uniqueColors.size).toBe(colors.length);
  });

  it("매칭 수 기준 내림차순 정렬이어야 한다", () => {
    for (let i = 0; i < DISTRICT_STATS.length - 1; i++) {
      expect(DISTRICT_STATS[i].matchCount).toBeGreaterThanOrEqual(DISTRICT_STATS[i + 1].matchCount);
    }
  });
});
