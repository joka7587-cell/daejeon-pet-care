import { eq, and, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  users,
  userProfiles,
  userLocations,
  pets,
  matchingRequests,
  matchingHistory,
  friendCodes,
  friendships,
  friendRequests,
  InsertUserProfile,
  InsertUserLocation,
  InsertPet,
  InsertMatchingRequest,
  InsertMatchingHistory,
  InsertFriendCode,
  InsertFriendship,
  InsertFriendRequest,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

/**
 * User Profiles
 */
export async function getUserProfile(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId));
  return result.length > 0 ? result[0] : null;
}

export async function createUserProfile(data: InsertUserProfile): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(userProfiles).values(data);
}

export async function updateUserProfile(userId: number, data: Partial<InsertUserProfile>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(userProfiles).set(data).where(eq(userProfiles.userId, userId));
}

/**
 * User Locations
 */
export async function getUserLocation(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(userLocations).where(eq(userLocations.userId, userId));
  return result.length > 0 ? result[0] : null;
}

export async function createUserLocation(data: InsertUserLocation): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(userLocations).values(data);
}

export async function updateUserLocation(userId: number, data: Partial<InsertUserLocation>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(userLocations).set(data).where(eq(userLocations.userId, userId));
}

/**
 * Pets
 */
export async function getUserPets(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(pets).where(eq(pets.userId, userId));
}

export async function createPet(data: InsertPet): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(pets).values(data);
}

/**
 * Matching Requests
 */
export async function getMatchingRequest(requestId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(matchingRequests).where(eq(matchingRequests.id, requestId));
  return result.length > 0 ? result[0] : null;
}

export async function getUserMatchingRequests(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(matchingRequests).where(eq(matchingRequests.requesterId, userId));
}

/**
 * 위치 기반 매칭 - 동네 내 돌보미 찾기
 * Haversine 공식으로 두 GPS 좌표 간 거리 계산
 */
export async function findCaretakersNearby(
  neighborhood: string,
  latitude: number,
  longitude: number,
  radiusKm: number = 2,
) {
  const db = await getDb();
  if (!db) return [];

  // 동네 필터링 + GPS 거리 계산
  const caretakers = await db
    .select({
      id: userProfiles.id,
      userId: userProfiles.userId,
      nickname: userProfiles.nickname,
      bio: userProfiles.bio,
      profileEmoji: userProfiles.profileEmoji,
      rating: userProfiles.rating,
      reviewCount: userProfiles.reviewCount,
      isActive: userProfiles.isActive,
      neighborhood: userLocations.neighborhood,
      latitude: userLocations.latitude,
      longitude: userLocations.longitude,
      // Haversine 거리 계산 (km 단위)
      distance: sql<number>`
        (6371 * acos(cos(radians(${latitude})) * cos(radians(CAST(${userLocations.latitude} AS DECIMAL(10,6))))
        * cos(radians(CAST(${userLocations.longitude} AS DECIMAL(10,6))) - radians(${longitude}))
        + sin(radians(${latitude})) * sin(radians(CAST(${userLocations.latitude} AS DECIMAL(10,6))))))
      `,
    })
    .from(userProfiles)
    .innerJoin(userLocations, eq(userProfiles.userId, userLocations.userId))
    .where(
      and(
        eq(userProfiles.role, "caretaker"),
        eq(userProfiles.isActive, true),
        eq(userLocations.neighborhood, neighborhood),
      ),
    );

  // 거리순 정렬 및 필터링
  return caretakers
    .filter((c) => (c.distance as number) <= radiusKm)
    .sort((a, b) => ((a.distance as number) || 0) - ((b.distance as number) || 0));
}

/**
 * 동네별 반려인 찾기 (산책 친구 매칭용)
 */
export async function findOwnersInNeighborhood(neighborhood: string) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select({
      id: userProfiles.id,
      userId: userProfiles.userId,
      nickname: userProfiles.nickname,
      bio: userProfiles.bio,
      profileEmoji: userProfiles.profileEmoji,
      rating: userProfiles.rating,
      reviewCount: userProfiles.reviewCount,
      neighborhood: userLocations.neighborhood,
    })
    .from(userProfiles)
    .innerJoin(userLocations, eq(userProfiles.userId, userLocations.userId))
    .where(
      and(
        eq(userProfiles.role, "owner"),
        eq(userLocations.neighborhood, neighborhood),
      ),
    );
}

export async function createMatchingRequest(data: InsertMatchingRequest) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(matchingRequests).values(data);
  // 생성된 요청 조회
  const created = await db.select().from(matchingRequests).where(eq(matchingRequests.requesterId, data.requesterId)).orderBy(sql`createdAt DESC`);
  return created.length > 0 ? created[0].id : null;
}

export async function updateMatchingRequest(
  requestId: number,
  data: Partial<InsertMatchingRequest>,
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(matchingRequests).set(data).where(eq(matchingRequests.id, requestId));
}

export async function getNeighborhoodRequests(neighborhood: string, type?: string) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [
    eq(matchingRequests.neighborhood, neighborhood),
    eq(matchingRequests.status, "pending"),
  ];

  if (type) {
    conditions.push(eq(matchingRequests.type, type as any));
  }

  return db
    .select()
    .from(matchingRequests)
    .where(and(...conditions))
    .orderBy(sql`CASE WHEN isUrgent = true THEN 0 ELSE 1 END, createdAt DESC`);
}

/**
 * Matching History
 */
export async function createMatchingHistory(data: InsertMatchingHistory): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(matchingHistory).values(data);
}

export async function getMatchingHistoryBetween(ownerId: number, caretakerId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(matchingHistory)
    .where(and(eq(matchingHistory.ownerId, ownerId), eq(matchingHistory.caretakerId, caretakerId)));
}

