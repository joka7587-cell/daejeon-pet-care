import { boolean, int, mysqlEnum, mysqlTable, text, timestamp, varchar, json } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  /** 이메일/비밀번호 로그인용 해시 (bcrypt) */
  passwordHash: varchar("passwordHash", { length: 255 }),
  /** 카카오 소셜 로그인 ID */
  kakaoId: varchar("kakaoId", { length: 64 }).unique(),
  loginMethod: varchar("loginMethod", { length: 64 }),
  /** 앱 내 역할: owner(보호자) / walker(도그워커) */
  appRole: mysqlEnum("appRole", ["owner", "walker"]).default("owner").notNull(),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  /** 이메일 인증 여부 */
  emailVerified: boolean("emailVerified").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * User Profiles - 반려인/돌보미 프로필 정보
 */
export const userProfiles = mysqlTable("userProfiles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  role: mysqlEnum("role", ["owner", "caretaker"]).notNull(), // 반려인 or 돌보미
  nickname: varchar("nickname", { length: 100 }).notNull(),
  bio: text("bio"),
  profileEmoji: varchar("profileEmoji", { length: 10 }),
  rating: int("rating").default(0).notNull(), // 평점 (0-500 = 0.0-5.0)
  reviewCount: int("reviewCount").default(0).notNull(),
  isActive: boolean("isActive").default(true).notNull(), // 돌보미 활동 상태
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type UserProfile = typeof userProfiles.$inferSelect;
export type InsertUserProfile = typeof userProfiles.$inferInsert;

/**
 * User Locations - 사용자 위치 정보 (대전 동네 기반)
 */
export const userLocations = mysqlTable("userLocations", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  neighborhood: varchar("neighborhood", { length: 50 }).notNull(), // 유성구, 둔산, 관평 등
  latitude: varchar("latitude", { length: 20 }).notNull(), // GPS 위도
  longitude: varchar("longitude", { length: 20 }).notNull(), // GPS 경도
  addressDetail: text("addressDetail"), // 상세 주소
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type UserLocation = typeof userLocations.$inferSelect;
export type InsertUserLocation = typeof userLocations.$inferInsert;

/**
 * Pets - 반려동물 정보 (반려인 전용)
 */
export const pets = mysqlTable("pets", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  breed: varchar("breed", { length: 100 }).notNull(),
  age: int("age").notNull(),
  size: mysqlEnum("size", ["소형", "중형", "대형"]).notNull(),
  emoji: varchar("emoji", { length: 10 }),
  specialNotes: text("specialNotes"), // 알레르기, 특이사항 등
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Pet = typeof pets.$inferSelect;
export type InsertPet = typeof pets.$inferInsert;

/**
 * Matching Requests - 돌봄/산책 요청
 */
export const matchingRequests = mysqlTable("matchingRequests", {
  id: int("id").autoincrement().primaryKey(),
  requesterId: int("requesterId").notNull(), // 요청자 (반려인)
  type: mysqlEnum("type", [
    "walk_partner",    // 산책 친구
    "find_caretaker",  // 돌보미 찾기
    "walk_request",    // 산책 부탁
    "emergency",       // 긴급 방문 돌봄
    "short_care",      // 단기 돌봄 교환
  ]).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  neighborhood: varchar("neighborhood", { length: 50 }).notNull(),
  requestDate: varchar("requestDate", { length: 20 }).notNull(), // "2025-03-15"
  requestTime: varchar("requestTime", { length: 20 }).notNull(), // "14:00"
  duration: varchar("duration", { length: 50 }).notNull(), // "1시간"
  isUrgent: boolean("isUrgent").default(false).notNull(),
  status: mysqlEnum("status", ["pending", "accepted", "completed", "cancelled"]).default("pending").notNull(),
  acceptedCaretakerId: int("acceptedCaretakerId"), // 수락한 돌보미
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type MatchingRequest = typeof matchingRequests.$inferSelect;
export type InsertMatchingRequest = typeof matchingRequests.$inferInsert;

/**
 * Matching History - 매칭 이력 및 평가
 */
export const matchingHistory = mysqlTable("matchingHistory", {
  id: int("id").autoincrement().primaryKey(),
  requestId: int("requestId").notNull(),
  ownerId: int("ownerId").notNull(), // 반려인
  caretakerId: int("caretakerId").notNull(), // 돌보미
  status: mysqlEnum("status", ["matched", "completed", "cancelled"]).default("matched").notNull(),
  ownerRating: int("ownerRating"), // 반려인이 돌보미에게 준 평점 (1-5)
  ownerReview: text("ownerReview"),
  caretakerRating: int("caretakerRating"), // 돌보미가 반려인에게 준 평점 (1-5)
  caretakerReview: text("caretakerReview"),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type MatchingHistory = typeof matchingHistory.$inferSelect;
export type InsertMatchingHistory = typeof matchingHistory.$inferInsert;


/**
 * Chat Rooms - 채팅방 (매칭된 반려인-돌보미 간)
 */
export const chatRooms = mysqlTable("chatRooms", {
  id: int("id").autoincrement().primaryKey(),
  matchingRequestId: int("matchingRequestId").notNull(),
  ownerId: int("ownerId").notNull(),
  caretakerId: int("caretakerId").notNull(),
  lastMessageAt: timestamp("lastMessageAt").defaultNow().onUpdateNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ChatRoom = typeof chatRooms.$inferSelect;
export type InsertChatRoom = typeof chatRooms.$inferInsert;

/**
 * Messages - 채팅 메시지
 */
export const messages = mysqlTable("messages", {
  id: int("id").autoincrement().primaryKey(),
  chatRoomId: int("chatRoomId").notNull(),
  senderId: int("senderId").notNull(),
  content: text("content").notNull(),
  isRead: boolean("isRead").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Message = typeof messages.$inferSelect;
export type InsertMessage = typeof messages.$inferInsert;

/**
 * Friend Codes - 사용자별 고유 친구 코드
 */
export const friendCodes = mysqlTable("friendCodes", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  code: varchar("code", { length: 20 }).notNull().unique(),
  nickname: varchar("nickname", { length: 100 }).notNull(),
  profileEmoji: varchar("profileEmoji", { length: 10 }),
  neighborhood: varchar("neighborhood", { length: 50 }),
  role: mysqlEnum("role", ["owner", "caretaker"]).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type FriendCode = typeof friendCodes.$inferSelect;
export type InsertFriendCode = typeof friendCodes.$inferInsert;

/**
 * Friendships - 친구 관계
 */
export const friendships = mysqlTable("friendships", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  friendUserId: int("friendUserId").notNull(),
  friendNickname: varchar("friendNickname", { length: 100 }).notNull(),
  friendEmoji: varchar("friendEmoji", { length: 10 }),
  friendNeighborhood: varchar("friendNeighborhood", { length: 50 }),
  friendRole: mysqlEnum("friendRole", ["owner", "caretaker"]).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Friendship = typeof friendships.$inferSelect;
export type InsertFriendship = typeof friendships.$inferInsert;

/**
 * Friend Requests - 친구 요청 (수락/거절 대기)
 */
export const friendRequests = mysqlTable("friendRequests", {
  id: int("id").autoincrement().primaryKey(),
  fromUserId: int("fromUserId").notNull(), // 요청 보낸 사람
  toUserId: int("toUserId").notNull(), // 요청 받은 사람
  fromNickname: varchar("fromNickname", { length: 100 }).notNull(),
  fromEmoji: varchar("fromEmoji", { length: 10 }),
  fromNeighborhood: varchar("fromNeighborhood", { length: 50 }),
  fromRole: mysqlEnum("fromRole", ["owner", "caretaker"]).notNull(),
  fromCode: varchar("fromCode", { length: 20 }).notNull(),
  toNickname: varchar("toNickname", { length: 100 }),
  toEmoji: varchar("toEmoji", { length: 10 }),
  status: mysqlEnum("status", ["pending", "accepted", "rejected"]).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type FriendRequest = typeof friendRequests.$inferSelect;
export type InsertFriendRequest = typeof friendRequests.$inferInsert;
