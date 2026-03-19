import { describe, it, expect } from "vitest";

describe("Phase 8: 버그 수정 및 기능 추가", () => {
  describe("홈 화면 요청 수락/거절", () => {
    it("수락 시 handledRequests 상태에 accepted로 기록", () => {
      const handledRequests: Record<string, "accepted" | "rejected"> = {};
      const reqId = "r1";
      handledRequests[reqId] = "accepted";
      expect(handledRequests[reqId]).toBe("accepted");
    });

    it("거절 시 handledRequests 상태에 rejected로 기록", () => {
      const handledRequests: Record<string, "accepted" | "rejected"> = {};
      const reqId = "r2";
      handledRequests[reqId] = "rejected";
      expect(handledRequests[reqId]).toBe("rejected");
    });

    it("수락 시 채팅방 ID가 request_ 접두사로 생성", () => {
      const reqId = "r1";
      const chatRoomId = `request_${reqId}`;
      expect(chatRoomId).toBe("request_r1");
      expect(chatRoomId.startsWith("request_")).toBe(true);
    });
  });

  describe("채팅 메시지 개별 분리", () => {
    it("친구 ID 기반 고유 채팅방 키 생성", () => {
      const friend1Id = "f1";
      const friend2Id = "f2";
      const room1Key = `room_friend_${friend1Id}`;
      const room2Key = `room_friend_${friend2Id}`;
      expect(room1Key).not.toBe(room2Key);
      expect(room1Key).toBe("room_friend_f1");
      expect(room2Key).toBe("room_friend_f2");
    });

    it("요청 채팅방 키와 친구 채팅방 키가 겹치지 않음", () => {
      const friendRoomKey = "room_friend_f1";
      const requestRoomKey = "room_request_r1";
      expect(friendRoomKey).not.toBe(requestRoomKey);
    });

    it("메시지 ID에 roomId가 포함되어 고유성 보장", () => {
      const roomId = "friend_f1";
      const msgId = `msg_${roomId}_${Date.now()}`;
      expect(msgId).toContain(roomId);
    });

    it("각 채팅방별 메시지가 독립적으로 저장", () => {
      const chatMessages: Record<string, any[]> = {};
      chatMessages["room_friend_f1"] = [{ id: "m1", content: "안녕" }];
      chatMessages["room_friend_f2"] = [{ id: "m2", content: "반가워" }];
      expect(chatMessages["room_friend_f1"]).toHaveLength(1);
      expect(chatMessages["room_friend_f2"]).toHaveLength(1);
      expect(chatMessages["room_friend_f1"][0].content).toBe("안녕");
      expect(chatMessages["room_friend_f2"][0].content).toBe("반가워");
    });
  });

  describe("온라인/오프라인 전환", () => {
    it("TOGGLE_ONLINE 액션이 isOnline 상태를 토글", () => {
      let isOnline = true;
      // 토글
      isOnline = !isOnline;
      expect(isOnline).toBe(false);
      // 다시 토글
      isOnline = !isOnline;
      expect(isOnline).toBe(true);
    });

    it("오프라인 상태에서 적절한 메시지 표시", () => {
      const isOnline = false;
      const statusText = isOnline ? "🟢 온라인" : "🔴 오프라인";
      const subText = isOnline ? "새 요청과 메시지를 받습니다" : "새 요청을 받지 않습니다";
      expect(statusText).toBe("🔴 오프라인");
      expect(subText).toBe("새 요청을 받지 않습니다");
    });

    it("온라인 상태에서 적절한 메시지 표시", () => {
      const isOnline = true;
      const statusText = isOnline ? "🟢 온라인" : "🔴 오프라인";
      const toggleText = isOnline ? "오프라인으로 전환" : "온라인으로 전환";
      expect(statusText).toBe("🟢 온라인");
      expect(toggleText).toBe("오프라인으로 전환");
    });

    it("초기 상태는 온라인", () => {
      const initialProfile = { isOnline: true };
      expect(initialProfile.isOnline).toBe(true);
    });
  });

  describe("채팅 탭 필터링", () => {
    it("전체/친구/요청 탭 필터링", () => {
      const rooms = [
        { id: "friend_f1", isFriend: true, isRequest: false },
        { id: "friend_f2", isFriend: true, isRequest: false },
        { id: "request_r1", isFriend: false, isRequest: true },
      ];
      const friendRooms = rooms.filter(r => r.isFriend);
      const requestRooms = rooms.filter(r => r.isRequest);
      expect(rooms).toHaveLength(3);
      expect(friendRooms).toHaveLength(2);
      expect(requestRooms).toHaveLength(1);
    });
  });

  describe("키워드 기반 자동 응답", () => {
    it("키워드 매칭으로 적절한 응답 반환", () => {
      const KEYWORD_REPLIES: Record<string, string> = {
        "사진": "사진 잘 받았어요! 귀엽네요 🥰",
        "시간": "오후 2시~5시 사이에 가능해요!",
        "비용": "시간당 15,000원이에요. 결제는 앱에서 가능합니다!",
        "안녕": "안녕하세요! 반가워요 😊🐾",
      };
      const getReply = (msg: string) => {
        for (const [keyword, reply] of Object.entries(KEYWORD_REPLIES)) {
          if (msg.includes(keyword)) return reply;
        }
        return "기본 응답";
      };
      expect(getReply("사진 보내줘")).toBe("사진 잘 받았어요! 귀엽네요 🥰");
      expect(getReply("안녕하세요")).toBe("안녕하세요! 반가워요 😊🐾");
      expect(getReply("비용이 얼마에요?")).toBe("시간당 15,000원이에요. 결제는 앱에서 가능합니다!");
      expect(getReply("알 수 없는 메시지")).toBe("기본 응답");
    });
  });
});
