/**
 * 카카오맵 API 키 검증 테스트
 * JavaScript API 키는 클라이언트 사이드에서 사용되므로,
 * 키가 설정되어 있는지와 기본 형식을 검증합니다.
 */
import { describe, it, expect } from "vitest";

describe("Kakao Map API Key", () => {
  it("KAKAO_MAP_API_KEY 환경변수가 설정되어 있어야 함", () => {
    const key = process.env.KAKAO_MAP_API_KEY;
    expect(key).toBeDefined();
    expect(typeof key).toBe("string");
    expect(key!.length).toBeGreaterThan(0);
  });

  it("API 키가 빈 문자열이 아니어야 함", () => {
    const key = process.env.KAKAO_MAP_API_KEY;
    expect(key!.trim().length).toBeGreaterThan(0);
  });

  it("카카오맵 JavaScript SDK URL이 올바른 형식", () => {
    const key = process.env.KAKAO_MAP_API_KEY;
    const sdkUrl = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${key}&autoload=false`;
    expect(sdkUrl).toContain("dapi.kakao.com");
    expect(sdkUrl).toContain(key);
  });
});
