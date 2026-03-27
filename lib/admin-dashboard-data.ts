/**
 * 관리자 전용 대시보드 데이터 모델 및 더미 통계
 * Phase 26: 대전 5개 구별 매칭 통계, 관제 지도, 워커 승인 시스템
 */

// ─── 대전 5개 구별 매칭 통계 ───
export interface DistrictStats {
  district: string;
  matchCount: number;
  percentage: number;
  color: string;
  activeWalkers: number;
  totalBookings: number;
}

export const DISTRICT_STATS: DistrictStats[] = [
  { district: "서구", matchCount: 47, percentage: 32.2, color: "#2E7D32", activeWalkers: 12, totalBookings: 89 },
  { district: "유성구", matchCount: 38, percentage: 26.0, color: "#4CAF82", activeWalkers: 9, totalBookings: 72 },
  { district: "중구", matchCount: 28, percentage: 19.2, color: "#3B82F6", activeWalkers: 7, totalBookings: 53 },
  { district: "동구", matchCount: 19, percentage: 13.0, color: "#A855F7", activeWalkers: 5, totalBookings: 36 },
  { district: "대덕구", matchCount: 14, percentage: 9.6, color: "#F59E0B", activeWalkers: 3, totalBookings: 27 },
];

// ─── 오늘 매출 통계 ───
export interface DailyRevenue {
  totalRevenue: number;       // 원
  totalBookings: number;
  completedWalks: number;
  averagePerWalk: number;
  comparedYesterday: number;  // 전일 대비 % 변화
}

export const TODAY_REVENUE: DailyRevenue = {
  totalRevenue: 1_847_500,
  totalBookings: 146,
  completedWalks: 89,
  averagePerWalk: 20_758,
  comparedYesterday: 12.3,
};

// ─── 관제 지도: 현재 산책 중인 워커 ───
export interface ActiveWalkerLocation {
  id: string;
  nickname: string;
  profileEmoji: string;
  latitude: number;
  longitude: number;
  district: string;
  neighborhood: string;
  walkStartedAt: string;       // ISO 시간
  petName: string;
  petBreed: string;
  ownerName: string;
  status: "walking" | "resting" | "returning";
  distanceCovered: number;     // km
  elapsedMinutes: number;
}

export const ACTIVE_WALKERS: ActiveWalkerLocation[] = [
  {
    id: "aw1",
    nickname: "자양동 하늘이맘",
    profileEmoji: "👩‍🦰",
    latitude: 36.3742,
    longitude: 127.3918,
    district: "유성구",
    neighborhood: "자양동",
    walkStartedAt: new Date(Date.now() - 25 * 60000).toISOString(),
    petName: "초코",
    petBreed: "말티즈",
    ownerName: "초코맘",
    status: "walking",
    distanceCovered: 1.2,
    elapsedMinutes: 25,
  },
  {
    id: "aw2",
    nickname: "둔산동 멍멍이삼촌",
    profileEmoji: "👨",
    latitude: 36.3548,
    longitude: 127.3782,
    district: "서구",
    neighborhood: "둔산동",
    walkStartedAt: new Date(Date.now() - 42 * 60000).toISOString(),
    petName: "뽀삐",
    petBreed: "포메라니안",
    ownerName: "뽀삐엄마",
    status: "walking",
    distanceCovered: 2.1,
    elapsedMinutes: 42,
  },
  {
    id: "aw3",
    nickname: "관평동 산책왕",
    profileEmoji: "🧑",
    latitude: 36.3895,
    longitude: 127.3945,
    district: "유성구",
    neighborhood: "관평동",
    walkStartedAt: new Date(Date.now() - 15 * 60000).toISOString(),
    petName: "루이",
    petBreed: "골든리트리버",
    ownerName: "루이아빠",
    status: "resting",
    distanceCovered: 0.8,
    elapsedMinutes: 15,
  },
  {
    id: "aw4",
    nickname: "대흥동 댕댕시터",
    profileEmoji: "👩",
    latitude: 36.3275,
    longitude: 127.4215,
    district: "중구",
    neighborhood: "대흥동",
    walkStartedAt: new Date(Date.now() - 55 * 60000).toISOString(),
    petName: "콩이",
    petBreed: "비숑프리제",
    ownerName: "콩이맘",
    status: "returning",
    distanceCovered: 2.8,
    elapsedMinutes: 55,
  },
  {
    id: "aw5",
    nickname: "판암동 강아지친구",
    profileEmoji: "🧔",
    latitude: 36.3185,
    longitude: 127.4485,
    district: "동구",
    neighborhood: "판암동",
    walkStartedAt: new Date(Date.now() - 33 * 60000).toISOString(),
    petName: "두부",
    petBreed: "시바이누",
    ownerName: "두부엄마",
    status: "walking",
    distanceCovered: 1.6,
    elapsedMinutes: 33,
  },
  {
    id: "aw6",
    nickname: "신탄진 산책메이트",
    profileEmoji: "👱‍♀️",
    latitude: 36.4325,
    longitude: 127.4135,
    district: "대덕구",
    neighborhood: "신탄진동",
    walkStartedAt: new Date(Date.now() - 18 * 60000).toISOString(),
    petName: "밤이",
    petBreed: "웰시코기",
    ownerName: "밤이아빠",
    status: "walking",
    distanceCovered: 0.9,
    elapsedMinutes: 18,
  },
];

