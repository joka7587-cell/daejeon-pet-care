/**
 * 1인 가구 전용 안심 SOS '세이프티 넷' 설정 화면
 * - 안심 알림 토글
 * - 비상 연락망 등록 (이름/전화번호/관계)
 * - 활동 감지 시간 드롭다운 (10초 시연 모드 포함)
 * - 시연용 SOS 메시지 미리보기
 * - 긴급 확인 팝업 + 5초/60초 카운트다운 + SOS 발송 시뮬레이션
 * - 푸시 알림 바(Toast) 시각적 연출
 * - [버그 수정] 진동/타이머 인스턴스 전역 관리 + 즉시 중단 + 강제 초기화
 */
import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  ScrollView,
  View,
  Text,
  Switch,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
  Modal,
  Platform,
  Animated,
  Dimensions,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useRouter } from "expo-router";
import { useApp } from "@/lib/app-context";
import * as Haptics from "expo-haptics";
import {
  SafetyNetSettings,
  EmergencyContact,
  CheckInterval,
  DEFAULT_SAFETY_NET_SETTINGS,
  CHECK_INTERVAL_OPTIONS,
  RELATIONSHIP_OPTIONS,
  DEMO_CONTACTS,
  saveSafetyNetSettings,
  loadSafetyNetSettings,
  updateLastActivity,
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
  type SOSMessage,
} from "@/lib/safety-net";

// ─── 진동 유틸 (전역 제어 가능) ───
let vibrationIntervalId: ReturnType<typeof setInterval> | null = null;

function startVibrationLoop() {
  stopVibrationLoop(); // 기존 진동 먼저 중단
  if (Platform.OS !== "web") {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    vibrationIntervalId = setInterval(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }, 1500);
  }
}

function stopVibrationLoop() {
  if (vibrationIntervalId) {
    clearInterval(vibrationIntervalId);
    vibrationIntervalId = null;
  }
  // 웹 환경에서 navigator.vibrate(0)으로 진동 강제 중단
  if (Platform.OS === "web" && typeof navigator !== "undefined" && navigator.vibrate) {
    navigator.vibrate(0);
  }
}

function haptic() {
  if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}
function hapticError() {
  if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
}
function hapticSuccess() {
  if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
}

const accentColor = "#2E7D32";
const errorColor = "#D32F2F";
const warningColor = "#FF6F00";
const sosColor = "#C62828";
const screenWidth = Dimensions.get("window").width;

