/**
 * 1인 가구 반려인 자동화 서포트 - 통합 데이터 모델
 * 모듈 A: 지역 인프라 매핑 & 예약
 * 모듈 B: 헬스 매니저
 * 모듈 C: 응급처치 매뉴얼
 * 모듈 D: 대전 복지 정책 연계
 */

// ============================================================
// 모듈 A: 지역 기반 인프라 매핑 & 실시간 예약
// ============================================================

export type FacilityCategory = "hospital" | "shop" | "cafe" | "grooming";

export interface FacilityFilter {
  is24h: boolean;
  soloRecommended: boolean;
  parkingAvailable: boolean;
  emergencyAvailable: boolean;
}

export interface TimeSlot {
  id: string;
  time: string;        // "09:00", "09:30", ...
  isAvailable: boolean;
  bookedBy?: string;    // userId
}

export interface Reservation {
  id: string;
  facilityId: string;
  facilityName: string;
  date: string;         // "2026-04-05"
  timeSlot: string;     // "14:00"
  petName: string;
  service: string;      // "기본 미용", "건강 검진" 등
  status: "confirmed" | "pending" | "cancelled";
  createdAt: string;
  note?: string;
}

export interface PetFacility {
  id: string;
  name: string;
  category: FacilityCategory;
  address: string;
  district: string;     // "서구", "유성구" 등
  dong: string;         // "둔산동", "궁동" 등
  lat: number;
  lng: number;
  rating: number;
  reviewCount: number;
  phone: string;
  openHours: string;    // "09:00-21:00"
  closedDay?: string;   // "일요일"
  is24h: boolean;
  soloRecommended: boolean;
  parkingAvailable: boolean;
  emergencyAvailable: boolean;
  description: string;
  services: string[];
  imageUrl?: string;
  timeSlots?: TimeSlot[]; // 미용실/병원 예약 슬롯
}

// ============================================================
// 모듈 B: 헬스 매니저
// ============================================================

export type VaccineType = "종합백신" | "광견병" | "코로나장염" | "켄넬코프" | "인플루엔자";

export interface VaccineRecord {
  id: string;
  petId: string;
  type: VaccineType;
  date: string;         // 접종일
  nextDueDate: string;  // 다음 접종 예정일
  hospital?: string;
  note?: string;
  isCompleted: boolean;
}

export interface MedicationRecord {
  id: string;
  petId: string;
  name: string;         // 약 이름
  dosage: string;       // "1정", "5ml" 등
  frequency: string;    // "하루 2회", "하루 1회" 등
  times: string[];      // ["08:00", "20:00"]
  startDate: string;
  endDate?: string;
  isActive: boolean;
  logs: MedicationLog[];
}

export interface MedicationLog {
  id: string;
  medicationId: string;
  date: string;
  time: string;
  taken: boolean;
  takenAt?: string;
}

export interface WeightRecord {
  id: string;
  petId: string;
  weight: number;       // kg
  date: string;
  note?: string;
}

export interface ActivitySummary {
  date: string;
  walkCount: number;
  totalDistanceKm: number;
  totalDurationMin: number;
  avgSpeedKmh: number;
}

export interface HealthReport {
  id: string;
  petId: string;
  petName: string;
  month: string;        // "2026-04"
  totalWalks: number;
  totalDistanceKm: number;
  totalDurationMin: number;
  avgDailyWalkMin: number;
  weightChange: { start: number; end: number; diff: number } | null;
  medicationAdherence: number; // 0-100%
  vaccinesDue: VaccineRecord[];
  generatedAt: string;
}

// ============================================================
// 모듈 C: 응급처치 매뉴얼
// ============================================================

export type EmergencyType = "choking" | "cpr" | "burn" | "poison" | "bleeding" | "heatstroke" | "seizure" | "fracture";

export interface EmergencyStep {
  stepNumber: number;
  title: string;
  description: string;
  instruction: string;  // 상세 지시사항
  illustration: string; // 이모지 일러스트
  icon: string;         // 이모지 아이콘
  warning?: string;     // 주의사항
  duration?: string;    // "30초간", "5분간" 등
  timerSeconds?: number; // 타이머 초
}

export interface EmergencyGuide {
  id: string;
  type: EmergencyType;
  title: string;
  subtitle: string;
  description: string;  // 상세 설명
  icon: string;
  severity: "critical" | "high" | "medium";
  steps: EmergencyStep[];
  doList: string[];     // 해야 할 것
  dontList: string[];   // 하지 말아야 할 것
  callVet: boolean;     // 즉시 병원 방문 필요 여부
  additionalTips?: string[]; // 추가 팁
}

export interface EmergencyHospital {
  id: string;
  name: string;
  address: string;
  phone: string;
  lat: number;
  lng: number;
  is24h: boolean;
  isEmergency: boolean;
  district: string;
}

// ============================================================
// 모듈 D: 대전 복지 정책 연계
// ============================================================

export type PolicyCategory = "medical" | "adoption" | "registration" | "education" | "subsidy";

export interface EligibilityCondition {
  type: "household" | "income" | "registration" | "neutering" | "disability" | "senior" | "basicLivelihood";
  value?: string;
  required?: boolean;
  description: string;
}

export interface WelfarePolicy {
  id: string;
  title: string;
  category: PolicyCategory;
  description: string;
  organization: string;         // 주관 기관
  supportDetail: string;        // 지원 상세
  supportAmount: string;        // 지원 금액
  eligibility: string[];        // 자격 조건 목록
  eligibilityConditions: EligibilityCondition[]; // 구조화된 자격 조건
  benefits: string[];           // 지원 내용
  applicationPeriod: string;    // "2026.01.01 ~ 2026.12.31"
  applicationMethod: string;    // 신청 방법
  applicationUrl?: string;
  contactPhone?: string;
  contactInfo: string;          // 문의처 정보
  district?: string;            // 특정 구 대상이면 표시
  requiredDocs: string[];       // 필수 서류
  requiredDocuments: string[];  // 필수 제출 서류 (alias)
  maxAmount?: string;           // 최대 지원금
  isActive: boolean;
  updatedAt: string;
}

