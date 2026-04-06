/**
 * 1인 가구 전용 안심 SOS '세이프티 넷' 시스템
 * - 설정 관리 (AsyncStorage 영속)
 * - 활동 감지 타이머 로직
 * - SOS 발송 시뮬레이션
 */
import AsyncStorage from "@react-native-async-storage/async-storage";

// ─── 타입 정의 ───

export interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  relationship: string; // 가족, 친구, 이웃 등
}

export type CheckInterval = 12 | 24 | 48; // 시간 단위

export interface SafetyNetSettings {
  enabled: boolean;
  contacts: EmergencyContact[];
  checkInterval: CheckInterval; // 시간
  lastActivityTime: string; // ISO 8601
  petName: string; // SOS 메시지에 포함할 반려견 이름
  petEmoji: string;
  ownerName: string; // 보호자 이름
  address: string; // 자택 주소
}

export interface SOSMessage {
  contactName: string;
  contactPhone: string;
  message: string;
  sentAt: string;
  status: "sent" | "delivered" | "failed";
}

export interface SafetyNetState {
  settings: SafetyNetSettings;
  isCheckPopupVisible: boolean;
  isSosSent: boolean;
  sosMessages: SOSMessage[];
  countdownSeconds: number; // 긴급 확인 팝업 카운트다운 (60초)
}

// ─── 기본값 ───

export const DEFAULT_SAFETY_NET_SETTINGS: SafetyNetSettings = {
  enabled: false,
  contacts: [],
  checkInterval: 24,
  lastActivityTime: new Date().toISOString(),
  petName: "초코",
  petEmoji: "🐶",
  ownerName: "초코맘",
  address: "대전 서구 둔산동 1234",
};

export const DEFAULT_SAFETY_NET_STATE: SafetyNetState = {
  settings: { ...DEFAULT_SAFETY_NET_SETTINGS },
  isCheckPopupVisible: false,
  isSosSent: false,
  sosMessages: [],
  countdownSeconds: 60,
};

// ─── 체크 간격 옵션 ───

export const CHECK_INTERVAL_OPTIONS: { label: string; value: CheckInterval }[] = [
  { label: "12시간", value: 12 },
  { label: "24시간", value: 24 },
  { label: "48시간", value: 48 },
];

// ─── 관계 옵션 ───

export const RELATIONSHIP_OPTIONS = [
  "가족",
  "친구",
  "이웃",
  "직장동료",
  "기타",
] as const;

// ─── AsyncStorage 키 ───

const STORAGE_KEY = "safety_net_settings";
const LAST_ACTIVITY_KEY = "safety_net_last_activity";

// ─── 저장/로드 함수 ───

export async function saveSafetyNetSettings(settings: SafetyNetSettings): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {
    console.warn("[SafetyNet] 설정 저장 실패:", e);
  }
}

export async function loadSafetyNetSettings(): Promise<SafetyNetSettings> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) {
      return { ...DEFAULT_SAFETY_NET_SETTINGS, ...JSON.parse(raw) };
    }
  } catch (e) {
    console.warn("[SafetyNet] 설정 로드 실패:", e);
  }
  return { ...DEFAULT_SAFETY_NET_SETTINGS };
}

export async function updateLastActivity(): Promise<string> {
  const now = new Date().toISOString();
  try {
    await AsyncStorage.setItem(LAST_ACTIVITY_KEY, now);
    // localStorage도 동기화 (웹 환경)
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.setItem(LAST_ACTIVITY_KEY, now);
    }
  } catch (e) {
    console.warn("[SafetyNet] 활동 시간 갱신 실패:", e);
  }
  return now;
}

export async function getLastActivity(): Promise<string> {
  try {
    const stored = await AsyncStorage.getItem(LAST_ACTIVITY_KEY);
    if (stored) return stored;
  } catch (e) {
    console.warn("[SafetyNet] 활동 시간 로드 실패:", e);
  }
  return new Date().toISOString();
}

// ─── 활동 감지 체크 ───

export function isActivityOverdue(lastActivity: string, checkIntervalHours: number): boolean {
  const lastTime = new Date(lastActivity).getTime();
  const now = Date.now();
  const diffHours = (now - lastTime) / (1000 * 60 * 60);
  return diffHours >= checkIntervalHours;
}

export function getTimeSinceLastActivity(lastActivity: string): {
  hours: number;
  minutes: number;
  totalMinutes: number;
} {
  const lastTime = new Date(lastActivity).getTime();
  const now = Date.now();
  const diffMs = now - lastTime;
  const totalMinutes = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return { hours, minutes, totalMinutes };
}

// ─── SOS 메시지 생성 ───

export function generateSOSMessage(settings: SafetyNetSettings): string {
  const intervalText = `${settings.checkInterval}시간`;
  return `[반려이음 안심 알림] ${settings.ownerName} 보호자님이 ${intervalText} 동안 활동이 없습니다. 현재 자택에 반려견 '${settings.petName}'${settings.petEmoji}가 혼자 있을 가능성이 높으니 확인 부탁드립니다. (주소: ${settings.address})`;
}

export function generateSOSMessages(settings: SafetyNetSettings): SOSMessage[] {
  const message = generateSOSMessage(settings);
  const now = new Date().toISOString();
  return settings.contacts.map((contact) => ({
    contactName: contact.name,
    contactPhone: contact.phone,
    message,
    sentAt: now,
    status: "sent" as const,
  }));
}

// ─── 유틸리티 ───

export function generateContactId(): string {
  return `contact_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length === 11) {
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 7)}-${cleaned.slice(7)}`;
  }
  if (cleaned.length === 10) {
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  return phone;
}

export function isValidPhoneNumber(phone: string): boolean {
  const cleaned = phone.replace(/\D/g, "");
  return cleaned.length >= 10 && cleaned.length <= 11;
}

// ─── 시연용 기본 연락처 ───

export const DEMO_CONTACTS: EmergencyContact[] = [
  {
    id: "demo_contact_1",
    name: "김영수",
    phone: "010-1234-5678",
    relationship: "가족",
  },
  {
    id: "demo_contact_2",
    name: "이지현",
    phone: "010-9876-5432",
    relationship: "이웃",
  },
];
