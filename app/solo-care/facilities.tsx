import React, { useState, useMemo, useCallback, useRef } from "react";
import {
  View, Text, ScrollView, FlatList, Pressable, TextInput, Linking,
  StyleSheet, Platform, Alert, Dimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { Fonts } from "@/hooks/use-fonts";
import {
  DAEJEON_FACILITIES, CATEGORY_LABELS, CATEGORY_ICONS,
  generateTimeSlots,
  type PetFacility, type FacilityCategory, type Reservation, type TimeSlot,
} from "@/lib/solo-care-data";

const { width: SCREEN_W } = Dimensions.get("window");

const CATEGORIES: { key: FacilityCategory | "all"; label: string; icon: string }[] = [
  { key: "all", label: "전체", icon: "📍" },
  { key: "hospital", label: "동물병원", icon: "🏥" },
  { key: "shop", label: "용품점", icon: "🛍️" },
  { key: "cafe", label: "애견카페", icon: "☕" },
  { key: "grooming", label: "미용실", icon: "✂️" },
];

const FILTERS = [
  { key: "is24h", label: "24시간" },
  { key: "soloRecommended", label: "1인가구 추천" },
  { key: "parkingAvailable", label: "주차 가능" },
  { key: "emergencyAvailable", label: "응급 진료" },
] as const;

export default function FacilitiesScreen() {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState<FacilityCategory | "all">("all");
  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set());
  const [searchText, setSearchText] = useState("");
  const [selectedFacility, setSelectedFacility] = useState<PetFacility | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedSlot, setSelectedSlot] = useState<string>("");
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [showBooking, setShowBooking] = useState(false);

  // 날짜 옵션 (오늘부터 7일)
  const dateOptions = useMemo(() => {
    const dates: { label: string; value: string; day: string }[] = [];
    const dayNames = ["일", "월", "화", "수", "목", "금", "토"];
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      dates.push({
        label: i === 0 ? "오늘" : i === 1 ? "내일" : `${mm}/${dd}`,
        value: `${d.getFullYear()}-${mm}-${dd}`,
        day: dayNames[d.getDay()],
      });
    }
    return dates;
  }, []);

  // 필터링된 시설 목록
  const filteredFacilities = useMemo(() => {
    let list = DAEJEON_FACILITIES;
    if (selectedCategory !== "all") {
      list = list.filter(f => f.category === selectedCategory);
    }
    if (activeFilters.size > 0) {
      list = list.filter(f => {
        for (const filter of activeFilters) {
          if (!(f as any)[filter]) return false;
        }
        return true;
      });
    }
    if (searchText.trim()) {
      const q = searchText.trim().toLowerCase();
      list = list.filter(f =>
        f.name.toLowerCase().includes(q) ||
        f.address.toLowerCase().includes(q) ||
        f.district.includes(q) ||
        f.dong.includes(q)
      );
    }
    return list;
  }, [selectedCategory, activeFilters, searchText]);

  const toggleFilter = useCallback((key: string) => {
    setActiveFilters(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const handleCall = useCallback((phone: string) => {
    if (Platform.OS === "web") {
      Alert.alert("전화 연결", phone);
    } else {
      Linking.openURL(`tel:${phone}`);
    }
  }, []);

  const handleBook = useCallback((facility: PetFacility) => {
    setSelectedFacility(facility);
    setSelectedDate(dateOptions[0].value);
    setSelectedSlot("");
    setShowBooking(true);
  }, [dateOptions]);

  const confirmBooking = useCallback(() => {
    if (!selectedFacility || !selectedDate || !selectedSlot) return;
    const newRes: Reservation = {
      id: `res_${Date.now()}`,
      facilityId: selectedFacility.id,
      facilityName: selectedFacility.name,
      date: selectedDate,
      timeSlot: selectedSlot,
      petName: "우리 아이",
      service: selectedFacility.category === "grooming" ? "기본 미용" : "건강 검진",
      status: "confirmed",
      createdAt: new Date().toISOString(),
    };
    setReservations(prev => [...prev, newRes]);
    setShowBooking(false);
    Alert.alert("예약 완료", `${selectedFacility.name}\n${selectedDate} ${selectedSlot}\n예약이 확정되었습니다.`);
  }, [selectedFacility, selectedDate, selectedSlot]);

  // 시간 슬롯 생성
  const timeSlots = useMemo(() => {
    if (!selectedFacility) return [];
    const openH = parseInt(selectedFacility.openHours.split(":")[0]) || 9;
    const closeStr = selectedFacility.openHours.split("-")[1] || "18:00";
    const closeH = parseInt(closeStr.split(":")[0]) || 18;
    return generateTimeSlots(openH, closeH, 30);
  }, [selectedFacility]);

  const renderFacilityCard = useCallback(({ item }: { item: PetFacility }) => (
    <Pressable
      style={({ pressed }) => [styles.facilityCard, pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }]}
      onPress={() => handleBook(item)}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.cardIcon}>{CATEGORY_ICONS[item.category]}</Text>
        <View style={styles.cardTitleArea}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
            {item.soloRecommended && (
              <View style={styles.soloBadge}>
                <Text style={styles.soloBadgeText}>1인가구 추천</Text>
              </View>
            )}
          </View>
          <Text style={styles.cardAddress} numberOfLines={1}>{item.address}</Text>
        </View>
      </View>

      <View style={styles.cardInfo}>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>⭐ {item.rating.toFixed(1)}</Text>
          <Text style={styles.infoSub}>리뷰 {item.reviewCount}개</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>🕐 {item.openHours}</Text>
          {item.is24h && <Text style={styles.badge24h}>24시간</Text>}
        </View>
        {item.closedDay && (
          <Text style={styles.closedDay}>휴무: {item.closedDay}</Text>
        )}
      </View>

      <View style={styles.cardTags}>
        {item.services.slice(0, 4).map((s, i) => (
          <View key={i} style={styles.serviceTag}>
            <Text style={styles.serviceTagText}>{s}</Text>
          </View>
        ))}
        {item.services.length > 4 && (
          <Text style={styles.moreTag}>+{item.services.length - 4}</Text>
        )}
      </View>

      <View style={styles.cardActions}>
        <Pressable
          style={({ pressed }) => [styles.callBtn, pressed && { opacity: 0.7 }]}
          onPress={() => handleCall(item.phone)}
        >
          <Text style={styles.callBtnText}>📞 전화</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.bookBtn, pressed && { opacity: 0.7 }]}
          onPress={() => handleBook(item)}
        >
          <Text style={styles.bookBtnText}>📅 예약하기</Text>
        </Pressable>
      </View>
    </Pressable>
  ), [handleBook, handleCall]);

  // 예약 모달
  if (showBooking && selectedFacility) {
    return (
      <ScreenContainer>
        <ScrollView style={styles.bookingContainer} contentContainerStyle={{ paddingBottom: 40 }}>
          <View style={styles.bookingHeader}>
            <Pressable onPress={() => setShowBooking(false)} style={({ pressed }) => [pressed && { opacity: 0.6 }]}>
              <Text style={styles.backBtn}>← 뒤로</Text>
            </Pressable>
            <Text style={styles.bookingTitle}>예약하기</Text>
            <View style={{ width: 50 }} />
          </View>

          <View style={styles.bookingFacility}>
            <Text style={styles.bookingFacilityIcon}>{CATEGORY_ICONS[selectedFacility.category]}</Text>
            <Text style={styles.bookingFacilityName}>{selectedFacility.name}</Text>
            <Text style={styles.bookingFacilityAddr}>{selectedFacility.address}</Text>
          </View>

          {/* 날짜 선택 */}
          <Text style={styles.sectionLabel}>📅 날짜 선택</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dateRow}>
            {dateOptions.map(d => (
              <Pressable
                key={d.value}
                style={[styles.dateChip, selectedDate === d.value && styles.dateChipActive]}
                onPress={() => { setSelectedDate(d.value); setSelectedSlot(""); }}
              >
                <Text style={[styles.dateChipLabel, selectedDate === d.value && styles.dateChipLabelActive]}>{d.label}</Text>
                <Text style={[styles.dateChipDay, selectedDate === d.value && styles.dateChipDayActive]}>{d.day}</Text>
              </Pressable>
            ))}
          </ScrollView>

          {/* 시간 선택 */}
          <Text style={styles.sectionLabel}>🕐 시간 선택</Text>
          <View style={styles.slotGrid}>
            {timeSlots.map(slot => (
              <Pressable
                key={slot.id}
                style={[
                  styles.slotChip,
                  !slot.isAvailable && styles.slotUnavailable,
                  selectedSlot === slot.time && styles.slotActive,
                ]}
                onPress={() => slot.isAvailable && setSelectedSlot(slot.time)}
                disabled={!slot.isAvailable}
              >
                <Text style={[
                  styles.slotText,
                  !slot.isAvailable && styles.slotTextUnavailable,
                  selectedSlot === slot.time && styles.slotTextActive,
                ]}>{slot.time}</Text>
                {!slot.isAvailable && <Text style={styles.slotBooked}>마감</Text>}
              </Pressable>
            ))}
          </View>

          {/* 예약 확인 */}
          <Pressable
            style={[styles.confirmBtn, (!selectedDate || !selectedSlot) && styles.confirmBtnDisabled]}
            onPress={confirmBooking}
            disabled={!selectedDate || !selectedSlot}
          >
            <Text style={styles.confirmBtnText}>
              {selectedDate && selectedSlot ? `${selectedDate} ${selectedSlot} 예약 확정` : "날짜와 시간을 선택해주세요"}
            </Text>
          </Pressable>
        </ScrollView>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={({ pressed }) => [pressed && { opacity: 0.6 }]}>
          <Text style={styles.backBtn}>← 뒤로</Text>
        </Pressable>
        <Text style={styles.headerTitle}>주변 반려 인프라</Text>
        <View style={{ width: 50 }} />
      </View>

      {/* 마이크로카피 */}
      <View style={styles.microCopy}>
        <Text style={styles.microCopyText}>🐾 혼자서도 걱정 마세요! 대전의 검증된 반려 인프라를 한눈에</Text>
      </View>

      {/* 검색 */}
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="장소명, 주소, 동네로 검색..."
          placeholderTextColor="#999"
          value={searchText}
          onChangeText={setSearchText}
          returnKeyType="search"
        />
      </View>

      {/* 카테고리 탭 */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryRow} contentContainerStyle={{ paddingHorizontal: 16 }}>
        {CATEGORIES.map(cat => (
          <Pressable
            key={cat.key}
            style={[styles.categoryChip, selectedCategory === cat.key && styles.categoryChipActive]}
            onPress={() => setSelectedCategory(cat.key)}
          >
            <Text style={styles.categoryIcon}>{cat.icon}</Text>
            <Text style={[styles.categoryLabel, selectedCategory === cat.key && styles.categoryLabelActive]}>{cat.label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* 필터 */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={{ paddingHorizontal: 16 }}>
        {FILTERS.map(f => (
          <Pressable
            key={f.key}
            style={[styles.filterChip, activeFilters.has(f.key) && styles.filterChipActive]}
            onPress={() => toggleFilter(f.key)}
          >
            <Text style={[styles.filterLabel, activeFilters.has(f.key) && styles.filterLabelActive]}>{f.label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* 예약 현황 배너 */}
      {reservations.length > 0 && (
        <View style={styles.reservationBanner}>
          <Text style={styles.reservationBannerText}>📋 예약 {reservations.length}건 | 다음 예약: {reservations[reservations.length - 1].facilityName} {reservations[reservations.length - 1].timeSlot}</Text>
        </View>
      )}

      {/* 결과 수 */}
      <View style={styles.resultCount}>
        <Text style={styles.resultCountText}>검색 결과 {filteredFacilities.length}곳</Text>
      </View>

      {/* 시설 목록 */}
      <FlatList
        data={filteredFacilities}
        keyExtractor={item => item.id}
        renderItem={renderFacilityCard}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🔍</Text>
            <Text style={styles.emptyText}>조건에 맞는 시설이 없습니다</Text>
            <Text style={styles.emptySubtext}>필터를 변경해보세요</Text>
          </View>
        }
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12 },
  headerTitle: { fontFamily: Fonts.bold, fontSize: 18, color: "#1A1A1A" },
  backBtn: { fontFamily: Fonts.semiBold, fontSize: 16, color: "#2E7D32" },
  microCopy: { backgroundColor: "#E8F5E9", marginHorizontal: 16, borderRadius: 12, padding: 12, marginBottom: 8 },
  microCopyText: { fontFamily: Fonts.medium, fontSize: 13, color: "#2E7D32", textAlign: "center" },
  searchRow: { paddingHorizontal: 16, marginBottom: 8 },
  searchInput: { backgroundColor: "#F5F5F5", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10, fontFamily: Fonts.regular, fontSize: 14, color: "#1A1A1A" },
  categoryRow: { marginBottom: 8, maxHeight: 44 },
  categoryChip: { flexDirection: "row", alignItems: "center", backgroundColor: "#F5F5F5", borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, marginRight: 8 },
  categoryChipActive: { backgroundColor: "#2E7D32" },
  categoryIcon: { fontSize: 14, marginRight: 4 },
  categoryLabel: { fontFamily: Fonts.medium, fontSize: 13, color: "#666" },
  categoryLabelActive: { color: "#FFF" },
  filterRow: { marginBottom: 8, maxHeight: 36 },
  filterChip: { backgroundColor: "#FFF", borderWidth: 1, borderColor: "#E0E0E0", borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6, marginRight: 6 },
  filterChipActive: { backgroundColor: "#FFF8E1", borderColor: "#FFC107" },
  filterLabel: { fontFamily: Fonts.medium, fontSize: 12, color: "#888" },
  filterLabelActive: { color: "#F57F17" },
  reservationBanner: { backgroundColor: "#E3F2FD", marginHorizontal: 16, borderRadius: 10, padding: 10, marginBottom: 8 },
  reservationBannerText: { fontFamily: Fonts.medium, fontSize: 12, color: "#1565C0" },
  resultCount: { paddingHorizontal: 16, marginBottom: 8 },
  resultCountText: { fontFamily: Fonts.medium, fontSize: 12, color: "#999" },
  facilityCard: { backgroundColor: "#FFF", borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: "#F0F0F0", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  cardHeader: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  cardIcon: { fontSize: 32, marginRight: 12 },
  cardTitleArea: { flex: 1 },
  cardTitleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  cardName: { fontFamily: Fonts.bold, fontSize: 16, color: "#1A1A1A", flex: 1 },
  soloBadge: { backgroundColor: "#E8F5E9", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  soloBadgeText: { fontFamily: Fonts.semiBold, fontSize: 10, color: "#2E7D32" },
  cardAddress: { fontFamily: Fonts.regular, fontSize: 12, color: "#888", marginTop: 2 },
  cardInfo: { marginBottom: 10 },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  infoLabel: { fontFamily: Fonts.medium, fontSize: 13, color: "#333" },
  infoSub: { fontFamily: Fonts.regular, fontSize: 12, color: "#999" },
  badge24h: { backgroundColor: "#FFEBEE", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 1, overflow: "hidden" },
  closedDay: { fontFamily: Fonts.regular, fontSize: 11, color: "#E53935", marginTop: 2 },
  cardTags: { flexDirection: "row", flexWrap: "wrap", gap: 4, marginBottom: 12 },
  serviceTag: { backgroundColor: "#F5F5F5", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  serviceTagText: { fontFamily: Fonts.regular, fontSize: 11, color: "#666" },
  moreTag: { fontFamily: Fonts.medium, fontSize: 11, color: "#999", alignSelf: "center" },
  cardActions: { flexDirection: "row", gap: 8 },
  callBtn: { flex: 1, backgroundColor: "#F5F5F5", borderRadius: 10, paddingVertical: 10, alignItems: "center" },
  callBtnText: { fontFamily: Fonts.semiBold, fontSize: 13, color: "#333" },
  bookBtn: { flex: 1, backgroundColor: "#2E7D32", borderRadius: 10, paddingVertical: 10, alignItems: "center" },
  bookBtnText: { fontFamily: Fonts.semiBold, fontSize: 13, color: "#FFF" },
  // Booking
  bookingContainer: { flex: 1, padding: 16 },
  bookingHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 },
  bookingTitle: { fontFamily: Fonts.bold, fontSize: 18, color: "#1A1A1A" },
  bookingFacility: { alignItems: "center", marginBottom: 24 },
  bookingFacilityIcon: { fontSize: 48, marginBottom: 8 },
  bookingFacilityName: { fontFamily: Fonts.bold, fontSize: 20, color: "#1A1A1A" },
  bookingFacilityAddr: { fontFamily: Fonts.regular, fontSize: 13, color: "#888", marginTop: 4 },
  sectionLabel: { fontFamily: Fonts.semiBold, fontSize: 15, color: "#1A1A1A", marginBottom: 12, marginTop: 8 },
  dateRow: { marginBottom: 16, maxHeight: 70 },
  dateChip: { alignItems: "center", backgroundColor: "#F5F5F5", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10, marginRight: 8, minWidth: 60 },
  dateChipActive: { backgroundColor: "#2E7D32" },
  dateChipLabel: { fontFamily: Fonts.semiBold, fontSize: 14, color: "#333" },
  dateChipLabelActive: { color: "#FFF" },
  dateChipDay: { fontFamily: Fonts.regular, fontSize: 11, color: "#999", marginTop: 2 },
  dateChipDayActive: { color: "#C8E6C9" },
  slotGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 24 },
  slotChip: { backgroundColor: "#F5F5F5", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, minWidth: 70, alignItems: "center" },
  slotActive: { backgroundColor: "#2E7D32" },
  slotUnavailable: { backgroundColor: "#FAFAFA", opacity: 0.5 },
  slotText: { fontFamily: Fonts.medium, fontSize: 13, color: "#333" },
  slotTextActive: { color: "#FFF" },
  slotTextUnavailable: { color: "#CCC" },
  slotBooked: { fontFamily: Fonts.regular, fontSize: 9, color: "#E53935", marginTop: 2 },
  confirmBtn: { backgroundColor: "#2E7D32", borderRadius: 14, paddingVertical: 16, alignItems: "center", marginTop: 8 },
  confirmBtnDisabled: { backgroundColor: "#CCC" },
  confirmBtnText: { fontFamily: Fonts.bold, fontSize: 16, color: "#FFF" },
  // Empty
  emptyState: { alignItems: "center", paddingTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontFamily: Fonts.semiBold, fontSize: 16, color: "#666" },
  emptySubtext: { fontFamily: Fonts.regular, fontSize: 13, color: "#999", marginTop: 4 },
});
