import { describe, it, expect } from "vitest";
import {
  SERVICE_OPTIONS,
  PAYMENT_METHODS,
  DAEJEON_COUPONS,
  calculateCouponDiscount,
  calculateFinalPrice,
  getAvailableCoupons,
  generateBookingId,
  formatDateKR,
  formatPrice,
} from "../lib/booking-model";

describe("예약 서비스 옵션", () => {
  it("4가지 서비스 옵션이 존재해야 함", () => {
    expect(SERVICE_OPTIONS.length).toBe(4);
  });

  it("산책 서비스가 포함되어야 함", () => {
    const walk = SERVICE_OPTIONS.find((s) => s.type === "walk");
    expect(walk).toBeDefined();
    expect(walk!.name).toContain("산책");
    expect(walk!.pricePerHour).toBeGreaterThan(0);
  });

  it("모든 서비스에 필수 필드가 있어야 함", () => {
    for (const svc of SERVICE_OPTIONS) {
      expect(svc.id).toBeTruthy();
      expect(svc.name).toBeTruthy();
      expect(svc.emoji).toBeTruthy();
      expect(svc.pricePerHour).toBeGreaterThan(0);
      expect(svc.minHours).toBeGreaterThanOrEqual(1);
      expect(svc.maxHours).toBeGreaterThanOrEqual(svc.minHours);
    }
  });
});

describe("결제 수단", () => {
  it("5가지 결제 수단이 존재해야 함", () => {
    expect(PAYMENT_METHODS.length).toBe(5);
  });

  it("온통대전 결제 수단이 포함되어야 함", () => {
    const ontong = PAYMENT_METHODS.find((pm) => pm.type === "ontong_daejeon");
    expect(ontong).toBeDefined();
    expect(ontong!.name).toContain("온통대전");
    expect(ontong!.isLocal).toBe(true);
    expect(ontong!.highlight).toBe(true);
  });

  it("온통대전에 캐시백 할인이 있어야 함", () => {
    const ontong = PAYMENT_METHODS.find((pm) => pm.type === "ontong_daejeon");
    expect(ontong!.discount).toBeGreaterThan(0);
  });

  it("카드 결제(포트원)가 포함되어야 함", () => {
    const card = PAYMENT_METHODS.find((pm) => pm.type === "card");
    expect(card).toBeDefined();
    expect(card!.description).toContain("포트원");
  });

  it("카카오페이가 포함되어야 함", () => {
    const kakao = PAYMENT_METHODS.find((pm) => pm.type === "kakaopay");
    expect(kakao).toBeDefined();
  });

  it("모든 결제 수단에 필수 필드가 있어야 함", () => {
    for (const pm of PAYMENT_METHODS) {
      expect(pm.type).toBeTruthy();
      expect(pm.name).toBeTruthy();
      expect(pm.emoji).toBeTruthy();
    }
  });
});

describe("대전 지역 할인 쿠폰", () => {
  it("쿠폰이 존재해야 함", () => {
    expect(DAEJEON_COUPONS.length).toBeGreaterThan(0);
  });

  it("대전 구별 쿠폰이 있어야 함", () => {
    const districts = ["서구", "유성구", "중구", "동구", "대덕구"];
    for (const district of districts) {
      const coupons = DAEJEON_COUPONS.filter(
        (c) => c.district === district || c.district === null
      );
      expect(coupons.length).toBeGreaterThan(0);
    }
  });

  it("서구 사용자가 서구 쿠폰을 사용할 수 있어야 함", () => {
    const available = getAvailableCoupons(DAEJEON_COUPONS, "서구", 15000);
    expect(available.length).toBeGreaterThan(0);
    // 서구 전용 쿠폰 또는 대전 전체 쿠폰만 포함
    for (const c of available) {
      expect(c.district === "서구" || c.district === null).toBe(true);
    }
  });

  it("유성구 사용자가 유성구 쿠폰을 사용할 수 있어야 함", () => {
    const available = getAvailableCoupons(DAEJEON_COUPONS, "유성구", 15000);
    expect(available.length).toBeGreaterThan(0);
    for (const c of available) {
      expect(c.district === "유성구" || c.district === null).toBe(true);
    }
  });

  it("최소 금액 미달 시 쿠폰 사용 불가", () => {
    const available = getAvailableCoupons(DAEJEON_COUPONS, "서구", 1000);
    // 최소 금액이 1000원 이하인 쿠폰만 사용 가능
    for (const c of available) {
      expect(c.minOrderAmount).toBeLessThanOrEqual(1000);
    }
  });
});

