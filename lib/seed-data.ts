/**
 * 시연용 시드 데이터 (seedData)
 * - 자양동/가양동 기반 도그워커 5명
 * - 산책 예약 3건
 * - 보호자 대전 시민 인증 완료 상태
 *
 * 앱 초기화 시 자동으로 로드됩니다.
 */

import type { MockUser } from "./mock-data";
import type { WorkerDetail } from "./worker-details";
import type {
  UserProfile,
  Pet,
  Friend,
  ChatRoom,
  Booking,
  Notification,
  Payment,
} from "./app-context";

// ─── 날짜 유틸 ───
function todayStr(): string {
  return new Date().toISOString().split("T")[0];
}
function daysFromNow(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}
function isoNow(): string {
  return new Date().toISOString();
}

// ─── 1. 시드 도그워커 5명 (자양동/가양동 기반) ───
export const SEED_WALKERS: MockUser[] = [
  {
    id: "seed_w1",
    nickname: "자양동 하늘이맘",
    neighborhood: "자양동",
    district: "동구",
    role: "caretaker",
    bio: "대전 자양동에서 5년째 반려견 산책을 하고 있어요. 소형견부터 대형견까지 모두 가능합니다.",
    rating: 4.9,
    reviewCount: 127,
    services: ["산책", "데이케어"],
    isActive: true,
    distance: "0.3km",
    distanceKm: 0.3,
    profileEmoji: "👩‍🦰",
    pricePerHour: 18000,
    canHandleLargeDogs: true,
    hasTrainerCert: true,
    isVerified: true,
    completedWalks: 342,
    responseTime: "5분 이내",
    specialBadge: "대전 산책 전문가",
  },
  {
    id: "seed_w2",
    nickname: "가양동 뽀삐아빠",
    neighborhood: "가양동",
    district: "동구",
    role: "caretaker",
    bio: "반려견 행동교정사 자격증 보유. 가양동 일대 산책 전문입니다.",
    rating: 4.8,
    reviewCount: 89,
    services: ["산책", "행동교정"],
    isActive: true,
    distance: "0.5km",
    distanceKm: 0.5,
    profileEmoji: "👨‍🦱",
    pricePerHour: 20000,
    canHandleLargeDogs: true,
    hasTrainerCert: true,
    isVerified: true,
    completedWalks: 256,
    responseTime: "10분 이내",
    specialBadge: "대전 산책 전문가",
  },
  {
    id: "seed_w3",
    nickname: "자양동 댕댕시터",
    neighborhood: "자양동",
    district: "동구",
    role: "caretaker",
    bio: "소형견 전문 돌보미입니다. 자양동 대청호 산책로를 주로 이용해요.",
    rating: 4.7,
    reviewCount: 64,
    services: ["산책", "데이케어", "방문돌봄"],
    isActive: true,
    distance: "0.8km",
    distanceKm: 0.8,
    profileEmoji: "👧",
    pricePerHour: 15000,
    canHandleLargeDogs: false,
    hasTrainerCert: false,
    isVerified: true,
    completedWalks: 178,
    responseTime: "15분 이내",
    specialBadge: "대전 산책 전문가",
  },
  {
    id: "seed_w4",
    nickname: "가양동 산책왕",
    neighborhood: "가양동",
    district: "동구",
    role: "caretaker",
    bio: "매일 아침 6시에 가양동 둘레길을 산책합니다. 대형견도 OK!",
    rating: 4.6,
    reviewCount: 45,
    services: ["산책"],
    isActive: true,
    distance: "1.2km",
    distanceKm: 1.2,
    profileEmoji: "🧑‍🦲",
    pricePerHour: 16000,
    canHandleLargeDogs: true,
    hasTrainerCert: false,
    isVerified: true,
    completedWalks: 134,
    responseTime: "20분 이내",
    specialBadge: "대전 산책 전문가",
  },
  {
    id: "seed_w5",
    nickname: "자양동 멍멍이친구",
    neighborhood: "자양동",
    district: "동구",
    role: "caretaker",
    bio: "반려견 응급처치 교육 이수. 안전한 산책을 약속드립니다.",
    rating: 4.5,
    reviewCount: 32,
    services: ["산책", "응급돌봄"],
    isActive: true,
    distance: "0.6km",
    distanceKm: 0.6,
    profileEmoji: "👨‍🎓",
    pricePerHour: 17000,
    canHandleLargeDogs: false,
    hasTrainerCert: true,
    isVerified: true,
    completedWalks: 98,
    responseTime: "10분 이내",
    specialBadge: "대전 산책 전문가",
  },
];

