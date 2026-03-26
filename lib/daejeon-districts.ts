/**
 * 대전광역시 5개 구 및 세부 동 주소 데이터
 */

export interface District {
  name: string;
  emoji: string;
  description: string;
  dongs: string[];
}

export const DAEJEON_DISTRICTS: District[] = [
  {
    name: "동구",
    emoji: "🏛️",
    description: "대전의 전통 중심지",
    dongs: [
      "인동", "원동", "효동", "판암동", "신안동",
      "삼성동", "홍도동", "용전동", "대동", "자양동",
      "가양동", "성남동", "중동", "소제동", "대별동",
    ],
  },
  {
    name: "중구",
    emoji: "🏙️",
    description: "대전의 상업·행정 중심",
    dongs: [
      "은행동", "대흥동", "목동", "중촌동", "유천동",
      "문화동", "석교동", "오류동", "태평동", "부사동",
      "용두동", "문창동", "산성동", "대사동", "선화동",
    ],
  },
  {
    name: "서구",
    emoji: "🌆",
    description: "둔산 신도심 중심",
    dongs: [
      "둔산동", "월평동", "갈마동", "탄방동", "용문동",
      "도마동", "변동", "관저동", "만년동", "가수원동",
      "도안동", "복수동", "내동", "괴정동", "흑석동",
    ],
  },
  {
    name: "유성구",
    emoji: "🔬",
    description: "과학·연구 도시",
    dongs: [
      "봉명동", "구암동", "노은동", "지족동", "관평동",
      "전민동", "원신흥동", "장대동", "온천동", "궁동",
      "어은동", "도룡동", "덕명동", "반석동", "죽동",
    ],
  },
  {
    name: "대덕구",
    emoji: "🏭",
    description: "산업·물류 중심지",
    dongs: [
      "오정동", "대화동", "읍내동", "신탄진동", "석봉동",
      "목상동", "법동", "송촌동", "중리동", "비래동",
      "와동", "평촌동", "덕암동", "연축동", "장동",
    ],
  },
];

/**
 * 구 이름만 추출한 배열
 */
export const DISTRICT_NAMES = DAEJEON_DISTRICTS.map((d) => d.name);

/**
 * 구 이름으로 District 객체 찾기
 */
export function getDistrictByName(name: string): District | undefined {
  return DAEJEON_DISTRICTS.find((d) => d.name === name);
}

/**
 * 전체 주소 문자열 생성
 */
export function formatAddress(district: string, dong: string): string {
  return `대전광역시 ${district} ${dong}`;
}
