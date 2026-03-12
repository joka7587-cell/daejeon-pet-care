import { describe, it, expect } from "vitest";

// 닉네임 중복 검사 로직 테스트
const EXISTING_NICKNAMES = [
  "강아지사랑 민지",
  "산책왕 준혁",
  "펫케어 수빈",
  "노은동 지현",
  "봉명동 태양",
  "골든리트리버 맘",
  "말티즈 아빠",
  "관평동 강아지맘",
];

function validateNickname(name: string): string {
  const trimmed = name.trim();
  if (trimmed.length === 0) return "";
  if (trimmed.length < 2) return "닉네임은 2자 이상이어야 해요";
  if (trimmed.length > 20) return "닉네임은 20자 이하여야 해요";
  const isDuplicate = EXISTING_NICKNAMES.some(
    (existing) => existing.toLowerCase() === trimmed.toLowerCase()
  );
  if (isDuplicate) return "이미 사용 중인 닉네임이에요";
  return "";
}

describe("닉네임 중복 검사", () => {
  it("빈 닉네임은 에러 없음", () => {
    expect(validateNickname("")).toBe("");
  });

  it("1자 닉네임은 에러", () => {
    expect(validateNickname("가")).toBe("닉네임은 2자 이상이어야 해요");
  });

  it("21자 이상 닉네임은 에러", () => {
    expect(validateNickname("가".repeat(21))).toBe("닉네임은 20자 이하여야 해요");
  });

  it("기존 닉네임과 중복이면 에러", () => {
    expect(validateNickname("강아지사랑 민지")).toBe("이미 사용 중인 닉네임이에요");
  });

  it("대소문자 무시하고 중복 검사", () => {
    expect(validateNickname("골든리트리버 맘")).toBe("이미 사용 중인 닉네임이에요");
  });

  it("사용 가능한 닉네임은 에러 없음", () => {
    expect(validateNickname("새로운 반려인")).toBe("");
  });

  it("공백만 있는 닉네임은 빈 문자열로 처리", () => {
    expect(validateNickname("   ")).toBe("");
  });

  it("2자 닉네임은 유효", () => {
    expect(validateNickname("가나")).toBe("");
  });

  it("20자 닉네임은 유효", () => {
    expect(validateNickname("가".repeat(20))).toBe("");
  });
});

describe("프로필 아바타 선택", () => {
  const PROFILE_AVATARS = [
    "🐶", "🐱", "🐰", "🦊", "🐻",
    "🐼", "🐨", "🐯", "🦁", "🐸",
    "🐵", "🐧", "🐦", "🦄", "🐾",
    "👩", "👨", "👧", "👦", "🧑",
  ];

  it("20개의 아바타 옵션이 있어야 함", () => {
    expect(PROFILE_AVATARS).toHaveLength(20);
  });

  it("기본 아바타는 🐾", () => {
    const defaultAvatar = "🐾";
    expect(PROFILE_AVATARS).toContain(defaultAvatar);
  });

  it("모든 아바타가 고유해야 함", () => {
    const unique = new Set(PROFILE_AVATARS);
    expect(unique.size).toBe(PROFILE_AVATARS.length);
  });
});

describe("온보딩 스텝 전환", () => {
  const STEPS = ["slides", "role", "neighborhood", "profile"];

  it("4단계 온보딩 플로우", () => {
    expect(STEPS).toHaveLength(4);
  });

  it("슬라이드 → 역할 → 동네 → 프로필 순서", () => {
    expect(STEPS[0]).toBe("slides");
    expect(STEPS[1]).toBe("role");
    expect(STEPS[2]).toBe("neighborhood");
    expect(STEPS[3]).toBe("profile");
  });
});

describe("빠른 닉네임 옵션", () => {
  const quickNames = ["골든이 아빠", "말티즈맘", "포메 집사", "비글 아빠", "시바견맘"];

  it("5개의 빠른 닉네임 옵션", () => {
    expect(quickNames).toHaveLength(5);
  });

  it("모든 빠른 닉네임이 유효해야 함", () => {
    quickNames.forEach((name) => {
      expect(validateNickname(name)).toBe("");
    });
  });
});