export default function SafetyNetScreen() {
  const router = useRouter();
  const { state } = useApp();

  // ─── 설정 상태 ───
  const [settings, setSettings] = useState<SafetyNetSettings>({
    ...DEFAULT_SAFETY_NET_SETTINGS,
    ownerName: state.profile.nickname || "초코맘",
    petName: state.profile.pets[0]?.name || "초코",
    petEmoji: state.profile.pets[0]?.emoji || "🐶",
    address: `대전 ${state.profile.neighborhood || "서구 둔산동"} 1234`,
  });

  // ─── 설정 상태를 ref로도 추적 (타이머 콜백에서 최신 값 참조) ───
  const settingsRef = useRef(settings);
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  // ─── 연락처 입력 상태 ───
  const [newContactName, setNewContactName] = useState("");
  const [newContactPhone, setNewContactPhone] = useState("");
  const [newContactRelation, setNewContactRelation] = useState("가족");
  const [showRelationPicker, setShowRelationPicker] = useState(false);

  // ─── 체크 간격 드롭다운 ───
  const [showIntervalPicker, setShowIntervalPicker] = useState(false);

  // ─── 긴급 확인 팝업 ───
  const [showCheckPopup, setShowCheckPopup] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ─── SOS 발송 결과 ───
  const [showSosResult, setShowSosResult] = useState(false);
  const [sosMessages, setSosMessages] = useState<SOSMessage[]>([]);

  // ─── 저장 완료 토스트 ───
  const [showSaveToast, setShowSaveToast] = useState(false);

  // ─── 푸시 알림 바 (SOS 발송 완료 시각적 연출) ───
  const [pushToasts, setPushToasts] = useState<{ id: string; text: string }[]>([]);
  const pushToastAnim = useRef(new Animated.Value(-120)).current;
  const pushToastTimeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // ─── 시연 모드 실시간 타이머 ───
  const [demoTimerActive, setDemoTimerActive] = useState(false);
  const [demoElapsed, setDemoElapsed] = useState(0);
  const demoTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  // ─── 펄스 애니메이션 ───
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // ─── 모든 타이머/진동/리소스 강제 정리 함수 ───
  const cleanupAllResources = useCallback(() => {
    // 1. 카운트다운 타이머 정리
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
    // 2. 시연 모드 타이머 정리
    if (demoTimerRef.current) {
      clearInterval(demoTimerRef.current);
      demoTimerRef.current = null;
    }
    // 3. 진동 루프 중단
    stopVibrationLoop();
    // 4. 푸시 토스트 setTimeout들 정리
    pushToastTimeoutsRef.current.forEach((t) => clearTimeout(t));
    pushToastTimeoutsRef.current = [];
    // 5. UI 상태 초기화
    setShowCheckPopup(false);
    setShowSosResult(false);
    setDemoTimerActive(false);
    setDemoElapsed(0);
    setCountdown(60);
    setPushToasts([]);
  }, []);

  // ─── 컴포넌트 언마운트 시 전체 클린업 ───
  useEffect(() => {
    return () => {
      cleanupAllResources();
    };
  }, [cleanupAllResources]);

  useEffect(() => {
    if (settings.enabled) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.08, duration: 1000, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [settings.enabled, pulseAnim]);

  // ─── 초기 로드 ───
  useEffect(() => {
    (async () => {
      const loaded = await loadSafetyNetSettings();
      setSettings((prev) => ({
        ...prev,
        ...loaded,
        ownerName: loaded.ownerName || prev.ownerName,
        petName: loaded.petName || prev.petName,
      }));
    })();
  }, []);

  // ─── 시연 모드 활동 감지 타이머 ───
  useEffect(() => {
    if (settings.enabled && isDemoMode(settings.checkInterval)) {
      lastActivityRef.current = Date.now();
      setDemoElapsed(0);
      setDemoTimerActive(true);

      demoTimerRef.current = setInterval(() => {
        // ★ 매 초마다 enabled 상태 체크 → 꺼져 있으면 즉시 탈출
        if (!settingsRef.current.enabled) {
          if (demoTimerRef.current) {
            clearInterval(demoTimerRef.current);
            demoTimerRef.current = null;
          }
          setDemoTimerActive(false);
          return;
        }

        const elapsed = Math.floor((Date.now() - lastActivityRef.current) / 1000);
        setDemoElapsed(elapsed);

        if (elapsed >= 10) {
          // 10초 무활동 → 긴급 팝업 자동 표시
          if (demoTimerRef.current) {
            clearInterval(demoTimerRef.current);
            demoTimerRef.current = null;
          }
          setDemoTimerActive(false);
          triggerCheckPopup();
        }
      }, 1000);

      return () => {
        if (demoTimerRef.current) {
          clearInterval(demoTimerRef.current);
          demoTimerRef.current = null;
        }
        setDemoTimerActive(false);
      };
    } else {
      // 시연 모드가 아닌 경우 또는 비활성화 시 타이머 정리
      if (demoTimerRef.current) {
        clearInterval(demoTimerRef.current);
        demoTimerRef.current = null;
      }
      setDemoTimerActive(false);
      setDemoElapsed(0);
    }
  }, [settings.enabled, settings.checkInterval]);

  // ─── 활동 감지 (터치/스크롤 시 리셋) ───
  const resetDemoActivity = useCallback(() => {
    if (demoTimerActive && isDemoMode(settings.checkInterval)) {
      lastActivityRef.current = Date.now();
      setDemoElapsed(0);
    }
  }, [demoTimerActive, settings.checkInterval]);

  // ─── 설정 저장 ───
  const saveSettings = useCallback(async (newSettings: SafetyNetSettings) => {
    setSettings(newSettings);
    await saveSafetyNetSettings(newSettings);
    setShowSaveToast(true);
    setTimeout(() => setShowSaveToast(false), 1500);
  }, []);

  // ─── 토글 ───
  const handleToggle = async (val: boolean) => {
    haptic();

    if (!val) {
      // ★ OFF 시 모든 리소스 즉시 정리
      cleanupAllResources();
    }

    const updated = { ...settings, enabled: val };
    if (val) {
      updated.lastActivityTime = new Date().toISOString();
      await updateLastActivity();
    }
    await saveSettings(updated);
  };

  // ─── 연락처 추가 ───
  const handleAddContact = async () => {
    resetDemoActivity();
    if (!newContactName.trim()) {
      Alert.alert("알림", "이름을 입력해주세요.");
      return;
    }
    if (!isValidPhoneNumber(newContactPhone)) {
      Alert.alert("알림", "올바른 전화번호를 입력해주세요. (10~11자리)");
      return;
    }
    haptic();
    const newContact: EmergencyContact = {
      id: generateContactId(),
      name: newContactName.trim(),
      phone: formatPhoneNumber(newContactPhone),
      relationship: newContactRelation,
    };
    const updated = { ...settings, contacts: [...settings.contacts, newContact] };
    await saveSettings(updated);
    setNewContactName("");
    setNewContactPhone("");
    setNewContactRelation("가족");
  };

  // ─── 연락처 삭제 ───
  const handleRemoveContact = async (contactId: string) => {
    resetDemoActivity();
    haptic();
    const updated = { ...settings, contacts: settings.contacts.filter((c) => c.id !== contactId) };
    await saveSettings(updated);
  };

  // ─── 시연용 데모 연락처 자동 추가 ───
  const handleLoadDemoContacts = async () => {
    resetDemoActivity();
    haptic();
    const updated = {
      ...settings,
      contacts: [...settings.contacts, ...DEMO_CONTACTS.filter((d) => !settings.contacts.find((c) => c.id === d.id))],
    };
    await saveSettings(updated);
  };

  // ─── 체크 간격 변경 ───
  const handleIntervalChange = async (interval: CheckInterval) => {
    resetDemoActivity();
    haptic();
    const updated = { ...settings, checkInterval: interval, lastActivityTime: new Date().toISOString() };
    await saveSettings(updated);
    setShowIntervalPicker(false);
  };

  // ─── 긴급 확인 팝업 트리거 ───
  const triggerCheckPopup = useCallback(() => {
    // ★ enabled 체크 → 꺼져 있으면 팝업 안 띄움
    if (!settingsRef.current.enabled) return;

    hapticError();
    startVibrationLoop(); // 진동 시작
    const popupCountdown = getPopupCountdown(settingsRef.current.checkInterval);
    setCountdown(popupCountdown);
    setShowCheckPopup(true);

    countdownRef.current = setInterval(() => {
      // ★ 매 초 enabled 체크
      if (!settingsRef.current.enabled) {
        if (countdownRef.current) clearInterval(countdownRef.current);
        countdownRef.current = null;
        stopVibrationLoop();
        setShowCheckPopup(false);
        return;
      }

      setCountdown((prev) => {
        if (prev <= 1) {
          if (countdownRef.current) clearInterval(countdownRef.current);
          countdownRef.current = null;
          handleSOSSend();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  // ─── 시연용 테스트 버튼 (수동 트리거) ───
  const handleTestCheckPopup = () => {
    resetDemoActivity();
    haptic();
    triggerCheckPopup();
  };

  // ─── "나 괜찮아요" 응답 ───
  const handleImOkay = async () => {
    hapticSuccess();
    // ★ 카운트다운 타이머 즉시 정리
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
    // ★ 진동 즉시 중단
    stopVibrationLoop();
    // ★ 팝업 닫기
    setShowCheckPopup(false);

    await updateLastActivity();
    const updated = { ...settings, lastActivityTime: new Date().toISOString() };
    await saveSettings(updated);

    // 시연 모드면 타이머 재시작
    if (isDemoMode(settings.checkInterval) && settings.enabled) {
      restartDemoTimer();
    }
  };

  // ─── "즉시 발송" 버튼 ───
  const handleImmediateSend = () => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
    // ★ 진동 중단 (SOS 발송 시 별도 진동 효과 사용)
    stopVibrationLoop();
    handleSOSSend();
  };

  // ─── 시연 모드 타이머 재시작 헬퍼 ───
  const restartDemoTimer = useCallback(() => {
    // 기존 타이머 정리
    if (demoTimerRef.current) {
      clearInterval(demoTimerRef.current);
      demoTimerRef.current = null;
    }
    lastActivityRef.current = Date.now();
    setDemoElapsed(0);
    setDemoTimerActive(true);
    demoTimerRef.current = setInterval(() => {
      // ★ 매 초 enabled 체크
      if (!settingsRef.current.enabled) {
        if (demoTimerRef.current) {
          clearInterval(demoTimerRef.current);
          demoTimerRef.current = null;
        }
        setDemoTimerActive(false);
        return;
      }
      const elapsed = Math.floor((Date.now() - lastActivityRef.current) / 1000);
      setDemoElapsed(elapsed);
      if (elapsed >= 10) {
        if (demoTimerRef.current) {
          clearInterval(demoTimerRef.current);
          demoTimerRef.current = null;
        }
        setDemoTimerActive(false);
        triggerCheckPopup();
      }
    }, 1000);
  }, [triggerCheckPopup]);

  // ─── SOS 발송 시뮬레이션 ───
  const handleSOSSend = () => {
    // ★ 진동 중단
    stopVibrationLoop();
    setShowCheckPopup(false);
    const messages = generateSOSMessages(settingsRef.current);
    setSosMessages(messages);
    setShowSosResult(true);
    hapticError();

    // 푸시 알림 바 연출 (각 연락처마다 순차 표시)
    // ★ setTimeout을 ref에 저장하여 나중에 정리 가능
    pushToastTimeoutsRef.current.forEach((t) => clearTimeout(t));
    pushToastTimeoutsRef.current = [];

    settingsRef.current.contacts.forEach((contact, idx) => {
      const timeoutId = setTimeout(() => {
        // ★ enabled 체크 → 꺼져 있으면 토스트 안 띄움
        if (!settingsRef.current.enabled) return;
        showPushToast(generateDemoSOSCompletionMessage(settingsRef.current, contact));
      }, (idx + 1) * 1200);
      pushToastTimeoutsRef.current.push(timeoutId);
    });
  };

  // ─── 푸시 알림 바 표시 ───
  const showPushToast = (text: string) => {
    const id = `push_${Date.now()}_${Math.random()}`;
    setPushToasts((prev) => [...prev, { id, text }]);

    // 슬라이드 인
    pushToastAnim.setValue(-120);
    Animated.sequence([
      Animated.timing(pushToastAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
      Animated.delay(3000),
      Animated.timing(pushToastAnim, { toValue: -120, duration: 300, useNativeDriver: true }),
    ]).start(() => {
      setPushToasts((prev) => prev.filter((t) => t.id !== id));
    });

    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  // ─── 강제 초기화 (시연 안전장치) ───
  const handleForceReset = async () => {
    haptic();
    // 모든 리소스 정리
    cleanupAllResources();
    // 설정을 OFF로 저장
    const resetSettings: SafetyNetSettings = {
      ...settings,
      enabled: false,
      lastActivityTime: new Date().toISOString(),
    };
    await saveSettings(resetSettings);
    Alert.alert("초기화 완료", "모든 알림, 진동, 타이머가 중단되었습니다.\n설정이 OFF로 변경되었습니다.");
  };

  // ─── SOS 메시지 미리보기 ───
  const previewMessage = generateSOSMessage(settings);
  const demoPopupMessage = generateDemoPopupMessage(settings);
  const isDemo = isDemoMode(settings.checkInterval);

  return (
    <ScreenContainer edges={["top", "left", "right"]}>
      <Pressable style={{ flex: 1 }} onPress={resetDemoActivity}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
          onScrollBeginDrag={resetDemoActivity}
        >
          {/* 헤더 */}
          <View style={st.header}>
            <Pressable onPress={() => { resetDemoActivity(); router.back(); }} style={({ pressed }) => [st.backBtn, pressed && { opacity: 0.6 }]}>
              <Text style={st.backBtnText}>← 뒤로</Text>
            </Pressable>
            <Text style={st.headerTitle}>🛡️ 세이프티 넷</Text>
            <Text style={st.headerSub}>1인 가구 전용 안심 SOS 시스템</Text>
          </View>

          {/* 안심 알림 토글 */}
          <View style={st.card}>
            <View style={st.toggleRow}>
              <View style={{ flex: 1 }}>
                <Text style={st.cardTitle}>안심 알림 서비스</Text>
                <Text style={st.cardDesc}>
                  설정한 시간 동안 앱 접속이 없으면{"\n"}비상 연락망에 자동 알림을 발송합니다
                </Text>
              </View>
              <Switch
                value={settings.enabled}
                onValueChange={handleToggle}
                trackColor={{ false: "#D1D5DB", true: "#81C784" }}
                thumbColor={settings.enabled ? accentColor : "#F4F3F4"}
              />
            </View>
            {settings.enabled && (
              <Animated.View style={[st.activeIndicator, { transform: [{ scale: pulseAnim }] }]}>
                <Text style={st.activeIndicatorText}>🛡️ 세이프티 넷 작동 중</Text>
              </Animated.View>
            )}
          </View>

          {/* 시연 모드 실시간 타이머 표시 */}
          {settings.enabled && isDemo && (
            <View style={st.demoTimerCard}>
              <View style={st.demoTimerHeader}>
                <Text style={st.demoTimerBadge}>⚡ 시연 모드</Text>
                <Text style={st.demoTimerStatus}>
                  {demoTimerActive ? "감지 중..." : "대기 중"}
                </Text>
              </View>
              <View style={st.demoTimerBar}>
                <View style={[st.demoTimerFill, { width: `${Math.min((demoElapsed / 10) * 100, 100)}%` }]} />
              </View>
              <View style={st.demoTimerRow}>
                <Text style={st.demoTimerElapsed}>
                  무활동: <Text style={{ fontWeight: "800", color: demoElapsed >= 7 ? sosColor : warningColor }}>{demoElapsed}초</Text> / 10초
                </Text>
                <Text style={st.demoTimerHint}>
                  {demoElapsed >= 7 ? "⚠️ 곧 알림!" : "화면을 터치하면 리셋"}
                </Text>
              </View>
            </View>
          )}

          {/* 활동 감지 시간 설정 */}
          <View style={st.card}>
            <Text style={st.cardTitle}>⏰ 활동 감지 시간</Text>
            <Text style={st.cardDesc}>
              아래 시간 동안 앱 접속이 없으면 긴급 확인 팝업이 표시됩니다
            </Text>
            <Pressable
              onPress={() => { resetDemoActivity(); haptic(); setShowIntervalPicker(!showIntervalPicker); }}
              style={({ pressed }) => [st.dropdown, pressed && { opacity: 0.85 }]}
            >
              <Text style={st.dropdownText}>
                {CHECK_INTERVAL_OPTIONS.find((o) => o.value === settings.checkInterval)?.label || "24시간"}
              </Text>
              <Text style={st.dropdownArrow}>{showIntervalPicker ? "▲" : "▼"}</Text>
            </Pressable>
            {showIntervalPicker && (
              <View style={st.pickerList}>
                {CHECK_INTERVAL_OPTIONS.map((opt) => (
                  <Pressable
                    key={opt.value}
                    onPress={() => handleIntervalChange(opt.value)}
                    style={({ pressed }) => [
                      st.pickerItem,
                      settings.checkInterval === opt.value && st.pickerItemActive,
                      opt.isDemo && st.pickerItemDemo,
                      pressed && { opacity: 0.7 },
                    ]}
                  >
                    <Text
                      style={[
                        st.pickerItemText,
                        settings.checkInterval === opt.value && st.pickerItemTextActive,
                        opt.isDemo && st.pickerItemTextDemo,
                      ]}
                    >
                      {opt.label}
                    </Text>
                    {settings.checkInterval === opt.value && <Text style={st.checkMark}>✓</Text>}
                  </Pressable>
                ))}
              </View>
            )}
          </View>

          {/* 비상 연락망 */}
          <View style={st.card}>
            <View style={st.sectionHeaderRow}>
              <Text style={st.cardTitle}>📞 비상 연락망</Text>
              {settings.contacts.length === 0 && (
                <Pressable
                  onPress={handleLoadDemoContacts}
                  style={({ pressed }) => [st.demoBtn, pressed && { opacity: 0.7 }]}
                >
                  <Text style={st.demoBtnText}>시연용 데이터 불러오기</Text>
                </Pressable>
              )}
            </View>
            <Text style={st.cardDesc}>
              비상 시 SOS 메시지를 받을 연락처를 등록하세요
            </Text>

            {/* 등록된 연락처 목록 */}
            {settings.contacts.map((contact) => (
              <View key={contact.id} style={st.contactCard}>
                <View style={st.contactInfo}>
                  <View style={st.contactNameRow}>
                    <Text style={st.contactName}>{contact.name}</Text>
                    <View style={st.relationBadge}>
                      <Text style={st.relationBadgeText}>{contact.relationship}</Text>
                    </View>
                  </View>
                  <Text style={st.contactPhone}>{contact.phone}</Text>
                </View>
                <Pressable
                  onPress={() => handleRemoveContact(contact.id)}
                  style={({ pressed }) => [st.removeBtn, pressed && { opacity: 0.6 }]}
                >
                  <Text style={st.removeBtnText}>삭제</Text>
                </Pressable>
              </View>
            ))}

            {/* 새 연락처 입력 */}
            <View style={st.inputGroup}>
              <Text style={st.inputLabel}>이름</Text>
              <TextInput
                style={st.input}
                placeholder="연락처 이름"
                placeholderTextColor="#999"
                value={newContactName}
                onChangeText={(t) => { resetDemoActivity(); setNewContactName(t); }}
                returnKeyType="next"
              />
            </View>
            <View style={st.inputGroup}>
              <Text style={st.inputLabel}>전화번호</Text>
              <TextInput
                style={st.input}
                placeholder="010-0000-0000"
                placeholderTextColor="#999"
                value={newContactPhone}
                onChangeText={(t) => { resetDemoActivity(); setNewContactPhone(t); }}
                keyboardType="phone-pad"
                returnKeyType="done"
              />
            </View>
            <View style={st.inputGroup}>
              <Text style={st.inputLabel}>관계</Text>
              <Pressable
                onPress={() => { resetDemoActivity(); haptic(); setShowRelationPicker(!showRelationPicker); }}
                style={({ pressed }) => [st.dropdown, pressed && { opacity: 0.85 }]}
              >
                <Text style={st.dropdownText}>{newContactRelation}</Text>
                <Text style={st.dropdownArrow}>{showRelationPicker ? "▲" : "▼"}</Text>
              </Pressable>
              {showRelationPicker && (
                <View style={st.pickerList}>
                  {RELATIONSHIP_OPTIONS.map((rel) => (
                    <Pressable
                      key={rel}
                      onPress={() => { resetDemoActivity(); haptic(); setNewContactRelation(rel); setShowRelationPicker(false); }}
                      style={({ pressed }) => [
                        st.pickerItem,
                        newContactRelation === rel && st.pickerItemActive,
                        pressed && { opacity: 0.7 },
                      ]}
                    >
                      <Text
                        style={[st.pickerItemText, newContactRelation === rel && st.pickerItemTextActive]}
                      >
                        {rel}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>
            <Pressable
              onPress={handleAddContact}
              style={({ pressed }) => [st.addBtn, pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] }]}
            >
              <Text style={st.addBtnText}>+ 연락처 추가</Text>
            </Pressable>
          </View>

          {/* SOS 메시지 미리보기 */}
          <View style={st.card}>
            <Text style={st.cardTitle}>💬 SOS 메시지 미리보기</Text>
            <Text style={st.cardDesc}>비상 시 아래 메시지가 연락처에 발송됩니다</Text>
            <View style={st.messagePreview}>
              <Text style={st.messagePreviewText}>{previewMessage}</Text>
            </View>
          </View>

          {/* 시연용 테스트 버튼 */}
          <View style={st.card}>
            <Text style={st.cardTitle}>🧪 시연용 테스트</Text>
            <Text style={st.cardDesc}>
              {isDemo
                ? `시연 모드: 10초 무활동 시 자동 팝업 → ${getPopupCountdown(settings.checkInterval)}초 후 SOS 발송`
                : `긴급 확인 팝업을 즉시 테스트합니다.\n${getPopupCountdown(settings.checkInterval)}초 내 응답하지 않으면 SOS 발송 시뮬레이션이 실행됩니다.`
              }
            </Text>
            <Pressable
              onPress={handleTestCheckPopup}
              style={({ pressed }) => [st.testBtn, pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] }]}
            >
              <Text style={st.testBtnText}>⚠️ 긴급 확인 팝업 테스트</Text>
            </Pressable>
          </View>

          {/* 안내 카드 */}
          <View style={st.infoCard}>
            <Text style={st.infoTitle}>ℹ️ 세이프티 넷 작동 원리</Text>
            <View style={st.infoStep}>
              <Text style={st.infoStepNum}>1</Text>
              <Text style={st.infoStepText}>앱을 열거나 산책을 시작하면 활동 시간이 자동 갱신됩니다</Text>
            </View>
            <View style={st.infoStep}>
              <Text style={st.infoStepNum}>2</Text>
              <Text style={st.infoStepText}>
                설정한 시간({getIntervalDisplayText(settings.checkInterval)}) 동안 활동이 없으면 "괜찮으신가요?" 팝업이 표시됩니다
              </Text>
            </View>
            <View style={st.infoStep}>
              <Text style={st.infoStepNum}>3</Text>
              <Text style={st.infoStepText}>
                {getPopupCountdown(settings.checkInterval)}초 내 응답이 없으면 비상 연락망에 SOS 메시지가 자동 발송됩니다
              </Text>
            </View>
          </View>

          {/* ─── 강제 초기화 버튼 (시연 안전장치) ─── */}
          <View style={st.forceResetCard}>
            <Text style={st.forceResetTitle}>🔧 시연 안전장치</Text>
            <Text style={st.forceResetDesc}>
              시연 중 진동이나 알림이 멈추지 않을 때 아래 버튼을 눌러주세요.{"\n"}
              모든 타이머, 진동, 알림을 즉시 중단하고 설정을 OFF로 변경합니다.
            </Text>
            <Pressable
              onPress={handleForceReset}
              style={({ pressed }) => [st.forceResetBtn, pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] }]}
            >
              <Text style={st.forceResetBtnText}>🛑 모든 알림 및 진동 강제 초기화</Text>
            </Pressable>
          </View>
        </ScrollView>
      </Pressable>

      {/* 저장 완료 토스트 */}
      {showSaveToast && (
        <View style={st.toast}>
          <Text style={st.toastText}>✅ 설정이 저장되었습니다</Text>
        </View>
      )}

      {/* ─── 푸시 알림 바 (SOS 발송 시각적 연출) ─── */}
      {pushToasts.length > 0 && (
        <Animated.View style={[st.pushToastBar, { transform: [{ translateY: pushToastAnim }] }]}>
          <View style={st.pushToastContent}>
            <View style={st.pushToastIcon}>
              <Text style={{ fontSize: 20 }}>📨</Text>
            </View>
            <View style={st.pushToastTextWrap}>
              <Text style={st.pushToastTitle}>반려이음 안심 알림</Text>
              <Text style={st.pushToastMessage} numberOfLines={2}>
                {pushToasts[pushToasts.length - 1]?.text}
              </Text>
            </View>
            <Text style={st.pushToastTime}>지금</Text>
          </View>
        </Animated.View>
      )}

      {/* ─── 긴급 확인 팝업 모달 ─── */}
      <Modal visible={showCheckPopup} transparent animationType="fade">
        <View style={st.modalOverlay}>
          <View style={st.checkPopup}>
            <View style={st.checkPopupIcon}>
              <Text style={{ fontSize: 48 }}>🚨</Text>
            </View>
            <Text style={st.checkPopupTitle}>
              {isDemo ? "[긴급 안심 알림]" : "보호자님, 괜찮으신가요?"}
            </Text>
            <Text style={st.checkPopupDesc}>
              {demoPopupMessage}
            </Text>
            <View style={[st.countdownCircle, countdown <= 2 && { borderColor: "#FF1744", backgroundColor: "#FFE0E0" }]}>
              <Text style={[st.countdownNumber, countdown <= 2 && { color: "#FF1744" }]}>{countdown}</Text>
              <Text style={st.countdownLabel}>초 남음</Text>
            </View>
            <Text style={st.checkPopupWarning}>
              {countdown}초 내 응답이 없으면{"\n"}비상 연락망에 SOS 메시지가 발송됩니다
            </Text>
            <View style={st.popupBtnRow}>
              <Pressable
                onPress={handleImOkay}
                style={({ pressed }) => [st.okayBtn, pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] }]}
              >
                <Text style={st.okayBtnText}>나 괜찮아요 ✓</Text>
              </Pressable>
              <Pressable
                onPress={handleImmediateSend}
                style={({ pressed }) => [st.immediateSendBtn, pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] }]}
              >
                <Text style={st.immediateSendBtnText}>즉시 발송 🆘</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* ─── SOS 발송 결과 모달 ─── */}
      <Modal visible={showSosResult} transparent animationType="fade">
        <View style={st.modalOverlay}>
          <View style={st.sosResultPopup}>
            <View style={st.sosResultIcon}>
              <Text style={{ fontSize: 48 }}>🆘</Text>
            </View>
            <Text style={st.sosResultTitle}>SOS 메시지 발송 완료</Text>
            <Text style={st.sosResultDesc}>
              비상 연락망으로 보호자의 위치와{"\n"}반려견 정보를 포함한 SOS 메시지를 발송했습니다
            </Text>
            {sosMessages.map((msg, idx) => (
              <View key={idx} style={st.sosContactResult}>
                <View style={st.sosContactResultLeft}>
                  <Text style={st.sosContactResultName}>{msg.contactName}</Text>
                  <Text style={st.sosContactResultPhone}>{msg.contactPhone}</Text>
                </View>
                <View style={st.sosStatusBadge}>
                  <Text style={st.sosStatusText}>발송 완료 ✓</Text>
                </View>
              </View>
            ))}
            {/* 개별 발송 완료 메시지 */}
            {settings.contacts.map((contact, idx) => (
              <View key={`comp_${idx}`} style={st.completionMsgBox}>
                <Text style={st.completionMsgText}>
                  {generateDemoSOSCompletionMessage(settings, contact)}
                </Text>
              </View>
            ))}
            <View style={st.sosMessageBox}>
              <Text style={st.sosMessageLabel}>발송된 메시지:</Text>
              <Text style={st.sosMessageContent}>{previewMessage}</Text>
            </View>
            <Pressable
              onPress={() => {
                haptic();
                // ★ 결과 모달 닫을 때도 진동 확실히 중단
                stopVibrationLoop();
                setShowSosResult(false);
                // 시연 모드면 타이머 재시작
                if (isDemoMode(settings.checkInterval) && settings.enabled) {
                  restartDemoTimer();
                }
              }}
              style={({ pressed }) => [st.closeSosBtn, pressed && { opacity: 0.85 }]}
            >
              <Text style={st.closeSOSBtnText}>확인</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const st = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
    backgroundColor: "#E8F5E9",
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  backBtn: { marginBottom: 12 },
  backBtnText: { fontSize: 15, color: accentColor, fontWeight: "600" },
  headerTitle: { fontSize: 26, fontWeight: "800", color: "#1B5E20", marginBottom: 4 },
  headerSub: { fontSize: 14, color: "#4CAF50" },

  card: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#E8F5E9",
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardTitle: { fontSize: 17, fontWeight: "700", color: "#1B5E20", marginBottom: 6 },
  cardDesc: { fontSize: 13, color: "#666", lineHeight: 20 },

  activeIndicator: {
    marginTop: 14,
    backgroundColor: "#E8F5E9",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#A5D6A7",
  },
  activeIndicatorText: { fontSize: 15, fontWeight: "700", color: accentColor },

  // 시연 모드 타이머
  demoTimerCard: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: "#FFF3E0",
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: "#FFB74D",
  },
  demoTimerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  demoTimerBadge: {
    fontSize: 13,
    fontWeight: "800",
    color: "#E65100",
    backgroundColor: "#FFE0B2",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    overflow: "hidden",
  },
  demoTimerStatus: {
    fontSize: 12,
    color: "#BF360C",
    fontWeight: "600",
  },
  demoTimerBar: {
    height: 8,
    backgroundColor: "#FFE0B2",
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 8,
  },
  demoTimerFill: {
    height: 8,
    backgroundColor: "#FF6D00",
    borderRadius: 4,
  },
  demoTimerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  demoTimerElapsed: {
    fontSize: 14,
    color: "#333",
    fontWeight: "600",
  },
  demoTimerHint: {
    fontSize: 11,
    color: "#999",
  },

  // 드롭다운
  dropdown: {
    marginTop: 12,
    borderWidth: 1.5,
    borderColor: "#C8E6C9",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#FAFFF8",
  },
  dropdownText: { fontSize: 15, fontWeight: "600", color: "#333" },
  dropdownArrow: { fontSize: 12, color: "#999" },

  pickerList: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#FFF",
  },
  pickerItem: {
    paddingHorizontal: 16,
    paddingVertical: 13,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 0.5,
    borderBottomColor: "#F0F0F0",
  },
  pickerItemActive: { backgroundColor: "#E8F5E9" },
  pickerItemDemo: { backgroundColor: "#FFF8E1" },
  pickerItemText: { fontSize: 14, color: "#333" },
  pickerItemTextActive: { fontWeight: "700", color: accentColor },
  pickerItemTextDemo: { fontWeight: "700", color: "#E65100" },
  checkMark: { fontSize: 16, color: accentColor, fontWeight: "700" },

  // 연락처
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 2,
  },
  demoBtn: {
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  demoBtnText: { fontSize: 11, color: accentColor, fontWeight: "600" },

  contactCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
    backgroundColor: "#FAFFF8",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  contactInfo: { flex: 1 },
  contactNameRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  contactName: { fontSize: 15, fontWeight: "700", color: "#333" },
  relationBadge: {
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  relationBadgeText: { fontSize: 11, color: accentColor, fontWeight: "600" },
  contactPhone: { fontSize: 13, color: "#666" },
  removeBtn: {
    backgroundColor: "#FFEBEE",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  removeBtnText: { fontSize: 12, color: errorColor, fontWeight: "600" },

  // 입력 필드
  inputGroup: { marginTop: 14 },
  inputLabel: { fontSize: 13, fontWeight: "600", color: "#555", marginBottom: 6 },
  input: {
    borderWidth: 1.5,
    borderColor: "#C8E6C9",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: "#333",
    backgroundColor: "#FAFFF8",
  },
  addBtn: {
    marginTop: 16,
    backgroundColor: accentColor,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  addBtnText: { fontSize: 15, fontWeight: "700", color: "#FFF" },

  // 메시지 미리보기
  messagePreview: {
    marginTop: 12,
    backgroundColor: "#FFF8E1",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#FFE082",
  },
  messagePreviewText: { fontSize: 13, color: "#5D4037", lineHeight: 20 },

  // 테스트 버튼
  testBtn: {
    marginTop: 14,
    backgroundColor: warningColor,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  testBtnText: { fontSize: 15, fontWeight: "700", color: "#FFF" },

  // 안내 카드
  infoCard: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: "#E3F2FD",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "#BBDEFB",
  },
  infoTitle: { fontSize: 15, fontWeight: "700", color: "#1565C0", marginBottom: 14 },
  infoStep: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
    gap: 12,
  },
  infoStepNum: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#1565C0",
    color: "#FFF",
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 24,
    overflow: "hidden",
  },
  infoStepText: { flex: 1, fontSize: 13, color: "#333", lineHeight: 20 },

  // ─── 강제 초기화 버튼 ───
  forceResetCard: {
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 20,
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: "#FFCDD2",
    borderStyle: "dashed",
  },
  forceResetTitle: { fontSize: 15, fontWeight: "700", color: "#B71C1C", marginBottom: 6 },
  forceResetDesc: { fontSize: 12, color: "#666", lineHeight: 18, marginBottom: 14 },
  forceResetBtn: {
    backgroundColor: "#B71C1C",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  forceResetBtnText: { fontSize: 15, fontWeight: "800", color: "#FFF" },

  // 저장 토스트
  toast: {
    position: "absolute",
    bottom: 100,
    left: 40,
    right: 40,
    backgroundColor: "rgba(46,125,50,0.92)",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: "center",
  },
  toastText: { fontSize: 14, fontWeight: "600", color: "#FFF" },

  // 푸시 알림 바 (iOS 스타일)
  pushToastBar: {
    position: "absolute",
    top: 50,
    left: 12,
    right: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    zIndex: 9999,
  },
  pushToastContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 12,
  },
  pushToastIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#FFEBEE",
    justifyContent: "center",
    alignItems: "center",
  },
  pushToastTextWrap: { flex: 1 },
  pushToastTitle: { fontSize: 13, fontWeight: "700", color: "#333", marginBottom: 2 },
  pushToastMessage: { fontSize: 12, color: "#666", lineHeight: 16 },
  pushToastTime: { fontSize: 11, color: "#999" },

  // 모달
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },

  // 긴급 확인 팝업
  checkPopup: {
    backgroundColor: "#FFF",
    borderRadius: 24,
    padding: 28,
    width: "100%",
    maxWidth: 360,
    alignItems: "center",
    borderWidth: 2,
    borderColor: sosColor,
  },
  checkPopupIcon: { marginBottom: 12 },
  checkPopupTitle: { fontSize: 22, fontWeight: "800", color: sosColor, marginBottom: 10, textAlign: "center" },
  checkPopupDesc: { fontSize: 14, color: "#555", textAlign: "center", lineHeight: 22, marginBottom: 20 },
  countdownCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#FFEBEE",
    borderWidth: 3,
    borderColor: sosColor,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  countdownNumber: { fontSize: 36, fontWeight: "800", color: sosColor },
  countdownLabel: { fontSize: 11, color: "#999", marginTop: -2 },
  checkPopupWarning: { fontSize: 12, color: "#999", textAlign: "center", lineHeight: 18, marginBottom: 20 },
  popupBtnRow: {
    width: "100%",
    gap: 10,
  },
  okayBtn: {
    backgroundColor: accentColor,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 40,
    width: "100%",
    alignItems: "center",
  },
  okayBtnText: { fontSize: 18, fontWeight: "800", color: "#FFF" },
  immediateSendBtn: {
    backgroundColor: sosColor,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 40,
    width: "100%",
    alignItems: "center",
  },
  immediateSendBtnText: { fontSize: 16, fontWeight: "700", color: "#FFF" },

  // SOS 결과 팝업
  sosResultPopup: {
    backgroundColor: "#FFF",
    borderRadius: 24,
    padding: 24,
    width: "100%",
    maxWidth: 380,
    alignItems: "center",
    borderWidth: 2,
    borderColor: sosColor,
  },
  sosResultIcon: { marginBottom: 10 },
  sosResultTitle: { fontSize: 20, fontWeight: "800", color: sosColor, marginBottom: 8, textAlign: "center" },
  sosResultDesc: { fontSize: 13, color: "#555", textAlign: "center", lineHeight: 20, marginBottom: 16 },
  sosContactResult: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    backgroundColor: "#FFEBEE",
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  sosContactResultLeft: {},
  sosContactResultName: { fontSize: 15, fontWeight: "700", color: "#333" },
  sosContactResultPhone: { fontSize: 12, color: "#666", marginTop: 2 },
  sosStatusBadge: {
    backgroundColor: accentColor,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  sosStatusText: { fontSize: 11, fontWeight: "700", color: "#FFF" },
  completionMsgBox: {
    width: "100%",
    backgroundColor: "#E8F5E9",
    borderRadius: 10,
    padding: 12,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: "#A5D6A7",
  },
  completionMsgText: { fontSize: 12, color: "#1B5E20", lineHeight: 18, fontWeight: "600" },
  sosMessageBox: {
    width: "100%",
    backgroundColor: "#FFF8E1",
    borderRadius: 12,
    padding: 14,
    marginTop: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#FFE082",
  },
  sosMessageLabel: { fontSize: 12, fontWeight: "700", color: "#5D4037", marginBottom: 6 },
  sosMessageContent: { fontSize: 12, color: "#5D4037", lineHeight: 18 },
  closeSosBtn: {
    backgroundColor: sosColor,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 40,
    width: "100%",
    alignItems: "center",
  },
  closeSOSBtnText: { fontSize: 16, fontWeight: "700", color: "#FFF" },
});
