import React, { useState, useMemo, useCallback } from "react";
import {
  View, Text, ScrollView, Pressable, TextInput, Alert,
  StyleSheet, Dimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { Fonts } from "@/hooks/use-fonts";
import { useApp } from "@/lib/app-context";
import type {
  VaccineRecord, MedicationRecord, MedicationLog, WeightRecord, ActivitySummary,
} from "@/lib/solo-care-data";

const { width: SCREEN_W } = Dimensions.get("window");

type TabKey = "overview" | "vaccine" | "medication" | "activity" | "weight";

const TABS: { key: TabKey; label: string; icon: string }[] = [
  { key: "overview", label: "종합", icon: "📊" },
  { key: "vaccine", label: "접종", icon: "💉" },
  { key: "medication", label: "복약", icon: "💊" },
  { key: "activity", label: "활동량", icon: "🏃" },
  { key: "weight", label: "체중", icon: "⚖️" },
];

const VACCINE_TYPES = ["종합백신", "광견병", "코로나장염", "켄넬코프", "인플루엔자"] as const;

// 데모 데이터 생성
function getDemoVaccines(): VaccineRecord[] {
  return [
    { id: "v1", petId: "p1", type: "종합백신", date: "2026-01-15", nextDueDate: "2027-01-15", hospital: "유성 펫 동물병원", isCompleted: true },
    { id: "v2", petId: "p1", type: "광견병", date: "2025-12-20", nextDueDate: "2026-12-20", hospital: "대전24시 동물의료센터", isCompleted: true },
    { id: "v3", petId: "p1", type: "켄넬코프", date: "2026-02-10", nextDueDate: "2027-02-10", hospital: "유성 펫 동물병원", isCompleted: true },
    { id: "v4", petId: "p1", type: "인플루엔자", date: "", nextDueDate: "2026-04-15", isCompleted: false },
  ];
}

function getDemoMedications(): MedicationRecord[] {
  return [
    {
      id: "m1", petId: "p1", name: "심장사상충 예방약", dosage: "1정",
      frequency: "월 1회", times: ["09:00"], startDate: "2026-01-01", isActive: true,
      logs: [
        { id: "ml1", medicationId: "m1", date: "2026-03-01", time: "09:00", taken: true, takenAt: "2026-03-01T09:05:00" },
        { id: "ml2", medicationId: "m1", date: "2026-04-01", time: "09:00", taken: true, takenAt: "2026-04-01T09:12:00" },
      ],
    },
    {
      id: "m2", petId: "p1", name: "관절 영양제", dosage: "5ml",
      frequency: "하루 1회", times: ["08:00"], startDate: "2026-02-01", isActive: true,
      logs: [
        { id: "ml3", medicationId: "m2", date: "2026-04-02", time: "08:00", taken: true, takenAt: "2026-04-02T08:10:00" },
        { id: "ml4", medicationId: "m2", date: "2026-04-03", time: "08:00", taken: false },
      ],
    },
  ];
}

function getDemoWeights(): WeightRecord[] {
  return [
    { id: "w1", petId: "p1", weight: 5.2, date: "2026-01-05" },
    { id: "w2", petId: "p1", weight: 5.4, date: "2026-02-03" },
    { id: "w3", petId: "p1", weight: 5.3, date: "2026-03-01" },
    { id: "w4", petId: "p1", weight: 5.5, date: "2026-04-01" },
  ];
}

function getDemoActivity(): ActivitySummary[] {
  const data: ActivitySummary[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    data.push({
      date: `${d.getFullYear()}-${mm}-${dd}`,
      walkCount: Math.floor(Math.random() * 3) + 1,
      totalDistanceKm: +(Math.random() * 3 + 0.5).toFixed(1),
      totalDurationMin: Math.floor(Math.random() * 60 + 20),
      avgSpeedKmh: +(Math.random() * 2 + 3).toFixed(1),
    });
  }
  return data;
}

function daysUntil(dateStr: string): number {
  const target = new Date(dateStr);
  const now = new Date();
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export default function HealthManagerScreen() {
  const router = useRouter();
  const { state } = useApp();
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [vaccines, setVaccines] = useState<VaccineRecord[]>(getDemoVaccines);
  const [medications, setMedications] = useState<MedicationRecord[]>(getDemoMedications);
  const [weights, setWeights] = useState<WeightRecord[]>(getDemoWeights);
  const [activities] = useState<ActivitySummary[]>(getDemoActivity);
  const [newWeight, setNewWeight] = useState("");

  const petName = state.profile.pets?.[0]?.name || "우리 아이";
  const petEmoji = state.profile.pets?.[0]?.emoji || "🐕";

  // 복약 이행률 계산
  const medicationAdherence = useMemo(() => {
    let total = 0, taken = 0;
    medications.forEach(m => {
      m.logs.forEach(l => { total++; if (l.taken) taken++; });
    });
    return total > 0 ? Math.round((taken / total) * 100) : 100;
  }, [medications]);

  // 주간 활동 통계
  const weeklyStats = useMemo(() => {
    const totalDist = activities.reduce((s, a) => s + a.totalDistanceKm, 0);
    const totalMin = activities.reduce((s, a) => s + a.totalDurationMin, 0);
    const totalWalks = activities.reduce((s, a) => s + a.walkCount, 0);
    return { totalDist: totalDist.toFixed(1), totalMin, totalWalks, avgDaily: (totalMin / 7).toFixed(0) };
  }, [activities]);

  // 다가오는 접종
  const upcomingVaccines = useMemo(() => {
    return vaccines.filter(v => !v.isCompleted || daysUntil(v.nextDueDate) <= 30)
      .sort((a, b) => daysUntil(a.nextDueDate) - daysUntil(b.nextDueDate));
  }, [vaccines]);

  const handleMedCheck = useCallback((medId: string, logId: string) => {
    setMedications(prev => prev.map(m => {
      if (m.id !== medId) return m;
      return {
        ...m,
        logs: m.logs.map(l => l.id === logId ? { ...l, taken: true, takenAt: new Date().toISOString() } : l),
      };
    }));
    Alert.alert("복용 완료 ✓", "건강 로그에 기록되었습니다.");
  }, []);

  const handleAddWeight = useCallback(() => {
    const w = parseFloat(newWeight);
    if (isNaN(w) || w <= 0 || w > 100) {
      Alert.alert("입력 오류", "올바른 체중을 입력해주세요 (kg)");
      return;
    }
    const today = new Date();
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    setWeights(prev => [...prev, { id: `w_${Date.now()}`, petId: "p1", weight: w, date: dateStr }]);
    setNewWeight("");
    Alert.alert("기록 완료", `${w}kg 기록되었습니다.`);
  }, [newWeight]);

  // ===== 종합 탭 =====
  const renderOverview = () => (
    <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
      {/* 오늘의 마이크로카피 */}
      <View style={styles.tipCard}>
        <Text style={styles.tipText}>☀️ 오늘 대전 날씨가 산책하기 딱 좋아요! {petName}({petEmoji})와 함께 나가볼까요?</Text>
      </View>

      {/* 건강 점수 카드 */}
      <View style={styles.scoreCard}>
        <Text style={styles.scoreEmoji}>{petEmoji}</Text>
        <Text style={styles.scoreName}>{petName}의 건강 현황</Text>
        <View style={styles.scoreGrid}>
          <View style={styles.scoreItem}>
            <Text style={styles.scoreValue}>{medicationAdherence}%</Text>
            <Text style={styles.scoreLabel}>복약 이행률</Text>
          </View>
          <View style={styles.scoreDivider} />
          <View style={styles.scoreItem}>
            <Text style={styles.scoreValue}>{weeklyStats.totalWalks}회</Text>
            <Text style={styles.scoreLabel}>주간 산책</Text>
          </View>
          <View style={styles.scoreDivider} />
          <View style={styles.scoreItem}>
            <Text style={styles.scoreValue}>{weeklyStats.totalDist}km</Text>
            <Text style={styles.scoreLabel}>주간 거리</Text>
          </View>
        </View>
      </View>

      {/* 다가오는 일정 */}
      <Text style={styles.sectionTitle}>📅 다가오는 일정</Text>
      {upcomingVaccines.length > 0 ? upcomingVaccines.map(v => {
        const days = daysUntil(v.nextDueDate);
        const isUrgent = days <= 7;
        return (
          <View key={v.id} style={[styles.scheduleCard, isUrgent && styles.scheduleUrgent]}>
            <View style={styles.scheduleLeft}>
              <Text style={styles.scheduleIcon}>💉</Text>
              <View>
                <Text style={styles.scheduleName}>{v.type}</Text>
                <Text style={styles.scheduleDate}>{v.nextDueDate}</Text>
              </View>
            </View>
            <View style={[styles.dDayBadge, isUrgent && styles.dDayUrgent]}>
              <Text style={[styles.dDayText, isUrgent && styles.dDayTextUrgent]}>
                {days <= 0 ? "오늘!" : `D-${days}`}
              </Text>
            </View>
          </View>
        );
      }) : (
        <Text style={styles.emptyNote}>예정된 접종이 없습니다</Text>
      )}

      {/* 오늘의 복약 */}
      <Text style={styles.sectionTitle}>💊 오늘의 복약</Text>
      {medications.filter(m => m.isActive).map(m => {
        const todayLog = m.logs.find(l => l.date === new Date().toISOString().split("T")[0]);
        return (
          <View key={m.id} style={styles.medCard}>
            <View style={styles.medInfo}>
              <Text style={styles.medName}>{m.name}</Text>
              <Text style={styles.medDosage}>{m.dosage} · {m.frequency}</Text>
              <Text style={styles.medTime}>{m.times.join(", ")}</Text>
            </View>
            {todayLog && !todayLog.taken ? (
              <Pressable
                style={({ pressed }) => [styles.medCheckBtn, pressed && { opacity: 0.7 }]}
                onPress={() => handleMedCheck(m.id, todayLog.id)}
              >
                <Text style={styles.medCheckText}>복용 완료</Text>
              </Pressable>
            ) : todayLog?.taken ? (
              <View style={styles.medDone}>
                <Text style={styles.medDoneText}>✓ 완료</Text>
              </View>
            ) : (
              <View style={styles.medPending}>
                <Text style={styles.medPendingText}>대기</Text>
              </View>
            )}
          </View>
        );
      })}

      {/* 주간 활동 요약 */}
      <Text style={styles.sectionTitle}>🏃 이번 주 활동 요약</Text>
      <View style={styles.activitySummary}>
        <View style={styles.activityItem}>
          <Text style={styles.activityValue}>{weeklyStats.totalWalks}</Text>
          <Text style={styles.activityLabel}>총 산책</Text>
        </View>
        <View style={styles.activityItem}>
          <Text style={styles.activityValue}>{weeklyStats.totalDist}</Text>
          <Text style={styles.activityLabel}>km 이동</Text>
        </View>
        <View style={styles.activityItem}>
          <Text style={styles.activityValue}>{weeklyStats.totalMin}</Text>
          <Text style={styles.activityLabel}>분 산책</Text>
        </View>
        <View style={styles.activityItem}>
          <Text style={styles.activityValue}>{weeklyStats.avgDaily}</Text>
          <Text style={styles.activityLabel}>일평균(분)</Text>
        </View>
      </View>

      {/* 체중 변화 */}
      {weights.length >= 2 && (
        <>
          <Text style={styles.sectionTitle}>⚖️ 체중 변화</Text>
          <View style={styles.weightChart}>
            {weights.slice(-5).map((w, i) => {
              const maxW = Math.max(...weights.slice(-5).map(x => x.weight));
              const minW = Math.min(...weights.slice(-5).map(x => x.weight));
              const range = maxW - minW || 1;
              const height = ((w.weight - minW) / range) * 60 + 20;
              return (
                <View key={w.id} style={styles.weightBar}>
                  <Text style={styles.weightValue}>{w.weight}</Text>
                  <View style={[styles.weightBarFill, { height }]} />
                  <Text style={styles.weightDate}>{w.date.slice(5)}</Text>
                </View>
              );
            })}
          </View>
        </>
      )}
    </ScrollView>
  );

  // ===== 접종 탭 =====
  const renderVaccine = () => (
    <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
      <Text style={styles.sectionTitle}>💉 예방접종 기록</Text>
      {vaccines.map(v => {
        const days = daysUntil(v.nextDueDate);
        return (
          <View key={v.id} style={styles.vaccineCard}>
            <View style={styles.vaccineHeader}>
              <Text style={styles.vaccineName}>{v.type}</Text>
              {v.isCompleted ? (
                <View style={styles.vaccineCompleteBadge}><Text style={styles.vaccineCompleteText}>접종 완료</Text></View>
              ) : (
                <View style={styles.vaccinePendingBadge}><Text style={styles.vaccinePendingText}>미접종</Text></View>
              )}
            </View>
            {v.date && <Text style={styles.vaccineDate}>접종일: {v.date}</Text>}
            {v.hospital && <Text style={styles.vaccineHospital}>🏥 {v.hospital}</Text>}
            <View style={styles.vaccineNext}>
              <Text style={styles.vaccineNextLabel}>다음 접종:</Text>
              <Text style={[styles.vaccineNextDate, days <= 14 && { color: "#E53935" }]}>
                {v.nextDueDate} ({days <= 0 ? "오늘!" : `D-${days}`})
              </Text>
            </View>
          </View>
        );
      })}
    </ScrollView>
  );

  // ===== 복약 탭 =====
  const renderMedication = () => (
    <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={styles.adherenceCard}>
        <Text style={styles.adherenceTitle}>복약 이행률</Text>
        <Text style={styles.adherenceValue}>{medicationAdherence}%</Text>
        <View style={styles.adherenceBar}>
          <View style={[styles.adherenceBarFill, { width: `${medicationAdherence}%` as any }]} />
        </View>
      </View>

      <Text style={styles.sectionTitle}>💊 복약 관리</Text>
      {medications.map(m => (
        <View key={m.id} style={styles.medDetailCard}>
          <View style={styles.medDetailHeader}>
            <Text style={styles.medDetailName}>{m.name}</Text>
            <View style={[styles.medStatusBadge, m.isActive ? styles.medActive : styles.medInactive]}>
              <Text style={styles.medStatusText}>{m.isActive ? "복용 중" : "종료"}</Text>
            </View>
          </View>
          <Text style={styles.medDetailInfo}>{m.dosage} · {m.frequency} · {m.times.join(", ")}</Text>
          <Text style={styles.medDetailPeriod}>시작: {m.startDate}{m.endDate ? ` ~ ${m.endDate}` : " ~ 진행 중"}</Text>

          <Text style={styles.logTitle}>최근 기록</Text>
          {m.logs.slice(-5).reverse().map(l => (
            <View key={l.id} style={styles.logRow}>
              <Text style={styles.logDate}>{l.date} {l.time}</Text>
              {l.taken ? (
                <Text style={styles.logTaken}>✓ {l.takenAt ? new Date(l.takenAt).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }) : ""}</Text>
              ) : (
                <Pressable
                  style={({ pressed }) => [styles.logCheckBtn, pressed && { opacity: 0.7 }]}
                  onPress={() => handleMedCheck(m.id, l.id)}
                >
                  <Text style={styles.logCheckText}>복용 완료</Text>
                </Pressable>
              )}
            </View>
          ))}
        </View>
      ))}
    </ScrollView>
  );

  // ===== 활동량 탭 =====
  const renderActivity = () => (
    <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
      <Text style={styles.sectionTitle}>🏃 주간 활동량</Text>
      <View style={styles.activityChart}>
        {activities.map((a, i) => {
          const maxDist = Math.max(...activities.map(x => x.totalDistanceKm));
          const barH = maxDist > 0 ? (a.totalDistanceKm / maxDist) * 100 : 0;
          const dayLabel = new Date(a.date).toLocaleDateString("ko-KR", { weekday: "short" });
          return (
            <View key={a.date} style={styles.activityBarCol}>
              <Text style={styles.activityBarValue}>{a.totalDistanceKm}</Text>
              <View style={[styles.activityBarFill, { height: Math.max(barH, 4) }]} />
              <Text style={styles.activityBarLabel}>{dayLabel}</Text>
            </View>
          );
        })}
      </View>

      <Text style={styles.sectionTitle}>📋 일별 상세</Text>
      {activities.slice().reverse().map(a => (
        <View key={a.date} style={styles.activityDayCard}>
          <Text style={styles.activityDayDate}>{a.date}</Text>
          <View style={styles.activityDayStats}>
            <View style={styles.activityDayStat}>
              <Text style={styles.activityDayValue}>{a.walkCount}회</Text>
              <Text style={styles.activityDayLabel}>산책</Text>
            </View>
            <View style={styles.activityDayStat}>
              <Text style={styles.activityDayValue}>{a.totalDistanceKm}km</Text>
              <Text style={styles.activityDayLabel}>거리</Text>
            </View>
            <View style={styles.activityDayStat}>
              <Text style={styles.activityDayValue}>{a.totalDurationMin}분</Text>
              <Text style={styles.activityDayLabel}>시간</Text>
            </View>
            <View style={styles.activityDayStat}>
              <Text style={styles.activityDayValue}>{a.avgSpeedKmh}km/h</Text>
              <Text style={styles.activityDayLabel}>속도</Text>
            </View>
          </View>
        </View>
      ))}
    </ScrollView>
  );

  // ===== 체중 탭 =====
  const renderWeight = () => (
    <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
      <Text style={styles.sectionTitle}>⚖️ 체중 기록</Text>

      {/* 체중 입력 */}
      <View style={styles.weightInputCard}>
        <Text style={styles.weightInputLabel}>오늘 체중 기록하기</Text>
        <View style={styles.weightInputRow}>
          <TextInput
            style={styles.weightInput}
            placeholder="체중 (kg)"
            placeholderTextColor="#999"
            value={newWeight}
            onChangeText={setNewWeight}
            keyboardType="decimal-pad"
            returnKeyType="done"
          />
          <Pressable
            style={({ pressed }) => [styles.weightAddBtn, pressed && { opacity: 0.7 }]}
            onPress={handleAddWeight}
          >
            <Text style={styles.weightAddText}>기록</Text>
          </Pressable>
        </View>
      </View>

      {/* 체중 차트 */}
      <View style={styles.weightChartLarge}>
        {weights.map((w, i) => {
          const maxW = Math.max(...weights.map(x => x.weight));
          const minW = Math.min(...weights.map(x => x.weight));
          const range = maxW - minW || 1;
          const height = ((w.weight - minW) / range) * 80 + 20;
          return (
            <View key={w.id} style={styles.weightBarLarge}>
              <Text style={styles.weightValueLarge}>{w.weight}kg</Text>
              <View style={[styles.weightBarFillLarge, { height }]} />
              <Text style={styles.weightDateLarge}>{w.date.slice(5)}</Text>
            </View>
          );
        })}
      </View>

      {/* 체중 기록 목록 */}
      <Text style={styles.sectionTitle}>📋 기록 히스토리</Text>
      {weights.slice().reverse().map((w, i) => {
        const prev = weights[weights.length - 1 - i - 1];
        const diff = prev ? w.weight - prev.weight : 0;
        return (
          <View key={w.id} style={styles.weightHistoryRow}>
            <Text style={styles.weightHistoryDate}>{w.date}</Text>
            <Text style={styles.weightHistoryValue}>{w.weight} kg</Text>
            {diff !== 0 && (
              <Text style={[styles.weightHistoryDiff, diff > 0 ? { color: "#E53935" } : { color: "#2E7D32" }]}>
                {diff > 0 ? "+" : ""}{diff.toFixed(1)}kg
              </Text>
            )}
          </View>
        );
      })}
    </ScrollView>
  );

  const renderContent = () => {
    switch (activeTab) {
      case "overview": return renderOverview();
      case "vaccine": return renderVaccine();
      case "medication": return renderMedication();
      case "activity": return renderActivity();
      case "weight": return renderWeight();
    }
  };

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={({ pressed }) => [pressed && { opacity: 0.6 }]}>
          <Text style={styles.backBtn}>← 뒤로</Text>
        </Pressable>
        <Text style={styles.headerTitle}>헬스 매니저</Text>
        <View style={{ width: 50 }} />
      </View>

      {/* 탭 */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabRow} contentContainerStyle={{ paddingHorizontal: 16 }}>
        {TABS.map(t => (
          <Pressable
            key={t.key}
            style={[styles.tabChip, activeTab === t.key && styles.tabChipActive]}
            onPress={() => setActiveTab(t.key)}
          >
            <Text style={styles.tabIcon}>{t.icon}</Text>
            <Text style={[styles.tabLabel, activeTab === t.key && styles.tabLabelActive]}>{t.label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <View style={styles.content}>
        {renderContent()}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12 },
  headerTitle: { fontFamily: Fonts.bold, fontSize: 18, color: "#1A1A1A" },
  backBtn: { fontFamily: Fonts.semiBold, fontSize: 16, color: "#2E7D32" },
  tabRow: { maxHeight: 44, marginBottom: 8 },
  tabChip: { flexDirection: "row", alignItems: "center", backgroundColor: "#F5F5F5", borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, marginRight: 8 },
  tabChipActive: { backgroundColor: "#2E7D32" },
  tabIcon: { fontSize: 14, marginRight: 4 },
  tabLabel: { fontFamily: Fonts.medium, fontSize: 13, color: "#666" },
  tabLabelActive: { color: "#FFF" },
  content: { flex: 1, paddingHorizontal: 16 },
  sectionTitle: { fontFamily: Fonts.bold, fontSize: 16, color: "#1A1A1A", marginTop: 16, marginBottom: 10 },
  // Tip
  tipCard: { backgroundColor: "#E8F5E9", borderRadius: 12, padding: 14, marginBottom: 12 },
  tipText: { fontFamily: Fonts.medium, fontSize: 13, color: "#2E7D32", lineHeight: 20 },
  // Score
  scoreCard: { backgroundColor: "#FFF", borderRadius: 16, padding: 20, alignItems: "center", borderWidth: 1, borderColor: "#F0F0F0", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  scoreEmoji: { fontSize: 40, marginBottom: 8 },
  scoreName: { fontFamily: Fonts.bold, fontSize: 18, color: "#1A1A1A", marginBottom: 16 },
  scoreGrid: { flexDirection: "row", alignItems: "center" },
  scoreItem: { alignItems: "center", flex: 1 },
  scoreValue: { fontFamily: Fonts.bold, fontSize: 22, color: "#2E7D32" },
  scoreLabel: { fontFamily: Fonts.regular, fontSize: 11, color: "#888", marginTop: 4 },
  scoreDivider: { width: 1, height: 30, backgroundColor: "#E0E0E0" },
  // Schedule
  scheduleCard: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#FFF", borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: "#F0F0F0" },
  scheduleUrgent: { borderColor: "#FFCDD2", backgroundColor: "#FFF5F5" },
  scheduleLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  scheduleIcon: { fontSize: 24 },
  scheduleName: { fontFamily: Fonts.semiBold, fontSize: 14, color: "#1A1A1A" },
  scheduleDate: { fontFamily: Fonts.regular, fontSize: 12, color: "#888" },
  dDayBadge: { backgroundColor: "#E8F5E9", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  dDayUrgent: { backgroundColor: "#FFEBEE" },
  dDayText: { fontFamily: Fonts.bold, fontSize: 13, color: "#2E7D32" },
  dDayTextUrgent: { color: "#E53935" },
  emptyNote: { fontFamily: Fonts.regular, fontSize: 13, color: "#999", textAlign: "center", paddingVertical: 16 },
  // Med card
  medCard: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#FFF", borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: "#F0F0F0" },
  medInfo: { flex: 1 },
  medName: { fontFamily: Fonts.semiBold, fontSize: 14, color: "#1A1A1A" },
  medDosage: { fontFamily: Fonts.regular, fontSize: 12, color: "#666", marginTop: 2 },
  medTime: { fontFamily: Fonts.regular, fontSize: 11, color: "#999", marginTop: 2 },
  medCheckBtn: { backgroundColor: "#2E7D32", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  medCheckText: { fontFamily: Fonts.semiBold, fontSize: 12, color: "#FFF" },
  medDone: { backgroundColor: "#E8F5E9", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  medDoneText: { fontFamily: Fonts.semiBold, fontSize: 12, color: "#2E7D32" },
  medPending: { backgroundColor: "#F5F5F5", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  medPendingText: { fontFamily: Fonts.medium, fontSize: 12, color: "#999" },
  // Activity summary
  activitySummary: { flexDirection: "row", backgroundColor: "#FFF", borderRadius: 14, padding: 16, borderWidth: 1, borderColor: "#F0F0F0" },
  activityItem: { flex: 1, alignItems: "center" },
  activityValue: { fontFamily: Fonts.bold, fontSize: 20, color: "#2E7D32" },
  activityLabel: { fontFamily: Fonts.regular, fontSize: 11, color: "#888", marginTop: 4 },
  // Weight chart
  weightChart: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-around", backgroundColor: "#FFF", borderRadius: 14, padding: 16, height: 140, borderWidth: 1, borderColor: "#F0F0F0" },
  weightBar: { alignItems: "center", width: 40 },
  weightValue: { fontFamily: Fonts.semiBold, fontSize: 11, color: "#2E7D32", marginBottom: 4 },
  weightBarFill: { width: 24, backgroundColor: "#A5D6A7", borderRadius: 6 },
  weightDate: { fontFamily: Fonts.regular, fontSize: 10, color: "#999", marginTop: 4 },
  // Vaccine
  vaccineCard: { backgroundColor: "#FFF", borderRadius: 14, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: "#F0F0F0" },
  vaccineHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  vaccineName: { fontFamily: Fonts.bold, fontSize: 16, color: "#1A1A1A" },
  vaccineCompleteBadge: { backgroundColor: "#E8F5E9", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  vaccineCompleteText: { fontFamily: Fonts.semiBold, fontSize: 11, color: "#2E7D32" },
  vaccinePendingBadge: { backgroundColor: "#FFF3E0", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  vaccinePendingText: { fontFamily: Fonts.semiBold, fontSize: 11, color: "#E65100" },
  vaccineDate: { fontFamily: Fonts.regular, fontSize: 13, color: "#666", marginBottom: 4 },
  vaccineHospital: { fontFamily: Fonts.regular, fontSize: 12, color: "#888", marginBottom: 6 },
  vaccineNext: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  vaccineNextLabel: { fontFamily: Fonts.medium, fontSize: 12, color: "#666" },
  vaccineNextDate: { fontFamily: Fonts.semiBold, fontSize: 13, color: "#2E7D32" },
  // Med detail
  adherenceCard: { backgroundColor: "#FFF", borderRadius: 14, padding: 16, alignItems: "center", borderWidth: 1, borderColor: "#F0F0F0", marginBottom: 8 },
  adherenceTitle: { fontFamily: Fonts.medium, fontSize: 13, color: "#666", marginBottom: 4 },
  adherenceValue: { fontFamily: Fonts.bold, fontSize: 32, color: "#2E7D32", marginBottom: 8 },
  adherenceBar: { width: "100%", height: 8, backgroundColor: "#E0E0E0", borderRadius: 4, overflow: "hidden" },
  adherenceBarFill: { height: 8, backgroundColor: "#2E7D32", borderRadius: 4 },
  medDetailCard: { backgroundColor: "#FFF", borderRadius: 14, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: "#F0F0F0" },
  medDetailHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  medDetailName: { fontFamily: Fonts.bold, fontSize: 15, color: "#1A1A1A" },
  medStatusBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  medActive: { backgroundColor: "#E8F5E9" },
  medInactive: { backgroundColor: "#F5F5F5" },
  medStatusText: { fontFamily: Fonts.semiBold, fontSize: 11, color: "#2E7D32" },
  medDetailInfo: { fontFamily: Fonts.regular, fontSize: 13, color: "#666", marginBottom: 4 },
  medDetailPeriod: { fontFamily: Fonts.regular, fontSize: 12, color: "#999", marginBottom: 10 },
  logTitle: { fontFamily: Fonts.semiBold, fontSize: 13, color: "#333", marginBottom: 6 },
  logRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: "#F5F5F5" },
  logDate: { fontFamily: Fonts.regular, fontSize: 13, color: "#666" },
  logTaken: { fontFamily: Fonts.semiBold, fontSize: 12, color: "#2E7D32" },
  logCheckBtn: { backgroundColor: "#FFC107", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  logCheckText: { fontFamily: Fonts.semiBold, fontSize: 11, color: "#333" },
  // Activity chart
  activityChart: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-around", backgroundColor: "#FFF", borderRadius: 14, padding: 16, height: 160, borderWidth: 1, borderColor: "#F0F0F0" },
  activityBarCol: { alignItems: "center", width: 36 },
  activityBarValue: { fontFamily: Fonts.semiBold, fontSize: 10, color: "#2E7D32", marginBottom: 4 },
  activityBarFill: { width: 20, backgroundColor: "#66BB6A", borderRadius: 4 },
  activityBarLabel: { fontFamily: Fonts.regular, fontSize: 10, color: "#999", marginTop: 4 },
  activityDayCard: { backgroundColor: "#FFF", borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: "#F0F0F0" },
  activityDayDate: { fontFamily: Fonts.semiBold, fontSize: 13, color: "#1A1A1A", marginBottom: 8 },
  activityDayStats: { flexDirection: "row" },
  activityDayStat: { flex: 1, alignItems: "center" },
  activityDayValue: { fontFamily: Fonts.bold, fontSize: 15, color: "#333" },
  activityDayLabel: { fontFamily: Fonts.regular, fontSize: 10, color: "#999", marginTop: 2 },
  // Weight
  weightInputCard: { backgroundColor: "#FFF", borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: "#F0F0F0" },
  weightInputLabel: { fontFamily: Fonts.semiBold, fontSize: 14, color: "#1A1A1A", marginBottom: 10 },
  weightInputRow: { flexDirection: "row", gap: 8 },
  weightInput: { flex: 1, backgroundColor: "#F5F5F5", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontFamily: Fonts.regular, fontSize: 14, color: "#1A1A1A" },
  weightAddBtn: { backgroundColor: "#2E7D32", borderRadius: 10, paddingHorizontal: 20, justifyContent: "center" },
  weightAddText: { fontFamily: Fonts.semiBold, fontSize: 14, color: "#FFF" },
  weightChartLarge: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-around", backgroundColor: "#FFF", borderRadius: 14, padding: 16, height: 160, borderWidth: 1, borderColor: "#F0F0F0", marginBottom: 12 },
  weightBarLarge: { alignItems: "center", width: 50 },
  weightValueLarge: { fontFamily: Fonts.semiBold, fontSize: 11, color: "#2E7D32", marginBottom: 4 },
  weightBarFillLarge: { width: 28, backgroundColor: "#81C784", borderRadius: 6 },
  weightDateLarge: { fontFamily: Fonts.regular, fontSize: 10, color: "#999", marginTop: 4 },
  weightHistoryRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#F5F5F5" },
  weightHistoryDate: { fontFamily: Fonts.regular, fontSize: 13, color: "#666", flex: 1 },
  weightHistoryValue: { fontFamily: Fonts.semiBold, fontSize: 14, color: "#1A1A1A", flex: 1, textAlign: "center" },
  weightHistoryDiff: { fontFamily: Fonts.semiBold, fontSize: 13, flex: 1, textAlign: "right" },
});
