import React, { useState, useEffect, lazy, Suspense } from "react";
import { View, Text, Pressable, StyleSheet, ScrollView, ActivityIndicator, Platform } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useApp } from "@/lib/app-context";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";

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

// 대전 주요 동네 좌표
const NEIGHBORHOOD_COORDS: Record<string, { lat: number; lng: number; name: string }> = {
  유성구: { lat: 36.3548, lng: 127.3849, name: "유성구" },
  둔산: { lat: 36.3216, lng: 127.4188, name: "둔산" },
  관평: { lat: 36.2725, lng: 127.4122, name: "관평" },
  노은: { lat: 36.3778, lng: 127.4078, name: "노은" },
  봉명: { lat: 36.3421, lng: 127.4356, name: "봉명" },
  대동: { lat: 36.3125, lng: 127.4125, name: "대동" },
  월평: { lat: 36.3678, lng: 127.3956, name: "월평" },
  신성: { lat: 36.3245, lng: 127.3892, name: "신성" },
  도룡: { lat: 36.3456, lng: 127.4267, name: "도룡" },
};

interface CaretakerMarker {
  id: number;
  userId: number;
  nickname: string;
  rating: number;
  lat: number;
  lng: number;
  distance?: number;
}

export default function MapScreen() {
  const router = useRouter();
  const { state } = useApp();
  const [selectedNeighborhood, setSelectedNeighborhood] = useState<string>(state.profile.neighborhood || "유성구");
  const [caretakers, setCaretakers] = useState<CaretakerMarker[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedMarker, setSelectedMarker] = useState<CaretakerMarker | null>(null);

  const isCaretaker = state.profile.role === "caretaker";

  // 더미 데이터: 실제로는 백엔드에서 가져와야 함
  const mockCaretakers: CaretakerMarker[] = [
    {
      id: 1,
      userId: 101,
      nickname: "산책쌤 미경",
      rating: 500,
      lat: 36.3548 + Math.random() * 0.01,
      lng: 127.3849 + Math.random() * 0.01,
      distance: 0.3,
    },
    {
      id: 2,
      userId: 102,
      nickname: "강아지 친구 준호",
      rating: 480,
      lat: 36.3548 + Math.random() * 0.01,
      lng: 127.3849 + Math.random() * 0.01,
      distance: 0.8,
    },
    {
      id: 3,
      userId: 103,
      nickname: "돌봄 전문 지은",
      rating: 500,
      lat: 36.3548 + Math.random() * 0.01,
      lng: 127.3849 + Math.random() * 0.01,
      distance: 1.2,
    },
  ];

  useEffect(() => {
    loadCaretakers();
  }, [selectedNeighborhood]);

  const loadCaretakers = async () => {
    setLoading(true);
    // 실제로는 백엔드 API 호출
    // const response = await trpc.matching.findCaretakers.query({ neighborhood: selectedNeighborhood });
    setTimeout(() => {
      setCaretakers(mockCaretakers);
      setLoading(false);
    }, 500);
  };

  const neighborhoodCoords = NEIGHBORHOOD_COORDS[selectedNeighborhood] || NEIGHBORHOOD_COORDS["유성구"];

  return (
    <ScreenContainer className="pt-2">
      {/* 헤더 */}
      <View style={styles.header}>
        <Text style={styles.title}>🗺️ 근처 돌보미</Text>
        <Pressable
          onPress={() => {
            haptic();
            loadCaretakers();
          }}
          style={({ pressed }) => [styles.refreshBtn, pressed && { opacity: 0.7 }]}
        >
          <Text style={styles.refreshBtnText}>새로고침</Text>
        </Pressable>
      </View>

      {/* 동네 선택 */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.neighborhoodList}
      >
        {Object.entries(NEIGHBORHOOD_COORDS).map(([key, value]) => (
          <Pressable
            key={key}
            onPress={() => {
              haptic();
              setSelectedNeighborhood(key);
            }}
            style={({ pressed }) => [
              styles.neighborhoodChip,
              selectedNeighborhood === key && styles.neighborhoodChipActive,
              pressed && { opacity: 0.7 },
            ]}
          >
            <Text
              style={[
                styles.neighborhoodChipText,
                selectedNeighborhood === key && styles.neighborhoodChipTextActive,
              ]}
            >
              {value.name}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* 지도 또는 플레이스홀더 */}
      {Platform.OS !== "web" && MapView ? (
        <View style={styles.mapContainer}>
          <MapView
            provider={PROVIDER_GOOGLE}
            style={styles.map}
            initialRegion={{
              latitude: neighborhoodCoords.lat,
              longitude: neighborhoodCoords.lng,
              latitudeDelta: 0.05,
              longitudeDelta: 0.05,
            }}
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
                  <Text style={styles.markerEmoji}>🏠</Text>
                </View>
              </Marker>
            ))}
          </MapView>
        </View>
      ) : (
        <View style={styles.mapPlaceholder}>
          <Text style={styles.mapPlaceholderEmoji}>📱</Text>
          <Text style={styles.mapPlaceholderText}>네이티브 앱에서 지도를 이용할 수 있습니다</Text>
          <Text style={styles.mapPlaceholderSubtext}>iOS/Android에서 Expo Go를 사용해주세요</Text>
        </View>
      )}

      {/* 로딩 */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#FF7043" />
        </View>
      )}

      {/* 선택된 마커 상세 정보 */}
      {selectedMarker && (
        <View style={styles.markerDetailCard}>
          <View style={styles.markerDetailHeader}>
            <View>
              <Text style={styles.markerDetailName}>{selectedMarker.nickname}</Text>
              <Text style={styles.markerDetailRating}>⭐ {(selectedMarker.rating / 100).toFixed(1)}</Text>
            </View>
            <Pressable
              onPress={() => setSelectedMarker(null)}
              style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.7 }]}
            >
              <Text style={styles.closeBtnText}>✕</Text>
            </Pressable>
          </View>

          <View style={styles.markerDetailBody}>
            <Text style={styles.markerDetailDistance}>📍 {selectedMarker.distance?.toFixed(1)}km 거리</Text>
            <Pressable
              onPress={() => {
                haptic();
                router.push(`/profile/${selectedMarker.userId}` as never);
              }}
              style={({ pressed }) => [styles.profileBtn, pressed && { opacity: 0.85 }]}
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
                <Text style={styles.requestBtnText}>요청하기</Text>
              </Pressable>
            )}
          </View>
        </View>
      )}

      {/* 돌보미 목록 */}
      {!loading && caretakers.length > 0 && !selectedMarker && (
        <View style={styles.listContainer}>
          <Text style={styles.listTitle}>근처 돌보미 ({caretakers.length}명)</Text>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.listContent}>
            {caretakers.map((caretaker) => (
              <Pressable
                key={caretaker.id}
                onPress={() => {
                  haptic();
                  setSelectedMarker(caretaker);
                }}
                style={({ pressed }) => [styles.listItem, pressed && { opacity: 0.8 }]}
              >
                <View style={styles.listItemLeft}>
                  <Text style={styles.listItemEmoji}>🏠</Text>
                  <View>
                    <Text style={styles.listItemName}>{caretaker.nickname}</Text>
                    <Text style={styles.listItemDistance}>📍 {caretaker.distance?.toFixed(1)}km</Text>
                  </View>
                </View>
                <View style={styles.listItemRight}>
                  <Text style={styles.listItemRating}>⭐ {(caretaker.rating / 100).toFixed(1)}</Text>
                  <Text style={styles.listItemArrow}>›</Text>
                </View>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      {!loading && caretakers.length === 0 && (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyEmoji}>🌙</Text>
          <Text style={styles.emptyTitle}>근처에 활동 중인 돌보미가 없어요</Text>
          <Text style={styles.emptyDesc}>다른 동네를 선택해보세요</Text>
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
  title: { fontSize: 20, fontWeight: "800", color: "#1A1A1A" },
  refreshBtn: {
    backgroundColor: "#FF7043",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  refreshBtnText: { color: "#fff", fontSize: 12, fontWeight: "700" },
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
    borderColor: "#E0E0E0",
    backgroundColor: "#fff",
  },
  neighborhoodChipActive: { borderColor: "#FF7043", backgroundColor: "#FFF3EE" },
  neighborhoodChipText: { fontSize: 12, fontWeight: "600", color: "#757575" },
  neighborhoodChipTextActive: { color: "#FF7043" },
  mapContainer: {
    height: 300,
    borderRadius: 12,
    overflow: "hidden",
    marginHorizontal: 16,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: "#F0F0F0",
  },
  map: { flex: 1 },
  mapPlaceholder: {
    height: 300,
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: "#F0F0F0",
    backgroundColor: "#FAFAFA",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  mapPlaceholderEmoji: { fontSize: 48 },
  mapPlaceholderText: { fontSize: 14, fontWeight: "700", color: "#555" },
  mapPlaceholderSubtext: { fontSize: 12, color: "#9E9E9E" },
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
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: "#F0F0F0",
    gap: 12,
  },
  markerDetailHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  markerDetailName: { fontSize: 18, fontWeight: "800", color: "#1A1A1A" },
  markerDetailRating: { fontSize: 13, color: "#FF7043", fontWeight: "700", marginTop: 2 },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#F5F5F5",
    alignItems: "center",
    justifyContent: "center",
  },
  closeBtnText: { fontSize: 14, color: "#555" },
  markerDetailBody: { gap: 10 },
  markerDetailDistance: { fontSize: 13, color: "#757575" },
  profileBtn: {
    backgroundColor: "#F0F0F0",
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
    backgroundColor: "#fff",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    maxHeight: 250,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },
  listTitle: { fontSize: 15, fontWeight: "700", color: "#1A1A1A", marginBottom: 12 },
  listContent: { gap: 8 },
  listItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#FAFAFA",
    borderRadius: 10,
    padding: 12,
  },
  listItemLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  listItemEmoji: { fontSize: 28 },
  listItemName: { fontSize: 14, fontWeight: "700", color: "#1A1A1A" },
  listItemDistance: { fontSize: 12, color: "#9E9E9E", marginTop: 2 },
  listItemRight: { alignItems: "flex-end", gap: 4 },
  listItemRating: { fontSize: 13, fontWeight: "700", color: "#FF7043" },
  listItemArrow: { fontSize: 18, color: "#9E9E9E" },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyCard: {
    alignItems: "center",
    padding: 32,
    gap: 8,
  },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: "#555" },
  emptyDesc: { fontSize: 13, color: "#9E9E9E" },
});
