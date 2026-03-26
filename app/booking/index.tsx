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
      <View style={st.calHeader}>
        <Pressable onPress={handlePrevMonth} style={({ pressed }) => pressed && { opacity: 0.5 }}>
          <Text style={[st.calNav, { color: "#1A1A1A" }]}>‹</Text>
        </Pressable>
        <Text style={[st.calTitle, { color: "#1A1A1A" }]}>{viewYear}년 {viewMonth + 1}월</Text>
        <Pressable onPress={handleNextMonth} style={({ pressed }) => pressed && { opacity: 0.5 }}>
          <Text style={[st.calNav, { color: "#1A1A1A" }]}>›</Text>
        </Pressable>
      </View>

      <View style={st.calWeekRow}>
        {DAYS_OF_WEEK.map((d, i) => (
          <View key={d} style={st.calWeekCell}>
            <Text style={[st.calWeekText, { color: "#8E8E93" }, i === 0 && { color: "#FF3B30" }, i === 6 && { color: "#007AFF" }]}>
              {d}
            </Text>
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
                { borderColor: "#E8E8E8" },
                isSelected && st.calCellSelected,
                isToday && !isSelected && st.calCellToday,
              ]}
            >
              {day !== null && (
                <Text style={[
                  st.calCellText,
                  { color: "#1A1A1A" },
                  isPast && { color: "#E8E8E8" },
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
      <Text style={[st.stepSubtitle, { color: "#1A1A1A" }]}>{viewMonth + 1}월 {selectedDate}일 가능한 시간</Text>
      <View style={st.timeGrid}>
        {timeSlots.map((slot) => (
          <Pressable
            key={slot.hour}
            disabled={!slot.available}
            onPress={() => { haptic(); setSelectedTime(slot.hour); }}
            style={[
              st.timeSlot,
              { backgroundColor: "#F8F8F8", borderColor: "#E8E8E8" },
              !slot.available && st.timeSlotUnavailable,
              selectedTime === slot.hour && st.timeSlotSelected,
            ]}
          >
            <Text style={[
              st.timeSlotText,
              { color: "#1A1A1A" },
              !slot.available && { color: "#E8E8E8" },
              selectedTime === slot.hour && { color: "#FFFFFF" },
            ]}>
              {slot.label}
            </Text>
            {!slot.available && <Text style={[st.timeSlotBusy, { color: "#8E8E93" }]}>예약됨</Text>}
          </Pressable>
        ))}
      </View>

      <View style={[st.durationRow, { borderTopColor: "#E8E8E8", borderBottomColor: "#E8E8E8" }]}>
        <Text style={[st.durationLabel, { color: "#1A1A1A" }]}>산책 시간</Text>
        <View style={st.durationControl}>
          <Pressable
            onPress={() => { haptic(); setDuration(Math.max(1, duration - 1)); }}
            style={st.durationBtn}
          >
            <Text style={[st.durationBtnText, { color: "#1A1A1A" }]}>-</Text>
          </Pressable>
          <Text style={[st.durationValue, { color: "#1A1A1A" }]}>{duration}시간</Text>
          <Pressable
            onPress={() => { haptic(); setDuration(Math.min(4, duration + 1)); }}
            style={st.durationBtn}
          >
            <Text style={[st.durationBtnText, { color: "#1A1A1A" }]}>+</Text>
          </Pressable>
        </View>
      </View>

      <View style={st.btnRow}>
        <Pressable onPress={() => { haptic(); setStep("date"); }} style={[st.backBtn, { backgroundColor: "#F8F8F8" }]}>
          <Text style={[st.backBtnText, { color: "#1A1A1A" }]}>이전</Text>
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
      <Text style={[st.stepSubtitle, { color: "#1A1A1A" }]}>예약 상세</Text>

      {state.profile.pets.length > 0 && (
        <View style={st.detailSection}>
          <Text style={[st.detailLabel, { color: "#1A1A1A" }]}>반려견 선택</Text>
          <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
            {state.profile.pets.map((pet) => (
              <Pressable
                key={pet.name}
                onPress={() => { haptic(); setSelectedPet(pet.name); }}
                style={({ pressed }) => [
                  st.petChip,
                  { backgroundColor: "#F8F8F8" },
                  selectedPet === pet.name && st.petChipActive,
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Text style={[st.petChipText, { color: "#1A1A1A" }, selectedPet === pet.name && st.petChipTextActive]}>
                  {pet.name} ({pet.breed})
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      <View style={st.detailSection}>
        <Text style={[st.detailLabel, { color: "#1A1A1A" }]}>요청 사항</Text>
        <TextInput
          style={[st.noteInput, { backgroundColor: "#F8F8F8", color: "#1A1A1A", borderColor: "#E8E8E8" }]}
          placeholder="특이사항이나 요청 사항을 적어주세요"
          placeholderTextColor={"#8E8E93"}
          value={note}
          onChangeText={setNote}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />
      </View>

      <View style={[st.summaryCard, { backgroundColor: "#F8F8F8" }]}>
        <Text style={[st.summaryTitle, { color: "#1A1A1A" }]}>예약 요약</Text>
        <View style={st.summaryRow}>
          <Text style={[st.summaryLabel, { color: "#8E8E93" }]}>돌보미</Text>
          <Text style={[st.summaryValue, { color: "#1A1A1A" }]}>{walkerName}</Text>
        </View>
        <View style={st.summaryRow}>
          <Text style={[st.summaryLabel, { color: "#8E8E93" }]}>날짜</Text>
          <Text style={[st.summaryValue, { color: "#1A1A1A" }]}>{viewMonth + 1}월 {selectedDate}일</Text>
        </View>
        <View style={st.summaryRow}>
          <Text style={[st.summaryLabel, { color: "#8E8E93" }]}>시간</Text>
          <Text style={[st.summaryValue, { color: "#1A1A1A" }]}>{selectedTime}시부터 {duration}시간</Text>
        </View>
        <View style={[st.summaryDivider, { backgroundColor: "#E8E8E8" }]} />
        <View style={st.summaryRow}>
          <Text style={[st.summaryLabel, { color: "#8E8E93" }]}>서비스 금액</Text>
          <Text style={[st.summaryValue, { color: "#1A1A1A" }]}>{totalPrice.toLocaleString()}원</Text>
        </View>
        <View style={st.summaryRow}>
          <Text style={[st.summaryLabel, { color: "#8E8E93" }]}>플랫폼 수수료 (5%)</Text>
          <Text style={[st.summaryValue, { color: "#1A1A1A" }]}>{serviceFee.toLocaleString()}원</Text>
        </View>
      </View>

      <View style={st.btnRow}>
        <Pressable onPress={() => { haptic(); setStep("time"); }} style={[st.backBtn, { backgroundColor: "#F8F8F8" }]}>
          <Text style={[st.backBtnText, { color: "#1A1A1A" }]}>이전</Text>
        </Pressable>
        <Pressable
          onPress={() => { haptic(); setStep("payment"); }}
          style={[st.nextBtn, { flex: 1 }]}
        >
          <Text style={st.nextBtnText}>{grandTotal.toLocaleString()}원 결제하기</Text>
        </Pressable>
      </View>
    </View>
  );

  const renderPaymentStep = () => (
    <View style={st.stepContent}>
      <Text style={[st.stepSubtitle, { color: "#1A1A1A" }]}>결제 수단 선택</Text>
      <View style={[st.paymentNotice, { backgroundColor: "#F8F8F8" }]}>
        <Text style={[st.paymentNoticeText, { color: "#8E8E93" }]}>
          안전한 거래를 위해 모든 결제는 에스크로로 처리됩니다. 서비스가 완료된 후 돌보미에게 정산됩니다.
        </Text>
      </View>

      <Pressable style={({ pressed }) => [st.paymentMethod, { borderBottomColor: "#E8E8E8" }, pressed && { backgroundColor: "#F8F8F8" }]}>
        <Text style={[st.paymentMethodText, { color: "#1A1A1A" }]}>카드 결제</Text>
        <Text style={[st.paymentMethodArrow, { color: "#8E8E93" }]}>›</Text>
      </Pressable>
      <Pressable style={({ pressed }) => [st.paymentMethod, { borderBottomColor: "#E8E8E8" }, pressed && { backgroundColor: "#F8F8F8" }]}>
        <Text style={[st.paymentMethodText, { color: "#1A1A1A" }]}>계좌 이체</Text>
        <Text style={[st.paymentMethodArrow, { color: "#8E8E93" }]}>›</Text>
      </Pressable>

      <View style={st.btnRow}>
        <Pressable onPress={() => { haptic(); setStep("details"); }} style={[st.backBtn, { backgroundColor: "#F8F8F8" }]}>
          <Text style={[st.backBtnText, { color: "#1A1A1A" }]}>이전</Text>
        </Pressable>
        <Pressable
          onPress={handleConfirmBooking}
          style={[st.nextBtn, { flex: 1 }]}
        >
          <Text style={st.nextBtnText}>결제 및 예약 확정</Text>
        </Pressable>
      </View>
    </View>
  );

  const renderConfirmStep = () => (
    <View style={st.stepContent}>
      <View style={st.confirmCard}>
        <Text style={st.confirmEmoji}>🎉</Text>
        <Text style={[st.confirmTitle, { color: "#1A1A1A" }]}>예약이 완료되었습니다!</Text>
        <Text style={[st.confirmSubtitle, { color: "#8E8E93" }]}>
          {walkerName}님과의 산책이 {viewMonth + 1}월 {selectedDate}일 {selectedTime}시에 예정되어 있습니다.
        </Text>
        <Pressable onPress={() => router.replace("/(tabs)" as never)} style={st.nextBtn}>
          <Text style={st.nextBtnText}>매칭 내역 보기</Text>
        </Pressable>
        <Pressable onPress={() => router.replace("/(tabs)")} style={[st.backBtn, { marginTop: 12, backgroundColor: "#F8F8F8" }]}>
          <Text style={[st.backBtnText, { color: "#1A1A1A" }]}>홈으로 돌아가기</Text>
        </Pressable>
      </View>
    </View>
  );

  const renderStep = () => {
    switch (step) {
      case "date": return renderDateStep();
      case "time": return renderTimeStep();
      case "details": return renderDetailsStep();
      case "payment": return renderPaymentStep();
      case "confirm": return renderConfirmStep();
      default: return null;
    }
  };

  return (
    <ScreenContainer>
      <View style={[st.container, { backgroundColor: "#FFFFFF" }]}>
        <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
          {renderStep()}
        </ScrollView>
      </View>
    </ScreenContainer>
  );
}

const st = StyleSheet.create({
  container: {
    flex: 1,
  },
  stepContent: {
    padding: 20,
  },
  stepSubtitle: {
    fontSize: 22,
    fontFamily: Fonts.bold,
    marginBottom: 20,
  },
  calHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  calNav: {
    fontSize: 28,
    fontFamily: Fonts.bold,
    paddingHorizontal: 12,
  },
  calTitle: {
    fontSize: 20,
    fontFamily: Fonts.bold,
  },
  calWeekRow: {
    flexDirection: "row",
    marginBottom: 10,
  },
  calWeekCell: {
    flex: 1,
    alignItems: "center",
  },
  calWeekText: {
    fontSize: 13,
    fontFamily: Fonts.medium,
  },
  calGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  calCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 99,
    margin: 1,
  },
  calCellSelected: {
    backgroundColor: "#FF6B35",
    borderColor: "#FF6B35",
  },
  calCellToday: {
    borderWidth: 2,
    borderColor: "#FF6B35",
  },
  calCellText: {
    fontSize: 16,
    fontFamily: Fonts.medium,
  },
  nextBtn: {
    backgroundColor: "#FF6B35",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 20,
  },
  nextBtnDisabled: {
    backgroundColor: "#E5E5EA",
  },
  nextBtnText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontFamily: Fonts.bold,
  },
  timeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 20,
  },
  timeSlot: {
    width: "31%",
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
  },
  timeSlotUnavailable: {
    opacity: 0.5,
  },
  timeSlotSelected: {
    backgroundColor: "#FF6B35",
    borderColor: "#FF6B35",
  },
  timeSlotText: {
    fontSize: 15,
    fontFamily: Fonts.medium,
  },
  timeSlotBusy: {
    fontSize: 11,
    fontFamily: Fonts.regular,
    marginTop: 2,
  },
  durationRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    marginTop: 10,
  },
  durationLabel: {
    fontSize: 17,
    fontFamily: Fonts.medium,
  },
  durationControl: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  durationBtn: {
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  durationBtnText: {
    fontSize: 24,
    fontFamily: Fonts.regular,
  },
  durationValue: {
    fontSize: 18,
    fontFamily: Fonts.bold,
    minWidth: 60,
    textAlign: "center",
  },
  btnRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 20,
  },
  backBtn: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    flex: 0.5,
  },
  backBtnText: {
    fontSize: 17,
    fontFamily: Fonts.bold,
  },
  detailSection: {
    marginBottom: 24,
  },
  detailLabel: {
    fontSize: 17,
    fontFamily: Fonts.bold,
    marginBottom: 12,
  },
  petChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  petChipActive: {
    backgroundColor: "#FF8255",
  },
  petChipText: {
    fontSize: 15,
    fontFamily: Fonts.medium,
  },
  petChipTextActive: {
    color: "#FFFFFF",
    fontFamily: Fonts.bold,
  },
  noteInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 80,
  },
  summaryCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  summaryTitle: {
    fontSize: 18,
    fontFamily: Fonts.bold,
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 15,
    fontFamily: Fonts.regular,
  },
  summaryValue: {
    fontSize: 15,
    fontFamily: Fonts.medium,
  },
  summaryDivider: {
    height: 1,
    marginVertical: 8,
  },
  paymentNotice: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  paymentNoticeText: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    lineHeight: 20,
  },
  paymentMethod: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 18,
    borderBottomWidth: 1,
  },
  paymentMethodText: {
    fontSize: 17,
    fontFamily: Fonts.regular,
  },
  paymentMethodArrow: {
    fontSize: 20,
  },
  confirmCard: {
    alignItems: "center",
    paddingTop: 40,
    paddingBottom: 20,
  },
  confirmEmoji: {
    fontSize: 60,
    marginBottom: 20,
  },
  confirmTitle: {
    fontSize: 24,
    fontFamily: Fonts.bold,
    marginBottom: 8,
  },
  confirmSubtitle: {
    fontSize: 16,
    fontFamily: Fonts.regular,
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 32,
    paddingHorizontal: 20,
  },
});
