import { Server as HTTPServer } from "http";
import { Server as SocketIOServer, Socket } from "socket.io";
import * as chatDb from "./chat-db";

interface ChatMessage {
  id?: number;
  chatRoomId: number;
  senderId: number;
  senderName: string;
  content: string;
  createdAt: string;
  isRead: boolean;
}

interface UserSession {
  userId: number;
  socketId: string;
  chatRoomId?: number;
}

// 사용자 세션 관리 (userId -> socketId)
const userSessions = new Map<number, UserSession>();
// 채팅방 참여자 관리 (chatRoomId -> Set<userId>)
const chatRoomParticipants = new Map<number, Set<number>>();

export function initializeSocketIO(httpServer: HTTPServer): SocketIOServer {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
    transports: ["websocket", "polling"],
  });

  io.on("connection", (socket: Socket) => {
    console.log(`[Socket.IO] 사용자 연결: ${socket.id}`);

    /**
     * 사용자가 채팅방에 입장
     */
    socket.on("join-chat", async (data: { userId: number; chatRoomId: number; userName: string }) => {
      const { userId, chatRoomId, userName } = data;

      // 사용자 세션 저장
      userSessions.set(userId, {
        userId,
        socketId: socket.id,
        chatRoomId,
      });

      // 채팅방에 소켓 조인
      socket.join(`chat-${chatRoomId}`);

      // 채팅방 참여자 추가
      if (!chatRoomParticipants.has(chatRoomId)) {
        chatRoomParticipants.set(chatRoomId, new Set());
      }
      chatRoomParticipants.get(chatRoomId)!.add(userId);

      // 다른 사용자에게 입장 알림
      socket.to(`chat-${chatRoomId}`).emit("user-joined", {
        userId,
        userName,
        timestamp: new Date().toISOString(),
      });

      // 입장한 사용자에게 기존 메시지 로드
      try {
        const messages = await chatDb.getChatMessages(chatRoomId, 50);
        socket.emit("load-messages", messages);
      } catch (error) {
        console.error("[Socket.IO] 메시지 로드 실패:", error);
      }

      console.log(`[Socket.IO] 사용자 ${userId}가 채팅방 ${chatRoomId}에 입장`);
    });

    /**
     * 메시지 전송
     */
    socket.on("send-message", async (data: ChatMessage) => {
      const { chatRoomId, senderId, senderName, content } = data;

      try {
        // DB에 메시지 저장
        const savedMessage = await chatDb.saveMessage({
          chatRoomId,
          senderId,
          content,
          isRead: false,
        });

        // 채팅방의 모든 사용자에게 메시지 브로드캐스트
        io.to(`chat-${chatRoomId}`).emit("receive-message", {
          id: savedMessage?.id,
          chatRoomId,
          senderId,
          senderName,
          content,
          createdAt: new Date().toISOString(),
          isRead: false,
        });

        console.log(`[Socket.IO] 메시지 저장됨 - 채팅방: ${chatRoomId}, 발신자: ${senderId}`);
      } catch (error) {
        console.error("[Socket.IO] 메시지 저장 실패:", error);
        socket.emit("error", { message: "메시지 저장 실패" });
      }
    });

    /**
     * 메시지 읽음 상태 업데이트
     */
    socket.on("mark-as-read", async (data: { chatRoomId: number; messageIds: number[] }) => {
      const { chatRoomId, messageIds } = data;

      try {
        // DB에서 메시지 읽음 처리
        await chatDb.markMessagesAsRead(chatRoomId);

        // 채팅방의 모든 사용자에게 읽음 상태 업데이트 알림
        io.to(`chat-${chatRoomId}`).emit("messages-read", {
          chatRoomId,
          messageIds,
          timestamp: new Date().toISOString(),
        });

        console.log(`[Socket.IO] 메시지 읽음 처리 - 채팅방: ${chatRoomId}`);
      } catch (error) {
        console.error("[Socket.IO] 읽음 상태 업데이트 실패:", error);
      }
    });

    /**
     * 사용자가 채팅 중임을 알림 (타이핑 표시)
     */
    socket.on("user-typing", (data: { chatRoomId: number; userId: number; userName: string }) => {
      const { chatRoomId, userId, userName } = data;

      socket.to(`chat-${chatRoomId}`).emit("user-typing", {
        userId,
        userName,
        timestamp: new Date().toISOString(),
      });
    });

    /**
     * 사용자가 채팅 중이 아님을 알림
     */
    socket.on("user-stopped-typing", (data: { chatRoomId: number; userId: number }) => {
      const { chatRoomId, userId } = data;

      socket.to(`chat-${chatRoomId}`).emit("user-stopped-typing", {
        userId,
        timestamp: new Date().toISOString(),
      });
    });

    /**
     * 사용자 온라인 상태 조회
     */
    socket.on("get-online-status", (data: { chatRoomId: number }, callback) => {
      const { chatRoomId } = data;
      const participants = chatRoomParticipants.get(chatRoomId) || new Set();

      const onlineUsers = Array.from(participants).map((userId) => {
        const session = userSessions.get(userId);
        return {
          userId,
          isOnline: session !== undefined,
        };
      });

      callback(onlineUsers);
    });

    /**
     * 채팅방 퇴장
     */
    socket.on("leave-chat", (data: { userId: number; chatRoomId: number; userName: string }) => {
      const { userId, chatRoomId, userName } = data;

      // 사용자 세션 제거
      userSessions.delete(userId);

      // 채팅방 참여자 제거
      const participants = chatRoomParticipants.get(chatRoomId);
      if (participants) {
        participants.delete(userId);
        if (participants.size === 0) {
          chatRoomParticipants.delete(chatRoomId);
        }
      }

      // 소켓 룸 퇴장
      socket.leave(`chat-${chatRoomId}`);

      // 다른 사용자에게 퇴장 알림
      socket.to(`chat-${chatRoomId}`).emit("user-left", {
        userId,
        userName,
        timestamp: new Date().toISOString(),
      });

      console.log(`[Socket.IO] 사용자 ${userId}가 채팅방 ${chatRoomId}에서 퇴장`);
    });

    /**
     * 연결 해제
     */
    socket.on("disconnect", () => {
      // 모든 세션에서 이 소켓 제거
      for (const [userId, session] of userSessions.entries()) {
        if (session.socketId === socket.id) {
          userSessions.delete(userId);

          // 채팅방에서 제거
          const chatRoomId = session.chatRoomId;
          if (chatRoomId) {
            const participants = chatRoomParticipants.get(chatRoomId);
            if (participants) {
              participants.delete(userId);
              if (participants.size === 0) {
                chatRoomParticipants.delete(chatRoomId);
              }
            }
          }

          console.log(`[Socket.IO] 사용자 ${userId} 연결 해제`);
          break;
        }
      }
    });

    /**
     * 에러 처리
     */
    socket.on("error", (error) => {
      console.error(`[Socket.IO] 소켓 에러: ${error}`);
    });
  });

  return io;
}

/**
 * 특정 채팅방의 모든 사용자에게 메시지 전송
 */
export function broadcastToRoom(io: SocketIOServer, chatRoomId: number, event: string, data: any) {
  io.to(`chat-${chatRoomId}`).emit(event, data);
}

/**
 * 특정 사용자에게 메시지 전송
 */
export function sendToUser(io: SocketIOServer, userId: number, event: string, data: any) {
  const session = userSessions.get(userId);
  if (session) {
    io.to(session.socketId).emit(event, data);
  }
}
