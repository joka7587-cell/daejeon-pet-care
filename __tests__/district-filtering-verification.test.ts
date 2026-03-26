/**
 * 대전 5개 구 데이터 필터링 종합 검증 테스트
 *
 * 검증 대상:
 * 1. 산책 명소(DAEJEON_WALK_SPOTS) - 5개 구 모두 명소가 존재하는지
 * 2. 워커(MOCK_CARETAKERS) - 5개 구 모두 워커가 존재하는지
 * 3. getSpotsByDistrict() - 구별 필터링이 정확한지
 * 4. getDistrictFromNeighborhood() - 동네→구 매핑이 정확한지
 * 5. getWalkersNearSpot() - 산책로 근처 워커 필터링이 정확한지
 * 6. 홈 화면 filteredWalkers 로직 - 구 탭 선택 시 올바른 워커가 나오는지
 */
import { describe, it, expect } from "vitest";
import {
  DAEJEON_WALK_SPOTS,
  getSpotsByDistrict,
  getDistrictFromNeighborhood,
  getWalkersNearSpot,
  getTodayRecommendedSpot,
} from "../lib/daejeon-spots";
import { MOCK_CARETAKERS } from "../lib/mock-data";

const FIVE_DISTRICTS = ["서구", "유성구", "중구", "동구", "대덕구"];

// ═══════════════════════════════════════════════
// 1. 산책 명소 구별 분포 검증
// ═══════════════════════════════════════════════
describe("산책 명소 - 5개 구 분포 검증", () => {
  it("총 12개 산책 명소가 존재", () => {
    expect(DAEJEON_WALK_SPOTS).toHaveLength(12);
  });

  it("5개 구 모두에 산책 명소가 1개 이상 존재", () => {
    FIVE_DISTRICTS.forEach((district) => {
      const spots = getSpotsByDistrict(district);
      expect(
        spots.length,
        `${district}에 산책 명소가 없습니다`
      ).toBeGreaterThanOrEqual(1);
    });
  });

  it("서구: 한밭수목원, 유림공원, 갑천 둔치 산책로 (3개)", () => {
    const spots = getSpotsByDistrict("서구");
    expect(spots).toHaveLength(3);
    const names = spots.map((s) => s.name);
    expect(names).toContain("한밭수목원");
    expect(names).toContain("유림공원");
    expect(names).toContain("갑천 둔치 산책로");
  });

  it("유성구: 엑스포 시민광장, 카이스트 캠퍼스 산책로, 대덕연구단지 산책로 (3개)", () => {
    const spots = getSpotsByDistrict("유성구");
    expect(spots).toHaveLength(3);
    const names = spots.map((s) => s.name);
    expect(names).toContain("엑스포 시민광장");
    expect(names).toContain("카이스트 캠퍼스 산책로");
    expect(names).toContain("대덕연구단지 산책로");
  });

  it("중구: 남선공원, 대전 오월드 인근 산책로, 보문산 둘레길 (3개)", () => {
    const spots = getSpotsByDistrict("중구");
    expect(spots).toHaveLength(3);
    const names = spots.map((s) => s.name);
    expect(names).toContain("남선공원");
    expect(names).toContain("대전 오월드 인근 산책로");
    expect(names).toContain("보문산 둘레길");
  });

  it("동구: 대청호 오백리길 (1개)", () => {
    const spots = getSpotsByDistrict("동구");
    expect(spots).toHaveLength(1);
    expect(spots[0].name).toBe("대청호 오백리길");
  });

  it("대덕구: 계족산 황톳길, 동춘당공원 (2개)", () => {
    const spots = getSpotsByDistrict("대덕구");
    expect(spots).toHaveLength(2);
    const names = spots.map((s) => s.name);
    expect(names).toContain("계족산 황톳길");
    expect(names).toContain("동춘당공원");
  });

  it("존재하지 않는 구로 필터링하면 빈 배열 반환", () => {
    const spots = getSpotsByDistrict("세종시");
    expect(spots).toHaveLength(0);
  });
});

