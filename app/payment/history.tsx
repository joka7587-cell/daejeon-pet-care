import React from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  Platform,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useApp, Payment } from "@/lib/app-context";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";

function haptic() {
  if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

const DEMO_PAYMENTS: Payment[] = [
  {
    id: "dp1",
    amount: 25000,
    method: "kakao",
    status: "completed",
    serviceType: "emergency",
    caretakerName: "강아지사랑 민지",
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
  {
    id: "dp2",
    amount: 15000,
    method: "toss",
    status: "completed",
    serviceType: "walk_service",
    caretakerName: "산책왕 준혁",
    createdAt: new Date(Date.now() - 86400000 * 7).toISOString(),
  },
  {
    id: "dp3",
    amount: 40000,
    method: "card",
    status: "completed",
    serviceType: "short_care",
    caretakerName: "펫케어 수빈",
    createdAt: new Date(Date.now() - 86400000 * 14).toISOString(),
  },
];

const SERVICE_LABELS: Record<string, string> = {
  emergency: "긴급 방문 돌봄",
  walk_service: "대신 산책",
  walk_partner: "산책 친구",
  short_care: "단기 돌봄 교환",
};

const METHOD_LABELS: Record<string, string> = {
  kakao: "카카오페이",
  kakaopay: "카카오페이",
  toss: "토스페이",
  card: "신용카드",
};

const STATUS_LABELS: Record<string, { text: string; color: string }> = {
  completed: { text: "완료", color: "#4CAF82" },
  pending: { text: "대기중", color: "#FFB300" },
  cancelled: { text: "취소", color: "#EF5350" },
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}.${(d.getMonth() + 1).toString().padStart(2, "0")}.${d.getDate().toString().padStart(2, "0")}`;
}

export default function PaymentHistoryScreen() {
  const router = useRouter();
  const { state } = useApp();

  const allPayments = [...state.payments, ...DEMO_PAYMENTS];
  const totalSpent = allPayments
    .filter((p) => p.status === "completed")
    .reduce((s, p) => s + p.amount, 0);

  const renderPayment = ({ item }: { item: Payment }) => {
    const statusInfo = STATUS_LABELS[item.status] || STATUS_LABELS.completed;

    return (
      <View style={[styles.paymentCard, { backgroundColor: "#F8F8F8", borderColor: "#E8E8E8" }]}>
        <View style={styles.paymentHeader}>
          <Text style={[styles.paymentService, { color: "#1A1A1A" }]}>
            {SERVICE_LABELS[item.serviceType || ""] || item.serviceType || "돌봄 서비스"}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: statusInfo.color + "20" }]}>
            <Text style={[styles.statusText, { color: statusInfo.color }]}>{statusInfo.text}</Text>
          </View>
        </View>
        <Text style={[styles.paymentCaretaker, { color: "#8E8E93" }]}>{item.caretakerName || "돌보미"}</Text>
        <View style={styles.paymentFooter}>
          <Text style={[styles.paymentMethod, { color: "#8E8E93" }]}>{METHOD_LABELS[item.method] || item.method}</Text>
          <Text style={[styles.paymentDate, { color: "#8E8E93" }]}>{formatDate(item.createdAt)}</Text>
        </View>
        <Text style={[styles.paymentAmount, { color: "#1A1A1A" }]}>{item.amount.toLocaleString()}원</Text>
      </View>
    );
  };

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]} style={{ backgroundColor: "#FFFFFF" }}>
      <View style={[styles.header, { borderBottomColor: "#E8E8E8" }]}>
        <Pressable
          onPress={() => { haptic(); router.back(); }}
          style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.7 }]}
        >
          <Text style={[styles.backBtnText, { color: "#1A1A1A" }]}>‹</Text>
        </Pressable>
        <Text style={[styles.headerTitle, { color: "#1A1A1A" }]}>결제 내역</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* 총 결제 요약 */}
      <View style={[styles.summaryCard, { borderBottomColor: "#E8E8E8" }]}>
        <Text style={[styles.summaryLabel, { color: "#8E8E93" }]}>총 결제 금액</Text>
        <Text style={styles.summaryAmount}>{totalSpent.toLocaleString()}원</Text>
        <Text style={[styles.summaryCount, { color: "#8E8E93" }]}>총 {allPayments.length}건</Text>
      </View>

      <FlatList
        data={allPayments}
        renderItem={renderPayment}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>💳</Text>
            <Text style={[styles.emptyText, { color: "#8E8E93" }]}>결제 내역이 없어요</Text>
          </View>
        }
      />
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
  summaryCard: {
    alignItems: "center",
    paddingVertical: 24,
    borderBottomWidth: 1,
    gap: 4,
  },
  summaryLabel: { fontSize: 13 },
  summaryAmount: { fontSize: 32, fontWeight: "800", color: "#FF7043" },
  summaryCount: { fontSize: 13 },
  list: { padding: 16, gap: 12, paddingBottom: 40 },
  paymentCard: {
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    gap: 6,
  },
  paymentHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  paymentService: { fontSize: 15, fontWeight: "700" },
  statusBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  statusText: { fontSize: 11, fontWeight: "700" },
  paymentCaretaker: { fontSize: 13 },
  paymentFooter: { flexDirection: "row", gap: 8 },
  paymentMethod: { fontSize: 12 },
  paymentDate: { fontSize: 12 },
  paymentAmount: { fontSize: 18, fontWeight: "800", textAlign: "right" },
  emptyContainer: { alignItems: "center", paddingVertical: 60, gap: 12 },
  emptyEmoji: { fontSize: 48 },
  emptyText: { fontSize: 15 },
});
