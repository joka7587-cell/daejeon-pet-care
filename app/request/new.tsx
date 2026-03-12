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
import { useApp } from "@/lib/app-context";
import { SERVICE_TYPES } from "@/lib/mock-data";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

function haptic() {
  if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

const DATE_OPTIONS = ["오늘", "내일", "이번 주 토요일", "이번 주 일요일", "날짜 협의"];
const TIME_OPTIONS = ["오전 7시", "오전 9시", "오전 11시", "오후 1시", "오후 3시", "오후 5시", "오후 7시"];
const DURATION_OPTIONS = ["30분", "1시간", "2시간", "3시간", "4시간", "협의"];

export default function NewRequestScreen() {
  const router = useRouter();
  const { state } = useApp();
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [selectedDuration, setSelectedDuration] = useState<string | null>(null);
  const [memo, setMemo] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const services = SERVICE_TYPES.owner;

  const handleSubmit = () => {
    if (!selectedService || !selectedDate || !selectedTime) return;
    haptic();
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <ScreenContainer edges={["top", "left", "right", "bottom"]}>
        <View style={styles.successContainer}>
          <Text style={styles.successEmoji}>🎉</Text>
          <Text style={styles.successTitle}>요청이 전송됐어요!</Text>
          <Text style={styles.successDesc}>
            근처 돌보미에게 알림이 전송됩니다.{"\n"}수락 시 알림으로 알려드릴게요.
          </Text>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.doneBtn, pressed && { opacity: 0.85 }]}
          >
            <Text style={styles.doneBtnText}>확인</Text>
          </Pressable>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer edges={["top", "left", "right", "bottom"]}>
      {/* 헤더 */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.7 }]}>
          <Text style={styles.closeBtnText}>✕</Text>
        </Pressable>
        <Text style={styles.headerTitle}>요청하기</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
        {/* 서비스 선택 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>어떤 서비스가 필요하신가요?</Text>
          <View style={styles.serviceGrid}>
            {services.map((svc) => (
              <Pressable
                key={svc.id}
                onPress={() => { haptic(); setSelectedService(svc.id); }}
                style={({ pressed }) => [
                  styles.serviceCard,
                  selectedService === svc.id && { borderColor: svc.color, backgroundColor: svc.color + "15" },
                  pressed && { opacity: 0.8 },
                ]}
              >
                <Text style={styles.serviceEmoji}>{svc.emoji}</Text>
                <Text style={[styles.serviceTitle, selectedService === svc.id && { color: svc.color }]}>
                  {svc.title}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* 날짜 선택 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>날짜를 선택해주세요</Text>
          <View style={styles.optionRow}>
            {DATE_OPTIONS.map((d) => (
              <Pressable
                key={d}
                onPress={() => { haptic(); setSelectedDate(d); }}
                style={({ pressed }) => [
                  styles.optionChip,
                  selectedDate === d && styles.optionChipActive,
                  pressed && { opacity: 0.8 },
                ]}
              >
                <Text style={[styles.optionText, selectedDate === d && styles.optionTextActive]}>{d}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* 시간 선택 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>시간을 선택해주세요</Text>
          <View style={styles.optionRow}>
            {TIME_OPTIONS.map((t) => (
              <Pressable
                key={t}
                onPress={() => { haptic(); setSelectedTime(t); }}
                style={({ pressed }) => [
                  styles.optionChip,
                  selectedTime === t && styles.optionChipActive,
                  pressed && { opacity: 0.8 },
                ]}
              >
                <Text style={[styles.optionText, selectedTime === t && styles.optionTextActive]}>{t}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* 소요 시간 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>소요 시간</Text>
          <View style={styles.optionRow}>
            {DURATION_OPTIONS.map((d) => (
              <Pressable
                key={d}
                onPress={() => { haptic(); setSelectedDuration(d); }}
                style={({ pressed }) => [
                  styles.optionChip,
                  selectedDuration === d && styles.optionChipActive,
                  pressed && { opacity: 0.8 },
                ]}
              >
                <Text style={[styles.optionText, selectedDuration === d && styles.optionTextActive]}>{d}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* 메모 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>추가 메모 (선택)</Text>
          <TextInput
            value={memo}
            onChangeText={setMemo}
            placeholder="반려동물 특이사항, 요청 사항 등을 적어주세요"
            multiline
            numberOfLines={4}
            style={styles.memoInput}
            placeholderTextColor="#BDBDBD"
            returnKeyType="done"
          />
        </View>

        {/* 요청 동네 */}
        <View style={styles.section}>
          <View style={styles.locationCard}>
            <Text style={styles.locationEmoji}>📍</Text>
            <View>
              <Text style={styles.locationLabel}>요청 동네</Text>
              <Text style={styles.locationValue}>{state.profile.neighborhood || "동네 미설정"}</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* 하단 버튼 */}
      <View style={styles.bottomActions}>
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
    borderBottomColor: "#F0F0F0",
  },
  headerTitle: { fontSize: 17, fontWeight: "700", color: "#1A1A1A" },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F5F5F5",
    alignItems: "center",
    justifyContent: "center",
  },
  closeBtnText: { fontSize: 16, color: "#555" },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#1A1A1A", marginBottom: 12 },
  serviceGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  serviceCard: {
    width: "47%",
    borderWidth: 1.5,
    borderColor: "#E0E0E0",
    borderRadius: 14,
    padding: 14,
    alignItems: "center",
    gap: 6,
    backgroundColor: "#fff",
  },
  serviceEmoji: { fontSize: 28 },
  serviceTitle: { fontSize: 13, fontWeight: "700", color: "#555", textAlign: "center" },
  optionRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  optionChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "#E0E0E0",
    backgroundColor: "#fff",
  },
  optionChipActive: { borderColor: "#FF7043", backgroundColor: "#FFF3EE" },
  optionText: { fontSize: 13, fontWeight: "600", color: "#757575" },
  optionTextActive: { color: "#FF7043" },
  memoInput: {
    borderWidth: 1.5,
    borderColor: "#E0E0E0",
    borderRadius: 14,
    padding: 14,
    fontSize: 14,
    color: "#1A1A1A",
    backgroundColor: "#fff",
    textAlignVertical: "top",
    minHeight: 100,
    lineHeight: 22,
  },
  locationCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FFF3EE",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#FFCCBC",
  },
  locationEmoji: { fontSize: 24 },
  locationLabel: { fontSize: 12, color: "#757575" },
  locationValue: { fontSize: 15, fontWeight: "700", color: "#FF7043", marginTop: 2 },
  bottomActions: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
    backgroundColor: "#fff",
  },
  submitBtn: {
    backgroundColor: "#FF7043",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  submitBtnDisabled: { backgroundColor: "#BDBDBD" },
  submitBtnText: { color: "#fff", fontSize: 17, fontWeight: "700" },
  successContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 16,
  },
  successEmoji: { fontSize: 72 },
  successTitle: { fontSize: 26, fontWeight: "800", color: "#1A1A1A" },
  successDesc: { fontSize: 15, color: "#757575", textAlign: "center", lineHeight: 24 },
  doneBtn: {
    backgroundColor: "#FF7043",
    borderRadius: 14,
    paddingHorizontal: 40,
    paddingVertical: 14,
    marginTop: 8,
  },
  doneBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