export interface EligibilityQuestion {
  id: string;
  question: string;
  type: "select" | "number" | "boolean";
  options?: string[];
  key: string;
}

export interface EligibilityResult {
  policyId: string;
  policyTitle: string;
  isEligible: boolean;
  reason: string;
  matchScore: number; // 0-100
}

// ============================================================
// 더미 데이터: 대전 지역 인프라
// ============================================================

export const DAEJEON_FACILITIES: PetFacility[] = [
  // 동물병원
  {
    id: "h1", name: "대전24시 동물의료센터", category: "hospital",
    address: "대전 서구 둔산로 100", district: "서구", dong: "둔산동",
    lat: 36.3515, lng: 127.3786, rating: 4.8, reviewCount: 342,
    phone: "042-123-4567", openHours: "24시간", is24h: true,
    soloRecommended: true, parkingAvailable: true, emergencyAvailable: true,
    description: "24시간 응급 진료 가능, 1인 가구 야간 응급 추천",
    services: ["응급진료", "내과", "외과", "치과", "건강검진", "예방접종"],
  },
  {
    id: "h2", name: "유성 펫 동물병원", category: "hospital",
    address: "대전 유성구 궁동로 42", district: "유성구", dong: "궁동",
    lat: 36.3627, lng: 127.3505, rating: 4.6, reviewCount: 218,
    phone: "042-234-5678", openHours: "09:00-21:00", closedDay: "일요일",
    is24h: false, soloRecommended: true, parkingAvailable: true, emergencyAvailable: false,
    description: "소형견 전문, 친절한 상담으로 1인 가구 보호자에게 인기",
    services: ["내과", "피부과", "치과", "건강검진", "예방접종", "중성화"],
  },
  {
    id: "h3", name: "중구 우리동물병원", category: "hospital",
    address: "대전 중구 대흥로 55", district: "중구", dong: "대흥동",
    lat: 36.3275, lng: 127.4271, rating: 4.5, reviewCount: 156,
    phone: "042-345-6789", openHours: "09:30-20:00", closedDay: "일요일",
    is24h: false, soloRecommended: false, parkingAvailable: false, emergencyAvailable: false,
    description: "합리적인 진료비, 꼼꼼한 진료",
    services: ["내과", "외과", "예방접종", "건강검진"],
  },
  {
    id: "h4", name: "동구 해피펫 동물병원", category: "hospital",
    address: "대전 동구 동서대로 78", district: "동구", dong: "용전동",
    lat: 36.3326, lng: 127.4545, rating: 4.4, reviewCount: 89,
    phone: "042-456-7890", openHours: "10:00-19:00", closedDay: "일요일, 공휴일",
    is24h: false, soloRecommended: false, parkingAvailable: true, emergencyAvailable: false,
    description: "대형견 전문 진료, 넓은 주차장",
    services: ["내과", "외과", "정형외과", "예방접종"],
  },
  {
    id: "h5", name: "대덕 나눔 동물병원", category: "hospital",
    address: "대전 대덕구 한밭대로 1200", district: "대덕구", dong: "법동",
    lat: 36.3468, lng: 127.4156, rating: 4.3, reviewCount: 67,
    phone: "042-567-8901", openHours: "09:00-18:00", closedDay: "토요일 오후, 일요일",
    is24h: false, soloRecommended: true, parkingAvailable: true, emergencyAvailable: false,
    description: "저렴한 진료비, 사회적 약자 할인 제공",
    services: ["내과", "예방접종", "건강검진", "중성화"],
  },
  // 애견용품점
  {
    id: "s1", name: "펫마트 대전둔산점", category: "shop",
    address: "대전 서구 대덕대로 210", district: "서구", dong: "둔산동",
    lat: 36.3542, lng: 127.3832, rating: 4.5, reviewCount: 178,
    phone: "042-111-2222", openHours: "10:00-22:00",
    is24h: false, soloRecommended: true, parkingAvailable: true, emergencyAvailable: false,
    description: "대전 최대 규모 애견용품 매장, 1인 가구 소포장 사료 다수",
    services: ["사료", "간식", "의류", "장난감", "위생용품", "건강보조제"],
  },
  {
    id: "s2", name: "댕댕이마켓 유성점", category: "shop",
    address: "대전 유성구 봉명동 548-3", district: "유성구", dong: "봉명동",
    lat: 36.3570, lng: 127.3420, rating: 4.3, reviewCount: 95,
    phone: "042-222-3333", openHours: "11:00-21:00", closedDay: "화요일",
    is24h: false, soloRecommended: true, parkingAvailable: false, emergencyAvailable: false,
    description: "수제 간식 전문, 소량 구매 가능",
    services: ["수제간식", "사료", "장난감", "목줄/하네스"],
  },
  // 애견카페
  {
    id: "c1", name: "멍멍살롱 둔산", category: "cafe",
    address: "대전 서구 둔산중로 50", district: "서구", dong: "둔산동",
    lat: 36.3530, lng: 127.3810, rating: 4.7, reviewCount: 256,
    phone: "042-333-4444", openHours: "11:00-22:00",
    is24h: false, soloRecommended: true, parkingAvailable: true, emergencyAvailable: false,
    description: "1인석 완비, 혼자 와도 편안한 분위기. 반려견 동반 필수",
    services: ["음료", "디저트", "반려견 간식", "포토존", "놀이공간"],
  },
  {
    id: "c2", name: "왈왈카페 유성", category: "cafe",
    address: "대전 유성구 궁동로 28", district: "유성구", dong: "궁동",
    lat: 36.3615, lng: 127.3480, rating: 4.5, reviewCount: 134,
    phone: "042-444-5555", openHours: "12:00-21:00", closedDay: "월요일",
    is24h: false, soloRecommended: true, parkingAvailable: false, emergencyAvailable: false,
    description: "소형견 전용 공간, 1인 가구 모임 정기 개최",
    services: ["음료", "베이커리", "소형견 놀이터", "반려견 생일파티"],
  },
  // 애견미용실
  {
    id: "g1", name: "퍼피스타일 둔산", category: "grooming",
    address: "대전 서구 둔산로 88", district: "서구", dong: "둔산동",
    lat: 36.3520, lng: 127.3795, rating: 4.9, reviewCount: 312,
    phone: "042-555-6666", openHours: "10:00-19:00", closedDay: "월요일",
    is24h: false, soloRecommended: true, parkingAvailable: true, emergencyAvailable: false,
    description: "예약제 운영, CCTV 실시간 확인 가능. 1인 가구 보호자 안심 서비스",
    services: ["기본미용", "스포팅", "스파", "발톱관리", "귀청소", "치석제거"],
  },
  {
    id: "g2", name: "도그뷰티 유성", category: "grooming",
    address: "대전 유성구 봉명동 560", district: "유성구", dong: "봉명동",
    lat: 36.3565, lng: 127.3435, rating: 4.6, reviewCount: 187,
    phone: "042-666-7777", openHours: "09:30-18:30", closedDay: "일요일",
    is24h: false, soloRecommended: false, parkingAvailable: true, emergencyAvailable: false,
    description: "대형견 미용 전문, 스트레스 최소화 미용",
    services: ["기본미용", "전체미용", "부분미용", "스파", "염색"],
  },
  {
    id: "g3", name: "쁘띠살롱 중구", category: "grooming",
    address: "대전 중구 중앙로 120", district: "중구", dong: "은행동",
    lat: 36.3280, lng: 127.4265, rating: 4.4, reviewCount: 76,
    phone: "042-777-8888", openHours: "10:00-18:00", closedDay: "일요일, 월요일",
    is24h: false, soloRecommended: true, parkingAvailable: false, emergencyAvailable: false,
    description: "소형견 전문, 합리적 가격",
    services: ["기본미용", "위생미용", "발톱관리", "귀청소"],
  },
];

