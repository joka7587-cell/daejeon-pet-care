/**
 * 카카오맵 JavaScript API를 WebView로 연동한 대전 전용 지도 컴포넌트
 *
 * 기능:
 * - 대전 엑스포과학공원(36.376, 127.387) 중심 좌표
 * - 커스텀 강아지 발바닥 아이콘 마커 (산책 명소)
 * - 마커 클릭 시 인포윈도우 표시
 * - 워커 실시간 위치 핀 + 경로 폴리라인
 * - 산책 종료 버튼
 */
import { useEffect, useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  Modal,
  Pressable,
  StyleSheet,
  Dimensions,
  Platform,
  ActivityIndicator,
} from "react-native";
import { WebView } from "react-native-webview";
import { Fonts } from "@/hooks/use-fonts";
import * as Haptics from "expo-haptics";
import { getApiBaseUrl } from "@/constants/oauth";

const haptic = () => {
  if (Platform.OS !== "web")
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
};

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// ─── 대전 산책 명소 좌표 (카카오맵 마커용) ───
const DAEJEON_WALK_MARKERS = [
  {
    id: "spot_1",
    name: "한밭수목원",
    lat: 36.3685,
    lng: 127.3880,
    district: "서구 둔산동",
    emoji: "🌳",
    rating: 4.8,
    walkTime: "40~60분",
    features: "넓은 산책로, 그늘 많음",
  },
  {
    id: "spot_2",
    name: "엑스포 시민광장",
    lat: 36.3742,
    lng: 127.3917,
    district: "유성구 도룡동",
    emoji: "🏟️",
    rating: 4.7,
    walkTime: "30~50분",
    features: "넓은 잔디밭, 야외 무대",
  },
  {
    id: "spot_3",
    name: "유림공원",
    lat: 36.3321,
    lng: 127.3654,
    district: "서구 괴정동",
    emoji: "🏞️",
    rating: 4.6,
    walkTime: "30~45분",
    features: "호수 산책로, 운동시설",
  },
  {
    id: "spot_4",
    name: "남선공원",
    lat: 36.3276,
    lng: 127.4218,
    district: "중구 대사동",
    emoji: "🌲",
    rating: 4.4,
    walkTime: "20~30분",
    features: "산책로, 체육시설",
  },
  {
    id: "spot_5",
    name: "갑천 둔치 산책로",
    lat: 36.3558,
    lng: 127.3761,
    district: "서구 월평동",
    emoji: "🌊",
    rating: 4.7,
    walkTime: "40~90분",
    features: "하천 산책로, 야간 조명",
  },
  {
    id: "spot_6",
    name: "보문산 둘레길",
    lat: 36.3108,
    lng: 127.4176,
    district: "중구 대사동",
    emoji: "⛰️",
    rating: 4.5,
    walkTime: "60~120분",
    features: "등산로, 전망대",
  },
  {
    id: "spot_7",
    name: "카이스트 캠퍼스",
    lat: 36.3721,
    lng: 127.3604,
    district: "유성구 어은동",
    emoji: "🎓",
    rating: 4.6,
    walkTime: "30~50분",
    features: "캠퍼스 산책로, 잔디밭",
  },
  {
    id: "spot_8",
    name: "계족산 황톳길",
    lat: 36.4087,
    lng: 127.4312,
    district: "대덕구 장동",
    emoji: "🦶",
    rating: 4.9,
    walkTime: "40~70분",
    features: "황톳길, 숲길",
  },
  {
    id: "spot_9",
    name: "동춘당공원",
    lat: 36.3654,
    lng: 127.4387,
    district: "대덕구 송촌동",
    emoji: "🏯",
    rating: 4.3,
    walkTime: "20~30분",
    features: "문화재, 정원",
  },
];

interface WalkerLocation {
  latitude: number;
  longitude: number;
  timestamp: string;
  district: string;
}

interface RoutePoint {
  latitude: number;
  longitude: number;
}

export interface KakaoMapProps {
  visible: boolean;
  onClose: () => void;
  workerName: string;
  workerEmoji: string;
  petName: string;
  petEmoji: string;
  walkStatus: "idle" | "walking" | "paused" | "completed";
  startedAt?: string;
  currentLocation?: WalkerLocation;
  routePoints?: RoutePoint[];
  totalDistanceKm?: number;
  totalDurationSec?: number;
  onEndWalk?: () => void;
}