export async function updateMatchingHistory(
  historyId: number,
  data: Partial<InsertMatchingHistory>,
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(matchingHistory).set(data).where(eq(matchingHistory.id, historyId));
}

/**
 * 사용자 평점 계산
 */
/**
 * Friend Codes - 친구 코드 관리
 */

// 친구 코드 등록 또는 업데이트
export async function upsertFriendCode(data: InsertFriendCode): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(friendCodes).values(data).onDuplicateKeyUpdate({
    set: {
      nickname: data.nickname,
      profileEmoji: data.profileEmoji,
      neighborhood: data.neighborhood,
      role: data.role,
    },
  });
}

// 친구 코드로 사용자 검색
export async function findUserByFriendCode(code: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(friendCodes).where(eq(friendCodes.code, code)).limit(1);
  return result.length > 0 ? result[0] : null;
}

// 내 친구 코드 조회
export async function getFriendCode(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(friendCodes).where(eq(friendCodes.userId, userId)).limit(1);
  return result.length > 0 ? result[0] : null;
}

// 친구 관계 추가
export async function addFriendship(data: InsertFriendship): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(friendships).values(data);
}

// 친구 목록 조회
export async function getFriendships(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(friendships).where(eq(friendships.userId, userId));
}

// 친구 관계 존재 확인
export async function isFriend(userId: number, friendUserId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const result = await db.select().from(friendships).where(
    and(eq(friendships.userId, userId), eq(friendships.friendUserId, friendUserId))
  ).limit(1);
  return result.length > 0;
}

// 친구 삭제
export async function removeFriendship(userId: number, friendUserId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(friendships).where(
    and(eq(friendships.userId, userId), eq(friendships.friendUserId, friendUserId))
  );
}

// 친구 요청 보내기
export async function createFriendRequest(data: InsertFriendRequest): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(friendRequests).values(data);
}

// 받은 친구 요청 목록
export async function getReceivedFriendRequests(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(friendRequests).where(
    and(eq(friendRequests.toUserId, userId), eq(friendRequests.status, "pending"))
  );
}

// 보낸 친구 요청 목록
export async function getSentFriendRequests(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(friendRequests).where(
    and(eq(friendRequests.fromUserId, userId))
  );
}

// 친구 요청 수락
export async function acceptFriendRequest(requestId: number): Promise<{ fromUserId: number; toUserId: number } | null> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // 요청 조회
  const reqs = await db.select().from(friendRequests).where(eq(friendRequests.id, requestId)).limit(1);
  if (reqs.length === 0) return null;
  const req = reqs[0];
  
  // 상태 업데이트
  await db.update(friendRequests).set({ status: "accepted" }).where(eq(friendRequests.id, requestId));
  
  // 양방향 친구 관계 추가
  // from -> to 의 정보를 가져오기 위해 to의 friendCode 조회
  const toCode = await db.select().from(friendCodes).where(eq(friendCodes.userId, req.toUserId)).limit(1);
  
  // from -> to 친구 추가
  if (toCode.length > 0) {
    const alreadyFriend1 = await isFriend(req.fromUserId, req.toUserId);
    if (!alreadyFriend1) {
      await db.insert(friendships).values({
        userId: req.fromUserId,
        friendUserId: req.toUserId,
        friendNickname: toCode[0].nickname,
        friendEmoji: toCode[0].profileEmoji,
        friendNeighborhood: toCode[0].neighborhood,
        friendRole: toCode[0].role,
      });
    }
  }
  
  // to -> from 친구 추가
  const alreadyFriend2 = await isFriend(req.toUserId, req.fromUserId);
  if (!alreadyFriend2) {
    await db.insert(friendships).values({
      userId: req.toUserId,
      friendUserId: req.fromUserId,
      friendNickname: req.fromNickname,
      friendEmoji: req.fromEmoji,
      friendNeighborhood: req.fromNeighborhood,
      friendRole: req.fromRole,
    });
  }
  
  return { fromUserId: req.fromUserId, toUserId: req.toUserId };
}

// 친구 요청 거절
export async function rejectFriendRequest(requestId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(friendRequests).set({ status: "rejected" }).where(eq(friendRequests.id, requestId));
}

// 중복 요청 확인
export async function hasPendingRequest(fromUserId: number, toUserId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const result = await db.select().from(friendRequests).where(
    and(
      eq(friendRequests.fromUserId, fromUserId),
      eq(friendRequests.toUserId, toUserId),
      eq(friendRequests.status, "pending")
    )
  ).limit(1);
  return result.length > 0;
}

export async function updateUserRating(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;

  // 해당 사용자의 모든 평가 조회
  const history = await db
    .select()
    .from(matchingHistory)
    .where(
      // 돌보미인 경우 caretakerId, 반려인인 경우 ownerId로 필터링
      sql`(caretakerId = ${userId} AND ownerRating IS NOT NULL) OR (ownerId = ${userId} AND caretakerRating IS NOT NULL)`,
    );

  if (history.length === 0) return;

  // 평균 평점 계산 (1-5 -> 0-500)
  let totalRating = 0;
  let count = 0;

  history.forEach((h) => {
    if (h.caretakerId === userId && h.ownerRating) {
      totalRating += h.ownerRating * 100;
      count++;
    }
    if (h.ownerId === userId && h.caretakerRating) {
      totalRating += h.caretakerRating * 100;
      count++;
    }
  });

  const avgRating = count > 0 ? Math.round(totalRating / count) : 0;

  // 사용자 프로필 업데이트
  await db
    .update(userProfiles)
    .set({ rating: avgRating, reviewCount: count })
    .where(eq(userProfiles.userId, userId));
}