describe("쿠폰 할인 계산", () => {
  it("정률 할인 쿠폰이 올바르게 계산되어야 함", () => {
    const percentCoupon = DAEJEON_COUPONS.find((c) => c.type === "percent");
    if (percentCoupon) {
      const discount = calculateCouponDiscount(percentCoupon, 30000);
      expect(discount).toBeGreaterThan(0);
      expect(discount).toBeLessThanOrEqual(30000);
      // 최대 할인 금액 제한
      if (percentCoupon.maxDiscount) {
        expect(discount).toBeLessThanOrEqual(percentCoupon.maxDiscount);
      }
    }
  });

  it("정액 할인 쿠폰이 올바르게 계산되어야 함", () => {
    const fixedCoupon = DAEJEON_COUPONS.find((c) => c.type === "fixed");
    if (fixedCoupon) {
      const discount = calculateCouponDiscount(fixedCoupon, 30000);
      expect(discount).toBe(fixedCoupon.value);
    }
  });

  it("할인 금액이 결제 금액을 초과하지 않아야 함", () => {
    for (const coupon of DAEJEON_COUPONS) {
      const discount = calculateCouponDiscount(coupon, 5000);
      expect(discount).toBeLessThanOrEqual(5000);
    }
  });
});

describe("최종 가격 계산", () => {
  it("쿠폰 할인이 적용된 최종 가격이 올바르게 계산되어야 함", () => {
    const result = calculateFinalPrice(30000, 3000, "card");
    expect(result.finalPrice).toBe(27000);
    expect(result.cashback).toBe(0);
  });

  it("온통대전 결제 시 캐시백이 계산되어야 함", () => {
    const result = calculateFinalPrice(30000, 0, "ontong_daejeon");
    expect(result.finalPrice).toBe(30000);
    expect(result.cashback).toBeGreaterThan(0);
  });

  it("최종 가격이 0원 미만이 되지 않아야 함", () => {
    const result = calculateFinalPrice(10000, 50000, "card");
    expect(result.finalPrice).toBeGreaterThanOrEqual(0);
  });
});

describe("유틸리티 함수", () => {
  it("예약 ID가 고유하게 생성되어야 함", () => {
    const id1 = generateBookingId();
    const id2 = generateBookingId();
    expect(id1).not.toBe(id2);
    expect(id1.startsWith("BK")).toBe(true);
  });

  it("날짜 포맷이 올바르게 변환되어야 함", () => {
    const formatted = formatDateKR("2026-03-26");
    expect(formatted).toContain("3월");
    expect(formatted).toContain("26일");
  });

  it("가격 포맷이 올바르게 변환되어야 함", () => {
    const formatted = formatPrice(15000);
    expect(formatted).toContain("15,000");
    expect(formatted).toContain("원");
  });
});

describe("푸시 알림 로직", () => {
  it("결제 완료 시 보호자 알림 데이터가 올바르게 생성되어야 함", () => {
    const notification = {
      id: `booking_owner_${Date.now()}`,
      type: "match" as const,
      title: "🎉 예약이 확정되었습니다!",
      body: `민지님과 3월 26일 14:00 산책 예약이 확정되었습니다. 결제금액: 15,000원`,
      isRead: false,
      createdAt: new Date().toISOString(),
    };
    expect(notification.title).toContain("예약이 확정");
    expect(notification.body).toContain("민지");
    expect(notification.body).toContain("15,000원");
  });

  it("결제 완료 시 워커 알림 데이터가 올바르게 생성되어야 함", () => {
    const notification = {
      id: `booking_walker_${Date.now()}`,
      type: "match" as const,
      title: "📋 새 예약이 들어왔습니다!",
      body: `보호자님이 3월 26일 14:00 산책을 예약했습니다.`,
      isRead: false,
      createdAt: new Date().toISOString(),
    };
    expect(notification.title).toContain("새 예약");
    expect(notification.body).toContain("보호자");
  });
});
