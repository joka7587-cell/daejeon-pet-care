import { describe, it, expect } from "vitest";

describe("카카오맵 API 키 환경변수", () => {
  it("KAKAO_MAP_API_KEY 환경변수가 설정되어 있어야 한다", () => {
    const key = process.env.KAKAO_MAP_API_KEY;
    expect(key).toBeDefined();
    expect(typeof key).toBe("string");
    expect(key!.length).toBeGreaterThan(0);
  });

  it("서버의 /api/kakao-map-key 엔드포인트가 키를 반환해야 한다", async () => {
    const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL || "http://127.0.0.1:3000";
    const res = await fetch(`${baseUrl}/api/kakao-map-key`);
    expect(res.ok).toBe(true);
    const data = await res.json();
    expect(data.key).toBeDefined();
    expect(data.key.length).toBeGreaterThan(0);
  });
});
