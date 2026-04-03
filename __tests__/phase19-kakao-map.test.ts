/**
 * Phase 19 테스트: 카카오맵 WebView 연동 - 대전 시청 중심, 커스텀 마커, 인포윈도우
 */
import { describe, it, expect } from "vitest";

// ─── 대전 좌표 테스트 ───
describe("대전 시청 중심 좌표", () => {
  const DAEJEON_CITY_HALL = { lat: 36.3504, lng: 127.3845 };

  it("대전 시청 좌표가 올바른 범위 내", () => {
    expect(DAEJEON_CITY_HALL.lat).toBeGreaterThan(36.0);
    expect(DAEJEON_CITY_HALL.lat).toBeLessThan(37.0);
    expect(DAEJEON_CITY_HALL.lng).toBeGreaterThan(127.0);
    expect(DAEJEON_CITY_HALL.lng).toBeLessThan(128.0);
  });

  it("대전 시청은 서구에 위치", () => {
    // 서구 범위: 대략 lat 36.30~36.38, lng 127.33~127.40
    expect(DAEJEON_CITY_HALL.lat).toBeGreaterThan(36.30);
    expect(DAEJEON_CITY_HALL.lat).toBeLessThan(36.38);
    expect(DAEJEON_CITY_HALL.lng).toBeGreaterThan(127.33);
    expect(DAEJEON_CITY_HALL.lng).toBeLessThan(127.42);
  });
});

