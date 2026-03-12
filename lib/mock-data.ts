export interface MockUser {
  id: string;
  nickname: string;
  neighborhood: string;
  role: "owner" | "caretaker";
  bio: string;
  rating: number;
  reviewCount: number;
  pets?: { name: string; breed: string; size: string; emoji: string }[];
  services?: string[];
  isActive?: boolean;
  distance?: string;
  profileEmoji: string;
}

export interface MockRequest {
  id: string;
  type: "walk_partner" | "caretaker" | "walk_request" | "emergency" | "short_care";
  title: string;
  requester: string;
  neighborhood: string;
  date: string;
  time: string;
  duration: string;
  petName: string;
  petEmoji: string;
  status: "pending" | "accepted" | "completed" | "cancelled";
  isUrgent?: boolean;
  description: string;
}

export const NEIGHBORHOODS = [
  "유성구",
  "둔산",
  "관평",
  "노은",
  "봉명",
  "대덕구",
  "중구",
  "동구",
  "서구",
];

export const MOCK_CARETAKERS: MockUser[] = [
  {
    id: "c1",
    nickname: "강아지사랑 민지",
    neighborhood: "유성구",
    role: "caretaker",
    bio: "3년 경력의 반려동물 돌봄 전문가입니다. 소형견 전문이에요 🐾",
    rating: 4.9,
    reviewCount: 47,
    services: ["긴급 방문 돌봄", "대신 산책"],
    isActive: true,
    distance: "0.3km",
    profileEmoji: "👩",
  },
  {
    id: "c2",
    nickname: "산책왕 준혁",
    neighborhood: "둔산",
    role: "caretaker",
    bio: "매일 아침 산책하는 걸 좋아해요. 대형견도 OK!",
    rating: 4.7,
    reviewCount: 32,
    services: ["대신 산책", "긴급 방문 돌봄"],
    isActive: true,
    distance: "0.8km",
    profileEmoji: "👨",
  },
  {
    id: "c3",
    nickname: "펫케어 수빈",
    neighborhood: "관평",
    role: "caretaker",
    bio: "수의대 재학 중입니다. 건강 체크도 해드려요!",
    rating: 5.0,
    reviewCount: 18,
    services: ["긴급 방문 돌봄", "대신 산책"],
    isActive: false,
    distance: "1.2km",
    profileEmoji: "👩‍🎓",
  },
  {
    id: "c4",
    nickname: "노은동 지현",
    neighborhood: "노은",
    role: "caretaker",
    bio: "두 마리 강아지를 키우고 있어요. 경험 많습니다!",
    rating: 4.8,
    reviewCount: 25,
    services: ["긴급 방문 돌봄", "대신 산책"],
    isActive: true,
    distance: "1.5km",
    profileEmoji: "👩",
  },
  {
    id: "c5",
    nickname: "봉명동 태양",
    neighborhood: "봉명",
    role: "caretaker",
    bio: "퇴직 후 반려동물 돌봄을 시작했어요. 정성껏 돌봐드립니다.",
    rating: 4.6,
    reviewCount: 61,
    services: ["긴급 방문 돌봄", "대신 산책"],
    isActive: true,
    distance: "2.1km",
    profileEmoji: "👴",
  },
];

