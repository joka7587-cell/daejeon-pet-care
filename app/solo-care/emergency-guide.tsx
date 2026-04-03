import React, { useState, useCallback, useMemo } from "react";
import {
  View, Text, ScrollView, Pressable, Linking, Alert,
  StyleSheet, Platform, Dimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { Fonts } from "@/hooks/use-fonts";
import {
  EMERGENCY_GUIDES, EMERGENCY_HOSPITALS_24H,
  type EmergencyGuide, type EmergencyStep,
} from "@/lib/solo-care-data";

const { width: SCREEN_W } = Dimensions.get("window");

const SEVERITY_COLORS = {
  critical: { bg: "#FFEBEE", text: "#C62828", border: "#EF9A9A" },
  high: { bg: "#FFF3E0", text: "#E65100", border: "#FFCC80" },
  medium: { bg: "#FFF8E1", text: "#F57F17", border: "#FFE082" },
};

export default function EmergencyGuideScreen() {
  const router = useRouter();
  const [selectedGuide, setSelectedGuide] = useState<EmergencyGuide | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  const handleCallHospital = useCallback((phone: string, name: string) => {
    Alert.alert(
      "응급 전화 연결",
      `${name}에 전화를 연결합니다.`,
      [
        { text: "취소", style: "cancel" },
        {
          text: "전화 걸기",
          style: "destructive",
          onPress: () => {
            if (Platform.OS === "web") {
              Alert.alert("전화번호", phone);
            } else {
              Linking.openURL(`tel:${phone}`);
            }
          },
        },
      ]
    );
  }, []);

  const handleCallNearest = useCallback(() => {
    const nearest = EMERGENCY_HOSPITALS_24H[0];
    handleCallHospital(nearest.phone, nearest.name);
  }, [handleCallHospital]);

  const handleStepComplete = useCallback((stepIndex: number) => {
    setCompletedSteps(prev => {
      const next = new Set(prev);
      next.add(stepIndex);
      return next;
    });
    if (selectedGuide && stepIndex < selectedGuide.steps.length - 1) {
      setCurrentStep(stepIndex + 1);
    }
  }, [selectedGuide]);

  const resetGuide = useCallback(() => {
    setSelectedGuide(null);
    setCurrentStep(0);
    setCompletedSteps(new Set());
  }, []);

  // ===== 가이드 상세 화면 =====
  if (selectedGuide) {
    return (
      <ScreenContainer>
        <View style={styles.header}>
          <Pressable onPress={resetGuide} style={({ pressed }) => [pressed && { opacity: 0.6 }]}>
            <Text style={styles.backBtn}>← 목록</Text>
          </Pressable>
          <Text style={styles.headerTitle} numberOfLines={1}>{selectedGuide.title}</Text>
          <View style={{ width: 50 }} />
        </View>

        {/* 심각도 배너 */}
        <View style={[styles.severityBanner, { backgroundColor: SEVERITY_COLORS[selectedGuide.severity].bg }]}>
          <Text style={[styles.severityText, { color: SEVERITY_COLORS[selectedGuide.severity].text }]}>
            ⚠️ {selectedGuide.severity === "critical" ? "긴급" : selectedGuide.severity === "high" ? "주의" : "보통"} | {selectedGuide.description}
          </Text>
        </View>

        {/* 진행 바 */}
        <View style={styles.progressRow}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${((completedSteps.size) / selectedGuide.steps.length) * 100}%` as any }]} />
          </View>
          <Text style={styles.progressText}>{completedSteps.size}/{selectedGuide.steps.length}</Text>
        </View>

        <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
          {selectedGuide.steps.map((step, i) => {
            const isActive = i === currentStep;
            const isDone = completedSteps.has(i);
            return (
              <Pressable
                key={i}
                style={[
                  styles.stepCard,
                  isActive && styles.stepCardActive,
                  isDone && styles.stepCardDone,
                ]}
                onPress={() => setCurrentStep(i)}
              >
                {/* 단계 번호 */}
                <View style={[styles.stepNumber, isDone && styles.stepNumberDone, isActive && styles.stepNumberActive]}>
                  <Text style={[styles.stepNumberText, (isDone || isActive) && { color: "#FFF" }]}>
                    {isDone ? "✓" : i + 1}
                  </Text>
                </View>

                <View style={styles.stepContent}>
                  <Text style={[styles.stepTitle, isActive && styles.stepTitleActive]}>{step.title}</Text>
                  
                  {/* 일러스트 영역 */}
                  <View style={styles.illustrationBox}>
                    <Text style={styles.illustrationEmoji}>{step.illustration}</Text>
                  </View>

                  <Text style={styles.stepInstruction}>{step.instruction}</Text>

                  {/* 주의사항 */}
                  {step.warning && (
                    <View style={styles.warningBox}>
                      <Text style={styles.warningText}>⚠️ {step.warning}</Text>
                    </View>
                  )}

                  {/* 타이머 표시 */}
                  {step.timerSeconds && (
                    <View style={styles.timerBox}>
                      <Text style={styles.timerText}>⏱️ 약 {step.timerSeconds}초 동안 진행</Text>
                    </View>
                  )}

                  {/* 완료 버튼 */}
                  {isActive && !isDone && (
                    <Pressable
                      style={({ pressed }) => [styles.stepCompleteBtn, pressed && { opacity: 0.7, transform: [{ scale: 0.97 }] }]}
                      onPress={() => handleStepComplete(i)}
                    >
                      <Text style={styles.stepCompleteBtnText}>
                        {i < selectedGuide.steps.length - 1 ? "완료 → 다음 단계" : "모든 단계 완료"}
                      </Text>
                    </Pressable>
                  )}
                </View>
              </Pressable>
            );
          })}

          {/* 추가 팁 */}
          {selectedGuide.additionalTips && selectedGuide.additionalTips.length > 0 && (
            <View style={styles.tipsSection}>
              <Text style={styles.tipsTitle}>💡 추가 팁</Text>
              {selectedGuide.additionalTips.map((tip, i) => (
                <Text key={i} style={styles.tipItem}>• {tip}</Text>
              ))}
            </View>
          )}
        </ScrollView>

        {/* 플로팅 응급 전화 버튼 */}
        <View style={styles.floatingBtnContainer}>
          <Pressable
            style={({ pressed }) => [styles.floatingBtn, pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] }]}
            onPress={handleCallNearest}
          >
            <Text style={styles.floatingBtnText}>🚨 가장 가까운 24시 응급병원 전화</Text>
          </Pressable>
        </View>
      </ScreenContainer>
    );
  }

  // ===== 메인 목록 화면 =====
  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={({ pressed }) => [pressed && { opacity: 0.6 }]}>
          <Text style={styles.backBtn}>← 뒤로</Text>
        </Pressable>
        <Text style={styles.headerTitle}>응급처치 매뉴얼</Text>
        <View style={{ width: 50 }} />
      </View>

      {/* 긴급 안내 */}
      <View style={styles.emergencyBanner}>
        <Text style={styles.emergencyBannerTitle}>🚨 긴급 상황 발생 시</Text>
        <Text style={styles.emergencyBannerText}>당황하지 마세요. 아래 매뉴얼을 따라 침착하게 대응하세요.</Text>
        <Text style={styles.emergencyBannerSub}>1인 가구도 혼자서 충분히 대처할 수 있습니다.</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }}>
        {/* 24시 응급 병원 */}
        <Text style={styles.sectionTitle}>🏥 대전 24시 응급 동물병원</Text>
        {EMERGENCY_HOSPITALS_24H.map(h => (
          <Pressable
            key={h.id}
            style={({ pressed }) => [styles.hospitalCard, pressed && { opacity: 0.85 }]}
            onPress={() => handleCallHospital(h.phone, h.name)}
          >
            <View style={styles.hospitalInfo}>
              <Text style={styles.hospitalName}>{h.name}</Text>
              <Text style={styles.hospitalAddr}>{h.address}</Text>
              <Text style={styles.hospitalPhone}>📞 {h.phone}</Text>
            </View>
            <View style={styles.hospitalCallBtn}>
              <Text style={styles.hospitalCallText}>전화</Text>
            </View>
          </Pressable>
        ))}

        {/* 응급처치 가이드 목록 */}
        <Text style={styles.sectionTitle}>📖 상황별 응급처치 가이드</Text>
        <Text style={styles.sectionSub}>긴박한 상황에서도 한눈에 들어오도록 단계별로 안내합니다</Text>

        {EMERGENCY_GUIDES.map(guide => {
          const sevColor = SEVERITY_COLORS[guide.severity];
          return (
            <Pressable
              key={guide.id}
              style={({ pressed }) => [styles.guideCard, pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }]}
              onPress={() => { setSelectedGuide(guide); setCurrentStep(0); setCompletedSteps(new Set()); }}
            >
              <View style={styles.guideIconBox}>
                <Text style={styles.guideIcon}>{guide.icon}</Text>
              </View>
              <View style={styles.guideContent}>
                <View style={styles.guideTitleRow}>
                  <Text style={styles.guideTitle}>{guide.title}</Text>
                  <View style={[styles.severityBadge, { backgroundColor: sevColor.bg, borderColor: sevColor.border }]}>
                    <Text style={[styles.severityBadgeText, { color: sevColor.text }]}>
                      {guide.severity === "critical" ? "긴급" : guide.severity === "high" ? "주의" : "보통"}
                    </Text>
                  </View>
                </View>
                <Text style={styles.guideDesc} numberOfLines={2}>{guide.description}</Text>
                <Text style={styles.guideStepCount}>{guide.steps.length}단계 가이드</Text>
              </View>
              <Text style={styles.guideArrow}>›</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* 플로팅 응급 전화 버튼 */}
      <View style={styles.floatingBtnContainer}>
        <Pressable
          style={({ pressed }) => [styles.floatingBtn, pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] }]}
          onPress={handleCallNearest}
        >
          <Text style={styles.floatingBtnText}>🚨 24시 응급병원 즉시 전화</Text>
        </Pressable>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12 },
  headerTitle: { fontFamily: Fonts.bold, fontSize: 18, color: "#1A1A1A", flex: 1, textAlign: "center" },
  backBtn: { fontFamily: Fonts.semiBold, fontSize: 16, color: "#2E7D32" },
  // Emergency banner
  emergencyBanner: { backgroundColor: "#FFEBEE", marginHorizontal: 16, borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: "#FFCDD2" },
  emergencyBannerTitle: { fontFamily: Fonts.bold, fontSize: 16, color: "#C62828", marginBottom: 4 },
  emergencyBannerText: { fontFamily: Fonts.medium, fontSize: 13, color: "#D32F2F", lineHeight: 20 },
  emergencyBannerSub: { fontFamily: Fonts.regular, fontSize: 12, color: "#E57373", marginTop: 4 },
  sectionTitle: { fontFamily: Fonts.bold, fontSize: 16, color: "#1A1A1A", marginTop: 16, marginBottom: 8 },
  sectionSub: { fontFamily: Fonts.regular, fontSize: 12, color: "#999", marginBottom: 10 },
  // Hospital card
  hospitalCard: { flexDirection: "row", alignItems: "center", backgroundColor: "#FFF", borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: "#FFCDD2" },
  hospitalInfo: { flex: 1 },
  hospitalName: { fontFamily: Fonts.bold, fontSize: 14, color: "#C62828" },
  hospitalAddr: { fontFamily: Fonts.regular, fontSize: 12, color: "#888", marginTop: 2 },
  hospitalPhone: { fontFamily: Fonts.medium, fontSize: 13, color: "#333", marginTop: 4 },
  hospitalCallBtn: { backgroundColor: "#E53935", borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10 },
  hospitalCallText: { fontFamily: Fonts.bold, fontSize: 13, color: "#FFF" },
  // Guide card
  guideCard: { flexDirection: "row", alignItems: "center", backgroundColor: "#FFF", borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: "#F0F0F0", shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  guideIconBox: { width: 48, height: 48, borderRadius: 12, backgroundColor: "#FFF8E1", alignItems: "center", justifyContent: "center", marginRight: 12 },
  guideIcon: { fontSize: 24 },
  guideContent: { flex: 1 },
  guideTitleRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 },
  guideTitle: { fontFamily: Fonts.bold, fontSize: 15, color: "#1A1A1A", flex: 1 },
  severityBadge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1 },
  severityBadgeText: { fontFamily: Fonts.semiBold, fontSize: 10 },
  guideDesc: { fontFamily: Fonts.regular, fontSize: 12, color: "#666", lineHeight: 18, marginBottom: 4 },
  guideStepCount: { fontFamily: Fonts.medium, fontSize: 11, color: "#999" },
  guideArrow: { fontFamily: Fonts.bold, fontSize: 20, color: "#CCC", marginLeft: 8 },
  // Severity banner
  severityBanner: { marginHorizontal: 16, borderRadius: 10, padding: 12, marginBottom: 8 },
  severityText: { fontFamily: Fonts.semiBold, fontSize: 13, textAlign: "center" },
  // Progress
  progressRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, marginBottom: 12, gap: 8 },
  progressBar: { flex: 1, height: 6, backgroundColor: "#E0E0E0", borderRadius: 3, overflow: "hidden" },
  progressFill: { height: 6, backgroundColor: "#2E7D32", borderRadius: 3 },
  progressText: { fontFamily: Fonts.semiBold, fontSize: 12, color: "#666" },
  // Step card
  stepCard: { marginHorizontal: 16, marginBottom: 12, backgroundColor: "#FFF", borderRadius: 14, padding: 16, borderWidth: 1, borderColor: "#F0F0F0", flexDirection: "row" },
  stepCardActive: { borderColor: "#2E7D32", borderWidth: 2, backgroundColor: "#FAFFF9" },
  stepCardDone: { backgroundColor: "#F5FFF5", borderColor: "#C8E6C9" },
  stepNumber: { width: 32, height: 32, borderRadius: 16, backgroundColor: "#F0F0F0", alignItems: "center", justifyContent: "center", marginRight: 12, marginTop: 2 },
  stepNumberDone: { backgroundColor: "#2E7D32" },
  stepNumberActive: { backgroundColor: "#FF9800" },
  stepNumberText: { fontFamily: Fonts.bold, fontSize: 14, color: "#666" },
  stepContent: { flex: 1 },
  stepTitle: { fontFamily: Fonts.bold, fontSize: 15, color: "#1A1A1A", marginBottom: 8 },
  stepTitleActive: { color: "#2E7D32" },
  illustrationBox: { backgroundColor: "#FFF8E1", borderRadius: 12, padding: 16, alignItems: "center", marginBottom: 10 },
  illustrationEmoji: { fontSize: 48 },
  stepInstruction: { fontFamily: Fonts.regular, fontSize: 14, color: "#333", lineHeight: 22, marginBottom: 8 },
  warningBox: { backgroundColor: "#FFF3E0", borderRadius: 8, padding: 10, marginBottom: 8 },
  warningText: { fontFamily: Fonts.medium, fontSize: 12, color: "#E65100", lineHeight: 18 },
  timerBox: { backgroundColor: "#E3F2FD", borderRadius: 8, padding: 8, marginBottom: 8 },
  timerText: { fontFamily: Fonts.medium, fontSize: 12, color: "#1565C0" },
  stepCompleteBtn: { backgroundColor: "#2E7D32", borderRadius: 10, paddingVertical: 12, alignItems: "center", marginTop: 4 },
  stepCompleteBtnText: { fontFamily: Fonts.bold, fontSize: 14, color: "#FFF" },
  // Tips
  tipsSection: { marginHorizontal: 16, marginTop: 16, backgroundColor: "#F5F5F5", borderRadius: 12, padding: 16 },
  tipsTitle: { fontFamily: Fonts.bold, fontSize: 14, color: "#333", marginBottom: 8 },
  tipItem: { fontFamily: Fonts.regular, fontSize: 13, color: "#666", lineHeight: 20, marginBottom: 4 },
  // Floating button
  floatingBtnContainer: { position: "absolute", bottom: 0, left: 0, right: 0, paddingHorizontal: 16, paddingBottom: 24, paddingTop: 8, backgroundColor: "rgba(255,255,255,0.95)" },
  floatingBtn: { backgroundColor: "#E53935", borderRadius: 14, paddingVertical: 16, alignItems: "center", shadowColor: "#E53935", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  floatingBtnText: { fontFamily: Fonts.bold, fontSize: 16, color: "#FFF" },
});
