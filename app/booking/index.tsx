import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  TextInput,
  Alert,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useApp } from "@/lib/app-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";
import { Fonts } from "@/hooks/use-fonts";

function haptic() {
  if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

type TimeSlot = { hour: number; label: string; available: boolean };

const DAYS_OF_WEEK = ["일", "월", "화", "수", "목", "금", "토"];

function generateCalendarDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);
  return days;
}

function generateTimeSlots(): TimeSlot[] {
  const slots: TimeSlot[] = [];
  for (let h = 7; h <= 21; h++) {
    const label = h < 12 ? `오전 ${h}시` : h === 12 ? `오후 12시` : `오후 ${h - 12}시`;
    // 랜덤하게 일부 시간대를 예약 불가로 표시
    const available = ![9, 14, 18].includes(h);
    slots.push({ hour: h, label, available });
  }
  return slots;
}

type BookingStep = "date" | "time" | "details" | "payment" | "confirm";

export default function BookingScreen() {
  const { state, dispatch } = useApp();
  const router = useRouter();
  const params = useLocalSearchParams<{ walkerId?: string; walkerName?: string; pricePerHour?: string }>();

  const walkerName = params.walkerName || "돌보미";
  const pricePerHour = parseInt(params.pricePerHour || "15000", 10);

  const [step, setStep] = useState<BookingStep>("date");
  const [selectedDate, setSelectedDate] = useState<number | null>(null);
  const [selectedTime, setSelectedTime] = useState<number | null>(null);
  const [duration, setDuration] = useState(1);
  const [note, setNote] = useState("");
  const [selectedPet, setSelectedPet] = useState<string | null>(
    state.profile.pets.length > 0 ? state.profile.pets[0].name : null
  );

  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());

  const calendarDays = useMemo(() => generateCalendarDays(viewYear, viewMonth), [viewYear, viewMonth]);
  const timeSlots = useMemo(() => generateTimeSlots(), []);

  const totalPrice = pricePerHour * duration;
  const serviceFee = Math.round(totalPrice * 0.05);
  const grandTotal = totalPrice + serviceFee;

  const today = now.getDate();
  const isCurrentMonth = viewYear === now.getFullYear() && viewMonth === now.getMonth();

  const handlePrevMonth = () => {
    haptic();
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const handleNextMonth = () => {
    haptic();
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const handleConfirmBooking = () => {
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    dispatch({
      type: "ADD_NOTIFICATION",
      payload: {
        id: `booking_${Date.now()}`,
        type: "match",
        title: "예약 완료",
        body: `${walkerName}님에게 ${viewMonth + 1}/${selectedDate} ${selectedTime}시 예약이 확정되었습니다.`,
        isRead: false,
        createdAt: new Date().toISOString(),
      },
    });

    dispatch({
      type: "ADD_PAYMENT",
      payload: {
        id: `pay_${Date.now()}`,
        amount: grandTotal,
        method: "escrow",
        status: "escrow_held",
        description: `${walkerName}님 산책 예약 (${duration}시간)`,
        serviceType: "walk",
        createdAt: new Date().toISOString(),
      },
    });

    setStep("confirm");
  };

  const renderDateStep = () => (
    <View style={st.stepContent}>
      {/* 캘린더 헤더 */}
      <View style={st.calHeader}>
        <Pressable onPress={handlePrevMonth} style={({ pressed }) => pressed && { opacity: 0.5 }}>
          <Text style={st.calNav}>‹</Text>
        </Pressable>
        <Text style={st.calTitle}>{viewYear}년 {viewMonth + 1}월</Text>
        <Pressable onPress={handleNextMonth} style={({ pressed }) => pressed && { opacity: 0.5 }}>
          <Text style={st.calNav}>›</Text>
        </Pressable>
      </View>

      {/* 요일 헤더 */}
      <View style={st.calWeekRow}>
        {DAYS_OF_WEEK.map((d, i) => (
          <View key={d} style={st.calWeekCell}>
            <Text style={[st.calWeekText, i === 0 && { color: "#FF3B30" }, i === 6 && { color: "#007AFF" }]}>
              {d}
            </Text>
          </View>
        ))}
      </View>

      {/* 날짜 그리드 */}
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
                  isSelected && { color: "#FFFFFF" },
                  isToday && !isSelected && { color: "#FF6B35" },
                ]}>
                  {day}
                </Text>
              )}
            </Pressable>
          );
        })}
      </View>

      <Pressable
        disabled={selectedDate === null}
        onPress={() => { haptic(); setStep("time"); }}
        style={[st.nextBtn, selectedDate === null && st.nextBtnDisabled]}
      >
        <Text style={st.nextBtnText}>
          {selectedDate ? `${viewMonth + 1}월 ${selectedDate}일 선택` : "날짜를 선택하세요"}
        </Text>
      </Pressable>
    </View>
  );

  const renderTimeStep = () => (
    <View style={st.stepContent}>
      <Text style={st.stepSubtitle}>{viewMonth + 1}월 {selectedDate}일 가능한 시간</Text>
      <View style={st.timeGrid}>
        {timeSlots.map((slot) => (
          <Pressable
            key={slot.hour}
            disabled={!slot.available}
            onPress={() => { haptic(); setSelectedTime(slot.hour); }}
            style={[
              st.timeSlot,
              !slot.available && st.timeSlotUnavailable,
              selectedTime === slot.hour && st.timeSlotSelected,
            ]}
          >
            <Text style={[
              st.timeSlotText,
              !slot.available && { color: "#D1D1D6" },
              selectedTime === slot.hour && { color: "#FFFFFF" },
            ]}>
              {slot.label}
            </Text>
            {!slot.available && <Text style={st.timeSlotBusy}>예약됨</Text>}
          </Pressable>
        ))}
      </View>

      {/* 시간 선택 */}
      <View style={st.durationRow}>
        <Text style={st.durationLabel}>산책 시간</Text>
        <View style={st.durationControl}>
          <Pressable
            onPress={() => { haptic(); setDuration(Math.max(1, duration - 1)); }}
            style={st.durationBtn}
          >
            <Text style={st.durationBtnText}>-</Text>
          </Pressable>
          <Text style={st.durationValue}>{duration}시간</Text>
          <Pressable
            onPress={() => { haptic(); setDuration(Math.min(4, duration + 1)); }}
            style={st.durationBtn}
          >
            <Text style={st.durationBtnText}>+</Text>
          </Pressable>
        </View>
      </View>

      <View style={st.btnRow}>
        <Pressable onPress={() => { haptic(); setStep("date"); }} style={st.backBtn}>
          <Text style={st.backBtnText}>이전</Text>
        </Pressable>
        <Pressable
          disabled={selectedTime === null}
          onPress={() => { haptic(); setStep("details"); }}
          style={[st.nextBtn, { flex: 1 }, selectedTime === null && st.nextBtnDisabled]}
        >
          <Text style={st.nextBtnText}>다음</Text>
        </Pressable>
      </View>
    </View>
  );

  const renderDetailsStep = () => (
    <View style={st.stepContent}>
      <Text style={st.stepSubtitle}>예약 상세</Text>

      {/* 반려견 선택 */}
      {state.profile.pets.length > 0 && (
        <View style={st.detailSection}>
          <Text style={st.detailLabel}>반려견 선택</Text>
          <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
            {state.profile.pets.map((pet) => (
              <Pressable
                key={pet.name}
                onPress={() => { haptic(); setSelectedPet(pet.name); }}
                style={[st.petChip, selectedPet === pet.name && st.petChipActive]}
              >
                <Text style={[st.petChipText, selectedPet === pet.name && st.petChipTextActive]}>
                  {pet.name} ({pet.breed})
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {/* 메모 */}
      <View style={st.detailSection}>
        <Text style={st.detailLabel}>요청 사항</Text>
        <TextInput
          style={st.noteInput}
          placeholder="특이사항이나 요청 사항을 적어주세요"
          placeholderTextColor="#AEAEB2"
          value={note}
          onChangeText={setNote}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />
      </View>

      {/* 요약 */}
      <View style={st.summaryCard}>
        <Text style={st.summaryTitle}>예약 요약</Text>
        <View style={st.summaryRow}>
          <Text style={st.summaryLabel}>돌보미</Text>
          <Text style={st.summaryValue}>{walkerName}</Text>
        </View>
        <View style={st.summaryRow}>
          <Text style={st.summaryLabel}>날짜</Text>
          <Text style={st.summaryValue}>{viewYear}년 {viewMonth + 1}월 {selectedDate}일</Text>
        </View>
        <View style={st.summaryRow}>
          <Text style={st.summaryLabel}>시간</Text>
          <Text style={st.summaryValue}>{selectedTime}:00 ~ {(selectedTime || 0) + duration}:00 ({duration}시간)</Text>
        </View>
        {selectedPet && (
          <View style={st.summaryRow}>
            <Text style={st.summaryLabel}>반려견</Text>
            <Text style={st.summaryValue}>{selectedPet}</Text>
          </View>
        )}
      </View>

      <View style={st.btnRow}>
        <Pressable onPress={() => { haptic(); setStep("time"); }} style={st.backBtn}>
          <Text style={st.backBtnText}>이전</Text>
        </Pressable>
        <Pressable
          onPress={() => { haptic(); setStep("payment"); }}
          style={[st.nextBtn, { flex: 1 }]}
        >
          <Text style={st.nextBtnText}>결제하기</Text>
        </Pressable>
      </View>
    </View>
  );

  const renderPaymentStep = () => (
    <View style={st.stepContent}>
      <Text style={st.stepSubtitle}>안전 결제 (에스크로)</Text>

      <View style={st.escrowInfo}>
        <Text style={{ fontSize: 24 }}>🔒</Text>
        <View style={{ flex: 1 }}>
          <Text style={st.escrowTitle}>에스크로 안전 결제</Text>
          <Text style={st.escrowDesc}>
            결제 금액은 산책이 완료될 때까지 안전하게 보관됩니다.{"\n"}
            산책 완료 후 보호자가 확인하면 돌보미에게 지급됩니다.
          </Text>
        </View>
      </View>

      {/* 금액 상세 */}
      <View style={st.priceCard}>
        <View style={st.priceRow}>
          <Text style={st.priceLabel}>산책 요금 ({duration}시간)</Text>
          <Text style={st.priceValue}>₩{totalPrice.toLocaleString()}</Text>
        </View>
        <View style={st.priceRow}>
          <Text style={st.priceLabel}>서비스 수수료 (5%)</Text>
          <Text style={st.priceValue}>₩{serviceFee.toLocaleString()}</Text>
        </View>
        <View style={[st.priceRow, st.priceTotalRow]}>
          <Text style={st.priceTotalLabel}>총 결제 금액</Text>
          <Text style={st.priceTotalValue}>₩{grandTotal.toLocaleString()}</Text>
        </View>
      </View>

      {/* 결제 수단 */}
      <View style={st.detailSection}>
        <Text style={st.detailLabel}>결제 수단</Text>
        <View style={{ gap: 8 }}>
          {["카카오페이", "네이버페이", "신용/체크카드"].map((method, i) => (
            <Pressable
              key={method}
              onPress={() => haptic()}
              style={[st.paymentMethod, i === 0 && st.paymentMethodActive]}
            >
              <View style={[st.radioOuter, i === 0 && st.radioOuterActive]}>
                {i === 0 && <View style={st.radioInner} />}
              </View>
              <Text style={[st.paymentMethodText, i === 0 && { color: "#1A1A1A" }]}>{method}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={st.btnRow}>
        <Pressable onPress={() => { haptic(); setStep("details"); }} style={st.backBtn}>
          <Text style={st.backBtnText}>이전</Text>
        </Pressable>
        <Pressable
          onPress={handleConfirmBooking}
          style={[st.payBtn, { flex: 1 }]}
        >
          <Text style={st.payBtnText}>₩{grandTotal.toLocaleString()} 결제하기</Text>
        </Pressable>
      </View>
    </View>
  );

  const renderConfirmStep = () => (
    <View style={[st.stepContent, { alignItems: "center", paddingTop: 40 }]}>
      <View style={st.confirmIcon}>
        <Text style={{ fontSize: 48 }}>✅</Text>
      </View>
      <Text style={st.confirmTitle}>예약이 완료되었습니다!</Text>
      <Text style={st.confirmSub}>
        {walkerName}님에게 예약 알림이 전송되었습니다.{"\n"}
        채팅으로 세부 사항을 조율해보세요.
      </Text>

      <View style={st.confirmCard}>
        <View style={st.summaryRow}>
          <Text style={st.summaryLabel}>날짜</Text>
          <Text style={st.summaryValue}>{viewMonth + 1}월 {selectedDate}일</Text>
        </View>
        <View style={st.summaryRow}>
          <Text style={st.summaryLabel}>시간</Text>
          <Text style={st.summaryValue}>{selectedTime}:00 ~ {(selectedTime || 0) + duration}:00</Text>
        </View>
        <View style={st.summaryRow}>
          <Text style={st.summaryLabel}>결제</Text>
          <Text style={[st.summaryValue, { color: "#FF6B35" }]}>₩{grandTotal.toLocaleString()} (에스크로)</Text>
        </View>
      </View>

      <View style={{ gap: 10, width: "100%", marginTop: 20 }}>
        <Pressable
          onPress={() => { haptic(); router.push("/(tabs)/chat" as never); }}
          style={[st.nextBtn]}
        >
          <Text style={st.nextBtnText}>채팅으로 이동</Text>
        </Pressable>
        <Pressable
          onPress={() => { haptic(); router.back(); }}
          style={st.backBtn}
        >
          <Text style={[st.backBtnText, { textAlign: "center" }]}>홈으로</Text>
        </Pressable>
      </View>
    </View>
  );

  const steps: { id: BookingStep; label: string }[] = [
    { id: "date", label: "날짜" },
    { id: "time", label: "시간" },
    { id: "details", label: "상세" },
    { id: "payment", label: "결제" },
    { id: "confirm", label: "완료" },
  ];

  const currentStepIndex = steps.findIndex((s) => s.id === step);

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      {/* 헤더 */}
      <View style={st.header}>
        <Pressable onPress={() => { haptic(); router.back(); }} style={({ pressed }) => pressed && { opacity: 0.5 }}>
          <Text style={st.headerBack}>‹ 뒤로</Text>
        </Pressable>
        <Text style={st.headerTitle}>예약하기</Text>
        <View style={{ width: 50 }} />
      </View>

      {/* 진행 표시 */}
      <View style={st.progressBar}>
        {steps.map((s, i) => (
          <View key={s.id} style={{ flex: 1, flexDirection: "row", alignItems: "center" }}>
            <View style={[st.progressDot, i <= currentStepIndex && st.progressDotActive]}>
              <Text style={[st.progressDotText, i <= currentStepIndex && { color: "#fff" }]}>
                {i < currentStepIndex ? "✓" : i + 1}
              </Text>
            </View>
            {i < steps.length - 1 && (
              <View style={[st.progressLine, i < currentStepIndex && st.progressLineActive]} />
            )}
          </View>
        ))}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        {step === "date" && renderDateStep()}
        {step === "time" && renderTimeStep()}
        {step === "details" && renderDetailsStep()}
        {step === "payment" && renderPaymentStep()}
        {step === "confirm" && renderConfirmStep()}
      </ScrollView>
    </ScreenContainer>
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

  progressBar: {
    flexDirection: "row",
    paddingHorizontal: 24,
    paddingVertical: 16,
    alignItems: "center",
  },
  progressDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#F0F0F0",
    alignItems: "center",
    justifyContent: "center",
  },
  progressDotActive: { backgroundColor: "#FF6B35" },
  progressDotText: { fontFamily: Fonts.bold, fontSize: 12, color: "#AEAEB2" },
  progressLine: { flex: 1, height: 2, backgroundColor: "#F0F0F0", marginHorizontal: 4 },
  progressLineActive: { backgroundColor: "#FF6B35" },

  stepContent: { paddingHorizontal: 20, paddingTop: 8 },
  stepSubtitle: { fontFamily: Fonts.bold, fontSize: 18, color: "#1A1A1A", marginBottom: 16 },

  // Calendar
  calHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  calTitle: { fontFamily: Fonts.bold, fontSize: 17, color: "#1A1A1A" },
  calNav: { fontFamily: Fonts.bold, fontSize: 24, color: "#FF6B35", paddingHorizontal: 12 },
  calWeekRow: { flexDirection: "row", marginBottom: 8 },
  calWeekCell: { flex: 1, alignItems: "center" },
  calWeekText: { fontFamily: Fonts.medium, fontSize: 12, color: "#8E8E93" },
  calGrid: { flexDirection: "row", flexWrap: "wrap" },
  calCell: {
    width: `${100 / 7}%` as any,
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
  },
  calCellSelected: { backgroundColor: "#FF6B35" },
  calCellToday: { borderWidth: 1.5, borderColor: "#FF6B35" },
  calCellText: { fontFamily: Fonts.medium, fontSize: 14, color: "#1A1A1A" },

  // Time
  timeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 20 },
  timeSlot: {
    width: "31%" as any,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E5EA",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  timeSlotUnavailable: { backgroundColor: "#F5F5F5", borderColor: "#F0F0F0" },
  timeSlotSelected: { backgroundColor: "#FF6B35", borderColor: "#FF6B35" },
  timeSlotText: { fontFamily: Fonts.medium, fontSize: 13, color: "#1A1A1A" },
  timeSlotBusy: { fontFamily: Fonts.regular, fontSize: 9, color: "#AEAEB2", marginTop: 2 },

  // Duration
  durationRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#F8F8F8",
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
  },
  durationLabel: { fontFamily: Fonts.semiBold, fontSize: 14, color: "#1A1A1A" },
  durationControl: { flexDirection: "row", alignItems: "center", gap: 16 },
  durationBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FF6B35",
    alignItems: "center",
    justifyContent: "center",
  },
  durationBtnText: { fontFamily: Fonts.bold, fontSize: 18, color: "#fff" },
  durationValue: { fontFamily: Fonts.bold, fontSize: 16, color: "#1A1A1A", minWidth: 50, textAlign: "center" },

  // Details
  detailSection: { marginBottom: 20 },
  detailLabel: { fontFamily: Fonts.semiBold, fontSize: 14, color: "#1A1A1A", marginBottom: 8 },
  petChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E5EA",
    backgroundColor: "#fff",
  },
  petChipActive: { borderColor: "#FF6B35", backgroundColor: "#FFF5F0" },
  petChipText: { fontFamily: Fonts.medium, fontSize: 13, color: "#8E8E93" },
  petChipTextActive: { fontFamily: Fonts.semiBold, color: "#FF6B35" },
  noteInput: {
    fontFamily: Fonts.regular,
    fontSize: 14,
    color: "#1A1A1A",
    backgroundColor: "#F8F8F8",
    borderRadius: 12,
    padding: 14,
    minHeight: 80,
    borderWidth: 1,
    borderColor: "#E5E5EA",
  },

  // Summary
  summaryCard: {
    backgroundColor: "#F8F8F8",
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
  },
  summaryTitle: { fontFamily: Fonts.bold, fontSize: 15, color: "#1A1A1A", marginBottom: 12 },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  summaryLabel: { fontFamily: Fonts.regular, fontSize: 13, color: "#8E8E93" },
  summaryValue: { fontFamily: Fonts.semiBold, fontSize: 13, color: "#1A1A1A" },

  // Escrow
  escrowInfo: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    backgroundColor: "#FFF5F0",
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#FFD9C7",
  },
  escrowTitle: { fontFamily: Fonts.bold, fontSize: 14, color: "#FF6B35", marginBottom: 4 },
  escrowDesc: { fontFamily: Fonts.regular, fontSize: 12, color: "#C4724A", lineHeight: 18 },

  // Price
  priceCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#F0F0F0",
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  priceLabel: { fontFamily: Fonts.regular, fontSize: 13, color: "#8E8E93" },
  priceValue: { fontFamily: Fonts.medium, fontSize: 13, color: "#1A1A1A" },
  priceTotalRow: {
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
    marginTop: 8,
    paddingTop: 12,
  },
  priceTotalLabel: { fontFamily: Fonts.bold, fontSize: 15, color: "#1A1A1A" },
  priceTotalValue: { fontFamily: Fonts.extraBold, fontSize: 18, color: "#FF6B35" },

  // Payment Method
  paymentMethod: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E5EA",
    backgroundColor: "#fff",
  },
  paymentMethodActive: { borderColor: "#FF6B35", backgroundColor: "#FFF5F0" },
  paymentMethodText: { fontFamily: Fonts.medium, fontSize: 14, color: "#8E8E93" },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#D1D1D6",
    alignItems: "center",
    justifyContent: "center",
  },
  radioOuterActive: { borderColor: "#FF6B35" },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#FF6B35" },

  // Buttons
  btnRow: { flexDirection: "row", gap: 10, marginTop: 8 },
  nextBtn: {
    backgroundColor: "#FF6B35",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  nextBtnDisabled: { backgroundColor: "#D1D1D6" },
  nextBtnText: { fontFamily: Fonts.bold, color: "#fff", fontSize: 15 },
  backBtn: {
    backgroundColor: "#F5F5F5",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: "center",
  },
  backBtnText: { fontFamily: Fonts.semiBold, color: "#8E8E93", fontSize: 15 },
  payBtn: {
    backgroundColor: "#FF6B35",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  payBtnText: { fontFamily: Fonts.bold, color: "#fff", fontSize: 15 },

  // Confirm
  confirmIcon: { marginBottom: 16 },
  confirmTitle: { fontFamily: Fonts.extraBold, fontSize: 22, color: "#1A1A1A", marginBottom: 8 },
  confirmSub: { fontFamily: Fonts.regular, fontSize: 14, color: "#8E8E93", textAlign: "center", lineHeight: 20, marginBottom: 20 },
  confirmCard: {
    backgroundColor: "#F8F8F8",
    borderRadius: 14,
    padding: 16,
    width: "100%",
  },
});
