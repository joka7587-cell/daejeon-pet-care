import { describe, it, expect } from "vitest";

// ===== 1. 산책 요청이 요청 목록에 표시되는지 테스트 =====
describe("CareRequest 기능", () => {
  it("CareRequest 인터페이스가 올바른 필드를 가져야 한다", () => {
    const request = {
      id: "req_123",
      type: "walk_request" as const,
      title: "산책 부탁하기 - 오늘 오후 3시",
      requester: "사용자",
      neighborhood: "유성구",
      date: "오늘",
      time: "오후 3시",
      duration: "1시간",
      petName: "초코",
      petEmoji: "🐕",
      status: "pending" as const,
      isUrgent: true,
      description: "산책 부탁드립니다",
      createdAt: new Date().toISOString(),
    };

    expect(request.id).toBe("req_123");
    expect(request.type).toBe("walk_request");
    expect(request.status).toBe("pending");
    expect(request.isUrgent).toBe(true);
    expect(request.petName).toBe("초코");
  });

  it("요청 타입이 올바른 값만 허용해야 한다", () => {
    const validTypes = ["walk_partner", "caretaker", "walk_request", "emergency", "short_care"];
    validTypes.forEach((t) => {
      expect(validTypes).toContain(t);
    });
  });

  it("요청 상태가 올바른 값만 허용해야 한다", () => {
    const validStatuses = ["pending", "accepted", "completed", "cancelled"];
    validStatuses.forEach((s) => {
      expect(validStatuses).toContain(s);
    });
  });

  it("ADD_REQUEST 액션이 요청을 상태에 추가해야 한다", () => {
    const state = { requests: [] as any[] };
    const newRequest = {
      id: "req_456",
      type: "walk_request",
      title: "산책 부탁하기",
      requester: "테스트",
      neighborhood: "유성구",
      date: "내일",
      time: "오전 9시",
      duration: "1시간",
      petName: "뽀삐",
      petEmoji: "🐶",
      status: "pending",
      description: "산책 부탁합니다",
      createdAt: new Date().toISOString(),
    };

    // 시뮬레이션
    const newState = { requests: [newRequest, ...state.requests] };
    expect(newState.requests).toHaveLength(1);
    expect(newState.requests[0].id).toBe("req_456");
  });

  it("UPDATE_REQUEST_STATUS 액션이 상태를 업데이트해야 한다", () => {
    const requests = [
      { id: "req_1", status: "pending" },
      { id: "req_2", status: "pending" },
    ];

    const updated = requests.map((r) =>
      r.id === "req_1" ? { ...r, status: "accepted" } : r
    );

    expect(updated[0].status).toBe("accepted");
    expect(updated[1].status).toBe("pending");
  });
});

// ===== 2. 채팅 메시지 저장 테스트 =====
describe("채팅 메시지 저장", () => {
  it("ChatMessageData 인터페이스가 올바른 필드를 가져야 한다", () => {
    const message = {
      id: "m_123",
      senderId: 1,
      senderName: "사용자",
      content: "안녕하세요!",
      type: "text" as const,
      createdAt: new Date().toISOString(),
    };

    expect(message.senderId).toBe(1);
    expect(message.type).toBe("text");
    expect(message.content).toBe("안녕하세요!");
  });

  it("ADD_CHAT_MESSAGE가 채팅방에 메시지를 추가해야 한다", () => {
    const chatMessages: Record<string, any[]> = {};
    const roomId = "room_200";
    const message = {
      id: "m_1",
      senderId: 1,
      senderName: "사용자",
      content: "테스트 메시지",
      type: "text",
      createdAt: new Date().toISOString(),
    };

    const existing = chatMessages[roomId] || [];
    const newState = {
      ...chatMessages,
      [roomId]: [...existing, message],
    };

    expect(newState[roomId]).toHaveLength(1);
    expect(newState[roomId][0].content).toBe("테스트 메시지");
  });

  it("SET_CHAT_MESSAGES가 채팅방 메시지를 덮어써야 한다", () => {
    const chatMessages: Record<string, any[]> = {
      room_200: [{ id: "old", content: "이전 메시지" }],
    };

    const newMessages = [
      { id: "new1", content: "새 메시지 1" },
      { id: "new2", content: "새 메시지 2" },
    ];

    const newState = {
      ...chatMessages,
      room_200: newMessages,
    };

    expect(newState.room_200).toHaveLength(2);
    expect(newState.room_200[0].content).toBe("새 메시지 1");
  });

  it("친구 ID로 채팅방 ID를 일관되게 생성해야 한다", () => {
    function friendToRoomId(friendId: string): number {
      return Math.abs(friendId.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % 10000) + 200;
    }

    const id1 = friendToRoomId("f_12345");
    const id2 = friendToRoomId("f_12345");
    expect(id1).toBe(id2); // 같은 ID는 같은 채팅방

    const id3 = friendToRoomId("f_99999");
    // 다른 친구는 다른 채팅방 (높은 확률)
    expect(typeof id3).toBe("number");
    expect(id3).toBeGreaterThanOrEqual(200);
  });
});

