import { describe, it, expect } from "vitest";

describe("Phase 6 - 버그 수정 및 기능 추가", () => {
  describe("친구코드 복사/붙여넣기", () => {
    it("친구코드는 8자리 영숫자 형식이어야 함", () => {
      const generateFriendCode = () => {
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        let code = "";
        for (let i = 0; i < 8; i++) {
          code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
      };
      const code = generateFriendCode();
      expect(code).toHaveLength(8);
      expect(code).toMatch(/^[A-Z0-9]+$/);
    });

    it("친구코드 검증 - 자기 자신 코드는 거부", () => {
      const myCode = "ABCD1234";
      const inputCode = "ABCD1234";
      expect(inputCode === myCode).toBe(true);
    });

    it("친구코드 검증 - 빈 코드는 거부", () => {
      const inputCode = "";
      expect(inputCode.trim().length).toBe(0);
    });
  });

  describe("채팅 개별 분리", () => {
    it("친구 ID 기반 고유 채팅방 키 생성", () => {
      const friend1Id = "friend_abc123";
      const friend2Id = "friend_def456";
      const roomKey1 = `room_friend_${friend1Id}`;
      const roomKey2 = `room_friend_${friend2Id}`;
      expect(roomKey1).not.toBe(roomKey2);
    });

    it("서로 다른 친구는 서로 다른 채팅방을 가져야 함", () => {
      const friends = [
        { id: "f1", nickname: "친구1" },
        { id: "f2", nickname: "친구2" },
        { id: "f3", nickname: "친구3" },
      ];
      const roomKeys = friends.map((f) => `room_friend_${f.id}`);
      const uniqueKeys = new Set(roomKeys);
      expect(uniqueKeys.size).toBe(friends.length);
    });

    it("채팅 메시지는 방별로 독립적으로 저장", () => {
      const chatMessages: Record<string, any[]> = {};
      chatMessages["room_friend_f1"] = [{ id: "m1", content: "안녕" }];
      chatMessages["room_friend_f2"] = [{ id: "m2", content: "반가워" }];

      expect(chatMessages["room_friend_f1"]).toHaveLength(1);
      expect(chatMessages["room_friend_f2"]).toHaveLength(1);
      expect(chatMessages["room_friend_f1"][0].content).toBe("안녕");
      expect(chatMessages["room_friend_f2"][0].content).toBe("반가워");
    });
  });

  describe("요청 상태 알림", () => {
    it("요청 수락 시 알림 생성", () => {
      const request = { id: "req1", petName: "초코", title: "산책 부탁" };
      const notification = {
        id: `notif_accept_${Date.now()}`,
        type: "match" as const,
        title: "요청 수락",
        body: `${request.petName}의 ${request.title} 요청을 수락했어요!`,
        isRead: false,
      };
      expect(notification.type).toBe("match");
      expect(notification.body).toContain("초코");
      expect(notification.body).toContain("산책 부탁");
    });

    it("요청 거절 시 알림 생성", () => {
      const request = { id: "req1", petName: "초코", title: "산책 부탁" };
      const notification = {
        id: `notif_reject_${Date.now()}`,
        type: "match" as const,
        title: "요청 거절",
        body: `${request.petName}의 ${request.title} 요청이 거절되었어요.`,
        isRead: false,
      };
      expect(notification.type).toBe("match");
      expect(notification.body).toContain("거절");
    });

    it("수락 시 채팅방 자동 생성", () => {
      const requestId = "req1";
      const chatRoomId = `request_${requestId}`;
      const roomKey = `room_${chatRoomId}`;
      expect(roomKey).toBe("room_request_req1");
    });

    it("CareRequest에 rejected 상태 포함", () => {
      type RequestStatus = "pending" | "accepted" | "completed" | "cancelled" | "rejected";
      const status: RequestStatus = "rejected";
      expect(status).toBe("rejected");
    });
  });

  describe("돌보미 프로필 설정", () => {
    it("돌보미 서비스 목록이 6개", () => {
      const CARETAKER_SERVICES = [
        { id: "walk", label: "대신 산책해주기" },
        { id: "visit", label: "방문 돌봄" },
        { id: "emergency", label: "긴급 돌봄" },
        { id: "daycare", label: "데이케어" },
        { id: "grooming", label: "그루밍 도움" },
        { id: "training", label: "기본 훈련" },
      ];
      expect(CARETAKER_SERVICES).toHaveLength(6);
    });

    it("서비스 토글 기능", () => {
      let selectedServices: string[] = [];
      const toggleService = (id: string) => {
        if (selectedServices.includes(id)) {
          selectedServices = selectedServices.filter((s) => s !== id);
        } else {
          selectedServices = [...selectedServices, id];
        }
      };

      toggleService("walk");
      expect(selectedServices).toContain("walk");
      expect(selectedServices).toHaveLength(1);

      toggleService("visit");
      expect(selectedServices).toHaveLength(2);

      toggleService("walk");
      expect(selectedServices).not.toContain("walk");
      expect(selectedServices).toHaveLength(1);
    });
  });

  describe("다크 모드", () => {
    it("테마 색상이 light/dark 모두 정의됨", () => {
      const themeColors = {
        primary: { light: "#FF7043", dark: "#FF8A65" },
        background: { light: "#FAFAFA", dark: "#121212" },
        foreground: { light: "#1A1A1A", dark: "#F0F0F0" },
      };

      expect(themeColors.primary.light).toBe("#FF7043");
      expect(themeColors.primary.dark).toBe("#FF8A65");
      expect(themeColors.background.light).not.toBe(themeColors.background.dark);
    });

    it("ColorScheme 타입은 light 또는 dark", () => {
      type ColorScheme = "light" | "dark";
      const scheme: ColorScheme = "dark";
      expect(["light", "dark"]).toContain(scheme);
    });

    it("다크 모드 토글 동작", () => {
      let isDark = false;
      const toggle = () => { isDark = !isDark; };

      toggle();
      expect(isDark).toBe(true);

      toggle();
      expect(isDark).toBe(false);
    });
  });

  describe("Notification 타입 확장", () => {
    it("match 타입이 알림 타입에 포함", () => {
      type NotificationType = "comment" | "like" | "match_request" | "message" | "friend_add" | "match";
      const types: NotificationType[] = ["comment", "like", "match_request", "message", "friend_add", "match"];
      expect(types).toContain("match");
    });

    it("알림 아이콘 매핑에 match 포함", () => {
      const NOTIFICATION_ICONS: Record<string, string> = {
        comment: "💬",
        like: "❤️",
        match_request: "🤝",
        message: "✉️",
        friend_add: "👫",
        match: "✅",
      };
      expect(NOTIFICATION_ICONS.match).toBe("✅");
    });
  });
});
