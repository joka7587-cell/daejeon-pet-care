import React, { useState, useMemo, useCallback, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  TextInput,
  Alert,
  Modal,
  FlatList,
  Platform,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useApp } from "@/lib/app-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import { Fonts } from "@/hooks/use-fonts";
import {
  SERVICE_OPTIONS,
  PAYMENT_METHODS,
  DAEJEON_COUPONS,
  calculateCouponDiscount,
  calculateFinalPrice,
  getAvailableCoupons,
  generateBookingId,
  formatDateKR,
  formatPrice,
  type ServiceOption,
  type PaymentMethodType,
  type Coupon,
} from "@/lib/booking-model";

function haptic() {
  if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

function hapticSuccess() {
  if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
}

const DAYS_OF_WEEK = ["일", "월", "화", "수", "목", "금", "토"];

function generateCalendarDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);
  return days;
}

function generateTimeSlots(): { hour: number; minute: number; label: string; available: boolean }[] {
  const slots: { hour: number; minute: number; label: string; available: boolean }[] = [];
  for (let h = 7; h <= 20; h++) {
    for (const m of [0, 30]) {
      if (h === 20 && m === 30) continue;
      const period = h < 12 ? "오전" : "오후";
      const displayH = h <= 12 ? h : h - 12;
      const label = `${period} ${displayH}:${m.toString().padStart(2, "0")}`;
      const unavailable = [9, 14, 18].includes(h) && m === 0;
      slots.push({ hour: h, minute: m, label, available: !unavailable });
    }
  }
  return slots;
}

type BookingStep = "service" | "date" | "time" | "details" | "coupon" | "payment" | "processing" | "confirm";

