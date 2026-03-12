import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useLocalSearchParams, useRouter } from "expo-router";
import { MOCK_REQUESTS } from "@/lib/mock-data";
import { useApp, CareRequest } from "@/lib/app-context";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

function haptic(type: "light" | "success" | "error" = "light") {
  if (Platform.OS === "web") return;
  if (type === "success") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  else if (type === "error") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  else Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

export default function RequestDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { state } = useApp();
  const isCaretaker = state.profile.role === "caretaker";
  const [accepted, setAccepted] = useState<boolean | null>(null);

  // 사용자 작성 요청과 더미 데이터 모두에서 검색
  const userRequest = (state.requests || []).find((r) => r.id === id);
  const mockRequest = MOCK_REQUESTS.find((r) => r.id === id);
  const request = userRequest || mockRequest;
  const isMyRequest = !!userRequest;

  if (!request) {
    return (
      <ScreenContainer className="p-6">
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ fontSize: 48 }}>😕</Text>
          <Text style={{ fontSize: 18, fontWeight: "700", color: "#555", marginTop: 12 }}>
            요청을 찾을 수 없어요
          </Text>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>돌아가기</Text>
          </Pressable>
        </View>
      </ScreenContainer>
    );
  }

  const handleAccept = () => {
    haptic("success");
    setAccepted(true);
  };

  const handleReject = () => {
    haptic("error");
    setAccepted(false);
  };

  return (
    <ScreenContainer edges={["top", "left", "right", "bottom"]}>
      {/* 헤더 */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.7 }]}>
          <Text style={styles.closeBtnText}>✕</Text>
        </Pressable>
        <Text style={styles.headerTitle}>요청 상세</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
        {/* 긴급 배지 */}
        {request.isUrgent && (
          <View style={styles.urgentBanner}>
            <Text style={styles.urgentBannerText}>🚨 긴급 요청</Text>
          </View>
        )}

        {/* 반려동물 정보 */}
        <View style={styles.petCard}>
          <Text style={styles.petEmoji}>{request.petEmoji}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.petName}>{request.petName}</Text>
            <Text style={styles.petOwner}>보호자: {request.requester}</Text>
          </View>
          <View style={styles.neighborhoodTag}>
            <Text style={styles.neighborhoodTagText}>📍 {request.neighborhood}</Text>
          </View>
        </View>

        {/* 요청 내용 */}
        <View style={styles.infoCard}>
          <Text style={styles.infoCardTitle}>요청 내용</Text>
          <Text style={styles.infoCardDesc}>{request.description}</Text>
        </View>

        {/* 일정 정보 */}
        <View style={styles.scheduleCard}>
          <Text style={styles.scheduleTitle}>일정 정보</Text>
          <View style={styles.scheduleGrid}>
            <View style={styles.scheduleItem}>
              <Text style={styles.scheduleLabel}>📅 날짜</Text>
              <Text style={styles.scheduleValue}>{request.date}</Text>
            </View>
            <View style={styles.scheduleItem}>
              <Text style={styles.scheduleLabel}>🕐 시간</Text>
              <Text style={styles.scheduleValue}>{request.time}</Text>
            </View>
            <View style={styles.scheduleItem}>
              <Text style={styles.scheduleLabel}>⏱ 소요 시간</Text>
              <Text style={styles.scheduleValue}>{request.duration}</Text>
            </View>
            <View style={styles.scheduleItem}>
              <Text style={styles.scheduleLabel}>📍 동네</Text>
              <Text style={styles.scheduleValue}>{request.neighborhood}</Text>
            </View>
          </View>
        </View>

        {/* 수락/거절 결과 */}
        {accepted !== null && (
          <View style={[styles.resultCard, accepted ? styles.resultCardAccepted : styles.resultCardRejected]}>
            <Text style={styles.resultEmoji}>{accepted ? "✅" : "❌"}</Text>
            <Text style={styles.resultText}>
              {accepted ? "요청을 수락했어요! 보호자에게 알림이 전송됩니다." : "요청을 거절했어요."}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* 하단 버튼 */}
      {isCaretaker && accepted === null && (
        <View style={styles.bottomActions}>
          <Pressable
            onPress={handleReject}
            style={({ pressed }) => [styles.rejectBtn, pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] }]}
          >
            <Text style={styles.rejectBtnText}>거절</Text>
          </Pressable>
          <Pressable
            onPress={handleAccept}
            style={({ pressed }) => [styles.acceptBtn, pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] }]}
          >
            <Text style={styles.acceptBtnText}>수락하기</Text>
          </Pressable>
        </View>
      )}

      {!isCaretaker && (
        <View style={styles.bottomActions}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.acceptBtn, { flex: 1 }, pressed && { opacity: 0.85 }]}
          >
            <Text style={styles.acceptBtnText}>확인</Text>
          </Pressable>
        </View>
      )}

      {isCaretaker && accepted !== null && (
        <View style={styles.bottomActions}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.acceptBtn, { flex: 1 }, pressed && { opacity: 0.85 }]}
          >
            <Text style={styles.acceptBtnText}>목록으로 돌아가기</Text>
          </Pressable>
        </View>
      )}
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
  urgentBanner: {
    backgroundColor: "#FFEBEE",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#FFCDD2",
  },
  urgentBannerText: { fontSize: 16, fontWeight: "700", color: "#EF5350" },
  petCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF3EE",
    borderRadius: 16,
    padding: 16,
    gap: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#FFCCBC",
  },
  petEmoji: { fontSize: 48 },
  petName: { fontSize: 20, fontWeight: "800", color: "#1A1A1A" },
  petOwner: { fontSize: 13, color: "#757575", marginTop: 4 },
  neighborhoodTag: {
    backgroundColor: "#fff",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "#FFCCBC",
  },
  neighborhoodTagText: { fontSize: 12, color: "#FF7043", fontWeight: "600" },
  infoCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#F0F0F0",
    gap: 8,
  },
  infoCardTitle: { fontSize: 15, fontWeight: "700", color: "#1A1A1A" },
  infoCardDesc: { fontSize: 14, color: "#555", lineHeight: 22 },
  scheduleCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#F0F0F0",
    gap: 12,
  },
  scheduleTitle: { fontSize: 15, fontWeight: "700", color: "#1A1A1A" },
  scheduleGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  scheduleItem: { width: "47%", gap: 4 },
  scheduleLabel: { fontSize: 12, color: "#9E9E9E" },
  scheduleValue: { fontSize: 14, fontWeight: "600", color: "#1A1A1A" },
  resultCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  resultCardAccepted: { backgroundColor: "#F0FFF4", borderColor: "#C8E6C9" },
  resultCardRejected: { backgroundColor: "#FFEBEE", borderColor: "#FFCDD2" },
  resultEmoji: { fontSize: 28 },
  resultText: { flex: 1, fontSize: 14, fontWeight: "600", color: "#555", lineHeight: 20 },
  bottomActions: {
    flexDirection: "row",
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
    backgroundColor: "#fff",
  },
  rejectBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: "#E0E0E0",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  rejectBtnText: { color: "#555", fontSize: 16, fontWeight: "700" },
  acceptBtn: {
    flex: 2,
    backgroundColor: "#4CAF82",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  acceptBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  backBtn: {
    marginTop: 16,
    backgroundColor: "#FF7043",
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  backBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});
