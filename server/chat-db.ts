import { chatRooms, messages, type InsertMessage } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { getDb } from "./db";

/**
 * 채팅방 생성 또는 조회
 */
export async function getOrCreateChatRoom(
  matchingRequestId: number,
  ownerId: number,
  caretakerId: number,
) {
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  
  const existing = await database
    .select()
    .from(chatRooms)
    .where(eq(chatRooms.matchingRequestId, matchingRequestId))
    .limit(1);

  if (existing.length > 0) {
    return existing[0];
  }

  await database.insert(chatRooms).values({
    matchingRequestId,
    ownerId,
    caretakerId,
  });

  const newRoom = await database
    .select()
    .from(chatRooms)
    .where(eq(chatRooms.matchingRequestId, matchingRequestId))
    .limit(1);

  return newRoom[0];
}

/**
 * 사용자의 채팅방 목록 조회
 */
export async function getUserChatRooms(userId: number) {
  const database = await getDb();
  if (!database) return [];
  
  return database
    .select()
    .from(chatRooms)
    .where((room: any) => {
      return (
        eq(room.ownerId, userId) ||
        eq(room.caretakerId, userId)
      );
    });
}

/**
 * 채팅방의 메시지 조회
 */
export async function getChatMessages(chatRoomId: number, limit = 50) {
  const database = await getDb();
  if (!database) return [];
  
  return database
    .select()
    .from(messages)
    .where(eq(messages.chatRoomId, chatRoomId))
    .orderBy(messages.createdAt)
    .limit(limit);
}

/**
 * 메시지 저장
 */
export async function saveMessage(data: InsertMessage) {
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  
  await database.insert(messages).values(data);
  
  const saved = await database
    .select()
    .from(messages)
    .where(eq(messages.chatRoomId, data.chatRoomId))
    .orderBy(messages.createdAt)
    .limit(1);

  return saved[0];
}

/**
 * 메시지를 읽음 처리
 */
export async function markMessagesAsRead(chatRoomId: number) {
  const database = await getDb();
  if (!database) return;
  
  return database
    .update(messages)
    .set({ isRead: true })
    .where(eq(messages.chatRoomId, chatRoomId));
}

/**
 * 읽지 않은 메시지 개수 조회
 */
export async function getUnreadMessageCount(chatRoomId: number) {
  const database = await getDb();
  if (!database) return 0;
  
  const result = await database
    .select()
    .from(messages)
    .where(
      and(
        eq(messages.chatRoomId, chatRoomId),
        eq(messages.isRead, false),
      ),
    );

  return result.length;
}