// 예약 슬롯 생성 헬퍼
export function generateTimeSlots(startHour: number, endHour: number, intervalMin: number = 30): TimeSlot[] {
  const slots: TimeSlot[] = [];
  for (let h = startHour; h < endHour; h++) {
    for (let m = 0; m < 60; m += intervalMin) {
      const time = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
      slots.push({
        id: `slot_${time}`,
        time,
        isAvailable: Math.random() > 0.3, // 데모: 70% 예약 가능
      });
    }
  }
  return slots;
}

// ============================================================
// 더미 데이터: 응급처치 가이드
// ============================================================

export const EMERGENCY_GUIDES: EmergencyGuide[] = [
  {
    id: "em1", type: "choking", title: "기도 폐쇄 (하임리히법)",
    subtitle: "이물질이 목에 걸렸을 때", description: "이물질이 목에 걸렸을 때", icon: "🫁",
    severity: "critical",
    steps: [
      { stepNumber: 1, title: "상태 확인", description: "반려견이 기침을 하는지, 호흡이 가능한지 확인합니다.", instruction: "반려견이 기침을 하는지, 호흡이 가능한지 확인합니다.", illustration: "👀", icon: "👀" },
      { stepNumber: 2, title: "입 안 확인", description: "입을 벌려 이물질이 보이면 손가락으로 조심스럽게 제거합니다.", instruction: "입을 벌려 이물질이 보이면 손가락으로 조심스럽게 제거합니다.", illustration: "👋", icon: "👋", warning: "보이지 않는 이물질을 억지로 꺼내지 마세요" },
      { stepNumber: 3, title: "소형견: 들어올리기", description: "뒷다리를 잡고 머리가 아래로 향하게 들어올립니다. 등을 가볍게 5회 두드립니다.", instruction: "뒷다리를 잡고 머리가 아래로 향하게 들어올립니다. 등을 가볍게 5회 두드립니다.", illustration: "🐕", icon: "🐕", duration: "10초간" },
      { stepNumber: 4, title: "대형견: 하임리히법", description: "뒤에서 갈비뼈 아래 복부를 양손으로 감싸고, 위쪽으로 강하게 5회 압박합니다.", instruction: "뒤에서 갈비뼈 아래 복부를 양손으로 감싸고, 위쪽으로 강하게 5회 압박합니다.", illustration: "💪", icon: "💪", duration: "5회 반복" },
      { stepNumber: 5, title: "반복 확인", description: "이물질이 나올 때까지 2-4단계를 반복합니다. 의식이 없으면 즉시 CPR을 시작합니다.", instruction: "이물질이 나올 때까지 2-4단계를 반복합니다. 의식이 없으면 즉시 CPR을 시작합니다.", illustration: "🔄", icon: "🔄" },
    ],
    doList: ["침착하게 상황 판단", "입 안 이물질 확인", "소형견은 거꾸로 들어올리기", "대형견은 복부 압박"],
    dontList: ["손가락을 깊이 넣지 않기", "의식 없는 상태에서 물 먹이지 않기", "당황해서 흔들지 않기"],
    callVet: true,
  },
  {
    id: "em2", type: "cpr", title: "심폐소생술 (CPR)",
    subtitle: "심장이 멈추거나 호흡이 없을 때", description: "심장이 멈추거나 호흡이 없을 때", icon: "❤️",
    severity: "critical",
    steps: [
      { stepNumber: 1, title: "의식 확인", description: "이름을 부르고 가볍게 두드려 반응을 확인합니다.", instruction: "이름을 부르고 가볍게 두드려 반응을 확인합니다.", illustration: "🗣️", icon: "🗣️" },
      { stepNumber: 2, title: "기도 확보", description: "목을 곧게 펴고 혀를 앞으로 당겨 기도를 확보합니다.", instruction: "목을 곧게 펴고 혀를 앞으로 당겨 기도를 확보합니다.", illustration: "🫁", icon: "🫁" },
      { stepNumber: 3, title: "호흡 확인", description: "코 앞에 손을 대고 10초간 호흡을 확인합니다.", instruction: "코 앞에 손을 대고 10초간 호흡을 확인합니다.", illustration: "👃", icon: "👃", duration: "10초" },
      { stepNumber: 4, title: "흉부 압박", description: "오른쪽으로 눕히고 심장 위치(왼쪽 앞다리 뒤)를 분당 100-120회 압박합니다.", instruction: "오른쪽으로 눕히고 심장 위치(왼쪽 앞다리 뒤)를 분당 100-120회 압박합니다.", illustration: "🫀", icon: "🫀", duration: "30회" },
      { stepNumber: 5, title: "인공호흡", description: "입을 다물고 코에 2회 불어넣습니다. 가슴이 부풀어 오르는지 확인합니다.", instruction: "입을 다물고 코에 2회 불어넣습니다. 가슴이 부풀어 오르는지 확인합니다.", illustration: "💨", icon: "💨", duration: "2회" },
      { stepNumber: 6, title: "반복", description: "압박 30회 + 인공호흡 2회를 반복합니다. 2분마다 반응을 확인합니다.", instruction: "압박 30회 + 인공호흡 2회를 반복합니다. 2분마다 반응을 확인합니다.", illustration: "🔄", icon: "🔄" },
    ],
    doList: ["즉시 동물병원에 전화", "단단한 바닥에 눕히기", "분당 100-120회 압박", "2분마다 반응 확인"],
    dontList: ["너무 세게 압박하지 않기 (갈비뼈 골절 위험)", "중단하지 않기 (병원 도착까지)", "입으로 불어넣을 때 코를 막지 않기"],
    callVet: true,
  },
  {
    id: "em3", type: "burn", title: "화상 응급처치",
    subtitle: "뜨거운 물이나 열에 의한 화상", description: "뜨거운 물이나 열에 의한 화상", icon: "🔥",
    severity: "high",
    steps: [
      { stepNumber: 1, title: "열원 제거", description: "즉시 열원에서 반려견을 분리합니다.", instruction: "즉시 열원에서 반려견을 분리합니다.", illustration: "🚫", icon: "🚫" },
      { stepNumber: 2, title: "냉각", description: "화상 부위에 미지근한 물(15-20°C)을 10-20분간 흘려줍니다.", instruction: "화상 부위에 미지근한 물(15-20°C)을 10-20분간 흘려줍니다.", illustration: "💧", icon: "💧", duration: "10-20분", warning: "얼음이나 차가운 물은 사용하지 마세요" },
      { stepNumber: 3, title: "보호", description: "깨끗한 거즈나 천으로 화상 부위를 가볍게 덮어줍니다.", instruction: "깨끗한 거즈나 천으로 화상 부위를 가볍게 덮어줍니다.", illustration: "🩹", icon: "🩹" },
      { stepNumber: 4, title: "병원 이동", description: "화상 범위가 넓거나 물집이 생기면 즉시 동물병원으로 이동합니다.", instruction: "화상 범위가 넓거나 물집이 생기면 즉시 동물병원으로 이동합니다.", illustration: "🏥", icon: "🏥" },
    ],
    doList: ["미지근한 물로 냉각", "깨끗한 천으로 보호", "빠른 병원 이동"],
    dontList: ["얼음 직접 대지 않기", "연고 바르지 않기 (수의사 처방 전)", "물집 터뜨리지 않기", "털을 뽑지 않기"],
    callVet: true,
  },
  {
    id: "em4", type: "poison", title: "독성물질 섭취",
    subtitle: "초콜릿, 포도, 자일리톨 등 섭취 시", description: "초콜릿, 포도, 자일리톨 등 섭취 시", icon: "☠️",
    severity: "critical",
    steps: [
      { stepNumber: 1, title: "섭취 물질 확인", description: "무엇을 얼마나 먹었는지 확인합니다. 포장지나 남은 것을 보관합니다.", instruction: "무엇을 얼마나 먹었는지 확인합니다. 포장지나 남은 것을 보관합니다.", illustration: "🔍", icon: "🔍" },
      { stepNumber: 2, title: "즉시 병원 전화", description: "동물병원에 전화하여 섭취 물질과 양을 알려줍니다.", instruction: "동물병원에 전화하여 섭취 물질과 양을 알려줍니다.", illustration: "📞", icon: "📞" },
      { stepNumber: 3, title: "구토 유도 금지", description: "수의사 지시 없이 절대 구토를 유도하지 마세요. 부식성 물질은 역류 시 더 위험합니다.", instruction: "수의사 지시 없이 절대 구토를 유도하지 마세요. 부식성 물질은 역류 시 더 위험합니다.", illustration: "⚠️", icon: "⚠️", warning: "절대 임의로 구토 유도하지 마세요!" },
      { stepNumber: 4, title: "병원 이동", description: "섭취 물질 포장지와 함께 즉시 동물병원으로 이동합니다.", instruction: "섭취 물질 포장지와 함께 즉시 동물병원으로 이동합니다.", illustration: "🏥", icon: "🏥" },
    ],
    doList: ["섭취 물질/양 기록", "포장지 보관", "즉시 병원 전화", "빠른 병원 이동"],
    dontList: ["임의로 구토 유도하지 않기", "우유나 물 먹이지 않기 (수의사 지시 전)", "시간 지체하지 않기"],
    callVet: true,
  },
  {
    id: "em5", type: "bleeding", title: "외상 출혈",
    subtitle: "상처로 인한 출혈 시", description: "상처로 인한 출혈 시", icon: "🩸",
    severity: "high",
    steps: [
      { stepNumber: 1, title: "지혈", description: "깨끗한 천이나 거즈로 상처 부위를 5-10분간 강하게 누릅니다.", instruction: "깨끗한 천이나 거즈로 상처 부위를 5-10분간 강하게 누릅니다.", illustration: "🩹", icon: "🩹", duration: "5-10분" },
      { stepNumber: 2, title: "상처 확인", description: "출혈이 멈추면 상처 깊이와 크기를 확인합니다.", instruction: "출혈이 멈추면 상처 깊이와 크기를 확인합니다.", illustration: "👀", icon: "👀" },
      { stepNumber: 3, title: "세척", description: "깨끗한 물이나 식염수로 상처를 부드럽게 세척합니다.", instruction: "깨끗한 물이나 식염수로 상처를 부드럽게 세척합니다.", illustration: "💧", icon: "💧" },
      { stepNumber: 4, title: "보호", description: "깨끗한 거즈로 감싸고, 반려견이 핥지 못하도록 합니다.", instruction: "깨끗한 거즈로 감싸고, 반려견이 핥지 못하도록 합니다.", illustration: "🩹", icon: "🩹" },
    ],
    doList: ["깨끗한 천으로 압박 지혈", "상처 세척", "거즈로 보호"],
    dontList: ["지혈대를 너무 세게 묶지 않기", "상처에 소독약 직접 바르지 않기", "반려견이 상처를 핥게 두지 않기"],
    callVet: true,
  },
  {
    id: "em6", type: "heatstroke", title: "열사병 응급처치",
    subtitle: "과도한 헐떡임, 침 흘림, 비틀거림", description: "과도한 헐떡임, 침 흘림, 비틀거림", icon: "🌡️",
    severity: "critical",
    steps: [
      { stepNumber: 1, title: "서늘한 곳 이동", description: "즉시 그늘지고 서늘한 곳으로 이동합니다.", instruction: "즉시 그늘지고 서늘한 곳으로 이동합니다.", illustration: "🏠", icon: "🏠" },
      { stepNumber: 2, title: "체온 낮추기", description: "미지근한 물을 몸에 적셔줍니다. 특히 목, 겨드랑이, 사타구니 부위.", instruction: "미지근한 물을 몸에 적셔줍니다. 특히 목, 겨드랑이, 사타구니 부위.", illustration: "💧", icon: "💧", warning: "차가운 물이나 얼음은 사용하지 마세요" },
      { stepNumber: 3, title: "수분 공급", description: "소량의 시원한 물을 마시게 합니다. 억지로 먹이지 마세요.", instruction: "소량의 시원한 물을 마시게 합니다. 억지로 먹이지 마세요.", illustration: "🥤", icon: "🥤" },
      { stepNumber: 4, title: "병원 이동", description: "체온이 39.5°C 이상이면 즉시 동물병원으로 이동합니다.", instruction: "체온이 39.5°C 이상이면 즉시 동물병원으로 이동합니다.", illustration: "🏥", icon: "🏥" },
    ],
    doList: ["서늘한 곳으로 이동", "미지근한 물로 체온 낮추기", "소량 수분 공급", "병원 이동"],
    dontList: ["차가운 물/얼음 사용 금지", "밀폐된 차 안에 두지 않기", "격렬한 운동 금지"],
    callVet: true,
  },
  {
    id: "em7", type: "seizure", title: "경련/발작",
    subtitle: "갑작스러운 경련, 의식 상실", description: "갑작스러운 경련, 의식 상실", icon: "⚡",
    severity: "critical",
    steps: [
      { stepNumber: 1, title: "안전 확보", description: "주변 위험한 물건을 치우고 안전한 공간을 확보합니다.", instruction: "주변 위험한 물건을 치우고 안전한 공간을 확보합니다.", illustration: "🛡️", icon: "🛡️" },
      { stepNumber: 2, title: "관찰 기록", description: "발작 시작 시간과 지속 시간을 기록합니다. 가능하면 영상 촬영합니다.", instruction: "발작 시작 시간과 지속 시간을 기록합니다. 가능하면 영상 촬영합니다.", illustration: "⏱️", icon: "⏱️" },
      { stepNumber: 3, title: "만지지 않기", description: "발작 중에는 입에 손을 넣거나 억지로 잡지 마세요.", instruction: "발작 중에는 입에 손을 넣거나 억지로 잡지 마세요.", illustration: "🚫", icon: "🚫", warning: "발작 중 입에 절대 손을 넣지 마세요" },
      { stepNumber: 4, title: "발작 후 안정", description: "발작이 끝나면 조용하고 어두운 곳에서 안정시킵니다.", instruction: "발작이 끝나면 조용하고 어두운 곳에서 안정시킵니다.", illustration: "🤫", icon: "🤫" },
      { stepNumber: 5, title: "병원 연락", description: "발작이 5분 이상 지속되거나 반복되면 즉시 병원으로 이동합니다.", instruction: "발작이 5분 이상 지속되거나 반복되면 즉시 병원으로 이동합니다.", illustration: "📞", icon: "📞" },
    ],
    doList: ["주변 안전 확보", "시간 기록/영상 촬영", "발작 후 안정", "병원 연락"],
    dontList: ["발작 중 입에 손 넣지 않기", "억지로 잡지 않기", "물 먹이지 않기"],
    callVet: true,
  },
  {
    id: "em8", type: "fracture", title: "골절 의심",
    subtitle: "다리를 절거나 움직이지 못할 때", description: "다리를 절거나 움직이지 못할 때", icon: "🦴",
    severity: "high",
    steps: [
      { stepNumber: 1, title: "움직임 최소화", description: "반려견을 가능한 움직이지 않게 합니다.", instruction: "반려견을 가능한 움직이지 않게 합니다.", illustration: "🛑", icon: "🛑" },
      { stepNumber: 2, title: "부목 대기", description: "골절 부위를 고정할 수 있으면 수건이나 판자로 부목을 댑니다.", instruction: "골절 부위를 고정할 수 있으면 수건이나 판자로 부목을 댑니다.", illustration: "📏", icon: "📏", warning: "무리하게 뼈를 맞추려 하지 마세요" },
      { stepNumber: 3, title: "이동 준비", description: "담요나 큰 수건 위에 조심스럽게 올려 이동합니다.", instruction: "담요나 큰 수건 위에 조심스럽게 올려 이동합니다.", illustration: "🧣", icon: "🧣" },
      { stepNumber: 4, title: "병원 이동", description: "최대한 흔들리지 않게 병원으로 이동합니다.", instruction: "최대한 흔들리지 않게 병원으로 이동합니다.", illustration: "🏥", icon: "🏥" },
    ],
    doList: ["움직임 최소화", "부드러운 천으로 고정", "조심스럽게 이동"],
    dontList: ["뼈를 맞추려 하지 않기", "골절 부위 만지지 않기", "걷게 하지 않기"],
    callVet: true,
  },
];