// ─── 워커 승인 대기 목록 ───
export interface PendingWalker {
  id: string;
  nickname: string;
  profileEmoji: string;
  realName: string;
  age: number;
  district: string;
  neighborhood: string;
  appliedAt: string;          // ISO 날짜
  certPhotoUrl: string;       // 자격증 사진
  profilePhotoUrl: string;    // 프로필 사진
  certType: string;           // 자격증 종류
  experience: string;         // 경력
  bio: string;
  canHandleLargeDogs: boolean;
  status: "pending" | "approved" | "rejected";
}

export const PENDING_WALKERS: PendingWalker[] = [
  {
    id: "pw1",
    nickname: "노은동 댕댕맘",
    profileEmoji: "👩‍🦱",
    realName: "김서연",
    age: 28,
    district: "유성구",
    neighborhood: "노은동",
    appliedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    certPhotoUrl: "https://picsum.photos/seed/cert1/400/300",
    profilePhotoUrl: "https://picsum.photos/seed/profile1/200/200",
    certType: "반려동물관리사 2급",
    experience: "2년 (개인 산책 서비스)",
    bio: "노은동에서 3마리 반려견과 함께 살고 있어요. 대형견도 능숙하게 다룰 수 있습니다.",
    canHandleLargeDogs: true,
    status: "pending",
  },
  {
    id: "pw2",
    nickname: "괴정동 산책러",
    profileEmoji: "🧑‍🦰",
    realName: "이준호",
    age: 32,
    district: "서구",
    neighborhood: "괴정동",
    appliedAt: new Date(Date.now() - 1 * 86400000).toISOString(),
    certPhotoUrl: "https://picsum.photos/seed/cert2/400/300",
    profilePhotoUrl: "https://picsum.photos/seed/profile2/200/200",
    certType: "동물행동교정사",
    experience: "4년 (동물병원 근무)",
    bio: "동물병원에서 4년간 근무한 경험이 있습니다. 반려견 행동 교정 전문입니다.",
    canHandleLargeDogs: true,
    status: "pending",
  },
  {
    id: "pw3",
    nickname: "용전동 펫시터",
    profileEmoji: "👧",
    realName: "박지은",
    age: 24,
    district: "동구",
    neighborhood: "용전동",
    appliedAt: new Date(Date.now() - 5 * 3600000).toISOString(),
    certPhotoUrl: "https://picsum.photos/seed/cert3/400/300",
    profilePhotoUrl: "https://picsum.photos/seed/profile3/200/200",
    certType: "펫시터 자격증",
    experience: "1년 (앱 기반 펫시팅)",
    bio: "소형견 전문 펫시터입니다. 용전동과 판암동 지역에서 활동합니다.",
    canHandleLargeDogs: false,
    status: "pending",
  },
  {
    id: "pw4",
    nickname: "읍내동 훈련사",
    profileEmoji: "👨‍🦲",
    realName: "최민수",
    age: 35,
    district: "대덕구",
    neighborhood: "읍내동",
    appliedAt: new Date(Date.now() - 3 * 86400000).toISOString(),
    certPhotoUrl: "https://picsum.photos/seed/cert4/400/300",
    profilePhotoUrl: "https://picsum.photos/seed/profile4/200/200",
    certType: "반려견 훈련사 1급",
    experience: "6년 (전문 훈련소 운영)",
    bio: "대덕구에서 반려견 훈련소를 운영하고 있습니다. 모든 견종 대응 가능합니다.",
    canHandleLargeDogs: true,
    status: "pending",
  },
];

// ─── 대시보드 요약 통계 ───
export interface DashboardSummary {
  totalUsers: number;
  totalWalkers: number;
  totalOwners: number;
  pendingApprovals: number;
  activeWalksNow: number;
  todayNewUsers: number;
  monthlyGrowth: number; // %
}

export const DASHBOARD_SUMMARY: DashboardSummary = {
  totalUsers: 1_247,
  totalWalkers: 312,
  totalOwners: 935,
  pendingApprovals: PENDING_WALKERS.filter((w) => w.status === "pending").length,
  activeWalksNow: ACTIVE_WALKERS.length,
  todayNewUsers: 8,
  monthlyGrowth: 15.7,
};

// ─── 워커 상태 라벨/색상 매핑 ───
export const WALKER_STATUS_MAP: Record<ActiveWalkerLocation["status"], { label: string; color: string; bgColor: string }> = {
  walking: { label: "산책 중", color: "#4CAF82", bgColor: "#4CAF8220" },
  resting: { label: "휴식 중", color: "#F59E0B", bgColor: "#F59E0B20" },
  returning: { label: "복귀 중", color: "#3B82F6", bgColor: "#3B82F620" },
};

// ─── 승인 상태 라벨/색상 매핑 ───
export const APPROVAL_STATUS_MAP: Record<PendingWalker["status"], { label: string; color: string; bgColor: string }> = {
  pending: { label: "심사 대기", color: "#F59E0B", bgColor: "#F59E0B20" },
  approved: { label: "승인 완료", color: "#4CAF82", bgColor: "#4CAF8220" },
  rejected: { label: "거절", color: "#EF4444", bgColor: "#EF444420" },
};