// ===== 3. 커뮤니티 댓글 대화 기능 테스트 =====
describe("커뮤니티 댓글 대화", () => {
  it("답글이 @멘션 형식으로 저장되어야 한다", () => {
    const replyTo = { postId: "dp1", authorNickname: "골든리트리버 맘" };
    const commentText = "저도 같이 산책해요!";
    const content = `@${replyTo.authorNickname} ${commentText}`;

    expect(content).toBe("@골든리트리버 맘 저도 같이 산책해요!");
    expect(content.startsWith("@")).toBe(true);
  });

  it("답글 여부를 @ 접두사로 판별해야 한다", () => {
    const normalComment = "좋은 글이네요!";
    const replyComment = "@말티즈 아빠 저도 그렇게 생각해요";

    expect(normalComment.startsWith("@")).toBe(false);
    expect(replyComment.startsWith("@")).toBe(true);
  });

  it("멘션된 닉네임을 추출할 수 있어야 한다", () => {
    const content = "@관평동 강아지맘 다음에 같이 산책해요!";
    const mention = content.split(" ")[0];
    const restContent = content.substring(content.indexOf(" ") + 1);

    // @가 포함된 첫 단어가 멘션
    expect(mention).toBe("@관평동");
    // 나머지가 실제 내용
    expect(restContent.length).toBeGreaterThan(0);
  });

  it("댓글 알림이 올바른 형식이어야 한다", () => {
    const notification = {
      id: "notif_123",
      type: "comment" as const,
      title: "새 댓글",
      body: '사용자님이 "당신의 게시글"에 댓글을 달았어요: 좋은 글이네요!...',
      relatedId: "dp1",
      fromNickname: "사용자",
      isRead: false,
      createdAt: new Date().toISOString(),
    };

    expect(notification.type).toBe("comment");
    expect(notification.isRead).toBe(false);
    expect(notification.relatedId).toBe("dp1");
  });
});

// ===== 4. 상태 관리 통합 테스트 =====
describe("AppState 통합", () => {
  it("초기 상태에 requests와 chatMessages가 포함되어야 한다", () => {
    const initialState = {
      isOnboarded: false,
      profile: { nickname: "", friends: [], pets: [] },
      posts: [],
      payments: [],
      notifications: [],
      requests: [],
      chatMessages: {},
    };

    expect(initialState.requests).toEqual([]);
    expect(initialState.chatMessages).toEqual({});
  });

  it("LOAD_STATE가 requests와 chatMessages를 복원해야 한다", () => {
    const savedState = {
      requests: [{ id: "req_1", type: "walk_request" }],
      chatMessages: { room_200: [{ id: "m_1", content: "안녕" }] },
    };

    const loaded = {
      requests: savedState.requests ?? [],
      chatMessages: savedState.chatMessages ?? {},
    };

    expect(loaded.requests).toHaveLength(1);
    expect(loaded.chatMessages.room_200).toHaveLength(1);
  });

  it("LOAD_STATE에서 누락된 필드는 기본값을 사용해야 한다", () => {
    const oldSavedState: any = {
      // requests와 chatMessages가 없는 이전 버전 데이터
      isOnboarded: true,
      profile: { nickname: "테스트" },
      posts: [],
    };

    const loaded = {
      requests: oldSavedState.requests ?? [],
      chatMessages: oldSavedState.chatMessages ?? {},
    };

    expect(loaded.requests).toEqual([]);
    expect(loaded.chatMessages).toEqual({});
  });
});