// ═══════════════════════════════════════════════
// 2. 워커 구별 분포 검증
// ═══════════════════════════════════════════════
describe("워커(MOCK_CARETAKERS) - 5개 구 분포 검증", () => {
  it("총 17명의 워커가 존재 (기존 12 + 시드 5)", () => {
    expect(MOCK_CARETAKERS).toHaveLength(17);
  });

  it("5개 구 모두에 워커가 1명 이상 존재", () => {
    FIVE_DISTRICTS.forEach((district) => {
      const workers = MOCK_CARETAKERS.filter((c) => c.district === district);
      expect(
        workers.length,
        `${district}에 워커가 없습니다`
      ).toBeGreaterThanOrEqual(1);
    });
  });

  it("서구 워커: 산책왕 준혁(둔산동), 도안동 현우 (2명)", () => {
    const workers = MOCK_CARETAKERS.filter((c) => c.district === "서구");
    expect(workers).toHaveLength(2);
    const names = workers.map((w) => w.nickname);
    expect(names).toContain("산책왕 준혁");
    expect(names).toContain("도안동 현우");
  });

  it("유성구 워커: 5명 (민지, 수빈, 지현, 태양, 하나)", () => {
    const workers = MOCK_CARETAKERS.filter((c) => c.district === "유성구");
    expect(workers).toHaveLength(5);
    const names = workers.map((w) => w.nickname);
    expect(names).toContain("강아지사랑 민지");
    expect(names).toContain("펫케어 수빈");
    expect(names).toContain("노은동 지현");
    expect(names).toContain("봉명동 태양");
    expect(names).toContain("훈련사 하나");
  });

  it("중구 워커: 대흥동 서연, 유천동 소희 (2명)", () => {
    const workers = MOCK_CARETAKERS.filter((c) => c.district === "중구");
    expect(workers).toHaveLength(2);
    const names = workers.map((w) => w.nickname);
    expect(names).toContain("대흥동 서연");
    expect(names).toContain("유천동 소희");
  });

  it("동구 워커: 판암동 동현 + 시드 워커 5명 (6명)", () => {
    const workers = MOCK_CARETAKERS.filter((c) => c.district === "동구");
    expect(workers).toHaveLength(6);
    const names = workers.map((w) => w.nickname);
    expect(names).toContain("판암동 동현");
    expect(names).toContain("자양동 하늘이맘");
    expect(names).toContain("가양동 뽀삐아빠");
  });

  it("대덕구 워커: 신탄진 유진, 송촌동 재민 (2명)", () => {
    const workers = MOCK_CARETAKERS.filter((c) => c.district === "대덕구");
    expect(workers).toHaveLength(2);
    const names = workers.map((w) => w.nickname);
    expect(names).toContain("신탄진 유진");
    expect(names).toContain("송촌동 재민");
  });
});

// ═══════════════════════════════════════════════
// 3. getDistrictFromNeighborhood() 매핑 검증
// ═══════════════════════════════════════════════
describe("getDistrictFromNeighborhood() - 동네→구 매핑 정확성", () => {
  const testCases: [string, string][] = [
    // 유성구
    ["궁동", "유성구"],
    ["봉명동", "유성구"],
    ["노은동", "유성구"],
    ["관평동", "유성구"],
    ["어은동", "유성구"],
    ["도룡동", "유성구"],
    ["전민동", "유성구"],
    ["덕명동", "유성구"],
    ["반석동", "유성구"],
    // 서구
    ["둔산동", "서구"],
    ["월평동", "서구"],
    ["갈마동", "서구"],
    ["탄방동", "서구"],
    ["도안동", "서구"],
    ["괴정동", "서구"],
    ["관저동", "서구"],
    // 중구
    ["대흥동", "중구"],
    ["유천동", "중구"],
    ["은행동", "중구"],
    ["오류동", "중구"],
    // 동구
    ["판암동", "동구"],
    ["인동", "동구"],
    ["대동", "동구"],
    // 대덕구
    ["신탄진동", "대덕구"],
    ["송촌동", "대덕구"],
    ["장동", "대덕구"],
  ];

  testCases.forEach(([neighborhood, expectedDistrict]) => {
    it(`${neighborhood} → ${expectedDistrict}`, () => {
      expect(getDistrictFromNeighborhood(neighborhood)).toBe(expectedDistrict);
    });
  });

  it("'동' 없는 축약형도 올바르게 매핑 (둔산→서구, 봉명→유성구)", () => {
    expect(getDistrictFromNeighborhood("둔산")).toBe("서구");
    expect(getDistrictFromNeighborhood("봉명")).toBe("유성구");
    expect(getDistrictFromNeighborhood("노은")).toBe("유성구");
    expect(getDistrictFromNeighborhood("관평")).toBe("유성구");
    expect(getDistrictFromNeighborhood("은행")).toBe("중구");
    expect(getDistrictFromNeighborhood("판암")).toBe("동구");
    expect(getDistrictFromNeighborhood("신탄진")).toBe("대덕구");
    expect(getDistrictFromNeighborhood("송촌")).toBe("대덕구");
  });

  it("구 이름 자체도 올바르게 반환", () => {
    FIVE_DISTRICTS.forEach((district) => {
      expect(getDistrictFromNeighborhood(district)).toBe(district);
    });
  });

  it("매핑에 없는 동네는 원래 값 그대로 반환", () => {
    expect(getDistrictFromNeighborhood("알수없는동")).toBe("알수없는동");
  });
});

