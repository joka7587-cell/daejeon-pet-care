/**
 * Socket.io 클라이언트 유틸리티
 * 실시간 채팅 메시지 전송/수신
 */

import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

const SOCKET_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";

/**
 * Socket.io 연결 초기화
 */
export function initSocket(userId: string): Socket {
  if (socket?.connected) {
    return socket;
  }

  socket = io(SOCKET_URL, {
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 5,
    transports: ["websocket", "polling"],
    query: {
      userId,
    },
  });

  socket.on("connect", () => {
    console.log("[Socket] Connected:", socket?.id);
  });

  socket.on("disconnect", () => {
    console.log("[Socket] Disconnected");
  });

  socket.on("error", (error) => {
    console.error("[Socket] Error:", error);
  });

  return socket;
}

/**
 * Socket 연결 상태 확인
 */
export function isSocketConnected(): boolean {
  return socket?.connected ?? false;
}

/**
 * 메시지 전송
 */
export function sendMessage(
  roomId: string,
  message: {
    id: string;
    senderId: string;
    senderName: string;
    content: string;
    type: "text" | "image" | "location";
    createdAt: string;
    locationData?: any;
  }
) {
  if (!socket?.connected) {
    console.warn("[Socket] Not connected, queuing message");
    return false;
  }

  socket.emit("message", {
    roomId,
    message,
  });

  return true;
}

/**
 * 메시지 수신 리스너 등록
 */
export function onMessage(
  callback: (data: { roomId: string; message: any }) => void
) {
  if (!socket) return;

  socket.on("message", callback);

  return () => {
    socket?.off("message", callback);
  };
}

/**
 * 타이핑 상태 전송
 */
export function sendTyping(roomId: string, userId: string, isTyping: boolean) {
  if (!socket?.connected) return;

  socket.emit("typing", {
    roomId,
    userId,
    isTyping,
  });
}

/**
 * 타이핑 상태 수신 리스너
 */
export function onTyping(
  callback: (data: { roomId: string; userId: string; isTyping: boolean }) => void
) {
  if (!socket) return;

  socket.on("typing", callback);

  return () => {
    socket?.off("typing", callback);
  };
}

/**
 * 온라인 상태 전송
 */
export function sendOnlineStatus(userId: string, isOnline: boolean) {
  if (!socket?.connected) return;

  socket.emit("online", {
    userId,
    isOnline,
  });
}

/**
 * 온라인 상태 수신 리스너
 */
export function onOnlineStatus(
  callback: (data: { userId: string; isOnline: boolean }) => void
) {
  if (!socket) return;

  socket.on("online", callback);

  return () => {
    socket?.off("online", callback);
  };
}

/**
 * 채팅방 입장
 */
export function joinRoom(roomId: string) {
  if (!socket?.connected) return;

  socket.emit("join_room", { roomId });
}

/**
 * 채팅방 퇴장
 */
export function leaveRoom(roomId: string) {
  if (!socket?.connected) return;

  socket.emit("leave_room", { roomId });
}

/**
 * Socket 연결 해제
 */
export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

/**
 * Socket 인스턴스 반환
 */
export function getSocket(): Socket | null {
  return socket;
}
