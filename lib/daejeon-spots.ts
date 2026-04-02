/**
 * 대전광역시 반려견 산책 명소 데이터
 */

export interface WalkSpot {
  id: string;
  name: string;
  district: string; // 구
  dong: string; // 동
  description: string;
  emoji: string;
  features: string[];
  latitude: number;
  longitude: number;
  imageTag: string; // 대표 이미지 태그
  rating: number;
  walkTime: string; // 예상 산책 시간
  difficulty: "쉬움" | "보통" | "어려움";
  petFriendly: string; // 반려견 관련 특이사항
}

export const DAEJEON_WALK_SPOTS: WalkSpot[] = [
  {
    id: "spot_1",
    name: "한밭수목원",
    district: "서구",
    dong: "둔산동",
    description: "대전 도심 속 대규모 수목원. 산책로가 잘 정비되어 있어 반려견과 함께 걷기 좋습니다.",
    emoji: "🌳",
    features: ["넓은 산책로", "그늘 많음", "벤치 다수", "주차장"],
    latitude: 36.3685,
    longitude: 127.3880,
    imageTag: "arboretum",
    rating: 4.8,
    walkTime: "40~60분",
    difficulty: "쉬움",
    petFriendly: "리드줄 필수, 배변봉투 지참",
  },
  {
    id: "spot_2",
    name: "엑스포 시민광장",
    district: "유성구",
    dong: "도룡동",
    description: "넓은 잔디밭과 산책로가 있는 시민 휴식 공간. 반려견 놀이에 최적입니다.",
    emoji: "🏟️",
    features: ["넓은 잔디밭", "야외 무대", "주차장", "편의시설"],
    latitude: 36.3742,
    longitude: 127.3917,
    imageTag: "expo_park",
    rating: 4.7,
    walkTime: "30~50분",
    difficulty: "쉬움",
    petFriendly: "잔디밭 자유 활동 가능, 리드줄 권장",
  },
  {
    id: "spot_3",
    name: "유림공원",
    district: "유성구",
    dong: "봉명동",
    description: "대전 유성구 봉명동의 대표 공원. 호수 주변 산책로와 운동시설이 잘 갖춰져 있습니다.",
    emoji: "🏞️",
    features: ["호수 산책로", "운동시설", "놀이터", "주차장"],
    latitude: 36.3609,
    longitude: 127.3592,
    imageTag: "yurim_park",
    rating: 4.6,
    walkTime: "30~45분",
    difficulty: "쉬움",
    petFriendly: "호수 주변 리드줄 필수",
  },
  {
    id: "spot_4",
    name: "남선공원",
    district: "중구",
    dong: "대사동",
    description: "대전 중구의 도심 공원. 산책로와 체육시설이 있어 가볍게 산책하기 좋습니다.",
    emoji: "🌲",
    features: ["산책로", "체육시설", "정자", "화장실"],
    latitude: 36.3276,
    longitude: 127.4218,
    imageTag: "namseon_park",
    rating: 4.4,
    walkTime: "20~30분",
    difficulty: "쉬움",
    petFriendly: "소형견 산책에 적합",
  },
  {
    id: "spot_5",
    name: "대전 갑천 생태 호수 공원",
    district: "서구",
    dong: "도안동",
    description: "갑천변 도안지구에 조성된 생태 호수 공원. 넓은 잔디밭과 호수 산책로가 반려견과 함께 걷기에 최적입니다.",
    emoji: "🌊",
    features: ["호수 산책로", "생태 습지", "잔디광장", "야간 조명", "주차장"],
    latitude: 36.3299,
    longitude: 127.3536,
    imageTag: "gapcheon",
    rating: 4.7,
    walkTime: "40~90분",
    difficulty: "쉬움",
    petFriendly: "넓은 잔디밭 자유 활동 가능, 호수 근처 리드줄 필수",
  },
  {
    id: "spot_6",
    name: "대전 오월드 인근 산책로",
    district: "중구",
    dong: "사정동",
    description: "오월드 주변 자연 산책로. 숲길과 평지가 적절히 섞여 있습니다.",
    emoji: "🦁",
    features: ["숲길", "평지", "자연경관", "주차장"],
    latitude: 36.2876,
    longitude: 127.3987,
    imageTag: "oworld",
    rating: 4.3,
    walkTime: "50~80분",
    difficulty: "보통",
    petFriendly: "오월드 내부 반려동물 입장 불가, 외부 산책로만 이용",
  },
  {
    id: "spot_7",
    name: "보문산 둘레길",
    district: "중구",
    dong: "대사동",
    description: "대전의 대표 산인 보문산 둘레길. 경사가 있어 활동적인 반려견에게 좋습니다.",
    emoji: "⛰️",
    features: ["등산로", "전망대", "약수터", "화장실"],
    latitude: 36.3108,
    longitude: 127.4176,
    imageTag: "bomunsan",
    rating: 4.5,
    walkTime: "60~120분",
    difficulty: "어려움",
    petFriendly: "대형견 활동에 적합, 경사 주의",
  },
  {
    id: "spot_8",
    name: "대청호 오백리길",
    district: "동구",
    dong: "추동",
    description: "대청호 주변의 아름다운 산책로. 호수 경치를 즐기며 산책할 수 있습니다.",
    emoji: "🏔️",
    features: ["호수 경관", "숲길", "포토존", "주차장"],
    latitude: 36.4521,
    longitude: 127.4876,
    imageTag: "daecheongho",
    rating: 4.8,
    walkTime: "60~180분",
    difficulty: "보통",
    petFriendly: "넓은 공간, 대형견 가능, 물 준비 필수",
  },
  {
    id: "spot_9",
    name: "카이스트 캠퍼스 산책로",
    district: "유성구",
    dong: "어은동",
    description: "카이스트 캠퍼스 내 넓은 잔디밭과 산책로. 조용하고 깨끗합니다.",
    emoji: "🎓",
    features: ["캠퍼스 산책로", "잔디밭", "벤치", "카페"],
    latitude: 36.3721,
    longitude: 127.3604,
    imageTag: "kaist",
    rating: 4.6,
    walkTime: "30~50분",
    difficulty: "쉬움",
    petFriendly: "리드줄 필수, 건물 내부 입장 불가",
  },
  {
    id: "spot_10",
    name: "대덕연구단지 산책로",
    district: "유성구",
    dong: "전민동",
    description: "연구단지 내 조용한 산책로. 평일에는 한적하여 산책하기 좋습니다.",
    emoji: "🔬",
    features: ["조용한 환경", "넓은 도로", "가로수길", "주차장"],
    latitude: 36.3912,
    longitude: 127.3521,
    imageTag: "daedeok",
    rating: 4.4,
    walkTime: "30~60분",
    difficulty: "쉬움",
    petFriendly: "평일 한적, 주말 가족 단위 많음",
  },
  {
    id: "spot_11",
    name: "계족산 황톳길",
    district: "대덕구",
    dong: "장동",
    description: "맨발 걷기로 유명한 황톳길. 반려견과 함께 자연을 만끽할 수 있습니다.",
    emoji: "🦶",
    features: ["황톳길", "숲길", "맨발 체험", "주차장"],
    latitude: 36.4087,
    longitude: 127.4312,
    imageTag: "gyejoksan",
    rating: 4.9,
    walkTime: "40~70분",
    difficulty: "보통",
    petFriendly: "반려견 발바닥 보호 주의, 리드줄 필수",
  },
  {
    id: "spot_12",
    name: "동춘당공원",
    district: "대덕구",
    dong: "송촌동",
    description: "문화재와 함께하는 역사 산책로. 조용하고 아늑한 분위기입니다.",
    emoji: "🏯",
    features: ["문화재", "정원", "연못", "벤치"],
    latitude: 36.3654,
    longitude: 127.4387,
    imageTag: "dongchundang",
    rating: 4.3,
    walkTime: "20~30분",
    difficulty: "쉬움",
    petFriendly: "소형견 적합, 문화재 근처 주의",
  },
];