export default function BookingScreen() {
  const { state, dispatch } = useApp();
  const router = useRouter();
  const params = useLocalSearchParams<{
    walkerId?: string;
    walkerName?: string;
    pricePerHour?: string;
    walkerEmoji?: string;
  }>();

  const walkerName = params.walkerName || "돌보미";
  const walkerEmoji = params.walkerEmoji || "🧑";
  const walkerId = params.walkerId || "unknown";

  const [step, setStep] = useState<BookingStep>("service");
  const [selectedService, setSelectedService] = useState<ServiceOption | null>(null);
  const [selectedDate, setSelectedDate] = useState<number | null>(null);
  const [selectedTime, setSelectedTime] = useState<{ hour: number; minute: number } | null>(null);
  const [duration, setDuration] = useState(1);
  const [note, setNote] = useState("");
  const [selectedPet, setSelectedPet] = useState<string | null>(
    state.profile.pets.length > 0 ? state.profile.pets[0].name : null
  );
  const [selectedPayment, setSelectedPayment] = useState<PaymentMethodType | null>(null);
  const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null);
  const [showCouponModal, setShowCouponModal] = useState(false);

  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());

  const calendarDays = useMemo(() => generateCalendarDays(viewYear, viewMonth), [viewYear, viewMonth]);
  const timeSlots = useMemo(() => generateTimeSlots(), []);

  const pricePerHour = selectedService?.pricePerHour || 15000;
  const basePrice = pricePerHour * duration;
  const serviceFee = Math.round(basePrice * 0.05);
  const couponDiscount = selectedCoupon ? calculateCouponDiscount(selectedCoupon, basePrice) : 0;
  const { finalPrice, cashback } = calculateFinalPrice(
    basePrice + serviceFee,
    couponDiscount,
    selectedPayment || "card"
  );

  const userDistrict = state.profile.neighborhood?.split(" ")[0] || "서구";
  const availableCoupons = useMemo(
    () => getAvailableCoupons(DAEJEON_COUPONS, userDistrict, basePrice),
    [userDistrict, basePrice]
  );

  const today = now.getDate();
  const isCurrentMonth = viewYear === now.getFullYear() && viewMonth === now.getMonth();

  const dateStr = selectedDate
    ? `${viewYear}-${(viewMonth + 1).toString().padStart(2, "0")}-${selectedDate.toString().padStart(2, "0")}`
    : "";

  // ─── 결제 처리 ───
  const handleConfirmBooking = useCallback(() => {
    hapticSuccess();
    setStep("processing");

    // 결제 시뮬레이션 (2초 후 완료)
    setTimeout(() => {
      const bookingId = generateBookingId();
      const timeLabel = selectedTime
        ? `${selectedTime.hour}:${selectedTime.minute.toString().padStart(2, "0")}`
        : "";

      // 결제 기록 저장
      dispatch({
        type: "ADD_PAYMENT",
        payload: {
          id: `pay_${Date.now()}`,
          amount: finalPrice,
          method: selectedPayment === "ontong_daejeon" ? "ontong_daejeon" : selectedPayment === "card" ? "portone" : (selectedPayment || "card"),
          status: "escrow_held",
          description: `${walkerName}님 ${selectedService?.name || "산책"} 예약 (${duration}시간)`,
          serviceType: selectedService?.type || "walk",
          createdAt: new Date().toISOString(),
        },
      });

      // 보호자 알림
      dispatch({
        type: "ADD_NOTIFICATION",
        payload: {
          id: `booking_owner_${Date.now()}`,
          type: "match",
          title: "🎉 예약이 확정되었습니다!",
          body: `${walkerName}님과 ${formatDateKR(dateStr)} ${timeLabel} ${selectedService?.name || "산책"} 예약이 확정되었습니다. 결제금액: ${formatPrice(finalPrice)}${cashback > 0 ? ` (캐시백 ${formatPrice(cashback)})` : ""}`,
          isRead: false,
          createdAt: new Date().toISOString(),
        },
      });

      // 워커 알림 (시뮬레이션)
      dispatch({
        type: "ADD_NOTIFICATION",
        payload: {
          id: `booking_walker_${Date.now()}`,
          type: "match",
          title: "📋 새 예약이 들어왔습니다!",
          body: `${state.profile.nickname || "보호자"}님이 ${formatDateKR(dateStr)} ${timeLabel} ${selectedService?.name || "산책"}을 예약했습니다.`,
          isRead: false,
          createdAt: new Date().toISOString(),
        },
      });

      setStep("confirm");
    }, 2500);
  }, [selectedTime, selectedService, duration, finalPrice, cashback, walkerName, dateStr, selectedPayment, dispatch, state.profile.nickname]);

  // ─── Step 1: 서비스 선택 ───
  const renderServiceStep = () => (
    <View style={st.stepContent}>
      <Text style={st.stepTitle}>서비스 선택</Text>
      <Text style={st.stepDesc}>{walkerName}님에게 어떤 서비스를 요청하시겠어요?</Text>

      {SERVICE_OPTIONS.map((svc) => {
        const isSelected = selectedService?.id === svc.id;
        return (
          <Pressable
            key={svc.id}
            onPress={() => { haptic(); setSelectedService(svc); }}
            style={({ pressed }) => [
              st.serviceCard,
              isSelected && st.serviceCardActive,
              pressed && { opacity: 0.8 },
            ]}
          >
            <View style={st.serviceCardLeft}>
              <Text style={st.serviceEmoji}>{svc.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[st.serviceName, isSelected && { color: "#FFF" }]}>{svc.name}</Text>
                <Text style={[st.serviceDesc, isSelected && { color: "rgba(255,255,255,0.8)" }]}>{svc.description}</Text>
              </View>
            </View>
            <Text style={[st.servicePrice, isSelected && { color: "#FFF" }]}>
              {formatPrice(svc.pricePerHour)}/시간
            </Text>
          </Pressable>
        );
      })}

      <Pressable
        disabled={!selectedService}
        onPress={() => { haptic(); setStep("date"); }}
        style={[st.primaryBtn, !selectedService && st.btnDisabled]}
      >
        <Text style={st.primaryBtnText}>다음</Text>
      </Pressable>
    </View>
  );

  // ─── Step 2: 날짜 선택 ───
  const renderDateStep = () => (
    <View style={st.stepContent}>
      <View style={st.calHeader}>
        <Pressable
          onPress={() => {
            haptic();
            if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1); }
            else setViewMonth(viewMonth - 1);
          }}
          style={({ pressed }) => pressed && { opacity: 0.5 }}
        >
          <Text style={st.calNav}>‹</Text>
        </Pressable>
        <Text style={st.calTitle}>{viewYear}년 {viewMonth + 1}월</Text>
        <Pressable
          onPress={() => {
            haptic();
            if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1); }
            else setViewMonth(viewMonth + 1);
          }}
          style={({ pressed }) => pressed && { opacity: 0.5 }}
        >
          <Text style={st.calNav}>›</Text>
        </Pressable>
      </View>

      <View style={st.calWeekRow}>
        {DAYS_OF_WEEK.map((d, i) => (
          <View key={d} style={st.calWeekCell}>
            <Text style={[st.calWeekText, i === 0 && { color: "#FF3B30" }, i === 6 && { color: "#007AFF" }]}>{d}</Text>
          </View>
        ))}
      </View>

      <View style={st.calGrid}>
        {calendarDays.map((day, idx) => {
          const isPast = isCurrentMonth && day !== null && day < today;
          const isSelected = day === selectedDate;
          const isToday = isCurrentMonth && day === today;
          return (
            <Pressable
              key={idx}
              disabled={day === null || isPast}
              onPress={() => { haptic(); setSelectedDate(day); }}
              style={[
                st.calCell,
                isSelected && st.calCellSelected,
                isToday && !isSelected && st.calCellToday,
              ]}
            >
              {day !== null && (
                <Text style={[
                  st.calCellText,
                  isPast && { color: "#D1D1D6" },
                  isSelected && { color: "#FFF" },
                  isToday && !isSelected && { color: "#FF6B35" },
                ]}>{day}</Text>
              )}
            </Pressable>
          );
        })}
      </View>

      <View style={st.btnRow}>
        <Pressable onPress={() => { haptic(); setStep("service"); }} style={st.secondaryBtn}>
          <Text style={st.secondaryBtnText}>이전</Text>
        </Pressable>
        <Pressable
          disabled={!selectedDate}
          onPress={() => { haptic(); setStep("time"); }}
          style={[st.primaryBtn, { flex: 1 }, !selectedDate && st.btnDisabled]}
        >
          <Text style={st.primaryBtnText}>
            {selectedDate ? `${viewMonth + 1}월 ${selectedDate}일 선택` : "날짜를 선택하세요"}
          </Text>
        </Pressable>
      </View>
    </View>
  );

  // ─── Step 3: 시간 선택 ───
  const renderTimeStep = () => (
    <View style={st.stepContent}>
      <Text style={st.stepTitle}>{viewMonth + 1}월 {selectedDate}일</Text>
      <Text style={st.stepDesc}>시간을 선택해주세요</Text>

      <View style={st.timeGrid}>
        {timeSlots.map((slot, idx) => {
          const isSelected = selectedTime?.hour === slot.hour && selectedTime?.minute === slot.minute;
          return (
            <Pressable
              key={idx}
              disabled={!slot.available}
              onPress={() => { haptic(); setSelectedTime({ hour: slot.hour, minute: slot.minute }); }}
              style={[
                st.timeSlot,
                !slot.available && st.timeSlotUnavailable,
                isSelected && st.timeSlotSelected,
              ]}
            >
              <Text style={[
                st.timeSlotText,
                !slot.available && { color: "#D1D1D6" },
                isSelected && { color: "#FFF" },
              ]}>{slot.label}</Text>
              {!slot.available && <Text style={st.timeSlotBusy}>예약됨</Text>}
            </Pressable>
          );
        })}
      </View>

      <View style={st.durationRow}>
        <Text style={st.durationLabel}>{selectedService?.name || "산책"} 시간</Text>
        <View style={st.durationControl}>
          <Pressable
            onPress={() => { haptic(); setDuration(Math.max(selectedService?.minHours || 1, duration - 1)); }}
            style={st.durationBtn}
          >
            <Text style={st.durationBtnText}>−</Text>
          </Pressable>
          <Text style={st.durationValue}>{duration}시간</Text>
          <Pressable
            onPress={() => { haptic(); setDuration(Math.min(selectedService?.maxHours || 4, duration + 1)); }}
            style={st.durationBtn}
          >
            <Text style={st.durationBtnText}>+</Text>
          </Pressable>
        </View>
      </View>

      <View style={st.pricePreview}>
        <Text style={st.pricePreviewLabel}>예상 금액</Text>
        <Text style={st.pricePreviewValue}>{formatPrice(basePrice)}</Text>
      </View>

      <View style={st.btnRow}>
        <Pressable onPress={() => { haptic(); setStep("date"); }} style={st.secondaryBtn}>
          <Text style={st.secondaryBtnText}>이전</Text>
        </Pressable>
        <Pressable
          disabled={!selectedTime}
          onPress={() => { haptic(); setStep("details"); }}
          style={[st.primaryBtn, { flex: 1 }, !selectedTime && st.btnDisabled]}
        >
          <Text style={st.primaryBtnText}>다음</Text>
        </Pressable>
      </View>
    </View>
  );

  // ─── Step 4: 상세 정보 ───
  const renderDetailsStep = () => (
    <View style={st.stepContent}>
      <Text style={st.stepTitle}>예약 상세</Text>

      {state.profile.pets.length > 0 && (
        <View style={st.section}>
          <Text style={st.sectionTitle}>반려견 선택</Text>
          <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
            {state.profile.pets.map((pet) => (
              <Pressable
                key={pet.name}
                onPress={() => { haptic(); setSelectedPet(pet.name); }}
                style={({ pressed }) => [
                  st.chip,
                  selectedPet === pet.name && st.chipActive,
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Text style={[st.chipText, selectedPet === pet.name && st.chipTextActive]}>
                  {pet.emoji} {pet.name} ({pet.breed})
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      <View style={st.section}>
        <Text style={st.sectionTitle}>요청 사항</Text>
        <TextInput
          style={st.noteInput}
          placeholder="특이사항이나 요청 사항을 적어주세요"
          placeholderTextColor="#8E8E93"
          value={note}
          onChangeText={setNote}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
          returnKeyType="done"
        />
      </View>

      {/* 예약 요약 */}
      <View style={st.summaryCard}>
        <Text style={st.summaryTitle}>📋 예약 요약</Text>
        <View style={st.summaryRow}>
          <Text style={st.summaryLabel}>돌보미</Text>
          <Text style={st.summaryValue}>{walkerEmoji} {walkerName}</Text>
        </View>
        <View style={st.summaryRow}>
          <Text style={st.summaryLabel}>서비스</Text>
          <Text style={st.summaryValue}>{selectedService?.emoji} {selectedService?.name}</Text>
        </View>
        <View style={st.summaryRow}>
          <Text style={st.summaryLabel}>날짜</Text>
          <Text style={st.summaryValue}>{dateStr ? formatDateKR(dateStr) : ""}</Text>
        </View>
        <View style={st.summaryRow}>
          <Text style={st.summaryLabel}>시간</Text>
          <Text style={st.summaryValue}>
            {selectedTime ? `${selectedTime.hour}:${selectedTime.minute.toString().padStart(2, "0")}` : ""}부터 {duration}시간
          </Text>
        </View>
        {selectedPet && (
          <View style={st.summaryRow}>
            <Text style={st.summaryLabel}>반려견</Text>
            <Text style={st.summaryValue}>{selectedPet}</Text>
          </View>
        )}
        <View style={st.divider} />
        <View style={st.summaryRow}>
          <Text style={st.summaryLabel}>서비스 금액</Text>
          <Text style={st.summaryValue}>{formatPrice(basePrice)}</Text>
        </View>
        <View style={st.summaryRow}>
          <Text style={st.summaryLabel}>수수료 (5%)</Text>
          <Text style={st.summaryValue}>{formatPrice(serviceFee)}</Text>
        </View>
        <View style={st.divider} />
        <View style={st.summaryRow}>
          <Text style={[st.summaryLabel, { fontFamily: Fonts.bold, color: "#1A1A1A" }]}>합계</Text>
          <Text style={[st.summaryValue, { fontFamily: Fonts.bold, color: "#FF6B35", fontSize: 18 }]}>
            {formatPrice(basePrice + serviceFee)}
          </Text>
        </View>
      </View>

      <View style={st.btnRow}>
        <Pressable onPress={() => { haptic(); setStep("time"); }} style={st.secondaryBtn}>
          <Text style={st.secondaryBtnText}>이전</Text>
        </Pressable>
        <Pressable
          onPress={() => { haptic(); setStep("coupon"); }}
          style={[st.primaryBtn, { flex: 1 }]}
        >
          <Text style={st.primaryBtnText}>쿠폰 · 결제 선택</Text>
        </Pressable>
      </View>
    </View>
  );

  // ─── Step 5: 쿠폰 + 결제 수단 선택 ───
  const renderCouponPaymentStep = () => (
    <View style={st.stepContent}>
      <Text style={st.stepTitle}>쿠폰 · 결제</Text>

      {/* 쿠폰 섹션 */}
      <View style={st.section}>
        <View style={st.sectionHeader}>
          <Text style={st.sectionTitle}>🎫 할인 쿠폰</Text>
          <Text style={st.couponCount}>{availableCoupons.length}장 사용 가능</Text>
        </View>

        {selectedCoupon ? (
          <View style={st.selectedCouponCard}>
            <View style={{ flex: 1 }}>
              <Text style={st.selectedCouponName}>{selectedCoupon.emoji} {selectedCoupon.name}</Text>
              <Text style={st.selectedCouponDiscount}>
                -{formatPrice(couponDiscount)} 할인
              </Text>
            </View>
            <Pressable
              onPress={() => { haptic(); setSelectedCoupon(null); }}
              style={({ pressed }) => [st.couponRemoveBtn, pressed && { opacity: 0.7 }]}
            >
              <Text style={st.couponRemoveBtnText}>변경</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable
            onPress={() => { haptic(); setShowCouponModal(true); }}
            style={({ pressed }) => [st.couponSelectBtn, pressed && { opacity: 0.8 }]}
          >
            <Text style={st.couponSelectBtnText}>
              {availableCoupons.length > 0
                ? `${userDistrict} 지역 쿠폰 ${availableCoupons.length}장 사용 가능`
                : "사용 가능한 쿠폰이 없습니다"}
            </Text>
            <Text style={st.couponSelectArrow}>›</Text>
          </Pressable>
        )}
      </View>

      {/* 결제 수단 섹션 */}
      <View style={st.section}>
        <Text style={st.sectionTitle}>💳 결제 수단</Text>

        {PAYMENT_METHODS.map((pm) => {
          const isSelected = selectedPayment === pm.type;
          return (
            <Pressable
              key={pm.type}
              onPress={() => { haptic(); setSelectedPayment(pm.type); }}
              style={({ pressed }) => [
                st.paymentCard,
                pm.highlight && st.paymentCardHighlight,
                isSelected && st.paymentCardSelected,
                pressed && { opacity: 0.8 },
              ]}
            >
              <View style={st.paymentCardLeft}>
                <View style={[
                  st.paymentRadio,
                  isSelected && st.paymentRadioActive,
                ]}>
                  {isSelected && <View style={st.paymentRadioDot} />}
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Text style={st.paymentEmoji}>{pm.emoji}</Text>
                    <Text style={[st.paymentName, pm.highlight && { color: "#1B3A6B", fontFamily: Fonts.bold }]}>
                      {pm.name}
                    </Text>
                    {pm.highlight && (
                      <View style={st.localBadge}>
                        <Text style={st.localBadgeText}>대전 지역화폐</Text>
                      </View>
                    )}
                    {pm.discount && (
                      <View style={st.discountBadge}>
                        <Text style={st.discountBadgeText}>{pm.discount}% 캐시백</Text>
                      </View>
                    )}
                  </View>
                  <Text style={st.paymentDesc}>{pm.description}</Text>
                </View>
              </View>
            </Pressable>
          );
        })}
      </View>

      {/* 최종 금액 */}
      <View style={st.finalPriceCard}>
        <View style={st.summaryRow}>
          <Text style={st.summaryLabel}>서비스 금액</Text>
          <Text style={st.summaryValue}>{formatPrice(basePrice)}</Text>
        </View>
        <View style={st.summaryRow}>
          <Text style={st.summaryLabel}>수수료 (5%)</Text>
          <Text style={st.summaryValue}>{formatPrice(serviceFee)}</Text>
        </View>
        {couponDiscount > 0 && (
          <View style={st.summaryRow}>
            <Text style={[st.summaryLabel, { color: "#FF6B35" }]}>쿠폰 할인</Text>
            <Text style={[st.summaryValue, { color: "#FF6B35" }]}>-{formatPrice(couponDiscount)}</Text>
          </View>
        )}
        <View style={st.divider} />
        <View style={st.summaryRow}>
          <Text style={[st.summaryLabel, { fontFamily: Fonts.bold, fontSize: 17, color: "#1A1A1A" }]}>
            최종 결제 금액
          </Text>
          <Text style={[st.summaryValue, { fontFamily: Fonts.bold, fontSize: 22, color: "#FF6B35" }]}>
            {formatPrice(finalPrice)}
          </Text>
        </View>
        {cashback > 0 && (
          <View style={st.cashbackRow}>
            <Text style={st.cashbackText}>💰 온통대전 캐시백 {formatPrice(cashback)} 적립 예정</Text>
          </View>
        )}
      </View>

      <View style={st.escrowNotice}>
        <Text style={st.escrowNoticeText}>
          🔒 안전한 거래를 위해 모든 결제는 에스크로로 처리됩니다. 서비스가 완료된 후 돌보미에게 정산됩니다.
        </Text>
      </View>

      <View style={st.btnRow}>
        <Pressable onPress={() => { haptic(); setStep("details"); }} style={st.secondaryBtn}>
          <Text style={st.secondaryBtnText}>이전</Text>
        </Pressable>
        <Pressable
          disabled={!selectedPayment}
          onPress={handleConfirmBooking}
          style={[st.primaryBtn, { flex: 1 }, !selectedPayment && st.btnDisabled]}
        >
          <Text style={st.primaryBtnText}>
            {selectedPayment === "ontong_daejeon"
              ? `온통대전으로 ${formatPrice(finalPrice)} 결제`
              : `${formatPrice(finalPrice)} 결제하기`}
          </Text>
        </Pressable>
      </View>

      {/* 쿠폰 선택 모달 */}
      <Modal visible={showCouponModal} transparent animationType="slide">
        <View style={st.modalOverlay}>
          <View style={st.modalContent}>
            <View style={st.modalHeader}>
              <Text style={st.modalTitle}>🎫 쿠폰 선택</Text>
              <Pressable onPress={() => setShowCouponModal(false)}>
                <Text style={st.modalClose}>✕</Text>
              </Pressable>
            </View>

            {availableCoupons.length === 0 ? (
              <View style={{ padding: 40, alignItems: "center" }}>
                <Text style={{ fontSize: 48, marginBottom: 12 }}>😢</Text>
                <Text style={{ fontSize: 16, color: "#8E8E93", textAlign: "center" }}>
                  현재 사용 가능한 쿠폰이 없습니다
                </Text>
              </View>
            ) : (
              <FlatList
                data={availableCoupons}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ padding: 16 }}
                renderItem={({ item }) => {
                  const disc = calculateCouponDiscount(item, basePrice);
                  return (
                    <Pressable
                      onPress={() => {
                        haptic();
                        setSelectedCoupon(item);
                        setShowCouponModal(false);
                      }}
                      style={({ pressed }) => [st.couponItem, pressed && { opacity: 0.8 }]}
                    >
                      <View style={st.couponItemLeft}>
                        <Text style={st.couponItemEmoji}>{item.emoji}</Text>
                        <View style={{ flex: 1 }}>
                          <Text style={st.couponItemName}>{item.name}</Text>
                          <Text style={st.couponItemDesc}>{item.description}</Text>
                          <Text style={st.couponItemValid}>
                            {item.validUntil}까지 · {item.district || "대전 전체"}
                          </Text>
                        </View>
                      </View>
                      <View style={st.couponItemRight}>
                        <Text style={st.couponItemDiscount}>-{formatPrice(disc)}</Text>
                      </View>
                    </Pressable>
                  );
                }}
              />
            )}
          </View>
        </View>
      </Modal>
    </View>
  );

  // ─── Step 6: 결제 처리 중 ───
  const renderProcessingStep = () => (
    <View style={[st.stepContent, { alignItems: "center", justifyContent: "center", paddingTop: 80 }]}>
      <Text style={{ fontSize: 64, marginBottom: 24 }}>
        {selectedPayment === "ontong_daejeon" ? "🏙️" : "💳"}
      </Text>
      <Text style={st.processingTitle}>
        {selectedPayment === "ontong_daejeon" ? "온통대전 결제 처리 중..." : "결제 처리 중..."}
      </Text>
      <Text style={st.processingDesc}>잠시만 기다려주세요</Text>
      <View style={st.processingDots}>
        {[0, 1, 2].map((i) => (
          <View key={i} style={[st.dot, { opacity: 0.3 + i * 0.3 }]} />
        ))}
      </View>
    </View>
  );

  // ─── Step 7: 예약 확정 ───
  const renderConfirmStep = () => (
    <View style={[st.stepContent, { alignItems: "center", paddingTop: 40 }]}>
      <Text style={{ fontSize: 72, marginBottom: 16 }}>🎉</Text>
      <Text style={st.confirmTitle}>예약이 확정되었습니다!</Text>
      <Text style={st.confirmSubtitle}>
        {walkerName}님과의 {selectedService?.name || "산책"}이{"\n"}
        {dateStr ? formatDateKR(dateStr) : ""}{" "}
        {selectedTime ? `${selectedTime.hour}:${selectedTime.minute.toString().padStart(2, "0")}` : ""}에{"\n"}
        예정되어 있습니다.
      </Text>

      <View style={st.confirmPriceCard}>
        <Text style={st.confirmPriceLabel}>결제 금액</Text>
        <Text style={st.confirmPriceValue}>{formatPrice(finalPrice)}</Text>
        {cashback > 0 && (
          <View style={st.confirmCashback}>
            <Text style={st.confirmCashbackText}>💰 온통대전 캐시백 {formatPrice(cashback)} 적립!</Text>
          </View>
        )}
      </View>

      <View style={st.confirmNotice}>
        <Text style={st.confirmNoticeTitle}>📱 알림이 전송되었습니다</Text>
        <Text style={st.confirmNoticeText}>보호자님과 {walkerName}님 모두에게 예약 확정 알림이 전송되었습니다.</Text>
      </View>

      <Pressable
        onPress={() => router.replace("/(tabs)" as never)}
        style={[st.primaryBtn, { width: "100%" }]}
      >
        <Text style={st.primaryBtnText}>홈으로 돌아가기</Text>
      </Pressable>

      <Pressable
        onPress={() => {
          if (walkerId && walkerId !== "unknown") {
            router.push(`/chat/${walkerId}` as never);
          } else {
            router.replace("/(tabs)" as never);
          }
        }}
        style={[st.secondaryBtn, { width: "100%", marginTop: 12 }]}
      >
        <Text style={st.secondaryBtnText}>{walkerName}님과 채팅하기</Text>
      </Pressable>
    </View>
  );

  // ─── 스텝 진행 바 ───
  const steps: BookingStep[] = ["service", "date", "time", "details", "coupon", "payment", "processing", "confirm"];
  const currentStepIdx = steps.indexOf(step);
  const progressSteps = ["서비스", "날짜", "시간", "상세", "결제"];
  const progressIdx = Math.min(currentStepIdx, 4);

  const renderStep = () => {
    switch (step) {
      case "service": return renderServiceStep();
      case "date": return renderDateStep();
      case "time": return renderTimeStep();
      case "details": return renderDetailsStep();
      case "coupon": return renderCouponPaymentStep();
      case "processing": return renderProcessingStep();
      case "confirm": return renderConfirmStep();
      default: return null;
    }
  };

  return (
    <ScreenContainer>
      <View style={st.container}>
        {/* 진행 바 */}
        {step !== "processing" && step !== "confirm" && (
          <View style={st.progressBar}>
            {progressSteps.map((label, idx) => (
              <View key={label} style={st.progressItem}>
                <View style={[st.progressDot, idx <= progressIdx && st.progressDotActive]} />
                <Text style={[st.progressLabel, idx <= progressIdx && st.progressLabelActive]}>{label}</Text>
              </View>
            ))}
          </View>
        )}

        <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          {renderStep()}
        </ScrollView>
      </View>
    </ScreenContainer>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  stepContent: { padding: 20 },
  stepTitle: { fontSize: 24, fontFamily: Fonts.bold, color: "#1A1A1A", marginBottom: 4 },
  stepDesc: { fontSize: 15, fontFamily: Fonts.regular, color: "#8E8E93", marginBottom: 24 },

  // 진행 바
  progressBar: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  progressItem: { alignItems: "center", gap: 4 },
  progressDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#E5E5EA" },
  progressDotActive: { backgroundColor: "#FF6B35", width: 10, height: 10, borderRadius: 5 },
  progressLabel: { fontSize: 11, fontFamily: Fonts.regular, color: "#C7C7CC" },
  progressLabelActive: { color: "#FF6B35", fontFamily: Fonts.medium },

  // 서비스 카드
  serviceCard: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    backgroundColor: "#F8F8F8", borderRadius: 14, padding: 16, marginBottom: 10,
    borderWidth: 2, borderColor: "transparent",
  },
  serviceCardActive: { backgroundColor: "#FF6B35", borderColor: "#FF6B35" },
  serviceCardLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  serviceEmoji: { fontSize: 32 },
  serviceName: { fontSize: 17, fontFamily: Fonts.bold, color: "#1A1A1A" },
  serviceDesc: { fontSize: 13, fontFamily: Fonts.regular, color: "#8E8E93", marginTop: 2 },
  servicePrice: { fontSize: 15, fontFamily: Fonts.bold, color: "#FF6B35" },

  // 캘린더
  calHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  calNav: { fontSize: 28, fontFamily: Fonts.bold, color: "#1A1A1A", paddingHorizontal: 12 },
  calTitle: { fontSize: 20, fontFamily: Fonts.bold, color: "#1A1A1A" },
  calWeekRow: { flexDirection: "row", marginBottom: 10 },
  calWeekCell: { flex: 1, alignItems: "center" },
  calWeekText: { fontSize: 13, fontFamily: Fonts.medium, color: "#8E8E93" },
  calGrid: { flexDirection: "row", flexWrap: "wrap" },
  calCell: {
    width: `${100 / 7}%` as any, aspectRatio: 1, justifyContent: "center", alignItems: "center",
    borderRadius: 99, margin: 1,
  },
  calCellSelected: { backgroundColor: "#FF6B35" },
  calCellToday: { borderWidth: 2, borderColor: "#FF6B35" },
  calCellText: { fontSize: 16, fontFamily: Fonts.medium, color: "#1A1A1A" },

  // 시간
  timeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 20 },
  timeSlot: {
    width: "31%" as any, paddingVertical: 12, borderRadius: 10,
    backgroundColor: "#F8F8F8", borderWidth: 1, borderColor: "#E8E8E8", alignItems: "center",
  },
  timeSlotUnavailable: { opacity: 0.4 },
  timeSlotSelected: { backgroundColor: "#FF6B35", borderColor: "#FF6B35" },
  timeSlotText: { fontSize: 14, fontFamily: Fonts.medium, color: "#1A1A1A" },
  timeSlotBusy: { fontSize: 10, fontFamily: Fonts.regular, color: "#8E8E93", marginTop: 2 },

  durationRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingVertical: 16, borderTopWidth: 1, borderBottomWidth: 1, borderColor: "#E8E8E8",
  },
  durationLabel: { fontSize: 17, fontFamily: Fonts.medium, color: "#1A1A1A" },
  durationControl: { flexDirection: "row", alignItems: "center", gap: 16 },
  durationBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#F0F0F0", justifyContent: "center", alignItems: "center" },
  durationBtnText: { fontSize: 22, fontFamily: Fonts.regular, color: "#1A1A1A" },
  durationValue: { fontSize: 18, fontFamily: Fonts.bold, color: "#1A1A1A", minWidth: 60, textAlign: "center" },

  pricePreview: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingVertical: 12, marginTop: 4,
  },
  pricePreviewLabel: { fontSize: 15, fontFamily: Fonts.medium, color: "#8E8E93" },
  pricePreviewValue: { fontSize: 20, fontFamily: Fonts.bold, color: "#FF6B35" },

  // 섹션
  section: { marginBottom: 24 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontFamily: Fonts.bold, color: "#1A1A1A", marginBottom: 12 },

  // 칩
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: "#F0F0F0" },
  chipActive: { backgroundColor: "#FF6B35" },
  chipText: { fontSize: 15, fontFamily: Fonts.medium, color: "#1A1A1A" },
  chipTextActive: { color: "#FFF", fontFamily: Fonts.bold },

  noteInput: {
    borderWidth: 1, borderColor: "#E8E8E8", borderRadius: 10, padding: 14,
    fontSize: 16, fontFamily: Fonts.regular, color: "#1A1A1A", backgroundColor: "#FAFAFA", minHeight: 80,
  },

  // 요약
  summaryCard: { backgroundColor: "#F8F9FA", borderRadius: 14, padding: 18, marginBottom: 16 },
  summaryTitle: { fontSize: 18, fontFamily: Fonts.bold, color: "#1A1A1A", marginBottom: 14 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  summaryLabel: { fontSize: 15, fontFamily: Fonts.regular, color: "#8E8E93" },
  summaryValue: { fontSize: 15, fontFamily: Fonts.medium, color: "#1A1A1A" },
  divider: { height: 1, backgroundColor: "#E8E8E8", marginVertical: 10 },

  // 쿠폰
  couponCount: { fontSize: 14, fontFamily: Fonts.medium, color: "#FF6B35" },
  selectedCouponCard: {
    flexDirection: "row", alignItems: "center", backgroundColor: "#FFF5F0",
    borderRadius: 12, padding: 14, borderWidth: 1, borderColor: "#FFD4C0",
  },
  selectedCouponName: { fontSize: 15, fontFamily: Fonts.bold, color: "#1A1A1A" },
  selectedCouponDiscount: { fontSize: 14, fontFamily: Fonts.bold, color: "#FF6B35", marginTop: 2 },
  couponRemoveBtn: { paddingHorizontal: 14, paddingVertical: 8, backgroundColor: "#FF6B35", borderRadius: 8 },
  couponRemoveBtnText: { fontSize: 14, fontFamily: Fonts.bold, color: "#FFF" },
  couponSelectBtn: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    backgroundColor: "#F8F8F8", borderRadius: 12, padding: 16, borderWidth: 1, borderColor: "#E8E8E8",
  },
  couponSelectBtnText: { fontSize: 15, fontFamily: Fonts.medium, color: "#8E8E93" },
  couponSelectArrow: { fontSize: 20, color: "#8E8E93" },

  // 결제 수단
  paymentCard: {
    flexDirection: "row", alignItems: "center", backgroundColor: "#F8F8F8",
    borderRadius: 12, padding: 16, marginBottom: 10, borderWidth: 2, borderColor: "transparent",
  },
  paymentCardHighlight: {
    backgroundColor: "#F0F4FF", borderColor: "#1B3A6B", borderWidth: 2,
  },
  paymentCardSelected: { borderColor: "#FF6B35" },
  paymentCardLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  paymentRadio: {
    width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: "#D1D1D6",
    justifyContent: "center", alignItems: "center",
  },
  paymentRadioActive: { borderColor: "#FF6B35" },
  paymentRadioDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: "#FF6B35" },
  paymentEmoji: { fontSize: 24 },
  paymentName: { fontSize: 16, fontFamily: Fonts.medium, color: "#1A1A1A" },
  paymentDesc: { fontSize: 13, fontFamily: Fonts.regular, color: "#8E8E93", marginTop: 2 },
  localBadge: { backgroundColor: "#1B3A6B", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  localBadgeText: { fontSize: 10, fontFamily: Fonts.bold, color: "#FFF" },
  discountBadge: { backgroundColor: "#FF6B35", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  discountBadgeText: { fontSize: 10, fontFamily: Fonts.bold, color: "#FFF" },

  // 최종 금액
  finalPriceCard: { backgroundColor: "#F8F9FA", borderRadius: 14, padding: 18, marginBottom: 12 },
  cashbackRow: { backgroundColor: "#FFF5F0", borderRadius: 8, padding: 10, marginTop: 8 },
  cashbackText: { fontSize: 14, fontFamily: Fonts.bold, color: "#FF6B35", textAlign: "center" },
  escrowNotice: { backgroundColor: "#F0F4FF", borderRadius: 10, padding: 14, marginBottom: 16 },
  escrowNoticeText: { fontSize: 13, fontFamily: Fonts.regular, color: "#1B3A6B", lineHeight: 20 },

  // 결제 처리 중
  processingTitle: { fontSize: 22, fontFamily: Fonts.bold, color: "#1A1A1A", marginBottom: 8 },
  processingDesc: { fontSize: 15, fontFamily: Fonts.regular, color: "#8E8E93", marginBottom: 24 },
  processingDots: { flexDirection: "row", gap: 8 },
  dot: { width: 12, height: 12, borderRadius: 6, backgroundColor: "#FF6B35" },

  // 확정
  confirmTitle: { fontSize: 26, fontFamily: Fonts.bold, color: "#1A1A1A", marginBottom: 8, textAlign: "center" },
  confirmSubtitle: { fontSize: 16, fontFamily: Fonts.regular, color: "#8E8E93", textAlign: "center", lineHeight: 24, marginBottom: 24 },
  confirmPriceCard: { backgroundColor: "#FFF5F0", borderRadius: 14, padding: 20, alignItems: "center", marginBottom: 20, width: "100%" },
  confirmPriceLabel: { fontSize: 14, fontFamily: Fonts.regular, color: "#8E8E93" },
  confirmPriceValue: { fontSize: 32, fontFamily: Fonts.bold, color: "#FF6B35", marginTop: 4 },
  confirmCashback: { backgroundColor: "#FF6B35", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, marginTop: 10 },
  confirmCashbackText: { fontSize: 14, fontFamily: Fonts.bold, color: "#FFF" },
  confirmNotice: { backgroundColor: "#F0F4FF", borderRadius: 12, padding: 16, marginBottom: 24, width: "100%" },
  confirmNoticeTitle: { fontSize: 15, fontFamily: Fonts.bold, color: "#1B3A6B", marginBottom: 4 },
  confirmNoticeText: { fontSize: 13, fontFamily: Fonts.regular, color: "#8E8E93", lineHeight: 20 },

  // 버튼
  primaryBtn: { backgroundColor: "#FF6B35", paddingVertical: 16, borderRadius: 12, alignItems: "center", marginTop: 16 },
  primaryBtnText: { color: "#FFF", fontSize: 17, fontFamily: Fonts.bold },
  secondaryBtn: { backgroundColor: "#F0F0F0", paddingVertical: 16, borderRadius: 12, alignItems: "center", flex: 0.5 },
  secondaryBtnText: { fontSize: 17, fontFamily: Fonts.bold, color: "#1A1A1A" },
  btnDisabled: { backgroundColor: "#E5E5EA" },
  btnRow: { flexDirection: "row", gap: 10, marginTop: 16 },

  // 모달
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalContent: { backgroundColor: "#FFF", borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: "70%" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 20, borderBottomWidth: 1, borderBottomColor: "#E8E8E8" },
  modalTitle: { fontSize: 20, fontFamily: Fonts.bold, color: "#1A1A1A" },
  modalClose: { fontSize: 20, color: "#8E8E93", padding: 4 },

  couponItem: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    backgroundColor: "#F8F8F8", borderRadius: 12, padding: 16, marginBottom: 10,
  },
  couponItemLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  couponItemEmoji: { fontSize: 28 },
  couponItemName: { fontSize: 16, fontFamily: Fonts.bold, color: "#1A1A1A" },
  couponItemDesc: { fontSize: 13, fontFamily: Fonts.regular, color: "#8E8E93", marginTop: 2 },
  couponItemValid: { fontSize: 12, fontFamily: Fonts.regular, color: "#C7C7CC", marginTop: 4 },
  couponItemRight: { alignItems: "flex-end" },
  couponItemDiscount: { fontSize: 18, fontFamily: Fonts.bold, color: "#FF6B35" },
});