function formatDuration(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  if (h > 0) return `${h}시간 ${m}분`;
  if (m > 0) return `${m}분 ${s}초`;
  return `${s}초`;
}

// ─── 카카오맵 HTML 생성 ───
function generateKakaoMapHTML(
  apiKey: string,
  walkerLoc?: WalkerLocation,
  routePoints: RoutePoint[] = [],
  workerName: string = "",
  walkStatus: string = "idle",
): string {
  const center = walkerLoc
    ? { lat: walkerLoc.latitude, lng: walkerLoc.longitude }
    : { lat: 36.376, lng: 127.387 }; // 대전 엑스포과학공원 (한빛탑)

  const zoomLevel = walkerLoc ? 3 : 4; // 산책로 상세 보이도록 레벨 3~4

  const markersJSON = JSON.stringify(DAEJEON_WALK_MARKERS);
  const routeJSON = JSON.stringify(
    routePoints.map((p) => ({ lat: p.latitude, lng: p.longitude }))
  );

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; overflow: hidden; }
    #map { width: 100%; height: 100%; }
    .custom-marker {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: #2E7D32;
      border: 2.5px solid #FFFFFF;
      box-shadow: 0 2px 8px rgba(0,0,0,0.25);
      font-size: 18px;
      cursor: pointer;
      transition: transform 0.15s;
    }
    .custom-marker:hover { transform: scale(1.15); }
    .custom-marker.walker {
      background: #4CAF82;
      width: 42px;
      height: 42px;
      font-size: 20px;
      animation: pulse 1.5s ease-in-out infinite;
    }
    @keyframes pulse {
      0%, 100% { box-shadow: 0 0 0 0 rgba(76,175,130,0.5); }
      50% { box-shadow: 0 0 0 12px rgba(76,175,130,0); }
    }
    .info-window {
      padding: 12px 14px;
      border-radius: 12px;
      background: #FFFFFF;
      box-shadow: 0 4px 16px rgba(0,0,0,0.12);
      min-width: 180px;
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
    }
    .info-window .spot-name {
      font-size: 14px;
      font-weight: 700;
      color: #1A1A1A;
      margin-bottom: 4px;
    }
    .info-window .spot-district {
      font-size: 11px;
      color: #8E8E93;
      margin-bottom: 6px;
    }
    .info-window .spot-meta {
      display: flex;
      gap: 8px;
      font-size: 11px;
      color: #555;
    }
    .info-window .spot-meta span {
      display: flex;
      align-items: center;
      gap: 3px;
    }
    .info-window .spot-features {
      font-size: 10px;
      color: #8E8E93;
      margin-top: 6px;
      line-height: 1.4;
    }
    .info-window .walker-info {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .info-window .walker-status {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 10px;
      font-size: 10px;
      font-weight: 600;
      color: #FFFFFF;
    }
    .info-window .walker-status.walking { background: #4CAF82; }
    .info-window .walker-status.paused { background: #F59E0B; }
    .info-window .walker-status.completed { background: #8E8E93; }
    .loading-overlay {
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #F8FBF5;
      z-index: 9999;
      transition: opacity 0.3s;
    }
    .loading-overlay.hidden { opacity: 0; pointer-events: none; }
    .loading-text {
      font-size: 14px;
      color: #8E8E93;
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
    }
  </style>
</head>
<body>
  <div id="loading" class="loading-overlay">
    <div class="loading-text">🗺️ 대전 지도 로딩 중...</div>
  </div>
  <div id="map"></div>

  <script>
    // 카카오맵 SDK 동적 로드
    var script = document.createElement('script');
    script.src = 'https://dapi.kakao.com/v2/maps/sdk.js?appkey=${apiKey}&autoload=false';
    script.onload = function() {
      kakao.maps.load(initMap);
    };
    script.onerror = function() {
      document.getElementById('loading').innerHTML =
        '<div class="loading-text">⚠️ 카카오맵 로드 실패. API 키를 확인해주세요.</div>';
      // 네이티브에 에러 전달
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'error', message: 'SDK load failed' }));
      }
    };
    document.head.appendChild(script);

    var map, walkerMarker, walkerOverlay, routeLine;
    var spotMarkers = [];
    var openInfoWindow = null;

    function initMap() {
      var container = document.getElementById('map');
      var options = {
        center: new kakao.maps.LatLng(${center.lat}, ${center.lng}),
        level: ${zoomLevel}
      };
      map = new kakao.maps.Map(container, options);

      // 지도 컨트롤 추가
      map.addControl(new kakao.maps.ZoomControl(), kakao.maps.ControlPosition.RIGHT);

      // ─── 산책 명소 마커 추가 ───
      var spots = ${markersJSON};
      spots.forEach(function(spot) {
        addSpotMarker(spot);
      });

      // ─── 워커 위치 마커 ───
      ${walkerLoc ? `addWalkerMarker(${walkerLoc.latitude}, ${walkerLoc.longitude}, '${workerName}', '${walkStatus}', '${walkerLoc.district}');` : ""}

      // ─── 산책 경로 폴리라인 ───
      var routeData = ${routeJSON};
      if (routeData.length >= 2) {
        drawRoute(routeData);
      }

      // 로딩 숨기기
      setTimeout(function() {
        document.getElementById('loading').classList.add('hidden');
      }, 500);

      // 네이티브에 준비 완료 전달
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ready' }));
      }
    }

    // 🐾 강아지 발바닥 커스텀 마커
    function addSpotMarker(spot) {
      var position = new kakao.maps.LatLng(spot.lat, spot.lng);

      // 커스텀 오버레이로 강아지 발바닥 아이콘 마커
      var content = document.createElement('div');
      content.className = 'custom-marker';
      content.innerHTML = '🐾';
      content.title = spot.name;

      var overlay = new kakao.maps.CustomOverlay({
        position: position,
        content: content,
        yAnchor: 0.5,
        xAnchor: 0.5,
        zIndex: 3
      });
      overlay.setMap(map);

      // 인포윈도우 HTML
      var infoContent =
        '<div class="info-window">' +
          '<div class="spot-name">' + spot.emoji + ' ' + spot.name + '</div>' +
          '<div class="spot-district">📍 ' + spot.district + '</div>' +
          '<div class="spot-meta">' +
            '<span>⭐ ' + spot.rating + '</span>' +
            '<span>🕐 ' + spot.walkTime + '</span>' +
          '</div>' +
          '<div class="spot-features">' + spot.features + '</div>' +
        '</div>';

      var infoWindow = new kakao.maps.InfoWindow({
        content: infoContent,
        removable: true
      });

      // 마커 클릭 시 인포윈도우 토글
      content.addEventListener('click', function() {
        if (openInfoWindow) {
          openInfoWindow.close();
        }
        if (openInfoWindow === infoWindow) {
          openInfoWindow = null;
          return;
        }
        // 인포윈도우를 지도 위에 표시 (마커 대신 LatLng 기반)
        infoWindow.open(map, new kakao.maps.Marker({ position: position, map: null }));
        openInfoWindow = infoWindow;

        // 해당 위치로 부드럽게 이동
        map.panTo(position);

        // 네이티브에 마커 클릭 이벤트 전달
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'markerClick',
            spot: spot
          }));
        }
      });

      spotMarkers.push({ overlay: overlay, infoWindow: infoWindow });
    }

    // 워커 위치 마커 (초록색 + 펄스 애니메이션)
    function addWalkerMarker(lat, lng, name, status, district) {
      var position = new kakao.maps.LatLng(lat, lng);

      var content = document.createElement('div');
      content.className = 'custom-marker walker';
      content.innerHTML = '🚶';

      walkerOverlay = new kakao.maps.CustomOverlay({
        position: position,
        content: content,
        yAnchor: 0.5,
        xAnchor: 0.5,
        zIndex: 10
      });
      walkerOverlay.setMap(map);

      // 워커 인포윈도우
      var statusLabel = status === 'walking' ? '산책 중' : status === 'paused' ? '일시 정지' : '완료';
      var statusClass = status === 'walking' ? 'walking' : status === 'paused' ? 'paused' : 'completed';

      var infoContent =
        '<div class="info-window">' +
          '<div class="walker-info">' +
            '<div class="spot-name">🚶 ' + name + '</div>' +
            '<span class="walker-status ' + statusClass + '">' + statusLabel + '</span>' +
          '</div>' +
          '<div class="spot-district" style="margin-top:6px">📍 ' + district + '</div>' +
        '</div>';

      var infoWindow = new kakao.maps.InfoWindow({
        content: infoContent,
        removable: true
      });

      content.addEventListener('click', function() {
        if (openInfoWindow) openInfoWindow.close();
        infoWindow.open(map, new kakao.maps.Marker({ position: position, map: null }));
        openInfoWindow = infoWindow;
      });
    }

    // 산책 경로 폴리라인
    function drawRoute(points) {
      var path = points.map(function(p) {
        return new kakao.maps.LatLng(p.lat, p.lng);
      });

      routeLine = new kakao.maps.Polyline({
        path: path,
        strokeWeight: 4,
        strokeColor: '#2E7D32',
        strokeOpacity: 0.8,
        strokeStyle: 'solid'
      });
      routeLine.setMap(map);
    }

    // ─── 네이티브에서 호출하는 함수들 ───

    // 워커 위치 업데이트
    window.updateWalkerPosition = function(lat, lng, district) {
      if (walkerOverlay) {
        walkerOverlay.setPosition(new kakao.maps.LatLng(lat, lng));
      }
      // 경로에 점 추가
      if (routeLine) {
        var path = routeLine.getPath();
        path.push(new kakao.maps.LatLng(lat, lng));
        routeLine.setPath(path);
      }
    };

    // 지도 중심 이동
    window.panToLocation = function(lat, lng) {
      if (map) {
        map.panTo(new kakao.maps.LatLng(lat, lng));
      }
    };

    // 줌 레벨 변경
    window.setZoomLevel = function(level) {
      if (map) {
        map.setLevel(level);
      }
    };
  </script>