// 구별 추천 산책로 필터
export function getSpotsByDistrict(district: string): WalkSpot[] {
  return DAEJEON_WALK_SPOTS.filter((s) => s.district === district);
}

// 오늘의 추천 산책로 (날짜 기반 랜덤)
export function getTodayRecommendedSpot(): WalkSpot {
  const today = new Date();
  const dayOfYear = Math.floor(
    (today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000
  );
  const index = dayOfYear % DAEJEON_WALK_SPOTS.length;
  return DAEJEON_WALK_SPOTS[index];
}

// 특정 산책로 근처 활동 가능한 워커 추천 (구 기반)
export function getWalkersNearSpot(spotDistrict: string, walkers: any[]): any[] {
  return walkers.filter((w) => {
    const walkerDistrict = getDistrictFromNeighborhood(w.neighborhood);
    return walkerDistrict === spotDistrict;
  });
}

// 동네 이름으로 구 찾기
export function getDistrictFromNeighborhood(neighborhood: string): string {
  const districtMap: Record<string, string> = {
    "유성구": "유성구",
    "봉명": "유성구", "봉명동": "유성구",
    "구암": "유성구", "구암동": "유성구",
    "노은": "유성구", "노은동": "유성구",
    "지족": "유성구", "지족동": "유성구",
    "관평": "유성구", "관평동": "유성구",
    "전민": "유성구", "전민동": "유성구",
    "궁동": "유성구",
    "어은": "유성구", "어은동": "유성구",
    "도룡": "유성구", "도룡동": "유성구",
    "덕명": "유성구", "덕명동": "유성구",
    "반석": "유성구", "반석동": "유성구",
    "둔산": "서구", "둔산동": "서구",
    "월평": "서구", "월평동": "서구",
    "갈마": "서구", "갈마동": "서구",
    "탄방": "서구", "탄방동": "서구",
    "용문": "서구", "용문동": "서구",
    "도마": "서구", "도마동": "서구",
    "관저": "서구", "관저동": "서구",
    "도안": "서구", "도안동": "서구",
    "괴정": "서구", "괴정동": "서구",
    "서구": "서구",
    "중구": "중구",
    "은행": "중구", "은행동": "중구",
    "대흥": "중구", "대흥동": "중구",
    "유천": "중구", "유천동": "중구",
    "오류": "중구", "오류동": "중구",
    "동구": "동구",
    "인동": "동구",
    "판암": "동구", "판암동": "동구",
    "대동": "동구",
    "자양": "동구", "자양동": "동구",
    "가양": "동구", "가양동": "동구",
    "대별": "동구", "대별동": "동구",
    "대덕구": "대덕구",
    "신탄진": "대덕구", "신탄진동": "대덕구",
    "송촌": "대덕구", "송촌동": "대덕구",
    "장동": "대덕구",
  };
  return districtMap[neighborhood] || neighborhood;
}