// ─── 2. 시드 워커 상세 정보 ───
export const SEED_WORKER_DETAILS: Record<string, WorkerDetail> = {
  seed_w1: {
    id: "seed_w1",
    nickname: "자양동 하늘이맘",
    profileEmoji: "👩‍🦰",
    bio: "대전 자양동에서 5년째 반려견 산책을 하고 있어요.",
    rating: 4.9,
    reviewCount: 127,
    pricePerHour: 18000,
    isVerified: true,
    specialBadge: "대전 산책 전문가",
    experiences: [
      { district: "동구", years: 5, completedWalks: 342, specialization: "전견종 산책" },
      { district: "중구", years: 2, completedWalks: 87, specialization: "대형견 전문" },
    ],
    certifications: [
      {
        id: "cert_sw1_1",
        name: "반려동물관리사 1급",
        issuer: "한국반려동물협회",
        issueDate: "2022-03-15",
        imageUri: "https://via.placeholder.com/400x300/FF9800/FFFFFF?text=반려동물관리사+1급",
        verified: true,
      },
      {
        id: "cert_sw1_2",
        name: "반려견 행동상담사",
        issuer: "대한반려견훈련사협회",
        issueDate: "2023-06-20",
        imageUri: "https://via.placeholder.com/400x300/4CAF50/FFFFFF?text=행동상담사+자격증",
        verified: true,
      },
    ],
    equipment: [
      { id: "eq1", name: "안전 리드줄 (3m/5m)", icon: "🦮", description: "충격흡수 기능 내장", available: true },
      { id: "eq2", name: "배변봉투 세트", icon: "🧹", description: "생분해성 친환경 봉투", available: true },
      { id: "eq3", name: "반려견 간식팩", icon: "🦴", description: "알러지 프리 수제 간식", available: true },
      { id: "eq4", name: "GPS 트래커", icon: "📡", description: "실시간 위치 추적 가능", available: true },
      { id: "eq5", name: "응급 처치 키트", icon: "🩹", description: "기본 응급처치 도구", available: true },
    ],
    services: ["산책", "데이케어"],
    canHandleLargeDogs: true,
    hasTrainerCert: true,
    responseTime: "5분 이내",
    introduction: "안녕하세요! 자양동에서 5년째 반려견 산책 전문가로 활동 중인 하늘이맘입니다. 대청호 오백리길과 자양동 둘레길을 주로 이용하며, 소형견부터 대형견까지 안전하게 산책시켜 드립니다.",
    specialNotes: "대형견 산책 시 이중 리드줄 사용, 산책 중 실시간 사진 전송",
    availableSlots: ["06:00-09:00", "10:00-12:00", "15:00-18:00"],
    neighborhoods: ["자양동", "가양동", "대별동"],
  },
  seed_w2: {
    id: "seed_w2",
    nickname: "가양동 뽀삐아빠",
    profileEmoji: "👨‍🦱",
    bio: "반려견 행동교정사 자격증 보유. 가양동 일대 산책 전문입니다.",
    rating: 4.8,
    reviewCount: 89,
    pricePerHour: 20000,
    isVerified: true,
    specialBadge: "대전 산책 전문가",
    experiences: [
      { district: "동구", years: 4, completedWalks: 256, specialization: "행동교정 산책" },
    ],
    certifications: [
      {
        id: "cert_sw2_1",
        name: "반려견 행동교정사",
        issuer: "한국애견연맹",
        issueDate: "2021-11-10",
        imageUri: "https://via.placeholder.com/400x300/2196F3/FFFFFF?text=행동교정사+자격증",
        verified: true,
      },
      {
        id: "cert_sw2_2",
        name: "펫시터 전문가 과정",
        issuer: "대전시 반려동물교육센터",
        issueDate: "2023-01-05",
        imageUri: "https://via.placeholder.com/400x300/9C27B0/FFFFFF?text=펫시터+전문가",
        verified: true,
      },
    ],
    equipment: [
      { id: "eq1", name: "행동교정용 하네스", icon: "🎽", description: "당김 방지 특수 하네스", available: true },
      { id: "eq2", name: "안전 리드줄 (5m)", icon: "🦮", description: "반사 소재 야간 산책용", available: true },
      { id: "eq3", name: "배변봉투 세트", icon: "🧹", description: "생분해성 친환경 봉투", available: true },
      { id: "eq4", name: "클리커", icon: "🔔", description: "행동교정 훈련용", available: true },
    ],
    services: ["산책", "행동교정"],
    canHandleLargeDogs: true,
    hasTrainerCert: true,
    responseTime: "10분 이내",
    introduction: "가양동에서 반려견 행동교정 전문 산책을 제공합니다. 산책 중 기본 훈련(앉아, 기다려, 이리와)을 병행하여 반려견의 사회성을 높여드립니다.",
    specialNotes: "행동교정이 필요한 반려견 전문, 산책 후 행동 리포트 제공",
    availableSlots: ["07:00-10:00", "14:00-17:00", "18:00-20:00"],
    neighborhoods: ["가양동", "자양동", "판암동"],
  },
  seed_w3: {
    id: "seed_w3",
    nickname: "자양동 댕댕시터",
    profileEmoji: "👧",
    bio: "소형견 전문 돌보미입니다. 자양동 대청호 산책로를 주로 이용해요.",
    rating: 4.7,
    reviewCount: 64,
    pricePerHour: 15000,
    isVerified: true,
    specialBadge: "대전 산책 전문가",
    experiences: [
      { district: "동구", years: 3, completedWalks: 178, specialization: "소형견 전문" },
    ],
    certifications: [
      {
        id: "cert_sw3_1",
        name: "반려동물관리사 2급",
        issuer: "한국반려동물협회",
        issueDate: "2023-05-20",
        imageUri: "https://via.placeholder.com/400x300/E91E63/FFFFFF?text=반려동물관리사+2급",
        verified: true,
      },
    ],
    equipment: [
      { id: "eq1", name: "소형견 전용 리드줄", icon: "🦮", description: "가벼운 소형견 맞춤", available: true },
      { id: "eq2", name: "배변봉투 세트", icon: "🧹", description: "생분해성 친환경 봉투", available: true },
      { id: "eq3", name: "반려견 물병", icon: "💧", description: "휴대용 접이식 물그릇", available: true },
    ],
    services: ["산책", "데이케어", "방문돌봄"],
    canHandleLargeDogs: false,
    hasTrainerCert: false,
    responseTime: "15분 이내",
    introduction: "소형견을 특히 좋아하고 잘 다루는 댕댕시터입니다. 대청호 오백리길의 평탄한 코스를 주로 이용하여 안전한 산책을 제공합니다.",
    specialNotes: "소형견 전문, 노견 산책도 가능",
    availableSlots: ["09:00-12:00", "13:00-16:00"],
    neighborhoods: ["자양동", "대별동"],
  },
  seed_w4: {
    id: "seed_w4",
    nickname: "가양동 산책왕",
    profileEmoji: "🧑‍🦲",
    bio: "매일 아침 6시에 가양동 둘레길을 산책합니다. 대형견도 OK!",
    rating: 4.6,
    reviewCount: 45,
    pricePerHour: 16000,
    isVerified: true,
    specialBadge: "대전 산책 전문가",
    experiences: [
      { district: "동구", years: 2, completedWalks: 134, specialization: "새벽/아침 산책" },
    ],
    certifications: [
      {
        id: "cert_sw4_1",
        name: "반려견 응급처치 이수증",
        issuer: "대전시 동물보호센터",
        issueDate: "2024-02-10",
        imageUri: "https://via.placeholder.com/400x300/FF5722/FFFFFF?text=응급처치+이수증",
        verified: true,
      },
    ],
    equipment: [
      { id: "eq1", name: "대형견 하네스", icon: "🎽", description: "대형견 전용 안전 하네스", available: true },
      { id: "eq2", name: "안전 리드줄 (3m)", icon: "🦮", description: "충격흡수 기능", available: true },
      { id: "eq3", name: "배변봉투 세트", icon: "🧹", description: "생분해성 친환경 봉투", available: true },
      { id: "eq4", name: "야간 반사 조끼", icon: "🦺", description: "새벽 산책 시 안전 확보", available: true },
    ],
    services: ["산책"],
    canHandleLargeDogs: true,
    hasTrainerCert: false,
    responseTime: "20분 이내",
    introduction: "매일 아침 6시부터 가양동 둘레길에서 산책합니다. 이른 아침이나 저녁 시간대 산책을 원하시는 분께 추천드립니다.",
    specialNotes: "새벽/아침 산책 전문, 야간 반사 장비 완비",
    availableSlots: ["06:00-08:00", "17:00-19:00"],
    neighborhoods: ["가양동", "자양동"],
  },
  seed_w5: {
    id: "seed_w5",
    nickname: "자양동 멍멍이친구",
    profileEmoji: "👨‍🎓",
    bio: "반려견 응급처치 교육 이수. 안전한 산책을 약속드립니다.",
    rating: 4.5,
    reviewCount: 32,
    pricePerHour: 17000,
    isVerified: true,
    specialBadge: "대전 산책 전문가",
    experiences: [
      { district: "동구", years: 2, completedWalks: 98, specialization: "안전 산책 전문" },
    ],
    certifications: [
      {
        id: "cert_sw5_1",
        name: "반려동물관리사 2급",
        issuer: "한국반려동물협회",
        issueDate: "2024-01-15",
        imageUri: "https://via.placeholder.com/400x300/3F51B5/FFFFFF?text=반려동물관리사+2급",
        verified: true,
      },
      {
        id: "cert_sw5_2",
        name: "반려견 응급처치 전문가",
        issuer: "대한수의사회",
        issueDate: "2024-03-01",
        imageUri: "https://via.placeholder.com/400x300/F44336/FFFFFF?text=응급처치+전문가",
        verified: true,
      },
    ],
    equipment: [
      { id: "eq1", name: "안전 리드줄 (3m/5m)", icon: "🦮", description: "충격흡수 기능 내장", available: true },
      { id: "eq2", name: "배변봉투 세트", icon: "🧹", description: "생분해성 친환경 봉투", available: true },
      { id: "eq3", name: "응급 처치 키트", icon: "🩹", description: "반려견 전용 응급처치 도구", available: true },
      { id: "eq4", name: "GPS 트래커", icon: "📡", description: "실시간 위치 추적", available: true },
    ],
    services: ["산책", "응급돌봄"],
    canHandleLargeDogs: false,
    hasTrainerCert: true,
    responseTime: "10분 이내",
    introduction: "반려견 응급처치 전문가 자격을 보유하고 있어 만약의 상황에도 안전하게 대처할 수 있습니다. 자양동 일대에서 활동합니다.",
    specialNotes: "응급상황 대처 가능, 산책 중 건강 체크 제공",
    availableSlots: ["08:00-11:00", "14:00-17:00", "19:00-21:00"],
    neighborhoods: ["자양동", "가양동"],
  },
};

