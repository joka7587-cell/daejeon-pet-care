/**
 * 주변 반려 인프라 화면
 * 
 * Phase 66 수정사항:
 * - 상단 40% 카카오맵 + 하단 60% 리스트 레이아웃
 * - 카테고리별 커스텀 마커 (병원=빨간 십자, 카페=노란 커피잔 등)
 * - kakao.maps.LatLngBounds 자동 영역 조정
 * - 인포윈도우 (장소명, 평점, 영업 여부)
 * - 리스트 클릭 시 panTo + 마커 강조(Bounce)
 * - map.relayout() 호출 및 대전 중심 초기 뷰
 */
import React, { useState, useMemo, useCallback, useRef, useEffect } from "react";
import {
  View, Text, ScrollView, FlatList, Pressable, TextInput, Linking,
  StyleSheet, Platform, Alert, Dimensions, ActivityIndicator,
} from "react-native";
import { WebView } from "react-native-webview";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { Fonts } from "@/hooks/use-fonts";
import * as Haptics from "expo-haptics";
import { getApiBaseUrl } from "@/constants/oauth";
import {
  DAEJEON_FACILITIES, CATEGORY_LABELS, CATEGORY_ICONS,
  generateTimeSlots,
  type PetFacility, type FacilityCategory, type Reservation, type TimeSlot,
} from "@/lib/solo-care-data";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");
const MAP_HEIGHT = Math.round(SCREEN_H * 0.4);
const accentColor = "#2E7D32";
const bgColor = "#F8F8F8";
const borderColor = "#E8E8E8";
const textPrimary = "#1A1A1A";
const textSecondary = "#8E8E93";

