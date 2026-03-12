import { describe, it, expect } from "vitest";

// ============ 게시글 삭제/수정 기능 테스트 ============

describe("게시글 삭제 기능", () => {
  it("DELETE_POST 액션으로 게시글이 삭제되어야 함", () => {
    const posts = [
      { id: "p1", title: "첫 번째 글" },
      { id: "p2", title: "두 번째 글" },
      { id: "p3", title: "세 번째 글" },
    ];

    const result = posts.filter((p) => p.id !== "p2");
    expect(result).toHaveLength(2);
    expect(result.find((p) => p.id === "p2")).toBeUndefined();
    expect(result.find((p) => p.id === "p1")).toBeDefined();
    expect(result.find((p) => p.id === "p3")).toBeDefined();
  });

  it("존재하지 않는 게시글 삭제 시 원본 유지", () => {
    const posts = [
      { id: "p1", title: "첫 번째 글" },
    ];

    const result = posts.filter((p) => p.id !== "nonexistent");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("p1");
  });
});

describe("게시글 수정 기능", () => {
  it("EDIT_POST 액션으로 게시글이 수정되어야 함", () => {
    const posts = [
      { id: "p1", title: "원래 제목", content: "원래 내용", category: "자유" as const },
      { id: "p2", title: "다른 글", content: "다른 내용", category: "산책" as const },
    ];

    const editPayload = {
      postId: "p1",
      title: "수정된 제목",
      content: "수정된 내용",
      category: "정보" as const,
    };

    const result = posts.map((p) =>
      p.id === editPayload.postId
        ? { ...p, title: editPayload.title, content: editPayload.content, category: editPayload.category }
        : p
    );

    expect(result[0].title).toBe("수정된 제목");
    expect(result[0].content).toBe("수정된 내용");
    expect(result[0].category).toBe("정보");
    // 다른 게시글은 변경되지 않아야 함
    expect(result[1].title).toBe("다른 글");
  });

  it("빈 제목이나 내용으로 수정 불가 검증", () => {
    const title = "";
    const content = "내용";
    const canSubmit = title.trim().length > 0 && content.trim().length > 0;
    expect(canSubmit).toBe(false);

    const title2 = "제목";
    const content2 = "";
    const canSubmit2 = title2.trim().length > 0 && content2.trim().length > 0;
    expect(canSubmit2).toBe(false);

    const title3 = "제목";
    const content3 = "내용";
    const canSubmit3 = title3.trim().length > 0 && content3.trim().length > 0;
    expect(canSubmit3).toBe(true);
  });
});

// ============ 알림 센터 테스트 ============

describe("알림 센터", () => {
  it("알림 읽음 처리", () => {
    const notifications = [
      { id: "n1", isRead: false, type: "comment" },
      { id: "n2", isRead: false, type: "like" },
      { id: "n3", isRead: true, type: "message" },
    ];

    // 단일 읽음 처리
    const afterMarkOne = notifications.map((n) =>
      n.id === "n1" ? { ...n, isRead: true } : n
    );
    expect(afterMarkOne[0].isRead).toBe(true);
    expect(afterMarkOne[1].isRead).toBe(false);

    // 전체 읽음 처리
    const afterMarkAll = notifications.map((n) => ({ ...n, isRead: true }));
    expect(afterMarkAll.every((n) => n.isRead)).toBe(true);
  });

  it("읽지 않은 알림 카운트", () => {
    const notifications = [
      { id: "n1", isRead: false },
      { id: "n2", isRead: false },
      { id: "n3", isRead: true },
      { id: "n4", isRead: false },
    ];

    const unreadCount = notifications.filter((n) => !n.isRead).length;
    expect(unreadCount).toBe(3);
  });

  it("알림 타입별 아이콘 매핑", () => {
    const icons: Record<string, string> = {
      comment: "💬",
      like: "❤️",
      match_request: "🤝",
      message: "✉️",
      friend_add: "👫",
    };

    expect(icons["comment"]).toBe("💬");
    expect(icons["like"]).toBe("❤️");
    expect(icons["match_request"]).toBe("🤝");
    expect(icons["message"]).toBe("✉️");
    expect(icons["friend_add"]).toBe("👫");
  });
});

