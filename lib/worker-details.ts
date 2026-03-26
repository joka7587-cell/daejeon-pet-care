/**
 * 워커 상세 정보 데이터 모델
 * 경력, 자격증, 장비 정보 포함
 */

export interface WorkerExperience {
  district: string;
  years: number;
  completedWalks: number;
  specialization: string; // 예: "대형견 전문", "반려견 행동교정"
}

export interface WorkerCertification {
  id: string;
  name: string; // 자격증 이름
  issuer: string; // 발급 기관
  issueDate: string; // YYYY-MM-DD
  imageUri: string; // 자격증 사진 URI
  verified: boolean; // 인증 완료 여부
}

export interface WorkerEquipment {
  id: string;
  name: string;
  icon: string;
  description: string;
  available: boolean;
}

export interface WorkerDetail {
  id: string;
  nickname: string;
  profileEmoji: string;
  bio: string;
  rating: number;
  reviewCount: number;
  pricePerHour: number;
  isVerified: boolean;
  specialBadge?: string;

  // 경력 정보
  experiences: WorkerExperience[];

  // 자격증
  certifications: WorkerCertification[];

  // 보유 장비
  equipment: WorkerEquipment[];

  // 서비스 정보
  services: string[];
  canHandleLargeDogs: boolean;
  hasTrainerCert: boolean;

  // 응답 시간
  responseTime: string;

  // 소개 텍스트
  introduction: string;
  specialNotes: string;
}