// 24시 응급 동물병원 (대전)
export const EMERGENCY_HOSPITALS: EmergencyHospital[] = [
  { id: "eh1", name: "대전24시 동물의료센터", address: "대전 서구 둔산로 100", phone: "042-123-4567", lat: 36.3515, lng: 127.3786, is24h: true, isEmergency: true, district: "서구" },
  { id: "eh2", name: "대전 야간응급 동물병원", address: "대전 유성구 대학로 99", phone: "042-888-9999", lat: 36.3640, lng: 127.3520, is24h: true, isEmergency: true, district: "유성구" },
  { id: "eh3", name: "충남대 동물병원 응급실", address: "대전 유성구 대학로 99", phone: "042-821-6789", lat: 36.3690, lng: 127.3450, is24h: true, isEmergency: true, district: "유성구" },
];

export const EMERGENCY_HOSPITALS_24H = EMERGENCY_HOSPITALS;

// ============================================================
// 더미 데이터: 대전 복지 정책
// ============================================================

export const WELFARE_POLICIES: WelfarePolicy[] = [
  {
    id: "wp1", title: "대전시 사회적 약자 반려동물 의료비 지원사업",
    category: "medical",
    organization: "대전광역시",
    supportDetail: "기초생활수급자, 차상위계층, 1인 가구 등 사회적 약자의 반려동물 의료비를 지원합니다.",
    supportAmount: "300,000원",
    description: "기초생활수급자, 차상위계층, 1인 가구 등 사회적 약자의 반려동물 의료비를 지원합니다.",
    eligibility: ["대전시 거주 1인 가구", "기초생활수급자 또는 차상위계층", "반려동물 등록 완료"],
    eligibilityConditions: [{ type: "household" as const, value: "single", description: "대전시 거주" }],
    benefits: ["연간 최대 30만원 의료비 지원", "예방접종비 50% 할인", "중성화 수술비 전액 지원"],
    applicationMethod: "구청 방문 또는 온라인 신청",
    applicationPeriod: "2026.01.01 ~ 2026.12.31",
    applicationUrl: "https://www.daejeon.go.kr/pet/medical",
    contactInfo: "042-270-4282",
    contactPhone: "042-270-4282",
    requiredDocs: ["주민등록등본", "소득증명서", "반려동물 등록증", "진료비 영수증"],
    requiredDocuments: ["주민등록등본", "소득증명서", "반려동물 등록증", "진료비 영수증"],
    maxAmount: "300,000원",
    isActive: true, updatedAt: "2026-03-01",
  },
  {
    id: "wp2", title: "반려동물 등록 무료 지원",
    category: "registration",
    organization: "대전광역시",
    supportDetail: "대전시 거주자의 반려동물 내장형 마이크로칩 등록비를 전액 지원합니다.",
    supportAmount: "30,000원",
    description: "대전시 거주자의 반려동물 내장형 마이크로칩 등록비를 전액 지원합니다.",
    eligibility: ["대전시 거주자", "미등록 반려동물 보유"],
    eligibilityConditions: [{ type: "household" as const, value: "single", description: "대전시 거주" }],
    benefits: ["마이크로칩 시술비 전액 지원 (약 3만원)", "등록 대행 서비스"],
    applicationMethod: "구청 방문 또는 온라인 신청",
    applicationPeriod: "2026.01.01 ~ 2026.12.31 (예산 소진 시 조기 마감)",
    applicationUrl: "https://www.daejeon.go.kr/pet/register",
    contactInfo: "042-270-4283",
    contactPhone: "042-270-4283",
    requiredDocs: ["신분증", "반려동물 사진"],
    requiredDocuments: ["신분증", "반려동물 사진"],
    maxAmount: "30,000원",
    isActive: true, updatedAt: "2026-02-15",
  },
  {
    id: "wp3", title: "1인 가구 반려동물 돌봄 바우처",
    category: "subsidy",
    organization: "대전광역시",
    supportDetail: "1인 가구의 반려동물 돌봄 서비스 이용 시 바우처를 지원합니다.",
    supportAmount: "월 50,000원 (연 600,000원)",
    description: "1인 가구의 반려동물 돌봄 서비스 이용 시 바우처를 지원합니다.",
    eligibility: ["대전시 거주 1인 가구", "만 19세 이상", "반려동물 등록 완료", "중위소득 100% 이하"],
    eligibilityConditions: [{ type: "household" as const, value: "single", description: "대전시 거주" }],
    benefits: ["월 5만원 돌봄 바우처 지급", "산책 대행, 펫시팅 등 돌봄 서비스 이용 가능"],
    applicationMethod: "구청 방문 또는 온라인 신청",
    applicationPeriod: "2026.04.01 ~ 2026.06.30 (상반기 모집)",
    applicationUrl: "https://www.daejeon.go.kr/pet/voucher",
    contactInfo: "042-270-4284",
    contactPhone: "042-270-4284",
    requiredDocs: ["주민등록등본", "소득증명서", "반려동물 등록증", "1인 가구 확인서"],
    requiredDocuments: ["주민등록등본", "소득증명서", "반려동물 등록증", "1인 가구 확인서"],
    maxAmount: "월 50,000원 (연 600,000원)",
    isActive: true, updatedAt: "2026-03-15",
  },
  {
    id: "wp4", title: "유기동물 입양 지원금",
    category: "adoption",
    organization: "대전광역시",
    supportDetail: "대전시 유기동물보호소에서 입양 시 초기 양육비를 지원합니다.",
    supportAmount: "200,000원 + 의료비",
    description: "대전시 유기동물보호소에서 입양 시 초기 양육비를 지원합니다.",
    eligibility: ["대전시 거주자", "대전시 유기동물보호소 입양"],
    eligibilityConditions: [{ type: "household" as const, value: "single", description: "대전시 거주" }],
    benefits: ["입양 지원금 20만원", "첫 해 예방접종비 전액 지원", "중성화 수술비 지원"],
    applicationMethod: "구청 방문 또는 온라인 신청",
    applicationPeriod: "상시",
    applicationUrl: "https://www.daejeon.go.kr/pet/adoption",
    contactInfo: "042-270-4285",
    contactPhone: "042-270-4285",
    requiredDocs: ["신분증", "입양확인서", "반려동물 등록증"],
    requiredDocuments: ["신분증", "입양확인서", "반려동물 등록증"],
    maxAmount: "200,000원 + 의료비",
    isActive: true, updatedAt: "2026-01-10",
  },
  {
    id: "wp5", title: "반려동물 행동교정 교육 지원",
    category: "education",
    organization: "대전광역시",
    supportDetail: "반려동물 행동 문제로 어려움을 겪는 보호자를 위한 전문 교육 프로그램입니다.",
    supportAmount: "교육비 50% 할인 (최대 10만원)",
    description: "반려동물 행동 문제로 어려움을 겪는 보호자를 위한 전문 교육 프로그램입니다.",
    eligibility: ["대전시 거주자", "반려동물 등록 완료"],
    eligibilityConditions: [{ type: "household" as const, value: "single", description: "대전시 거주" }],
    benefits: ["전문 훈련사 1:1 상담 2회 무료", "그룹 교육 프로그램 50% 할인", "온라인 교육 콘텐츠 무료 제공"],
    applicationMethod: "구청 방문 또는 온라인 신청",
    applicationPeriod: "2026.03.01 ~ 2026.11.30",
    applicationUrl: "https://www.daejeon.go.kr/pet/education",
    contactInfo: "042-270-4286",
    contactPhone: "042-270-4286",
    requiredDocs: ["신분증", "반려동물 등록증"],
    requiredDocuments: ["신분증", "반려동물 등록증"],
    maxAmount: "교육비 50% 할인 (최대 10만원)",
    isActive: true, updatedAt: "2026-02-28",
  },
  {
    id: "wp6", title: "서구 1인 가구 반려동물 긴급돌봄 서비스",
    category: "subsidy",
    organization: "대전 서구청",
    supportDetail: "서구 거주 1인 가구가 입원 등 긴급 상황 시 반려동물 임시 돌봄을 지원합니다.",
    supportAmount: "미정",
    description: "서구 거주 1인 가구가 입원 등 긴급 상황 시 반려동물 임시 돌봄을 지원합니다.",
    eligibility: ["대전 서구 거주 1인 가구", "긴급 상황 (입원, 출장 등) 발생"],
    eligibilityConditions: [{ type: "household" as const, value: "single", description: "대전시 거주" }],
    benefits: ["최대 7일 임시 돌봄 무료", "돌봄 시설 연계", "반려동물 수송 서비스"],
    applicationMethod: "구청 방문 또는 온라인 신청",
    applicationPeriod: "상시",
    contactInfo: "042-288-3456",
    contactPhone: "042-288-3456",
    district: "서구",
    requiredDocs: ["신분증", "1인 가구 확인서", "긴급 상황 증빙 (입원확인서 등)"],
    requiredDocuments: ["신분증", "1인 가구 확인서", "긴급 상황 증빙 (입원확인서 등)"],
    isActive: true, updatedAt: "2026-03-20",
  },
  {
    id: "wp7", title: "유성구 반려동물 문화교실",
    category: "education",
    organization: "대전 유성구청",
    supportDetail: "유성구민 대상 반려동물 양육 교육 및 문화 프로그램입니다.",
    supportAmount: "미정",
    description: "유성구민 대상 반려동물 양육 교육 및 문화 프로그램입니다.",
    eligibility: ["대전 유성구 거주자"],
    eligibilityConditions: [{ type: "household" as const, value: "single", description: "대전시 거주" }],
    benefits: ["월 2회 무료 교육 (기본 훈련, 건강관리)", "반려견 사회화 프로그램", "보호자 커뮤니티 연결"],
    applicationMethod: "구청 방문 또는 온라인 신청",
    applicationPeriod: "2026.04.01 ~ 2026.12.31",
    contactInfo: "042-611-2345",
    contactPhone: "042-611-2345",
    district: "유성구",
    requiredDocs: ["신분증"],
    requiredDocuments: ["신분증"],
    isActive: true, updatedAt: "2026-03-25",
  },
];

