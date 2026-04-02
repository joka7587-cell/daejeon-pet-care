import { View, Text, Pressable, StyleSheet, ScrollView, ActivityIndicator, Platform, Dimensions } from "react-native";
import { WebView } from "react-native-webview";
import { useRef, useState, useEffect } from "react";
import { ScreenContainer } from "@/components/screen-container";
import { useApp, Neighborhood } from "@/lib/app-context";
import { useRouter } from "expo-router";
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

const { width: SCREEN_WIDTH } = Dimensions.get("window");

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

// 근처돌보미 지도 컴포넌트 - 실제 카카오맵 WebView
function KakaoMapWebViewNearby({
  caretakers,
  selectedNeighborhood,
  onSelectMarker,
}: {
  caretakers: CaretakerMarker[];
  selectedNeighborhood: string;
  onSelectMarker: (marker: CaretakerMarker) => void;
}) {
  const webViewRef = useRef<WebView>(null);
  const [apiKey, setApiKey] = useState<string>("");
  const { getApiBaseUrl } = useApp() as any;

  useEffect(() => {
    const fetchKey = async () => {
      try {
        const baseUrl = getApiBaseUrl?.() || "http://localhost:3000";
        const res = await fetch(`${baseUrl}/api/kakao-map-key`);
        const data = await res.json();
        if (data.key) setApiKey(data.key);
      } catch (e) {
        console.warn("Failed to fetch API key", e);
      }
    };
    fetchKey();
  }, []);

  const mapHTML = apiKey
    ? generateNearbyMapHTML(apiKey, caretakers, selectedNeighborhood)
    : "";

  return (
    <View style={[styles.mapContainer, { flex: 1, minHeight: 300, borderRadius: 12, overflow: "hidden", marginHorizontal: 16, marginVertical: 8, borderWidth: 2, borderColor: "#2E7D32", backgroundColor: "#F8FBF5" }]}>
      {apiKey ? (
        <WebView
          ref={webViewRef}
          source={{ html: mapHTML }}
          style={{ flex: 1 }}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          mixedContentMode="always"
          originWhitelist={["*"]}
          scrollEnabled={false}
          bounces={false}
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
          allowFileAccess={true}
          allowUniversalAccessFromFileURLs={true}
        />
      ) : (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color="#2E7D32" />
          <Text style={{ marginTop: 12, color: "#8E8E93" }}>지도 로딩 중...</Text>
        </View>
      )}
    </View>
  );
}

