import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  DEFAULT_SAFETY_NET_SETTINGS,
  DEFAULT_SAFETY_NET_STATE,
  CHECK_INTERVAL_OPTIONS,
  RELATIONSHIP_OPTIONS,
  DEMO_CONTACTS,
  isActivityOverdue,
  getTimeSinceLastActivity,
  generateSOSMessage,
  generateSOSMessages,
  generateDemoSOSCompletionMessage,
  generateDemoPopupMessage,
  generateContactId,
  formatPhoneNumber,
  isValidPhoneNumber,
  isDemoMode,
  getIntervalDisplayText,
  getPopupCountdown,
  type SafetyNetSettings,
  type EmergencyContact,
  type SOSMessage,
  type CheckInterval,
} from "../lib/safety-net";

describe("세이프티 넷 데이터 모델", () => {
  it("기본 설정값이 올바르게 정의되어 있다", () => {
    expect(DEFAULT_SAFETY_NET_SETTINGS.enabled).toBe(false);
    expect(DEFAULT_SAFETY_NET_SETTINGS.contacts).toEqual([]);
    expect(DEFAULT_SAFETY_NET_SETTINGS.checkInterval).toBe(24);
    expect(DEFAULT_SAFETY_NET_SETTINGS.petName).toBe("초코");
    expect(DEFAULT_SAFETY_NET_SETTINGS.ownerName).toBe("초코맘");
    expect(DEFAULT_SAFETY_NET_SETTINGS.address).toContain("대전");
  });

  it("기본 상태값이 올바르게 정의되어 있다", () => {
    expect(DEFAULT_SAFETY_NET_STATE.isCheckPopupVisible).toBe(false);
    expect(DEFAULT_SAFETY_NET_STATE.isSosSent).toBe(false);
    expect(DEFAULT_SAFETY_NET_STATE.sosMessages).toEqual([]);
    expect(DEFAULT_SAFETY_NET_STATE.countdownSeconds).toBe(60);
  });

  it("체크 간격 옵션이 4개 (10초/12h/24h/48h) 정의되어 있다", () => {
    expect(CHECK_INTERVAL_OPTIONS).toHaveLength(4);
    const values = CHECK_INTERVAL_OPTIONS.map((o) => o.value);
    expect(values).toContain(0.00278);
    expect(values).toContain(12);
    expect(values).toContain(24);
    expect(values).toContain(48);
  });

  it("10초 시연 모드 옵션이 isDemo 플래그를 가진다", () => {
    const demoOpt = CHECK_INTERVAL_OPTIONS.find((o) => o.isDemo);
    expect(demoOpt).toBeDefined();
    expect(demoOpt!.label).toContain("시연용");
    expect(demoOpt!.value).toBe(0.00278);
  });

  it("관계 옵션이 5개 정의되어 있다", () => {
    expect(RELATIONSHIP_OPTIONS).toHaveLength(5);
    expect(RELATIONSHIP_OPTIONS).toContain("가족");
    expect(RELATIONSHIP_OPTIONS).toContain("이웃");
  });

  it("시연용 데모 연락처가 2명 정의되어 있다", () => {
    expect(DEMO_CONTACTS).toHaveLength(2);
    expect(DEMO_CONTACTS[0].name).toBe("김영수");
    expect(DEMO_CONTACTS[0].relationship).toBe("가족");
    expect(DEMO_CONTACTS[1].name).toBe("이지현");
    expect(DEMO_CONTACTS[1].relationship).toBe("이웃");
  });
});

