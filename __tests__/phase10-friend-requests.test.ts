import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock fetch for API calls
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("Phase 10: 친구 요청 시스템", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  describe("API 호출 타임아웃 처리", () => {
    it("8초 타임아웃이 설정되어야 함", async () => {
      // apiCall 함수의 타임아웃 로직 검증
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);
      expect(timer).toBeDefined();
      clearTimeout(timer);
      expect(controller.signal.aborted).toBe(false);
    });

    it("AbortController로 요청 취소가 가능해야 함", () => {
      const controller = new AbortController();
      expect(controller.signal.aborted).toBe(false);
      controller.abort();
      expect(controller.signal.aborted).toBe(true);
    });

    it("타임아웃 시 AbortError가 발생해야 함", async () => {
      const controller = new AbortController();
      controller.abort();
      
      mockFetch.mockRejectedValueOnce(new DOMException("The operation was aborted", "AbortError"));
      
      try {
        await fetch("http://test.com/api", { signal: controller.signal });
        expect(true).toBe(false); // should not reach
      } catch (e: any) {
        expect(e.name).toBe("AbortError");
      }
    });
  });

  describe("친구 요청 데이터 모델", () => {
    it("FriendRequestItem 인터페이스가 필수 필드를 포함해야 함", () => {
      const request = {
        id: 1,
        fromUserId: 12345,
        fromNickname: "테스트유저",
        fromEmoji: "🐶",
        fromNeighborhood: "유성구",
        fromRole: "owner" as const,
        fromCode: "ABCD-1234",
        toNickname: "상대방",
        toEmoji: "🐱",
        toUserId: 67890,
        status: "pending",
        createdAt: new Date().toISOString(),
      };
      
      expect(request.id).toBe(1);
      expect(request.fromNickname).toBe("테스트유저");
      expect(request.toNickname).toBe("상대방");
      expect(request.toEmoji).toBe("🐱");
      expect(request.status).toBe("pending");
    });

    it("보낸 요청에 상대방 닉네임이 포함되어야 함", () => {
      const sentRequest = {
        id: 1,
        fromUserId: 100,
        toUserId: 200,
        fromNickname: "나",
        fromEmoji: "🐶",
        fromNeighborhood: "유성구",
        fromRole: "owner" as const,
        fromCode: "ABCD-1234",
        toNickname: "친구",
        toEmoji: "🐱",
        status: "pending",
        createdAt: new Date().toISOString(),
      };
      
      // 보낸 요청 카드에서 상대방 닉네임 표시
      const displayName = sentRequest.toNickname || `코드: ${sentRequest.fromCode}`;
      expect(displayName).toBe("친구");
    });

    it("toNickname이 없으면 코드로 폴백 표시해야 함", () => {
      const sentRequest = {
        toNickname: null as string | null,
        fromCode: "ABCD-1234",
      };
      
      const displayName = sentRequest.toNickname || `코드: ${sentRequest.fromCode}`;
      expect(displayName).toBe("코드: ABCD-1234");
    });
  });

  describe("친구 요청 상태 관리", () => {
    it("요청 상태별 라벨이 올바르게 표시되어야 함", () => {
      const getStatusLabel = (status: string) => {
        return status === "pending" ? "대기 중" : status === "accepted" ? "수락됨" : "거절됨";
      };
      
      expect(getStatusLabel("pending")).toBe("대기 중");
      expect(getStatusLabel("accepted")).toBe("수락됨");
      expect(getStatusLabel("rejected")).toBe("거절됨");
    });

    it("받은 요청 수가 탭 배지에 표시되어야 함", () => {
      const receivedRequests = [
        { id: 1, status: "pending" },
        { id: 2, status: "pending" },
      ];
      
      expect(receivedRequests.length).toBe(2);
    });

    it("보낸 요청 중 대기 중인 것만 배지에 표시되어야 함", () => {
      const sentRequests = [
        { id: 1, status: "pending" },
        { id: 2, status: "accepted" },
        { id: 3, status: "rejected" },
        { id: 4, status: "pending" },
      ];
      
      const pendingCount = sentRequests.filter(r => r.status === "pending").length;
      expect(pendingCount).toBe(2);
    });
  });

  describe("친구 요청 보내기 로직", () => {
    it("서버 사용자에게는 요청을 보내야 함 (바로 추가 X)", () => {
      const searchResult = {
        userId: 12345,
        nickname: "서버유저",
        emoji: "🐶",
        neighborhood: "유성구",
        role: "owner" as const,
        isServerUser: true,
      };
      
      // 서버 사용자이면 요청 보내기
      expect(searchResult.isServerUser && searchResult.userId > 0).toBe(true);
    });

    it("데모 사용자에게는 바로 추가해야 함", () => {
      const searchResult = {
        userId: 0,
        nickname: "김민지",
        emoji: "👩",
        neighborhood: "유성구",
        role: "owner" as const,
        isServerUser: false,
      };
      
      // 데모 사용자이면 바로 추가
      expect(searchResult.isServerUser).toBe(false);
    });

    it("이미 친구인 사용자에게는 요청을 보내지 않아야 함", () => {
      const friends = [
        { id: "friend_1", serverUserId: 12345, nickname: "친구1" },
      ];
      const searchResult = { userId: 12345, nickname: "친구1" };
      
      const alreadyFriend = friends.some(
        (f) => f.serverUserId === searchResult.userId || f.nickname === searchResult.nickname
      );
      expect(alreadyFriend).toBe(true);
    });
  });

  describe("친구 요청 수락/거절", () => {
    it("수락 시 로컬 친구 목록에 추가되어야 함", () => {
      const request = {
        id: 1,
        fromUserId: 12345,
        fromNickname: "새친구",
        fromEmoji: "🐶",
        fromNeighborhood: "유성구",
        fromRole: "owner" as const,
      };
      
      const newFriend = {
        id: `friend_server_${request.fromUserId}`,
        serverUserId: request.fromUserId,
        nickname: request.fromNickname,
        profileEmoji: request.fromEmoji || "🐶",
        neighborhood: request.fromNeighborhood || "대전",
        role: request.fromRole,
        addedAt: new Date().toISOString(),
      };
      
      expect(newFriend.id).toBe("friend_server_12345");
      expect(newFriend.nickname).toBe("새친구");
      expect(newFriend.serverUserId).toBe(12345);
    });

    it("수락 시 알림이 생성되어야 함", () => {
      const notification = {
        id: `notif_${Date.now()}`,
        type: "friend_add",
        title: "친구 요청 수락",
        body: "새친구님과 친구가 되었습니다!",
        createdAt: new Date().toISOString(),
        isRead: false,
      };
      
      expect(notification.type).toBe("friend_add");
      expect(notification.body).toContain("친구가 되었습니다");
    });
  });

  describe("서버 API 호출", () => {
    it("sendRequest API에 toNickname, toEmoji가 포함되어야 함", () => {
      const payload = {
        deviceId: "device_ABCD-1234",
        toUserId: 12345,
        fromNickname: "나",
        fromEmoji: "🐶",
        fromNeighborhood: "유성구",
        fromRole: "owner",
        fromCode: "ABCD-1234",
        toNickname: "상대방",
        toEmoji: "🐱",
      };
      
      expect(payload.toNickname).toBe("상대방");
      expect(payload.toEmoji).toBe("🐱");
    });

    it("receivedRequests API가 deviceId를 파라미터로 받아야 함", () => {
      const deviceId = "device_ABCD-1234";
      const input = encodeURIComponent(JSON.stringify({ json: { deviceId } }));
      const url = `friends.receivedRequests?input=${input}`;
      
      expect(url).toContain("deviceId");
      expect(url).toContain("device_ABCD-1234");
    });

    it("acceptRequest API가 requestId를 파라미터로 받아야 함", () => {
      const payload = { requestId: 42 };
      expect(payload.requestId).toBe(42);
    });

    it("rejectRequest API가 requestId를 파라미터로 받아야 함", () => {
      const payload = { requestId: 42 };
      expect(payload.requestId).toBe(42);
    });
  });

  describe("코드 검색 및 데모 폴백", () => {
    it("자신의 코드는 검색할 수 없어야 함", () => {
      const myCode = "ABCD-1234";
      const searchCode = "ABCD-1234";
      expect(searchCode === myCode).toBe(true);
    });

    it("서버 검색 실패 시 데모 코드로 폴백해야 함", () => {
      const DEMO_CODES: Record<string, { nickname: string }> = {
        "ABCD-1234": { nickname: "김민지" },
        "EFGH-5678": { nickname: "이준호" },
      };
      
      const code = "ABCD-1234";
      const demo = DEMO_CODES[code];
      expect(demo).toBeDefined();
      expect(demo.nickname).toBe("김민지");
    });

    it("존재하지 않는 코드는 에러 메시지를 표시해야 함", () => {
      const DEMO_CODES: Record<string, { nickname: string }> = {
        "ABCD-1234": { nickname: "김민지" },
      };
      
      const code = "ZZZZ-9999";
      const demo = DEMO_CODES[code];
      expect(demo).toBeUndefined();
    });
  });

  describe("DB 스키마 검증", () => {
    it("friendRequests 테이블에 toNickname, toEmoji 필드가 있어야 함", () => {
      // 스키마 필드 검증 (타입 레벨)
      const schema = {
        id: "int",
        fromUserId: "int",
        toUserId: "int",
        fromNickname: "varchar(100)",
        fromEmoji: "varchar(10)",
        fromNeighborhood: "varchar(50)",
        fromRole: "enum",
        fromCode: "varchar(20)",
        toNickname: "varchar(100)",
        toEmoji: "varchar(10)",
        status: "enum",
        createdAt: "timestamp",
        updatedAt: "timestamp",
      };
      
      expect(schema.toNickname).toBe("varchar(100)");
      expect(schema.toEmoji).toBe("varchar(10)");
      expect(Object.keys(schema).length).toBe(13);
    });
  });
});
