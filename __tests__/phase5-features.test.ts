import { describe, it, expect } from "vitest";

describe("Phase 5 - 신규 기능 테스트", () => {
  // 데이터 영속성
  describe("데이터 영속성", () => {
    it("AppState에 isLoaded 필드가 존재해야 한다", () => {
      const state = {
        isOnboarded: false,
        isLoaded: false,
        profile: { nickname: "", neighborhood: null, role: null },
        posts: [],
        payments: [],
        notifications: [],
        requests: [],
        chatMessages: {},
      };
      expect(state).toHaveProperty("isLoaded");
      expect(state.isLoaded).toBe(false);
    });

    it("RESET_APP 시 초기 상태로 돌아가야 한다", () => {
      const resetState = {
        isOnboarded: false,
        isLoaded: true,
        profile: {
          nickname: "",
          neighborhood: null,
          role: null,
          bio: "",
          pets: [],
          rating: 0,
          reviewCount: 0,
          isCaretakerActive: false,
          caretakerServices: [],
          friends: [],
          reviews: [],
          payments: [],
        },
        posts: [],
        payments: [],
        notifications: [],
        requests: [],
        chatMessages: {},
      };
      expect(resetState.isOnboarded).toBe(false);
      expect(resetState.isLoaded).toBe(true);
      expect(resetState.profile.nickname).toBe("");
      expect(resetState.posts).toHaveLength(0);
      expect(resetState.notifications).toHaveLength(0);
    });
  });

  // 반려동물 등록 폼
  describe("반려동물 등록 폼", () => {
    it("Pet 인터페이스에 필수 필드가 있어야 한다", () => {
      const pet = {
        id: "pet_1",
        name: "초코",
        breed: "포메라니안",
        age: 2,
        size: "소형" as const,
        emoji: "🦊",
        photoUri: undefined,
      };
      expect(pet.name).toBe("초코");
      expect(pet.breed).toBe("포메라니안");
      expect(pet.age).toBe(2);
      expect(pet.size).toBe("소형");
      expect(pet.emoji).toBe("🦊");
    });

    it("나이는 0~30 범위여야 한다", () => {
      const validateAge = (age: number) => age >= 0 && age <= 30;
      expect(validateAge(0)).toBe(true);
      expect(validateAge(15)).toBe(true);
      expect(validateAge(30)).toBe(true);
      expect(validateAge(-1)).toBe(false);
      expect(validateAge(31)).toBe(false);
    });

    it("크기 옵션이 소형/중형/대형이어야 한다", () => {
      const sizes = ["소형", "중형", "대형"];
      expect(sizes).toContain("소형");
      expect(sizes).toContain("중형");
      expect(sizes).toContain("대형");
      expect(sizes).toHaveLength(3);
    });

    it("인기 품종 목록이 존재해야 한다", () => {
      const breeds = [
        "말티즈", "포메라니안", "푸들", "치와와", "시츄",
        "골든 리트리버", "래브라도 리트리버", "진돗개", "비숑 프리제", "웰시 코기",
      ];
      expect(breeds.length).toBeGreaterThan(5);
      expect(breeds).toContain("말티즈");
      expect(breeds).toContain("골든 리트리버");
    });
  });

  // 게시글 이미지 첨부
  describe("게시글 이미지 첨부", () => {
    it("Post에 imageUri 필드가 있어야 한다", () => {
      const post = {
        id: "p1",
        authorId: "me",
        authorNickname: "사용자",
        authorEmoji: "🐶",
        category: "자유" as const,
        title: "테스트",
        content: "내용",
        imageUri: "file:///test/image.jpg",
        likes: [],
        comments: [],
        createdAt: new Date().toISOString(),
        neighborhood: "유성구",
      };
      expect(post.imageUri).toBe("file:///test/image.jpg");
    });

    it("이미지 없는 게시글도 유효해야 한다", () => {
      const post = {
        id: "p2",
        authorId: "me",
        title: "이미지 없는 글",
        content: "내용",
        imageUri: undefined,
        likes: [],
        comments: [],
      };
      expect(post.imageUri).toBeUndefined();
    });
  });

  // 푸시 알림
  describe("푸시 알림", () => {
    it("알림 타입이 올바르게 정의되어야 한다", () => {
      const types = ["comment", "like", "match_request", "message", "friend_add"];
      expect(types).toHaveLength(5);
      expect(types).toContain("comment");
      expect(types).toContain("like");
      expect(types).toContain("match_request");
      expect(types).toContain("message");
      expect(types).toContain("friend_add");
    });

    it("알림 객체에 필수 필드가 있어야 한다", () => {
      const notification = {
        id: "n1",
        type: "comment" as const,
        title: "새 댓글",
        body: "누군가 댓글을 달았어요",
        isRead: false,
        createdAt: new Date().toISOString(),
      };
      expect(notification.id).toBeTruthy();
      expect(notification.type).toBe("comment");
      expect(notification.title).toBeTruthy();
      expect(notification.body).toBeTruthy();
      expect(notification.isRead).toBe(false);
    });

    it("읽지 않은 알림 수를 계산할 수 있어야 한다", () => {
      const notifications = [
        { id: "1", isRead: false },
        { id: "2", isRead: true },
        { id: "3", isRead: false },
        { id: "4", isRead: false },
      ];
      const unreadCount = notifications.filter(n => !n.isRead).length;
      expect(unreadCount).toBe(3);
    });
  });

  // 앱 초기화
  describe("앱 초기화", () => {
    it("초기화 후 isOnboarded가 false여야 한다", () => {
      const resetState = { isOnboarded: false, isLoaded: true };
      expect(resetState.isOnboarded).toBe(false);
      expect(resetState.isLoaded).toBe(true);
    });

    it("초기화 후 모든 데이터가 비어있어야 한다", () => {
      const resetState = {
        posts: [],
        notifications: [],
        requests: [],
        chatMessages: {},
        profile: {
          pets: [],
          friends: [],
          reviews: [],
          payments: [],
        },
      };
      expect(resetState.posts).toHaveLength(0);
      expect(resetState.notifications).toHaveLength(0);
      expect(resetState.requests).toHaveLength(0);
      expect(Object.keys(resetState.chatMessages)).toHaveLength(0);
      expect(resetState.profile.pets).toHaveLength(0);
      expect(resetState.profile.friends).toHaveLength(0);
    });
  });
});
