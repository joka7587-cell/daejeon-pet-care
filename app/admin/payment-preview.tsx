/**
 * 관리자 전용 결제 시스템 프리뷰
 * Phase 67: 도그워커 이용료/산책 패키지 결제 시뮬레이션
 * - 대전사랑카드(지역화폐) 최대 7% 캐시백 배너
 * - 결제 수단 선택 (카드/대전사랑카드/간편결제)
 * - 결제 완료 팝업 시뮬레이션
 */
import React, { useState, useCallback, useMemo } from "react";
import {
  View, Text, ScrollView, Pressable, StyleSheet, Modal,
  Platform, Dimensions, Alert,
} from "react-native";
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withSequence,
  withDelay, runOnJS, Easing,
} from "react-native-reanimated";
import { ScreenContainer } from "@/components/screen-container";
import { useRouter } from "expo-router";
import { Fonts } from "@/hooks/use-fonts";
import * as Haptics from "expo-haptics";

const { width: SW } = Dimensions.get("window");
const accent = "#2E7D32";
const bg = "#F8F8F8";
const border = "#E8E8E8";
const textP = "#1A1A1A";
const textS = "#8E8E93";

const haptic = () => {
  if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
};
const hapticSuccess = () => {
  if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
};

// ─── 결제 항목 데이터 ───
interface PaymentItem {
  id: string;
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  icon: string;
  tag?: string;
  tagColor?: string;
}

const PAYMENT_ITEMS: PaymentItem[] = [
  {
    id: "walk_basic",
    name: "기본 산책 서비스",
    description: "30분 기본 산책 · 도그워커 1:1 매칭",
    price: 15000,
    icon: "🐕",
  },
  {
    id: "walk_premium",
    name: "프리미엄 산책 서비스",
    description: "60분 산책 · 사진/영상 리포트 포함",
    price: 25000,
    icon: "🌟",
    tag: "인기",
    tagColor: "#FF6B35",
  },
  {
    id: "package_weekly",
    name: "주간 산책 패키지 (5회)",
    description: "주 5회 기본 산책 · 15% 할인 적용",
    price: 63750,
    originalPrice: 75000,
    icon: "📦",
    tag: "추천",
    tagColor: accent,
  },
  {
    id: "package_monthly",
    name: "월간 산책 패키지 (20회)",
    description: "월 20회 기본 산책 · 25% 할인 적용",
    price: 225000,
    originalPrice: 300000,
    icon: "🗓️",
    tag: "최저가",
    tagColor: "#3B82F6",
  },
  {
    id: "care_daycare",
    name: "반려견 데이케어 (1일)",
    description: "오전 9시~오후 6시 · 놀이/산책 포함",
    price: 35000,
    icon: "🏠",
  },
  {
    id: "care_grooming",
    name: "미용 + 산책 패키지",
    description: "기본 미용 + 30분 산책 세트",
    price: 45000,
    originalPrice: 55000,
    icon: "✂️",
    tag: "세트할인",
    tagColor: "#A855F7",
  },
];

// ─── 결제 수단 ───
interface PaymentMethod {
  id: string;
  name: string;
  icon: string;
  description: string;
  discount?: string;
  isRecommended?: boolean;
}

const PAYMENT_METHODS: PaymentMethod[] = [
  {
    id: "daejeon_card",
    name: "대전사랑카드",
    icon: "💳",
    description: "지역화폐 · 최대 7% 캐시백",
    discount: "7% 캐시백",
    isRecommended: true,
  },
  {
    id: "credit_card",
    name: "신용/체크카드",
    icon: "💳",
    description: "국내 모든 카드 결제 가능",
  },
  {
    id: "kakao_pay",
    name: "카카오페이",
    icon: "🟡",
    description: "간편결제 · 포인트 적립",
  },
  {
    id: "naver_pay",
    name: "네이버페이",
    icon: "🟢",
    description: "간편결제 · 네이버 포인트 적립",
  },
  {
    id: "toss_pay",
    name: "토스페이",
    icon: "🔵",
    description: "간편결제 · 토스 포인트 적립",
  },
];