describe("활동 감지 타이머 로직", () => {
  it("활동 시간이 설정 시간을 초과하면 true를 반환한다", () => {
    const past = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
    expect(isActivityOverdue(past, 24)).toBe(true);
  });

  it("활동 시간이 설정 시간 이내이면 false를 반환한다", () => {
    const recent = new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString();
    expect(isActivityOverdue(recent, 24)).toBe(false);
  });

  it("정확히 설정 시간과 같으면 true를 반환한다", () => {
    const exact = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();
    expect(isActivityOverdue(exact, 12)).toBe(true);
  });

  it("12시간 체크 간격으로 13시간 경과 시 초과 판정", () => {
    const past = new Date(Date.now() - 13 * 60 * 60 * 1000).toISOString();
    expect(isActivityOverdue(past, 12)).toBe(true);
  });

  it("48시간 체크 간격으로 47시간 경과 시 미초과 판정", () => {
    const past = new Date(Date.now() - 47 * 60 * 60 * 1000).toISOString();
    expect(isActivityOverdue(past, 48)).toBe(false);
  });

  it("10초(0.003h) 시연 모드에서 11초 경과 시 초과 판정", () => {
    const past = new Date(Date.now() - 11 * 1000).toISOString();
    expect(isActivityOverdue(past, 0.00278)).toBe(true);
  });

  it("10초(0.003h) 시연 모드에서 5초 경과 시 미초과 판정", () => {
    const past = new Date(Date.now() - 5 * 1000).toISOString();
    expect(isActivityOverdue(past, 0.00278)).toBe(false);
  });

  it("마지막 활동 이후 경과 시간을 올바르게 계산한다", () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000 - 30 * 60 * 1000).toISOString();
    const result = getTimeSinceLastActivity(twoHoursAgo);
    expect(result.hours).toBe(2);
    expect(result.minutes).toBe(30);
    expect(result.totalMinutes).toBe(150);
  });

  it("방금 활동한 경우 경과 시간이 0이다", () => {
    const now = new Date().toISOString();
    const result = getTimeSinceLastActivity(now);
    expect(result.hours).toBe(0);
    expect(result.minutes).toBe(0);
    expect(result.totalMinutes).toBe(0);
  });
});

describe("시연 모드 유틸리티", () => {
  it("isDemoMode가 0.003을 시연 모드로 판별한다", () => {
    expect(isDemoMode(0.00278)).toBe(true);
  });

  it("isDemoMode가 12/24/48을 시연 모드가 아닌 것으로 판별한다", () => {
    expect(isDemoMode(12)).toBe(false);
    expect(isDemoMode(24)).toBe(false);
    expect(isDemoMode(48)).toBe(false);
  });

  it("getIntervalDisplayText가 시연 모드에서 '10초'를 반환한다", () => {
    expect(getIntervalDisplayText(0.00278)).toBe("10초");
  });

  it("getIntervalDisplayText가 일반 모드에서 시간 단위를 반환한다", () => {
    expect(getIntervalDisplayText(12)).toBe("12시간");
    expect(getIntervalDisplayText(24)).toBe("24시간");
    expect(getIntervalDisplayText(48)).toBe("48시간");
  });

  it("getPopupCountdown가 시연 모드에서 5초를 반환한다", () => {
    expect(getPopupCountdown(0.00278)).toBe(5);
  });

  it("getPopupCountdown가 일반 모드에서 60초를 반환한다", () => {
    expect(getPopupCountdown(12)).toBe(60);
    expect(getPopupCountdown(24)).toBe(60);
    expect(getPopupCountdown(48)).toBe(60);
  });
});

describe("SOS 메시지 생성", () => {
  const testSettings: SafetyNetSettings = {
    enabled: true,
    contacts: DEMO_CONTACTS,
    checkInterval: 24,
    lastActivityTime: new Date().toISOString(),
    petName: "초코",
    petEmoji: "🐶",
    ownerName: "홍길동",
    address: "대전 서구 둔산동 1234",
  };

  it("SOS 메시지에 보호자 이름이 포함된다", () => {
    const msg = generateSOSMessage(testSettings);
    expect(msg).toContain("홍길동");
  });

  it("SOS 메시지에 반려견 이름이 포함된다", () => {
    const msg = generateSOSMessage(testSettings);
    expect(msg).toContain("초코");
  });

  it("SOS 메시지에 주소가 포함된다", () => {
    const msg = generateSOSMessage(testSettings);
    expect(msg).toContain("대전 서구 둔산동 1234");
  });

  it("SOS 메시지에 활동 감지 시간이 포함된다", () => {
    const msg = generateSOSMessage(testSettings);
    expect(msg).toContain("24시간");
  });

  it("SOS 메시지에 [반려이음 안심 알림] 프리픽스가 포함된다", () => {
    const msg = generateSOSMessage(testSettings);
    expect(msg).toContain("[반려이음 안심 알림]");
  });

  it("시연 모드에서 SOS 메시지에 10초가 표시된다", () => {
    const demoSettings = { ...testSettings, checkInterval: 0.00278 as CheckInterval };
    const msg = generateSOSMessage(demoSettings);
    expect(msg).toContain("10초");
  });

  it("연락처 수만큼 SOS 메시지가 생성된다", () => {
    const messages = generateSOSMessages(testSettings);
    expect(messages).toHaveLength(2);
    expect(messages[0].contactName).toBe("김영수");
    expect(messages[1].contactName).toBe("이지현");
  });

  it("생성된 SOS 메시지에 발송 시간이 포함된다", () => {
    const messages = generateSOSMessages(testSettings);
    messages.forEach((msg) => {
      expect(msg.sentAt).toBeTruthy();
      expect(msg.status).toBe("sent");
    });
  });

  it("12시간 설정 시 메시지에 12시간이 표시된다", () => {
    const settings12h = { ...testSettings, checkInterval: 12 as CheckInterval };
    const msg = generateSOSMessage(settings12h);
    expect(msg).toContain("12시간");
  });

  it("48시간 설정 시 메시지에 48시간이 표시된다", () => {
    const settings48h = { ...testSettings, checkInterval: 48 as CheckInterval };
    const msg = generateSOSMessage(settings48h);
    expect(msg).toContain("48시간");
  });
});