// ─── 워커 상세 정보 더미 데이터 ───
export const WORKER_DETAILS: Record<string, WorkerDetail> = {
  c1: {
    id: "c1",
    nickname: "강아지사랑 민지",
    profileEmoji: "👩",
    bio: "3년 경력의 반려동물 돌봄 전문가입니다. 소형견 전문이에요",
    rating: 4.9,
    reviewCount: 47,
    pricePerHour: 15000,
    isVerified: true,
    specialBadge: "대전 산책 전문가",
    experiences: [
      {
        district: "유성구",
        years: 3,
        completedWalks: 128,
        specialization: "소형견 전문",
      },
    ],
    certifications: [
      {
        id: "cert_1",
        name: "반려동물 관리사 자격증",
        issuer: "한국반려동물협회",
        issueDate: "2021-06-15",
        imageUri: "demo_cert_1",
        verified: true,
      },
    ],
    equipment: [
      {
        id: "eq_1",
        name: "리드줄",
        icon: "🪢",
        description: "소형견용 가죽 리드줄",
        available: true,
      },
      {
        id: "eq_2",
        name: "배변봉투",
        icon: "🛍️",
        description: "친환경 배변봉투 (100매)",
        available: true,
      },
      {
        id: "eq_3",
        name: "물통",
        icon: "💧",
        description: "휴대용 물통 + 물그릇",
        available: true,
      },
      {
        id: "eq_4",
        name: "응급처치키트",
        icon: "🩹",
        description: "기본 응급처치용품",
        available: true,
      },
    ],
    services: ["긴급 방문 돌봄", "대신 산책"],
    canHandleLargeDogs: false,
    hasTrainerCert: false,
    responseTime: "5분 이내",
    introduction:
      "안녕하세요! 저는 3년간 소형견 산책 및 돌봄 서비스를 제공해온 민지입니다. 각 반려견의 성격과 건강 상태를 꼼꼼히 파악하여 맞춤형 서비스를 제공하고 있습니다.",
    specialNotes:
      "- 소형견(5kg 이하) 전문\n- 산책 중 사진/영상 촬영 가능\n- 매일 아침 7시~오후 5시 활동\n- 궁동 및 인근 지역 전문",
  },
  c2: {
    id: "c2",
    nickname: "산책왕 준혁",
    profileEmoji: "👨",
    bio: "매일 아침 산책하는 걸 좋아해요. 대형견도 OK!",
    rating: 4.7,
    reviewCount: 32,
    pricePerHour: 18000,
    isVerified: true,
    specialBadge: "대전 산책 전문가",
    experiences: [
      {
        district: "서구",
        years: 4,
        completedWalks: 89,
        specialization: "대형견 전문",
      },
    ],
    certifications: [
      {
        id: "cert_2",
        name: "반려견 훈련사 자격증",
        issuer: "한국견종협회",
        issueDate: "2020-03-20",
        imageUri: "demo_cert_2",
        verified: true,
      },
      {
        id: "cert_3",
        name: "동물 응급처치 교육 수료",
        issuer: "대전동물병원협회",
        issueDate: "2022-09-10",
        imageUri: "demo_cert_3",
        verified: true,
      },
    ],
    equipment: [
      {
        id: "eq_5",
        name: "대형견용 리드줄",
        icon: "🪢",
        description: "강화 나일론 리드줄 (2m)",
        available: true,
      },
      {
        id: "eq_6",
        name: "배변봉투",
        icon: "🛍️",
        description: "친환경 배변봉투 (200매)",
        available: true,
      },
      {
        id: "eq_7",
        name: "물통",
        icon: "💧",
        description: "대용량 물통 + 그릇",
        available: true,
      },
      {
        id: "eq_8",
        name: "응급처치키트",
        icon: "🩹",
        description: "고급 응급처치용품",
        available: true,
      },
      {
        id: "eq_9",
        name: "입마개",
        icon: "😷",
        description: "다양한 사이즈 입마개",
        available: true,
      },
    ],
    services: ["긴급 방문 돌봄", "대신 산책"],
    canHandleLargeDogs: true,
    hasTrainerCert: true,
    responseTime: "10분 이내",
    introduction:
      "저는 대형견 산책과 기본 훈련을 전문으로 하고 있습니다. 반려견의 안전과 건강을 최우선으로 생각하며, 산책 중 발생할 수 있는 모든 상황에 대비하고 있습니다.",
    specialNotes:
      "- 대형견(15kg 이상) 전문\n- 기본 훈련 가능 (앉기, 기다리기 등)\n- 갑천 산책로 일일 3회 운영\n- 응급상황 대응 경험 풍부",
  },
  c6: {
    id: "c6",
    nickname: "훈련사 하나",
    profileEmoji: "👩‍🏫",
    bio: "반려견 행동교정 전문 훈련사입니다. 산책 중 기본 훈련도 가능해요.",
    rating: 4.9,
    reviewCount: 38,
    pricePerHour: 25000,
    isVerified: true,
    specialBadge: "공인 훈련사",
    experiences: [
      {
        district: "유성구",
        years: 6,
        completedWalks: 156,
        specialization: "행동교정 전문",
      },
    ],
    certifications: [
      {
        id: "cert_4",
        name: "국제 반려견 훈련사 자격증",
        issuer: "IACP (International Association of Canine Professionals)",
        issueDate: "2019-05-12",
        imageUri: "demo_cert_4",
        verified: true,
      },
      {
        id: "cert_5",
        name: "반려견 행동학 전문가",
        issuer: "한국동물행동학회",
        issueDate: "2021-11-08",
        imageUri: "demo_cert_5",
        verified: true,
      },
      {
        id: "cert_6",
        name: "동물 응급처치 및 CPR",
        issuer: "대전보건대학교",
        issueDate: "2022-01-20",
        imageUri: "demo_cert_6",
        verified: true,
      },
    ],
    equipment: [
      {
        id: "eq_10",
        name: "훈련용 리드줄",
        icon: "🪢",
        description: "조절 가능한 훈련용 리드줄",
        available: true,
      },
      {
        id: "eq_11",
        name: "배변봉투",
        icon: "🛍️",
        description: "친환경 배변봉투 (300매)",
        available: true,
      },
      {
        id: "eq_12",
        name: "물통",
        icon: "💧",
        description: "대용량 물통 + 그릇",
        available: true,
      },
      {
        id: "eq_13",
        name: "응급처치키트",
        icon: "🩹",
        description: "전문 응급처치용품",
        available: true,
      },
      {
        id: "eq_14",
        name: "훈련용 간식",
        icon: "🍖",
        description: "저지방 훈련용 간식",
        available: true,
      },
      {
        id: "eq_15",
        name: "클icker",
        icon: "🔔",
        description: "행동 강화 클리커",
        available: true,
      },
    ],
    services: ["긴급 방문 돌봄", "대신 산책"],
    canHandleLargeDogs: true,
    hasTrainerCert: true,
    responseTime: "10분 이내",
    introduction:
      "저는 국제 공인 반려견 훈련사로서 6년간 행동교정과 기초 훈련을 전문으로 해왔습니다. 산책 중에도 자연스럽게 훈련을 진행하여 반려견의 행동을 개선하고 있습니다.",
    specialNotes:
      "- 행동교정 전문 (짖음, 물기, 공격성 등)\n- 산책 중 기초 훈련 (앉기, 기다리기, 손 주기)\n- 어은동 카이스트 캠퍼스 일일 2회 운영\n- 모든 견종 가능 (소형견~대형견)",
  },
  c3: {
    id: "c3",
    nickname: "펫케어 수빈",
    profileEmoji: "👩‍⚕️",
    bio: "수의대 재학 중입니다. 건강 체크도 해드려요!",
    rating: 4.7,
    reviewCount: 23,
    pricePerHour: 13000,
    isVerified: true,
    specialBadge: "수의대 재학생",
    experiences: [
      { district: "유성구", years: 2, completedWalks: 56, specialization: "건강 체크 산책" }
    ],
    certifications: [
      { id: "cert_c3_1", name: "반려동물 응급처치", issuer: "대한수의사회", issueDate: "2024-06-15", imageUri: "https://placehold.co/300x200/E8F5E9/2E7D32?text=응급처치", verified: true }
    ],
    equipment: [
      { id: "eq_c3_1", name: "체온계", icon: "🌡️", description: "반려동물 체온 측정", available: true },
      { id: "eq_c3_2", name: "리드줄", icon: "🪶", description: "안전 리드줄", available: true },
      { id: "eq_c3_3", name: "배변봉투", icon: "📦", description: "친환경 배변봉투", available: true }
    ],
    services: ["대신 산책", "건강 체크"],
    canHandleLargeDogs: false,
    hasTrainerCert: false,
    responseTime: "20분 이내",
    introduction: "수의대 재학 중인 수빈입니다. 산책 중 반려견의 건강 상태를 체크해드립니다.",
    specialNotes: "- 기본 건강 체크 (체온, 심박, 피부)\n- 관평동 일대 산책\n- 소형견 전문"
  },
  c4: {
    id: "c4",
    nickname: "노은동 지현",
    profileEmoji: "👩",
    bio: "두 마리 강아지를 키우고 있어요. 경험 많습니다!",
    rating: 4.8,
    reviewCount: 35,
    pricePerHour: 14000,
    isVerified: true,
    specialBadge: "대전 산책 전문가",
    experiences: [
      { district: "유성구", years: 4, completedWalks: 89, specialization: "다견 산책 전문" }
    ],
    certifications: [
      { id: "cert_c4_1", name: "반려동물 돌봄 2급", issuer: "한국반려동물협회", issueDate: "2023-09-10", imageUri: "https://placehold.co/300x200/E3F2FD/1565C0?text=돌봄+2급", verified: true }
    ],
    equipment: [
      { id: "eq_c4_1", name: "리드줄", icon: "🪶", description: "대형견용 리드줄", available: true },
      { id: "eq_c4_2", name: "배변봉투", icon: "📦", description: "친환경 배변봉투", available: true },
      { id: "eq_c4_3", name: "물통", icon: "💧", description: "휴대용 물통", available: true }
    ],
    services: ["대신 산책", "단기 돌봄"],
    canHandleLargeDogs: true,
    hasTrainerCert: false,
    responseTime: "15분 이내",
    introduction: "노은동에서 두 마리 강아지를 키우며 4년간 돌봄 경험을 쌓았습니다.",
    specialNotes: "- 다견 산책 가능 (최대 3마리)\n- 노은동/지족동 일대 산책\n- 대형견 가능"
  },
  c5: {
    id: "c5",
    nickname: "봉명동 태양",
    profileEmoji: "👨",
    bio: "퇴직 후 반려동물 돌봄을 시작했어요. 정성껏 돌봐드립니다.",
    rating: 4.6,
    reviewCount: 18,
    pricePerHour: 12000,
    isVerified: false,
    specialBadge: "대전 산책 전문가",
    experiences: [
      { district: "유성구", years: 1, completedWalks: 32, specialization: "소형견 전문" }
    ],
    certifications: [],
    equipment: [
      { id: "eq_c5_1", name: "리드줄", icon: "🪶", description: "안전 리드줄", available: true },
      { id: "eq_c5_2", name: "배변봉투", icon: "📦", description: "친환경 배변봉투", available: true }
    ],
    services: ["대신 산책"],
    canHandleLargeDogs: false,
    hasTrainerCert: false,
    responseTime: "30분 이내",
    introduction: "퇴직 후 봉명동에서 반려동물 돌봄을 시작했습니다. 소형견 전문입니다.",
    specialNotes: "- 봉명동 일대 산책\n- 소형견 전문\n- 여유로운 산책 스타일"
  },
  c7: {
    id: "c7",
    nickname: "대흥동 서연",
    profileEmoji: "👩",
    bio: "중구 토박이! 보문산 산책 전문이에요.",
    rating: 4.8,
    reviewCount: 41,
    pricePerHour: 14000,
    isVerified: true,
    specialBadge: "대전 산책 전문가",
    experiences: [
      { district: "중구", years: 5, completedWalks: 156, specialization: "보문산 등산 산책" }
    ],
    certifications: [
      { id: "cert_c7_1", name: "반려동물 돌봄 1급", issuer: "한국반려동물협회", issueDate: "2022-03-20", imageUri: "https://placehold.co/300x200/FFF3E0/E65100?text=돌봄+1급", verified: true }
    ],
    equipment: [
      { id: "eq_c7_1", name: "리드줄", icon: "🪶", description: "등산용 리드줄", available: true },
      { id: "eq_c7_2", name: "배변봉투", icon: "📦", description: "친환경 배변봉투", available: true },
      { id: "eq_c7_3", name: "물통", icon: "💧", description: "대용량 물통", available: true },
      { id: "eq_c7_4", name: "응급처치키트", icon: "🩹", description: "등산용 응급키트", available: true }
    ],
    services: ["대신 산책", "등산 산책"],
    canHandleLargeDogs: true,
    hasTrainerCert: false,
    responseTime: "15분 이내",
    introduction: "중구 토박이로 보문산 등산 산책을 5년간 해왔습니다.",
    specialNotes: "- 보문산 등산 전문\n- 대흥동/오류동 일대\n- 대형견 가능"
  },
  c8: {
    id: "c8",
    nickname: "판암동 동현",
    profileEmoji: "👨",
    bio: "대청호 산책 전문! 자연 속 산책을 좋아합니다.",
    rating: 4.7,
    reviewCount: 28,
    pricePerHour: 13000,
    isVerified: true,
    specialBadge: "대전 산책 전문가",
    experiences: [
      { district: "동구", years: 3, completedWalks: 72, specialization: "자연 산책 전문" }
    ],
    certifications: [
      { id: "cert_c8_1", name: "산악 안전 교육", issuer: "대전산악회", issueDate: "2024-01-10", imageUri: "https://placehold.co/300x200/E8F5E9/2E7D32?text=산악안전", verified: true }
    ],
    equipment: [
      { id: "eq_c8_1", name: "리드줄", icon: "🪶", description: "등산용 리드줄", available: true },
      { id: "eq_c8_2", name: "배변봉투", icon: "📦", description: "친환경 배변봉투", available: true },
      { id: "eq_c8_3", name: "물통", icon: "💧", description: "대용량 물통", available: true }
    ],
    services: ["대신 산책", "자연 산책"],
    canHandleLargeDogs: true,
    hasTrainerCert: false,
    responseTime: "20분 이내",
    introduction: "대청호 오백리길 산책을 3년간 해왔습니다. 자연 속 산책을 좋아합니다.",
    specialNotes: "- 대청호 오백리길 전문\n- 판암동 일대\n- 대형견 가능"
  },
  c9: {
    id: "c9",
    nickname: "신탄진 유진",
    profileEmoji: "👩",
    bio: "계족산 황톳길 산책 전문가! 자연 치유 산책 해드려요.",
    rating: 4.9,
    reviewCount: 52,
    pricePerHour: 15000,
    isVerified: true,
    specialBadge: "대전 산책 전문가",
    experiences: [
      { district: "대덕구", years: 4, completedWalks: 134, specialization: "자연 치유 산책" }
    ],
    certifications: [
      { id: "cert_c9_1", name: "반려동물 돌봄 1급", issuer: "한국반려동물협회", issueDate: "2023-05-20", imageUri: "https://placehold.co/300x200/E8F5E9/2E7D32?text=돌봄+1급", verified: true }
    ],
    equipment: [
      { id: "eq_c9_1", name: "리드줄", icon: "🪶", description: "등산용 리드줄", available: true },
      { id: "eq_c9_2", name: "배변봉투", icon: "📦", description: "친환경 배변봉투", available: true },
      { id: "eq_c9_3", name: "물통", icon: "💧", description: "대용량 물통", available: true },
      { id: "eq_c9_4", name: "응급처치키트", icon: "🩹", description: "등산용 응급키트", available: true }
    ],
    services: ["대신 산책", "자연 치유 산책"],
    canHandleLargeDogs: true,
    hasTrainerCert: false,
    responseTime: "15분 이내",
    introduction: "계족산 황톳길 산책을 4년간 해왔습니다. 자연 치유 산책을 전문으로 합니다.",
    specialNotes: "- 계족산 황톳길 전문\n- 신탄진동 일대\n- 대형견 가능"
  },
  c10: {
    id: "c10",
    nickname: "송촌동 재민",
    profileEmoji: "👨",
    bio: "동춘당공원 근처에 살아요. 소형견 전문입니다.",
    rating: 4.5,
    reviewCount: 15,
    pricePerHour: 11000,
    isVerified: false,
    specialBadge: "대전 산책 전문가",
    experiences: [
      { district: "대덕구", years: 1, completedWalks: 28, specialization: "소형견 전문" }
    ],
    certifications: [],
    equipment: [
      { id: "eq_c10_1", name: "리드줄", icon: "🪶", description: "안전 리드줄", available: true },
      { id: "eq_c10_2", name: "배변봉투", icon: "📦", description: "친환경 배변봉투", available: true }
    ],
    services: ["대신 산책"],
    canHandleLargeDogs: false,
    hasTrainerCert: false,
    responseTime: "30분 이내",
    introduction: "동춘당공원 근처에서 소형견 산책을 전문으로 합니다.",
    specialNotes: "- 동춘당공원 일대\n- 송촌동 산책\n- 소형견 전문"
  },
  c11: {
    id: "c11",
    nickname: "유천동 소희",
    profileEmoji: "👩",
    bio: "중구 유천동에서 활동 중! 친절한 돌봄을 약속합니다.",
    rating: 4.6,
    reviewCount: 20,
    pricePerHour: 13000,
    isVerified: true,
    specialBadge: "대전 산책 전문가",
    experiences: [
      { district: "중구", years: 2, completedWalks: 45, specialization: "소형견 전문" }
    ],
    certifications: [
      { id: "cert_c11_1", name: "반려동물 돌봄 2급", issuer: "한국반려동물협회", issueDate: "2024-02-15", imageUri: "https://placehold.co/300x200/E3F2FD/1565C0?text=돌봄+2급", verified: true }
    ],
    equipment: [
      { id: "eq_c11_1", name: "리드줄", icon: "🪶", description: "안전 리드줄", available: true },
      { id: "eq_c11_2", name: "배변봉투", icon: "📦", description: "친환경 배변봉투", available: true },
      { id: "eq_c11_3", name: "물통", icon: "💧", description: "휴대용 물통", available: true }
    ],
    services: ["대신 산책", "단기 돌봄"],
    canHandleLargeDogs: false,
    hasTrainerCert: false,
    responseTime: "20분 이내",
    introduction: "유천동에서 친절한 돌봄을 약속합니다. 소형견 전문입니다.",
    specialNotes: "- 유천동 일대 산책\n- 오월드 인근 산책\n- 소형견 전문"
  },
  c12: {
    id: "c12",
    nickname: "도안동 현우",
    profileEmoji: "👨",
    bio: "서구 도안동에서 활동 중! 대형견도 OK!",
    rating: 4.7,
    reviewCount: 30,
    pricePerHour: 14000,
    isVerified: true,
    specialBadge: "대전 산책 전문가",
    experiences: [
      { district: "서구", years: 3, completedWalks: 95, specialization: "대형견 전문" }
    ],
    certifications: [
      { id: "cert_c12_1", name: "반려동물 돌봄 1급", issuer: "한국반려동물협회", issueDate: "2023-08-10", imageUri: "https://placehold.co/300x200/E8F5E9/2E7D32?text=돌봄+1급", verified: true }
    ],
    equipment: [
      { id: "eq_c12_1", name: "리드줄", icon: "🪶", description: "대형견용 리드줄", available: true },
      { id: "eq_c12_2", name: "배변봉투", icon: "📦", description: "친환경 배변봉투", available: true },
      { id: "eq_c12_3", name: "물통", icon: "💧", description: "대용량 물통", available: true },
      { id: "eq_c12_4", name: "응급처치키트", icon: "🩹", description: "응급처치용품", available: true }
    ],
    services: ["대신 산책", "단기 돌봄"],
    canHandleLargeDogs: true,
    hasTrainerCert: false,
    responseTime: "15분 이내",
    introduction: "서구 도안동에서 3년간 대형견 산책을 전문으로 해왔습니다.",
    specialNotes: "- 도안동/둔산동 일대\n- 대형견 전문\n- 갑천 둔치 산책로 활용"
  },
};

/**
 * 워커 ID로 상세 정보 조회
 */
export function getWorkerDetail(workerId: string): WorkerDetail | null {
  return WORKER_DETAILS[workerId] || null;
}

/**
 * 자격증 이미지 URI를 실제 이모지로 변환 (데모용)
 */
export function getCertificationEmoji(certName: string): string {
  const emojiMap: Record<string, string> = {
    "반려동물 관리사 자격증": "🎓",
    "반려견 훈련사 자격증": "🏆",
    "동물 응급처치 교육 수료": "🩹",
    "국제 반려견 훈련사 자격증": "🌍",
    "반려견 행동학 전문가": "🧠",
    "동물 응급처치 및 CPR": "❤️",
  };
  return emojiMap[certName] || "📜";
}