// 근처돌보미 지도 HTML 생성
function generateNearbyMapHTML(
  apiKey: string,
  caretakers: CaretakerMarker[],
  selectedNeighborhood: string
): string {
  const center = DAEJEON_NEIGHBORHOODS[selectedNeighborhood] || DAEJEON_NEIGHBORHOODS["유성구"];
  const caretakersJSON = JSON.stringify(
    caretakers.map((c) => ({
      id: c.id,
      nickname: c.nickname,
      emoji: c.emoji,
      lat: c.lat,
      lng: c.lng,
      distance: c.distance,
      rating: c.rating,
      services: c.services,
    }))
  );

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; overflow: hidden; background: #F8FBF5; }
    #map { width: 100%; height: 100%; }
    .marker { display: flex; align-items: center; justify-content: center; width: 40px; height: 40px; border-radius: 50%; background: #2E7D32; border: 2px solid #FFFFFF; box-shadow: 0 2px 8px rgba(0,0,0,0.25); font-size: 18px; cursor: pointer; }
    .info-window { padding: 12px 14px; border-radius: 12px; background: #FFFFFF; box-shadow: 0 4px 16px rgba(0,0,0,0.12); min-width: 200px; font-family: -apple-system, sans-serif; }
    .info-name { font-size: 14px; font-weight: 700; color: #2E7D32; margin-bottom: 4px; }
    .info-meta { font-size: 11px; color: #8E8E93; margin-bottom: 3px; }
    .info-services { font-size: 10px; color: #555; margin-top: 6px; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var script = document.createElement('script');
    script.src = 'https://dapi.kakao.com/v2/maps/sdk.js?appkey=${apiKey}&autoload=false';
    script.onload = function() {
      kakao.maps.load(initMap);
    };
    document.head.appendChild(script);

    var map, openInfoWindow = null;

    function initMap() {
      var container = document.getElementById('map');
      var options = {
        center: new kakao.maps.LatLng(${center.lat}, ${center.lng}),
        level: 4
      };
      map = new kakao.maps.Map(container, options);
      map.addControl(new kakao.maps.ZoomControl(), kakao.maps.ControlPosition.RIGHT);

      var caretakers = ${caretakersJSON};
      caretakers.forEach(function(c) {
        var position = new kakao.maps.LatLng(c.lat, c.lng);
        var el = document.createElement('div');
        el.className = 'marker';
        el.innerHTML = c.emoji;

        var overlay = new kakao.maps.CustomOverlay({
          position: position,
          content: el,
          yAnchor: 0.5,
          xAnchor: 0.5,
          zIndex: 10
        });
        overlay.setMap(map);

        var infoContent = '<div class="info-window">' +
          '<div class="info-name">' + c.emoji + ' ' + c.nickname + '</div>' +
          '<div class="info-meta">⭐ ' + (c.rating / 100).toFixed(1) + ' · ' + c.distance.toFixed(1) + 'km</div>' +
          '<div class="info-services">' + c.services.join(', ') + '</div>' +
          '</div>';

        var infoWindow = new kakao.maps.InfoWindow({
          content: infoContent,
          removable: true
        });

        el.addEventListener('click', function() {
          if (openInfoWindow) openInfoWindow.close();
          infoWindow.open(map, new kakao.maps.Marker({ position: position, map: null }));
          openInfoWindow = infoWindow;
        });
      });
    }
  </script>
</body>
</html>
  `;
}

export default function MapScreen() {
  const router = useRouter();
  const { state, dispatch, getApiBaseUrl } = useApp() as any;
  const [selectedNeighborhood, setSelectedNeighborhood] = useState<string>("전체");
  const [selectedMarker, setSelectedMarker] = useState<CaretakerMarker | null>(null);
  const [caretakers, setCaretakers] = useState<CaretakerMarker[]>([]);
  const [loading, setLoading] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  const DISTRICTS = ["전체", "서구", "유성구", "중구", "동구", "대덕구"] as const;

  useEffect(() => {
    const fetchLocation = async () => {
      const loc = await getCurrentLocation();
      if (loc) {
        setUserLocation(loc);
        const nearest = findNearestNeighborhood(loc.lat, loc.lng);
        if (nearest) setSelectedNeighborhood(nearest);
      }
    };
    fetchLocation();
  }, []);

  useEffect(() => {
    setLoading(true);
    setTimeout(() => {
      const mocks = generateMockCaretakers(
        selectedNeighborhood === "전체" ? "유성구" : selectedNeighborhood,
        userLocation?.lat || null,
        userLocation?.lng || null
      );
      setCaretakers(mocks);
      setLoading(false);
    }, 800);
  }, [selectedNeighborhood, userLocation]);

  const neighborhoodCoords = DAEJEON_NEIGHBORHOODS[selectedNeighborhood === "전체" ? "유성구" : selectedNeighborhood] || DAEJEON_CENTER;

  return (
    <ScreenContainer className="pt-2">
      {/* 헤더 */}
      <View style={[styles.header, { flexGrow: 0, flexShrink: 0 }]}>
        <Text style={[styles.title, { color: "#1A1A1A" }]}>근처 돌보미</Text>
      </View>

      {/* 동네 선택 */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.neighborhoodList}
        style={{ flexGrow: 0, flexShrink: 0, marginVertical: 12 }}
      >
        {DISTRICTS.map((district) => (
          <Pressable
            key={district}
            onPress={() => {
              haptic();
              setSelectedNeighborhood(district);
            }}
            style={({ pressed }) => [
              styles.neighborhoodChip,
              selectedNeighborhood === district && styles.neighborhoodChipActive,
              pressed && { opacity: 0.7 },
            ]}
          >
            <Text
              style={[
                styles.neighborhoodChipText,
                selectedNeighborhood === district && styles.neighborhoodChipTextActive,
              ]}
            >
              {district}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* 실제 카카오맵 WebView - 무조건 렌더링 */}
      <KakaoMapWebViewNearby
        caretakers={caretakers}
        selectedNeighborhood={selectedNeighborhood === "전체" ? "유성구" : selectedNeighborhood}
        onSelectMarker={setSelectedMarker}
      />

      {/* 돌보미 목록 */}
      <ScrollView style={{ flex: 1, marginTop: 12 }} showsVerticalScrollIndicator={false}>
        {caretakers.map((caretaker) => (
          <Pressable
            key={caretaker.id}
            onPress={() => {
              haptic();
              router.push({
                pathname: "/profile/[id]",
                params: { id: caretaker.userId.toString() },
              } as never);
            }}
            style={({ pressed }) => [styles.caretakerCard, pressed && { opacity: 0.7 }]}
          >
            <View style={styles.caretakerAvatar}>
              <Text style={styles.caretakerEmoji}>{caretaker.emoji}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.caretakerName, { color: "#1A1A1A" }]}>{caretaker.nickname}</Text>
              <View style={{ flexDirection: "row", gap: 8, marginTop: 4 }}>
                <Text style={{ fontSize: 12, color: "#2E7D32", fontWeight: "600" }}>⭐ {(caretaker.rating / 100).toFixed(1)}</Text>
                <Text style={{ fontSize: 12, color: "#8E8E93" }}>📍 {formatDistance(caretaker.distance)}</Text>
              </View>
              <View style={{ flexDirection: "row", gap: 4, marginTop: 6, flexWrap: "wrap" }}>
                {caretaker.services.map((service, idx) => (
                  <View key={idx} style={{ backgroundColor: "#E8F5E9", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
                    <Text style={{ fontSize: 10, color: "#2E7D32", fontWeight: "600" }}>{service}</Text>
                  </View>
                ))}
              </View>
            </View>
          </Pressable>
        ))}
        <View style={{ height: 20 }} />
      </ScrollView>

      {/* 로딩 */}
      {loading && (
        <View style={[styles.loadingContainer, { flexGrow: 0, flexShrink: 0 }]}>
          <ActivityIndicator size="small" color="#2E7D32" />
          <Text style={[styles.loadingText, { color: "#8E8E93" }]}>돌보미를 찾고 있어요...</Text>
        </View>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E8E8E8",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
  },
  neighborhoodList: {
    paddingHorizontal: 16,
    gap: 8,
  },
  neighborhoodChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E8E8E8",
    backgroundColor: "#FFFFFF",
  },
  neighborhoodChipActive: {
    borderColor: "#2E7D32",
    backgroundColor: "#E8F5E9",
  },
  neighborhoodChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#8E8E93",
  },
  neighborhoodChipTextActive: {
    color: "#2E7D32",
  },
  mapContainer: {
    height: 300,
    borderRadius: 12,
    overflow: "hidden",
    marginHorizontal: 16,
    marginVertical: 8,
    borderWidth: 2,
    borderColor: "#2E7D32",
    backgroundColor: "#F8FBF5",
    shadowColor: "#2E7D32",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  map: { flex: 1 },
  caretakerCard: {
    flexDirection: "row",
    padding: 12,
    marginHorizontal: 16,
    marginVertical: 6,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E8E8E8",
    alignItems: "flex-start",
    gap: 12,
  },
  caretakerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#E8F5E9",
    alignItems: "center",
    justifyContent: "center",
  },
  caretakerEmoji: {
    fontSize: 24,
  },
  caretakerName: {
    fontSize: 14,
    fontWeight: "700",
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    gap: 8,
  },
  loadingText: {
    fontSize: 12,
  },
});