describe("시연용 메시지 생성", () => {
  const testSettings: SafetyNetSettings = {
    enabled: true,
    contacts: DEMO_CONTACTS,
    checkInterval: 0.00278 as CheckInterval,
    lastActivityTime: new Date().toISOString(),
    petName: "초코",
    petEmoji: "🐶",
    ownerName: "홍길동",
    address: "대전 서구 둔산동 1234",
  };

  it("시연 팝업 메시지에 10초가 포함된다", () => {
    const msg = generateDemoPopupMessage(testSettings);
    expect(msg).toContain("10초");
  });

  it("시연 팝업 메시지에 5초 후 발송 안내가 포함된다", () => {
    const msg = generateDemoPopupMessage(testSettings);
    expect(msg).toContain("5초");
  });

  it("일반 모드 팝업 메시지에 시간 단위가 포함된다", () => {
    const normalSettings = { ...testSettings, checkInterval: 24 as CheckInterval };
    const msg = generateDemoPopupMessage(normalSettings);
    expect(msg).toContain("24시간");
  });

  it("SOS 완료 메시지에 연락처 전화번호가 포함된다", () => {
    const msg = generateDemoSOSCompletionMessage(testSettings, DEMO_CONTACTS[0]);
    expect(msg).toContain(DEMO_CONTACTS[0].phone);
  });

  it("SOS 완료 메시지에 반려견 이름이 포함된다", () => {
    const msg = generateDemoSOSCompletionMessage(testSettings, DEMO_CONTACTS[0]);
    expect(msg).toContain("초코");
  });

  it("SOS 완료 메시지에 위치 발송 안내가 포함된다", () => {
    const msg = generateDemoSOSCompletionMessage(testSettings, DEMO_CONTACTS[0]);
    expect(msg).toContain("발송");
  });
});

describe("유틸리티 함수", () => {
  it("연락처 ID가 고유하게 생성된다", () => {
    const id1 = generateContactId();
    const id2 = generateContactId();
    expect(id1).not.toBe(id2);
    expect(id1).toContain("contact_");
  });

  it("11자리 전화번호가 올바르게 포맷된다", () => {
    expect(formatPhoneNumber("01012345678")).toBe("010-1234-5678");
  });

  it("10자리 전화번호가 올바르게 포맷된다", () => {
    expect(formatPhoneNumber("0212345678")).toBe("021-234-5678");
  });

  it("이미 포맷된 전화번호가 올바르게 처리된다", () => {
    expect(formatPhoneNumber("010-1234-5678")).toBe("010-1234-5678");
  });

  it("유효한 전화번호를 올바르게 검증한다", () => {
    expect(isValidPhoneNumber("01012345678")).toBe(true);
    expect(isValidPhoneNumber("010-1234-5678")).toBe(true);
    expect(isValidPhoneNumber("0212345678")).toBe(true);
  });

  it("유효하지 않은 전화번호를 올바르게 거부한다", () => {
    expect(isValidPhoneNumber("123")).toBe(false);
    expect(isValidPhoneNumber("")).toBe(false);
    expect(isValidPhoneNumber("abc")).toBe(false);
  });
});

