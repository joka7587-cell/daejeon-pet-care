/**
 * 보호자용 - 시뮬레이션 산책 실시간 추적 화면
 * 카카오맵 WebView로 실시간 마커 이동 표시
 *
 * Phase 61 수정사항:
 * - 도로 기반 Polyline (건물 관통 방지)
 * - 경유지 마커를 주요 4곳만 표시 (출발-한빛탑-엑스포다리-시민광장)
 * - 마커 이동이 도로 경로만 따르도록 동기화
 * - map.panTo()로 부드러운 중심 이동
 * - 줌 레벨 3~4 고정
 */
import { useState, useEffect, useRef, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { WebView } from "react-native-webview";
import { ScreenContainer } from "@/components/screen-container";
import { useApp } from "@/lib/app-context";
import { useRouter } from "expo-router";
import { Fonts } from "@/hooks/use-fonts";
import * as Haptics from "expo-haptics";
import { getApiBaseUrl } from "@/constants/oauth";
import {
  EXPO_PARK_ROUTE,
  WAYPOINTS,
  calculateRouteDistance,
  haversineDistance,
} from "@/lib/walk-simulation";

const haptic = () => {
  if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
};

// 카카오맵 HTML 생성 - 도로 기반 경로 + 주요 경유지만 마커
function generateTrackerMapHTML(apiKey: string, initialLat: number, initialLng: number): string {
  // 전체 경로 좌표 (4개 도로 좌표)
  const routePathJSON = JSON.stringify(EXPO_PARK_ROUTE.map(c => ({
    lat: c.latitude,
    lng: c.longitude,
  })));

  // 주요 경유지 (3곳: 출발/경유/도착)
  const waypointsJSON = JSON.stringify(WAYPOINTS.map(wp => ({
    routeIndex: wp.routeIndex,
    label: wp.label,
    emoji: wp.emoji,
    lat: EXPO_PARK_ROUTE[wp.routeIndex].latitude,
    lng: EXPO_PARK_ROUTE[wp.routeIndex].longitude,
  })));

  return `<!DOCTYPE html>
<html><head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/>
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:100%;height:100%;overflow:hidden}
#map{width:100%;min-height:400px;height:100%;position:relative;z-index:1}
.walker-marker{
  width:48px;height:48px;border-radius:50%;
  background:#2E7D32;border:3px solid white;
  display:flex;align-items:center;justify-content:center;
  font-size:24px;box-shadow:0 3px 14px rgba(0,0,0,0.4);
  position:relative;z-index:100;
}
.walker-marker .pulse{
  position:absolute;width:48px;height:48px;border-radius:50%;
  border:2px solid #2E7D32;
  animation:pulse 1.5s ease-in-out infinite;
}
@keyframes pulse{
  0%{transform:scale(1);opacity:0.6}
  100%{transform:scale(2.2);opacity:0}
}
.wp-marker{
  text-align:center;
}
.wp-icon{
  width:32px;height:32px;border-radius:50%;
  background:white;border:2px solid #2E7D32;
  display:flex;align-items:center;justify-content:center;
  font-size:14px;box-shadow:0 2px 6px rgba(0,0,0,0.2);
  margin:0 auto;
}
.wp-label{
  font-size:10px;color:#333;text-align:center;
  white-space:nowrap;margin-top:3px;
  background:rgba(255,255,255,0.9);padding:2px 6px;border-radius:6px;
  font-weight:600;box-shadow:0 1px 3px rgba(0,0,0,0.1);
}
.loading-overlay{
  position:absolute;top:0;left:0;right:0;bottom:0;
  display:flex;align-items:center;justify-content:center;
  background:rgba(248,248,248,0.95);z-index:999;
  font-family:-apple-system,sans-serif;color:#666;font-size:14px;
}
.refresh-btn{
  position:absolute;top:12px;right:12px;z-index:500;
  width:36px;height:36px;border-radius:4px;
  background:#FFFFFF;border:1px solid #ddd;
  display:flex;align-items:center;justify-content:center;
  font-size:18px;cursor:pointer;
  box-shadow:0 1px 4px rgba(0,0,0,0.15);
  transition:background 0.15s;
}
.refresh-btn:hover{background:#F5F5F5}
.refresh-btn:active{background:#EEEEEE;transform:scale(0.95)}
.toast-msg{
  position:absolute;top:56px;left:50%;transform:translateX(-50%);
  z-index:600;background:rgba(46,125,50,0.92);color:#fff;
  padding:8px 16px;border-radius:20px;font-size:13px;
  font-family:-apple-system,sans-serif;font-weight:600;
  white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,0.2);
  opacity:0;transition:opacity 0.3s;
  pointer-events:none;
}
.toast-msg.show{opacity:1}
</style>
</head><body>
<div id="loading" class="loading-overlay">지도를 불러오는 중...</div>
<div id="map"></div>
<div id="refreshBtn" class="refresh-btn" onclick="refreshLocation()">🔄</div>
<div id="toast" class="toast-msg">실시간 위치를 동기화합니다</div>
<script>
function sendMsg(obj){
  try{
    if(window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(obj));
    else if(window.parent) window.parent.postMessage(JSON.stringify(obj),'*');
  }catch(e){}
}
</script>
<script src="https://dapi.kakao.com/v2/maps/sdk.js?appkey=${apiKey}&autoload=false"
  onerror="document.getElementById('loading').innerHTML='지도 SDK 로드 실패';sendMsg({type:'error',msg:'SDK load failed'})">
</script>
<script>
(function(){
  var loadTimeout = setTimeout(function(){
    document.getElementById('loading').innerHTML = '지도 로드 시간 초과';
    sendMsg({type:'error',msg:'timeout'});
  }, 10000);

  if(typeof kakao === 'undefined' || !kakao.maps){
    return;
  }

  kakao.maps.load(function(){
    clearTimeout(loadTimeout);

    // 300ms 지연 - DOM 확실히 생성 후 지도 초기화
    setTimeout(function(){
      var container = document.getElementById('map');
      if(!container){
        sendMsg({type:'error',msg:'container not found'});
        return;
      }

      var map = new kakao.maps.Map(container, {
        center: new kakao.maps.LatLng(${initialLat}, ${initialLng}),
        level: 4
      });

      // 전역 참조
      window.kakaoMapInstance = map;

      // relayout 강제 실행
      map.relayout();
      map.setCenter(new kakao.maps.LatLng(${initialLat}, ${initialLng}));

      // 줌 컨트롤
      map.addControl(new kakao.maps.ZoomControl(), kakao.maps.ControlPosition.RIGHT);

      // 도로 기반 경로 데이터 (4개 좌표)
      var routeData = ${routePathJSON};
      var routePath = routeData.map(function(c){ return new kakao.maps.LatLng(c.lat, c.lng); });

      // 전체 경로 폴리라인 (연한 회색 점선 - 아직 안 간 구간)
      new kakao.maps.Polyline({
        map: map,
        path: routePath,
        strokeWeight: 4,
        strokeColor: '#CCCCCC',
        strokeOpacity: 0.5,
        strokeStyle: 'dashed'
      });

      // 이동 경로 폴리라인 (진행된 구간 - 파란색 실선)
      var activePolyline = new kakao.maps.Polyline({
        map: map,
        path: [routePath[0]],
        strokeWeight: 5,
        strokeColor: '#3366FF',
        strokeOpacity: 0.8,
        strokeStyle: 'solid'
      });

      // 주요 경유지 마커 (3곳: 출발/경유/도착)
      var waypoints = ${waypointsJSON};
      waypoints.forEach(function(wp){
        var pos = new kakao.maps.LatLng(wp.lat, wp.lng);
        var el = document.createElement('div');
        el.className = 'wp-marker';

        var icon = document.createElement('div');
        icon.className = 'wp-icon';
        icon.textContent = wp.emoji;
        icon.id = 'wp_' + wp.routeIndex;
        el.appendChild(icon);

        var label = document.createElement('div');
        label.className = 'wp-label';
        label.textContent = wp.label;
        el.appendChild(label);

        new kakao.maps.CustomOverlay({
          position: pos,
          content: el,
          yAnchor: 1.5,
          zIndex: 5,
          map: map
        });
      });

      // 워커 마커 (강아지)
      var walkerEl = document.createElement('div');
      walkerEl.className = 'walker-marker';
      walkerEl.innerHTML = '<div class="pulse"></div>\\uD83D\\uDC15';

      var walkerOverlay = new kakao.maps.CustomOverlay({
        position: new kakao.maps.LatLng(${initialLat}, ${initialLng}),
        content: walkerEl,
        yAnchor: 0.5,
        zIndex: 100,
        map: map
      });

      // 로딩 오버레이 제거
      document.getElementById('loading').style.display = 'none';

      // 마커 업데이트 함수 (외부에서 호출)
      // stepIndex: 현재 EXPO_PARK_ROUTE 배열 인덱스
      window.updateWalkerPosition = function(lat, lng, stepIndex) {
        var newPos = new kakao.maps.LatLng(lat, lng);
        walkerOverlay.setPosition(newPos);

        // 부드러운 지도 중심 이동
        map.panTo(newPos);

        // 줌 레벨 3~4 유지
        var currentLevel = map.getLevel();
        if(currentLevel < 3 || currentLevel > 4){
          map.setLevel(4);
        }

        // 이동 경로 업데이트 (도로 기반 - 해당 인덱스까지의 모든 좌표)
        var activePath = [];
        for(var i = 0; i <= stepIndex && i < routePath.length; i++){
          activePath.push(routePath[i]);
        }
        // 현재 위치가 정확히 routePath[stepIndex]가 아닐 수 있으므로 추가
        activePath.push(newPos);
        activePolyline.setPath(activePath);

        // 경유지 색상 업데이트 (통과한 경유지 녹색으로)
        waypoints.forEach(function(wp){
          var wpEl = document.getElementById('wp_' + wp.routeIndex);
          if(wpEl){
            if(wp.routeIndex < stepIndex){
              wpEl.style.background = '#4CAF82';
              wpEl.style.borderColor = '#2E7D32';
              wpEl.style.color = 'white';
            } else if(wp.routeIndex === stepIndex){
              wpEl.style.background = '#2E7D32';
              wpEl.style.borderColor = '#1B5E20';
              wpEl.style.color = 'white';
            }
          }
        });
      };

      // 새로고침 버튼 로직 - 부모에게 메시지 보내서 최신 좌표 요청
      window.refreshLocation = function(){
        sendMsg({type:'refresh_request'});
        // 토스트 표시
        var toast = document.getElementById('toast');
        if(toast){
          toast.classList.add('show');
          setTimeout(function(){ toast.classList.remove('show'); }, 1000);
        }
      };

      // 부모에서 좌표를 주입하면 relayout도 실행
      window.forceRelayout = function(){
        map.relayout();
      };

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

export default function LiveTrackerScreen() {
  const { state } = useApp();
  const router = useRouter();
  const { walkSimulation } = state;
  const webViewRef = useRef<WebView>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [apiKey, setApiKey] = useState<string>("");
  const [mapReady, setMapReady] = useState(false);
  const [mapLoadFailed, setMapLoadFailed] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [debugCoord, setDebugCoord] = useState<{ lat: number; lng: number; index: number } | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const simStatus = walkSimulation.status;
  const currentIndex = walkSimulation.currentIndex;
  const currentCoord = EXPO_PARK_ROUTE[currentIndex] || EXPO_PARK_ROUTE[0];

  // API 키 가져오기
  useEffect(() => {
    const fetchKey = async () => {
      try {
        const baseUrl = getApiBaseUrl();
        if (!baseUrl) { setMapLoadFailed(true); return; }
        const res = await fetch(`${baseUrl}/api/kakao-map-key`);
        if (!res.ok) { setMapLoadFailed(true); return; }
        const data = await res.json();
        if (data.key) setApiKey(data.key);
        else setMapLoadFailed(true);
      } catch {
        setMapLoadFailed(true);
      }
    };
    fetchKey();
    const timeout = setTimeout(() => {
      setMapLoadFailed(prev => prev ? prev : true);
    }, 8000);
    return () => clearTimeout(timeout);
  }, []);

  // 경과 시간 타이머
  useEffect(() => {
    if (simStatus === "running" && walkSimulation.startedAt) {
      timerRef.current = setInterval(() => {
        const elapsed = (Date.now() - new Date(walkSimulation.startedAt!).getTime()) / 1000;
        setElapsedSec(Math.floor(elapsed));
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [simStatus, walkSimulation.startedAt]);

  // 지도에 좌표 전송 헬퍼
  const sendPositionToMap = useCallback((lat: number, lng: number, index: number) => {
    const js = `window.updateWalkerPosition(${lat}, ${lng}, ${index});`;
    if (Platform.OS === "web") {
      if (iframeRef.current && iframeRef.current.contentWindow) {
        try { (iframeRef.current.contentWindow as any).eval(js); } catch {}
      }
    } else {
      webViewRef.current?.injectJavaScript(js + "true;");
    }
    // 디버깅 UI 업데이트
    setDebugCoord({ lat, lng, index });
  }, []);

  // 초기 로드 시 localStorage에 기존 좌표가 있으면 복원
  useEffect(() => {
    if (!mapReady) return;
    if (Platform.OS === "web" && typeof window !== "undefined" && window.localStorage) {
      const existing = window.localStorage.getItem("currentLocation");
      if (existing) {
        try {
          const parsed = JSON.parse(existing);
          sendPositionToMap(parsed.lat, parsed.lng, parsed.index);
        } catch {}
      }
    }
    // AsyncStorage 폴백도 시도
    AsyncStorage.getItem("walk_simulation_current").then((data) => {
      if (data) {
        try {
          const parsed = JSON.parse(data);
          sendPositionToMap(parsed.lat, parsed.lng, parsed.index);
        } catch {}
      }
    }).catch(() => {});
  }, [mapReady, sendPositionToMap]);

  // window.addEventListener('storage') - 실시간 감지 (타 탭/창에서 변경 시)
  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") return;
    if (!mapReady) return;

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === "currentLocation" && event.newValue) {
        try {
          const parsed = JSON.parse(event.newValue);
          sendPositionToMap(parsed.lat, parsed.lng, parsed.index);
        } catch {}
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [mapReady, sendPositionToMap]);

  // 같은 탭 내 동기화 - localStorage 폴링 (같은 탭에서는 storage 이벤트가 발생하지 않으므로)
  useEffect(() => {
    if (!mapReady) return;

    pollingRef.current = setInterval(() => {
      if (Platform.OS === "web" && typeof window !== "undefined" && window.localStorage) {
        const data = window.localStorage.getItem("currentLocation");
        if (data) {
          try {
            const parsed = JSON.parse(data);
            sendPositionToMap(parsed.lat, parsed.lng, parsed.index);
          } catch {}
        }
      } else {
        // 네이티브에서는 AsyncStorage 폴링
        AsyncStorage.getItem("walk_simulation_current").then((data) => {
          if (data) {
            try {
              const parsed = JSON.parse(data);
              sendPositionToMap(parsed.lat, parsed.lng, parsed.index);
            } catch {}
          }
        }).catch(() => {});
      }
    }, 1000);

    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, [mapReady, sendPositionToMap]);

  // 상태 변경 시 지도 마커 업데이트
  useEffect(() => {
    if (!mapReady) return;
    const coord = EXPO_PARK_ROUTE[currentIndex] || EXPO_PARK_ROUTE[0];
    sendPositionToMap(coord.latitude, coord.longitude, currentIndex);
  }, [currentIndex, mapReady, sendPositionToMap]);

  // 이동 거리 계산
  let distanceSoFar = 0;
  for (let i = 1; i <= currentIndex && i < EXPO_PARK_ROUTE.length; i++) {
    distanceSoFar += haversineDistance(
      EXPO_PARK_ROUTE[i - 1].latitude,
      EXPO_PARK_ROUTE[i - 1].longitude,
      EXPO_PARK_ROUTE[i].latitude,
      EXPO_PARK_ROUTE[i].longitude
    );
  }
  const totalDistance = calculateRouteDistance(EXPO_PARK_ROUTE);
  const progressPercent = ((currentIndex + 1) / EXPO_PARK_ROUTE.length) * 100;

  // 현재 구간 이름 (주요 경유지 기준)
  const getCurrentSection = () => {
    for (let i = WAYPOINTS.length - 1; i >= 0; i--) {
      if (currentIndex >= WAYPOINTS[i].routeIndex) {
        if (i < WAYPOINTS.length - 1) {
          return `${WAYPOINTS[i].label} → ${WAYPOINTS[i + 1].label}`;
        }
        return WAYPOINTS[i].label;
      }
    }
    return WAYPOINTS[0].label;
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return m > 0 ? `${m}분 ${s}초` : `${s}초`;
  };

  // 새로고침 처리 함수 - 최신 좌표 읽어서 지도에 주입
  const handleRefreshRequest = useCallback(() => {
    // 1) 부모 페이지 localStorage에서 읽기
    if (Platform.OS === "web" && typeof window !== "undefined" && window.localStorage) {
      const data = window.localStorage.getItem("currentLocation");
      if (data) {
        try {
          const parsed = JSON.parse(data);
          sendPositionToMap(parsed.lat, parsed.lng, parsed.index ?? 0);
          // relayout도 강제 실행
          const relayoutJs = `window.forceRelayout();`;
          if (iframeRef.current && iframeRef.current.contentWindow) {
            try { (iframeRef.current.contentWindow as any).eval(relayoutJs); } catch {}
          }
          return;
        } catch {}
      }
    }
    // 2) AsyncStorage 폴백
    AsyncStorage.getItem("walk_simulation_current").then((data) => {
      if (data) {
        try {
          const parsed = JSON.parse(data);
          sendPositionToMap(parsed.lat, parsed.lng, parsed.index ?? 0);
        } catch {}
      }
    }).catch(() => {});
    // 3) 현재 상태에서라도 전송
    const coord = EXPO_PARK_ROUTE[currentIndex] || EXPO_PARK_ROUTE[0];
    sendPositionToMap(coord.latitude, coord.longitude, currentIndex);
  }, [sendPositionToMap, currentIndex]);

  const handleWebViewMessage = useCallback((event: { nativeEvent: { data: string } }) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === "ready") setMapReady(true);
      if (data.type === "refresh_request") handleRefreshRequest();
    } catch {}
  }, [handleRefreshRequest]);

  // iframe message handler (web)
  useEffect(() => {
    if (Platform.OS === "web") {
      const handler = (event: MessageEvent) => {
        try {
          const data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
          if (data.type === "ready") setMapReady(true);
          if (data.type === "refresh_request") handleRefreshRequest();
        } catch {}
      };
      window.addEventListener("message", handler);
      return () => window.removeEventListener("message", handler);
    }
  }, [handleRefreshRequest]);

  // 지도 렌더링
  const renderMap = () => {
    if (mapLoadFailed && !apiKey) {
      return (
        <View style={s.mapFallback}>
          <Text style={{ fontSize: 48, marginBottom: 8 }}>🗺️</Text>
          <Text style={{ fontSize: 16, fontWeight: "700", color: "#2E7D32" }}>실시간 추적</Text>
          <Text style={{ fontSize: 13, color: "#8E8E93", marginTop: 4 }}>
            지도 로드에 실패했습니다. 관리자에게 문의하세요.
          </Text>
        </View>
      );
    }

    if (!apiKey) {
      return (
        <View style={s.mapLoading}>
          <ActivityIndicator size="large" color="#2E7D32" />
          <Text style={{ marginTop: 8, fontSize: 13, color: "#8E8E93" }}>지도를 불러오는 중...</Text>
        </View>
      );
    }

    const initialCoord = EXPO_PARK_ROUTE[0];
    const html = generateTrackerMapHTML(apiKey, initialCoord.latitude, initialCoord.longitude);

    if (Platform.OS === "web") {
      return (
        <View style={s.mapContainer}>
          <iframe
            ref={(el) => { iframeRef.current = el; }}
            srcDoc={html}
            style={{
              width: "100%",
              height: "100%",
              border: "none",
              position: "absolute",
              top: 0,
              left: 0,
              zIndex: 1,
            }}
            title="kakao-map-live-tracker"
            onLoad={() => { setTimeout(() => setMapReady(true), 3000); }}
          />
          {!mapReady && (
            <View style={s.mapOverlay}>
              <ActivityIndicator size="large" color="#2E7D32" />
              <Text style={{ marginTop: 8, fontSize: 13, color: "#8E8E93" }}>지도를 불러오는 중...</Text>
            </View>
          )}
        </View>
      );
    }

    return (
      <View style={s.mapContainer}>
        <WebView
          ref={webViewRef}
          source={{ html }}
          style={s.mapWebView}
          onMessage={handleWebViewMessage}
          scrollEnabled={false}
          scalesPageToFit={false}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          mixedContentMode="always"
          originWhitelist={["*"]}
        />
        {!mapReady && (
          <View style={s.mapOverlay}>
            <ActivityIndicator size="large" color="#2E7D32" />
            <Text style={{ marginTop: 8, fontSize: 13, color: "#8E8E93" }}>지도를 불러오는 중...</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <ScreenContainer edges={["top", "left", "right", "bottom"]} className="p-0">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* 헤더 */}
        <View style={s.header}>
          <Pressable
            onPress={() => { haptic(); router.back(); }}
            style={({ pressed }) => [s.backBtn, pressed && { opacity: 0.7 }]}
          >
            <Text style={s.backBtnText}>‹ 뒤로</Text>
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={s.headerTitle}>실시간 산책 추적</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 }}>
              <View style={[s.statusDot, {
                backgroundColor: simStatus === "running" ? "#4CAF82" : simStatus === "paused" ? "#F59E0B" : "#8E8E93",
              }]} />
              <Text style={[s.statusText, {
                color: simStatus === "running" ? "#4CAF82" : simStatus === "paused" ? "#F59E0B" : "#8E8E93",
              }]}>
                {simStatus === "running" ? "산책 중" : simStatus === "paused" ? "일시정지" : simStatus === "completed" ? "산책 완료" : "대기 중"}
              </Text>
            </View>
          </View>
          <View style={s.simBadge}>
            <Text style={s.simBadgeText}>SIM</Text>
          </View>
        </View>

        {/* 카카오맵 지도 */}
        <View style={{ position: "relative" }}>
          {renderMap()}
          {/* React Native 측 새로고침 버튼 (지도 우측 상단) */}
          <Pressable
            onPress={() => {
              haptic();
              handleRefreshRequest();
            }}
            style={({ pressed }) => [s.refreshBtn, pressed && { opacity: 0.7, transform: [{ scale: 0.95 }] }]}
          >
            <Text style={{ fontSize: 18 }}>🔄</Text>
          </Pressable>
          {/* 디버깅 좌표 UI */}
          {debugCoord && (
            <View style={s.debugOverlay}>
              <Text style={s.debugText}>
                수신: {debugCoord.lat.toFixed(5)}, {debugCoord.lng.toFixed(5)} [{debugCoord.index}/{EXPO_PARK_ROUTE.length}]
              </Text>
            </View>
          )}
        </View>

        {/* 워커 정보 카드 */}
        <View style={s.infoCard}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View style={s.walkerAvatar}>
              <Text style={{ fontSize: 24 }}>{walkSimulation.walkerEmoji}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.walkerName}>{walkSimulation.walkerName}</Text>
              <Text style={s.walkerSub}>
                {walkSimulation.petEmoji} {walkSimulation.petName}와 산책 중
              </Text>
            </View>
            <View style={s.locationBadge}>
              <Text style={s.locationBadgeText}>📍 {currentCoord.district}</Text>
            </View>
          </View>
        </View>

        {/* 현재 구간 표시 */}
        <View style={s.sectionCard}>
          <Text style={s.sectionLabel}>현재 구간</Text>
          <Text style={s.sectionValue}>{getCurrentSection()}</Text>
        </View>

        {/* 산책 통계 */}
        <View style={s.statsRow}>
          <View style={s.statItem}>
            <Text style={s.statIcon}>⏱️</Text>
            <Text style={s.statValue}>{formatTime(elapsedSec)}</Text>
            <Text style={s.statLabel}>경과 시간</Text>
          </View>
          <View style={s.statDivider} />
          <View style={s.statItem}>
            <Text style={s.statIcon}>📏</Text>
            <Text style={s.statValue}>{distanceSoFar.toFixed(2)} km</Text>
            <Text style={s.statLabel}>이동 거리</Text>
          </View>
          <View style={s.statDivider} />
          <View style={s.statItem}>
            <Text style={s.statIcon}>📍</Text>
            <Text style={s.statValue}>{currentIndex + 1}/{EXPO_PARK_ROUTE.length}</Text>
            <Text style={s.statLabel}>진행 포인트</Text>
          </View>
        </View>

        {/* 진행 바 */}
        <View style={s.progressBar}>
          <View style={s.progressBg}>
            <View style={[s.progressFill, { width: `${progressPercent}%` }]} />
          </View>
          <Text style={s.progressText}>{currentCoord.label}</Text>
        </View>

        {/* 완료 배너 */}
        {simStatus === "completed" && (
          <View style={s.completedBanner}>
            <Text style={{ fontSize: 32 }}>🎉</Text>
            <Text style={s.completedText}>산책이 완료되었습니다!</Text>
            <Text style={s.completedSub}>
              총 {totalDistance.toFixed(2)}km · {WAYPOINTS.length}개 주요 경유지
            </Text>
          </View>
        )}

        {simStatus === "idle" && (
          <View style={s.idleBanner}>
            <Text style={{ fontSize: 32 }}>⏳</Text>
            <Text style={s.idleText}>시뮬레이션 대기 중</Text>
            <Text style={s.idleSub}>관리자 메뉴에서 시뮬레이션을 시작하세요</Text>
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
    gap: 12,
  },
  backBtn: { paddingVertical: 4, paddingRight: 8 },
  backBtnText: { fontFamily: Fonts.semiBold, fontSize: 17, color: "#2E7D32" },
  headerTitle: { fontFamily: Fonts.bold, fontSize: 18, color: "#1A1A1A", letterSpacing: -0.3 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontFamily: Fonts.semiBold, fontSize: 12 },
  simBadge: {
    backgroundColor: "#2E7D32",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  simBadgeText: { fontFamily: Fonts.bold, fontSize: 10, color: "#FFFFFF", letterSpacing: 1 },
  // 지도 컨테이너 - 강제 고정 스타일
  mapContainer: {
    height: 400,
    width: "100%",
    position: "relative",
    backgroundColor: "#F0F0F0",
    borderBottomWidth: 1,
    borderBottomColor: "#E8E8E8",
    overflow: "hidden",
    zIndex: 1,
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
  mapOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(248,248,248,0.95)",
    zIndex: 10,
  },
  mapLoading: {
    height: 400,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8F8F8",
    borderBottomWidth: 1,
    borderBottomColor: "#E8E8E8",
  },
  mapFallback: {
    height: 400,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F0F7F0",
    borderBottomWidth: 1,
    borderBottomColor: "#E8E8E8",
  },
  infoCard: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: "#E8F5E9",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#C6F6D5",
  },
  walkerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#2E7D32",
  },
  walkerName: { fontFamily: Fonts.bold, fontSize: 15, color: "#1A1A1A" },
  walkerSub: { fontFamily: Fonts.regular, fontSize: 12, color: "#8E8E93", marginTop: 2 },
  locationBadge: {
    backgroundColor: "#2E7D32",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  locationBadgeText: { fontSize: 11, color: "#FFFFFF", fontWeight: "700" },
  sectionCard: {
    marginHorizontal: 16,
    marginTop: 8,
    backgroundColor: "#FFF8E1",
    borderRadius: 10,
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#FFE082",
  },
  sectionLabel: {
    fontFamily: Fonts.semiBold,
    fontSize: 11,
    color: "#F57F17",
  },
  sectionValue: {
    fontFamily: Fonts.bold,
    fontSize: 13,
    color: "#1A1A1A",
    flex: 1,
  },
  statsRow: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginTop: 10,
    backgroundColor: "#F8F8F8",
    borderRadius: 14,
    padding: 14,
    alignItems: "center",
  },
  statItem: { flex: 1, alignItems: "center", gap: 3 },
  statIcon: { fontSize: 18 },
  statValue: { fontFamily: Fonts.bold, fontSize: 14, color: "#1A1A1A" },
  statLabel: { fontFamily: Fonts.regular, fontSize: 10, color: "#8E8E93" },
  statDivider: { width: 1, height: 36, backgroundColor: "#E0E0E0" },
  progressBar: {
    marginHorizontal: 16,
    marginTop: 10,
    gap: 6,
  },
  progressBg: {
    height: 6,
    backgroundColor: "#F0F0F0",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: 6,
    backgroundColor: "#2E7D32",
    borderRadius: 3,
  },
  progressText: {
    fontFamily: Fonts.regular,
    fontSize: 11,
    color: "#8E8E93",
    textAlign: "center",
  },
  completedBanner: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: "#F0FFF4",
    borderRadius: 14,
    padding: 20,
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: "#C6F6D5",
  },
  completedText: { fontFamily: Fonts.bold, fontSize: 16, color: "#2E7D32" },
  completedSub: { fontFamily: Fonts.regular, fontSize: 12, color: "#4CAF82" },
  idleBanner: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: "#F8F8F8",
    borderRadius: 14,
    padding: 20,
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  idleText: { fontFamily: Fonts.bold, fontSize: 16, color: "#8E8E93" },
  idleSub: { fontFamily: Fonts.regular, fontSize: 12, color: "#BDBDBD" },
  refreshBtn: {
    position: "absolute" as const,
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 4,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#DDDDDD",
    alignItems: "center" as const,
    justifyContent: "center" as const,
    zIndex: 500,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  debugOverlay: {
    position: "absolute" as const,
    bottom: 8,
    left: 8,
    backgroundColor: "rgba(0,0,0,0.7)",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    zIndex: 100,
  },
  debugText: {
    fontFamily: Fonts.regular,
    fontSize: 10,
    color: "#00FF88",
    letterSpacing: 0.3,
  },
});