// 자격 진단 질문
export const ELIGIBILITY_QUESTIONS: EligibilityQuestion[] = [
  { id: "q1", question: "거주 지역을 선택해주세요", type: "select", options: ["서구", "유성구", "중구", "동구", "대덕구"], key: "district" },
  { id: "q2", question: "가구 형태를 선택해주세요", type: "select", options: ["1인 가구", "2인 가구", "3인 이상"], key: "householdType" },
  { id: "q3", question: "소득 수준을 선택해주세요", type: "select", options: ["기초생활수급자", "차상위계층", "중위소득 100% 이하", "중위소득 100% 초과"], key: "incomeLevel" },
  { id: "q4", question: "반려동물 등록을 완료하셨나요?", type: "boolean", key: "petRegistered" },
  { id: "q5", question: "유기동물 입양 경험이 있으신가요?", type: "boolean", key: "adoptedPet" },
];

// 자격 진단 로직
export function checkEligibility(answers: Record<string, string | boolean>): EligibilityResult[] {
  const results: EligibilityResult[] = [];

  for (const policy of WELFARE_POLICIES) {
    if (!policy.isActive) continue;

    let score = 0;
    let maxScore = 0;
    const reasons: string[] = [];

    // 거주 지역 체크
    if (policy.district) {
      maxScore += 30;
      if (answers.district === policy.district) {
        score += 30;
      } else {
        reasons.push(`${policy.district} 거주자만 신청 가능`);
      }
    } else {
      maxScore += 30;
      score += 30; // 대전 전체 대상
    }

    // 1인 가구 체크
    if (policy.eligibility.some(e => e.includes("1인 가구"))) {
      maxScore += 30;
      if (answers.householdType === "1인 가구") {
        score += 30;
      } else {
        reasons.push("1인 가구 대상 사업입니다");
      }
    } else {
      maxScore += 30;
      score += 30;
    }

    // 소득 체크
    if (policy.eligibility.some(e => e.includes("기초생활수급자") || e.includes("차상위") || e.includes("소득"))) {
      maxScore += 20;
      if (answers.incomeLevel === "기초생활수급자" || answers.incomeLevel === "차상위계층" || answers.incomeLevel === "중위소득 100% 이하") {
        score += 20;
      } else {
        reasons.push("소득 기준 미충족");
      }
    } else {
      maxScore += 20;
      score += 20;
    }

    // 반려동물 등록 체크
    if (policy.eligibility.some(e => e.includes("반려동물 등록"))) {
      maxScore += 20;
      if (answers.petRegistered === true || answers.petRegistered === "true") {
        score += 20;
      } else {
        reasons.push("반려동물 등록이 필요합니다");
      }
    } else {
      maxScore += 20;
      score += 20;
    }

    const matchScore = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;

    results.push({
      policyId: policy.id,
      policyTitle: policy.title,
      isEligible: matchScore >= 80,
      reason: reasons.length > 0 ? reasons.join(", ") : "모든 조건 충족",
      matchScore,
    });
  }

  return results.sort((a, b) => b.matchScore - a.matchScore);
}

