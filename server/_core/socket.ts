/**
 * Socket.io 서버 구현
 * 실시간 채팅 메시지 전송/수신, 타이핑 상태, 온라인 상태 관리
 */

import { Server as HTTPServer } from "http";
import { Server as SocketIOServer, Socket } from "socket.io";

interface ConnectedUser {
  userId: string;
  socketId: string;
  isOnline: boolean;
  currentRoom?: string;
}

interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  type: "text" | "image" | "location";
  locationData?: any;
  createdAt: string;
}

interface TypingStatus {
  roomId: string;
  userId: string;
  isTyping: boolean;
}

// 연결된 사용자 추적
const connectedUsers = new Map<string, ConnectedUser>();

// 채팅방별 메시지 저장 (데모용 - 실제로는 DB 사용)
const roomMessages = new Map<string, ChatMessage[]>();

export function initializeSocket(httpServer: HTTPServer) {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
    transports: ["websocket", "polling"],
  });

  io.on("connection", (socket: Socket) => {
    const userId = socket.handshake.query.userId as string;

    console.log(`[Socket] User connected: ${userId} (${socket.id})`);

    // 사용자 등록
    connectedUsers.set(socket.id, {
      userId,
      socketId: socket.id,
      isOnline: true,
    });

    // ─── 채팅방 관리 ───

    socket.on("join_room", (data: { roomId: string }) => {
      const { roomId } = data;
      socket.join(roomId);

      const user = connectedUsers.get(socket.id);
      if (user) {
        user.currentRoom = roomId;
      }

      console.log(`[Socket] User ${userId} joined room: ${roomId}`);

      // 채팅방의 다른 사용자들에게 입장 알림
      socket.to(roomId).emit("user_joined", {
        userId,
        message: `${userId}님이 입장했습니다.`,
      });

      // 기존 메시지 전송
      const messages = roomMessages.get(roomId) || [];
      socket.emit("load_messages", { roomId, messages });
    });

    socket.on("leave_room", (data: { roomId: string }) => {
      const { roomId } = data;
      socket.leave(roomId);

      const user = connectedUsers.get(socket.id);
      if (user) {
        user.currentRoom = undefined;
      }

      console.log(`[Socket] User ${userId} left room: ${roomId}`);

      socket.to(roomId).emit("user_left", {
        userId,
        message: `${userId}님이 퇴장했습니다.`,
      });
    });

    // ─── 메시지 ───

    socket.on("message", (data: { roomId: string; message: ChatMessage }) => {
      const { roomId, message } = data;

      console.log(`[Socket] Message in ${roomId}: ${message.content}`);

      // 메시지 저장
      if (!roomMessages.has(roomId)) {
        roomMessages.set(roomId, []);
      }
      roomMessages.get(roomId)!.push(message);

      // 채팅방의 모든 사용자에게 메시지 전송
      io.to(roomId).emit("message", {
        roomId,
        message,
      });
    });

    // ─── 타이핑 상태 ───

    socket.on("typing", (data: TypingStatus) => {
      const { roomId, userId: typingUserId, isTyping } = data;

      console.log(`[Socket] ${typingUserId} is ${isTyping ? "typing" : "stopped typing"} in ${roomId}`);

      // 다른 사용자들에게 타이핑 상태 전송
      socket.to(roomId).emit("typing", {
        roomId,
        userId: typingUserId,
        isTyping,
      });
    });

    // ─── 온라인 상태 ───

    socket.on("online", (data: { userId: string; isOnline: boolean }) => {
      const { isOnline } = data;

      const user = connectedUsers.get(socket.id);
      if (user) {
        user.isOnline = isOnline;
      }

      console.log(`[Socket] ${userId} is ${isOnline ? "online" : "offline"}`);

      // 모든 사용자에게 온라인 상태 전송
      io.emit("online", {
        userId,
        isOnline,
      });
    });

    // ─── 연결 해제 ───

    socket.on("disconnect", () => {
      console.log(`[Socket] User disconnected: ${userId} (${socket.id})`);

      const user = connectedUsers.get(socket.id);
      if (user) {
        user.isOnline = false;

        // 모든 사용자에게 오프라인 상태 전송
        io.emit("online", {
          userId,
          isOnline: false,
        });
      }

      connectedUsers.delete(socket.id);
    });

    // ─── 에러 처리 ───

    socket.on("error", (error) => {
      console.error(`[Socket] Error from ${userId}:`, error);
    });
  });

  return io;
}

/**
 * 채팅방의 모든 메시지 조회
 */
export function getRoomMessages(roomId: string): ChatMessage[] {
  return roomMessages.get(roomId) || [];
}

/**
 * 채팅방의 메시지 초기화 (테스트용)
 */
export function clearRoomMessages(roomId: string) {
  roomMessages.delete(roomId);
}

/**
 * 모든 연결된 사용자 조회
 */
export function getConnectedUsers(): ConnectedUser[] {
  return Array.from(connectedUsers.values());
}

/**
 * 특정 사용자의 온라인 상태 확인
 */
export function isUserOnline(userId: string): boolean {
  for (const user of connectedUsers.values()) {
    if (user.userId === userId && user.isOnline) {
      return true;
    }
  }
  return false;
}
