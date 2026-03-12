import { useEffect, useRef, useCallback, useState } from "react";
import { io, Socket } from "socket.io-client";

interface ChatMessage {
  id?: number;
  chatRoomId: number;
  senderId: number;
  senderName: string;
  content: string;
  createdAt: string;
  isRead: boolean;
}

interface UseSocketChatOptions {
  chatRoomId: number;
  userId: number;
  userName: string;
  serverUrl?: string;
}

interface UseSocketChatReturn {
  socket: Socket | null;
  isConnected: boolean;
  messages: ChatMessage[];
  isTyping: boolean;
  typingUser: string | null;
  sendMessage: (content: string) => void;
  markAsRead: (messageIds: number[]) => void;
  setIsTyping: (typing: boolean) => void;
  onlineUsers: Array<{ userId: number; isOnline: boolean }>;
}

export function useSocketChat(options: UseSocketChatOptions): UseSocketChatReturn {
  const { chatRoomId, userId, userName, serverUrl = "http://localhost:3000" } = options;

  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<Array<{ userId: number; isOnline: boolean }>>([]);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Socket.io 연결 초기화
  useEffect(() => {
    console.log(`[useSocketChat] 소켓 연결 시작 - 서버: ${serverUrl}`);

    const socket = io(serverUrl, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    socketRef.current = socket;

    // 연결 성공
    socket.on("connect", () => {
      console.log(`[useSocketChat] 소켓 연결 성공: ${socket.id}`);
      setIsConnected(true);

      // 채팅방에 입장
      socket.emit("join-chat", {
        userId,
        chatRoomId,
        userName,
      });
    });

    // 기존 메시지 로드
    socket.on("load-messages", (loadedMessages: ChatMessage[]) => {
      console.log(`[useSocketChat] 메시지 로드됨: ${loadedMessages.length}개`);
      setMessages(loadedMessages);
    });

    // 새 메시지 수신
    socket.on("receive-message", (message: ChatMessage) => {
      console.log(`[useSocketChat] 새 메시지 수신: ${message.senderName}`);
      setMessages((prev) => [...prev, message]);
    });

    // 메시지 읽음 상태 업데이트
    socket.on("messages-read", (data: { chatRoomId: number; messageIds: number[] }) => {
      console.log(`[useSocketChat] 메시지 읽음 상태 업데이트`);
      setMessages((prev) =>
        prev.map((msg) =>
          data.messageIds.includes(msg.id || 0) ? { ...msg, isRead: true } : msg,
        ),
      );
    });

    // 사용자 입장
    socket.on("user-joined", (data: { userId: number; userName: string }) => {
      console.log(`[useSocketChat] 사용자 입장: ${data.userName}`);
    });

    // 사용자 퇴장
    socket.on("user-left", (data: { userId: number; userName: string }) => {
      console.log(`[useSocketChat] 사용자 퇴장: ${data.userName}`);
    });

    // 사용자 타이핑 중
    socket.on("user-typing", (data: { userId: number; userName: string }) => {
      if (data.userId !== userId) {
        setTypingUser(data.userName);
      }
    });

    // 사용자 타이핑 중지
    socket.on("user-stopped-typing", (data: { userId: number }) => {
      if (data.userId !== userId) {
        setTypingUser(null);
      }
    });

    // 온라인 상태 업데이트
    socket.on("online-status", (users: Array<{ userId: number; isOnline: boolean }>) => {
      setOnlineUsers(users);
    });

    // 에러 처리
    socket.on("error", (error: any) => {
      console.error(`[useSocketChat] 소켓 에러:`, error);
    });

    // 연결 해제
    socket.on("disconnect", () => {
      console.log(`[useSocketChat] 소켓 연결 해제`);
      setIsConnected(false);
    });

    // 정리
    return () => {
      if (socket.connected) {
        socket.emit("leave-chat", {
          userId,
          chatRoomId,
          userName,
        });
      }
      socket.disconnect();
      socketRef.current = null;
    };
  }, [chatRoomId, userId, userName, serverUrl]);

  // 메시지 전송
  const sendMessage = useCallback(
    (content: string) => {
      if (!socketRef.current || !isConnected || !content.trim()) {
        return;
      }

      const message: ChatMessage = {
        chatRoomId,
        senderId: userId,
        senderName: userName,
        content: content.trim(),
        createdAt: new Date().toISOString(),
        isRead: false,
      };

      socketRef.current.emit("send-message", message);
      console.log(`[useSocketChat] 메시지 전송: ${content}`);
    },
    [chatRoomId, userId, userName, isConnected],
  );

  // 메시지 읽음 처리
  const markAsRead = useCallback(
    (messageIds: number[]) => {
      if (!socketRef.current || !isConnected) {
        return;
      }

      socketRef.current.emit("mark-as-read", {
        chatRoomId,
        messageIds,
      });

      console.log(`[useSocketChat] 메시지 읽음 처리: ${messageIds.length}개`);
    },
    [chatRoomId, isConnected],
  );

  // 타이핑 상태 전송
  const handleTyping = useCallback(
    (typing: boolean) => {
      if (!socketRef.current || !isConnected) {
        return;
      }

      if (typing) {
        socketRef.current.emit("user-typing", {
          chatRoomId,
          userId,
          userName,
        });
      } else {
        socketRef.current.emit("user-stopped-typing", {
          chatRoomId,
          userId,
        });
      }

      setIsTyping(typing);

      // 타이핑 중지 자동 감지 (3초 후)
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      if (typing) {
        typingTimeoutRef.current = setTimeout(() => {
          handleTyping(false);
        }, 3000);
      }
    },
    [chatRoomId, userId, userName, isConnected],
  );

  // 온라인 상태 조회
  useEffect(() => {
    if (!socketRef.current || !isConnected) {
      return;
    }

    socketRef.current.emit("get-online-status", { chatRoomId }, (users: any) => {
      setOnlineUsers(users);
    });

    // 주기적으로 온라인 상태 갱신 (5초마다)
    const interval = setInterval(() => {
      socketRef.current?.emit("get-online-status", { chatRoomId }, (users: any) => {
        setOnlineUsers(users);
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [chatRoomId, isConnected]);

  return {
    socket: socketRef.current,
    isConnected,
    messages,
    isTyping,
    typingUser,
    sendMessage,
    markAsRead,
    setIsTyping: handleTyping,
    onlineUsers,
  };
}