</body>
</html>`;
}

// ─── 메인 컴포넌트 ───
export function KakaoMapView({
  visible,
  onClose,
  workerName,
  workerEmoji,
  petName,
  petEmoji,
  walkStatus,
  startedAt,
  currentLocation,
  routePoints = [],
  totalDistanceKm = 0,
  totalDurationSec = 0,
  onEndWalk,
}: KakaoMapProps) {
  const webViewRef = useRef<WebView>(null);
  const [apiKey, setApiKey] = useState<string>("");
  const [mapReady, setMapReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [elapsedSec, setElapsedSec] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // API 키 가져오기
  useEffect(() => {
    if (!visible) return;
    const fetchKey = async () => {
      try {
        const baseUrl = getApiBaseUrl();
        const res = await fetch(`${baseUrl}/api/kakao-map-key`);
        const data = await res.json();
        if (data.key) {
          setApiKey(data.key);
          setError(null);
        } else {
          setError("카카오맵 API 키가 설정되지 않았습니다.");
        }
      } catch (e) {
        setError("API 키를 가져오는 데 실패했습니다.");
      }
    };
    fetchKey();
  }, [visible]);

  // 경과 시간 타이머
  useEffect(() => {
    if (walkStatus === "walking" && startedAt) {
      timerRef.current = setInterval(() => {
        const elapsed = (Date.now() - new Date(startedAt).getTime()) / 1000;
        setElapsedSec(elapsed);
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [walkStatus, startedAt]);

  // 워커 위치 업데이트를 WebView에 전달
  useEffect(() => {
    if (mapReady && currentLocation && webViewRef.current) {
      const js = `window.updateWalkerPosition(${currentLocation.latitude}, ${currentLocation.longitude}, '${currentLocation.district}');`;
      webViewRef.current.injectJavaScript(js);
    }
  }, [mapReady, currentLocation]);

  const handleMessage = useCallback((event: { nativeEvent: { data: string } }) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === "ready") {
        setMapReady(true);
        setLoading(false);
      } else if (data.type === "error") {
        setError(data.message);
        setLoading(false);
      } else if (data.type === "markerClick") {
        haptic();
      }
    } catch {
      // ignore
    }
  }, []);

  const statusLabel =
    walkStatus === "walking"
      ? "산책 중"
      : walkStatus === "paused"
        ? "일시 정지"
        : walkStatus === "completed"
          ? "산책 완료"
          : "대기 중";

  const statusColor =
    walkStatus === "walking"
      ? "#4CAF82"
      : walkStatus === "paused"
        ? "#F59E0B"
        : walkStatus === "completed"
          ? "#8E8E93"
          : "#BDBDBD";

  const mapHTML = apiKey
    ? generateKakaoMapHTML(apiKey, currentLocation, routePoints, workerName, walkStatus)
    : "";

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={s.overlay}>
        <View style={s.sheet}>
          {/* 헤더 */}
          <View style={s.header}>
            <View style={{ flex: 1 }}>
              <Text style={s.title}>🗺️ 실시간 산책 지도</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 }}>
                <View style={[s.statusDot, { backgroundColor: statusColor }]} />
                <Text style={[s.statusText, { color: statusColor }]}>{statusLabel}</Text>
                {currentLocation && (
                  <Text style={s.districtText}>📍 {currentLocation.district}</Text>
                )}
              </View>
            </View>
            <Pressable
              onPress={() => {
                haptic();
                setMapReady(false);
                setLoading(true);
                onClose();
              }}
              style={({ pressed }) => [s.closeBtn, pressed && { opacity: 0.7 }]}
            >
              <Text style={s.closeBtnText}>닫기</Text>
            </Pressable>
          </View>

          {/* 카카오맵 WebView */}
          <View style={s.mapContainer}>
            {error ? (
              <View style={s.errorContainer}>
                <Text style={s.errorEmoji}>⚠️</Text>
                <Text style={s.errorText}>{error}</Text>
                <Text style={s.errorSub}>
                  카카오 Developers에서 JavaScript API 키를 발급받아 설정해주세요.
                </Text>
              </View>
            ) : apiKey ? (
              <>
                {Platform.OS === "web" ? (
                  <iframe
                    srcDoc={mapHTML}
                    style={{
                      width: "100%",
                      height: "100%",
                      border: "none",
                      borderRadius: 16,
                    }}
                    title="카카오맵"
                  />
                ) : (
                  <WebView
                    ref={webViewRef}
                    source={{ html: mapHTML }}
                    style={s.webview}
                    onMessage={handleMessage}
                    javaScriptEnabled={true}
                    domStorageEnabled={true}
                    mixedContentMode="always"
                    allowsInlineMediaPlayback={true}
                    originWhitelist={["*"]}
                    scrollEnabled={false}
                    bounces={false}
                    showsHorizontalScrollIndicator={false}
                    showsVerticalScrollIndicator={false}
                    allowFileAccess={true}
                    allowUniversalAccessFromFileURLs={true}
                  />
                )}
                {loading && (
                  <View style={s.loadingOverlay}>
                    <ActivityIndicator size="large" color="#2E7D32" />
                    <Text style={s.loadingText}>대전 지도 로딩 중...</Text>
                  </View>
                )}
              </>
            ) : (
              <View style={s.loadingOverlay}>
                <ActivityIndicator size="large" color="#2E7D32" />
                <Text style={s.loadingText}>API 키 확인 중...</Text>
              </View>
            )}

            {/* 지도 위 대전 시청 중심 라벨 */}
            <View style={s.mapBadge}>
              <Text style={s.mapBadgeText}>📍 대전광역시</Text>
            </View>
          </View>

          {/* 워커 정보 카드 */}
          <View style={s.infoCard}>
            <View style={s.infoRow}>
              <View style={s.infoAvatar}>
                <Text style={{ fontSize: 24 }}>{workerEmoji}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.infoName}>{workerName}</Text>
                <Text style={s.infoSub}>
                  {petEmoji} {petName}와 산책 중
                </Text>
              </View>
            </View>
          </View>

          {/* 산책 통계 */}
          <View style={s.statsRow}>
            <View style={s.statItem}>
              <Text style={s.statIcon}>⏱️</Text>
              <Text style={s.statValue}>
                {formatDuration(walkStatus === "walking" ? elapsedSec : totalDurationSec)}
              </Text>
              <Text style={s.statLabel}>경과 시간</Text>
            </View>
            <View style={s.statDivider} />
            <View style={s.statItem}>
              <Text style={s.statIcon}>📏</Text>
              <Text style={s.statValue}>{totalDistanceKm.toFixed(2)} km</Text>
              <Text style={s.statLabel}>이동 거리</Text>
            </View>
            <View style={s.statDivider} />
            <View style={s.statItem}>
              <Text style={s.statIcon}>🚶</Text>
              <Text style={s.statValue}>
                {totalDurationSec > 0
                  ? ((totalDistanceKm / (totalDurationSec / 3600)) || 0).toFixed(1)
                  : "0.0"}{" "}
                km/h
              </Text>
              <Text style={s.statLabel}>평균 속도</Text>
            </View>
          </View>

          {/* 산책 종료 버튼 */}
          {walkStatus === "walking" && onEndWalk && (
            <Pressable
              onPress={() => {
                haptic();
                onEndWalk();
              }}
              style={({ pressed }) => [
                s.endWalkBtn,
                pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
              ]}
            >
              <Text style={s.endWalkBtnText}>🛑 산책 종료</Text>
            </Pressable>
          )}

          {walkStatus === "completed" && (
            <View style={s.completedBanner}>
              <Text style={s.completedEmoji}>🎉</Text>
              <Text style={s.completedText}>산책이 완료되었습니다!</Text>
            </View>
          )}

          <View style={{ height: 30 }} />
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: SCREEN_HEIGHT * 0.92,
    paddingTop: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  title: { fontFamily: Fonts.bold, fontSize: 18, color: "#1A1A1A", letterSpacing: -0.3 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 13, fontWeight: "600" },
  districtText: { fontSize: 12, color: "#8E8E93", marginLeft: 4 },
  closeBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#F5F5F5",
  },
  closeBtnText: { fontFamily: Fonts.semiBold, fontSize: 13, color: "#8E8E93" },
  mapContainer: {
    marginHorizontal: 16,
    marginTop: 12,
    height: SCREEN_HEIGHT * 0.38,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#F8FBF5",
    borderWidth: 1,
    borderColor: "#E8ECE0",
    position: "relative",
  },
  webview: {
    flex: 1,
    backgroundColor: "transparent",
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#F8FBF5",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: { fontSize: 13, color: "#8E8E93", fontWeight: "500" },
  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 8,
  },
  errorEmoji: { fontSize: 40 },
  errorText: { fontSize: 14, fontWeight: "700", color: "#FF3B30", textAlign: "center" },
  errorSub: { fontSize: 12, color: "#8E8E93", textAlign: "center", lineHeight: 18 },
  mapBadge: {
    position: "absolute",
    bottom: 8,
    right: 8,
    backgroundColor: "rgba(255,255,255,0.9)",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  mapBadgeText: { fontSize: 10, color: "#555", fontWeight: "600" },
  infoCard: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: "#E8F5E9",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#FFE8DD",
  },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  infoAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#2E7D32",
  },
  infoName: { fontFamily: Fonts.bold, fontSize: 15, color: "#1A1A1A" },
  infoSub: { fontFamily: Fonts.regular, fontSize: 12, color: "#8E8E93", marginTop: 2 },
  statsRow: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: "#F8F8F8",
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
  },
  statItem: { flex: 1, alignItems: "center", gap: 4 },
  statIcon: { fontSize: 20 },
  statValue: { fontFamily: Fonts.bold, fontSize: 14, color: "#1A1A1A" },
  statLabel: { fontFamily: Fonts.regular, fontSize: 11, color: "#8E8E93" },
  statDivider: { width: 1, height: 40, backgroundColor: "#E0E0E0" },
  endWalkBtn: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: "#FF3B30",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  endWalkBtnText: { fontFamily: Fonts.bold, fontSize: 16, color: "#FFFFFF" },
  completedBanner: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: "#F0FFF4",
    borderRadius: 14,
    paddingVertical: 20,
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#C6F6D5",
  },
  completedEmoji: { fontSize: 32 },
  completedText: { fontFamily: Fonts.bold, fontSize: 15, color: "#2E7D32" },
});
