/**
 * 추천 산책로 전체보기 페이지
 * 대전 지역의 주요 산책로 리스트와 카카오맵 지도 표시
 *
 * Phase 59 수정사항:
 * - 지도 렌더링 강제 실행: initMap 내 map.relayout() + setTimeout 300ms 지연
 * - 지도 컨테이너 스타일: height 350px, width 100%, position relative
 * - kakao.maps.LatLngBounds로 모든 마커 영역 자동 조정
 * - HTML 내 TypeScript 문법 제거 (브라우저 JS 호환)
 * - 5개 주요 산책로 마커 + 인포윈도우 표시
 */
import { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  Text,
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
const MAP_HEIGHT = 350;

const haptic = () => {
  if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
};

// 카카오맵 HTML 생성 - 브라우저 호환 순수 JS
function generateMapHTML(apiKey: string): string {
  const spotsData = DAEJEON_WALK_SPOTS.map((spot) => ({
    id: spot.id,
    name: spot.name,
    lat: spot.latitude,
    lng: spot.longitude,
    district: spot.district,
    emoji: spot.emoji || "🐾",
    rating: spot.rating,
    walkTime: spot.walkTime,
  }));
  const spotsJSON = JSON.stringify(spotsData);

  return `<!DOCTYPE html>
<html><head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/>
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:100%;height:100%;overflow:hidden}
#map{width:100%;height:100%;position:relative;z-index:1}
.custom-marker{
  width:36px;height:36px;border-radius:50%;
  background:#2E7D32;border:3px solid white;
  display:flex;align-items:center;justify-content:center;
  font-size:18px;box-shadow:0 2px 8px rgba(0,0,0,0.3);
  cursor:pointer;transition:transform 0.2s;
  line-height:36px;text-align:center;
}
.custom-marker:hover{transform:scale(1.2)}
.info-window{
  background:white;padding:14px 16px;border-radius:14px;
  box-shadow:0 4px 16px rgba(0,0,0,0.15);min-width:200px;
  font-family:-apple-system,BlinkMacSystemFont,sans-serif;
}
.info-window .name{font-size:15px;font-weight:700;color:#1A1A1A;margin-bottom:4px}
.info-window .meta{font-size:12px;color:#8E8E93;margin-bottom:8px}
.info-window .btn{
  display:inline-block;padding:6px 14px;border-radius:8px;
  background:#2E7D32;color:white;font-size:12px;font-weight:600;
  cursor:pointer;border:none;text-decoration:none;
}
.info-window .btn:hover{background:#1B5E20}
.error-msg{
  position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
  text-align:center;color:#666;font-size:14px;
  font-family:-apple-system,sans-serif;
}
</style>
</head><body>
<div id="map"></div>
<script>
function sendMsg(obj){
  try{
    if(window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(obj));
    else if(window.parent) window.parent.postMessage(JSON.stringify(obj),'*');
  }catch(e){}
}
</script>
<script src="https://dapi.kakao.com/v2/maps/sdk.js?appkey=${apiKey}&autoload=false"
  onerror="document.getElementById('map').innerHTML='<div class=error-msg>지도 SDK 로드 실패</div>';sendMsg({type:'error',msg:'SDK load failed'})">
</script>
<script>
(function(){
  // SDK 로드 실패 폴백
  var loadTimeout = setTimeout(function(){
    document.getElementById('map').innerHTML = '<div class="error-msg">지도를 불러오는 중...<br/>잠시 후 다시 시도해주세요</div>';
    sendMsg({type:'error',msg:'SDK load timeout'});
  }, 8000);

  if(typeof kakao === 'undefined' || !kakao.maps){
    return;
  }

  kakao.maps.load(function(){
    clearTimeout(loadTimeout);

    var container = document.getElementById('map');
    if(!container){
      sendMsg({type:'error',msg:'map container not found'});
      return;
    }

    // 초기 지도 생성 (대전 시청 중심)
    var options = {
      center: new kakao.maps.LatLng(36.3504, 127.3845),
      level: 7
    };
    var map = new kakao.maps.Map(container, options);

    // 300ms 지연 후 relayout + 마커 생성
    setTimeout(function(){
      map.relayout();

      var spots = ${spotsJSON};
      var bounds = new kakao.maps.LatLngBounds();
      var openInfoWindow = null;

      spots.forEach(function(spot){
        var position = new kakao.maps.LatLng(spot.lat, spot.lng);
        bounds.extend(position);

        // 커스텀 오버레이 마커
        var markerContent = document.createElement('div');
        markerContent.className = 'custom-marker';
        markerContent.textContent = spot.emoji;
        markerContent.setAttribute('data-id', spot.id);

        var overlay = new kakao.maps.CustomOverlay({
          position: position,
          content: markerContent,
          yAnchor: 1.2,
          zIndex: 3
        });
        overlay.setMap(map);

        // 인포윈도우 내용
        var iwContent = '<div class="info-window">'
          + '<div class="name">' + spot.emoji + ' ' + spot.name + '</div>'
          + '<div class="meta">' + spot.district + ' \u00B7 \u2B50 ' + spot.rating + ' \u00B7 ' + spot.walkTime + '</div>'
          + '<div class="btn" onclick="sendMsg({type:' + String.fromCharCode(39) + 'select' + String.fromCharCode(39) + ',id:' + String.fromCharCode(39) + spot.id + String.fromCharCode(39) + '})">' + '\uc0c1\uc138\ubcf4\uae30 \u203A</div>'
          + '</div>';

        var infoWindow = new kakao.maps.InfoWindow({
          content: iwContent,
          removable: true
        });

        markerContent.addEventListener('click', function(){
          if(openInfoWindow) openInfoWindow.close();
          // 표준 마커 생성 (인포윈도우 앵커용, 투명)
          var anchor = new kakao.maps.Marker({
            position: position,
            map: map,
            visible: false
          });
          infoWindow.open(map, anchor);
          openInfoWindow = infoWindow;
          map.panTo(position);
        });
      });

      // LatLngBounds로 모든 마커가 보이도록 영역 조정
      if(spots.length > 0){
        map.setBounds(bounds, 60, 60, 60, 60);
      }

      // relayout 한번 더 (안전)
      setTimeout(function(){
        map.relayout();
        sendMsg({type:'ready'});
      }, 200);

    }, 300);
  });
})();
</script>
</body></html>`;
}

interface TrailItem {
  id: string;
  name: string;
  district: string;
  dong: string;
  walkTime: string;
  difficulty: string;
  rating: number;
  emoji: string;
  latitude: number;
  longitude: number;
}

export default function AllTrailsScreen() {
  const router = useRouter();
  const webViewRef = useRef<WebView>(null);
  const [apiKey, setApiKey] = useState<string>("");
  const [mapReady, setMapReady] = useState(false);
  const [selectedTrailId, setSelectedTrailId] = useState<string | null>(null);
  const [mapLoadFailed, setMapLoadFailed] = useState(false);

  // 산책로 데이터 - 실제 데이터 사용
  const trails: TrailItem[] = DAEJEON_WALK_SPOTS.map((spot) => ({
    id: spot.id,
    name: spot.name,
    district: spot.district,
    dong: spot.dong,
    walkTime: spot.walkTime,
    difficulty: spot.difficulty,
    rating: spot.rating,
    emoji: spot.emoji || "🐾",
    latitude: spot.latitude,
    longitude: spot.longitude,
  }));

  // API 키 가져오기
  useEffect(() => {
    const fetchKey = async () => {
      try {
        const baseUrl = getApiBaseUrl();
        if (!baseUrl) {
          setMapLoadFailed(true);
          return;
        }
        const res = await fetch(`${baseUrl}/api/kakao-map-key`);
        if (!res.ok) {
          setMapLoadFailed(true);
          return;
        }
        const data = await res.json();
        if (data.key) {
          setApiKey(data.key);
        } else {
          setMapLoadFailed(true);
        }
      } catch (e) {
        console.warn("[AllTrails] API key fetch error:", e);
        setMapLoadFailed(true);
      }
    };
    fetchKey();

    // 8초 타임아웃 - API 키 로드 실패 시 폴백
    const timeout = setTimeout(() => {
      setMapLoadFailed((prev) => {
        if (!prev) return true;
        return prev;
      });
    }, 8000);

    return () => clearTimeout(timeout);
  }, []);

  // 지도 로드 후 5초 이내 ready 안 오면 강제 표시
  useEffect(() => {
    if (apiKey && !mapReady) {
      const fallback = setTimeout(() => {
        setMapReady(true);
      }, 5000);
      return () => clearTimeout(fallback);
    }
  }, [apiKey, mapReady]);

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
      } else if (data.type === "error") {
        console.warn("[AllTrails] Map error:", data.msg);
      }
    } catch {}
  }, [router]);

  // iframe message handler (web platform)
  useEffect(() => {
    if (Platform.OS === "web") {
      const handler = (event: MessageEvent) => {
        try {
          const data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
          if (data.type === "ready") {
            setMapReady(true);
          } else if (data.type === "select") {
            const spot = DAEJEON_WALK_SPOTS.find((s) => s.id === data.id);
            if (spot) {
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
      };
      window.addEventListener("message", handler);
      return () => window.removeEventListener("message", handler);
    }
  }, [router]);

  const renderTrailItem = ({ item }: { item: TrailItem }): React.ReactElement => (
    <Pressable
      onPress={() => {
        haptic();
        setSelectedTrailId(item.id);
        router.push({
          pathname: "/walk/trail-detail",
          params: {
            spotId: item.id,
            lat: String(item.latitude),
            lng: String(item.longitude),
          },
        } as never);
      }}
      style={({ pressed }) => [
        s.trailItem,
        selectedTrailId === item.id && s.trailItemSelected,
        pressed && { opacity: 0.85 },
      ]}
    >
      <View style={s.trailItemContent}>
        <View style={s.trailHeader}>
          <View style={s.trailEmojiWrap}>
            <Text style={s.trailEmoji}>{item.emoji}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.trailName}>{item.name}</Text>
            <Text style={s.trailDistrict}>📍 {item.district} {item.dong}</Text>
          </View>
          <View style={s.ratingBadge}>
            <Text style={s.ratingText}>⭐ {item.rating}</Text>
          </View>
        </View>
        <View style={s.trailMeta}>
          <View style={s.metaChip}>
            <Text style={s.metaChipText}>⏱ {item.walkTime}</Text>
          </View>
          <View style={s.metaChip}>
            <Text style={s.metaChipText}>📊 {item.difficulty}</Text>
          </View>
        </View>
      </View>
    </Pressable>
  );

  // 지도 렌더링 영역
  const renderMap = () => {
    if (mapLoadFailed && !apiKey) {
      // API 키 로드 실패 시 폴백 UI
      return (
        <View style={s.mapFallback}>
          <Text style={s.mapFallbackEmoji}>🗺️</Text>
          <Text style={s.mapFallbackText}>대전 주요 산책로</Text>
          <Text style={s.mapFallbackSub}>
            {DAEJEON_WALK_SPOTS.length}개 산책로가 등록되어 있습니다
          </Text>
        </View>
      );
    }

    if (!apiKey) {
      return (
        <View style={s.mapLoadingContainer}>
          <ActivityIndicator size="large" color="#2E7D32" />
          <Text style={s.mapLoadingText}>지도를 불러오는 중...</Text>
        </View>
      );
    }

    // WebView 또는 iframe 렌더링
    if (Platform.OS === "web") {
      return (
        <View style={s.mapContainer}>
          <iframe
            srcDoc={generateMapHTML(apiKey)}
            style={{
              width: "100%",
              height: "100%",
              border: "none",
              position: "absolute",
              top: 0,
              left: 0,
              zIndex: 1,
            }}
            title="kakao-map-all-trails"
            onLoad={() => {
              // iframe 로드 완료 시 5초 후 강제 ready
              setTimeout(() => setMapReady(true), 3000);
            }}
          />
          {!mapReady && (
            <View style={s.mapOverlayLoading}>
              <ActivityIndicator size="large" color="#2E7D32" />
              <Text style={s.mapLoadingText}>지도를 불러오는 중...</Text>
            </View>
          )}
        </View>
      );
    }

    return (
      <View style={s.mapContainer}>
        <WebView
          ref={webViewRef}
          source={{ html: generateMapHTML(apiKey) }}
          style={s.mapWebView}
          onMessage={handleWebViewMessage}
          scrollEnabled={false}
          scalesPageToFit={false}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          mixedContentMode="always"
          originWhitelist={["*"]}
          onLoadEnd={() => {
            console.log("[AllTrails] WebView loaded");
          }}
          onError={(syntheticEvent) => {
            console.warn("[AllTrails] WebView error:", syntheticEvent.nativeEvent);
          }}
        />
        {!mapReady && (
          <View style={s.mapOverlayLoading}>
            <ActivityIndicator size="large" color="#2E7D32" />
            <Text style={s.mapLoadingText}>지도를 불러오는 중...</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <ScreenContainer className="bg-background">
      {/* 헤더 */}
      <View style={s.header}>
        <Pressable
          onPress={() => { haptic(); router.back(); }}
          style={({ pressed }) => [s.backBtn, pressed && { opacity: 0.6 }]}
        >
          <Text style={s.backText}>‹</Text>
        </Pressable>
        <Text style={s.headerTitle}>추천 산책로</Text>
        <View style={s.headerBadge}>
          <Text style={s.headerBadgeText}>{DAEJEON_WALK_SPOTS.length}곳</Text>
        </View>
      </View>

      {/* 지도 */}
      {renderMap()}

      {/* 산책로 리스트 */}
      <FlatList
        data={trails}
        keyExtractor={(item) => item.id}
        renderItem={renderTrailItem}
        contentContainerStyle={s.listContent}
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
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
    backgroundColor: "#FFFFFF",
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
    backgroundColor: "#F0F7F0",
  },
  backText: {
    fontSize: 28,
    color: "#2E7D32",
    fontWeight: "600",
    lineHeight: 32,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1A1A1A",
    fontFamily: Fonts.bold,
  },
  headerBadge: {
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  headerBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#2E7D32",
  },
  // 지도 컨테이너 - 강제 고정 스타일
  mapContainer: {
    height: MAP_HEIGHT,
    width: "100%",
    position: "relative",
    backgroundColor: "#F0F0F0",
    borderBottomWidth: 1,
    borderBottomColor: "#E8E8E8",
    overflow: "hidden",
  },
  mapWebView: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: "100%",
    height: "100%",
    zIndex: 1,
  },
  mapOverlayLoading: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(248,248,248,0.9)",
    zIndex: 10,
  },
  mapLoadingContainer: {
    height: MAP_HEIGHT,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8F8F8",
    borderBottomWidth: 1,
    borderBottomColor: "#E8E8E8",
  },
  mapLoadingText: {
    marginTop: 8,
    fontSize: 13,
    color: "#8E8E93",
  },
  mapFallback: {
    height: MAP_HEIGHT,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F0F7F0",
    borderBottomWidth: 1,
    borderBottomColor: "#E8E8E8",
  },
  mapFallbackEmoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  mapFallbackText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#2E7D32",
    marginBottom: 4,
  },
  mapFallbackSub: {
    fontSize: 13,
    color: "#8E8E93",
  },
  // 리스트
  listContent: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 100,
    gap: 10,
  },
  trailItem: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E8E8E8",
    paddingHorizontal: 14,
    paddingVertical: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  trailItemSelected: {
    borderColor: "#2E7D32",
    backgroundColor: "#F0F7F0",
  },
  trailItemContent: {
    gap: 10,
  },
  trailHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  trailEmojiWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#F0F7F0",
    alignItems: "center",
    justifyContent: "center",
  },
  trailEmoji: {
    fontSize: 24,
  },
  trailName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1A1A1A",
    fontFamily: Fonts.bold,
    marginBottom: 2,
  },
  trailDistrict: {
    fontSize: 12,
    color: "#8E8E93",
  },
  ratingBadge: {
    backgroundColor: "#FFF8E1",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#F59E0B",
  },
  trailMeta: {
    flexDirection: "row",
    gap: 8,
    paddingLeft: 56,
  },
  metaChip: {
    backgroundColor: "#F5F5F5",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  metaChipText: {
    fontSize: 11,
    color: "#687076",
  },
});
