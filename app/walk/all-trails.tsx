/**
 * 추천 산책로 전체보기 페이지
 * 대전 지역의 주요 산책로 리스트와 지도 표시
 */
import { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  FlatList,
  Dimensions,
  Platform,
  ActivityIndicator,
} from "react-native";
import { WebView } from "react-native-webview";
import { ScreenContainer } from "@/components/screen-container";
import { useRouter } from "expo-router";
import { Fonts } from "@/hooks/use-fonts";
import * as Haptics from "expo-haptics";
import { DAEJEON_WALK_SPOTS } from "@/lib/daejeon-spots";
import { getApiBaseUrl } from "@/constants/oauth";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const MAP_HEIGHT = 300;

const haptic = () => {
  if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
};

// 카카오맵 HTML 생성
function generateMapHTML(apiKey: string): string {
  const spotsJSON = JSON.stringify(
    DAEJEON_WALK_SPOTS.map((spot: any) => ({
      id: spot.id,
      name: spot.name,
      lat: spot.latitude,
      lng: spot.longitude,
      district: spot.district,
    }))
  );

  return `<!DOCTYPE html>
<html><head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/>
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body,#map{width:100%;height:100%;overflow:hidden}
.marker{width:32px;height:32px;border-radius:50%;background:#2E7D32;border:3px solid white;display:flex;align-items:center;justify-content:center;font-size:16px;box-shadow:0 2px 8px rgba(0,0,0,0.3);cursor:pointer;transition:transform 0.2s}
.marker:hover{transform:scale(1.2)}
.info-window{background:white;padding:12px 14px;border-radius:12px;box-shadow:0 4px 16px rgba(0,0,0,0.12);min-width:180px;font-family:-apple-system,sans-serif}
.info-window .name{font-size:14px;font-weight:700;color:#1A1A1A;margin-bottom:4px}
.info-window .district{font-size:11px;color:#8E8E93;margin-bottom:8px}
.info-window .btn{display:inline-block;padding:4px 12px;border-radius:6px;background:#2E7D32;color:white;font-size:11px;font-weight:600;cursor:pointer}
.info-window .btn:hover{background:#1B5E20}
</style>
</head><body>
<div id="map"></div>
<script src="https://dapi.kakao.com/v2/maps/sdk.js?appkey=${apiKey}&autoload=false"></script>
<script>
kakao.maps.load(function(){
  var container = document.getElementById('map');
  var options = {
    center: new kakao.maps.LatLng(36.3504, 127.3845),
    level: 5
  };
  var map = new kakao.maps.Map(container, options);
  var spots = ${spotsJSON};
  var infoWindows = [];

  spots.forEach(function(spot: any, idx: number) {
    var marker = new kakao.maps.Marker({
      position: new kakao.maps.LatLng(spot.lat, spot.lng),
      map: map,
      title: spot.name
    });

    var content = '<div class="info-window"><div class="name">' + spot.name + '</div><div class="district">' + spot.district + '</div><div class="btn" onclick="window.ReactNativeWebView.postMessage(JSON.stringify({type:\\'select\\',id:\\'' + spot.id + '\\'}))">상세보기</div></div>';
    var infoWindow = new kakao.maps.InfoWindow({
      content: content,
      removable: true
    });

    kakao.maps.event.addListener(marker, 'click', function() {
      infoWindows.forEach(function(iw: any) { iw.close(); });
      infoWindow.open(map, marker);
      infoWindows = [infoWindow];
    });
  });

  if(window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify({type:'ready'}));
});
</script>
</body></html>`;
}

interface TrailItem {
  id: string;
  name: string;
  district: string;
  distance: string;
  difficulty: string;
  rating: number;
  emoji: string;
}

