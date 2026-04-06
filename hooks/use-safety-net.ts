/**
 * useSafetyNet - 앱 전역 활동 감지 타이머 훅
 * 
 * 앱이 실행 중일 때:
 * 1. 앱 열기/산책 시작 시 last_activity_time 자동 갱신
 * 2. 주기적으로 (현재시간 - 마지막활동) > 설정시간 체크
 * 3. 초과 시 긴급 확인 팝업 트리거
 */
import { useEffect, useRef, useCallback } from "react";
import {
  loadSafetyNetSettings,
  updateLastActivity,
  getLastActivity,
  isActivityOverdue,
  type SafetyNetSettings,
} from "@/lib/safety-net";

interface UseSafetyNetOptions {
  /** 활동 체크 주기 (ms). 기본 60초 */
  checkIntervalMs?: number;
  /** 활동 초과 시 콜백 */
  onOverdue?: (settings: SafetyNetSettings) => void;
}

export function useSafetyNet(options: UseSafetyNetOptions = {}) {
  const { checkIntervalMs = 60_000, onOverdue } = options;
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const settingsRef = useRef<SafetyNetSettings | null>(null);

  // 활동 시간 갱신 (앱 열기, 산책 시작 등에서 호출)
  const recordActivity = useCallback(async () => {
    await updateLastActivity();
  }, []);

  // 주기적 체크
  useEffect(() => {
    let mounted = true;

    const checkActivity = async () => {
      if (!mounted) return;
      try {
        const settings = await loadSafetyNetSettings();
        settingsRef.current = settings;

        if (!settings.enabled || settings.contacts.length === 0) return;

        const lastActivity = await getLastActivity();
        if (isActivityOverdue(lastActivity, settings.checkInterval)) {
          onOverdue?.(settings);
        }
      } catch (e) {
        console.warn("[SafetyNet] 활동 체크 실패:", e);
      }
    };

    // 앱 시작 시 활동 기록
    recordActivity();

    // 주기적 체크 시작
    timerRef.current = setInterval(checkActivity, checkIntervalMs);

    return () => {
      mounted = false;
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [checkIntervalMs, onOverdue, recordActivity]);

  return { recordActivity };
}