// ═══════════════════════════════════════════════
// 4. 워커의 district 필드와 neighborhood→district 매핑 일치 검증
// ═══════════════════════════════════════════════
describe("워커 district 필드와 neighborhood 매핑 일치 검증", () => {
  it("모든 워커의 district 필드가 neighborhood 매핑과 일치", () => {
    MOCK_CARETAKERS.forEach((worker) => {
      if (worker.district) {
        const mapped = getDistrictFromNeighborhood(worker.neighborhood);
        expect(
          mapped,
          `워커 "${worker.nickname}" (${worker.neighborhood}): district="${worker.district}" vs mapped="${mapped}"`
        ).toBe(worker.district);
      }
    });
  });

  it("모든 워커에 district 필드가 존재", () => {
    MOCK_CARETAKERS.forEach((worker) => {
      expect(
        worker.district,
        `워커 "${worker.nickname}"에 district 필드가 없습니다`
      ).toBeTruthy();
    });
  });
});

// ═══════════════════════════════════════════════
// 5. getWalkersNearSpot() 검증
// ═══════════════════════════════════════════════
describe("getWalkersNearSpot() - 산책로 근처 워커 필터링", () => {
  it("서구 산책로 근처 워커 = 서구 워커", () => {
    const nearbyWorkers = getWalkersNearSpot("서구", MOCK_CARETAKERS);
    expect(nearbyWorkers.length).toBeGreaterThanOrEqual(1);
    nearbyWorkers.forEach((w) => {
      const d = w.district || getDistrictFromNeighborhood(w.neighborhood);
      expect(d).toBe("서구");
    });
  });

  it("유성구 산책로 근처 워커 = 유성구 워커", () => {
    const nearbyWorkers = getWalkersNearSpot("유성구", MOCK_CARETAKERS);
    expect(nearbyWorkers.length).toBeGreaterThanOrEqual(1);
    nearbyWorkers.forEach((w) => {
      const d = w.district || getDistrictFromNeighborhood(w.neighborhood);
      expect(d).toBe("유성구");
    });
  });

  it("중구 산책로 근처 워커 = 중구 워커", () => {
    const nearbyWorkers = getWalkersNearSpot("중구", MOCK_CARETAKERS);
    expect(nearbyWorkers.length).toBeGreaterThanOrEqual(1);
    nearbyWorkers.forEach((w) => {
      const d = w.district || getDistrictFromNeighborhood(w.neighborhood);
      expect(d).toBe("중구");
    });
  });

  it("동구 산책로 근처 워커 = 동구 워커", () => {
    const nearbyWorkers = getWalkersNearSpot("동구", MOCK_CARETAKERS);
    expect(nearbyWorkers.length).toBeGreaterThanOrEqual(1);
    nearbyWorkers.forEach((w) => {
      const d = w.district || getDistrictFromNeighborhood(w.neighborhood);
      expect(d).toBe("동구");
    });
  });

  it("대덕구 산책로 근처 워커 = 대덕구 워커", () => {
    const nearbyWorkers = getWalkersNearSpot("대덕구", MOCK_CARETAKERS);
    expect(nearbyWorkers.length).toBeGreaterThanOrEqual(1);
    nearbyWorkers.forEach((w) => {
      const d = w.district || getDistrictFromNeighborhood(w.neighborhood);
      expect(d).toBe("대덕구");
    });
  });
});