// 카테고리 라벨
export const CATEGORY_LABELS: Record<FacilityCategory, string> = {
  hospital: "동물병원",
  shop: "애견용품점",
  cafe: "애견카페",
  grooming: "애견미용실",
};

export const CATEGORY_ICONS: Record<FacilityCategory, string> = {
  hospital: "🏥",
  shop: "🛍️",
  cafe: "☕",
  grooming: "✂️",
};

export const POLICY_CATEGORY_LABELS: Record<PolicyCategory, string> = {
  medical: "의료비 지원",
  adoption: "입양 지원",
  registration: "등록 지원",
  education: "교육 지원",
  subsidy: "돌봄 바우처",
};

// 대전 구청 정보
export interface DistrictOffice {
  name: string;
  district: string;
  address: string;
  phone: string;
  petDeptPhone: string;
  website: string;
}

export const DISTRICT_OFFICES: DistrictOffice[] = [
  { name: "서구청", district: "서구", address: "대전 서구 둔산서로 100", phone: "042-288-2114", petDeptPhone: "042-288-3456", website: "https://www.seogu.go.kr" },
  { name: "유성구청", district: "유성구", address: "대전 유성구 대학로 211", phone: "042-611-2114", petDeptPhone: "042-611-2345", website: "https://www.yuseong.go.kr" },
  { name: "중구청", district: "중구", address: "대전 중구 중앙로 100", phone: "042-606-6114", petDeptPhone: "042-606-6345", website: "https://www.djjunggu.go.kr" },
  { name: "동구청", district: "동구", address: "대전 동구 동구청로 147", phone: "042-251-4114", petDeptPhone: "042-251-4345", website: "https://www.donggu.go.kr" },
  { name: "대덕구청", district: "대덕구", address: "대전 대덕구 대덕대로 1417", phone: "042-608-6114", petDeptPhone: "042-608-6345", website: "https://www.daedeok.go.kr" },
];
