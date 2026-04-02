import { View, Text, Pressable, StyleSheet, ScrollView, ActivityIndicator, Platform, Dimensions } from "react-native";
import { WebView } from "react-native-webview";
import { useRef, useState, useEffect, useCallback } from "react";
import { ScreenContainer } from "@/components/screen-container";
import { useApp, Neighborhood } from "@/lib/app-context";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { getApiBaseUrl } from "@/constants/oauth";
import {
  DAEJEON_NEIGHBORHOODS,
  DAEJEON_CENTER,
  getCurrentLocation,
  findNearestNeighborhood,
  calculateDistance,
  formatDistance,
  generateNearbyCoords,
} from "@/lib/location-service";

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

// 더미 돌보미 데이터 생성 (seed 기반으로 안정적 결과)
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

  return `<!DOCTYPE html>
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
    #loading { display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; font-family: -apple-system, sans-serif; color: #2E7D32; font-size: 14px; }
    #error { display: none; align-items: center; justify-content: center; width: 100%; height: 100%; font-family: -apple-system, sans-serif; color: #EF4444; font-size: 13px; text-align: center; padding: 20px; }
  </style>
</head>
<body>
  <div id="loading">지도를 불러오는 중...</div>
  <div id="error"></div>
  <div id="map" style="display:none;"></div>
  <script>
    var loadingEl = document.getElementById('loading');
    var errorEl = document.getElementById('error');
    var mapEl = document.getElementById('map');

    var script = document.createElement('script');
    script.src = 'https://dapi.kakao.com/v2/maps/sdk.js?appkey=${apiKey}&autoload=false';
    script.onerror = function() {
      loadingEl.style.display = 'none';
      errorEl.style.display = 'flex';
      errorEl.innerHTML = '카카오맵 SDK 로드 실패<br>카카오 개발자 센터에서<br>도메인 등록을 확인해주세요';
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'error', message: 'Kakao SDK load failed' }));
      }
    };
    script.onload = function() {
      try {
        kakao.maps.load(initMap);
      } catch(e) {
        loadingEl.style.display = 'none';
        errorEl.style.display = 'flex';
        errorEl.innerHTML = '지도 초기화 실패: ' + e.message;
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'error', message: e.message }));
        }
      }
    };
    document.head.appendChild(script);

    var map, openInfoWindow = null;

    function initMap() {
      loadingEl.style.display = 'none';
      mapEl.style.display = 'block';

      var container = document.getElementById('map');
      var options = {
        center: new kakao.maps.LatLng(${center.lat}, ${center.lng}),
        level: 4
      };
      map = new kakao.maps.Map(container, options);
      map.addControl(new kakao.maps.ZoomControl(), kakao.maps.ControlPosition.RIGHT);

      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'loaded' }));
      }

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
          '<div class="info-meta">' + String.fromCodePoint(11088) + ' ' + (c.rating / 100).toFixed(1) + ' \\u00b7 ' + c.distance.toFixed(1) + 'km</div>' +
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
</html>`;
}

