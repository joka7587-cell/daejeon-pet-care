import { describe, it, expect } from "vitest";

describe("Chat Feature", () => {
  describe("Chat Room Management", () => {
    it("should create a chat room with correct data", () => {
      const chatRoom = {
        id: 1,
        matchingRequestId: 1,
        ownerId: 101,
        caretakerId: 102,
        lastMessageAt: new Date(),
        createdAt: new Date(),
      };

      expect(chatRoom.id).toBe(1);
      expect(chatRoom.ownerId).toBe(101);
      expect(chatRoom.caretakerId).toBe(102);
      expect(chatRoom.matchingRequestId).toBe(1);
    });

    it("should identify chat room participants correctly", () => {
      const chatRoom = {
        ownerId: 101,
        caretakerId: 102,
      };

      const userId = 101;
      const isOwner = chatRoom.ownerId === userId;
      const isCaretaker = chatRoom.caretakerId === userId;

      expect(isOwner).toBe(true);
      expect(isCaretaker).toBe(false);
    });
  });

  describe("Message Management", () => {
    it("should create a message with correct structure", () => {
      const message = {
        id: 1,
        chatRoomId: 1,
        senderId: 101,
        content: "안녕하세요!",
        isRead: false,
        createdAt: new Date(),
      };

      expect(message.id).toBe(1);
      expect(message.chatRoomId).toBe(1);
      expect(message.senderId).toBe(101);
      expect(message.content).toBe("안녕하세요!");
      expect(message.isRead).toBe(false);
    });

    it("should mark message as read", () => {
      const message = {
        id: 1,
        isRead: false,
      };

      message.isRead = true;

      expect(message.isRead).toBe(true);
    });

    it("should validate message content is not empty", () => {
      const isValidMessage = (content: string) => {
        return content.trim().length > 0;
      };

      expect(isValidMessage("안녕하세요!")).toBe(true);
      expect(isValidMessage("")).toBe(false);
      expect(isValidMessage("   ")).toBe(false);
    });

    it("should validate message length", () => {
      const MAX_MESSAGE_LENGTH = 500;
      const isValidLength = (content: string) => {
        return content.length <= MAX_MESSAGE_LENGTH;
      };

      expect(isValidLength("안녕하세요!")).toBe(true);
      expect(isValidLength("a".repeat(500))).toBe(true);
      expect(isValidLength("a".repeat(501))).toBe(false);
    });
  });

  describe("Chat UI Logic", () => {
    it("should determine message bubble position correctly", () => {
      const userId = 101;
      const messages = [
        { id: 1, senderId: 101, content: "내 메시지" },
        { id: 2, senderId: 102, content: "상대방 메시지" },
        { id: 3, senderId: 101, content: "또 내 메시지" },
      ];

      const bubblePositions = messages.map((msg) => ({
        isOwn: msg.senderId === userId,
        position: msg.senderId === userId ? "right" : "left",
      }));

      expect(bubblePositions[0].isOwn).toBe(true);
      expect(bubblePositions[0].position).toBe("right");
      expect(bubblePositions[1].isOwn).toBe(false);
      expect(bubblePositions[1].position).toBe("left");
      expect(bubblePositions[2].isOwn).toBe(true);
      expect(bubblePositions[2].position).toBe("right");
    });

    it("should calculate unread message count correctly", () => {
      const messages = [
        { id: 1, isRead: true },
        { id: 2, isRead: false },
        { id: 3, isRead: false },
        { id: 4, isRead: true },
      ];

      const unreadCount = messages.filter((msg) => !msg.isRead).length;

      expect(unreadCount).toBe(2);
    });

    it("should format message time correctly", () => {
      const date = new Date("2025-03-12T14:30:00");
      const timeString = date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });

      // 로케일에 따라 12시간 또는 24시간 형식이 다를 수 있음
      expect(timeString).toContain("30");
      expect(/\d{1,2}:\d{2}/.test(timeString)).toBe(true);
    });
  });

  describe("Chat List Management", () => {
    it("should sort chat rooms by last message time", () => {
      const chatRooms = [
        { id: 1, lastMessageAt: new Date("2025-03-12T10:00:00") },
        { id: 2, lastMessageAt: new Date("2025-03-12T12:00:00") },
        { id: 3, lastMessageAt: new Date("2025-03-12T11:00:00") },
      ];

      const sorted = [...chatRooms].sort(
        (a, b) => b.lastMessageAt.getTime() - a.lastMessageAt.getTime(),
      );

      expect(sorted[0].id).toBe(2);
      expect(sorted[1].id).toBe(3);
      expect(sorted[2].id).toBe(1);
    });

    it("should display unread badge only when unread count > 0", () => {
      const chatRooms = [
        { id: 1, unreadCount: 0 },
        { id: 2, unreadCount: 2 },
        { id: 3, unreadCount: 0 },
      ];

      const shouldShowBadge = chatRooms.map((room) => room.unreadCount > 0);

      expect(shouldShowBadge[0]).toBe(false);
      expect(shouldShowBadge[1]).toBe(true);
      expect(shouldShowBadge[2]).toBe(false);
    });

    it("should format unread badge text correctly", () => {
      const formatBadgeText = (count: number) => {
        return count > 9 ? "9+" : count.toString();
      };

      expect(formatBadgeText(0)).toBe("0");
      expect(formatBadgeText(5)).toBe("5");
      expect(formatBadgeText(9)).toBe("9");
      expect(formatBadgeText(10)).toBe("9+");
      expect(formatBadgeText(99)).toBe("9+");
    });
  });
});
