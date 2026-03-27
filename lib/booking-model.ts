/**
 * 예약 및 결제 데이터 모델
 * - 예약(Booking), 결제 수단(PaymentMethod), 쿠폰(Coupon)
 */

// ─── 예약 상태 ───
export type BookingStatus =
  | "pending"      // 결제 대기
  | "confirmed"    // 예약 확정
  | "in_progress"  // 산책/돌봄 진행 중
  | "completed"    // 완료
  | "cancelled";   // 취소

// ─── 서비스 타입 ───
export type ServiceType = "walk" | "daycare" | "boarding" | "grooming";

export interface ServiceOption {
  id: string;
  type: ServiceType;
  name: string;
  description: string;
  emoji: string;
  pricePerHour: number; // 원
  minHours: number;
  maxHours: number;
}

// ─── 예약 ───
export interface Booking {
  id: string;
  ownerId: string;
  walkerId: string;
  walkerName: string;
  walkerAvatar: string;
  service: ServiceOption;
  date: string;           // YYYY-MM-DD
  startTime: string;      // HH:MM
  endTime: string;        // HH:MM
  hours: number;
  basePrice: number;      // 기본 가격
  couponDiscount: number; // 쿠폰 할인
  finalPrice: number;     // 최종 결제 금액
  paymentMethod: PaymentMethodType;
  couponId: string | null;
  status: BookingStatus;
  neighborhood: string;   // 산책 동네
  note: string;           // 요청사항
  createdAt: string;
  confirmedAt: string | null;
}

// ─── 결제 수단 ───
export type PaymentMethodType =
  | "card"           // 신용/체크카드
  | "ontong_daejeon" // 온통대전 (지역화폐)
  | "kakaopay"       // 카카오페이
  | "naver_pay"      // 네이버페이
  | "bank_transfer"; // 계좌이체

export interface PaymentMethod {
  type: PaymentMethodType;
  name: string;
  emoji: string;
  description: string;
  isLocal: boolean;     // 대전 지역 전용 여부
  highlight: boolean;   // 눈에 띄게 표시
  discount?: number;    // 추가 할인율 (%)
}

export const PAYMENT_METHODS: PaymentMethod[] = [
  {
    type: "ontong_daejeon",
    name: "온통대전",
    emoji: "🏙️",
    description: "대전 지역화폐 · 10% 캐시백",
    isLocal: true,
    highlight: true,
    discount: 10,
  },
  {
    type: "card",
    name: "신용/체크카드",
    emoji: "💳",
    description: "포트원 결제 · 모든 카드 가능",
    isLocal: false,
    highlight: false,
  },
  {
    type: "kakaopay",
    name: "카카오페이",
    emoji: "💛",
    description: "카카오페이 간편결제",
    isLocal: false,
    highlight: false,
  },
  {
    type: "naver_pay",
    name: "네이버페이",
    emoji: "💚",
    description: "네이버페이 간편결제",
    isLocal: false,
    highlight: false,
  },
  {
    type: "bank_transfer",
    name: "계좌이체",
    emoji: "🏦",
    description: "실시간 계좌이체",
    isLocal: false,
    highlight: false,
  },
];

// ─── 쿠폰 ───
export type CouponType = "percent" | "fixed";

export interface Coupon {
  id: string;
  name: string;
  description: string;
  type: CouponType;
  value: number;          // percent: 할인율(%), fixed: 할인금액(원)
  minOrderAmount: number; // 최소 주문 금액
  maxDiscount: number;    // 최대 할인 금액
  district: string | null; // null이면 전체 대전, 아니면 특정 구
  validUntil: string;     // YYYY-MM-DD
  isUsed: boolean;
  emoji: string;
}

export const DAEJEON_COUPONS: Coupon[] = [
  {
    id: "coupon_seogu_1",
    name: "서구 첫 산책 할인",
    description: "서구 지역 첫 산책 서비스 20% 할인",
    type: "percent",
    value: 20,
    minOrderAmount: 10000,
    maxDiscount: 5000,
    district: "서구",
    validUntil: "2026-06-30",
    isUsed: false,
    emoji: "🎫",
  },
  {
    id: "coupon_yuseong_1",
    name: "유성구 봄맞이 특가",
    description: "유성구 지역 산책 3,000원 할인",
    type: "fixed",
    value: 3000,
    minOrderAmount: 15000,
    maxDiscount: 3000,
    district: "유성구",
    validUntil: "2026-05-31",
    isUsed: false,
    emoji: "🌸",
  },
  {
    id: "coupon_junggu_1",
    name: "중구 돌봄 할인",
    description: "중구 지역 돌봄 서비스 15% 할인",
    type: "percent",
    value: 15,
    minOrderAmount: 20000,
    maxDiscount: 6000,
    district: "중구",
    validUntil: "2026-07-31",
    isUsed: false,
    emoji: "🎁",
  },
  {
    id: "coupon_donggu_1",
    name: "동구 주말 할인",
    description: "동구 지역 주말 산책 2,000원 할인",
    type: "fixed",
    value: 2000,
    minOrderAmount: 10000,
    maxDiscount: 2000,
    district: "동구",
    validUntil: "2026-08-31",
    isUsed: false,
    emoji: "🎪",
  },
  {
    id: "coupon_daedeok_1",
    name: "대덕구 신규 가입 쿠폰",
    description: "대덕구 지역 전 서비스 25% 할인",
    type: "percent",
    value: 25,
    minOrderAmount: 10000,
    maxDiscount: 7000,
    district: "대덕구",
    validUntil: "2026-09-30",
    isUsed: false,
    emoji: "🎉",
  },
  {
    id: "coupon_all_1",
    name: "반려이음 웰컴 쿠폰",
    description: "대전 전 지역 첫 이용 10% 할인",
    type: "percent",
    value: 10,
    minOrderAmount: 10000,
    maxDiscount: 3000,
    district: null,
    validUntil: "2026-12-31",
    isUsed: false,
    emoji: "🐾",
  },
];