// ═══════════════════════════════════════════════
// 6. 홈 화면 filteredWalkers 로직 시뮬레이션
// ═══════════════════════════════════════════════
describe("홈 화면 filteredWalkers 로직 시뮬레이션", () => {
  // 홈 화면의 filteredWalkers 로직을 그대로 재현
  function simulateFilteredWalkers(selectedDistrict: string) {
    if (selectedDistrict === "전체") {
      return MOCK_CARETAKERS.filter((c) => c.isActive);
    }
    return MOCK_CARETAKERS.filter((c) => {
      const d = c.district || getDistrictFromNeighborhood(c.neighborhood);
      return d === selectedDistrict && c.isActive;
    });
  }

  it("'전체' 선택 시 활성 워커만 표시 (c3 수빈은 비활성이므로 제외)", () => {
    const result = simulateFilteredWalkers("전체");
    expect(result.length).toBe(MOCK_CARETAKERS.filter((c) => c.isActive).length);
    expect(result.find((w) => w.id === "c3")).toBeUndefined(); // 수빈은 isActive=false
  });

  it("서구 선택 시 서구 활성 워커만 표시", () => {
    const result = simulateFilteredWalkers("서구");
    expect(result.length).toBeGreaterThanOrEqual(1);
    result.forEach((w) => {
      expect(w.district).toBe("서구");
      expect(w.isActive).toBe(true);
    });
    const names = result.map((w) => w.nickname);
    expect(names).toContain("산책왕 준혁");
    expect(names).toContain("도안동 현우");
  });

  it("유성구 선택 시 유성구 활성 워커만 표시 (수빈 제외)", () => {
    const result = simulateFilteredWalkers("유성구");
    expect(result.length).toBeGreaterThanOrEqual(1);
    result.forEach((w) => {
      expect(w.district).toBe("유성구");
      expect(w.isActive).toBe(true);
    });
    // 수빈(c3)은 isActive=false이므로 제외
    expect(result.find((w) => w.id === "c3")).toBeUndefined();
    const names = result.map((w) => w.nickname);
    expect(names).toContain("강아지사랑 민지");
    expect(names).toContain("노은동 지현");
    expect(names).toContain("봉명동 태양");
    expect(names).toContain("훈련사 하나");
  });

  it("중구 선택 시 중구 활성 워커만 표시", () => {
    const result = simulateFilteredWalkers("중구");
    expect(result.length).toBe(2);
    const names = result.map((w) => w.nickname);
    expect(names).toContain("대흥동 서연");
    expect(names).toContain("유천동 소희");
  });

  it("동구 선택 시 동구 활성 워커만 표시 (6명: 판암동 동현 + 시드 5명)", () => {
    const result = simulateFilteredWalkers("동구");
    expect(result.length).toBe(6);
    const names = result.map((w) => w.nickname);
    expect(names).toContain("판암동 동현");
    expect(names).toContain("자양동 하늘이맘");
  });

  it("대덕구 선택 시 대덕구 활성 워커만 표시", () => {
    const result = simulateFilteredWalkers("대덕구");
    expect(result.length).toBe(2);
    const names = result.map((w) => w.nickname);
    expect(names).toContain("신탄진 유진");
    expect(names).toContain("송촌동 재민");
  });
});

// ═══════════════════════════════════════════════
// 7. 오늘의 추천 산책로 검증
// ═══════════════════════════════════════════════
describe("오늘의 추천 산책로", () => {
  it("추천 산책로가 12개 명소 중 하나", () => {
    const spot = getTodayRecommendedSpot();
    expect(DAEJEON_WALK_SPOTS).toContainEqual(spot);
  });

  it("추천 산책로가 5개 구 중 하나에 속함", () => {
    const spot = getTodayRecommendedSpot();
    expect(FIVE_DISTRICTS).toContain(spot.district);
  });

  it("추천 산책로에 필수 필드가 모두 존재", () => {
    const spot = getTodayRecommendedSpot();
    expect(spot.name).toBeTruthy();
    expect(spot.district).toBeTruthy();
    expect(spot.dong).toBeTruthy();
    expect(spot.latitude).toBeGreaterThan(36);
    expect(spot.longitude).toBeGreaterThan(127);
    expect(spot.rating).toBeGreaterThan(0);
    expect(spot.walkTime).toBeTruthy();
    expect(spot.features.length).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════════════
// 8. 구별 산책 명소 + 워커 수 요약
// ═══════════════════════════════════════════════
describe("구별 데이터 요약 (산책 명소 + 워커 수)", () => {
  const summary = FIVE_DISTRICTS.map((district) => {
    const spots = getSpotsByDistrict(district);
    const workers = MOCK_CARETAKERS.filter((c) => c.district === district);
    const activeWorkers = workers.filter((c) => c.isActive);
    return { district, spots: spots.length, workers: workers.length, activeWorkers: activeWorkers.length };
  });

  it("모든 구에 산책 명소와 워커가 존재", () => {
    summary.forEach(({ district, spots, workers }) => {
      expect(spots, `${district}: 산책 명소 0개`).toBeGreaterThan(0);
      expect(workers, `${district}: 워커 0명`).toBeGreaterThan(0);
    });
  });

  it("전체 산책 명소 합계 = 12", () => {
    const total = summary.reduce((sum, s) => sum + s.spots, 0);
    expect(total).toBe(12);
  });

  it("전체 워커 합계 = 17 (기존 12 + 시드 5)", () => {
    const total = summary.reduce((sum, s) => sum + s.workers, 0);
    expect(total).toBe(17);
  });

  it("활성 워커가 16명 (수빈 1명 비활성)", () => {
    const totalActive = summary.reduce((sum, s) => sum + s.activeWorkers, 0);
    expect(totalActive).toBe(16);
  });
});