// ─── 3. 시드 예약 3건 ───
export const SEED_BOOKINGS: Booking[] = [
  {
    id: "bk_seed_1",
    walkerId: "seed_w1",
    walkerName: "자양동 하늘이맘",
    walkerEmoji: "👩‍🦰",
    ownerId: "me",
    ownerName: "나",
    petName: "초코",
    petEmoji: "🐕",
    date: daysFromNow(1),
    timeSlot: "10:00-11:00",
    duration: 60,
    serviceType: "산책",
    status: "confirmed",
    price: 18000,
    escrowStatus: "held",
    neighborhood: "자양동",
    notes: "초코가 다른 강아지를 무서워해요. 조용한 코스로 부탁드려요.",
    createdAt: isoNow(),
  },
  {
    id: "bk_seed_2",
    walkerId: "seed_w2",
    walkerName: "가양동 뽀삐아빠",
    walkerEmoji: "👨‍🦱",
    ownerId: "me",
    ownerName: "나",
    petName: "몽이",
    petEmoji: "🐩",
    date: daysFromNow(3),
    timeSlot: "15:00-17:00",
    duration: 120,
    serviceType: "산책",
    status: "pending",
    price: 40000,
    escrowStatus: "none",
    neighborhood: "가양동",
    notes: "행동교정 산책 요청합니다. 당김이 심해요.",
    createdAt: isoNow(),
  },
  {
    id: "bk_seed_3",
    walkerId: "seed_w3",
    walkerName: "자양동 댕댕시터",
    walkerEmoji: "👧",
    ownerId: "me",
    ownerName: "나",
    petName: "초코",
    petEmoji: "🐕",
    date: todayStr(),
    timeSlot: "09:00-10:00",
    duration: 60,
    serviceType: "산책",
    status: "completed",
    price: 15000,
    escrowStatus: "released",
    neighborhood: "자양동",
    notes: "대청호 산책로 코스로 부탁드려요.",
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
];

// ─── 4. 시드 보호자 프로필 (대전 시민 인증 완료) ───
export const SEED_OWNER_PROFILE: Partial<UserProfile> = {
  nickname: "초코맘",
  neighborhood: "자양동",
  role: "owner",
  bio: "자양동에서 초코와 몽이를 키우고 있어요 🐕🐩",
  avatarEmoji: "👩",
  pets: [
    {
      id: "pet_seed_1",
      name: "초코",
      breed: "말티즈",
      age: 3,
      size: "소형",
      emoji: "🐕",
      aggression: "없음",
      medicalConditions: "없음",
      walkNotes: ["다른 강아지 무서워함", "간식으로 유도 가능"],
      preferredTrails: ["대청호 오백리길", "자양동 둘레길"],
      weight: 4.5,
    },
    {
      id: "pet_seed_2",
      name: "몽이",
      breed: "푸들",
      age: 2,
      size: "소형",
      emoji: "🐩",
      aggression: "주의",
      medicalConditions: "슬개골 탈구 주의",
      walkNotes: ["당김이 심함", "목줄보다 하네스 선호", "계단 주의"],
      preferredTrails: ["가양동 둘레길"],
      weight: 5.2,
    },
  ],
  rating: 4.8,
  reviewCount: 15,
  mannerScore: 4.7,
  isCaretakerActive: false,
  caretakerServices: [],
  hourlyRate: 0,
  canHandleLargeDogs: false,
  hasTrainerCert: false,
  isOnline: true,
  availableSlots: [],
  activeNeighborhoods: [],
  locationVerified: true, // 대전 시민 인증 완료!
};

// ─── 5. 시드 알림 ───
export const SEED_NOTIFICATIONS: Notification[] = [
  {
    id: "notif_seed_1",
    type: "match",
    title: "예약 확정",
    body: "자양동 하늘이맘님과의 산책 예약이 확정되었습니다. 내일 10:00에 만나요!",
    relatedId: "bk_seed_1",
    fromNickname: "자양동 하늘이맘",
    fromEmoji: "👩‍🦰",
    isRead: false,
    createdAt: isoNow(),
  },
  {
    id: "notif_seed_2",
    type: "system",
    title: "대전 시민 인증 완료",
    body: "카카오맵 위치 확인을 통해 대전 시민으로 인증되었습니다. 모든 서비스를 이용하실 수 있습니다.",
    isRead: true,
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: "notif_seed_3",
    type: "match_request",
    title: "산책 완료",
    body: "자양동 댕댕시터님과의 산책이 완료되었습니다. 리뷰를 남겨주세요!",
    relatedId: "bk_seed_3",
    fromNickname: "자양동 댕댕시터",
    fromEmoji: "👧",
    isRead: false,
    createdAt: new Date(Date.now() - 7200000).toISOString(),
  },
];

// ─── 6. 시드 결제 내역 ───
export const SEED_PAYMENTS: Payment[] = [
  {
    id: "pay_seed_1",
    requestId: "bk_seed_1",
    amount: 18000,
    method: "ontong_daejeon",
    status: "escrow_held",
    fromUserId: "me",
    toUserId: "seed_w1",
    description: "산책 예약 - 자양동 하늘이맘",
    serviceType: "산책",
    caretakerName: "자양동 하늘이맘",
    createdAt: isoNow(),
  },
  {
    id: "pay_seed_2",
    requestId: "bk_seed_3",
    amount: 15000,
    method: "card",
    status: "completed",
    fromUserId: "me",
    toUserId: "seed_w3",
    description: "산책 완료 - 자양동 댕댕시터",
    serviceType: "산책",
    caretakerName: "자양동 댕댕시터",
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
];

// ─── 7. 시드 채팅방 ───
export const SEED_CHAT_ROOMS: ChatRoom[] = [
  {
    id: "room_worker_seed_w1",
    participantId: "seed_w1",
    participantName: "자양동 하늘이맘",
    participantEmoji: "👩‍🦰",
    type: "worker",
    lastMessage: "내일 10시에 자양동 입구에서 만나요! 🐕",
    lastMessageTime: isoNow(),
    unreadCount: 1,
  },
  {
    id: "room_worker_seed_w2",
    participantId: "seed_w2",
    participantName: "가양동 뽀삐아빠",
    participantEmoji: "👨‍🦱",
    type: "worker",
    lastMessage: "행동교정 산책 관련해서 상담 드릴게요.",
    lastMessageTime: new Date(Date.now() - 1800000).toISOString(),
    unreadCount: 0,
  },
];

// ─── 8. 시드 데이터 로드 함수 ───
export function getSeedAppState(): {
  profile: Partial<UserProfile>;
  bookings: Booking[];
  notifications: Notification[];
  payments: Payment[];
  chatRooms: ChatRoom[];
} {
  return {
    profile: SEED_OWNER_PROFILE,
    bookings: SEED_BOOKINGS,
    notifications: SEED_NOTIFICATIONS,
    payments: SEED_PAYMENTS,
    chatRooms: SEED_CHAT_ROOMS,
  };
}

// ─── 9. 시드 워커를 기존 MOCK_CARETAKERS에 병합하는 헬퍼 ───
export function mergeSeedWalkers(existingWalkers: MockUser[]): MockUser[] {
  const existingIds = new Set(existingWalkers.map((w) => w.id));
  const newWalkers = SEED_WALKERS.filter((w) => !existingIds.has(w.id));
  return [...existingWalkers, ...newWalkers];
}

// ─── 10. 시드 워커 상세를 기존 WORKER_DETAILS에 병합하는 헬퍼 ───
export function mergeSeedWorkerDetails(
  existing: Record<string, WorkerDetail>
): Record<string, WorkerDetail> {
  return { ...existing, ...SEED_WORKER_DETAILS };
}
