import React, { useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  Platform,
  Alert,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useApp, Payment } from "@/lib/app-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";

function haptic() {
  if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

const SERVICE_PRICES: Record<string, number> = {
  emergency: 25000,
  walk_service: 15000,
  walk_partner: 0,
  short_care: 20000,
};

const SERVICE_LABELS: Record<string, string> = {
  emergency: "긴급 방문 돌봄",
  walk_service: "대신 산책",
  walk_partner: "산책 친구",
  short_care: "단기 돌봄 교환",
};

type PayMethod = "kakao" | "toss" | "card";

export default function PaymentScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { dispatch } = useApp();
  const [selectedMethod, setSelectedMethod] = useState<PayMethod>("kakao");
  const [processing, setProcessing] = useState(false);
  const [completed, setCompleted] = useState(false);

  const serviceType = (params.serviceType as string) || "emergency";
  const caretakerName = (params.caretakerName as string) || "돌보미";
  const duration = parseInt((params.duration as string) || "1", 10);
  const basePrice = SERVICE_PRICES[serviceType] || 15000;
  const totalPrice = basePrice * duration;

  const handlePayment = () => {
    haptic();
    setProcessing(true);

    // 결제 시뮬레이션 (2초 후 완료)
    setTimeout(() => {
      const payment: Payment = {
        id: `pay_${Date.now()}`,
        serviceType,
        amount: totalPrice,
        method: selectedMethod,
        status: "completed",
        caretakerName,
        createdAt: new Date().toISOString(),
      };

      dispatch({ type: "ADD_PAYMENT", payload: payment });
      setProcessing(false);
      setCompleted(true);

      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    }, 2000);
  };

  if (completed) {
    return (
      <ScreenContainer edges={["top", "bottom", "left", "right"]} className="p-6">
        <View style={[styles.successContainer, { backgroundColor: "#FFFFFF" }]}>
          <View style={styles.successCircle}>
            <Text style={styles.successCheck}>✓</Text>
          </View>
          <Text style={[styles.successTitle, { color: "#1A1A1A" }]}>결제 완료!</Text>
          <Text style={styles.successAmount}>{totalPrice.toLocaleString()}원</Text>
          <Text style={[styles.successDesc, { color: "#8E8E93" }]}>
            {caretakerName}님의 {SERVICE_LABELS[serviceType]} 결제가 완료되었습니다.
          </Text>
          <View style={styles.successActions}>
            <Pressable
              onPress={() => {
                haptic();
                router.push({
                  pathname: "/review/write" as never,
                  params: { targetName: caretakerName, serviceType },
                });
              }}
              style={({ pressed }) => [styles.reviewBtn, pressed && { opacity: 0.85 }]}
            >
              <Text style={styles.reviewBtnText}>후기 작성하기</Text>
            </Pressable>
            <Pressable
              onPress={() => { haptic(); router.replace("/(tabs)" as never); }}
              style={({ pressed }) => [styles.homeBtn, { backgroundColor: "#F8F8F8" }, pressed && { opacity: 0.85 }]}
            >
              <Text style={[styles.homeBtnText, { color: "#1A1A1A" }]}>홈으로</Text>
            </Pressable>
          </View>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      {/* 헤더 */}
      <View style={[styles.header, { borderBottomColor: "#E8E8E8", backgroundColor: "#FFFFFF" }]}>
        <Pressable
          onPress={() => { haptic(); router.back(); }}
          style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.7 }]}
        >
          <Text style={[styles.backBtnText, { color: "#1A1A1A" }]}>‹</Text>
        </Pressable>
        <Text style={[styles.headerTitle, { color: "#1A1A1A" }]}>결제</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.content, { backgroundColor: "#FFFFFF" }]} showsVerticalScrollIndicator={false}>
        {/* 서비스 정보 */}
        <View style={[styles.serviceCard, { backgroundColor: "#F8F8F8", borderColor: "#E8E8E8" }]}>
          <Text style={[styles.serviceCardTitle, { color: "#1A1A1A" }]}>서비스 정보</Text>
          <View style={styles.serviceRow}>
            <Text style={[styles.serviceLabel, { color: "#8E8E93" }]}>서비스</Text>
            <Text style={[styles.serviceValue, { color: "#1A1A1A" }]}>{SERVICE_LABELS[serviceType]}</Text>
          </View>
          <View style={styles.serviceRow}>
            <Text style={[styles.serviceLabel, { color: "#8E8E93" }]}>돌보미</Text>
            <Text style={[styles.serviceValue, { color: "#1A1A1A" }]}>{caretakerName}</Text>
          </View>
          <View style={styles.serviceRow}>
            <Text style={[styles.serviceLabel, { color: "#8E8E93" }]}>시간</Text>
            <Text style={[styles.serviceValue, { color: "#1A1A1A" }]}>{duration}시간</Text>
          </View>
          <View style={[styles.totalRow, { borderTopColor: "#E8E8E8" }]}>
            <Text style={[styles.totalLabel, { color: "#1A1A1A" }]}>총 결제 금액</Text>
            <Text style={styles.totalValue}>{totalPrice.toLocaleString()}원</Text>
          </View>
        </View>

        {/* 결제 수단 선택 */}
        <View style={styles.methodSection}>
          <Text style={[styles.methodTitle, { color: "#1A1A1A" }]}>결제 수단</Text>

          <Pressable
            onPress={() => { haptic(); setSelectedMethod("kakao"); }}
            style={({ pressed }) => [
              styles.methodCard,
              { backgroundColor: "#F8F8F8", borderColor: selectedMethod === "kakao" ? "#2E7D32" : "#E8E8E8" },
              selectedMethod === "kakao" && { backgroundColor: "#F8F8F8" },
              pressed && { opacity: 0.7 },
            ]}
          >
            <Text style={styles.methodEmoji}>💛</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.methodName, { color: "#1A1A1A" }]}>카카오페이</Text>
              <Text style={[styles.methodDesc, { color: "#8E8E93" }]}>카카오페이로 간편 결제</Text>
            </View>
            <View style={[styles.radio, { borderColor: selectedMethod === "kakao" ? "#2E7D32" : "#E8E8E8" }]}>
              {selectedMethod === "kakao" && <View style={styles.radioInner} />}
            </View>
          </Pressable>

          <Pressable
            onPress={() => { haptic(); setSelectedMethod("toss"); }}
            style={({ pressed }) => [
              styles.methodCard,
              { backgroundColor: "#F8F8F8", borderColor: selectedMethod === "toss" ? "#2E7D32" : "#E8E8E8" },
              selectedMethod === "toss" && { backgroundColor: "#F8F8F8" },
              pressed && { opacity: 0.7 },
            ]}
          >
            <Text style={styles.methodEmoji}>💙</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.methodName, { color: "#1A1A1A" }]}>토스페이</Text>
              <Text style={[styles.methodDesc, { color: "#8E8E93" }]}>토스로 간편 결제</Text>
            </View>
            <View style={[styles.radio, { borderColor: selectedMethod === "toss" ? "#2E7D32" : "#E8E8E8" }]}>
              {selectedMethod === "toss" && <View style={styles.radioInner} />}
            </View>
          </Pressable>

          <Pressable
            onPress={() => { haptic(); setSelectedMethod("card"); }}
            style={({ pressed }) => [
              styles.methodCard,
              { backgroundColor: "#F8F8F8", borderColor: selectedMethod === "card" ? "#2E7D32" : "#E8E8E8" },
              selectedMethod === "card" && { backgroundColor: "#F8F8F8" },
              pressed && { opacity: 0.7 },
            ]}
          >
            <Text style={styles.methodEmoji}>💳</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.methodName, { color: "#1A1A1A" }]}>신용/체크카드</Text>
              <Text style={[styles.methodDesc, { color: "#8E8E93" }]}>카드 직접 결제</Text>
            </View>
            <View style={[styles.radio, { borderColor: selectedMethod === "card" ? "#2E7D32" : "#E8E8E8" }]}>
              {selectedMethod === "card" && <View style={styles.radioInner} />}
            </View>
          </Pressable>
        </View>

        {/* 안내 문구 */}
        <View style={[styles.noticeCard, { backgroundColor: "#F8F8F8" }]}>
          <Text style={styles.noticeTitle}>안내</Text>
          <Text style={[styles.noticeText, { color: "#8E8E93" }]}>
            • 체험판에서는 실제 결제가 이루어지지 않습니다{"\n"}
            • 결제 완료 후 돌보미에게 자동으로 알림이 전송됩니다{"\n"}
            • 서비스 시작 1시간 전까지 무료 취소 가능합니다
          </Text>
        </View>

        {/* 결제 버튼 */}
        <Pressable
          onPress={handlePayment}
          disabled={processing}
          style={({ pressed }) => [
            styles.payBtn,
            processing && { opacity: 0.6 },
            pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
          ]}
        >
          {processing ? (
            <Text style={styles.payBtnText}>결제 처리 중...</Text>
          ) : (
            <Text style={styles.payBtnText}>
              {totalPrice.toLocaleString()}원 결제하기
            </Text>
          )}
        </Pressable>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  backBtnText: { fontSize: 28 },
  headerTitle: { flex: 1, textAlign: "center", fontSize: 17, fontWeight: "700" },
  content: { padding: 20, gap: 20, paddingBottom: 40 },
  serviceCard: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    gap: 12,
  },
  serviceCardTitle: { fontSize: 16, fontWeight: "700", marginBottom: 4 },
  serviceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  serviceLabel: { fontSize: 14 },
  serviceValue: { fontSize: 14, fontWeight: "600" },
  totalRow: {
    borderTopWidth: 1,
    paddingTop: 12,
    marginTop: 4,
  },
  totalLabel: { fontSize: 15, fontWeight: "700" },
  totalValue: { fontSize: 20, fontWeight: "800", color: "#2E7D32" },
  methodSection: { gap: 10 },
  methodTitle: { fontSize: 16, fontWeight: "700" },
  methodCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1.5,
  },
  methodEmoji: { fontSize: 28 },
  methodName: { fontSize: 15, fontWeight: "700" },
  methodDesc: { fontSize: 12, marginTop: 1 },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  radioInner: { width: 12, height: 12, borderRadius: 6, backgroundColor: "#2E7D32" },
  noticeCard: {
    borderRadius: 12,
    padding: 16,
    gap: 6,
  },
  noticeTitle: { fontSize: 13, fontWeight: "700", color: "#F57F17" },
  noticeText: { fontSize: 12, lineHeight: 20 },
  payBtn: {
    backgroundColor: "#2E7D32",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  payBtnText: { color: "#FFFFFF", fontSize: 17, fontWeight: "800" },
  successContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  successCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#4CAF82",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  successCheck: { fontSize: 36, color: "#FFFFFF", fontWeight: "800" },
  successTitle: { fontSize: 24, fontWeight: "800" },
  successAmount: { fontSize: 28, fontWeight: "800", color: "#2E7D32" },
  successDesc: { fontSize: 14, textAlign: "center", lineHeight: 20 },
  successActions: { gap: 10, width: "100%", paddingHorizontal: 20, marginTop: 16 },
  reviewBtn: {
    backgroundColor: "#2E7D32",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  reviewBtnText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
  homeBtn: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  homeBtnText: { fontSize: 16, fontWeight: "700" },
});