// ─── 서비스 옵션 ───
export const SERVICE_OPTIONS: ServiceOption[] = [
  {
    id: "walk_basic",
    type: "walk",
    name: "기본 산책",
    description: "동네 산책 · 배변 처리 포함",
    emoji: "🦮",
    pricePerHour: 15000,
    minHours: 1,
    maxHours: 3,
  },
  {
    id: "walk_premium",
    type: "walk",
    name: "프리미엄 산책",
    description: "공원 산책 · 사진 촬영 · 리포트",
    emoji: "🌳",
    pricePerHour: 20000,
    minHours: 1,
    maxHours: 4,
  },
  {
    id: "daycare",
    type: "daycare",
    name: "데이케어",
    description: "낮 시간 돌봄 · 간식 제공",
    emoji: "🏠",
    pricePerHour: 12000,
    minHours: 2,
    maxHours: 8,
  },
  {
    id: "grooming",
    type: "grooming",
    name: "목욕/미용",
    description: "기본 목욕 · 발톱 정리",
    emoji: "🛁",
    pricePerHour: 25000,
    minHours: 1,
    maxHours: 2,
  },
];

// ─── 유틸리티 함수 ───

/**
 * 쿠폰 할인 금액 계산
 */
export function calculateCouponDiscount(
  coupon: Coupon,
  basePrice: number
): number {
  if (basePrice < coupon.minOrderAmount) return 0;

  if (coupon.type === "percent") {
    const discount = Math.floor(basePrice * (coupon.value / 100));
    return Math.min(discount, coupon.maxDiscount);
  }

  return Math.min(coupon.value, coupon.maxDiscount);
}

/**
 * 사용 가능한 쿠폰 필터링
 * @param district 사용자의 구 (예: "서구")
 * @param basePrice 기본 가격
 */
export function getAvailableCoupons(
  coupons: Coupon[],
  district: string,
  basePrice: number
): Coupon[] {
  const today = new Date().toISOString().split("T")[0];
  return coupons.filter((c) => {
    if (c.isUsed) return false;
    if (c.validUntil < today) return false;
    if (c.minOrderAmount > basePrice) return false;
    if (c.district !== null && c.district !== district) return false;
    return true;
  });
}

/**
 * 최종 결제 금액 계산
 */
export function calculateFinalPrice(
  basePrice: number,
  couponDiscount: number,
  paymentMethod: PaymentMethodType
): { finalPrice: number; cashback: number } {
  const afterCoupon = Math.max(0, basePrice - couponDiscount);

  // 온통대전 10% 캐시백
  const cashback =
    paymentMethod === "ontong_daejeon"
      ? Math.floor(afterCoupon * 0.1)
      : 0;

  return { finalPrice: afterCoupon, cashback };
}

/**
 * 예약 ID 생성
 */
export function generateBookingId(): string {
  const now = new Date();
  const dateStr = now.toISOString().replace(/[\-:T.Z]/g, "").slice(0, 14);
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `BK${dateStr}${random}`;
}

/**
 * 시간 슬롯 생성 (30분 간격)
 */
export function generateTimeSlots(
  startHour: number = 7,
  endHour: number = 21
): string[] {
  const slots: string[] = [];
  for (let h = startHour; h < endHour; h++) {
    slots.push(`${h.toString().padStart(2, "0")}:00`);
    slots.push(`${h.toString().padStart(2, "0")}:30`);
  }
  return slots;
}

/**
 * 날짜 포맷 (한국어)
 */
export function formatDateKR(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const dayOfWeek = days[date.getDay()];
  return `${month}월 ${day}일 (${dayOfWeek})`;
}

/**
 * 가격 포맷 (원)
 */
export function formatPrice(price: number): string {
  return price.toLocaleString("ko-KR") + "원";
}