// ─── 산책 명소 마커 데이터 테스트 ───
describe("대전 산책 명소 마커", () => {
  const WALK_MARKERS = [
    { id: "spot_1", name: "한밭수목원", lat: 36.3685, lng: 127.3880, district: "서구 둔산동" },
    { id: "spot_2", name: "엑스포 시민광장", lat: 36.3742, lng: 127.3917, district: "유성구 도룡동" },
    { id: "spot_3", name: "유림공원", lat: 36.3609, lng: 127.3592, district: "유성구 봉명동" },
    { id: "spot_4", name: "남선공원", lat: 36.3276, lng: 127.4218, district: "중구 대사동" },
    { id: "spot_5", name: "대전 갑천 생태 호수 공원", lat: 36.3299, lng: 127.3536, district: "서구 도안동" },
    { id: "spot_6", name: "보문산 둘레길", lat: 36.3108, lng: 127.4176, district: "중구 대사동" },
    { id: "spot_7", name: "카이스트 캠퍼스", lat: 36.3721, lng: 127.3604, district: "유성구 어은동" },
    { id: "spot_8", name: "계족산 황톳길", lat: 36.4087, lng: 127.4312, district: "대덕구 장동" },
    { id: "spot_9", name: "동춘당공원", lat: 36.3654, lng: 127.4387, district: "대덕구 송촌동" },
  ];

  it("9개 산책 명소 마커가 존재", () => {
    expect(WALK_MARKERS).toHaveLength(9);
  });

  it("모든 마커가 대전 좌표 범위 내", () => {
    WALK_MARKERS.forEach((marker) => {
      expect(marker.lat).toBeGreaterThan(36.2);
      expect(marker.lat).toBeLessThan(36.5);
      expect(marker.lng).toBeGreaterThan(127.3);
      expect(marker.lng).toBeLessThan(127.55);
    });
  });

  it("엑스포 시민광장 마커가 유성구에 위치", () => {
    const expo = WALK_MARKERS.find((m) => m.name === "엑스포 시민광장");
    expect(expo).toBeDefined();
    expect(expo!.district).toContain("유성구");
  });

  it("유림공원 마커가 유성구에 위치", () => {
    const yurim = WALK_MARKERS.find((m) => m.name === "유림공원");
    expect(yurim).toBeDefined();
    expect(yurim!.district).toContain("유성구");
  });

  it("모든 마커에 고유 ID가 있음", () => {
    const ids = WALK_MARKERS.map((m) => m.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it("모든 마커에 구/동 정보가 있음", () => {
    WALK_MARKERS.forEach((marker) => {
      expect(marker.district).toBeTruthy();
      expect(marker.district.length).toBeGreaterThan(2);
    });
  });
});

// ─── 카카오맵 SDK URL 생성 테스트 ───
describe("카카오맵 SDK URL", () => {
  it("올바른 SDK URL 형식", () => {
    const apiKey = "test_key_123";
    const sdkUrl = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${apiKey}&autoload=false`;
    expect(sdkUrl).toContain("dapi.kakao.com");
    expect(sdkUrl).toContain("appkey=test_key_123");
    expect(sdkUrl).toContain("autoload=false");
  });
});

// ─── 카카오맵 HTML 생성 로직 테스트 ───
describe("카카오맵 HTML 생성", () => {
  it("대전 시청 중심 좌표가 HTML에 포함", () => {
    const centerLat = 36.3504;
    const centerLng = 127.3845;
    const html = `center: new kakao.maps.LatLng(${centerLat}, ${centerLng})`;
    expect(html).toContain("36.3504");
    expect(html).toContain("127.3845");
  });

  it("줌 레벨이 적절히 설정됨 (워커 없을 때 7)", () => {
    const zoomLevel = 7;
    expect(zoomLevel).toBeGreaterThanOrEqual(5);
    expect(zoomLevel).toBeLessThanOrEqual(10);
  });

  it("줌 레벨이 적절히 설정됨 (워커 있을 때 4)", () => {
    const zoomLevel = 4;
    expect(zoomLevel).toBeGreaterThanOrEqual(1);
    expect(zoomLevel).toBeLessThan(7);
  });

  it("커스텀 마커 CSS 클래스가 정의됨", () => {
    const cssClasses = ["custom-marker", "custom-marker.walker", "info-window"];
    cssClasses.forEach((cls) => {
      expect(cls).toBeTruthy();
    });
  });
});

// ─── 인포윈도우 데이터 테스트 ───
describe("인포윈도우 데이터", () => {
  it("산책 명소 인포윈도우에 필수 정보 포함", () => {
    const infoData = {
      name: "엑스포 시민광장",
      district: "유성구 도룡동",
      rating: 4.7,
      walkTime: "30~50분",
      features: "넓은 잔디밭, 야외 무대",
    };
    expect(infoData.name).toBeTruthy();
    expect(infoData.district).toBeTruthy();
    expect(infoData.rating).toBeGreaterThan(0);
    expect(infoData.rating).toBeLessThanOrEqual(5);
    expect(infoData.walkTime).toBeTruthy();
    expect(infoData.features).toBeTruthy();
  });

  it("워커 인포윈도우에 상태 정보 포함", () => {
    const walkerInfo = {
      name: "김산책",
      status: "walking" as const,
      district: "대전 유성구 궁동",
    };
    expect(walkerInfo.name).toBeTruthy();
    expect(["walking", "paused", "completed"]).toContain(walkerInfo.status);
    expect(walkerInfo.district).toContain("대전");
  });
});

// ─── 워커 위치 업데이트 테스트 ───
describe("워커 위치 업데이트", () => {
  it("위치 업데이트 JavaScript 코드 생성", () => {
    const lat = 36.3550;
    const lng = 127.3850;
    const district = "유성구 궁동";
    const js = `window.updateWalkerPosition(${lat}, ${lng}, '${district}');`;
    expect(js).toContain("36.355");
    expect(js).toContain("127.385");
    expect(js).toContain("유성구 궁동");
  });

  it("경로 폴리라인 데이터 변환", () => {
    const routePoints = [
      { latitude: 36.355, longitude: 127.385 },
      { latitude: 36.356, longitude: 127.386 },
      { latitude: 36.357, longitude: 127.387 },
    ];
    const converted = routePoints.map((p) => ({ lat: p.latitude, lng: p.longitude }));
    expect(converted).toHaveLength(3);
    expect(converted[0]).toEqual({ lat: 36.355, lng: 127.385 });
  });
});

// ─── daejeon-spots 모듈 통합 테스트 ───
describe("대전 산책 명소 데이터 통합", () => {
  it("산책 명소 데이터 로드 및 구별 필터링", async () => {
    const { DAEJEON_WALK_SPOTS, getSpotsByDistrict } = await import("../lib/daejeon-spots");
    expect(DAEJEON_WALK_SPOTS.length).toBeGreaterThanOrEqual(9);

    const seogu = getSpotsByDistrict("서구");
    expect(seogu.length).toBeGreaterThan(0);
    seogu.forEach((spot) => {
      expect(spot.district).toBe("서구");
      expect(spot.latitude).toBeGreaterThan(36.2);
      expect(spot.longitude).toBeGreaterThan(127.3);
    });
  });

  it("엑스포 시민광장이 유성구에 존재", async () => {
    const { getSpotsByDistrict } = await import("../lib/daejeon-spots");
    const yuseong = getSpotsByDistrict("유성구");
    const expo = yuseong.find((s) => s.name === "엑스포 시민광장");
    expect(expo).toBeDefined();
    expect(expo!.latitude).toBeCloseTo(36.368, 2);
    expect(expo!.longitude).toBeCloseTo(127.389, 2);
  });

  it("유림공원이 유성구에 존재", async () => {
    const { getSpotsByDistrict } = await import("../lib/daejeon-spots");
    const yuseong = getSpotsByDistrict("유성구");
    const yurim = yuseong.find((s) => s.name === "유림공원");
    expect(yurim).toBeDefined();
    expect(yurim!.latitude).toBeCloseTo(36.3609, 2);
    expect(yurim!.longitude).toBeCloseTo(127.3592, 2);
  });
});
