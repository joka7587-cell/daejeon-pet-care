import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  TextInput,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useRouter } from "expo-router";
import { useApp, CareRequest } from "@/lib/app-context";
import { SERVICE_TYPES } from "@/lib/mock-data";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

function haptic() {
  if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

const DATE_OPTIONS = ["오늘", "내일", "이번 주 토요일", "이번 주 일요일", "날짜 협의"];
const TIME_OPTIONS = ["오전 7시", "오전 9시", "오전 11시", "오후 1시", "오후 3시", "오후 5시", "오후 7시"];
const DURATION_OPTIONS = ["30분", "1시간", "2시간", "3시간", "4시간", "협의"];

const SERVICE_TITLE_MAP: Record<string, string> = {
  walk_partner: "산책 친구 찾기",
  find_caretaker: "돌보미 찾기",
  walk_request: "산책 부탁하기",
  short_care: "단기 돌봄 교환",
};

const SERVICE_TYPE_MAP: Record<string, CareRequest["type"]> = {
  walk_partner: "walk_partner",
  find_caretaker: "caretaker",
  walk_request: "walk_request",
  short_care: "short_care",
};

export default function NewRequestScreen() {
  const router = useRouter();
  const { state, dispatch } = useApp();
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [selectedDuration, setSelectedDuration] = useState<string | null>(null);
  const [memo, setMemo] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const services = SERVICE_TYPES.owner;

  // 반려동물 정보 (첫 번째 반려동물 사용)
  const firstPet = state.profile.pets[0];
  const petName = firstPet?.name || "반려동물";
  const petEmoji = firstPet?.emoji || "🐾";

  const handleSubmit = () => {
    if (!selectedService || !selectedDate || !selectedTime) return;
    haptic();

    const serviceTitle = SERVICE_TITLE_MAP[selectedService] || selectedService;
    const serviceType = SERVICE_TYPE_MAP[selectedService] || "walk_request";

    const newRequest: CareRequest = {
      id: `req_${Date.now()}`,
      type: serviceType,
      title: `${serviceTitle} - ${selectedDate} ${selectedTime}`,
      requester: state.profile.nickname || "사용자",
      neighborhood: state.profile.neighborhood || "유성구",
      date: selectedDate,
      time: selectedTime,
      duration: selectedDuration || "협의",
      petName,
      petEmoji,
      status: "pending",
      isUrgent: selectedDate === "오늘",
      description: memo.trim() || `${serviceTitle} 요청입니다. ${petName}(이)를 부탁드립니다.`,
      createdAt: new Date().toISOString(),
    };

    dispatch({ type: "ADD_REQUEST", payload: newRequest });

    // 알림도 생성
    dispatch({
      type: "ADD_NOTIFICATION",
      payload: {
        id: `notif_${Date.now()}`,
        type: "match_request",
        title: "요청이 등록되었어요",
        body: `${serviceTitle} 요청이 등록되었습니다. 근처 돌보미에게 알림이 전송됩니다.`,
        isRead: false,
        createdAt: new Date().toISOString(),
      },
    });

    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    setSubmitted(true);
  };

  if (submitted) {
    return (
      <ScreenContainer edges={["top", "left", "right", "bottom"]}>
        <View style={[styles.successContainer, { backgroundColor: "#FFFFFF" }]}>
          <Text style={styles.successEmoji}>🎉</Text>
          <Text style={[styles.successTitle, { color: "#1A1A1A" }]}>요청이 전송됐어요!</Text>
          <Text style={[styles.successDesc, { color: "#8E8E93" }]}>
            근처 돌보미에게 알림이 전송됩니다.{"\n"}수락 시 알림으로 알려드릴게요.
          </Text>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.doneBtn, pressed && { opacity: 0.85 }]}
          >
            <Text style={styles.doneBtnText}>확인</Text>
          </Pressable>
          <Pressable
            onPress={() => { haptic(); router.replace("/(tabs)/requests" as never); }}
            style={({ pressed }) => [styles.viewRequestsBtn, { backgroundColor: "#F8F8F8" }, pressed && { opacity: 0.85 }]}
          >
            <Text style={[styles.viewRequestsBtnText, { color: "#1A1A1A" }]}>내 요청 보기</Text>
          </Pressable>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer edges={["top", "left", "right", "bottom"]}>
      {/* 헤더 */}
      <View style={[styles.header, { borderBottomColor: "#E8E8E8", backgroundColor: "#FFFFFF" }]}>
        <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.closeBtn, { backgroundColor: "#F8F8F8" }, pressed && { opacity: 0.7 }]}>
          <Text style={[styles.closeBtnText, { color: "#8E8E93" }]}>✕</Text>
        </Pressable>
        <Text style={[styles.headerTitle, { color: "#1A1A1A" }]}>요청하기</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[{ backgroundColor: "#FFFFFF", padding: 16, paddingBottom: 100 }]}>
        {/* 서비스 선택 */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: "#1A1A1A" }]}>어떤 서비스가 필요하신가요?</Text>
          <View style={styles.serviceGrid}>
            {services.map((svc) => (
              <Pressable
                key={svc.id}
                onPress={() => { haptic(); setSelectedService(svc.id); }}
                style={({ pressed }) => [
                  styles.serviceCard,
                  { borderColor: "#E8E8E8", backgroundColor: "#FFFFFF" },
                  selectedService === svc.id && { borderColor: svc.color, backgroundColor: svc.color + "15" },
                  pressed && { opacity: 0.8 },
                ]}
              >
                <Text style={styles.serviceEmoji}>{svc.emoji}</Text>
                <Text style={[styles.serviceTitle, { color: "#8E8E93" }, selectedService === svc.id && { color: svc.color }]}>
                  {svc.title}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* 날짜 선택 */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: "#1A1A1A" }]}>날짜를 선택해주세요</Text>
          <View style={styles.optionRow}>
            {DATE_OPTIONS.map((d) => (
              <Pressable
                key={d}
                onPress={() => { haptic(); setSelectedDate(d); }}
                style={({ pressed }) => [
                  styles.optionChip,
                  { backgroundColor: "#F8F8F8" },
                  selectedDate === d && styles.optionChipActive,
                  pressed && { opacity: 0.8 },
                ]}
              >
                <Text style={[styles.optionText, { color: "#1A1A1A" }, selectedDate === d && styles.optionTextActive]}>{d}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* 시간 선택 */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: "#1A1A1A" }]}>시간을 선택해주세요</Text>
          <View style={styles.optionRow}>
            {TIME_OPTIONS.map((t) => (
              <Pressable
                key={t}
                onPress={() => { haptic(); setSelectedTime(t); }}
                style={({ pressed }) => [
                  styles.optionChip,
                  { backgroundColor: "#F8F8F8" },
                  selectedTime === t && styles.optionChipActive,
                  pressed && { opacity: 0.8 },
                ]}
              >
                <Text style={[styles.optionText, { color: "#1A1A1A" }, selectedTime === t && styles.optionTextActive]}>{t}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* 소요 시간 */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: "#1A1A1A" }]}>소요 시간</Text>
          <View style={styles.optionRow}>
            {DURATION_OPTIONS.map((d) => (
              <Pressable
                key={d}
                onPress={() => { haptic(); setSelectedDuration(d); }}
                style={({ pressed }) => [
                  styles.optionChip,
                  { backgroundColor: "#F8F8F8" },
                  selectedDuration === d && styles.optionChipActive,
                  pressed && { opacity: 0.8 },
                ]}
              >
                <Text style={[styles.optionText, { color: "#1A1A1A" }, selectedDuration === d && styles.optionTextActive]}>{d}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* 메모 */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: "#1A1A1A" }]}>추가 메모 (선택)</Text>
          <TextInput
            value={memo}
            onChangeText={setMemo}
            placeholder="반려동물 특이사항, 요청 사항 등을 적어주세요"
            multiline
            numberOfLines={4}
            style={[styles.memoInput, { backgroundColor: "#F8F8F8", borderColor: "#E8E8E8", color: "#1A1A1A" }]}
            placeholderTextColor={"#8E8E93"}
            returnKeyType="done"
          />
        </View>

        {/* 반려동물 정보 */}
        {firstPet && (
          <View style={styles.section}>
            <View style={[styles.petInfoCard, { backgroundColor: "#F8F8F8" }]}>
              <Text style={{ fontSize: 32 }}>{petEmoji}</Text>
              <View>
                <Text style={[styles.petInfoName, { color: "#1A1A1A" }]}>{petName}</Text>
                <Text style={[styles.petInfoDetail, { color: "#8E8E93" }]}>{firstPet.breed} · {firstPet.age}살 · {firstPet.size}</Text>
              </View>
            </View>
          </View>
        )}

        {/* 요청 동네 */}
        <View style={styles.section}>
          <View style={[styles.locationCard, { backgroundColor: "#F8F8F8" }]}>
            <Text style={styles.locationEmoji}>📍</Text>
            <View>
              <Text style={[styles.locationLabel, { color: "#8E8E93" }]}>요청 동네</Text>
              <Text style={[styles.locationValue, { color: "#1A1A1A" }]}>{state.profile.neighborhood || "동네 미설정"}</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* 하단 버튼 */}
      <View style={[styles.bottomActions, { backgroundColor: "#FFFFFF", borderTopColor: "#E8E8E8" }]}>
        <Pressable
          onPress={handleSubmit}
          disabled={!selectedService || !selectedDate || !selectedTime}
          style={({ pressed }) => [
            styles.submitBtn,
            (!selectedService || !selectedDate || !selectedTime) && styles.submitBtnDisabled,
            pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
          ]}
        >
          <Text style={styles.submitBtnText}>요청 보내기 🐾</Text>
        </Pressable>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 17, fontWeight: "700" },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  closeBtnText: { fontSize: 16 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: "700", marginBottom: 12 },
  serviceGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  serviceCard: {
    width: "47%",
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 14,
    alignItems: "center",
    gap: 6,
  },
  serviceEmoji: { fontSize: 28 },
  serviceTitle: { fontSize: 13, fontWeight: "700", textAlign: "center" },
  optionRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  optionChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
  },
  optionChipActive: {
    backgroundColor: "#FF6B35",
  },
  optionText: { fontSize: 14, fontWeight: "600" },
  optionTextActive: { color: "#FFFFFF" },
  memoInput: {
    minHeight: 100,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    textAlignVertical: "top",
  },
  petInfoCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 14,
    padding: 14,
  },
  petInfoName: { fontSize: 15, fontWeight: "700", marginBottom: 2 },
  petInfoDetail: { fontSize: 13 },
  locationCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 14,
    padding: 14,
  },
  locationEmoji: { fontSize: 20 },
  locationLabel: { fontSize: 13, fontWeight: "600", marginBottom: 2 },
  locationValue: { fontSize: 15, fontWeight: "700" },
  bottomActions: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: 32, // for safe area
    borderTopWidth: 1,
  },
  submitBtn: {
    backgroundColor: "#FF6B35",
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
  },
  submitBtnDisabled: { backgroundColor: "#E0E0E0" },
  submitBtnText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
  // Success screen
  successContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  successEmoji: { fontSize: 64, marginBottom: 16 },
  successTitle: { fontSize: 24, fontWeight: "800", marginBottom: 8 },
  successDesc: { fontSize: 15, textAlign: "center", lineHeight: 22, marginBottom: 32 },
  doneBtn: {
    width: "100%",
    backgroundColor: "#FF6B35",
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
    marginBottom: 12,
  },
  doneBtnText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
  viewRequestsBtn: {
    width: "100%",
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
  },
  viewRequestsBtnText: { fontSize: 16, fontWeight: "700" },
});
