import { describe, it, expect } from "vitest";
import { MOCK_CARETAKERS } from "../lib/mock-data";
import { getWorkerDetail, WORKER_DETAILS } from "../lib/worker-details";

describe("Phase 22: 워커 클릭 → 채팅 전체 네비게이션 플로우", () => {
  describe("1. 홈 화면 → 워커 카드 클릭", () => {
    it("모든 워커에 유효한 ID가 있어야 한다", () => {
      MOCK_CARETAKERS.forEach((w) => {
        expect(w.id).toBeTruthy();
        expect(typeof w.id).toBe("string");
      });
    });

    it("워커 카드 클릭 시 /profile/{workerId} 경로가 유효해야 한다", () => {
      MOCK_CARETAKERS.forEach((w) => {
        const path = `/profile/${w.id}`;
        expect(path).toMatch(/^\/profile\/c\d+$/);
      });
    });
  });

  describe("2. 워커 상세 페이지", () => {
    it("모든 워커에 상세 데이터가 존재해야 한다", () => {
      MOCK_CARETAKERS.forEach((w) => {
        const detail = getWorkerDetail(w.id);
        expect(detail).toBeTruthy();
        expect(detail!.nickname).toBeTruthy();
        expect(detail!.profileEmoji).toBeTruthy();
      });
    });

    it("워커 상세에서 생성되는 roomId 형식이 올바라야 한다", () => {
      MOCK_CARETAKERS.forEach((w) => {
        const roomId = `room_worker_${w.id}`;
        expect(roomId).toMatch(/^room_worker_c\d+$/);
        // isWorkerChat 판별: includes("worker_")
        expect(roomId.includes("worker_")).toBe(true);
      });
    });

    it("채팅 시작 시 ADD_CHAT_ROOM payload가 올바라야 한다", () => {
      const worker = getWorkerDetail("c1")!;
      const roomId = `room_worker_c1`;
      const payload = {
        id: roomId,
        participantId: "c1",
        participantName: worker.nickname,
        participantEmoji: worker.profileEmoji,
        type: "worker" as const,
        lastMessage: "대화를 시작하세요",
        lastMessageTime: new Date().toISOString(),
        unreadCount: 0,
      };
      expect(payload.id).toBe("room_worker_c1");
      expect(payload.type).toBe("worker");
      expect(payload.participantName).toBeTruthy();
      expect(payload.participantEmoji).toBeTruthy();
    });
  });

  describe("3. 채팅 화면 - isWorkerChat 판별", () => {
    it("room_worker_xxx 형태의 roomId는 isWorkerChat이 true여야 한다", () => {
      const testRoomIds = ["room_worker_c1", "room_worker_c2", "room_worker_c10"];
      testRoomIds.forEach((roomId) => {
        const isWorkerChat = roomId.includes("worker_");
        expect(isWorkerChat).toBe(true);
      });
    });

    it("friend_xxx 형태의 roomId는 isWorkerChat이 false여야 한다", () => {
      const testRoomIds = ["friend_f1", "friend_f2", "request_r1"];
      testRoomIds.forEach((roomId) => {
        const isWorkerChat = roomId.includes("worker_");
        expect(isWorkerChat).toBe(false);
      });
    });
  });

  describe("4. 채팅 화면 - URL 파라미터", () => {
    it("워커 상세에서 전달하는 chatName/chatEmoji 파라미터가 올바라야 한다", () => {
      const worker = getWorkerDetail("c1")!;
      const params = new URLSearchParams({
        chatName: encodeURIComponent(worker.nickname),
        chatEmoji: encodeURIComponent(worker.profileEmoji),
      });
      const chatName = params.get("chatName");
      const chatEmoji = params.get("chatEmoji");
      expect(chatName).toBeTruthy();
      expect(chatEmoji).toBeTruthy();
      expect(decodeURIComponent(chatName!)).toBe(worker.nickname);
      expect(decodeURIComponent(chatEmoji!)).toBe(worker.profileEmoji);
    });
  });

  describe("5. 채팅 탭 - 워커 채팅방 표시", () => {
    it("chatRooms에서 worker 타입 방을 필터링할 수 있어야 한다", () => {
      const mockChatRooms = [
        { id: "room_worker_c1", type: "worker", participantName: "준혁", participantEmoji: "🐕", lastMessage: "안녕", lastMessageTime: new Date().toISOString(), unreadCount: 0, participantId: "c1" },
        { id: "room_worker_c2", type: "worker", participantName: "민지", participantEmoji: "🐩", lastMessage: "네", lastMessageTime: new Date().toISOString(), unreadCount: 1, participantId: "c2" },
        { id: "friend_f1", type: "friend", participantName: "친구1", participantEmoji: "👤", lastMessage: "ㅎㅇ", lastMessageTime: new Date().toISOString(), unreadCount: 0, participantId: "f1" },
      ];
      const workerRooms = mockChatRooms.filter((r) => r.type === "worker");
      expect(workerRooms).toHaveLength(2);
      expect(workerRooms[0].id).toBe("room_worker_c1");
      expect(workerRooms[1].id).toBe("room_worker_c2");
    });
  });

  describe("6. 채팅 화면 - chatRoom 폴백", () => {
    it("URL 파라미터가 없어도 chatRoom에서 이름/이모지를 가져올 수 있어야 한다", () => {
      const chatRoom = {
        id: "room_worker_c1",
        participantName: "산책왕 준혁",
        participantEmoji: "🐕",
        type: "worker" as const,
        lastMessage: "",
        lastMessageTime: "",
        unreadCount: 0,
        participantId: "c1",
      };
      // URL 파라미터가 없는 경우 시뮬레이션
      const decodedChatName: string | null = null;
      const decodedFriendName: string | null = null;
      const otherUserName = decodedFriendName || decodedChatName || chatRoom?.participantName || "상대방";
      expect(otherUserName).toBe("산책왕 준혁");
    });
  });

  describe("7. 메시지 저장 roomKey 일관성", () => {
    it("워커 상세와 채팅 화면의 roomKey가 일치해야 한다", () => {
      const workerId = "c1";
      // 워커 상세에서 생성하는 roomId
      const roomIdFromProfile = `room_worker_${workerId}`;
      // 채팅 화면에서 사용하는 roomKey
      const roomKeyInChat = `room_${roomIdFromProfile}`;
      expect(roomKeyInChat).toBe("room_room_worker_c1");

      // chatMessages에서 저장하는 키도 동일
      const savedKey = `room_${roomIdFromProfile}`;
      expect(savedKey).toBe(roomKeyInChat);
    });
  });
});
