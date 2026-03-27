import { View, Text, Pressable, ScrollView, StyleSheet, Modal } from "react-native";
import { useState } from "react";
import { Fonts } from "@/hooks/use-fonts";
import * as Haptics from "expo-haptics";

const haptic = () => {
  try {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch {}
};

export interface QuickBookingData {
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  duration: string; // "30분" | "1시간" | "2시간"
}

export interface QuickBookingBarProps {
  onBookingChange?: (data: QuickBookingData) => void;
  onSubmit?: (data: QuickBookingData) => void;
  workerName?: string;
  workerPrice?: number;
}

export function QuickBookingBar({
  onBookingChange,
  onSubmit,
  workerName = "워커",
  workerPrice = 15000,
}: QuickBookingBarProps) {
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(getTodayDate());
  const [selectedTime, setSelectedTime] = useState("10:00");
  const [selectedDuration, setSelectedDuration] = useState("1시간");

  const handleDateSelect = (date: string) => {
    haptic();
    setSelectedDate(date);
    setShowDatePicker(false);
    const newData = { date, time: selectedTime, duration: selectedDuration };
    onBookingChange?.(newData);
  };

  const handleTimeSelect = (time: string) => {
    haptic();
    setSelectedTime(time);
    setShowTimePicker(false);
    const newData = { date: selectedDate, time, duration: selectedDuration };
    onBookingChange?.(newData);
  };

  const handleDurationSelect = (duration: string) => {
    haptic();
    setSelectedDuration(duration);
    const newData = { date: selectedDate, time: selectedTime, duration };
    onBookingChange?.(newData);
  };

  const handleSubmit = () => {
    haptic();
    onSubmit?.({ date: selectedDate, time: selectedTime, duration: selectedDuration });
  };

  const estimatedPrice = calculatePrice(workerPrice, selectedDuration);
  const displayDate = formatDateKorean(selectedDate);

  return (
    <>
      <View style={s.container}>
        {/* 헤더 */}
        <View style={s.header}>
          <Text style={s.headerTitle}>간편 예약</Text>
          <Text style={s.headerSubtitle}>{workerName}님과 산책 예약하기</Text>
        </View>

        {/* 날짜 선택 */}
        <Pressable
          onPress={() => {
            haptic();
            setShowDatePicker(true);
          }}
          style={({ pressed }) => [s.selector, pressed && { opacity: 0.7 }]}
        >
          <Text style={s.selectorLabel}>📅 날짜</Text>
          <View style={s.selectorValue}>
            <Text style={s.selectorValueText}>{displayDate}</Text>
            <Text style={s.selectorArrow}>›</Text>
          </View>
        </Pressable>

        {/* 시간 선택 */}
        <Pressable
          onPress={() => {
            haptic();
            setShowTimePicker(true);
          }}
          style={({ pressed }) => [s.selector, pressed && { opacity: 0.7 }]}
        >
          <Text style={s.selectorLabel}>🕐 시간</Text>
          <View style={s.selectorValue}>
            <Text style={s.selectorValueText}>{selectedTime}</Text>
            <Text style={s.selectorArrow}>›</Text>
          </View>
        </Pressable>

        {/* 산책 시간 선택 */}
        <View style={s.durationSection}>
          <Text style={s.selectorLabel}>⏱️ 산책 시간</Text>
          <View style={s.durationButtons}>
            {["30분", "1시간", "2시간"].map((dur) => (
              <Pressable
                key={dur}
                onPress={() => handleDurationSelect(dur)}
                style={[
                  s.durationButton,
                  selectedDuration === dur && s.durationButtonActive,
                ]}
              >
                <Text
                  style={[
                    s.durationButtonText,
                    selectedDuration === dur && s.durationButtonTextActive,
                  ]}
                >
                  {dur}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* 예상 요금 */}
        <View style={s.priceSection}>
          <View style={s.priceRow}>
            <Text style={s.priceLabel}>시간당 요금</Text>
            <Text style={s.priceValue}>₩{workerPrice.toLocaleString()}</Text>
          </View>
          <View style={s.priceRow}>
            <Text style={s.priceLabel}>예상 요금</Text>
            <Text style={s.priceEstimate}>₩{estimatedPrice.toLocaleString()}</Text>
          </View>
        </View>

        {/* 예약 버튼 */}
        <Pressable
          onPress={handleSubmit}
          style={({ pressed }) => [
            s.submitButton,
            pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
          ]}
        >
          <Text style={s.submitButtonText}>예약 신청하기</Text>
        </Pressable>
      </View>

      {/* 날짜 선택 모달 */}
      <Modal visible={showDatePicker} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>날짜 선택</Text>
              <Pressable
                onPress={() => setShowDatePicker(false)}
                style={s.modalCloseBtn}
              >
                <Text style={{ fontSize: 24 }}>✕</Text>
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={s.dateGrid}>
              {generateDateOptions().map((date) => (
                <Pressable
                  key={date}
                  onPress={() => handleDateSelect(date)}
                  style={[
                    s.dateOption,
                    selectedDate === date && s.dateOptionActive,
                  ]}
                >
                  <Text
                    style={[
                      s.dateOptionText,
                      selectedDate === date && s.dateOptionTextActive,
                    ]}
                  >
                    {formatDateKorean(date)}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* 시간 선택 모달 */}
      <Modal visible={showTimePicker} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>시간 선택</Text>
              <Pressable
                onPress={() => setShowTimePicker(false)}
                style={s.modalCloseBtn}
              >
                <Text style={{ fontSize: 24 }}>✕</Text>
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={s.timeGrid}>
              {generateTimeOptions().map((time) => (
                <Pressable
                  key={time}
                  onPress={() => handleTimeSelect(time)}
                  style={[
                    s.timeOption,
                    selectedTime === time && s.timeOptionActive,
                  ]}
                >
                  <Text
                    style={[
                      s.timeOptionText,
                      selectedTime === time && s.timeOptionTextActive,
                    ]}
                  >
                    {time}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

// ─── 유틸리티 함수 ───

function getTodayDate(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDateKorean(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const dayOfWeek = days[date.getDay()];
  return `${month}월 ${day}일 (${dayOfWeek})`;
}

function generateDateOptions(): string[] {
  const dates: string[] = [];
  const today = new Date();

  for (let i = 0; i < 14; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    dates.push(`${year}-${month}-${day}`);
  }

  return dates;
}

function generateTimeOptions(): string[] {
  const times: string[] = [];
  for (let hour = 7; hour <= 20; hour++) {
    for (let min = 0; min < 60; min += 30) {
      const h = String(hour).padStart(2, "0");
      const m = String(min).padStart(2, "0");
      times.push(`${h}:${m}`);
    }
  }
  return times;
}

function calculatePrice(hourlyRate: number, duration: string): number {
  const durationMap: Record<string, number> = {
    "30분": 0.5,
    "1시간": 1,
    "2시간": 2,
  };
  const hours = durationMap[duration] || 1;
  return Math.round(hourlyRate * hours);
}

const s = StyleSheet.create({
  container: {
    backgroundColor: "#E8F5E9",
    borderTopWidth: 1,
    borderTopColor: "#FFE0D0",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  header: {
    marginBottom: 8,
  },
  headerTitle: {
    fontFamily: Fonts.bold,
    fontSize: 14,
    color: "#1A1A1A",
  },
  headerSubtitle: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    color: "#999",
    marginTop: 2,
  },

  // 선택기
  selector: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#fff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FFD0B8",
  },
  selectorLabel: {
    fontFamily: Fonts.medium,
    fontSize: 13,
    color: "#666",
  },
  selectorValue: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  selectorValueText: {
    fontFamily: Fonts.bold,
    fontSize: 13,
    color: "#2E7D32",
  },
  selectorArrow: {
    fontSize: 16,
    color: "#2E7D32",
  },

  // 산책 시간 선택
  durationSection: {
    gap: 8,
  },
  durationButtons: {
    flexDirection: "row",
    gap: 8,
  },
  durationButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FFD0B8",
    backgroundColor: "#fff",
    alignItems: "center",
  },
  durationButtonActive: {
    backgroundColor: "#2E7D32",
    borderColor: "#2E7D32",
  },
  durationButtonText: {
    fontFamily: Fonts.medium,
    fontSize: 12,
    color: "#666",
  },
  durationButtonTextActive: {
    color: "#fff",
  },

  // 요금
  priceSection: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#fff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FFD0B8",
    gap: 6,
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  priceLabel: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    color: "#999",
  },
  priceValue: {
    fontFamily: Fonts.medium,
    fontSize: 12,
    color: "#666",
  },
  priceEstimate: {
    fontFamily: Fonts.bold,
    fontSize: 14,
    color: "#2E7D32",
  },

  // 제출 버튼
  submitButton: {
    backgroundColor: "#2E7D32",
    paddingVertical: 11,
    borderRadius: 8,
    alignItems: "center",
  },
  submitButtonText: {
    fontFamily: Fonts.bold,
    fontSize: 13,
    color: "#fff",
  },

  // 모달
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  modalTitle: {
    fontFamily: Fonts.bold,
    fontSize: 15,
    color: "#1A1A1A",
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },

  // 날짜 그리드
  dateGrid: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
  },
  dateOption: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    backgroundColor: "#fff",
    alignItems: "center",
  },
  dateOptionActive: {
    backgroundColor: "#2E7D32",
    borderColor: "#2E7D32",
  },
  dateOptionText: {
    fontFamily: Fonts.medium,
    fontSize: 13,
    color: "#666",
  },
  dateOptionTextActive: {
    color: "#fff",
  },

  // 시간 그리드
  timeGrid: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  timeOption: {
    width: "23%",
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    backgroundColor: "#fff",
    alignItems: "center",
  },
  timeOptionActive: {
    backgroundColor: "#2E7D32",
    borderColor: "#2E7D32",
  },
  timeOptionText: {
    fontFamily: Fonts.medium,
    fontSize: 12,
    color: "#666",
  },
  timeOptionTextActive: {
    color: "#fff",
  },
});
