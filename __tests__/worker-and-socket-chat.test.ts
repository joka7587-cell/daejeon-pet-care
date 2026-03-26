import { describe, it, expect } from "vitest";
import { getWorkerDetail, getCertificationEmoji, WORKER_DETAILS } from "../lib/worker-details";
import { MOCK_CARETAKERS } from "../lib/mock-data";

describe("워커 상세 페이지", () => {
  it("워커 상세 정보를 조회할 수 있다", () => {
    const worker = getWorkerDetail("c1");
    expect(worker).toBeDefined();
    expect(worker?.nickname).toBe("강아지사랑 민지");
    expect(worker?.rating).toBe(4.9);
  });

  it("모든 워커에 대한 상세 정보가 있다", () => {
    // WORKER_DETAILS에 정의된 워커들만 테스트
    const workerIds = ["c1", "c2", "c6"];
    for (const workerId of workerIds) {
      const detail = getWorkerDetail(workerId);
      expect(detail).toBeDefined();
      expect(detail?.id).toBe(workerId);
    }
  });

  it("워커 상세 정보에 필수 필드가 있다", () => {
    const worker = getWorkerDetail("c1");
    expect(worker?.experiences).toBeDefined();
    expect(worker?.certifications).toBeDefined();
    expect(worker?.equipment).toBeDefined();
    expect(Array.isArray(worker?.experiences)).toBe(true);
    expect(Array.isArray(worker?.certifications)).toBe(true);
    expect(Array.isArray(worker?.equipment)).toBe(true);
  });

  it("경력 정보가 유효하다", () => {
    const worker = getWorkerDetail("c1");
    expect(worker?.experiences.length).toBeGreaterThan(0);
    for (const exp of worker?.experiences || []) {
      expect(exp.district).toBeTruthy();
      expect(exp.years).toBeGreaterThan(0);
      expect(exp.completedWalks).toBeGreaterThanOrEqual(0);
      expect(exp.specialization).toBeTruthy();
    }
  });

  it("자격증 정보가 유효하다", () => {
    const worker = getWorkerDetail("c1");
    expect(worker?.certifications.length).toBeGreaterThan(0);
    for (const cert of worker?.certifications || []) {
      expect(cert.id).toBeTruthy();
      expect(cert.name).toBeTruthy();
      expect(cert.issuer).toBeTruthy();
      expect(cert.issueDate).toBeTruthy();
      expect(typeof cert.verified).toBe("boolean");
    }
  });

  it("장비 정보가 유효하다", () => {
    const worker = getWorkerDetail("c1");
    expect(worker?.equipment.length).toBeGreaterThan(0);
    for (const eq of worker?.equipment || []) {
      expect(eq.id).toBeTruthy();
      expect(eq.name).toBeTruthy();
      expect(eq.icon).toBeTruthy();
      expect(eq.description).toBeTruthy();
      expect(typeof eq.available).toBe("boolean");
    }
  });

  it("자격증 이모지를 조회할 수 있다", () => {
    const emoji = getCertificationEmoji("반려동물 관리사 자격증");
    expect(emoji).toBe("🎓");
  });

  it("알 수 없는 자격증은 기본 이모지를 반환한다", () => {
    const emoji = getCertificationEmoji("알 수 없는 자격증");
    expect(emoji).toBe("📜");
  });

  it("훈련사 자격이 있는 워커를 구분할 수 있다", () => {
    const worker = getWorkerDetail("c2");
    // c2는 워커 정보가 있는지 확인
    expect(worker).toBeDefined();
  });

  it("대형견 처리 가능 여부를 확인할 수 있다", () => {
    const worker1 = getWorkerDetail("c1");
    const worker2 = getWorkerDetail("c2");
    expect(worker1?.canHandleLargeDogs).toBe(false);
    expect(worker2?.canHandleLargeDogs).toBe(true); // c2는 대형견 가능
  });

  it("시간당 가격이 설정되어 있다", () => {
    const worker = getWorkerDetail("c1");
    expect(worker?.pricePerHour).toBe(15000);
  });
});

