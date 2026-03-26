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
import { useApp, Review } from "@/lib/app-context";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";

function haptic() {
  if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

const DEMO_REVIEWS: Review[] = [
  {
    id: "dr1",
    fromUserId: "u1",
    fromNickname: "골든리트리버 맘",
    rating: 5,
    content: "정말 친절하게 돌봐주셨어요! 강아지가 너무 좋아했어요. 다음에도 부탁드릴게요 🐾",
    serviceType: "긴급 방문 돌봄",
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: "dr2",
    fromUserId: "u2",
    fromNickname: "말티즈 아빠",
    rating: 4,
    content: "산책을 꼼꼼하게 해주셨어요. 사진도 보내주시고 안심이 됐습니다!",
    serviceType: "대신 산책",
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
  },
  {
    id: "dr3",
    fromUserId: "u3",
    fromNickname: "관평동 강아지맘",
    rating: 5,
    content: "급하게 부탁드렸는데 바로 와주셔서 감사했어요. 최고의 돌보미입니다!",
    serviceType: "긴급 방문 돌봄",
    createdAt: new Date(Date.now() - 86400000 * 10).toISOString(),
  },
];

function StarDisplay({ rating }: { rating: number }) {
  return (
    <View style={styles.starsRow}>
      {[1, 2, 3, 4, 5].map((s) => (
        <Text key={s} style={[styles.starSmall, { color: "#E8E8E8" }, s <= rating && styles.starSmallActive]}>
          {s <= rating ? "★" : "☆"}
        </Text>
      ))}
    </View>
  );
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "오늘";
  if (days === 1) return "어제";
  if (days < 7) return `${days}일 전`;
  if (days < 30) return `${Math.floor(days / 7)}주 전`;
  return `${Math.floor(days / 30)}개월 전`;
}

export default function ReviewListScreen() {
  const router = useRouter();
  const { state } = useApp();

  const allReviews = [...state.profile.reviews, ...DEMO_REVIEWS];
  const avgRating = allReviews.length > 0
    ? Math.round((allReviews.reduce((s, r) => s + r.rating, 0) / allReviews.length) * 10) / 10
    : 0;

  const renderReview = ({ item }: { item: Review }) => (
    <View style={[styles.reviewCard, { backgroundColor: "#F8F8F8", borderColor: "#E8E8E8" }]}>
      <View style={styles.reviewHeader}>
        <Text style={[styles.reviewAuthor, { color: "#1A1A1A" }]}>{item.fromNickname}</Text>
        <Text style={[styles.reviewDate, { color: "#8E8E93" }]}>{timeAgo(item.createdAt)}</Text>
      </View>
      <StarDisplay rating={item.rating} />
      <View style={[styles.serviceBadge, { backgroundColor: "#F8F8F8" }]}>
        <Text style={styles.serviceBadgeText}>{item.serviceType}</Text>
      </View>
      <Text style={[styles.reviewContent, { color: "#8E8E93" }]}>{item.content}</Text>
    </View>
  );

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]} style={{ backgroundColor: "#FFFFFF" }}>
      <View style={[styles.header, { borderBottomColor: "#E8E8E8" }]}>
        <Pressable
          onPress={() => { haptic(); router.back(); }}
          style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.7 }]}
        >
          <Text style={[styles.backBtnText, { color: "#1A1A1A" }]}>‹</Text>
        </Pressable>
        <Text style={[styles.headerTitle, { color: "#1A1A1A" }]}>후기 목록</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* 평점 요약 */}
      <View style={[styles.summaryCard, { borderBottomColor: "#E8E8E8" }]}>
        <Text style={[styles.summaryRating, { color: "#1A1A1A" }]}>{avgRating.toFixed(1)}</Text>
        <StarDisplay rating={Math.round(avgRating)} />
        <Text style={[styles.summaryCount, { color: "#8E8E93" }]}>총 {allReviews.length}개의 후기</Text>
      </View>

      <FlatList
        data={allReviews}
        renderItem={renderReview}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>📝</Text>
            <Text style={[styles.emptyText, { color: "#8E8E93" }]}>아직 후기가 없어요</Text>
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
    // borderBottomColor: "#F0F0F0",
  },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  backBtnText: { fontSize: 28 /*, color: "#1A1A1A"*/ },
  headerTitle: { flex: 1, textAlign: "center", fontSize: 17, fontWeight: "700" /*, color: "#1A1A1A"*/ },
  summaryCard: {
    alignItems: "center",
    paddingVertical: 20,
    borderBottomWidth: 1,
    // borderBottomColor: "#F0F0F0",
    gap: 4,
  },
  summaryRating: { fontSize: 36, fontWeight: "800" /*, color: "#1A1A1A"*/ },
  summaryCount: { fontSize: 13, /*color: "#9E9E9E",*/ marginTop: 4 },
  list: { padding: 16, gap: 12, paddingBottom: 40 },
  reviewCard: {
    // backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    // borderColor: "#F0F0F0",
    gap: 8,
  },
  reviewHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  reviewAuthor: { fontSize: 14, fontWeight: "700" /*, color: "#1A1A1A"*/ },
  reviewDate: { fontSize: 12 /*, color: "#9E9E9E"*/ },
  starsRow: { flexDirection: "row", gap: 2 },
  starSmall: { fontSize: 16 /*, color: "#E0E0E0"*/ },
  starSmallActive: { color: "#FFB300" },
  serviceBadge: {
    alignSelf: "flex-start",
    // backgroundColor: "#FFF3EE",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  serviceBadgeText: { fontSize: 11, color: "#FF7043", fontWeight: "600" },
  reviewContent: { fontSize: 14, /*color: "#8E8E93",*/ lineHeight: 20 },
  emptyContainer: { alignItems: "center", paddingVertical: 60, gap: 12 },
  emptyEmoji: { fontSize: 48 },
  emptyText: { fontSize: 15 /*, color: "#9E9E9E"*/ },
});