describe("EmergencyContact 타입", () => {
  it("연락처 객체가 올바른 구조를 가진다", () => {
    const contact: EmergencyContact = {
      id: "test_1",
      name: "테스트",
      phone: "010-1111-2222",
      relationship: "가족",
    };
    expect(contact.id).toBe("test_1");
    expect(contact.name).toBe("테스트");
    expect(contact.phone).toBe("010-1111-2222");
    expect(contact.relationship).toBe("가족");
  });
});

describe("SOSMessage 타입", () => {
  it("SOS 메시지 객체가 올바른 구조를 가진다", () => {
    const msg: SOSMessage = {
      contactName: "김영수",
      contactPhone: "010-1234-5678",
      message: "테스트 메시지",
      sentAt: new Date().toISOString(),
      status: "sent",
    };
    expect(msg.contactName).toBe("김영수");
    expect(msg.status).toBe("sent");
  });
});

describe("세이프티 넷 설정 통합 시나리오", () => {
  it("세이프티 넷 활성화 → 연락처 추가 → SOS 메시지 생성 플로우", () => {
    const settings: SafetyNetSettings = {
      ...DEFAULT_SAFETY_NET_SETTINGS,
      enabled: true,
      ownerName: "박민수",
      petName: "뽀삐",
      petEmoji: "🐕",
      address: "대전 유성구 궁동 456",
      checkInterval: 12,
    };

    const contact: EmergencyContact = {
      id: generateContactId(),
      name: "박영희",
      phone: formatPhoneNumber("01098765432"),
      relationship: "가족",
    };
    settings.contacts = [contact];

    const messages = generateSOSMessages(settings);
    expect(messages).toHaveLength(1);
    expect(messages[0].contactName).toBe("박영희");
    expect(messages[0].message).toContain("박민수");
    expect(messages[0].message).toContain("뽀삐");
    expect(messages[0].message).toContain("대전 유성구 궁동 456");
    expect(messages[0].message).toContain("12시간");
  });

  it("활동 초과 감지 → 긴급 확인 → 미응답 → SOS 발송 시나리오", () => {
    const lastActivity = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
    
    expect(isActivityOverdue(lastActivity, 24)).toBe(true);
    
    const elapsed = getTimeSinceLastActivity(lastActivity);
    expect(elapsed.hours).toBeGreaterThanOrEqual(25);
    
    const settings: SafetyNetSettings = {
      ...DEFAULT_SAFETY_NET_SETTINGS,
      enabled: true,
      contacts: DEMO_CONTACTS,
    };
    const messages = generateSOSMessages(settings);
    expect(messages).toHaveLength(2);
    messages.forEach((msg) => {
      expect(msg.status).toBe("sent");
      expect(msg.message).toContain("[반려이음 안심 알림]");
    });
  });

  it("시연 모드 전체 플로우: 10초 설정 → 초과 감지 → 5초 카운트다운 → SOS 발송", () => {
    // 1. 10초 시연 모드 설정
    const settings: SafetyNetSettings = {
      ...DEFAULT_SAFETY_NET_SETTINGS,
      enabled: true,
      checkInterval: 0.00278 as CheckInterval,
      contacts: DEMO_CONTACTS,
      ownerName: "홍길동",
      petName: "초코",
      address: "대전 서구 둔산동 1234",
    };

    // 2. 시연 모드 확인
    expect(isDemoMode(settings.checkInterval)).toBe(true);
    expect(getPopupCountdown(settings.checkInterval)).toBe(5);
    expect(getIntervalDisplayText(settings.checkInterval)).toBe("10초");

    // 3. 11초 경과 → 초과 감지
    const past = new Date(Date.now() - 11 * 1000).toISOString();
    expect(isActivityOverdue(past, settings.checkInterval)).toBe(true);

    // 4. 팝업 메시지 확인
    const popupMsg = generateDemoPopupMessage(settings);
    expect(popupMsg).toContain("10초");
    expect(popupMsg).toContain("5초");

    // 5. SOS 발송
    const messages = generateSOSMessages(settings);
    expect(messages).toHaveLength(2);
    
    // 6. 완료 메시지 확인
    const completionMsg = generateDemoSOSCompletionMessage(settings, DEMO_CONTACTS[0]);
    expect(completionMsg).toContain(DEMO_CONTACTS[0].phone);
    expect(completionMsg).toContain("초코");
  });
});
