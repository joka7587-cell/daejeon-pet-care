import { describe, it, expect } from "vitest";
import {
  DAEJEON_WALK_SPOTS,
  getTodayRecommendedSpot,
  getSpotsByDistrict,
  getWalkersNearSpot,
  getDistrictFromNeighborhood,
} from "../lib/daejeon-spots";
import { MOCK_CARETAKERS } from "../lib/mock-data";

describe("대전 산책 명소 데이터", () => {
  it("산책 명소 데이터가 존재한다", () => {
    expect(DAEJEON_WALK_SPOTS.length).toBeGreaterThan(0);
  });

  it("모든 명소에 필수 필드가 있다", () => {
    for (const spot of DAEJEON_WALK_SPOTS) {
      expect(spot.id).toBeTruthy();
      expect(spot.name).toBeTruthy();
      expect(spot.district).toBeTruthy();
      expect(spot.dong).toBeTruthy();
      expect(spot.emoji).toBeTruthy();
      expect(spot.latitude).toBeGreaterThan(0);
      expect(spot.longitude).toBeGreaterThan(0);
      expect(spot.rating).toBeGreaterThanOrEqual(0);
      expect(spot.rating).toBeLessThanOrEqual(5);
      expect(spot.walkTime).toBeTruthy();
      expect(["쉬움", "보통", "어려움"]).toContain(spot.difficulty);
    }
  });

  it("대전 5개 구에 모두 명소가 있다", () => {
    const districts = ["서구", "유성구", "중구", "동구", "대덕구"];
    for (const d of districts) {
      const spots = getSpotsByDistrict(d);
      expect(spots.length).toBeGreaterThan(0);
    }
  });
});

describe("getTodayRecommendedSpot", () => {
  it("유효한 산책 명소를 반환한다", () => {
    const spot = getTodayRecommendedSpot();
    expect(spot).toBeDefined();
    expect(spot.name).toBeTruthy();
    expect(spot.district).toBeTruthy();
  });
});

describe("getSpotsByDistrict", () => {
  it("서구 명소만 필터링한다", () => {
    const spots = getSpotsByDistrict("서구");
    expect(spots.length).toBeGreaterThan(0);
    for (const s of spots) {
      expect(s.district).toBe("서구");
    }
  });

  it("유성구 명소만 필터링한다", () => {
    const spots = getSpotsByDistrict("유성구");
    expect(spots.length).toBeGreaterThan(0);
    for (const s of spots) {
      expect(s.district).toBe("유성구");
    }
  });

  it("존재하지 않는 구는 빈 배열을 반환한다", () => {
    const spots = getSpotsByDistrict("없는구");
    expect(spots).toHaveLength(0);
  });
});

describe("getDistrictFromNeighborhood", () => {
  it("둔산동 -> 서구", () => {
    expect(getDistrictFromNeighborhood("둔산동")).toBe("서구");
  });

  it("궁동 -> 유성구", () => {
    expect(getDistrictFromNeighborhood("궁동")).toBe("유성구");
  });

  it("대흥동 -> 중구", () => {
    expect(getDistrictFromNeighborhood("대흥동")).toBe("중구");
  });

  it("판암동 -> 동구", () => {
    expect(getDistrictFromNeighborhood("판암동")).toBe("동구");
  });

  it("신탄진동 -> 대덕구", () => {
    expect(getDistrictFromNeighborhood("신탄진동")).toBe("대덕구");
  });
});

describe("getWalkersNearSpot", () => {
  it("서구 명소 근처 워커를 찾는다", () => {
    const walkers = getWalkersNearSpot("서구", MOCK_CARETAKERS);
    expect(walkers.length).toBeGreaterThan(0);
    for (const w of walkers) {
      const d = w.district || getDistrictFromNeighborhood(w.neighborhood);
      expect(d).toBe("서구");
    }
  });

  it("유성구 명소 근처 워커를 찾는다", () => {
    const walkers = getWalkersNearSpot("유성구", MOCK_CARETAKERS);
    expect(walkers.length).toBeGreaterThan(0);
  });
});

describe("워커 카드 데이터 구조", () => {
  it("모든 워커에 필수 필드가 있다", () => {
    for (const w of MOCK_CARETAKERS) {
      expect(w.id).toBeTruthy();
      expect(w.nickname).toBeTruthy();
      expect(w.neighborhood).toBeTruthy();
      expect(w.profileEmoji).toBeTruthy();
      expect(w.rating).toBeGreaterThanOrEqual(0);
      expect(w.rating).toBeLessThanOrEqual(5);
    }
  });

  it("일부 워커에 specialBadge가 있다", () => {
    const withBadge = MOCK_CARETAKERS.filter((w) => w.specialBadge);
    expect(withBadge.length).toBeGreaterThan(0);
  });

  it("일부 워커에 pricePerHour가 있다", () => {
    const withPrice = MOCK_CARETAKERS.filter((w) => w.pricePerHour);
    expect(withPrice.length).toBeGreaterThan(0);
  });

  it("대전 5개 구에 모두 워커가 있다", () => {
    const districts = ["서구", "유성구", "중구", "동구", "대덕구"];
    for (const d of districts) {
      const walkers = MOCK_CARETAKERS.filter(
        (w) => (w.district || getDistrictFromNeighborhood(w.neighborhood)) === d
      );
      expect(walkers.length).toBeGreaterThan(0);
    }
  });
});

describe("ChatMessageData location 타입 호환성", () => {
  it("location 메시지 데이터를 생성할 수 있다", () => {
    const spot = DAEJEON_WALK_SPOTS[0];
    const locationMsg = {
      id: "test_loc_1",
      senderId: 1,
      senderName: "테스트",
      content: `📍 ${spot.name} (${spot.district} ${spot.dong})`,
      type: "location" as const,
      locationData: {
        spotId: spot.id,
        name: spot.name,
        district: spot.district,
        dong: spot.dong,
        emoji: spot.emoji,
        rating: spot.rating,
        walkTime: spot.walkTime,
        latitude: spot.latitude,
        longitude: spot.longitude,
      },
      createdAt: new Date().toISOString(),
    };

    expect(locationMsg.type).toBe("location");
    expect(locationMsg.locationData).toBeDefined();
    expect(locationMsg.locationData.name).toBe(spot.name);
    expect(locationMsg.locationData.latitude).toBeGreaterThan(0);
    expect(locationMsg.locationData.longitude).toBeGreaterThan(0);
  });
});
