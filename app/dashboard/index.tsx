import { useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Platform,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useRouter } from "expo-router";
import { useApp, Review } from "@/lib/app-context";
import * as Haptics from "expo-haptics";
import { Fonts } from "@/hooks/use-fonts";

function haptic() {
  if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

// 최근 N개월 데이터 생성 (데모용)
function generateMonthlyData(months: number) {
  const data = [];
  const now = new Date();
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthLabel = `${d.getMonth() + 1}월`;
    data.push({
      month: monthLabel,
      walks: Math.floor(Math.random() * 20) + 5,
      distance: Math.round((Math.random() * 30 + 10) * 10) / 10,
      earnings: Math.floor(Math.random() * 300000) + 100000,
      hours: Math.round((Math.random() * 40 + 10) * 10) / 10,
    });
  }
  return data;
}

export default function DashboardScreen() {
  const router = useRouter();
  const { state } = useApp();
  const isWalker = state.profile.role === "caretaker";
  const [selectedTab, setSelectedTab] = useState<"overview" | "earnings" | "stats">("overview");

  const monthlyData = useMemo(() => generateMonthlyData(6), []);
  const currentMonth = monthlyData[monthlyData.length - 1];
  const prevMonth = monthlyData[monthlyData.length - 2];

  // 실제 데이터 기반 통계
  const totalWalks = state.walkSessions.filter((s) => s.status === "completed").length;
  const totalDistance = state.walkSessions
    .filter((s) => s.status === "completed")
    .reduce((sum, s) => sum + s.totalDistanceKm, 0);
  const totalDuration = state.walkSessions
    .filter((s) => s.status === "completed")
    .reduce((sum, s) => sum + s.totalDurationSec, 0);
  const reviews = state.profile.reviews || [];
  const totalReviews = reviews.length;
  const avgRating = totalReviews > 0
    ? (reviews.reduce((sum: number, r: Review) => sum + r.rating, 0) / totalReviews).toFixed(1)
    : "0.0";
  const totalPayments = state.payments.reduce((sum, p) => sum + p.amount, 0);

  // 변화율 계산
  const earningsChange = prevMonth.earnings > 0
    ? Math.round(((currentMonth.earnings - prevMonth.earnings) / prevMonth.earnings) * 100)
    : 0;

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <View style={st.header}>
        <Pressable onPress={() => { haptic(); router.back(); }}>
          <Text style={st.headerBack}>‹ 뒤로</Text>
        </Pressable>
        <Text style={st.headerTitle}>{isWalker ? "수익 대시보드" : "산책 대시보드"}</Text>
        <View style={{ width: 50 }} />
      </View>

      {/* 탭 */}
      <View style={st.tabBar}>
        {(["overview", isWalker ? "earnings" : "stats", "stats"] as const)
          .filter((t, i) => !(isWalker && i === 2) && !(!isWalker && i === 1))
          .map((tab) => (
            <Pressable
              key={tab}
              onPress={() => { haptic(); setSelectedTab(tab); }}
              style={[st.tab, selectedTab === tab && st.tabActive]}
            >
              <Text style={[st.tabText, selectedTab === tab && st.tabTextActive]}>
                {tab === "overview" ? "개요" : tab === "earnings" ? "수익" : "통계"}
              </Text>
            </Pressable>
          ))}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        {/* 개요 탭 */}
        {selectedTab === "overview" && (
          <View style={st.section}>
            {/* 핵심 지표 카드 */}
            <View style={st.heroCard}>
              <Text style={st.heroEmoji}>{isWalker ? "💰" : "🐾"}</Text>
              <Text style={st.heroValue}>
                {isWalker
                  ? `${totalPayments.toLocaleString()}원`
                  : `${totalWalks}회`}
              </Text>
              <Text style={st.heroLabel}>
                {isWalker ? "총 수익" : "총 산책 횟수"}
              </Text>
            </View>

            {/* 핵심 지표 그리드 */}
            <View style={st.metricsGrid}>
              <MetricCard emoji="📏" value={`${totalDistance.toFixed(1)}km`} label="총 거리" />
              <MetricCard emoji="⏱" value={`${Math.round(totalDuration / 60)}분`} label="총 시간" />
              <MetricCard emoji="⭐" value={avgRating} label="평균 평점" />
              <MetricCard emoji="📝" value={`${totalReviews}개`} label="리뷰 수" />
            </View>

            {/* 이번 달 요약 (데모) */}
            <View style={st.monthSummary}>
              <Text style={st.sectionTitle}>📊 이번 달 요약</Text>
              <View style={st.monthGrid}>
                <View style={st.monthItem}>
                  <Text style={st.monthValue}>{currentMonth.walks}회</Text>
                  <Text style={st.monthLabel}>산책</Text>
                </View>
                <View style={st.monthItem}>
                  <Text style={st.monthValue}>{currentMonth.distance}km</Text>
                  <Text style={st.monthLabel}>거리</Text>
                </View>
                <View style={st.monthItem}>
                  <Text style={st.monthValue}>{currentMonth.hours}h</Text>
                  <Text style={st.monthLabel}>시간</Text>
                </View>
                {isWalker && (
                  <View style={st.monthItem}>
                    <Text style={st.monthValue}>{(currentMonth.earnings / 10000).toFixed(1)}만</Text>
                    <Text style={st.monthLabel}>수익</Text>
                  </View>
                )}
              </View>
            </View>

            {/* 최근 활동 */}
            <View style={st.recentSection}>
              <Text style={st.sectionTitle}>🕐 최근 활동</Text>
              {state.walkSessions.slice(-5).reverse().map((session) => (
                <View key={session.id} style={st.activityRow}>
                  <Text style={{ fontSize: 20 }}>{session.petEmoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={st.activityName}>{session.petName}</Text>
                    <Text style={st.activityMeta}>
                      {new Date(session.startedAt).toLocaleDateString("ko-KR", { month: "short", day: "numeric" })}
                      {" · "}
                      {session.totalDistanceKm.toFixed(1)}km
                      {" · "}
                      {Math.round(session.totalDurationSec / 60)}분
                    </Text>
                  </View>
                  <View style={[st.activityStatus, {
                    backgroundColor: session.status === "completed" ? "#E8F5E9" : "#FFF8E1",
                  }]}>
                    <Text style={[st.activityStatusText, {
                      color: session.status === "completed" ? "#34C759" : "#FF9500",
                    }]}>
                      {session.status === "completed" ? "완료" : "진행중"}
                    </Text>
                  </View>
                </View>
              ))}
              {state.walkSessions.length === 0 && (
                <Text style={st.emptyText}>아직 산책 기록이 없습니다</Text>
              )}
            </View>
          </View>
        )}

        {/* 수익 탭 (도그워커) */}
        {selectedTab === "earnings" && isWalker && (
          <View style={st.section}>
            <View style={st.earningsHero}>
              <Text style={st.earningsMonth}>이번 달 수익</Text>
              <Text style={st.earningsAmount}>{currentMonth.earnings.toLocaleString()}원</Text>
              <View style={[st.changeBadge, { backgroundColor: earningsChange >= 0 ? "#E8F5E9" : "#FFEBEE" }]}>
                <Text style={[st.changeText, { color: earningsChange >= 0 ? "#34C759" : "#FF3B30" }]}>
                  {earningsChange >= 0 ? "▲" : "▼"} {Math.abs(earningsChange)}% 전월 대비
                </Text>
              </View>
            </View>

            {/* 월별 수익 바 차트 (텍스트 기반) */}
            <View style={st.chartSection}>
              <Text style={st.sectionTitle}>📈 월별 수익 추이</Text>
              {monthlyData.map((m, idx) => {
                const maxEarnings = Math.max(...monthlyData.map((d) => d.earnings));
                const barWidth = maxEarnings > 0 ? (m.earnings / maxEarnings) * 100 : 0;
                return (
                  <View key={idx} style={st.barRow}>
                    <Text style={st.barLabel}>{m.month}</Text>
                    <View style={st.barTrack}>
                      <View style={[st.barFill, { width: `${barWidth}%` as any }]} />
                    </View>
                    <Text style={st.barValue}>{(m.earnings / 10000).toFixed(0)}만</Text>
                  </View>
                );
              })}
            </View>

            {/* 정산 정보 */}
            <View style={st.settlementCard}>
              <Text style={st.sectionTitle}>💳 정산 정보</Text>
              <DetailRow label="에스크로 보관 중" value={`${state.payments.filter((p) => p.status === "escrow_held").reduce((s, p) => s + p.amount, 0).toLocaleString()}원`} />
              <DetailRow label="정산 완료" value={`${state.payments.filter((p) => p.status === "completed" || p.status === "escrow_released").reduce((s, p) => s + p.amount, 0).toLocaleString()}원`} />
              <DetailRow label="총 거래 건수" value={`${state.payments.length}건`} />
            </View>
          </View>
        )}

        {/* 통계 탭 */}
        {selectedTab === "stats" && (
          <View style={st.section}>
            <View style={st.chartSection}>
              <Text style={st.sectionTitle}>📊 월별 산책 추이</Text>
              {monthlyData.map((m, idx) => {
                const maxWalks = Math.max(...monthlyData.map((d) => d.walks));
                const barWidth = maxWalks > 0 ? (m.walks / maxWalks) * 100 : 0;
                return (
                  <View key={idx} style={st.barRow}>
                    <Text style={st.barLabel}>{m.month}</Text>
                    <View style={st.barTrack}>
                      <View style={[st.barFill, { width: `${barWidth}%` as any }]} />
                    </View>
                    <Text style={st.barValue}>{m.walks}회</Text>
                  </View>
                );
              })}
            </View>

            <View style={st.chartSection}>
              <Text style={st.sectionTitle}>📏 월별 거리 추이</Text>
              {monthlyData.map((m, idx) => {
                const maxDist = Math.max(...monthlyData.map((d) => d.distance));
                const barWidth = maxDist > 0 ? (m.distance / maxDist) * 100 : 0;
                return (
                  <View key={idx} style={st.barRow}>
                    <Text style={st.barLabel}>{m.month}</Text>
                    <View style={[st.barTrack, { backgroundColor: "#E3F2FD" }]}>
                      <View style={[st.barFill, { width: `${barWidth}%` as any, backgroundColor: "#2196F3" }]} />
                    </View>
                    <Text style={st.barValue}>{m.distance}km</Text>
                  </View>
                );
              })}
            </View>

            {/* 리뷰 요약 */}
            <View style={st.reviewSummary}>
              <Text style={st.sectionTitle}>⭐ 리뷰 요약</Text>
              {reviews.length > 0 ? (
                <>
                  <View style={st.ratingOverview}>
                    <Text style={st.bigRating}>{avgRating}</Text>
                    <View>
                      <Text style={st.ratingStars}>
                        {"★".repeat(Math.round(parseFloat(avgRating)))}
                        {"☆".repeat(5 - Math.round(parseFloat(avgRating)))}
                      </Text>
                      <Text style={st.ratingCount}>{totalReviews}개 리뷰</Text>
                    </View>
                  </View>
                  {reviews.slice(-3).reverse().map((review: Review) => (
                    <View key={review.id} style={st.reviewItem}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                        <Text style={{ fontSize: 14 }}>{review.fromEmoji || "👤"}</Text>
                        <Text style={st.reviewerName}>{review.fromNickname}</Text>
                        <Text style={st.reviewRating}>{"★".repeat(review.rating)}</Text>
                      </View>
                      <Text style={st.reviewContent} numberOfLines={2}>{review.content}</Text>
                    </View>
                  ))}
                </>
              ) : (
                <Text style={st.emptyText}>아직 리뷰가 없습니다</Text>
              )}
            </View>
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

function MetricCard({ emoji, value, label }: { emoji: string; value: string; label: string }) {
  return (
    <View style={st.metricCard}>
      <Text style={{ fontSize: 20 }}>{emoji}</Text>
      <Text style={st.metricValue}>{value}</Text>
      <Text style={st.metricLabel}>{label}</Text>
    </View>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={st.detailRow}>
      <Text style={st.detailLabel}>{label}</Text>
      <Text style={st.detailValue}>{value}</Text>
    </View>
  );
}

const st = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  headerBack: { fontFamily: Fonts.semiBold, fontSize: 16, color: "#FF6B35" },
  headerTitle: { fontFamily: Fonts.bold, fontSize: 17, color: "#1A1A1A" },

  tabBar: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#F8F8F8",
    alignItems: "center",
  },
  tabActive: { backgroundColor: "#FF6B35" },
  tabText: { fontFamily: Fonts.semiBold, fontSize: 13, color: "#8E8E93" },
  tabTextActive: { color: "#FFFFFF" },

  section: { padding: 16, gap: 16 },

  // Hero
  heroCard: {
    alignItems: "center",
    backgroundColor: "#FFF5F0",
    borderRadius: 20,
    padding: 24,
    gap: 8,
  },
  heroEmoji: { fontSize: 40 },
  heroValue: { fontFamily: Fonts.extraBold, fontSize: 32, color: "#FF6B35" },
  heroLabel: { fontFamily: Fonts.medium, fontSize: 14, color: "#8E8E93" },

  // Metrics Grid
  metricsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  metricCard: {
    flex: 1,
    minWidth: "46%" as any,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#F0F0F0",
    gap: 4,
  },
  metricValue: { fontFamily: Fonts.bold, fontSize: 18, color: "#1A1A1A" },
  metricLabel: { fontFamily: Fonts.regular, fontSize: 11, color: "#8E8E93" },

  // Month Summary
  monthSummary: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#F0F0F0",
  },
  sectionTitle: { fontFamily: Fonts.bold, fontSize: 16, color: "#1A1A1A", marginBottom: 12 },
  monthGrid: { flexDirection: "row", justifyContent: "space-around" },
  monthItem: { alignItems: "center", gap: 4 },
  monthValue: { fontFamily: Fonts.bold, fontSize: 18, color: "#FF6B35" },
  monthLabel: { fontFamily: Fonts.regular, fontSize: 11, color: "#8E8E93" },

  // Recent Activity
  recentSection: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#F0F0F0",
  },
  activityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F8F8F8",
  },
  activityName: { fontFamily: Fonts.semiBold, fontSize: 14, color: "#1A1A1A" },
  activityMeta: { fontFamily: Fonts.regular, fontSize: 11, color: "#8E8E93", marginTop: 2 },
  activityStatus: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  activityStatusText: { fontFamily: Fonts.semiBold, fontSize: 10 },

  // Earnings
  earningsHero: {
    alignItems: "center",
    backgroundColor: "#FFF5F0",
    borderRadius: 20,
    padding: 24,
    gap: 8,
  },
  earningsMonth: { fontFamily: Fonts.medium, fontSize: 14, color: "#8E8E93" },
  earningsAmount: { fontFamily: Fonts.extraBold, fontSize: 36, color: "#FF6B35" },
  changeBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  changeText: { fontFamily: Fonts.semiBold, fontSize: 12 },

  // Chart
  chartSection: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#F0F0F0",
  },
  barRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  barLabel: { fontFamily: Fonts.medium, fontSize: 12, color: "#8E8E93", width: 32 },
  barTrack: {
    flex: 1,
    height: 20,
    backgroundColor: "#FFF5F0",
    borderRadius: 10,
    overflow: "hidden",
  },
  barFill: { height: "100%", backgroundColor: "#FF6B35", borderRadius: 10 },
  barValue: { fontFamily: Fonts.semiBold, fontSize: 12, color: "#1A1A1A", width: 40, textAlign: "right" },

  // Settlement
  settlementCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#F0F0F0",
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F8F8F8",
  },
  detailLabel: { fontFamily: Fonts.regular, fontSize: 13, color: "#8E8E93" },
  detailValue: { fontFamily: Fonts.semiBold, fontSize: 13, color: "#1A1A1A" },

  // Review Summary
  reviewSummary: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#F0F0F0",
  },
  ratingOverview: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  bigRating: { fontFamily: Fonts.extraBold, fontSize: 40, color: "#FFB800" },
  ratingStars: { fontSize: 16, color: "#FFB800" },
  ratingCount: { fontFamily: Fonts.regular, fontSize: 12, color: "#8E8E93", marginTop: 2 },
  reviewItem: {
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#F8F8F8",
    gap: 4,
  },
  reviewerName: { fontFamily: Fonts.semiBold, fontSize: 13, color: "#1A1A1A" },
  reviewRating: { fontSize: 12, color: "#FFB800" },
  reviewContent: { fontFamily: Fonts.regular, fontSize: 12, color: "#8E8E93", lineHeight: 18 },

  emptyText: { fontFamily: Fonts.regular, fontSize: 13, color: "#8E8E93", textAlign: "center", paddingVertical: 20 },
});
