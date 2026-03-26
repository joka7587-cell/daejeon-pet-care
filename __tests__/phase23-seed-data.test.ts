import { describe, it, expect } from "vitest";
import {
  SEED_WALKERS,
  SEED_WORKER_DETAILS,
  SEED_BOOKINGS,
  SEED_OWNER_PROFILE,
  SEED_NOTIFICATIONS,
  SEED_PAYMENTS,
  SEED_CHAT_ROOMS,
  getSeedAppState,
  mergeSeedWalkers,
  mergeSeedWorkerDetails,
} from "../lib/seed-data";

describe("Phase 23: 시드 데이터 검증", () => {
  // ─── 시드 워커 5명 ───
  describe("시드 도그워커 데이터", () => {
    it("5명의 시드 워커가 존재해야 한다", () => {
      expect(SEED_WALKERS).toHaveLength(5);
    });

    it("모든 시드 워커 ID는 seed_w 접두사를 가져야 한다", () => {
      SEED_WALKERS.forEach((w) => {
        expect(w.id).toMatch(/^seed_w\d+$/);
      });
    });

    it("모든 시드 워커는 동구(자양동/가양동) 기반이어야 한다", () => {
      SEED_WALKERS.forEach((w) => {
        expect(w.district).toBe("동구");
        expect(["자양동", "가양동"]).toContain(w.neighborhood);
      });
    });

    it("모든 시드 워커는 caretaker 역할이어야 한다", () => {
      SEED_WALKERS.forEach((w) => {
        expect(w.role).toBe("caretaker");
      });
    });

    it("모든 시드 워커는 활성 상태여야 한다", () => {
      SEED_WALKERS.forEach((w) => {
        expect(w.isActive).toBe(true);
      });
    });

    it("모든 시드 워커는 대전 산책 전문가 뱃지를 가져야 한다", () => {
      SEED_WALKERS.forEach((w) => {
        expect(w.specialBadge).toBe("대전 산책 전문가");
      });
    });

    it("모든 시드 워커는 시간당 가격이 설정되어 있어야 한다", () => {
      SEED_WALKERS.forEach((w) => {
        expect(w.pricePerHour).toBeGreaterThan(0);
      });
    });

    it("모든 시드 워커는 평점이 4.0 이상이어야 한다", () => {
      SEED_WALKERS.forEach((w) => {
        expect(w.rating).toBeGreaterThanOrEqual(4.0);
      });
    });
  });

  // ─── 시드 워커 상세 정보 ───
  describe("시드 워커 상세 정보", () => {
    it("5명 모두 상세 정보가 존재해야 한다", () => {
      SEED_WALKERS.forEach((w) => {
        expect(SEED_WORKER_DETAILS[w.id]).toBeDefined();
      });
    });

    it("모든 시드 워커 상세에 자격증 사진 URL이 있어야 한다", () => {
      Object.values(SEED_WORKER_DETAILS).forEach((detail) => {
        expect(detail.certifications.length).toBeGreaterThan(0);
        detail.certifications.forEach((cert) => {
          expect(cert.imageUri).toMatch(/^https?:\/\//);
        });
      });
    });

    it("모든 시드 워커 상세에 장비 정보가 있어야 한다", () => {
      Object.values(SEED_WORKER_DETAILS).forEach((detail) => {
        expect(detail.equipment.length).toBeGreaterThan(0);
      });
    });

    it("모든 시드 워커 상세에 경력 정보가 있어야 한다", () => {
      Object.values(SEED_WORKER_DETAILS).forEach((detail) => {
        expect(detail.experiences.length).toBeGreaterThan(0);
        // 동구 경력이 최소 1건 이상 있어야 한다
        const hasDonggu = detail.experiences.some((exp) => exp.district === "동구");
        expect(hasDonggu).toBe(true);
      });
    });

    it("시드 워커 상세에 활동 가능 시간대가 있어야 한다", () => {
      Object.values(SEED_WORKER_DETAILS).forEach((detail) => {
        expect(detail.availableSlots).toBeDefined();
        expect(detail.availableSlots!.length).toBeGreaterThan(0);
      });
    });

    it("시드 워커 상세에 활동 동네가 있어야 한다", () => {
      Object.values(SEED_WORKER_DETAILS).forEach((detail) => {
        expect(detail.neighborhoods).toBeDefined();
        expect(detail.neighborhoods!.length).toBeGreaterThan(0);
      });
    });
  });

  // ─── 시드 예약 3건 ───
  describe("시드 예약 데이터", () => {
    it("3건의 예약이 존재해야 한다", () => {
      expect(SEED_BOOKINGS).toHaveLength(3);
    });

    it("모든 예약은 bk_seed_ 접두사를 가져야 한다", () => {
      SEED_BOOKINGS.forEach((b) => {
        expect(b.id).toMatch(/^bk_seed_\d+$/);
      });
    });

    it("예약 상태가 다양해야 한다 (confirmed, pending, completed)", () => {
      const statuses = SEED_BOOKINGS.map((b) => b.status);
      expect(statuses).toContain("confirmed");
      expect(statuses).toContain("pending");
      expect(statuses).toContain("completed");
    });

    it("모든 예약은 자양동/가양동 동네여야 한다", () => {
      SEED_BOOKINGS.forEach((b) => {
        expect(["자양동", "가양동"]).toContain(b.neighborhood);
      });
    });

    it("모든 예약에 워커 이름과 가격이 있어야 한다", () => {
      SEED_BOOKINGS.forEach((b) => {
        expect(b.walkerName).toBeTruthy();
        expect(b.price).toBeGreaterThan(0);
      });
    });
  });

  // ─── 시드 보호자 프로필 ───
  describe("시드 보호자 프로필", () => {
    it("대전 시민 인증이 완료 상태여야 한다", () => {
      expect(SEED_OWNER_PROFILE.locationVerified).toBe(true);
    });

    it("자양동 기반이어야 한다", () => {
      expect(SEED_OWNER_PROFILE.neighborhood).toBe("자양동");
    });

    it("보호자 역할이어야 한다", () => {
      expect(SEED_OWNER_PROFILE.role).toBe("owner");
    });

    it("반려동물 정보가 있어야 한다", () => {
      expect(SEED_OWNER_PROFILE.pets).toBeDefined();
      expect(SEED_OWNER_PROFILE.pets!.length).toBeGreaterThan(0);
    });

    it("반려동물에 이름, 품종, 크기, 이모지가 있어야 한다", () => {
      SEED_OWNER_PROFILE.pets!.forEach((pet) => {
        expect(pet.name).toBeTruthy();
        expect(pet.breed).toBeTruthy();
        expect(pet.size).toBeTruthy();
        expect(pet.emoji).toBeTruthy();
      });
    });
  });

  // ─── 시드 알림 ───
  describe("시드 알림 데이터", () => {
    it("알림이 존재해야 한다", () => {
      expect(SEED_NOTIFICATIONS.length).toBeGreaterThan(0);
    });

    it("대전 시민 인증 완료 알림이 있어야 한다", () => {
      const authNotif = SEED_NOTIFICATIONS.find((n) => n.title === "대전 시민 인증 완료");
      expect(authNotif).toBeDefined();
      expect(authNotif!.isRead).toBe(true);
    });
  });

  // ─── 시드 결제 ───
  describe("시드 결제 데이터", () => {
    it("결제 내역이 존재해야 한다", () => {
      expect(SEED_PAYMENTS.length).toBeGreaterThan(0);
    });

    it("온통대전 결제가 포함되어야 한다", () => {
      const ontong = SEED_PAYMENTS.find((p) => p.method === "ontong_daejeon");
      expect(ontong).toBeDefined();
    });
  });

  // ─── 시드 채팅방 ───
  describe("시드 채팅방 데이터", () => {
    it("채팅방이 존재해야 한다", () => {
      expect(SEED_CHAT_ROOMS.length).toBeGreaterThan(0);
    });

    it("모든 채팅방은 worker 타입이어야 한다", () => {
      SEED_CHAT_ROOMS.forEach((room) => {
        expect(room.type).toBe("worker");
      });
    });

    it("채팅방 ID는 room_worker_ 접두사를 가져야 한다", () => {
      SEED_CHAT_ROOMS.forEach((room) => {
        expect(room.id).toMatch(/^room_worker_seed_w\d+$/);
      });
    });
  });

  // ─── 헬퍼 함수 ───
  describe("헬퍼 함수", () => {
    it("getSeedAppState가 올바른 구조를 반환해야 한다", () => {
      const seedState = getSeedAppState();
      expect(seedState.profile).toBeDefined();
      expect(seedState.bookings).toHaveLength(3);
      expect(seedState.notifications.length).toBeGreaterThan(0);
      expect(seedState.payments.length).toBeGreaterThan(0);
      expect(seedState.chatRooms.length).toBeGreaterThan(0);
    });

    it("mergeSeedWalkers가 기존 워커에 시드 워커를 추가해야 한다", () => {
      const existing = [{ id: "c1", nickname: "기존 워커" }] as any[];
      const merged = mergeSeedWalkers(existing);
      expect(merged.length).toBe(1 + SEED_WALKERS.length);
    });

    it("mergeSeedWalkers가 중복 ID를 추가하지 않아야 한다", () => {
      const existing = [{ id: "seed_w1", nickname: "이미 존재" }] as any[];
      const merged = mergeSeedWalkers(existing);
      expect(merged.length).toBe(1 + SEED_WALKERS.length - 1); // seed_w1 중복 제외
    });

    it("mergeSeedWorkerDetails가 기존 상세에 시드 상세를 추가해야 한다", () => {
      const existing = { c1: {} as any };
      const merged = mergeSeedWorkerDetails(existing);
      expect(Object.keys(merged)).toContain("c1");
      expect(Object.keys(merged)).toContain("seed_w1");
      expect(Object.keys(merged)).toContain("seed_w5");
    });
  });
});