// 근처돌보미 지도 컴포넌트 - 실제 카카오맵 WebView (무조건 렌더링)
function KakaoMapWebViewNearby({
  caretakers,
  selectedNeighborhood,
}: {
  caretakers: CaretakerMarker[];
  selectedNeighborhood: string;
}) {
  const webViewRef = useRef<WebView>(null);
  const [apiKey, setApiKey] = useState<string>("");
  const [mapError, setMapError] = useState<string>("");

  useEffect(() => {
    const fetchKey = async () => {
      try {
        const baseUrl = getApiBaseUrl();
        const url = baseUrl ? `${baseUrl}/api/kakao-map-key` : "/api/kakao-map-key";
        const res = await fetch(url);
        const data = await res.json();
        if (data.key) {
          setApiKey(data.key);
        } else {
          setMapError("API 키를 가져올 수 없습니다");
        }
      } catch (e: any) {
        console.warn("Failed to fetch API key", e);
        // 하드코딩 폴백 - 환경변수에서 직접 가져오기
        setApiKey("bacaa8f1d9ab392f51dce2e886e5e15b");
      }
    };
    fetchKey();
  }, []);

  const mapHTML = apiKey
    ? generateNearbyMapHTML(apiKey, caretakers, selectedNeighborhood)
    : "";

  const handleWebViewError = useCallback((syntheticEvent: any) => {
    const { nativeEvent } = syntheticEvent;
    console.error("WebView Error:", nativeEvent);
    setMapError(`WebView 에러: ${nativeEvent.description || nativeEvent.code || "알 수 없는 오류"}`);
  }, []);

  const handleWebViewMessage = useCallback((event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === "error") {
        console.error("KakaoMap Error:", data.message);
        setMapError(`카카오맵 에러: ${data.message}`);
      } else if (data.type === "loaded") {
        console.log("KakaoMap loaded successfully");
        setMapError("");
      }
    } catch (e) {
      // ignore non-JSON messages
    }
  }, []);

  // API 키가 없고 에러도 없으면 로딩 중 (최대 3초 후 폴백)
  useEffect(() => {
    if (!apiKey && !mapError) {
      const timer = setTimeout(() => {
        if (!apiKey) {
          // 3초 후에도 키를 못 가져오면 하드코딩 폴백
          setApiKey("bacaa8f1d9ab392f51dce2e886e5e15b");
        }
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [apiKey, mapError]);

  return (
    <View style={styles.mapContainer}>
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
          onError={handleWebViewError}
          onMessage={handleWebViewMessage}
          onHttpError={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            console.error("WebView HTTP Error:", nativeEvent.statusCode, nativeEvent.url);
          }}
        />
      ) : mapError ? (
        <View style={styles.mapErrorContainer}>
          <Text style={styles.mapErrorText}>{mapError}</Text>
        </View>
      ) : (
        <View style={styles.mapLoadingContainer}>
          <ActivityIndicator size="small" color="#2E7D32" />
          <Text style={styles.mapLoadingText}>API 키 로딩 중...</Text>
        </View>
      )}
    </View>
  );
}

export default function MapScreen() {
  const router = useRouter();
  const { state, dispatch } = useApp();
  const [selectedNeighborhood, setSelectedNeighborhood] = useState<string>("전체");
  const [selectedMarker, setSelectedMarker] = useState<CaretakerMarker | null>(null);
  const [caretakers, setCaretakers] = useState<CaretakerMarker[]>([]);
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);

  const DISTRICTS = ["전체", "서구", "유성구", "중구", "동구", "대덕구"] as const;

  // 위치 가져오기 - 한 번만 실행
  useEffect(() => {
    let cancelled = false;
    const fetchLocation = async () => {
      const loc = await getCurrentLocation();
      if (loc && !cancelled) {
        setUserLat(loc.lat);
        setUserLng(loc.lng);
        const nearest = findNearestNeighborhood(loc.lat, loc.lng);
        if (nearest) setSelectedNeighborhood(nearest);
      }
    };
    fetchLocation();
    return () => { cancelled = true; };
  }, []);

  // 돌보미 데이터 생성 - 안정적 의존성 배열 (원시값만 사용)
  useEffect(() => {
    const mocks = generateMockCaretakers(
      selectedNeighborhood === "전체" ? "유성구" : selectedNeighborhood,
      userLat,
      userLng
    );
    setCaretakers(mocks);
  }, [selectedNeighborhood, userLat, userLng]);

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

      {/* 실제 카카오맵 WebView - 무조건 렌더링 (로딩 스피너 없음) */}
      <KakaoMapWebViewNearby
        caretakers={caretakers}
        selectedNeighborhood={selectedNeighborhood === "전체" ? "유성구" : selectedNeighborhood}
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
    flex: 1,
    minHeight: 300,
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
  mapLoadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 200,
  },
  mapLoadingText: {
    marginTop: 8,
    color: "#8E8E93",
    fontSize: 12,
  },
  mapErrorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    minHeight: 200,
  },
  mapErrorText: {
    color: "#EF4444",
    fontSize: 13,
    textAlign: "center",
  },
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
});
