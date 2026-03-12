import React, { useState, useEffect, useCallback } from "react";
import { View, Text, Pressable, StyleSheet, ScrollView, ActivityIndicator, Platform } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useApp, Neighborhood } from "@/lib/app-context";
import { useRouter } from "expo-router";
import { useColors } from "@/hooks/use-colors";
import * as Haptics from "expo-haptics";
import {
  DAEJEON_NEIGHBORHOODS,
  DAEJEON_CENTER,
  getCurrentLocation,
  findNearestNeighborhood,
  calculateDistance,
  formatDistance,
  generateNearbyCoords,
} from "@/lib/location-service";

// 웹 환경에서는 MapView를 동적으로 import
let MapView: any = null;
let Marker: any = null;
let PROVIDER_GOOGLE: any = null;

if (Platform.OS !== "web") {
  try {
    const maps = require("react-native-maps");
    MapView = maps.default;
    Marker = maps.Marker;
    PROVIDER_GOOGLE = maps.PROVIDER_GOOGLE;
  } catch (e) {
    console.warn("react-native-maps not available");
  }
}

function haptic() {
  if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

interface CaretakerMarker {
  id: number;
  userId: number;
  nickname: string;
  rating: number;
  lat: number;
  lng: number;
  distance: number;
  services: string[];
  emoji: string;
}

// 더미 돌보미 데이터 생성
function generateMockCaretakers(
  neighborhood: string,
  userLat: number | null,
  userLng: number | null
): CaretakerMarker[] {
  const center = DAEJEON_NEIGHBORHOODS[neighborhood] || DAEJEON_NEIGHBORHOODS["유성구"];
  const names = [
    { name: "산책쌤 미경", emoji: "👩", services: ["산책 대행", "돌봄"] },
    { name: "강아지 친구 준호", emoji: "👨", services: ["산책 친구", "산책 대행"] },
    { name: "돌봄 전문 지은", emoji: "👩‍🦰", services: ["돌봄", "긴급 돌봄"] },
    { name: "반려 도우미 민수", emoji: "🧑", services: ["산책 대행", "돌봄 교환"] },
    { name: "펫시터 하영", emoji: "👧", services: ["돌봄", "산책 친구"] },
  ];

  return names.map((n, i) => {
    const coords = generateNearbyCoords(center.lat, center.lng, 1.5);
    const dist = userLat && userLng
      ? calculateDistance(userLat, userLng, coords.lat, coords.lng)
      : calculateDistance(center.lat, center.lng, coords.lat, coords.lng);
    return {
      id: i + 1,
      userId: 101 + i,
      nickname: n.name,
      rating: 400 + Math.floor(Math.random() * 100),
      lat: coords.lat,
      lng: coords.lng,
      distance: dist,
      services: n.services,
      emoji: n.emoji,
    };
  }).sort((a, b) => a.distance - b.distance);
}

export default function MapScreen() {
  const router = useRouter();
  const { state, dispatch } = useApp();
  const colors = useColors();
  const [selectedNeighborhood, setSelectedNeighborhood] = useState<string>(state.profile.neighborhood || "유성구");
  const [caretakers, setCaretakers] = useState<CaretakerMarker[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedMarker, setSelectedMarker] = useState<CaretakerMarker | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const isCaretaker = state.profile.role === "caretaker";

  // 현재 위치 가져오기
  const fetchLocation = useCallback(async () => {
    setLocationLoading(true);
    setLocationError(null);
    try {
      const loc = await getCurrentLocation();
      if (loc) {
        setUserLocation(loc);
        // 가장 가까운 동네 자동 감지
        const nearest = findNearestNeighborhood(loc.lat, loc.lng);
        setSelectedNeighborhood(nearest);
        // 프로필 동네도 업데이트 (대전 내 동네인 경우)
        if (DAEJEON_NEIGHBORHOODS[nearest]) {
          dispatch({ type: "SET_NEIGHBORHOOD", payload: nearest as Neighborhood });
        }
      } else {
        setLocationError("위치를 가져올 수 없습니다");
      }
    } catch {
      setLocationError("위치 권한이 필요합니다");
    }
    setLocationLoading(false);
  }, [dispatch]);

  // 돌보미 목록 로드
  const loadCaretakers = useCallback(() => {
    setLoading(true);
    setSelectedMarker(null);
    setTimeout(() => {
      const data = generateMockCaretakers(
        selectedNeighborhood,
        userLocation?.lat ?? null,
        userLocation?.lng ?? null
      );
      setCaretakers(data);
      setLoading(false);
    }, 400);
  }, [selectedNeighborhood, userLocation]);

  useEffect(() => {
    loadCaretakers();
  }, [loadCaretakers]);

  const neighborhoodCoords = DAEJEON_NEIGHBORHOODS[selectedNeighborhood] || DAEJEON_NEIGHBORHOODS["유성구"];

  return (
    <ScreenContainer className="pt-2">
      {/* 헤더 */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.foreground }]}>🗺️ 근처 돌보미</Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Pressable
            onPress={() => {
              haptic();
              fetchLocation();
            }}
            style={({ pressed }) => [
              styles.locationBtn,
              locationLoading && { opacity: 0.5 },
              pressed && { opacity: 0.7 },
            ]}
          >
            {locationLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.locationBtnText}>📍 내 위치</Text>
            )}
          </Pressable>
          <Pressable
            onPress={() => {
              haptic();
              loadCaretakers();
            }}
            style={({ pressed }) => [styles.refreshBtn, pressed && { opacity: 0.7 }]}
          >
            <Text style={styles.refreshBtnText}>🔄</Text>
          </Pressable>
        </View>
      </View>

      {/* 위치 상태 표시 */}
      {userLocation && (
        <View style={[styles.locationStatus, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={{ fontSize: 14 }}>📍</Text>
          <Text style={[styles.locationStatusText, { color: colors.foreground }]}>
            현재 위치 감지됨 · <Text style={{ color: "#FF7043", fontWeight: "700" }}>{selectedNeighborhood}</Text> 근처
          </Text>
          <Text style={[styles.locationCoords, { color: colors.muted }]}>
            {userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)}
          </Text>
        </View>
      )}

      {locationError && (
        <View style={[styles.locationStatus, { backgroundColor: "#FFF3EE", borderColor: "#FFCCBC" }]}>
          <Text style={{ fontSize: 14 }}>⚠️</Text>
          <Text style={[styles.locationStatusText, { color: "#FF7043" }]}>{locationError}</Text>
        </View>
      )}

      {/* 동네 선택 */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.neighborhoodList}
      >
        {Object.entries(DAEJEON_NEIGHBORHOODS).map(([key]) => {
          const isSelected = selectedNeighborhood === key;
          const distText = userLocation
            ? formatDistance(calculateDistance(userLocation.lat, userLocation.lng, DAEJEON_NEIGHBORHOODS[key].lat, DAEJEON_NEIGHBORHOODS[key].lng))
            : null;
          return (
            <Pressable
              key={key}
              onPress={() => {
                haptic();
                setSelectedNeighborhood(key);
              }}
              style={({ pressed }) => [
                styles.neighborhoodChip,
                { backgroundColor: colors.surface, borderColor: colors.border },
                isSelected && styles.neighborhoodChipActive,
                pressed && { opacity: 0.7 },
              ]}
            >
              <Text
                style={[
                  styles.neighborhoodChipText,
                  { color: colors.muted },
                  isSelected && styles.neighborhoodChipTextActive,
                ]}
              >
                {key}
              </Text>
              {distText && (
                <Text style={[styles.chipDistance, isSelected && { color: "#FF7043" }]}>
                  {distText}
                </Text>
              )}
            </Pressable>
          );
        })}
      </ScrollView>

      {/* 지도 또는 플레이스홀더 */}
      {Platform.OS !== "web" && MapView ? (
        <View style={[styles.mapContainer, { borderColor: colors.border }]}>
          <MapView
            provider={PROVIDER_GOOGLE}
            style={styles.map}
            region={{
              latitude: userLocation?.lat || neighborhoodCoords.lat,
              longitude: userLocation?.lng || neighborhoodCoords.lng,
              latitudeDelta: 0.03,
              longitudeDelta: 0.03,
            }}
            showsUserLocation={true}
            showsMyLocationButton={false}
          >
            {caretakers.map((caretaker) => (
              <Marker
                key={caretaker.id}
                coordinate={{ latitude: caretaker.lat, longitude: caretaker.lng }}
                onPress={() => {
                  haptic();
                  setSelectedMarker(caretaker);
                }}
              >
                <View style={styles.markerContainer}>
                  <Text style={styles.markerEmoji}>{caretaker.emoji}</Text>
                </View>
              </Marker>
            ))}
          </MapView>
        </View>
      ) : (
        <View style={[styles.mapPlaceholder, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.webMapGrid}>
            {/* 간이 지도 표시 (웹용) */}
            <View style={styles.webMapCenter}>
              {userLocation && (
                <View style={styles.userDot}>
                  <View style={styles.userDotInner} />
                  <View style={styles.userDotPulse} />
                </View>
              )}
              <Text style={{ fontSize: 32 }}>🗺️</Text>
              <Text style={[styles.webMapLabel, { color: colors.foreground }]}>{selectedNeighborhood}</Text>
            </View>
            {/* 돌보미 위치 표시 */}
            <View style={styles.webMapMarkers}>
              {caretakers.slice(0, 3).map((c) => (
                <Pressable
                  key={c.id}
                  onPress={() => { haptic(); setSelectedMarker(c); }}
                  style={({ pressed }) => [styles.webMapMarker, pressed && { opacity: 0.7 }]}
                >
                  <Text style={{ fontSize: 20 }}>{c.emoji}</Text>
                  <Text style={[styles.webMapMarkerDist, { color: colors.muted }]}>{formatDistance(c.distance)}</Text>
                </Pressable>
              ))}
            </View>
          </View>
          <Text style={[styles.mapPlaceholderSubtext, { color: colors.muted }]}>
            네이티브 앱에서 전체 지도를 이용할 수 있습니다
          </Text>
        </View>
      )}

      {/* 로딩 */}
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#FF7043" />
          <Text style={[styles.loadingText, { color: colors.muted }]}>돌보미를 찾고 있어요...</Text>
        </View>
      )}

      {/* 선택된 마커 상세 정보 */}
      {selectedMarker && (
        <View style={[styles.markerDetailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.markerDetailHeader}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <View style={styles.detailAvatar}>
                <Text style={{ fontSize: 24 }}>{selectedMarker.emoji}</Text>
              </View>
              <View>
                <Text style={[styles.markerDetailName, { color: colors.foreground }]}>{selectedMarker.nickname}</Text>
                <Text style={styles.markerDetailRating}>⭐ {(selectedMarker.rating / 100).toFixed(1)}</Text>
              </View>
            </View>
            <Pressable
              onPress={() => setSelectedMarker(null)}
              style={({ pressed }) => [styles.closeBtn, { backgroundColor: colors.background }, pressed && { opacity: 0.7 }]}
            >
              <Text style={[styles.closeBtnText, { color: colors.muted }]}>✕</Text>
            </Pressable>
          </View>

          <View style={styles.detailInfoRow}>
            <View style={[styles.detailInfoChip, { backgroundColor: colors.background }]}>
              <Text style={{ fontSize: 12 }}>📍</Text>
              <Text style={[styles.detailInfoText, { color: colors.foreground }]}>{formatDistance(selectedMarker.distance)}</Text>
            </View>
            {selectedMarker.services.map((s, i) => (
              <View key={i} style={[styles.detailInfoChip, { backgroundColor: "#FFF3EE" }]}>
                <Text style={[styles.detailInfoText, { color: "#FF7043" }]}>{s}</Text>
              </View>
            ))}
          </View>

          <View style={styles.markerDetailBody}>
            <Pressable
              onPress={() => {
                haptic();
                router.push(`/profile/${selectedMarker.userId}` as never);
              }}
              style={({ pressed }) => [styles.profileBtn, { backgroundColor: colors.background }, pressed && { opacity: 0.85 }]}
            >
              <Text style={styles.profileBtnText}>프로필 보기</Text>
            </Pressable>
            {!isCaretaker && (
              <Pressable
                onPress={() => {
                  haptic();
                  router.push("/request/new" as never);
                }}
                style={({ pressed }) => [styles.requestBtn, pressed && { opacity: 0.85 }]}
              >
                <Text style={styles.requestBtnText}>돌봄 요청하기</Text>
              </Pressable>
            )}
          </View>
        </View>
      )}

      {/* 돌보미 목록 */}
      {!loading && caretakers.length > 0 && !selectedMarker && (
        <View style={[styles.listContainer, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
          <Text style={[styles.listTitle, { color: colors.foreground }]}>
            근처 돌보미 ({caretakers.length}명)
            {userLocation && <Text style={{ fontSize: 12, color: colors.muted, fontWeight: "400" }}> · 거리순</Text>}
          </Text>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.listContent}>
            {caretakers.map((caretaker) => (
              <Pressable
                key={caretaker.id}
                onPress={() => {
                  haptic();
                  setSelectedMarker(caretaker);
                }}
                style={({ pressed }) => [styles.listItem, { backgroundColor: colors.background }, pressed && { opacity: 0.8 }]}
              >
                <View style={styles.listItemLeft}>
                  <View style={[styles.listItemAvatar, { backgroundColor: "#FFF3EE" }]}>
                    <Text style={{ fontSize: 22 }}>{caretaker.emoji}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.listItemName, { color: colors.foreground }]}>{caretaker.nickname}</Text>
                    <View style={{ flexDirection: "row", gap: 6, marginTop: 2 }}>
                      <Text style={[styles.listItemDistance, { color: colors.muted }]}>
                        📍 {formatDistance(caretaker.distance)}
                      </Text>
                      <Text style={[styles.listItemService, { color: "#FF7043" }]}>
                        {caretaker.services[0]}
                      </Text>
                    </View>
                  </View>
                </View>
                <View style={styles.listItemRight}>
                  <Text style={styles.listItemRating}>⭐ {(caretaker.rating / 100).toFixed(1)}</Text>
                  <Text style={[styles.listItemArrow, { color: colors.muted }]}>›</Text>
                </View>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      {!loading && caretakers.length === 0 && (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyEmoji}>🌙</Text>
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>근처에 활동 중인 돌보미가 없어요</Text>
          <Text style={[styles.emptyDesc, { color: colors.muted }]}>다른 동네를 선택하거나 위치를 새로고침 해보세요</Text>
        </View>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: { fontSize: 20, fontWeight: "800" },
  locationBtn: {
    backgroundColor: "#4CAF82",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  locationBtnText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  refreshBtn: {
    backgroundColor: "#FF7043",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  refreshBtnText: { fontSize: 14 },
  locationStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginHorizontal: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 4,
  },
  locationStatusText: { fontSize: 13, fontWeight: "600", flex: 1 },
  locationCoords: { fontSize: 11 },
  neighborhoodList: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  neighborhoodChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
  },
  neighborhoodChipActive: { borderColor: "#FF7043", backgroundColor: "#FFF3EE" },
  neighborhoodChipText: { fontSize: 12, fontWeight: "600" },
  neighborhoodChipTextActive: { color: "#FF7043" },
  chipDistance: { fontSize: 10, color: "#9E9E9E", marginTop: 1 },
  mapContainer: {
    height: 250,
    borderRadius: 12,
    overflow: "hidden",
    marginHorizontal: 16,
    marginVertical: 8,
    borderWidth: 1,
  },
  map: { flex: 1 },
  mapPlaceholder: {
    height: 200,
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  webMapGrid: {
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
  },
  webMapCenter: {
    alignItems: "center",
    gap: 4,
  },
  userDot: {
    position: "absolute",
    top: -8,
    right: -8,
    zIndex: 1,
  },
  userDotInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#4285F4",
    borderWidth: 2,
    borderColor: "#fff",
  },
  userDotPulse: {
    position: "absolute",
    top: -4,
    left: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#4285F420",
  },
  webMapLabel: { fontSize: 14, fontWeight: "700" },
  webMapMarkers: {
    gap: 8,
  },
  webMapMarker: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FFF3EE",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  webMapMarkerDist: { fontSize: 11 },
  mapPlaceholderSubtext: { fontSize: 11 },
  markerContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FF7043",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  markerEmoji: { fontSize: 20 },
  markerDetailCard: {
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    borderWidth: 1,
    gap: 12,
  },
  markerDetailHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  detailAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFF3EE",
    alignItems: "center",
    justifyContent: "center",
  },
  markerDetailName: { fontSize: 17, fontWeight: "800" },
  markerDetailRating: { fontSize: 13, color: "#FF7043", fontWeight: "700", marginTop: 2 },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  closeBtnText: { fontSize: 14 },
  detailInfoRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  detailInfoChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  detailInfoText: { fontSize: 12, fontWeight: "600" },
  markerDetailBody: { gap: 8 },
  profileBtn: {
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
  },
  profileBtnText: { fontSize: 14, fontWeight: "700", color: "#FF7043" },
  requestBtn: {
    backgroundColor: "#FF7043",
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
  },
  requestBtnText: { fontSize: 14, fontWeight: "700", color: "#fff" },
  listContainer: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    flex: 1,
    borderTopWidth: 1,
  },
  listTitle: { fontSize: 15, fontWeight: "700", marginBottom: 12 },
  listContent: { gap: 8, paddingBottom: 16 },
  listItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderRadius: 12,
    padding: 12,
  },
  listItemLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  listItemAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  listItemName: { fontSize: 14, fontWeight: "700" },
  listItemDistance: { fontSize: 12 },
  listItemService: { fontSize: 11, fontWeight: "600" },
  listItemRight: { alignItems: "flex-end", gap: 4 },
  listItemRating: { fontSize: 13, fontWeight: "700", color: "#FF7043" },
  listItemArrow: { fontSize: 18 },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
  },
  loadingText: { fontSize: 13 },
  emptyCard: {
    alignItems: "center",
    padding: 32,
    gap: 8,
  },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: { fontSize: 16, fontWeight: "700" },
  emptyDesc: { fontSize: 13 },
});
