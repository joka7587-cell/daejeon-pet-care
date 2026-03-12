import React, { useState } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useApp, CareRequest } from "@/lib/app-context";
import { MOCK_REQUESTS, MockRequest } from "@/lib/mock-data";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

function haptic() {
  if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

type RequestStatus = "pending" | "accepted" | "completed" | "cancelled" | "rejected";
type RequestType = "walk_partner" | "caretaker" | "walk_request" | "emergency" | "short_care";

const STATUS_LABELS: Record<RequestStatus, { label: string; color: string; bg: string }> = {
  pending: { label: "대기 중", color: "#FF9800", bg: "#FFF8E1" },
  accepted: { label: "수락됨", color: "#4CAF82", bg: "#F0FFF4" },
  rejected: { label: "거절됨", color: "#EF5350", bg: "#FFEBEE" },
  completed: { label: "완료", color: "#757575", bg: "#F5F5F5" },
  cancelled: { label: "취소됨", color: "#EF5350", bg: "#FFEBEE" },
};

const TYPE_LABELS: Record<RequestType, string> = {
  walk_partner: "산책 친구",
  caretaker: "돌보미 찾기",
  walk_request: "산책 부탁",
  emergency: "긴급 방문 돌봄",
  short_care: "단기 돌봄 교환",
};

interface DisplayRequest {
  id: string;
  type: RequestType;
  title: string;
  requester: string;
  neighborhood: string;
  date: string;
  time: string;
  duration: string;
  petName: string;
  petEmoji: string;
  status: RequestStatus;
  isUrgent?: boolean;
  description: string;
  isUserCreated?: boolean;
  createdAt?: string;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "방금 전";
  if (mins < 60) return `${mins}분 전`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}일 전`;
  return `${Math.floor(days / 7)}주 전`;
}

function RequestCard({ req, onPress }: { req: DisplayRequest; onPress: () => void }) {
  const status = STATUS_LABELS[req.status];
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
    >
      {req.isUrgent && (
        <View style={styles.urgentTag}>
          <Text style={styles.urgentTagText}>🚨 긴급</Text>
        </View>
      )}
      {req.isUserCreated && (
        <View style={styles.myRequestTag}>
          <Text style={styles.myRequestTagText}>✍️ 내 요청</Text>
        </View>
      )}
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
        <Text style={{ fontSize: 40 }}>{req.petEmoji}</Text>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
            <View style={styles.typeTag}>
              <Text style={styles.typeTagText}>{TYPE_LABELS[req.type] || req.type}</Text>
            </View>
            <View style={[styles.statusTag, { backgroundColor: status.bg }]}>
              <Text style={[styles.statusTagText, { color: status.color }]}>{status.label}</Text>
            </View>
          </View>
          <Text style={styles.cardTitle}>{req.title}</Text>
          <Text style={styles.cardMeta}>
            {req.requester} · 📍 {req.neighborhood}
            {req.createdAt ? ` · ${timeAgo(req.createdAt)}` : ""}
          </Text>
          <View style={styles.cardFooter}>
            <Text style={styles.cardDetail}>📅 {req.date} {req.time}</Text>
            <Text style={styles.cardDetail}>⏱ {req.duration}</Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

function OwnerRequests() {
  const router = useRouter();
  const { state } = useApp();
  const [filter, setFilter] = useState<"all" | RequestStatus>("all");

  const filters: { id: "all" | RequestStatus; label: string }[] = [
    { id: "all", label: "전체" },
    { id: "pending", label: "대기 중" },
    { id: "accepted", label: "수락됨" },
    { id: "completed", label: "완료" },
  ];

  // 사용자 작성 요청 + 더미 데이터 합치기
  const userRequests: DisplayRequest[] = (state.requests || []).map((r) => ({
    ...r,
    isUserCreated: true,
  }));

  const mockRequests: DisplayRequest[] = MOCK_REQUESTS.map((r) => ({
    ...r,
    isUserCreated: false,
  }));

  const allRequests = [...userRequests, ...mockRequests];
  const filtered = allRequests.filter((r) => filter === "all" || r.status === filter);

  return (
    <View style={{ flex: 1 }}>
      {/* 필터 */}
      <View style={styles.filterRow}>
        {filters.map((f) => (
          <Pressable
            key={f.id}
            onPress={() => { haptic(); setFilter(f.id); }}
            style={({ pressed }) => [
              styles.filterChip,
              filter === f.id && styles.filterChipActive,
              pressed && { opacity: 0.8 },
            ]}
          >
            <Text style={[styles.filterText, filter === f.id && styles.filterTextActive]}>
              {f.label} {f.id === "all" ? `(${allRequests.length})` : `(${allRequests.filter(r => r.status === f.id).length})`}
            </Text>
          </Pressable>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, gap: 12 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>📭</Text>
            <Text style={styles.emptyTitle}>요청 내역이 없어요</Text>
            <Text style={styles.emptyDesc}>아래 '+ 요청하기' 버튼을 눌러 요청을 작성해보세요</Text>
          </View>
        }
        renderItem={({ item }) => (
          <RequestCard
            req={item}
            onPress={() => {
              haptic();
              if (item.isUserCreated) {
                // 사용자 작성 요청은 상세 화면으로 이동 (나중에 구현 가능)
                router.push(`/request/${item.id}` as never);
              } else {
                router.push(`/request/${item.id}` as never);
              }
            }}
          />
        )}
      />
    </View>
  );
}

function CaretakerRequests() {
  const router = useRouter();
  const { state } = useApp();
  const [filter, setFilter] = useState<"all" | "emergency" | "walk_request">("all");

  const filters: { id: "all" | "emergency" | "walk_request"; label: string; emoji: string }[] = [
    { id: "all", label: "전체", emoji: "📋" },
    { id: "emergency", label: "긴급 방문", emoji: "🚨" },
    { id: "walk_request", label: "대신 산책", emoji: "🦮" },
  ];

  // 사용자 작성 요청 + 더미 데이터 합치기 (돌보미가 볼 수 있는 요청)
  const userRequests: DisplayRequest[] = (state.requests || []).map((r) => ({
    ...r,
    isUserCreated: true,
  }));

  const mockFiltered = MOCK_REQUESTS.filter((r) => r.type === "emergency" || r.type === "walk_request");
  const mockRequests: DisplayRequest[] = mockFiltered.map((r) => ({
    ...r,
    isUserCreated: false,
  }));

  const allRequests = [...userRequests, ...mockRequests];
  const filtered = allRequests.filter((r) => {
    if (filter === "all") return true;
    return r.type === filter;
  });

  return (
    <View style={{ flex: 1 }}>
      {/* 필터 */}
      <View style={styles.filterRow}>
        {filters.map((f) => (
          <Pressable
            key={f.id}
            onPress={() => { haptic(); setFilter(f.id); }}
            style={({ pressed }) => [
              styles.filterChip,
              filter === f.id && styles.filterChipActiveGreen,
              pressed && { opacity: 0.8 },
            ]}
          >
            <Text style={styles.filterEmoji}>{f.emoji}</Text>
            <Text style={[styles.filterText, filter === f.id && styles.filterTextActiveGreen]}>
              {f.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, gap: 12 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>🌙</Text>
            <Text style={styles.emptyTitle}>새로운 요청이 없어요</Text>
            <Text style={styles.emptyDesc}>활동 상태를 켜면 요청을 받을 수 있어요</Text>
          </View>
        }
        renderItem={({ item }) => (
          <RequestCard
            req={item}
            onPress={() => { haptic(); router.push(`/request/${item.id}` as never); }}
          />
        )}
      />
    </View>
  );
}

export default function RequestsScreen() {
  const { state } = useApp();
  const router = useRouter();
  const isCaretaker = state.profile.role === "caretaker";
  const userRequestCount = (state.requests || []).length;

  return (
    <ScreenContainer className="pt-2">
      <View style={styles.screenHeader}>
        <View>
          <Text style={styles.screenTitle}>{isCaretaker ? "받은 요청" : "내 요청"}</Text>
          {userRequestCount > 0 && (
            <Text style={styles.requestCount}>작성한 요청 {userRequestCount}건</Text>
          )}
        </View>
        {!isCaretaker && (
          <Pressable
            onPress={() => { haptic(); router.push("/request/new" as never); }}
            style={({ pressed }) => [styles.newRequestBtn, pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] }]}
          >
            <Text style={styles.newRequestBtnText}>+ 요청하기</Text>
          </Pressable>
        )}
      </View>
      {isCaretaker ? <CaretakerRequests /> : <OwnerRequests />}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  screenHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  screenTitle: { fontSize: 22, fontWeight: "800", color: "#1A1A1A" },
  requestCount: { fontSize: 12, color: "#FF7043", fontWeight: "600", marginTop: 2 },
  newRequestBtn: {
    backgroundColor: "#FF7043",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  newRequestBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  filterRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    backgroundColor: "#fff",
  },
  filterChipActive: { borderColor: "#FF7043", backgroundColor: "#FFF3EE" },
  filterChipActiveGreen: { borderColor: "#4CAF82", backgroundColor: "#F0FFF4" },
  filterEmoji: { fontSize: 13 },
  filterText: { fontSize: 13, fontWeight: "600", color: "#757575" },
  filterTextActive: { color: "#FF7043" },
  filterTextActiveGreen: { color: "#4CAF82" },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#F0F0F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  urgentTag: {
    alignSelf: "flex-start",
    backgroundColor: "#FFEBEE",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 8,
  },
  urgentTagText: { fontSize: 11, color: "#EF5350", fontWeight: "700" },
  myRequestTag: {
    alignSelf: "flex-start",
    backgroundColor: "#FFF3EE",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#FFCCBC",
  },
  myRequestTagText: { fontSize: 11, color: "#FF7043", fontWeight: "700" },
  typeTag: {
    backgroundColor: "#F5F5F5",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  typeTagText: { fontSize: 11, color: "#555", fontWeight: "600" },
  statusTag: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusTagText: { fontSize: 11, fontWeight: "700" },
  cardTitle: { fontSize: 14, fontWeight: "700", color: "#1A1A1A", marginBottom: 4 },
  cardMeta: { fontSize: 12, color: "#757575", marginBottom: 6 },
  cardFooter: { flexDirection: "row", gap: 12 },
  cardDetail: { fontSize: 12, color: "#555" },
  emptyCard: {
    alignItems: "center",
    padding: 48,
    gap: 8,
  },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: "#555" },
  emptyDesc: { fontSize: 13, color: "#9E9E9E", textAlign: "center", lineHeight: 20 },
});