export const MOCK_OWNERS: MockUser[] = [
  {
    id: "o1",
    nickname: "골든리트리버 맘",
    neighborhood: "유성구",
    role: "owner",
    bio: "골든이랑 매일 아침 산책해요. 같이 걸을 친구 찾아요!",
    rating: 4.8,
    reviewCount: 12,
    pets: [{ name: "골든이", breed: "골든 리트리버", size: "대형", emoji: "🐕" }],
    distance: "0.4km",
    profileEmoji: "👩",
  },
  {
    id: "o2",
    nickname: "말티즈 아빠",
    neighborhood: "둔산",
    role: "owner",
    bio: "말티즈 두 마리 키워요. 소형견 산책 친구 구해요 🐩",
    rating: 4.5,
    reviewCount: 8,
    pets: [
      { name: "뽀삐", breed: "말티즈", size: "소형", emoji: "🐩" },
      { name: "코코", breed: "말티즈", size: "소형", emoji: "🐩" },
    ],
    distance: "0.7km",
    profileEmoji: "👨",
  },
  {
    id: "o3",
    nickname: "관평동 강아지맘",
    neighborhood: "관평",
    role: "owner",
    bio: "포메라니안 키워요. 출장이 잦아서 돌봄 자주 필요해요.",
    rating: 4.9,
    reviewCount: 20,
    pets: [{ name: "솜이", breed: "포메라니안", size: "소형", emoji: "🦊" }],
    distance: "1.0km",
    profileEmoji: "👩",
  },
];

export const MOCK_REQUESTS: MockRequest[] = [
  {
    id: "r1",
    type: "emergency",
    title: "긴급! 오늘 오후 방문 돌봄 부탁드려요",
    requester: "골든리트리버 맘",
    neighborhood: "유성구",
    date: "오늘",
    time: "오후 2시",
    duration: "2시간",
    petName: "골든이",
    petEmoji: "🐕",
    status: "pending",
    isUrgent: true,
    description: "갑자기 외출이 생겼어요. 골든 리트리버 대형견인데 순해요!",
  },
  {
    id: "r2",
    type: "walk_request",
    title: "내일 아침 산책 부탁드립니다",
    requester: "말티즈 아빠",
    neighborhood: "둔산",
    date: "내일",
    time: "오전 7시",
    duration: "30분",
    petName: "뽀삐",
    petEmoji: "🐩",
    status: "pending",
    isUrgent: false,
    description: "아침 일찍 출근해야 해서요. 말티즈 소형견이에요.",
  },
  {
    id: "r3",
    type: "short_care",
    title: "주말 단기 돌봄 교환 원해요",
    requester: "관평동 강아지맘",
    neighborhood: "관평",
    date: "이번 주 토요일",
    time: "오전 10시",
    duration: "4시간",
    petName: "솜이",
    petEmoji: "🦊",
    status: "pending",
    isUrgent: false,
    description: "포메라니안이에요. 다음 주에 제가 대신 봐드릴게요!",
  },
  {
    id: "r4",
    type: "walk_request",
    title: "저녁 산책 대신 해주실 분",
    requester: "노은동 반려인",
    neighborhood: "노은",
    date: "오늘",
    time: "오후 6시",
    duration: "1시간",
    petName: "초코",
    petEmoji: "🐶",
    status: "pending",
    isUrgent: false,
    description: "비글이에요. 활발해서 운동량이 많이 필요해요.",
  },
];

export const SERVICE_TYPES = {
  owner: [
    {
      id: "walk_partner",
      title: "산책 친구 찾기",
      description: "함께 산책할 반려인 매칭",
      emoji: "🚶",
      color: "#FF7043",
    },
    {
      id: "find_caretaker",
      title: "돌보미 찾기",
      description: "전문 돌보미에게 돌봄 요청",
      emoji: "🏠",
      color: "#4CAF82",
    },
    {
      id: "walk_request",
      title: "산책 부탁하기",
      description: "돌보미에게 산책 위탁",
      emoji: "🐾",
      color: "#FF9800",
    },
    {
      id: "short_care",
      title: "단기 돌봄 교환",
      description: "다른 반려인과 상호 돌봄",
      emoji: "🤝",
      color: "#9C27B0",
    },
  ],
  caretaker: [
    {
      id: "emergency",
      title: "긴급 방문 돌봄",
      description: "집 방문 1~2시간 돌봄",
      emoji: "🚨",
      color: "#EF5350",
    },
    {
      id: "walk_service",
      title: "대신 산책",
      description: "반려동물 대신 산책",
      emoji: "🦮",
      color: "#4CAF82",
    },
  ],
};
