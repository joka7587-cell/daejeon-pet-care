import React, { useState, useMemo, useCallback } from "react";
import {
  View, Text, ScrollView, Pressable, TextInput, Linking, Alert,
  StyleSheet, Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { Fonts } from "@/hooks/use-fonts";
import {
  WELFARE_POLICIES, DISTRICT_OFFICES,
  type WelfarePolicy, type EligibilityCondition,
} from "@/lib/solo-care-data";

type TabKey = "policies" | "eligibility" | "guide";

const TABS: { key: TabKey; label: string; icon: string }[] = [
  { key: "policies", label: "정책 목록", icon: "📋" },
  { key: "eligibility", label: "자격 진단", icon: "🔍" },
  { key: "guide", label: "신청 가이드", icon: "📝" },
];

// 자격 진단 입력 폼
interface EligibilityForm {
  householdType: "single" | "multi" | "";
  incomeLevel: "low" | "medium" | "high" | "";
  petCount: string;
  isRegistered: boolean;
  isNeutered: boolean;
  district: string;
  isDisabled: boolean;
  isSenior: boolean;
  isBasicLivelihood: boolean;
}

const INITIAL_FORM: EligibilityForm = {
  householdType: "",
  incomeLevel: "",
  petCount: "1",
  isRegistered: false,
  isNeutered: false,
  district: "",
  isDisabled: false,
  isSenior: false,
  isBasicLivelihood: false,
};

const DISTRICTS = ["유성구", "서구", "중구", "동구", "대덕구"];

export default function WelfarePolicyScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabKey>("policies");
  const [selectedPolicy, setSelectedPolicy] = useState<WelfarePolicy | null>(null);
  const [form, setForm] = useState<EligibilityForm>(INITIAL_FORM);
  const [diagnosisResult, setDiagnosisResult] = useState<{ policy: WelfarePolicy; eligible: boolean; reason: string }[] | null>(null);

  // 자격 진단 로직
  const runDiagnosis = useCallback(() => {
    if (!form.householdType || !form.incomeLevel || !form.district) {
      Alert.alert("입력 필요", "가구 형태, 소득 수준, 거주 구를 선택해주세요.");
      return;
    }

    const results = WELFARE_POLICIES.map(policy => {
      let eligible = true;
      let reasons: string[] = [];

      for (const cond of policy.eligibilityConditions) {
        switch (cond.type) {
          case "household":
            if (cond.value === "single" && form.householdType !== "single") {
              eligible = false;
              reasons.push("1인 가구만 해당");
            }
            break;
          case "income":
            if (cond.value === "low" && form.incomeLevel !== "low") {
              eligible = false;
              reasons.push("기초생활수급자/차상위 대상");
            }
            if (cond.value === "low_medium" && form.incomeLevel === "high") {
              eligible = false;
              reasons.push("중위소득 이하 대상");
            }
            break;
          case "registration":
            if (cond.required && !form.isRegistered) {
              eligible = false;
              reasons.push("동물등록 필수");
            }
            break;
          case "neutering":
            if (cond.required && !form.isNeutered) {
              eligible = false;
              reasons.push("중성화 필수");
            }
            break;
          case "disability":
            if (cond.required && !form.isDisabled) {
              eligible = false;
              reasons.push("장애인 대상");
            }
            break;
          case "senior":
            if (cond.required && !form.isSenior) {
              eligible = false;
              reasons.push("65세 이상 대상");
            }
            break;
          case "basicLivelihood":
            if (cond.required && !form.isBasicLivelihood) {
              eligible = false;
              reasons.push("기초생활수급자 대상");
            }
            break;
        }
      }

      return {
        policy,
        eligible,
        reason: eligible ? "수혜 대상입니다!" : reasons.join(", "),
      };
    });

    setDiagnosisResult(results);
    setActiveTab("eligibility");
  }, [form]);

  const handleOpenLink = useCallback((url: string) => {
    if (Platform.OS === "web") {
      window.open(url, "_blank");
    } else {
      Linking.openURL(url);
    }
  }, []);

  // ===== 정책 상세 =====
  if (selectedPolicy) {
    return (
      <ScreenContainer>
        <View style={styles.header}>
          <Pressable onPress={() => setSelectedPolicy(null)} style={({ pressed }) => [pressed && { opacity: 0.6 }]}>
            <Text style={styles.backBtn}>← 목록</Text>
          </Pressable>
          <Text style={styles.headerTitle} numberOfLines={1}>정책 상세</Text>
          <View style={{ width: 50 }} />
        </View>

        <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}>
          {/* 정책 헤더 */}
          <View style={styles.policyDetailHeader}>
            <View style={[styles.statusBadge, selectedPolicy.isActive ? styles.activeBadge : styles.inactiveBadge]}>
              <Text style={[styles.statusText, selectedPolicy.isActive ? styles.activeText : styles.inactiveText]}>
                {selectedPolicy.isActive ? "접수 중" : "마감"}
              </Text>
            </View>
            <Text style={styles.policyDetailTitle}>{selectedPolicy.title}</Text>
            <Text style={styles.policyDetailOrg}>{selectedPolicy.organization}</Text>
          </View>

          {/* 지원 내용 */}
          <View style={styles.detailSection}>
            <Text style={styles.detailSectionTitle}>💰 지원 내용</Text>
            <Text style={styles.detailText}>{selectedPolicy.supportDetail}</Text>
            <Text style={styles.detailAmount}>지원 금액: {selectedPolicy.supportAmount}</Text>
          </View>

          {/* 신청 기간 */}
          <View style={styles.detailSection}>
            <Text style={styles.detailSectionTitle}>📅 신청 기간</Text>
            <Text style={styles.detailText}>{selectedPolicy.applicationPeriod}</Text>
          </View>

          {/* 자격 요건 */}
          <View style={styles.detailSection}>
            <Text style={styles.detailSectionTitle}>✅ 자격 요건</Text>
            {selectedPolicy.eligibilityConditions.map((c, i) => (
              <View key={i} style={styles.conditionRow}>
                <Text style={styles.conditionDot}>•</Text>
                <Text style={styles.conditionText}>{c.description}</Text>
              </View>
            ))}
          </View>

          {/* 필수 서류 */}
          <View style={styles.detailSection}>
            <Text style={styles.detailSectionTitle}>📄 필수 제출 서류</Text>
            {selectedPolicy.requiredDocuments.map((doc, i) => (
              <View key={i} style={styles.docRow}>
                <Text style={styles.docNumber}>{i + 1}</Text>
                <Text style={styles.docText}>{doc}</Text>
              </View>
            ))}
          </View>

          {/* 신청 방법 */}
          <View style={styles.detailSection}>
            <Text style={styles.detailSectionTitle}>📝 신청 방법</Text>
            <Text style={styles.detailText}>{selectedPolicy.applicationMethod}</Text>
          </View>

          {/* 링크 */}
          {selectedPolicy.applicationUrl && (
            <Pressable
              style={({ pressed }) => [styles.applyBtn, pressed && { opacity: 0.7 }]}
              onPress={() => handleOpenLink(selectedPolicy.applicationUrl!)}
            >
              <Text style={styles.applyBtnText}>🔗 신청 페이지 바로가기</Text>
            </Pressable>
          )}

          {/* 문의 */}
          <View style={styles.contactSection}>
            <Text style={styles.contactTitle}>📞 문의처</Text>
            <Text style={styles.contactText}>{selectedPolicy.contactInfo}</Text>
          </View>
        </ScrollView>
      </ScreenContainer>
    );
  }

  // ===== 정책 목록 탭 =====
  const renderPolicies = () => (
    <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}>
      <View style={styles.microCopy}>
        <Text style={styles.microCopyText}>🏛️ 대전시 1인 가구 반려동물 지원 정책을 한눈에 확인하세요</Text>
      </View>

      {WELFARE_POLICIES.map(policy => (
        <Pressable
          key={policy.id}
          style={({ pressed }) => [styles.policyCard, pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }]}
          onPress={() => setSelectedPolicy(policy)}
        >
          <View style={styles.policyHeader}>
            <View style={[styles.statusBadge, policy.isActive ? styles.activeBadge : styles.inactiveBadge]}>
              <Text style={[styles.statusText, policy.isActive ? styles.activeText : styles.inactiveText]}>
                {policy.isActive ? "접수 중" : "마감"}
              </Text>
            </View>
            <Text style={styles.policyCategory}>{policy.category}</Text>
          </View>
          <Text style={styles.policyTitle}>{policy.title}</Text>
          <Text style={styles.policyOrg}>{policy.organization}</Text>
          <Text style={styles.policyAmount}>{policy.supportAmount}</Text>
          <Text style={styles.policyPeriod}>📅 {policy.applicationPeriod}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );

  // ===== 자격 진단 탭 =====
  const renderEligibility = () => (
    <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}>
      {!diagnosisResult ? (
        <>
          <View style={styles.microCopy}>
            <Text style={styles.microCopyText}>🔍 조건을 입력하면 수혜 가능한 정책을 즉시 판별합니다</Text>
          </View>

          {/* 가구 형태 */}
          <Text style={styles.formLabel}>가구 형태</Text>
          <View style={styles.optionRow}>
            {[
              { key: "single" as const, label: "1인 가구" },
              { key: "multi" as const, label: "다인 가구" },
            ].map(opt => (
              <Pressable
                key={opt.key}
                style={[styles.optionChip, form.householdType === opt.key && styles.optionChipActive]}
                onPress={() => setForm(p => ({ ...p, householdType: opt.key }))}
              >
                <Text style={[styles.optionText, form.householdType === opt.key && styles.optionTextActive]}>{opt.label}</Text>
              </Pressable>
            ))}
          </View>

          {/* 소득 수준 */}
          <Text style={styles.formLabel}>소득 수준</Text>
          <View style={styles.optionRow}>
            {[
              { key: "low" as const, label: "기초수급/차상위" },
              { key: "medium" as const, label: "중위소득 이하" },
              { key: "high" as const, label: "중위소득 초과" },
            ].map(opt => (
              <Pressable
                key={opt.key}
                style={[styles.optionChip, form.incomeLevel === opt.key && styles.optionChipActive]}
                onPress={() => setForm(p => ({ ...p, incomeLevel: opt.key }))}
              >
                <Text style={[styles.optionText, form.incomeLevel === opt.key && styles.optionTextActive]}>{opt.label}</Text>
              </Pressable>
            ))}
          </View>

          {/* 거주 구 */}
          <Text style={styles.formLabel}>거주 구</Text>
          <View style={styles.optionRow}>
            {DISTRICTS.map(d => (
              <Pressable
                key={d}
                style={[styles.optionChip, form.district === d && styles.optionChipActive]}
                onPress={() => setForm(p => ({ ...p, district: d }))}
              >
                <Text style={[styles.optionText, form.district === d && styles.optionTextActive]}>{d}</Text>
              </Pressable>
            ))}
          </View>

          {/* 체크박스 옵션 */}
          <Text style={styles.formLabel}>추가 조건</Text>
          {[
            { key: "isRegistered", label: "동물등록 완료" },
            { key: "isNeutered", label: "중성화 완료" },
            { key: "isDisabled", label: "장애인 가구" },
            { key: "isSenior", label: "65세 이상" },
            { key: "isBasicLivelihood", label: "기초생활수급자" },
          ].map(opt => (
            <Pressable
              key={opt.key}
              style={styles.checkRow}
              onPress={() => setForm(p => ({ ...p, [opt.key]: !(p as any)[opt.key] }))}
            >
              <View style={[styles.checkbox, (form as any)[opt.key] && styles.checkboxChecked]}>
                {(form as any)[opt.key] && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={styles.checkLabel}>{opt.label}</Text>
            </Pressable>
          ))}

          <Pressable
            style={({ pressed }) => [styles.diagnoseBtn, pressed && { opacity: 0.7 }]}
            onPress={runDiagnosis}
          >
            <Text style={styles.diagnoseBtnText}>🔍 자격 진단 시작</Text>
          </Pressable>
        </>
      ) : (
        <>
          <View style={styles.resultHeader}>
            <Text style={styles.resultTitle}>진단 결과</Text>
            <Pressable onPress={() => { setDiagnosisResult(null); setForm(INITIAL_FORM); }}>
              <Text style={styles.retryBtn}>다시 진단</Text>
            </Pressable>
          </View>

          {/* 수혜 가능 */}
          <Text style={styles.resultSubtitle}>✅ 수혜 가능한 정책</Text>
          {diagnosisResult.filter(r => r.eligible).length > 0 ? (
            diagnosisResult.filter(r => r.eligible).map(r => (
              <Pressable
                key={r.policy.id}
                style={({ pressed }) => [styles.resultCard, styles.resultEligible, pressed && { opacity: 0.85 }]}
                onPress={() => setSelectedPolicy(r.policy)}
              >
                <Text style={styles.resultCardTitle}>{r.policy.title}</Text>
                <Text style={styles.resultCardAmount}>{r.policy.supportAmount}</Text>
                <Text style={styles.resultCardReason}>✅ {r.reason}</Text>
              </Pressable>
            ))
          ) : (
            <Text style={styles.noResult}>현재 조건으로 수혜 가능한 정책이 없습니다</Text>
          )}

          {/* 수혜 불가 */}
          <Text style={styles.resultSubtitle}>❌ 조건 미충족</Text>
          {diagnosisResult.filter(r => !r.eligible).map(r => (
            <View key={r.policy.id} style={[styles.resultCard, styles.resultIneligible]}>
              <Text style={styles.resultCardTitleIneligible}>{r.policy.title}</Text>
              <Text style={styles.resultCardReasonIneligible}>❌ {r.reason}</Text>
            </View>
          ))}
        </>
      )}
    </ScrollView>
  );

  // ===== 신청 가이드 탭 =====
  const renderGuide = () => (
    <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}>
      <View style={styles.microCopy}>
        <Text style={styles.microCopyText}>📝 구청별 신청 방법과 필수 서류를 안내합니다</Text>
      </View>

      {DISTRICT_OFFICES.map(office => (
        <View key={office.district} style={styles.officeCard}>
          <Text style={styles.officeName}>🏛️ {office.district}청</Text>
          <Text style={styles.officeAddr}>{office.address}</Text>
          <Text style={styles.officePhone}>📞 {office.phone}</Text>
          <Text style={styles.officeDept}>담당: {office.petDeptPhone}</Text>

          <Pressable
            style={({ pressed }) => [styles.officeLink, pressed && { opacity: 0.7 }]}
            onPress={() => handleOpenLink(office.website)}
          >
            <Text style={styles.officeLinkText}>🔗 {office.district}청 홈페이지</Text>
          </Pressable>
        </View>
      ))}

      {/* 공통 필수 서류 */}
      <Text style={styles.sectionTitle}>📄 공통 필수 서류</Text>
      <View style={styles.docListCard}>
        {[
          "신분증 사본",
          "동물등록증 사본",
          "주민등록등본 (1인 가구 확인용)",
          "소득증명서 (해당 시)",
          "중성화 확인서 (해당 시)",
          "진료비 영수증 (의료비 지원 시)",
        ].map((doc, i) => (
          <View key={i} style={styles.docListRow}>
            <Text style={styles.docListNum}>{i + 1}</Text>
            <Text style={styles.docListText}>{doc}</Text>
          </View>
        ))}
      </View>

      {/* 신청 절차 */}
      <Text style={styles.sectionTitle}>📋 일반 신청 절차</Text>
      {[
        { step: 1, title: "자격 확인", desc: "위 자격 진단 탭에서 수혜 가능 여부를 먼저 확인하세요." },
        { step: 2, title: "서류 준비", desc: "필수 서류를 미리 준비합니다. 동물등록은 구청 방문 또는 온라인으로 가능합니다." },
        { step: 3, title: "신청서 작성", desc: "해당 구청 홈페이지 또는 방문하여 신청서를 작성합니다." },
        { step: 4, title: "접수 및 심사", desc: "서류 접수 후 약 2~4주간 심사가 진행됩니다." },
        { step: 5, title: "결과 통보", desc: "SMS 또는 우편으로 결과가 통보됩니다." },
      ].map(s => (
        <View key={s.step} style={styles.processCard}>
          <View style={styles.processNumber}>
            <Text style={styles.processNumberText}>{s.step}</Text>
          </View>
          <View style={styles.processContent}>
            <Text style={styles.processTitle}>{s.title}</Text>
            <Text style={styles.processDesc}>{s.desc}</Text>
          </View>
        </View>
      ))}
    </ScrollView>
  );

  const renderContent = () => {
    switch (activeTab) {
      case "policies": return renderPolicies();
      case "eligibility": return renderEligibility();
      case "guide": return renderGuide();
    }
  };

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={({ pressed }) => [pressed && { opacity: 0.6 }]}>
          <Text style={styles.backBtn}>← 뒤로</Text>
        </Pressable>
        <Text style={styles.headerTitle}>대전 복지 정책</Text>
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
  content: { flex: 1 },
  microCopy: { backgroundColor: "#E8F5E9", borderRadius: 12, padding: 12, marginBottom: 12 },
  microCopyText: { fontFamily: Fonts.medium, fontSize: 13, color: "#2E7D32", textAlign: "center" },
  sectionTitle: { fontFamily: Fonts.bold, fontSize: 16, color: "#1A1A1A", marginTop: 16, marginBottom: 10 },
  // Policy card
  policyCard: { backgroundColor: "#FFF", borderRadius: 14, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: "#F0F0F0", shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  policyHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  statusBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  activeBadge: { backgroundColor: "#E8F5E9" },
  inactiveBadge: { backgroundColor: "#F5F5F5" },
  statusText: { fontFamily: Fonts.semiBold, fontSize: 11 },
  activeText: { color: "#2E7D32" },
  inactiveText: { color: "#999" },
  policyCategory: { fontFamily: Fonts.medium, fontSize: 11, color: "#888" },
  policyTitle: { fontFamily: Fonts.bold, fontSize: 15, color: "#1A1A1A", marginBottom: 4 },
  policyOrg: { fontFamily: Fonts.regular, fontSize: 12, color: "#888", marginBottom: 4 },
  policyAmount: { fontFamily: Fonts.semiBold, fontSize: 14, color: "#2E7D32", marginBottom: 4 },
  policyPeriod: { fontFamily: Fonts.regular, fontSize: 12, color: "#666" },
  // Policy detail
  policyDetailHeader: { alignItems: "center", paddingVertical: 20 },
  policyDetailTitle: { fontFamily: Fonts.bold, fontSize: 20, color: "#1A1A1A", textAlign: "center", marginTop: 8 },
  policyDetailOrg: { fontFamily: Fonts.regular, fontSize: 13, color: "#888", marginTop: 4 },
  detailSection: { backgroundColor: "#FFF", borderRadius: 14, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: "#F0F0F0" },
  detailSectionTitle: { fontFamily: Fonts.bold, fontSize: 15, color: "#1A1A1A", marginBottom: 8 },
  detailText: { fontFamily: Fonts.regular, fontSize: 14, color: "#333", lineHeight: 22 },
  detailAmount: { fontFamily: Fonts.semiBold, fontSize: 15, color: "#2E7D32", marginTop: 8 },
  conditionRow: { flexDirection: "row", marginBottom: 4 },
  conditionDot: { fontFamily: Fonts.bold, fontSize: 14, color: "#2E7D32", marginRight: 8 },
  conditionText: { fontFamily: Fonts.regular, fontSize: 13, color: "#333", flex: 1, lineHeight: 20 },
  docRow: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  docNumber: { fontFamily: Fonts.bold, fontSize: 13, color: "#FFF", backgroundColor: "#2E7D32", width: 22, height: 22, borderRadius: 11, textAlign: "center", lineHeight: 22, marginRight: 10 },
  docText: { fontFamily: Fonts.regular, fontSize: 13, color: "#333", flex: 1 },
  applyBtn: { backgroundColor: "#2E7D32", borderRadius: 14, paddingVertical: 16, alignItems: "center", marginBottom: 12 },
  applyBtnText: { fontFamily: Fonts.bold, fontSize: 15, color: "#FFF" },
  contactSection: { backgroundColor: "#F5F5F5", borderRadius: 12, padding: 14, marginBottom: 20 },
  contactTitle: { fontFamily: Fonts.semiBold, fontSize: 13, color: "#333", marginBottom: 4 },
  contactText: { fontFamily: Fonts.regular, fontSize: 13, color: "#666" },
  // Eligibility form
  formLabel: { fontFamily: Fonts.semiBold, fontSize: 14, color: "#1A1A1A", marginTop: 14, marginBottom: 8 },
  optionRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  optionChip: { backgroundColor: "#F5F5F5", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: "#E0E0E0" },
  optionChipActive: { backgroundColor: "#E8F5E9", borderColor: "#2E7D32" },
  optionText: { fontFamily: Fonts.medium, fontSize: 13, color: "#666" },
  optionTextActive: { color: "#2E7D32" },
  checkRow: { flexDirection: "row", alignItems: "center", paddingVertical: 8 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: "#CCC", alignItems: "center", justifyContent: "center", marginRight: 10 },
  checkboxChecked: { backgroundColor: "#2E7D32", borderColor: "#2E7D32" },
  checkmark: { fontFamily: Fonts.bold, fontSize: 14, color: "#FFF" },
  checkLabel: { fontFamily: Fonts.regular, fontSize: 14, color: "#333" },
  diagnoseBtn: { backgroundColor: "#2E7D32", borderRadius: 14, paddingVertical: 16, alignItems: "center", marginTop: 20 },
  diagnoseBtnText: { fontFamily: Fonts.bold, fontSize: 16, color: "#FFF" },
  // Results
  resultHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  resultTitle: { fontFamily: Fonts.bold, fontSize: 18, color: "#1A1A1A" },
  retryBtn: { fontFamily: Fonts.semiBold, fontSize: 14, color: "#2E7D32" },
  resultSubtitle: { fontFamily: Fonts.semiBold, fontSize: 15, color: "#1A1A1A", marginTop: 12, marginBottom: 8 },
  resultCard: { borderRadius: 12, padding: 14, marginBottom: 8 },
  resultEligible: { backgroundColor: "#E8F5E9", borderWidth: 1, borderColor: "#A5D6A7" },
  resultIneligible: { backgroundColor: "#F5F5F5", borderWidth: 1, borderColor: "#E0E0E0" },
  resultCardTitle: { fontFamily: Fonts.bold, fontSize: 14, color: "#2E7D32" },
  resultCardTitleIneligible: { fontFamily: Fonts.semiBold, fontSize: 14, color: "#999" },
  resultCardAmount: { fontFamily: Fonts.semiBold, fontSize: 13, color: "#1B5E20", marginTop: 4 },
  resultCardReason: { fontFamily: Fonts.medium, fontSize: 12, color: "#2E7D32", marginTop: 4 },
  resultCardReasonIneligible: { fontFamily: Fonts.regular, fontSize: 12, color: "#999", marginTop: 4 },
  noResult: { fontFamily: Fonts.regular, fontSize: 13, color: "#999", textAlign: "center", paddingVertical: 16 },
  // Guide
  officeCard: { backgroundColor: "#FFF", borderRadius: 14, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: "#F0F0F0" },
  officeName: { fontFamily: Fonts.bold, fontSize: 16, color: "#1A1A1A", marginBottom: 6 },
  officeAddr: { fontFamily: Fonts.regular, fontSize: 13, color: "#666", marginBottom: 4 },
  officePhone: { fontFamily: Fonts.medium, fontSize: 13, color: "#333", marginBottom: 4 },
  officeDept: { fontFamily: Fonts.regular, fontSize: 12, color: "#888", marginBottom: 8 },
  officeLink: { backgroundColor: "#E3F2FD", borderRadius: 8, paddingVertical: 8, alignItems: "center" },
  officeLinkText: { fontFamily: Fonts.semiBold, fontSize: 13, color: "#1565C0" },
  docListCard: { backgroundColor: "#FFF", borderRadius: 14, padding: 16, borderWidth: 1, borderColor: "#F0F0F0" },
  docListRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  docListNum: { fontFamily: Fonts.bold, fontSize: 12, color: "#FFF", backgroundColor: "#2E7D32", width: 20, height: 20, borderRadius: 10, textAlign: "center", lineHeight: 20, marginRight: 10 },
  docListText: { fontFamily: Fonts.regular, fontSize: 13, color: "#333", flex: 1 },
  processCard: { flexDirection: "row", marginBottom: 12 },
  processNumber: { width: 28, height: 28, borderRadius: 14, backgroundColor: "#2E7D32", alignItems: "center", justifyContent: "center", marginRight: 12, marginTop: 2 },
  processNumberText: { fontFamily: Fonts.bold, fontSize: 14, color: "#FFF" },
  processContent: { flex: 1 },
  processTitle: { fontFamily: Fonts.semiBold, fontSize: 14, color: "#1A1A1A", marginBottom: 4 },
  processDesc: { fontFamily: Fonts.regular, fontSize: 13, color: "#666", lineHeight: 20 },
});
