import { z } from "zod";
import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import * as db from "./db";

// 문자열을 숫자 해시로 변환 (기기 ID -> 숫자 ID)
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash;
}

export const appRouter = router({
  // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // 친구 코드 시스템 API
  friends: router({
    // 내 친구 코드 등록/업데이트
    registerCode: publicProcedure
      .input(z.object({
        deviceId: z.string().min(1),
        code: z.string().min(1).max(20),
        nickname: z.string().min(1).max(100),
        profileEmoji: z.string().optional(),
        neighborhood: z.string().optional(),
        role: z.enum(["owner", "caretaker"]),
      }))
      .mutation(async ({ input }) => {
        // deviceId를 userId로 사용 (로그인 없이 기기 기반)
        const numericId = Math.abs(hashString(input.deviceId));
        await db.upsertFriendCode({
          userId: numericId,
          code: input.code,
          nickname: input.nickname,
          profileEmoji: input.profileEmoji ?? null,
          neighborhood: input.neighborhood ?? null,
          role: input.role,
        });
        return { success: true };
      }),

    // 친구 코드로 사용자 검색
    searchByCode: publicProcedure
      .input(z.object({ code: z.string().min(1).max(20) }))
      .query(async ({ input }) => {
        const found = await db.findUserByFriendCode(input.code.toUpperCase());
        if (!found) return null;
        return {
          userId: found.userId,
          nickname: found.nickname,
          profileEmoji: found.profileEmoji,
          neighborhood: found.neighborhood,
          role: found.role,
        };
      }),

    // 친구 추가
    addFriend: publicProcedure
      .input(z.object({
        deviceId: z.string().min(1),
        friendUserId: z.number(),
        friendNickname: z.string(),
        friendEmoji: z.string().optional(),
        friendNeighborhood: z.string().optional(),
        friendRole: z.enum(["owner", "caretaker"]),
      }))
      .mutation(async ({ input }) => {
        const myId = Math.abs(hashString(input.deviceId));
        const alreadyFriend = await db.isFriend(myId, input.friendUserId);
        if (alreadyFriend) {
          return { success: false, message: "이미 친구로 추가된 사용자입니다" };
        }
        await db.addFriendship({
          userId: myId,
          friendUserId: input.friendUserId,
          friendNickname: input.friendNickname,
          friendEmoji: input.friendEmoji ?? null,
          friendNeighborhood: input.friendNeighborhood ?? null,
          friendRole: input.friendRole,
        });
        return { success: true };
      }),

    // 친구 목록 조회
    list: publicProcedure
      .input(z.object({ deviceId: z.string().min(1) }))
      .query(async ({ input }) => {
        const myId = Math.abs(hashString(input.deviceId));
        return db.getFriendships(myId);
      }),

    // 친구 삭제
    removeFriend: publicProcedure
      .input(z.object({
        deviceId: z.string().min(1),
        friendUserId: z.number(),
      }))
      .mutation(async ({ input }) => {
        const myId = Math.abs(hashString(input.deviceId));
        await db.removeFriendship(myId, input.friendUserId);
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