// 카테고리별 마커 색상/이모지
const MARKER_STYLES: Record<FacilityCategory, { color: string; emoji: string; label: string }> = {
  hospital: { color: "#E53935", emoji: "🏥", label: "병원" },
  shop:     { color: "#1E88E5", emoji: "🛍️", label: "용품점" },
  cafe:     { color: "#F9A825", emoji: "☕", label: "카페" },
  grooming: { color: "#8E24AA", emoji: "✂️", label: "미용실" },
};

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
  const webviewRef = useRef<WebView>(null);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [mapLoadFailed, setMapLoadFailed] = useState(false);
  const [mapReady, setMapReady] = useState(false);

  const [selectedCategory, setSelectedCategory] = useState<FacilityCategory | "all">("all");
  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set());
  const [searchText, setSearchText] = useState("");
  const [selectedFacility, setSelectedFacility] = useState<PetFacility | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedSlot, setSelectedSlot] = useState<string>("");
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [showBooking, setShowBooking] = useState(false);

  // API 키 가져오기 (실패 시 폴백 키 사용)
  useEffect(() => {
    const FALLBACK_KEY = "bacaa8f1d9ab392f51dce2e886e5e15b";
    const fetchKey = async () => {
      try {
        const baseUrl = getApiBaseUrl();
        if (!baseUrl) { setApiKey(FALLBACK_KEY); return; }
        const res = await fetch(`${baseUrl}/api/kakao-map-key`);
        if (!res.ok) { setApiKey(FALLBACK_KEY); return; }
        const data = await res.json();
        if (data.key) { setApiKey(data.key); }
        else { setApiKey(FALLBACK_KEY); }
      } catch (e) {
        console.warn("[Facilities] API key fetch error:", e);
        setApiKey(FALLBACK_KEY);
      }
    };
    fetchKey();
    const timeout = setTimeout(() => {
      setApiKey((prev) => prev || FALLBACK_KEY);
    }, 5000);
    return () => clearTimeout(timeout);
  }, []);

  // 날짜 옵션
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

  // 카테고리 변경 시 지도 마커 업데이트
  useEffect(() => {
    if (!mapReady || !webviewRef.current) return;
    const markersJSON = JSON.stringify(filteredFacilities.map(f => ({
      id: f.id,
      name: f.name,
      lat: f.lat,
      lng: f.lng,
      category: f.category,
      rating: f.rating,
      openHours: f.openHours,
      is24h: f.is24h,
      address: f.address,
    })));
    webviewRef.current.injectJavaScript(`
      if(typeof updateMarkers === 'function') { updateMarkers(${markersJSON}); }
      true;
    `);
  }, [filteredFacilities, mapReady]);

  // 리스트 아이템 클릭 시 지도 이동
  const handleFocusOnMap = useCallback((facility: PetFacility) => {
    if (!mapReady || !webviewRef.current) return;
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    webviewRef.current.injectJavaScript(`
      if(typeof focusMarker === 'function') { focusMarker('${facility.id}', ${facility.lat}, ${facility.lng}); }
      true;
    `);
  }, [mapReady]);

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

  const timeSlots = useMemo(() => {
    if (!selectedFacility) return [];
    const openH = parseInt(selectedFacility.openHours.split(":")[0]) || 9;
    const closeStr = selectedFacility.openHours.split("-")[1] || "18:00";
    const closeH = parseInt(closeStr.split(":")[0]) || 18;
    return generateTimeSlots(openH, closeH, 30);
  }, [selectedFacility]);

  // WebView 메시지 핸들러
  const handleWebViewMessage = useCallback((event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === "ready") {
        setMapReady(true);
      } else if (data.type === "markerClick") {
        const facility = DAEJEON_FACILITIES.find(f => f.id === data.id);
        if (facility) handleBook(facility);
      }
    } catch (e) {
      // ignore
    }
  }, [handleBook]);

  // 카카오맵 HTML 생성
  const generateMapHTML = useCallback((key: string) => {
    const initialMarkers = JSON.stringify(filteredFacilities.map(f => ({
      id: f.id,
      name: f.name,
      lat: f.lat,
      lng: f.lng,
      category: f.category,
      rating: f.rating,
      openHours: f.openHours,
      is24h: f.is24h,
      address: f.address,
    })));

    const markerStylesJSON = JSON.stringify(MARKER_STYLES);

    return `<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0,user-scalable=no">
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body,#map{width:100%;height:100%}
.marker-pin{display:flex;align-items:center;justify-content:center;width:36px;height:36px;border-radius:50%;border:3px solid #FFF;box-shadow:0 2px 8px rgba(0,0,0,.25);font-size:16px;cursor:pointer;transition:transform .2s}
.marker-pin:hover{transform:scale(1.2)}
.marker-pin.bounce{animation:bounce .6s ease}
@keyframes bounce{0%,100%{transform:translateY(0)}30%{transform:translateY(-12px)}60%{transform:translateY(-4px)}}
.info-popup{padding:10px 12px;border-radius:10px;background:#FFF;box-shadow:0 4px 14px rgba(0,0,0,.12);min-width:180px;font-family:-apple-system,sans-serif}
.info-popup .name{font-size:13px;font-weight:700;color:#1A1A1A;margin-bottom:3px}
.info-popup .addr{font-size:11px;color:#8E8E93;margin-bottom:3px}
.info-popup .meta{display:flex;gap:6px;align-items:center;font-size:11px;color:#555}
.info-popup .badge{display:inline-block;padding:2px 6px;border-radius:8px;font-size:9px;font-weight:600;color:#FFF;margin-left:4px}
.toast{position:fixed;top:10px;left:50%;transform:translateX(-50%);background:rgba(46,125,50,.9);color:#FFF;padding:8px 16px;border-radius:20px;font-size:12px;z-index:9999;display:none;font-family:-apple-system,sans-serif}
</style>
</head><body>
<div id="map"></div>
<div id="toast" class="toast"></div>
<script src="https://dapi.kakao.com/v2/maps/sdk.js?appkey=${key}&autoload=false"
  onerror="document.getElementById('map').innerHTML='<div style=\\'padding:20px;text-align:center;color:#999\\'>지도 로드 실패</div>'">
</script>
<script>
var map, markers = [], overlays = [], activeInfoWindow = null;
var markerStyles = ${markerStylesJSON};

function showToast(msg) {
  var t = document.getElementById('toast');
  t.textContent = msg;
  t.style.display = 'block';
  setTimeout(function(){ t.style.display = 'none'; }, 1500);
}

if(typeof kakao === 'undefined' || !kakao.maps){
  document.getElementById('map').innerHTML = '<div style="padding:20px;text-align:center;color:#999">카카오맵 로드 실패</div>';
} else {
  kakao.maps.load(function(){
    var container = document.getElementById('map');
    map = new kakao.maps.Map(container, {
      center: new kakao.maps.LatLng(36.3504, 127.3845),
      level: 5
    });
    map.addControl(new kakao.maps.ZoomControl(), kakao.maps.ControlPosition.RIGHT);
    
    setTimeout(function(){
      map.relayout();
      map.setCenter(new kakao.maps.LatLng(36.3504, 127.3845));
    }, 300);

    var initialData = ${initialMarkers};
    updateMarkers(initialData);

    if(window.ReactNativeWebView){
      window.ReactNativeWebView.postMessage(JSON.stringify({type:'ready'}));
    }
  });
}

function clearMarkers() {
  markers.forEach(function(m){ m.setMap(null); });
  overlays.forEach(function(o){ o.setMap(null); });
  markers = [];
  overlays = [];
  if(activeInfoWindow) { activeInfoWindow.setMap(null); activeInfoWindow = null; }
}

function updateMarkers(data) {
  if(!map) return;
  clearMarkers();
  
  if(data.length === 0) return;
  
  var bounds = new kakao.maps.LatLngBounds();
  
  data.forEach(function(item) {
    var pos = new kakao.maps.LatLng(item.lat, item.lng);
    bounds.extend(pos);
    
    var style = markerStyles[item.category] || { color: '#999', emoji: '📍', label: '' };
    
    // 커스텀 마커 오버레이
    var el = document.createElement('div');
    el.className = 'marker-pin';
    el.id = 'marker-' + item.id;
    el.style.background = style.color;
    el.textContent = style.emoji;
    
    var markerOverlay = new kakao.maps.CustomOverlay({
      position: pos,
      content: el,
      map: map,
      yAnchor: 0.5
    });
    overlays.push(markerOverlay);
    
    // 인포윈도우 내용
    var openStatus = item.is24h ? '24시간 영업' : item.openHours;
    var safeName = item.name.replace(/'/g, '');
    var safeAddr = item.address.replace(/'/g, '');
    
    var infoContent = '<div class="info-popup">'
      + '<div class="name">' + style.emoji + ' ' + safeName + '</div>'
      + '<div class="addr">' + safeAddr + '</div>'
      + '<div class="meta">'
      + '<span>⭐ ' + item.rating.toFixed(1) + '</span>'
      + '<span>🕐 ' + openStatus + '</span>'
      + (item.is24h ? '<span class="badge" style="background:#E53935">24H</span>' : '')
      + '</div></div>';
    
    var infoWindow = new kakao.maps.CustomOverlay({
      position: pos,
      content: infoContent,
      yAnchor: 1.5,
      zIndex: 10
    });
    
    el.addEventListener('click', function(){
      if(activeInfoWindow) activeInfoWindow.setMap(null);
      infoWindow.setMap(map);
      activeInfoWindow = infoWindow;
      map.panTo(pos);
      
      // bounce 애니메이션
      el.classList.remove('bounce');
      void el.offsetWidth;
      el.classList.add('bounce');
      
      if(window.ReactNativeWebView){
        window.ReactNativeWebView.postMessage(JSON.stringify({type:'markerClick', id: item.id}));
      }
    });
    
    // 투명 마커 (클릭 영역용)
    var invisibleMarker = new kakao.maps.Marker({
      position: pos,
      map: map,
      clickable: true,
      visible: false
    });
    markers.push(invisibleMarker);
  });
  
  if(data.length > 1) {
    map.setBounds(bounds, 50, 50, 50, 50);
  } else if(data.length === 1) {
    map.setCenter(new kakao.maps.LatLng(data[0].lat, data[0].lng));
    map.setLevel(3);
  }
}

function focusMarker(id, lat, lng) {
  if(!map) return;
  var pos = new kakao.maps.LatLng(lat, lng);
  map.setLevel(3);
  map.panTo(pos);
  
  // 해당 마커 bounce
  var el = document.getElementById('marker-' + id);
  if(el) {
    el.classList.remove('bounce');
    void el.offsetWidth;
    el.classList.add('bounce');
    el.click();
  }
  showToast('위치로 이동합니다');
}
</script>
</body></html>`;
  }, [filteredFacilities]);

  // 시설 카드 렌더
  const renderFacilityCard = useCallback(({ item }: { item: PetFacility }) => {
    const markerStyle = MARKER_STYLES[item.category];
    return (
      <Pressable
        style={({ pressed }) => [styles.facilityCard, pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }]}
        onPress={() => handleFocusOnMap(item)}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.cardIconCircle, { backgroundColor: markerStyle.color + "20" }]}>
            <Text style={styles.cardIcon}>{markerStyle.emoji}</Text>
          </View>
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
        </View>

        <View style={styles.cardActions}>
          <Pressable
            style={({ pressed }) => [styles.callBtn, pressed && { opacity: 0.7 }]}
            onPress={() => handleCall(item.phone)}
          >
            <Text style={styles.callBtnText}>📞 전화</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.mapBtn, pressed && { opacity: 0.7 }]}
            onPress={() => handleFocusOnMap(item)}
          >
            <Text style={styles.mapBtnText}>📍 지도</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.bookBtn, pressed && { opacity: 0.7 }]}
            onPress={() => handleBook(item)}
          >
            <Text style={styles.bookBtnText}>📅 예약</Text>
          </Pressable>
        </View>
      </Pressable>
    );
  }, [handleBook, handleCall, handleFocusOnMap]);

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
      <View style={styles.container}>
        {/* 헤더 */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={({ pressed }) => [pressed && { opacity: 0.6 }]}>
            <Text style={styles.backBtn}>← 뒤로</Text>
          </Pressable>
          <Text style={styles.headerTitle}>주변 반려 인프라</Text>
          <View style={{ width: 50 }} />
        </View>

        {/* 상단 40% 카카오맵 */}
        <View style={styles.mapContainer}>
          {apiKey ? (
            <>
              <WebView
                ref={webviewRef}
                source={{ html: generateMapHTML(apiKey) }}
                style={styles.webview}
                javaScriptEnabled
                domStorageEnabled
                scrollEnabled={false}
                onMessage={handleWebViewMessage}
                originWhitelist={["*"]}
                mixedContentMode="always"
              />
              {!mapReady && (
                <View style={styles.mapLoading}>
                  <ActivityIndicator size="large" color={accentColor} />
                  <Text style={styles.mapLoadingText}>지도 로딩 중...</Text>
                </View>
              )}
            </>
          ) : mapLoadFailed ? (
            <View style={styles.mapFallback}>
              <Text style={styles.mapFallbackIcon}>🗺️</Text>
              <Text style={styles.mapFallbackText}>지도를 불러올 수 없습니다</Text>
              <Text style={styles.mapFallbackSub}>리스트에서 장소를 확인해주세요</Text>
            </View>
          ) : (
            <View style={styles.mapLoading}>
              <ActivityIndicator size="large" color={accentColor} />
              <Text style={styles.mapLoadingText}>지도 준비 중...</Text>
            </View>
          )}
        </View>

        {/* 하단 60% 리스트 영역 */}
        <View style={styles.listContainer}>
          <FlatList
            data={filteredFacilities}
            keyExtractor={item => item.id}
            renderItem={renderFacilityCard}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={
              <>
                {/* 카테고리 탭 */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryRow} contentContainerStyle={{ paddingVertical: 8 }}>
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
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={{ paddingBottom: 4 }}>
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

                {/* 예약 현황 */}
                {reservations.length > 0 && (
                  <View style={styles.reservationBanner}>
                    <Text style={styles.reservationBannerText}>📋 예약 {reservations.length}건 | 다음: {reservations[reservations.length - 1].facilityName}</Text>
                  </View>
                )}

                {/* 결과 수 */}
                <View style={styles.resultCount}>
                  <Text style={styles.resultCountText}>검색 결과 {filteredFacilities.length}곳</Text>
                </View>
              </>
            }
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>🔍</Text>
                <Text style={styles.emptyText}>조건에 맞는 시설이 없습니다</Text>
                <Text style={styles.emptySubtext}>필터를 변경해보세요</Text>
              </View>
            }
          />
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 10 },
  headerTitle: { fontFamily: Fonts.bold, fontSize: 18, color: textPrimary },
  backBtn: { fontFamily: Fonts.semiBold, fontSize: 16, color: accentColor },

  // 지도 영역 (40%)
  mapContainer: { height: MAP_HEIGHT, width: "100%", backgroundColor: "#F0F0F0", borderBottomWidth: 1, borderBottomColor: borderColor, position: "relative", zIndex: 1 },
  webview: { flex: 1 },
  mapLoading: { ...StyleSheet.absoluteFillObject, justifyContent: "center", alignItems: "center", backgroundColor: "#F8F8F8" },
  mapLoadingText: { fontFamily: Fonts.medium, fontSize: 13, color: textSecondary, marginTop: 8 },
  mapFallback: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#F8F8F8" },
  mapFallbackIcon: { fontSize: 40, marginBottom: 8 },
  mapFallbackText: { fontFamily: Fonts.semiBold, fontSize: 14, color: textSecondary },
  mapFallbackSub: { fontFamily: Fonts.regular, fontSize: 12, color: textSecondary, marginTop: 4 },

  // 리스트 영역 (60%)
  listContainer: { flex: 1 },

  categoryRow: { maxHeight: 48 },
  categoryChip: { flexDirection: "row", alignItems: "center", backgroundColor: bgColor, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, marginRight: 8, borderWidth: 1, borderColor: borderColor },
  categoryChipActive: { backgroundColor: accentColor, borderColor: accentColor },
  categoryIcon: { fontSize: 14, marginRight: 4 },
  categoryLabel: { fontFamily: Fonts.medium, fontSize: 13, color: textSecondary },
  categoryLabelActive: { color: "#FFFFFF" },
  filterRow: { maxHeight: 36, marginBottom: 6 },
  filterChip: { backgroundColor: "#FFF", borderWidth: 1, borderColor: borderColor, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6, marginRight: 6 },
  filterChipActive: { backgroundColor: accentColor + "20", borderColor: accentColor },
  filterLabel: { fontFamily: Fonts.medium, fontSize: 12, color: textSecondary },
  filterLabelActive: { color: accentColor },
  searchRow: { marginBottom: 6 },
  searchInput: { backgroundColor: bgColor, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 8, fontFamily: Fonts.regular, fontSize: 14, color: textPrimary, borderWidth: 1, borderColor: borderColor },
  reservationBanner: { backgroundColor: accentColor + "15", borderRadius: 10, padding: 10, marginBottom: 6 },
  reservationBannerText: { fontFamily: Fonts.medium, fontSize: 12, color: accentColor },
  resultCount: { marginBottom: 6 },
  resultCountText: { fontFamily: Fonts.medium, fontSize: 12, color: textSecondary },

  // 시설 카드
  facilityCard: { backgroundColor: "#FFFFFF", borderRadius: 12, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: borderColor },
  cardHeader: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  cardIconCircle: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", marginRight: 10 },
  cardIcon: { fontSize: 20 },
  cardTitleArea: { flex: 1 },
  cardTitleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  cardName: { fontFamily: Fonts.bold, fontSize: 15, color: textPrimary, flex: 1 },
  soloBadge: { backgroundColor: accentColor + "20", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  soloBadgeText: { fontFamily: Fonts.semiBold, fontSize: 10, color: accentColor },
  cardAddress: { fontFamily: Fonts.regular, fontSize: 12, color: textSecondary, marginTop: 2 },
  cardInfo: { marginBottom: 8 },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 3 },
  infoLabel: { fontFamily: Fonts.medium, fontSize: 13, color: textPrimary },
  infoSub: { fontFamily: Fonts.regular, fontSize: 12, color: textSecondary },
  badge24h: { backgroundColor: "#FFEBEE", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 1, overflow: "hidden", fontFamily: Fonts.semiBold, fontSize: 10, color: "#E53935" },
  cardActions: { flexDirection: "row", gap: 8 },
  callBtn: { flex: 1, backgroundColor: bgColor, borderRadius: 8, paddingVertical: 8, alignItems: "center", borderWidth: 1, borderColor: borderColor },
  callBtnText: { fontFamily: Fonts.semiBold, fontSize: 12, color: textPrimary },
  mapBtn: { flex: 1, backgroundColor: "#E3F2FD", borderRadius: 8, paddingVertical: 8, alignItems: "center", borderWidth: 1, borderColor: "#90CAF9" },
  mapBtnText: { fontFamily: Fonts.semiBold, fontSize: 12, color: "#1565C0" },
  bookBtn: { flex: 1, backgroundColor: accentColor, borderRadius: 8, paddingVertical: 8, alignItems: "center" },
  bookBtnText: { fontFamily: Fonts.semiBold, fontSize: 12, color: "#FFFFFF" },

  // 예약 모달
  bookingContainer: { flex: 1, padding: 16 },
  bookingHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 },
  bookingTitle: { fontFamily: Fonts.bold, fontSize: 18, color: textPrimary },
  bookingFacility: { alignItems: "center", marginBottom: 24 },
  bookingFacilityIcon: { fontSize: 48, marginBottom: 8 },
  bookingFacilityName: { fontFamily: Fonts.bold, fontSize: 20, color: textPrimary },
  bookingFacilityAddr: { fontFamily: Fonts.regular, fontSize: 13, color: textSecondary, marginTop: 4 },
  sectionLabel: { fontFamily: Fonts.semiBold, fontSize: 15, color: textPrimary, marginBottom: 12, marginTop: 8 },
  dateRow: { marginBottom: 16, maxHeight: 70 },
  dateChip: { alignItems: "center", backgroundColor: bgColor, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10, marginRight: 8, minWidth: 60, borderWidth: 1, borderColor: borderColor },
  dateChipActive: { backgroundColor: accentColor, borderColor: accentColor },
  dateChipLabel: { fontFamily: Fonts.semiBold, fontSize: 14, color: textPrimary },
  dateChipLabelActive: { color: "#FFFFFF" },
  dateChipDay: { fontFamily: Fonts.regular, fontSize: 11, color: textSecondary, marginTop: 2 },
  dateChipDayActive: { color: "#A5D6A7" },
  slotGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 24 },
  slotChip: { backgroundColor: bgColor, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, minWidth: 60, alignItems: "center", borderWidth: 1, borderColor: borderColor },
  slotActive: { backgroundColor: accentColor, borderColor: accentColor },
  slotUnavailable: { backgroundColor: "#FAFAFA", opacity: 0.5 },
  slotText: { fontFamily: Fonts.medium, fontSize: 12, color: textPrimary },
  slotTextActive: { color: "#FFFFFF" },
  slotTextUnavailable: { color: borderColor },
  slotBooked: { fontFamily: Fonts.regular, fontSize: 9, color: "#E53935", marginTop: 2 },
  confirmBtn: { backgroundColor: accentColor, borderRadius: 12, paddingVertical: 14, alignItems: "center", marginTop: 12 },
  confirmBtnDisabled: { backgroundColor: borderColor },
  confirmBtnText: { fontFamily: Fonts.bold, fontSize: 15, color: "#FFFFFF" },
  emptyState: { alignItems: "center", paddingTop: 40 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontFamily: Fonts.semiBold, fontSize: 16, color: textSecondary },
  emptySubtext: { fontFamily: Fonts.regular, fontSize: 13, color: textSecondary, marginTop: 4 },
});