export default function PaymentPreviewScreen() {
  const router = useRouter();
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set(["walk_basic"]));
  const [selectedMethod, setSelectedMethod] = useState<string>("daejeon_card");
  const [showConfirm, setShowConfirm] = useState(false);
  const [showComplete, setShowComplete] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // 애니메이션
  const checkScale = useSharedValue(0);
  const checkOpacity = useSharedValue(0);
  const checkAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
    opacity: checkOpacity.value,
  }));

  // 선택 항목 토글
  const toggleItem = useCallback((id: string) => {
    haptic();
    setSelectedItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // 총 금액 계산
  const { totalPrice, totalOriginal, discount, cashback } = useMemo(() => {
    let total = 0;
    let original = 0;
    PAYMENT_ITEMS.forEach(item => {
      if (selectedItems.has(item.id)) {
        total += item.price;
        original += item.originalPrice || item.price;
      }
    });
    const disc = original - total;
    const cb = selectedMethod === "daejeon_card" ? Math.floor(total * 0.07) : 0;
    return { totalPrice: total, totalOriginal: original, discount: disc, cashback: cb };
  }, [selectedItems, selectedMethod]);

  // 결제 시뮬레이션
  const handlePayment = useCallback(() => {
    if (selectedItems.size === 0) {
      Alert.alert("알림", "결제할 항목을 선택해주세요.");
      return;
    }
    haptic();
    setShowConfirm(true);
  }, [selectedItems]);

  const processPayment = useCallback(() => {
    setShowConfirm(false);
    setIsProcessing(true);

    // 2초 결제 처리 시뮬레이션
    setTimeout(() => {
      setIsProcessing(false);
      hapticSuccess();
      checkScale.value = withSequence(
        withTiming(0, { duration: 0 }),
        withTiming(1.2, { duration: 300, easing: Easing.out(Easing.back(2)) }),
        withTiming(1, { duration: 150 }),
      );
      checkOpacity.value = withTiming(1, { duration: 200 });
      setShowComplete(true);
    }, 2000);
  }, []);

  const closeComplete = useCallback(() => {
    setShowComplete(false);
    checkScale.value = 0;
    checkOpacity.value = 0;
  }, []);

  const selectedMethodInfo = PAYMENT_METHODS.find(m => m.id === selectedMethod);

  return (
    <ScreenContainer>
      <View style={styles.container}>
        {/* 헤더 */}
        <View style={styles.header}>
          <Pressable onPress={() => { haptic(); router.back(); }} style={({ pressed }) => [pressed && { opacity: 0.6 }]}>
            <Text style={styles.backBtn}>← 뒤로</Text>
          </Pressable>
          <Text style={styles.headerTitle}>결제 시스템 프리뷰</Text>
          <View style={styles.previewBadge}>
            <Text style={styles.previewBadgeText}>DEMO</Text>
          </View>
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          {/* 상단 타이틀 영역 */}
          <View style={styles.heroSection}>
            <Text style={styles.heroIcon}>🔒</Text>
            <Text style={styles.heroTitle}>안심하고 결제하세요</Text>
            <Text style={styles.heroSub}>SSL 암호화 및 대전사랑카드 인증 결제</Text>
          </View>

          {/* 대전사랑카드 배너 */}
          <View style={styles.daejeonBanner}>
            <View style={styles.bannerIconRow}>
              <Text style={styles.bannerIcon}>🎉</Text>
              <View style={styles.bannerBadge}>
                <Text style={styles.bannerBadgeText}>대전 Only</Text>
              </View>
            </View>
            <Text style={styles.bannerTitle}>대전사랑카드(지역화폐) 결제 시</Text>
            <Text style={styles.bannerHighlight}>최대 7% 캐시백 및 추가 할인 적용</Text>
            <Text style={styles.bannerSub}>
              대전 지역 경제 활성화에 기여하고, 더 많은 혜택을 받으세요!
            </Text>
          </View>

          {/* 결제 항목 선택 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🐾 서비스 선택</Text>
            <Text style={styles.sectionSub}>결제할 서비스를 선택해주세요 (복수 선택 가능)</Text>

            {PAYMENT_ITEMS.map(item => {
              const isSelected = selectedItems.has(item.id);
              return (
                <Pressable
                  key={item.id}
                  style={[styles.itemCard, isSelected && styles.itemCardSelected]}
                  onPress={() => toggleItem(item.id)}
                >
                  <View style={styles.itemLeft}>
                    <View style={[styles.checkbox, isSelected && styles.checkboxChecked]}>
                      {isSelected && <Text style={styles.checkmark}>✓</Text>}
                    </View>
                    <Text style={styles.itemIcon}>{item.icon}</Text>
                    <View style={styles.itemInfo}>
                      <View style={styles.itemNameRow}>
                        <Text style={[styles.itemName, isSelected && styles.itemNameSelected]}>{item.name}</Text>
                        {item.tag && (
                          <View style={[styles.itemTag, { backgroundColor: (item.tagColor || accent) + "20" }]}>
                            <Text style={[styles.itemTagText, { color: item.tagColor || accent }]}>{item.tag}</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.itemDesc}>{item.description}</Text>
                    </View>
                  </View>
                  <View style={styles.itemRight}>
                    {item.originalPrice && (
                      <Text style={styles.itemOriginalPrice}>
                        {item.originalPrice.toLocaleString()}원
                      </Text>
                    )}
                    <Text style={[styles.itemPrice, isSelected && styles.itemPriceSelected]}>
                      {item.price.toLocaleString()}원
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>

          {/* 결제 수단 선택 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>💳 결제 수단</Text>

            {PAYMENT_METHODS.map(method => {
              const isSelected = selectedMethod === method.id;
              return (
                <Pressable
                  key={method.id}
                  style={[styles.methodCard, isSelected && styles.methodCardSelected]}
                  onPress={() => { haptic(); setSelectedMethod(method.id); }}
                >
                  <View style={[styles.radio, isSelected && styles.radioSelected]}>
                    {isSelected && <View style={styles.radioInner} />}
                  </View>
                  <Text style={styles.methodIcon}>{method.icon}</Text>
                  <View style={styles.methodInfo}>
                    <View style={styles.methodNameRow}>
                      <Text style={[styles.methodName, isSelected && styles.methodNameSelected]}>{method.name}</Text>
                      {method.isRecommended && (
                        <View style={styles.recommendBadge}>
                          <Text style={styles.recommendBadgeText}>추천</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.methodDesc}>{method.description}</Text>
                  </View>
                  {method.discount && (
                    <View style={styles.discountBadge}>
                      <Text style={styles.discountBadgeText}>{method.discount}</Text>
                    </View>
                  )}
                </Pressable>
              );
            })}

            {/* 대전사랑카드 선택 시 추가 안내 */}
            {selectedMethod === "daejeon_card" && (
              <View style={styles.daejeonInfo}>
                <Text style={styles.daejeonInfoIcon}>ℹ️</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.daejeonInfoTitle}>대전사랑카드 혜택 안내</Text>
                  <Text style={styles.daejeonInfoText}>• 결제 금액의 최대 7% 캐시백 적립</Text>
                  <Text style={styles.daejeonInfoText}>• 대전 지역 가맹점 추가 할인 연계</Text>
                  <Text style={styles.daejeonInfoText}>• 월 최대 5만원 캐시백 한도</Text>
                </View>
              </View>
            )}
          </View>

          {/* 결제 요약 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📋 결제 요약</Text>
            <View style={[styles.summaryCard, { borderWidth: 2, borderColor: accent + '30' }]}>
              {PAYMENT_ITEMS.filter(i => selectedItems.has(i.id)).map(item => (
                <View key={item.id} style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>{item.icon} {item.name}</Text>
                  <Text style={styles.summaryValue}>{item.price.toLocaleString()}원</Text>
                </View>
              ))}
              {selectedItems.size === 0 && (
                <Text style={styles.summaryEmpty}>선택된 항목이 없습니다</Text>
              )}
              <View style={styles.summaryDivider} />
              {discount > 0 && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>📉 패키지 할인</Text>
                  <Text style={[styles.summaryValue, { color: "#EF4444" }]}>-{discount.toLocaleString()}원</Text>
                </View>
              )}
              {cashback > 0 && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>🎁 대전사랑카드 캐시백 (7%)</Text>
                  <Text style={[styles.summaryValue, { color: accent }]}>-{cashback.toLocaleString()}원</Text>
                </View>
              )}
              <View style={styles.summaryDivider} />
              <View style={styles.summaryRow}>
                <Text style={styles.summaryTotal}>최종 결제 금액</Text>
                <Text style={styles.summaryTotalValue}>
                  {Math.max(0, totalPrice - cashback).toLocaleString()}원
                </Text>
              </View>
            </View>
            {/* 결제 버튼 - 요약 바로 아래 배치 */}
            <View style={styles.inlinePaySection}>
              <View style={styles.inlinePayInfo}>
                <Text style={styles.inlinePayLabel}>최종 결제 금액</Text>
                <Text style={styles.inlinePayPrice}>
                  {Math.max(0, totalPrice - cashback).toLocaleString()}원
                </Text>
              </View>
              <Pressable
                style={[styles.inlinePayButton, selectedItems.size === 0 && styles.payButtonDisabled]}
                onPress={handlePayment}
                disabled={selectedItems.size === 0}
              >
                <Text style={styles.inlinePayButtonText}>
                  {selectedItems.size > 0 ? `${selectedItems.size}건 결제하기` : "항목을 선택하세요"}
                </Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>

        {/* 결제 확인 모달 */}
        <Modal visible={showConfirm} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.confirmModal}>
              <Text style={styles.confirmTitle}>결제 확인</Text>
              <View style={styles.confirmDetails}>
                <View style={styles.confirmRow}>
                  <Text style={styles.confirmLabel}>결제 수단</Text>
                  <Text style={styles.confirmValue}>{selectedMethodInfo?.icon} {selectedMethodInfo?.name}</Text>
                </View>
                <View style={styles.confirmRow}>
                  <Text style={styles.confirmLabel}>결제 항목</Text>
                  <Text style={styles.confirmValue}>{selectedItems.size}건</Text>
                </View>
                <View style={styles.confirmRow}>
                  <Text style={styles.confirmLabel}>결제 금액</Text>
                  <Text style={[styles.confirmValue, { fontFamily: Fonts.bold, color: accent }]}>
                    {Math.max(0, totalPrice - cashback).toLocaleString()}원
                  </Text>
                </View>
                {cashback > 0 && (
                  <View style={styles.confirmCashback}>
                    <Text style={styles.confirmCashbackText}>
                      🎁 대전사랑카드 캐시백 {cashback.toLocaleString()}원 적립 예정
                    </Text>
                  </View>
                )}
              </View>
              <Text style={styles.confirmNotice}>
                ※ 시연용 결제 시뮬레이션입니다. 실제 결제가 이루어지지 않습니다.
              </Text>
              <View style={styles.confirmButtons}>
                <Pressable
                  style={[styles.confirmCancelBtn]}
                  onPress={() => { haptic(); setShowConfirm(false); }}
                >
                  <Text style={styles.confirmCancelText}>취소</Text>
                </Pressable>
                <Pressable
                  style={[styles.confirmPayBtn]}
                  onPress={() => { haptic(); processPayment(); }}
                >
                  <Text style={styles.confirmPayText}>결제하기</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>

        {/* 결제 처리 중 오버레이 */}
        {isProcessing && (
          <View style={styles.processingOverlay}>
            <View style={styles.processingCard}>
              <Text style={styles.processingIcon}>💳</Text>
              <Text style={styles.processingTitle}>결제 처리 중...</Text>
              <Text style={styles.processingSub}>잠시만 기다려주세요</Text>
              <View style={styles.processingBar}>
                <View style={styles.processingBarFill} />
              </View>
            </View>
          </View>
        )}

        {/* 결제 완료 모달 */}
        <Modal visible={showComplete} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.completeModal}>
              <Animated.View style={[styles.completeCheckCircle, checkAnimStyle]}>
                <Text style={styles.completeCheck}>✓</Text>
              </Animated.View>
              <Text style={styles.completeTitle}>결제 완료!</Text>
              <Text style={styles.completeSub}>
                {selectedMethodInfo?.name}로 결제가 완료되었습니다
              </Text>
              <View style={styles.completeDetails}>
                <View style={styles.completeRow}>
                  <Text style={styles.completeLabel}>결제 금액</Text>
                  <Text style={styles.completeValue}>
                    {Math.max(0, totalPrice - cashback).toLocaleString()}원
                  </Text>
                </View>
                <View style={styles.completeRow}>
                  <Text style={styles.completeLabel}>결제 일시</Text>
                  <Text style={styles.completeValue}>
                    {new Date().toLocaleString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}
                  </Text>
                </View>
                <View style={styles.completeRow}>
                  <Text style={styles.completeLabel}>주문 번호</Text>
                  <Text style={styles.completeValue}>
                    PET-{Date.now().toString().slice(-8)}
                  </Text>
                </View>
                {cashback > 0 && (
                  <View style={styles.completeCashback}>
                    <Text style={styles.completeCashbackText}>
                      🎁 대전사랑카드 캐시백 {cashback.toLocaleString()}원이 적립되었습니다!
                    </Text>
                  </View>
                )}
              </View>
              <Text style={styles.completeNotice}>
                ※ 시연용 결제 시뮬레이션입니다
              </Text>
              <Pressable
                style={styles.completeBtn}
                onPress={() => { haptic(); closeComplete(); }}
              >
                <Text style={styles.completeBtnText}>확인</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: bg },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 12, backgroundColor: "#FFF",
    borderBottomWidth: 1, borderBottomColor: border,
  },
  backBtn: { fontFamily: Fonts.semiBold, fontSize: 16, color: accent },
  headerTitle: { fontFamily: Fonts.bold, fontSize: 18, color: textP },
  previewBadge: { backgroundColor: "#FF6B35", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  previewBadgeText: { fontFamily: Fonts.bold, fontSize: 11, color: "#FFF" },
  scrollView: { flex: 1 },

  // 상단 타이틀 영역
  heroSection: {
    alignItems: "center", paddingVertical: 20, paddingHorizontal: 16,
    backgroundColor: "#FFF", marginHorizontal: 16, marginTop: 16,
    borderRadius: 16, borderWidth: 1, borderColor: border,
  },
  heroIcon: { fontSize: 40, marginBottom: 8 },
  heroTitle: { fontFamily: Fonts.bold, fontSize: 20, color: textP, marginBottom: 4 },
  heroSub: { fontFamily: Fonts.regular, fontSize: 13, color: textS },

  // 대전사랑카드 배너
  daejeonBanner: {
    marginHorizontal: 16, marginTop: 16, padding: 20, borderRadius: 16,
    backgroundColor: "#FFF8E1", borderWidth: 2, borderColor: "#FFD54F",
  },
  bannerIconRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  bannerIcon: { fontSize: 28 },
  bannerBadge: { backgroundColor: "#FF6B35", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  bannerBadgeText: { fontFamily: Fonts.bold, fontSize: 10, color: "#FFF" },
  bannerTitle: { fontFamily: Fonts.semiBold, fontSize: 14, color: "#F57F17", marginBottom: 4 },
  bannerHighlight: { fontFamily: Fonts.extraBold, fontSize: 18, color: "#E65100", marginBottom: 8 },
  bannerSub: { fontFamily: Fonts.regular, fontSize: 12, color: "#795548", lineHeight: 18 },

  // 섹션
  section: { marginTop: 20, paddingHorizontal: 16 },
  sectionTitle: { fontFamily: Fonts.bold, fontSize: 17, color: textP, marginBottom: 4 },
  sectionSub: { fontFamily: Fonts.regular, fontSize: 12, color: textS, marginBottom: 12 },

  // 결제 항목 카드
  itemCard: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: "#FFF", borderRadius: 14, padding: 14, marginBottom: 8,
    borderWidth: 1.5, borderColor: border,
  },
  itemCardSelected: { borderColor: accent, backgroundColor: accent + "08" },
  itemLeft: { flexDirection: "row", alignItems: "center", flex: 1, marginRight: 8 },
  checkbox: {
    width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: "#CCC",
    alignItems: "center", justifyContent: "center", marginRight: 10,
  },
  checkboxChecked: { backgroundColor: accent, borderColor: accent },
  checkmark: { fontSize: 13, color: "#FFF", fontWeight: "700" },
  itemIcon: { fontSize: 24, marginRight: 10 },
  itemInfo: { flex: 1 },
  itemNameRow: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
  itemName: { fontFamily: Fonts.semiBold, fontSize: 14, color: textP },
  itemNameSelected: { color: accent },
  itemTag: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  itemTagText: { fontFamily: Fonts.bold, fontSize: 10 },
  itemDesc: { fontFamily: Fonts.regular, fontSize: 11, color: textS, marginTop: 2 },
  itemRight: { alignItems: "flex-end" },
  itemOriginalPrice: {
    fontFamily: Fonts.regular, fontSize: 11, color: "#CCC",
    textDecorationLine: "line-through", marginBottom: 2,
  },
  itemPrice: { fontFamily: Fonts.bold, fontSize: 15, color: textP },
  itemPriceSelected: { color: accent },

  // 결제 수단
  methodCard: {
    flexDirection: "row", alignItems: "center", backgroundColor: "#FFF",
    borderRadius: 14, padding: 14, marginBottom: 8,
    borderWidth: 1.5, borderColor: border,
  },
  methodCardSelected: { borderColor: accent, backgroundColor: accent + "08" },
  radio: {
    width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: "#CCC",
    alignItems: "center", justifyContent: "center", marginRight: 10,
  },
  radioSelected: { borderColor: accent },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: accent },
  methodIcon: { fontSize: 22, marginRight: 10 },
  methodInfo: { flex: 1 },
  methodNameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  methodName: { fontFamily: Fonts.semiBold, fontSize: 14, color: textP },
  methodNameSelected: { color: accent },
  recommendBadge: { backgroundColor: accent, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  recommendBadgeText: { fontFamily: Fonts.bold, fontSize: 9, color: "#FFF" },
  methodDesc: { fontFamily: Fonts.regular, fontSize: 11, color: textS, marginTop: 2 },
  discountBadge: { backgroundColor: "#FFF3E0", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  discountBadgeText: { fontFamily: Fonts.bold, fontSize: 11, color: "#E65100" },

  // 대전사랑카드 추가 안내
  daejeonInfo: {
    flexDirection: "row", backgroundColor: "#E8F5E9", borderRadius: 12,
    padding: 14, marginTop: 4, gap: 10,
  },
  daejeonInfoIcon: { fontSize: 18 },
  daejeonInfoTitle: { fontFamily: Fonts.semiBold, fontSize: 13, color: accent, marginBottom: 4 },
  daejeonInfoText: { fontFamily: Fonts.regular, fontSize: 11, color: "#2E7D32", lineHeight: 18 },

  // 결제 요약
  summaryCard: {
    backgroundColor: "#FFF", borderRadius: 16, padding: 16, marginTop: 8,
    borderWidth: 1, borderColor: border,
  },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  summaryLabel: { fontFamily: Fonts.medium, fontSize: 13, color: textS },
  summaryValue: { fontFamily: Fonts.semiBold, fontSize: 13, color: textP },
  summaryEmpty: { fontFamily: Fonts.regular, fontSize: 13, color: textS, textAlign: "center", paddingVertical: 12 },
  summaryDivider: { height: 1, backgroundColor: border, marginVertical: 8 },
  summaryTotal: { fontFamily: Fonts.bold, fontSize: 16, color: textP },
  summaryTotalValue: { fontFamily: Fonts.extraBold, fontSize: 20, color: accent },

  // 인라인 결제 버튼 (요약 카드 내부)
  inlinePaySection: {
    marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: border,
    alignItems: "center",
  },
  inlinePayInfo: { alignItems: "center", marginBottom: 12 },
  inlinePayLabel: { fontFamily: Fonts.medium, fontSize: 13, color: textS, marginBottom: 4 },
  inlinePayPrice: { fontFamily: Fonts.extraBold, fontSize: 28, color: accent },
  inlinePayButton: {
    backgroundColor: accent, borderRadius: 16, paddingHorizontal: 48, paddingVertical: 16,
    width: "100%", alignItems: "center",
  },
  inlinePayButtonText: { fontFamily: Fonts.bold, fontSize: 17, color: "#FFF" },
  payButtonDisabled: { backgroundColor: "#CCC" },

  // 모달 공통
  modalOverlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center",
  },

  // 결제 확인 모달
  confirmModal: {
    backgroundColor: "#FFF", borderRadius: 20, padding: 24, width: SW - 48,
  },
  confirmTitle: { fontFamily: Fonts.bold, fontSize: 20, color: textP, textAlign: "center", marginBottom: 16 },
  confirmDetails: { gap: 10, marginBottom: 16 },
  confirmRow: { flexDirection: "row", justifyContent: "space-between" },
  confirmLabel: { fontFamily: Fonts.medium, fontSize: 14, color: textS },
  confirmValue: { fontFamily: Fonts.semiBold, fontSize: 14, color: textP },
  confirmCashback: {
    backgroundColor: "#FFF8E1", borderRadius: 10, padding: 10, marginTop: 4,
  },
  confirmCashbackText: { fontFamily: Fonts.medium, fontSize: 12, color: "#E65100", textAlign: "center" },
  confirmNotice: { fontFamily: Fonts.regular, fontSize: 11, color: textS, textAlign: "center", marginBottom: 16 },
  confirmButtons: { flexDirection: "row", gap: 10 },
  confirmCancelBtn: {
    flex: 1, backgroundColor: bg, borderRadius: 12, paddingVertical: 14, alignItems: "center",
    borderWidth: 1, borderColor: border,
  },
  confirmCancelText: { fontFamily: Fonts.semiBold, fontSize: 15, color: textS },
  confirmPayBtn: {
    flex: 1, backgroundColor: accent, borderRadius: 12, paddingVertical: 14, alignItems: "center",
  },
  confirmPayText: { fontFamily: Fonts.bold, fontSize: 15, color: "#FFF" },

  // 결제 처리 중
  processingOverlay: {
    ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center", alignItems: "center", zIndex: 100,
  },
  processingCard: {
    backgroundColor: "#FFF", borderRadius: 20, padding: 32, alignItems: "center", width: SW - 80,
  },
  processingIcon: { fontSize: 48, marginBottom: 16 },
  processingTitle: { fontFamily: Fonts.bold, fontSize: 18, color: textP, marginBottom: 4 },
  processingSub: { fontFamily: Fonts.regular, fontSize: 13, color: textS, marginBottom: 20 },
  processingBar: {
    width: "100%", height: 4, backgroundColor: border, borderRadius: 2, overflow: "hidden",
  },
  processingBarFill: {
    width: "100%", height: "100%", backgroundColor: accent, borderRadius: 2,
  },

  // 결제 완료 모달
  completeModal: {
    backgroundColor: "#FFF", borderRadius: 24, padding: 28, width: SW - 48, alignItems: "center",
  },
  completeCheckCircle: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: accent,
    alignItems: "center", justifyContent: "center", marginBottom: 16,
  },
  completeCheck: { fontSize: 36, color: "#FFF", fontWeight: "700" },
  completeTitle: { fontFamily: Fonts.extraBold, fontSize: 24, color: textP, marginBottom: 4 },
  completeSub: { fontFamily: Fonts.regular, fontSize: 14, color: textS, marginBottom: 20 },
  completeDetails: {
    width: "100%", backgroundColor: bg, borderRadius: 14, padding: 16, gap: 10, marginBottom: 12,
  },
  completeRow: { flexDirection: "row", justifyContent: "space-between" },
  completeLabel: { fontFamily: Fonts.medium, fontSize: 13, color: textS },
  completeValue: { fontFamily: Fonts.semiBold, fontSize: 13, color: textP },
  completeCashback: {
    backgroundColor: "#FFF8E1", borderRadius: 10, padding: 10, marginTop: 4,
  },
  completeCashbackText: { fontFamily: Fonts.medium, fontSize: 12, color: "#E65100", textAlign: "center" },
  completeNotice: { fontFamily: Fonts.regular, fontSize: 11, color: textS, marginBottom: 16 },
  completeBtn: {
    backgroundColor: accent, borderRadius: 14, paddingHorizontal: 40, paddingVertical: 14,
  },
  completeBtnText: { fontFamily: Fonts.bold, fontSize: 16, color: "#FFF" },
});
