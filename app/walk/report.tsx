import React, { useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useApp } from "@/lib/app-context";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";
import { Fonts } from "@/hooks/use-fonts";
import Svg, { Polyline } from "react-native-svg";

function haptic() {
  if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}시간 ${m}분`;
  return `${m}분`;
}

function formatDist(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)}m`;
  return `${km.toFixed(2)}km`;
}

// 칼로리 추정 (체중 60kg 기준, 산책 MET ~3.5)
function estimateCalories(durationMin: number, speedKmh: number): number {
  const met = speedKmh < 3 ? 2.5 : speedKmh < 5 ? 3.5 : 4.5;
  return Math.round(met * 60 * (durationMin / 60));
}

// 걸음 수 추정 (평균 보폭 0.7m)
function estimateSteps(distanceKm: number): number {
  return Math.round((distanceKm * 1000) / 0.7);
}

export default function WalkReportScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const router = useRouter();
  const { state } = useApp();

  const session = state.walkSessions.find((s) => s.id === sessionId);

  const reportData = useMemo(() => {
    if (!session) return null;
    const durationMin = Math.round(session.totalDurationSec / 60);
    const activeDurationMin = Math.round((session.totalDurationSec - (session.pausedDurationSec || 0)) / 60);
    const calories = estimateCalories(activeDurationMin, session.avgSpeedKmh);
    const steps = estimateSteps(session.totalDistanceKm);
    const startTime = new Date(session.startedAt);
    const endTime = session.endedAt ? new Date(session.endedAt) : new Date(startTime.getTime() + session.totalDurationSec * 1000);

    return {
      durationMin,
      activeDurationMin,
      calories,
      steps,
      startTime,
      endTime,
    };
  }, [session]);

  if (!session || !reportData) {
    return (
      <ScreenContainer edges={["top", "bottom", "left", "right"]}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ fontSize: 40 }}>📋</Text>
          <Text style={[st.emptyText, { color: "#8E8E93" }]}>리포트를 찾을 수 없습니다</Text>
          <Pressable onPress={() => router.back()} style={st.backBtnAlt}>
            <Text style={st.backBtnAltText}>돌아가기</Text>
          </Pressable>
        </View>
      </ScreenContainer>
    );
  }

  // 경로 SVG
  const routePoints = session.routePoints || [];
  const routeSvg = useMemo(() => {
    if (routePoints.length < 2) return null;
    const lats = routePoints.map((p) => p.lat);
    const lngs = routePoints.map((p) => p.lng);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    const latRange = maxLat - minLat || 0.001;
    const lngRange = maxLng - minLng || 0.001;
    const padding = 20;
    const svgW = 300;
    const svgH = 200;
    const points = routePoints
      .map((p) => {
        const x = padding + ((p.lng - minLng) / lngRange) * (svgW - padding * 2);
        const y = padding + ((maxLat - p.lat) / latRange) * (svgH - padding * 2);
        return `${x},${y}`;
      })
      .join(" ");
    return { points, svgW, svgH };
  }, [routePoints]);

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <View style={[st.header, { borderBottomColor: "#E8E8E8" }]}>
        <Pressable onPress={() => { haptic(); router.back(); }}>
          <Text style={st.headerBack}>‹ 뒤로</Text>
        </Pressable>
        <Text style={[st.headerTitle, { color: "#1A1A1A" }]}>산책 리포트</Text>
        <View style={{ width: 50 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        {/* 리포트 헤더 */}
        <View style={[st.reportHeader, { backgroundColor: "#F8F8F8" }]}>
          <View style={[st.reportPetAvatar, { backgroundColor: "#FFFFFF" }]}>
            <Text style={{ fontSize: 40 }}>{session.petEmoji}</Text>
          </View>
          <Text style={[st.reportPetName, { color: "#1A1A1A" }]}>{session.petName}의 산책 리포트</Text>
          <Text style={[st.reportDate, { color: "#8E8E93" }]}>
            {reportData.startTime.toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric", weekday: "short" })}
          </Text>
          <Text style={[st.reportTime, { color: "#8E8E93" }]}>
            {reportData.startTime.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
            {" ~ "}
            {reportData.endTime.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
          </Text>
        </View>

        {/* 핵심 지표 */}
        <View style={st.metricsGrid}>
          <View style={[st.metricCard, st.metricCardLarge, { backgroundColor: "#FFFFFF", borderColor: "#E8E8E8" }]}>
            <Text style={{ fontSize: 28 }}>📏</Text>
            <Text style={st.metricValue}>{formatDist(session.totalDistanceKm)}</Text>
            <Text style={[st.metricLabel, { color: "#8E8E93" }]}>총 이동 거리</Text>
          </View>
          <View style={[st.metricCard, st.metricCardLarge, { backgroundColor: "#FFFFFF", borderColor: "#E8E8E8" }]}>
            <Text style={{ fontSize: 28 }}>⏱</Text>
            <Text style={st.metricValue}>{formatTime(session.totalDurationSec)}</Text>
            <Text style={[st.metricLabel, { color: "#8E8E93" }]}>총 산책 시간</Text>
          </View>
        </View>

        <View style={st.metricsGrid}>
          <View style={[st.metricCard, { backgroundColor: "#FFFFFF", borderColor: "#E8E8E8" }]}>
            <Text style={{ fontSize: 20 }}>🔥</Text>
            <Text style={[st.metricValueSm, { color: "#1A1A1A" }]}>{reportData.calories}</Text>
            <Text style={[st.metricLabel, { color: "#8E8E93" }]}>소모 칼로리 (kcal)</Text>
          </View>
          <View style={[st.metricCard, { backgroundColor: "#FFFFFF", borderColor: "#E8E8E8" }]}>
            <Text style={{ fontSize: 20 }}>👣</Text>
            <Text style={[st.metricValueSm, { color: "#1A1A1A" }]}>{reportData.steps.toLocaleString()}</Text>
            <Text style={[st.metricLabel, { color: "#8E8E93" }]}>추정 걸음 수</Text>
          </View>
          <View style={[st.metricCard, { backgroundColor: "#FFFFFF", borderColor: "#E8E8E8" }]}>
            <Text style={{ fontSize: 20 }}>⚡</Text>
            <Text style={[st.metricValueSm, { color: "#1A1A1A" }]}>{session.avgSpeedKmh.toFixed(1)}</Text>
            <Text style={[st.metricLabel, { color: "#8E8E93" }]}>평균 속도 (km/h)</Text>
          </View>
        </View>

        {/* 경로 시각화 */}
        {routeSvg && (
          <View style={st.routeSection}>
            <Text style={[st.sectionTitle, { color: "#1A1A1A" }]}>🗺 산책 경로</Text>
            <View style={[st.routeMap, { backgroundColor: "#F8F8F8", borderColor: "#E8E8E8" }]}>
              <Svg width={routeSvg.svgW} height={routeSvg.svgH}>
                <Polyline
                  points={routeSvg.points}
                  fill="none"
                  stroke="#2E7D32"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            </View>
            <Text style={[st.routeNote, { color: "#8E8E93" }]}>GPS 좌표 {routePoints.length}개 기록됨</Text>
          </View>
        )}

        {/* 상세 통계 */}
        <View style={st.detailSection}>
          <Text style={[st.sectionTitle, { color: "#1A1A1A" }]}>📊 상세 통계</Text>
          <View style={[st.detailCard, { backgroundColor: "#FFFFFF", borderColor: "#E8E8E8" }]}>
            <DetailRow label="실제 이동 시간" value={formatTime(session.totalDurationSec - (session.pausedDurationSec || 0))} />
            <DetailRow label="정지 시간" value={formatTime(session.pausedDurationSec || 0)} />
            <DetailRow label="최고 속도" value={`${session.maxSpeedKmh.toFixed(1)} km/h`} />
            <DetailRow label="돌보미" value={session.caretakerName || "-"} />
            <DetailRow label="동네" value={session.neighborhood || "-"} />
          </View>
        </View>

        {/* 리뷰 유도 */}
        <View style={[st.reviewPrompt, { backgroundColor: "#F8F8F8", borderColor: "#FFD9C7" }]}>
          <Text style={{ fontSize: 24 }}>⭐</Text>
          <View style={{ flex: 1 }}>
            <Text style={[st.reviewPromptTitle, { color: "#1A1A1A" }]}>산책은 어떠셨나요?</Text>
            <Text style={[st.reviewPromptSub, { color: "#8E8E93" }]}>돌보미에게 리뷰를 남겨주세요</Text>
          </View>
          <Pressable
            onPress={() => { haptic(); router.push("/review/write" as never); }}
            style={st.reviewBtn}
          >
            <Text style={st.reviewBtnText}>리뷰 쓰기</Text>
          </Pressable>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={[st.detailRow, { borderBottomColor: "#F8F8F8" }]}>
      <Text style={[st.detailLabel, { color: "#8E8E93" }]}>{label}</Text>
      <Text style={[st.detailValue, { color: "#1A1A1A" }]}>{value}</Text>
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
  },
  headerBack: { fontFamily: Fonts.semiBold, fontSize: 16, color: "#2E7D32" },
  headerTitle: { fontFamily: Fonts.bold, fontSize: 17 },

  reportHeader: {
    alignItems: "center",
    paddingVertical: 24,
    paddingHorizontal: 20,
  },
  reportPetAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  reportPetName: { fontFamily: Fonts.extraBold, fontSize: 20, marginBottom: 4 },
  reportDate: { fontFamily: Fonts.medium, fontSize: 14 },
  reportTime: { fontFamily: Fonts.regular, fontSize: 13, marginTop: 2 },

  metricsGrid: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 10,
    marginTop: 16,
  },
  metricCard: {
    flex: 1,
    borderRadius: 16,
    padding: 14,
    alignItems: "center",
    borderWidth: 1,
    gap: 4,
  },
  metricCardLarge: { paddingVertical: 20 },
  metricValue: { fontFamily: Fonts.extraBold, fontSize: 24, color: "#2E7D32" },
  metricValueSm: { fontFamily: Fonts.bold, fontSize: 18 },
  metricLabel: { fontFamily: Fonts.regular, fontSize: 10, textAlign: "center" },

  routeSection: {
    marginTop: 20,
    paddingHorizontal: 16,
  },
  sectionTitle: { fontFamily: Fonts.bold, fontSize: 16, marginBottom: 12 },
  routeMap: {
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
  },
  routeNote: { fontFamily: Fonts.regular, fontSize: 11, textAlign: "center", marginTop: 6 },

  detailSection: {
    marginTop: 20,
    paddingHorizontal: 16,
  },
  detailCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  detailLabel: { fontFamily: Fonts.regular, fontSize: 13 },
  detailValue: { fontFamily: Fonts.semiBold, fontSize: 13 },

  reviewPrompt: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 20,
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 16,
    gap: 12,
    borderWidth: 1,
  },
  reviewPromptTitle: { fontFamily: Fonts.bold, fontSize: 14 },
  reviewPromptSub: { fontFamily: Fonts.regular, fontSize: 11, marginTop: 2 },
  reviewBtn: {
    backgroundColor: "#2E7D32",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  reviewBtnText: { fontFamily: Fonts.bold, fontSize: 13, color: "#FFFFFF" },

  emptyText: { fontFamily: Fonts.medium, fontSize: 15, marginTop: 12 },
  backBtnAlt: {
    marginTop: 16,
    backgroundColor: "#2E7D32",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  backBtnAltText: { fontFamily: Fonts.bold, fontSize: 14, color: "#FFFFFF" },
});
