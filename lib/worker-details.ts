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