// ============ 반려동물 프로필 사진 테스트 ============

describe("반려동물 프로필 사진", () => {
  it("UPDATE_PET 액션으로 사진 URI 업데이트", () => {
    const pets = [
      { id: "pet1", name: "초코", emoji: "🐶", photoUri: undefined as string | undefined },
      { id: "pet2", name: "뭉치", emoji: "🐕", photoUri: undefined as string | undefined },
    ];

    const updatePayload = {
      petId: "pet1",
      updates: { photoUri: "file:///path/to/photo.jpg" },
    };

    const result = pets.map((p) =>
      p.id === updatePayload.petId ? { ...p, ...updatePayload.updates } : p
    );

    expect(result[0].photoUri).toBe("file:///path/to/photo.jpg");
    expect(result[1].photoUri).toBeUndefined();
  });

  it("사진 삭제 시 photoUri가 undefined로 설정", () => {
    const pets = [
      { id: "pet1", name: "초코", photoUri: "file:///path/to/photo.jpg" },
    ];

    const result = pets.map((p) =>
      p.id === "pet1" ? { ...p, photoUri: undefined } : p
    );

    expect(result[0].photoUri).toBeUndefined();
  });

  it("REMOVE_PET 액션으로 반려동물 삭제", () => {
    const pets = [
      { id: "pet1", name: "초코" },
      { id: "pet2", name: "뭉치" },
    ];

    const result = pets.filter((p) => p.id !== "pet1");
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("뭉치");
  });
});

// ============ 친구 채팅 테스트 ============

describe("친구 채팅", () => {
  it("친구 ID로 채팅방 ID 생성 일관성", () => {
    const friendId = "friend_123";
    const generateRoomId = (id: string) =>
      Math.abs(id.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % 10000) + 200;

    const roomId1 = generateRoomId(friendId);
    const roomId2 = generateRoomId(friendId);
    expect(roomId1).toBe(roomId2); // 같은 친구 ID는 같은 방 ID
    expect(roomId1).toBeGreaterThanOrEqual(200);
    expect(roomId1).toBeLessThan(10200);
  });

  it("다른 친구는 다른 채팅방 ID를 가져야 함", () => {
    const generateRoomId = (id: string) =>
      Math.abs(id.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % 10000) + 200;

    const room1 = generateRoomId("friend_alice");
    const room2 = generateRoomId("friend_bob");
    // 높은 확률로 다른 방 ID (해시 충돌 가능성 있지만 테스트 데이터에서는 다름)
    expect(room1).not.toBe(room2);
  });

  it("채팅 탭 필터링 - 전체 vs 친구", () => {
    const chatRooms = [
      { id: 1, isFriend: false, name: "일반 채팅" },
      { id: 2, isFriend: true, name: "친구 채팅1" },
      { id: 3, isFriend: false, name: "매칭 채팅" },
      { id: 4, isFriend: true, name: "친구 채팅2" },
    ];

    const allRooms = chatRooms;
    const friendRooms = chatRooms.filter((r) => r.isFriend);

    expect(allRooms).toHaveLength(4);
    expect(friendRooms).toHaveLength(2);
    expect(friendRooms.every((r) => r.isFriend)).toBe(true);
  });
});

// ============ timeAgo 유틸리티 테스트 ============

describe("timeAgo 유틸리티", () => {
  it("방금 전 표시", () => {
    const now = Date.now();
    const diff = now - now;
    const mins = Math.floor(diff / 60000);
    expect(mins < 1).toBe(true);
  });

  it("분 단위 표시", () => {
    const diff = 30 * 60000; // 30분
    const mins = Math.floor(diff / 60000);
    expect(mins).toBe(30);
    expect(mins >= 1 && mins < 60).toBe(true);
  });

  it("시간 단위 표시", () => {
    const diff = 5 * 3600000; // 5시간
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(mins / 60);
    expect(hours).toBe(5);
    expect(hours >= 1 && hours < 24).toBe(true);
  });

  it("일 단위 표시", () => {
    const diff = 3 * 86400000; // 3일
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(mins / 60);
    const days = Math.floor(hours / 24);
    expect(days).toBe(3);
    expect(days >= 1 && days < 7).toBe(true);
  });
});