export default function AllTrailsScreen() {
  const router = useRouter();
  const webViewRef = useRef<WebView>(null);
  const [apiKey, setApiKey] = useState<string>("");
  const [mapReady, setMapReady] = useState(false);
  const [selectedTrailId, setSelectedTrailId] = useState<string | null>(null);

  // 산책로 데이터 변환
  const trails: TrailItem[] = DAEJEON_WALK_SPOTS.map((spot) => ({
    id: spot.id,
    name: spot.name,
    district: spot.district,
    distance: `${(Math.random() * 3 + 1).toFixed(1)}km`,
    difficulty: ["쉬움", "보통", "어려움"][Math.floor(Math.random() * 3)],
    rating: Math.round((Math.random() * 2 + 3.5) * 10) / 10,
    emoji: spot.emoji || "🐾",
  }));

  // API 키 가져오기
  useEffect(() => {
    const fetchKey = async () => {
      try {
        const baseUrl = getApiBaseUrl();
        if (!baseUrl) return;
        const res = await fetch(`${baseUrl}/api/kakao-map-key`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.key) setApiKey(data.key);
      } catch (e) {
        console.warn("API key fetch error:", e);
      }
    };
    fetchKey();
  }, []);

  const handleWebViewMessage = useCallback((event: { nativeEvent: { data: string } }) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === "ready") {
        setMapReady(true);
      } else if (data.type === "select") {
        setSelectedTrailId(data.id);
        const spot = DAEJEON_WALK_SPOTS.find((s) => s.id === data.id);
        if (spot) {
          haptic();
          router.push({
            pathname: "/walk/trail-detail",
            params: {
              spotId: spot.id,
              lat: String(spot.latitude),
              lng: String(spot.longitude),
            },
          } as never);
        }
      }
    } catch {}
  }, []);

  const renderTrailItem = ({ item }: { item: TrailItem }): React.ReactElement => (
    <Pressable
      onPress={() => {
        haptic();
        router.push({
          pathname: "/walk/trail-detail",
          params: {
            spotId: item.id,
            lat: String(DAEJEON_WALK_SPOTS.find((s) => s.id === item.id)?.latitude || 0),
            lng: String(DAEJEON_WALK_SPOTS.find((s) => s.id === item.id)?.longitude || 0),
          },
        } as never);
      }}
      style={[s.trailItem, selectedTrailId === item.id && s.trailItemSelected]}
    >
      <View style={s.trailItemContent}>
        <View style={s.trailHeader}>
          <Text style={s.trailEmoji}>{item.emoji}</Text>
          <View style={{ flex: 1 }}>
            <Text style={s.trailName}>{item.name}</Text>
            <Text style={s.trailDistrict}>{item.district}</Text>
          </View>
          <Text style={s.trailRating}>⭐ {item.rating}</Text>
        </View>
        <View style={s.trailMeta}>
          <Text style={s.trailMetaText}>📏 {item.distance}</Text>
          <Text style={s.trailMetaText}>📊 {item.difficulty}</Text>
        </View>
      </View>
    </Pressable>
  );

  return (
    <ScreenContainer className="bg-background">
      <View style={s.header}>
        <Pressable onPress={() => { haptic(); router.back(); }} style={s.backBtn}>
          <Text style={s.backText}>‹</Text>
        </Pressable>
        <Text style={s.headerTitle}>추천 산책로</Text>
        <View style={{ width: 32 }} />
      </View>

      {/* 지도 */}
      {apiKey ? (
        <View style={s.mapContainer}>
          <WebView
            ref={webViewRef}
            source={{ html: generateMapHTML(apiKey) }}
            style={s.map}
            onMessage={handleWebViewMessage}
            scrollEnabled={false}
            scalesPageToFit={false}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            mixedContentMode="always"
          />
          {!mapReady && (
            <View style={s.mapLoading}>
              <ActivityIndicator size="large" color="#2E7D32" />
            </View>
          )}
        </View>
      ) : (
        <View style={s.mapLoading}>
          <ActivityIndicator size="large" color="#2E7D32" />
        </View>
      )}

      {/* 산책로 리스트 */}
      <FlatList
        data={trails}
        keyExtractor={(item) => item.id}
        renderItem={renderTrailItem}
        contentContainerStyle={s.listContent}
        scrollEnabled={false}
      />
    </ScreenContainer>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E8E8E8",
  },
  backBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  backText: {
    fontSize: 28,
    color: "#2E7D32",
    fontWeight: "600",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1A1A1A",
    fontFamily: Fonts.bold,
  },
  mapContainer: {
    height: MAP_HEIGHT,
    backgroundColor: "#F8F8F8",
    borderBottomWidth: 1,
    borderBottomColor: "#E8E8E8",
  },
  map: {
    width: "100%",
    height: "100%",
  },
  mapLoading: {
    width: "100%",
    height: MAP_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8F8F8",
  },
  listContent: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
  },
  trailItem: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E8E8E8",
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  trailItemSelected: {
    borderColor: "#2E7D32",
    backgroundColor: "#F0F7F0",
  },
  trailItemContent: {
    gap: 8,
  },
  trailHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  trailEmoji: {
    fontSize: 24,
  },
  trailName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1A1A1A",
    fontFamily: Fonts.bold,
  },
  trailDistrict: {
    fontSize: 11,
    color: "#8E8E93",
    marginTop: 2,
  },
  trailRating: {
    fontSize: 12,
    fontWeight: "600",
    color: "#2E7D32",
  },
  trailMeta: {
    flexDirection: "row",
    gap: 12,
  },
  trailMetaText: {
    fontSize: 11,
    color: "#687076",
  },
});
