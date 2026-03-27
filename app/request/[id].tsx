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
  const { state, dispatch } = useApp();
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
          <Text style={{ fontSize: 18, fontWeight: "700", color: "#8E8E93", marginTop: 12 }}>
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

    // 요청 상태 업데이트
    if (request) {
      dispatch({
        type: "UPDATE_REQUEST_STATUS",
        payload: { requestId: request.id, status: "accepted" },
      });

      // 수락 알림 생성
      dispatch({
        type: "ADD_NOTIFICATION",
        payload: {
          id: `notif_accept_${Date.now()}`,
          type: "match",
          title: "요청 수락",
          body: `${request.petName}의 ${request.title} 요청을 수락했어요! 채팅으로 상세 일정을 조율해보세요.`,
          fromNickname: request.requester,
          fromEmoji: request.petEmoji,
          isRead: false,
          createdAt: new Date().toISOString(),
          relatedId: request.id,
        },
      });

      // 채팅방 자동 생성 (수락 시 보호자와 채팅 연결)
      const chatRoomId = `request_${request.id}`;
      const roomKey = `room_${chatRoomId}`;
      dispatch({
        type: "SET_CHAT_MESSAGES",
        payload: {
          roomId: roomKey,
          messages: [
            {
              id: `sys_${Date.now()}`,
              senderId: 0,
              senderName: "시스템",
              content: `✅ ${request.title} 요청이 수락되었습니다. 상세 일정을 조율해보세요!`,
              type: "text",
              createdAt: new Date().toISOString(),
            },
          ],
        },
      });
    }
  };

  const handleReject = () => {
    haptic("error");
    setAccepted(false);

    if (request) {
      dispatch({
        type: "UPDATE_REQUEST_STATUS",
        payload: { requestId: request.id, status: "rejected" },
      });

      // 거절 알림 생성
      dispatch({
        type: "ADD_NOTIFICATION",
        payload: {
          id: `notif_reject_${Date.now()}`,
          type: "match",
          title: "요청 거절",
          body: `${request.petName}의 ${request.title} 요청이 거절되었어요. 다른 돌보미를 찾아보세요.`,
          fromNickname: request.requester,
          fromEmoji: request.petEmoji,
          isRead: false,
          createdAt: new Date().toISOString(),
          relatedId: request.id,
        },
      });
    }
  };

  const handleOpenChat = () => {
    if (!request) return;
    haptic();
    const chatRoomId = `request_${request.id}`;
    router.push(`/chat/${chatRoomId}?friendName=${encodeURIComponent(request.requester)}&friendEmoji=${encodeURIComponent(request.petEmoji)}` as never);
  };

  const handleStartWalk = () => {
    if (!request) return;
    haptic("success");
    router.push(`/walk/tracker?petName=${encodeURIComponent(request.petName)}&petEmoji=${encodeURIComponent(request.petEmoji)}&requestId=${request.id}&ownerName=${encodeURIComponent(request.requester)}` as never);
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
            <View style={{ flex: 1 }}>
              <Text style={styles.resultText}>
                {accepted ? "요청을 수락했어요! 보호자에게 알림이 전송됩니다." : "요청을 거절했어요."}
              </Text>
              {accepted && (
                <Pressable
                  onPress={handleOpenChat}
                  style={({ pressed }) => [styles.chatLinkBtn, pressed && { opacity: 0.85 }]}
                >
                  <Text style={styles.chatLinkBtnText}>💬 보호자와 채팅하기</Text>
                </Pressable>
              )}
            </View>
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
          {accepted && (
            <>
              <Pressable
                onPress={handleStartWalk}
                style={({ pressed }) => [styles.acceptBtn, { flex: 1, backgroundColor: "#4CAF82" }, pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] }]}
              >
                <Text style={styles.acceptBtnText}>🐾 산책 시작</Text>
              </Pressable>
              <Pressable
                onPress={handleOpenChat}
                style={({ pressed }) => [styles.rejectBtn, { flex: 1 }, pressed && { opacity: 0.85 }]}
              >
                <Text style={styles.rejectBtnText}>💬 채팅</Text>
              </Pressable>
            </>
          )}
          {!accepted && (
            <Pressable
              onPress={() => router.back()}
              style={({ pressed }) => [styles.rejectBtn, { flex: 1 }, pressed && { opacity: 0.85 }]}
            >
              <Text style={styles.rejectBtnText}>목록으로 돌아가기</Text>
            </Pressable>
          )}
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
    backgroundColor: "#F8F8F8",
    alignItems: "center",
    justifyContent: "center",
  },
  closeBtnText: { fontSize: 16, color: "#8E8E93" },
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
    backgroundColor: "#E8F5E9",
    borderRadius: 16,
    padding: 16,
    gap: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#C8E6C9",
  },
  petEmoji: { fontSize: 48 },
  petName: { fontSize: 20, fontWeight: "800", color: "#1A1A1A" },
  petOwner: { fontSize: 13, color: "#8E8E93", marginTop: 4 },
  neighborhoodTag: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "#C8E6C9",
  },
  neighborhoodTagText: { fontSize: 12, color: "#2E7D32", fontWeight: "600" },
  infoCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#F0F0F0",
    gap: 8,
  },
  infoCardTitle: { fontSize: 15, fontWeight: "700", color: "#1A1A1A" },
  infoCardDesc: { fontSize: 14, color: "#8E8E93", lineHeight: 22 },
  scheduleCard: {
    backgroundColor: "#FFFFFF",
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
  resultText: { flex: 1, fontSize: 14, fontWeight: "600", color: "#8E8E93", lineHeight: 20 },
  bottomActions: {
    flexDirection: "row",
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
    backgroundColor: "#FFFFFF",
  },
  rejectBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: "#E0E0E0",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  rejectBtnText: { color: "#8E8E93", fontSize: 16, fontWeight: "700" },
  acceptBtn: {
    flex: 2,
    backgroundColor: "#4CAF82",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  acceptBtnText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
  backBtn: {
    marginTop: 16,
    backgroundColor: "#2E7D32",
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  backBtnText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
  chatLinkBtn: {
    marginTop: 8,
    backgroundColor: "#2E7D32",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignSelf: "flex-start",
  },
  chatLinkBtnText: { color: "#FFFFFF", fontSize: 13, fontWeight: "700" },
});