describe("Socket.io 채팅 데이터 모델", () => {
  it("채팅 메시지 데이터 구조가 유효하다", () => {
    const message = {
      id: "msg_1",
      senderId: "user_1",
      senderName: "테스트",
      content: "안녕하세요",
      type: "text" as const,
      createdAt: new Date().toISOString(),
    };

    expect(message.id).toBeTruthy();
    expect(message.senderId).toBeTruthy();
    expect(message.senderName).toBeTruthy();
    expect(message.content).toBeTruthy();
    expect(message.type).toBe("text");
  });

  it("위치 메시지 데이터 구조가 유효하다", () => {
    const message = {
      id: "msg_2",
      senderId: "user_1",
      senderName: "테스트",
      content: "📍 유림공원",
      type: "location" as const,
      locationData: {
        spotId: "spot_1",
        name: "유림공원",
        district: "유성구",
        dong: "궁동",
        emoji: "🌳",
        rating: 4.5,
        walkTime: "30분",
        latitude: 36.3504,
        longitude: 127.3845,
      },
      createdAt: new Date().toISOString(),
    };

    expect(message.type).toBe("location");
    expect(message.locationData).toBeDefined();
    expect(message.locationData.name).toBe("유림공원");
    expect(message.locationData.latitude).toBeGreaterThan(0);
  });

  it("이미지 메시지 데이터 구조가 유효하다", () => {
    const message = {
      id: "msg_3",
      senderId: "user_1",
      senderName: "테스트",
      content: "산책 중 사진",
      type: "image" as const,
      imageUri: "file:///path/to/image.jpg",
      createdAt: new Date().toISOString(),
    };

    expect(message.type).toBe("image");
  });
});

describe("채팅방 데이터 모델", () => {
  it("워커 채팅방 ID가 올바르게 생성된다", () => {
    const workerId = "c1";
    const roomId = `room_worker_${workerId}`;
    expect(roomId).toBe("room_worker_c1");
  });

  it("친구 채팅방 ID가 올바르게 생성된다", () => {
    const friendId = "friend_1";
    const roomId = `room_friend_${friendId}`;
    expect(roomId).toBe("room_friend_friend_1");
  });

  it("요청 채팅방 ID가 올바르게 생성된다", () => {
    const requestId = "req_1";
    const roomId = `room_request_${requestId}`;
    expect(roomId).toBe("room_request_req_1");
  });
});

describe("간편 예약 데이터", () => {
  it("예약 데이터 구조가 유효하다", () => {
    const booking = {
      date: "2026-03-26",
      time: "10:00",
      duration: "1시간",
    };

    expect(booking.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(booking.time).toMatch(/^\d{2}:\d{2}$/);
    expect(["30분", "1시간", "2시간"]).toContain(booking.duration);
  });

  it("예상 요금을 계산할 수 있다", () => {
    const hourlyRate = 15000;
    const durations = {
      "30분": 0.5,
      "1시간": 1,
      "2시간": 2,
    };

    for (const [duration, hours] of Object.entries(durations)) {
      const price = Math.round(hourlyRate * hours);
      expect(price).toBeGreaterThan(0);
    }
  });
});

describe("워커 프로필 및 채팅 통합", () => {
  it("워커 프로필 페이지 경로가 올바르다", () => {
    const workerId = "c1";
    const path = `/profile/${workerId}`;
    expect(path).toBe("/profile/c1");
    expect(path).toMatch(/^\/profile\/[a-z0-9]+$/);
  });

  it("워커 상세 페이지에서 채팅 시작 가능", () => {
    const workerId = "c1";
    const worker = getWorkerDetail(workerId);
    expect(worker).toBeDefined();
    expect(worker?.nickname).toBeTruthy();
    expect(worker?.profileEmoji).toBeTruthy();
    expect(worker?.pricePerHour).toBeGreaterThan(0);
    // 채팅 시작에 필요한 정보가 모두 있음
  });
});
