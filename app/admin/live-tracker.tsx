/**
 * 보호자용 - 시뮬레이션 산책 실시간 추적 화면
 * 카카오맵 WebView로 실시간 마커 이동 표시
 *
 * Phase 71: 강제 동기화 시스템
 * - walker_location 키로 통일 (StorageEvent + CustomEvent 이중 수신)
 * - 부드러운 마커 이동 애니메이션 (requestAnimationFrame 기반 보간)
 * - 초기 상태 일치화: 뒤늦게 접속해도 즉시 복원
 * - 코스 변경 시 지도 경로/경유지/중심점 자동 갱신
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
  SIMULATION_COURSES,
  getCourseById,
  calculateRouteDistance,
  haversineDistance,
  type SimulationCourse,
  type SimulationCoord,
  type Waypoint,
} from "@/lib/walk-simulation";

const haptic = () => {
  if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
};

const STORAGE_KEY = "walker_location";

// 카카오맵 HTML 생성 - 부드러운 애니메이션 포함
function generateTrackerMapHTML(
  apiKey: string,
  initialLat: number,
  initialLng: number,
  route: SimulationCoord[],
  waypoints: Waypoint[]
): string {
  const routePathJSON = JSON.stringify(route.map(c => ({
    lat: c.latitude,
    lng: c.longitude,
  })));

  const waypointsJSON = JSON.stringify(waypoints.map(wp => ({
    routeIndex: wp.routeIndex,
    label: wp.label,
    emoji: wp.emoji,
    lat: route[wp.routeIndex].latitude,
    lng: route[wp.routeIndex].longitude,
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
  transition:none;
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
.wp-marker{text-align:center}
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
.status-bar{
  position:absolute;top:12px;left:12px;z-index:500;
  background:rgba(46,125,50,0.92);color:#fff;
  padding:6px 12px;border-radius:20px;font-size:12px;
  font-family:-apple-system,sans-serif;font-weight:600;
  white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,0.2);
  display:flex;align-items:center;gap:6px;
}
.status-dot{
  width:8px;height:8px;border-radius:50%;
  background:#4ADE80;
  animation:blink 1s ease-in-out infinite;
}
@keyframes blink{
  0%,100%{opacity:1}
  50%{opacity:0.3}
}
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
<div id="statusBar" class="status-bar" style="display:none">
  <div class="status-dot"></div>
  <span id="statusText">연결 대기 중</span>
</div>
<div id="toast" class="toast-msg"></div>
<script>
function sendMsg(obj){
  try{
    if(window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(obj));
    else if(window.parent) window.parent.postMessage(JSON.stringify(obj),'*');
  }catch(e){}
}
function showToast(msg){
  var t=document.getElementById('toast');
  if(t){t.textContent=msg;t.classList.add('show');setTimeout(function(){t.classList.remove('show');},1500);}
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

  if(typeof kakao === 'undefined' || !kakao.maps){ return; }

  kakao.maps.load(function(){
    clearTimeout(loadTimeout);

    setTimeout(function(){
      var container = document.getElementById('map');
      if(!container){ sendMsg({type:'error',msg:'container not found'}); return; }

      var map = new kakao.maps.Map(container, {
        center: new kakao.maps.LatLng(${initialLat}, ${initialLng}),
        level: 4
      });
      window.kakaoMapInstance = map;
      map.relayout();
      map.setCenter(new kakao.maps.LatLng(${initialLat}, ${initialLng}));
      map.addControl(new kakao.maps.ZoomControl(), kakao.maps.ControlPosition.RIGHT);

      // 경로 데이터
      var routeData = ${routePathJSON};
      var routePath = routeData.map(function(c){ return new kakao.maps.LatLng(c.lat, c.lng); });

      // 전체 경로 폴리라인 (점선)
      var bgPolyline = new kakao.maps.Polyline({
        map: map, path: routePath,
        strokeWeight: 4, strokeColor: '#CCCCCC', strokeOpacity: 0.5, strokeStyle: 'dashed'
      });

      // 이동 경로 폴리라인 (실선)
      var activePolyline = new kakao.maps.Polyline({
        map: map, path: [routePath[0]],
        strokeWeight: 5, strokeColor: '#3366FF', strokeOpacity: 0.8, strokeStyle: 'solid'
      });

      // 경유지 마커
      var waypoints = ${waypointsJSON};
      var wpOverlays = [];
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
        var overlay = new kakao.maps.CustomOverlay({
          position: pos, content: el, yAnchor: 1.5, zIndex: 5, map: map
        });
        wpOverlays.push(overlay);
      });

      // 워커 마커
      var walkerEl = document.createElement('div');
      walkerEl.className = 'walker-marker';
      walkerEl.innerHTML = '<div class="pulse"></div>\\uD83D\\uDC15';
      var walkerOverlay = new kakao.maps.CustomOverlay({
        position: new kakao.maps.LatLng(${initialLat}, ${initialLng}),
        content: walkerEl, yAnchor: 0.5, zIndex: 100, map: map
      });

      document.getElementById('loading').style.display = 'none';

      // ─── 부드러운 마커 이동 (requestAnimationFrame 기반) ───
      var currentLat = ${initialLat};
      var currentLng = ${initialLng};
      var targetLat = ${initialLat};
      var targetLng = ${initialLng};
      var animating = false;
      var animStartTime = 0;
      var animDuration = 800; // 800ms 애니메이션
      var animStartLat = 0;
      var animStartLng = 0;

      function easeInOutCubic(t){
        return t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2,3)/2;
      }

      function animateStep(timestamp){
        if(!animating) return;
        var elapsed = timestamp - animStartTime;
        var t = Math.min(elapsed / animDuration, 1);
        var eased = easeInOutCubic(t);

        currentLat = animStartLat + (targetLat - animStartLat) * eased;
        currentLng = animStartLng + (targetLng - animStartLng) * eased;

        var pos = new kakao.maps.LatLng(currentLat, currentLng);
        walkerOverlay.setPosition(pos);

        if(t < 1){
          requestAnimationFrame(animateStep);
        } else {
          animating = false;
          currentLat = targetLat;
          currentLng = targetLng;
        }
      }

      function smoothMoveTo(lat, lng){
        animStartLat = currentLat;
        animStartLng = currentLng;
        targetLat = lat;
        targetLng = lng;
        animStartTime = performance.now();
        if(!animating){
          animating = true;
          requestAnimationFrame(animateStep);
        }
      }

      // 마커 업데이트 (부드러운 이동)
      window.updateWalkerPosition = function(lat, lng, stepIndex, doAnimate) {
        if(doAnimate !== false){
          smoothMoveTo(lat, lng);
        } else {
          // 즉시 이동 (초기화 시)
          currentLat = lat;
          currentLng = lng;
          targetLat = lat;
          targetLng = lng;
          walkerOverlay.setPosition(new kakao.maps.LatLng(lat, lng));
        }

        // 부드러운 지도 중심 이동
        map.panTo(new kakao.maps.LatLng(lat, lng));

        // 줌 레벨 유지
        var currentLevel = map.getLevel();
        if(currentLevel < 3 || currentLevel > 5){ map.setLevel(4); }

        // 이동 경로 업데이트
        if(stepIndex !== undefined && stepIndex >= 0){
          var activePath = [];
          for(var i = 0; i <= stepIndex && i < routePath.length; i++){
            activePath.push(routePath[i]);
          }
          activePath.push(new kakao.maps.LatLng(lat, lng));
          activePolyline.setPath(activePath);

          // 경유지 색상 업데이트
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
        }
      };

      // 상태바 업데이트
      window.updateStatusBar = function(text, visible){
        var bar = document.getElementById('statusBar');
        var txt = document.getElementById('statusText');
        if(bar) bar.style.display = visible ? 'flex' : 'none';
        if(txt) txt.textContent = text || '';
      };

      // 코스 변경 함수
      window.changeCourse = function(newRouteJSON, newWaypointsJSON) {
        try {
          var newRoute = JSON.parse(newRouteJSON);
          var newWaypoints = JSON.parse(newWaypointsJSON);

          bgPolyline.setMap(null);
          activePolyline.setMap(null);
          wpOverlays.forEach(function(o){ o.setMap(null); });
          wpOverlays = [];

          routeData = newRoute;
          routePath = newRoute.map(function(c){ return new kakao.maps.LatLng(c.lat, c.lng); });

          bgPolyline = new kakao.maps.Polyline({
            map: map, path: routePath,
            strokeWeight: 4, strokeColor: '#CCCCCC', strokeOpacity: 0.5, strokeStyle: 'dashed'
          });
          activePolyline = new kakao.maps.Polyline({
            map: map, path: [routePath[0]],
            strokeWeight: 5, strokeColor: '#3366FF', strokeOpacity: 0.8, strokeStyle: 'solid'
          });

          waypoints = newWaypoints;
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
            var overlay = new kakao.maps.CustomOverlay({
              position: pos, content: el, yAnchor: 1.5, zIndex: 5, map: map
            });
            wpOverlays.push(overlay);
          });

          if(routePath.length > 0){
            map.panTo(routePath[0]);
            window.updateWalkerPosition(newRoute[0].lat, newRoute[0].lng, 0, false);
          }
        } catch(e) { console.error('changeCourse error:', e); }
      };

      window.forceRelayout = function(){ map.relayout(); };

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
  const [debugInfo, setDebugInfo] = useState<string>("");
  const [liveStatus, setLiveStatus] = useState<string>("대기 중");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ─── 멀티 코스: 현재 활성 코스 상태 ───
  const [activeCourseId, setActiveCourseId] = useState<string>("course_a");
  const [activeCourseName, setActiveCourseName] = useState<string>("엑스포 시민광장");
  const [progress, setProgress] = useState<number>(0);
  const activeCourse = getCourseById(activeCourseId);
  const activeRoute = activeCourse.route;
  const activeWaypoints = activeCourse.waypoints;

  const simStatus = walkSimulation.status;
  const currentIndex = walkSimulation.currentIndex;
  const currentCoord = activeRoute[currentIndex] || activeRoute[0];
  const lastCourseIdRef = useRef<string>("course_a");

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

  // ─── 지도에 JS 주입 헬퍼 ───
  const injectJS = useCallback((js: string) => {
    if (Platform.OS === "web") {
      if (iframeRef.current && iframeRef.current.contentWindow) {
        try { (iframeRef.current.contentWindow as any).eval(js); } catch {}
      }
    } else {
      webViewRef.current?.injectJavaScript(js + "true;");
    }
  }, []);

  // ─── 마커 위치 업데이트 (부드러운 이동) ───
  const sendPositionToMap = useCallback((lat: number, lng: number, index: number, animate: boolean = true) => {
    injectJS(`window.updateWalkerPosition(${lat}, ${lng}, ${index}, ${animate});`);
  }, [injectJS]);

  // ─── 상태바 업데이트 ───
  const updateStatusBar = useCallback((text: string, visible: boolean) => {
    injectJS(`window.updateStatusBar('${text.replace(/'/g, "\\'")}', ${visible});`);
  }, [injectJS]);

  // ─── 코스 변경 시 지도에 새 경로 주입 ───
  const sendCourseChangeToMap = useCallback((course: SimulationCourse) => {
    const routeJSON = JSON.stringify(course.route.map(c => ({
      lat: c.latitude,
      lng: c.longitude,
    })));
    const wpJSON = JSON.stringify(course.waypoints.map(wp => ({
      routeIndex: wp.routeIndex,
      label: wp.label,
      emoji: wp.emoji,
      lat: course.route[wp.routeIndex].latitude,
      lng: course.route[wp.routeIndex].longitude,
    })));
    injectJS(`window.changeCourse('${routeJSON.replace(/'/g, "\\'")}', '${wpJSON.replace(/'/g, "\\'")}');`);
  }, [injectJS]);

  // ─── 수신 데이터 처리 (핵심 동기화 로직) ───
  const handleWalkerData = useCallback((parsed: any) => {
    if (!parsed || !parsed.lat || !parsed.lng) return;
    if (parsed.status === "idle") return; // idle 상태는 무시

    // 코스 변경 감지
    if (parsed.courseId && parsed.courseId !== lastCourseIdRef.current) {
      lastCourseIdRef.current = parsed.courseId;
      setActiveCourseId(parsed.courseId);
      const newCourse = getCourseById(parsed.courseId);
      if (mapReady) {
        sendCourseChangeToMap(newCourse);
      }
    }

    // 코스 이름/진행률 업데이트
    if (parsed.courseName) setActiveCourseName(parsed.courseName);
    if (parsed.progress !== undefined) setProgress(parsed.progress);

    // 마커 이동 (부드러운 애니메이션)
    if (mapReady) {
      sendPositionToMap(parsed.lat, parsed.lng, parsed.index ?? 0, true);

      // 상태바 업데이트
      const statusText = parsed.status === "running"
        ? `산책 중 · ${parsed.courseName || ""} · ${Math.round(parsed.progress || 0)}%`
        : parsed.status === "paused"
        ? "일시정지"
        : parsed.status === "completed"
        ? "산책 완료!"
        : "연결됨";
      updateStatusBar(statusText, true);
    }

    // 상태 업데이트
    if (parsed.status === "running") setLiveStatus("산책 중");
    else if (parsed.status === "paused") setLiveStatus("일시정지");
    else if (parsed.status === "completed") setLiveStatus("산책 완료");

    // 디버깅 정보
    setDebugInfo(`${parsed.lat.toFixed(5)}, ${parsed.lng.toFixed(5)} [${parsed.index}] ${parsed.interpolated ? "보간" : "경유지"}`);
  }, [mapReady, sendPositionToMap, sendCourseChangeToMap, updateStatusBar]);

  // ─── 1. 초기 상태 복원 (뒤늦게 접속해도 현재 위치 즉시 표시) ───
  useEffect(() => {
    if (!mapReady) return;

    const restoreFromStorage = () => {
      // 웹 localStorage에서 읽기
      if (Platform.OS === "web" && typeof window !== "undefined" && window.localStorage) {
        const data = window.localStorage.getItem(STORAGE_KEY);
        if (data) {
          try {
            const parsed = JSON.parse(data);
            if (parsed.status && parsed.status !== "idle") {
              // 초기 로드는 애니메이션 없이 즉시 이동
              sendPositionToMap(parsed.lat, parsed.lng, parsed.index ?? 0, false);
              handleWalkerData(parsed);
            }
          } catch {}
        }
        // 하위 호환: 기존 키도 확인
        const oldData = window.localStorage.getItem("currentLocation");
        if (oldData && !data) {
          try {
            const parsed = JSON.parse(oldData);
            sendPositionToMap(parsed.lat, parsed.lng, parsed.index ?? 0, false);
            handleWalkerData(parsed);
          } catch {}
        }
      }

      // AsyncStorage 폴백
      AsyncStorage.getItem(STORAGE_KEY).then((data) => {
        if (data) {
          try {
            const parsed = JSON.parse(data);
            if (parsed.status && parsed.status !== "idle") {
              handleWalkerData(parsed);
            }
          } catch {}
        }
      }).catch(() => {});
    };

    restoreFromStorage();
  }, [mapReady, sendPositionToMap, handleWalkerData]);

  // ─── 2. StorageEvent 리스너 (다른 탭/창에서 변경 시) ───
  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") return;
    if (!mapReady) return;

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY && event.newValue) {
        try {
          const parsed = JSON.parse(event.newValue);
          handleWalkerData(parsed);
        } catch {}
      }
      // 하위 호환
      if (event.key === "currentLocation" && event.newValue) {
        try {
          const parsed = JSON.parse(event.newValue);
          handleWalkerData(parsed);
        } catch {}
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [mapReady, handleWalkerData]);

  // ─── 3. CustomEvent 리스너 (같은 탭 내 동기화) ───
  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") return;
    if (!mapReady) return;

    const handleCustomEvent = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      if (detail) {
        handleWalkerData(detail);
      }
    };

    window.addEventListener("walker_location_update", handleCustomEvent);
    return () => window.removeEventListener("walker_location_update", handleCustomEvent);
  }, [mapReady, handleWalkerData]);

  // ─── 4. 폴링 백업 (500ms 간격 - StorageEvent가 누락될 경우 대비) ───
  useEffect(() => {
    if (!mapReady) return;

    let lastTimestamp = 0;
    const pollRef = setInterval(() => {
      if (Platform.OS === "web" && typeof window !== "undefined" && window.localStorage) {
        const data = window.localStorage.getItem(STORAGE_KEY);
        if (data) {
          try {
            const parsed = JSON.parse(data);
            // 새로운 데이터만 처리 (중복 방지)
            if (parsed.timestamp && parsed.timestamp > lastTimestamp) {
              lastTimestamp = parsed.timestamp;
              handleWalkerData(parsed);
            }
          } catch {}
        }
      } else {
        // 네이티브 AsyncStorage 폴링
        AsyncStorage.getItem(STORAGE_KEY).then((data) => {
          if (data) {
            try {
              const parsed = JSON.parse(data);
              if (parsed.timestamp && parsed.timestamp > lastTimestamp) {
                lastTimestamp = parsed.timestamp;
                handleWalkerData(parsed);
              }
            } catch {}
          }
        }).catch(() => {});
      }
    }, 500);

    return () => clearInterval(pollRef);
  }, [mapReady, handleWalkerData]);

  // 이동 거리 계산
  let distanceSoFar = 0;
  for (let i = 1; i <= currentIndex && i < activeRoute.length; i++) {
    distanceSoFar += haversineDistance(
      activeRoute[i - 1].latitude,
      activeRoute[i - 1].longitude,
      activeRoute[i].latitude,
      activeRoute[i].longitude
    );
  }
  const totalDistance = calculateRouteDistance(activeRoute);

  // 현재 구간 이름
  const getCurrentSection = () => {
    for (let i = activeWaypoints.length - 1; i >= 0; i--) {
      if (currentIndex >= activeWaypoints[i].routeIndex) {
        if (i < activeWaypoints.length - 1) {
          return `${activeWaypoints[i].label} → ${activeWaypoints[i + 1].label}`;
        }
        return activeWaypoints[i].label;
      }
    }
    return activeWaypoints[0].label;
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return m > 0 ? `${m}분 ${s}초` : `${s}초`;
  };

  // 새로고침 처리
  const handleRefreshRequest = useCallback(() => {
    if (Platform.OS === "web" && typeof window !== "undefined" && window.localStorage) {
      const data = window.localStorage.getItem(STORAGE_KEY);
      if (data) {
        try {
          const parsed = JSON.parse(data);
          sendPositionToMap(parsed.lat, parsed.lng, parsed.index ?? 0, false);
          handleWalkerData(parsed);
          injectJS(`window.forceRelayout();`);
          return;
        } catch {}
      }
    }
    AsyncStorage.getItem(STORAGE_KEY).then((data) => {
      if (data) {
        try {
          const parsed = JSON.parse(data);
          handleWalkerData(parsed);
        } catch {}
      }
    }).catch(() => {});
  }, [handleWalkerData, sendPositionToMap, injectJS]);

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

    const initialCoord = activeRoute[0];
    const html = generateTrackerMapHTML(apiKey, initialCoord.latitude, initialCoord.longitude, activeRoute, activeWaypoints);

    if (Platform.OS === "web") {
      return (
        <View style={s.mapContainer}>
          <iframe
            ref={(el) => { iframeRef.current = el; }}
            srcDoc={html}
            style={{
              width: "100%", height: "100%", border: "none",
              position: "absolute", top: 0, left: 0, zIndex: 1,
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
                backgroundColor: liveStatus === "산책 중" ? "#4CAF82" : liveStatus === "일시정지" ? "#F59E0B" : liveStatus === "산책 완료" ? "#8E8E93" : "#BDBDBD",
              }]} />
              <Text style={[s.statusText, {
                color: liveStatus === "산책 중" ? "#4CAF82" : liveStatus === "일시정지" ? "#F59E0B" : "#8E8E93",
              }]}>
                {liveStatus}
              </Text>
              <View style={{ backgroundColor: "#E8F5E9", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
                <Text style={{ fontFamily: Fonts.bold, fontSize: 10, color: "#2E7D32" }}>
                  {activeCourse.typeEmoji} {activeCourseName}
                </Text>
              </View>
            </View>
          </View>
          <View style={s.simBadge}>
            <Text style={s.simBadgeText}>LIVE</Text>
          </View>
        </View>

        {/* 카카오맵 지도 */}
        <View style={{ position: "relative" }}>
          {renderMap()}
          <Pressable
            onPress={() => { haptic(); handleRefreshRequest(); }}
            style={({ pressed }) => [s.refreshBtn, pressed && { opacity: 0.7, transform: [{ scale: 0.95 }] }]}
          >
            <Text style={{ fontSize: 18 }}>🔄</Text>
          </Pressable>
          {debugInfo ? (
            <View style={s.debugOverlay}>
              <Text style={s.debugText}>수신: {debugInfo}</Text>
            </View>
          ) : null}
        </View>

        {/* 진행률 바 */}
        <View style={s.progressSection}>
          <View style={s.progressBarBg}>
            <View style={[s.progressBarFill, { width: `${progress}%` }]} />
          </View>
          <Text style={s.progressText}>{Math.round(progress)}% 완료</Text>
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

        {/* 현재 구간 */}
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
            <Text style={s.statValue}>{currentIndex + 1}/{activeRoute.length}</Text>
            <Text style={s.statLabel}>진행 포인트</Text>
          </View>
        </View>

        {/* 완료 배너 */}
        {liveStatus === "산책 완료" && (
          <View style={s.completedBanner}>
            <Text style={{ fontSize: 32 }}>🎉</Text>
            <Text style={s.completedText}>산책이 완료되었습니다!</Text>
            <Text style={s.completedSub}>
              총 {totalDistance.toFixed(2)}km · {activeWaypoints.length}개 주요 경유지
            </Text>
          </View>
        )}

        {liveStatus === "대기 중" && (
          <View style={s.idleBanner}>
            <Text style={{ fontSize: 32 }}>⏳</Text>
            <Text style={s.idleText}>시뮬레이션 대기 중</Text>
            <Text style={s.idleSub}>관리자 메뉴에서 시뮬레이션을 시작하면 자동으로 추적이 시작됩니다</Text>
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: "#F0F0F0", gap: 12,
  },
  backBtn: { paddingVertical: 4, paddingRight: 8 },
  backBtnText: { fontFamily: Fonts.semiBold, fontSize: 17, color: "#2E7D32" },
  headerTitle: { fontFamily: Fonts.bold, fontSize: 18, color: "#1A1A1A", letterSpacing: -0.3 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontFamily: Fonts.semiBold, fontSize: 12 },
  simBadge: { backgroundColor: "#2E7D32", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  simBadgeText: { fontFamily: Fonts.bold, fontSize: 10, color: "#FFFFFF", letterSpacing: 1 },
  mapContainer: {
    height: 400, width: "100%", position: "relative",
    backgroundColor: "#F0F0F0", borderBottomWidth: 1, borderBottomColor: "#E8E8E8",
    overflow: "hidden", zIndex: 1,
  },
  mapWebView: {
    position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
    width: "100%", height: "100%", zIndex: 1,
  },
  mapOverlay: {
    position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
    alignItems: "center", justifyContent: "center",
    backgroundColor: "rgba(248,248,248,0.95)", zIndex: 10,
  },
  mapLoading: {
    height: 400, width: "100%", alignItems: "center", justifyContent: "center",
    backgroundColor: "#F8F8F8", borderBottomWidth: 1, borderBottomColor: "#E8E8E8",
  },
  mapFallback: {
    height: 400, width: "100%", alignItems: "center", justifyContent: "center",
    backgroundColor: "#F0F7F0", borderBottomWidth: 1, borderBottomColor: "#E8E8E8",
  },
  progressSection: {
    marginHorizontal: 16, marginTop: 12, gap: 4,
  },
  progressBarBg: {
    height: 8, backgroundColor: "#F0F0F0", borderRadius: 4, overflow: "hidden",
  },
  progressBarFill: {
    height: 8, backgroundColor: "#2E7D32", borderRadius: 4,
  },
  progressText: {
    fontFamily: Fonts.semiBold, fontSize: 12, color: "#2E7D32", textAlign: "right",
  },
  infoCard: {
    marginHorizontal: 16, marginTop: 10,
    backgroundColor: "#E8F5E9", borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: "#C6F6D5",
  },
  walkerAvatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center",
    borderWidth: 2, borderColor: "#2E7D32",
  },
  walkerName: { fontFamily: Fonts.bold, fontSize: 15, color: "#1A1A1A" },
  walkerSub: { fontFamily: Fonts.regular, fontSize: 12, color: "#8E8E93", marginTop: 2 },
  locationBadge: { backgroundColor: "#2E7D32", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  locationBadgeText: { fontSize: 11, color: "#FFFFFF", fontWeight: "700" },
  sectionCard: {
    marginHorizontal: 16, marginTop: 8,
    backgroundColor: "#FFF8E1", borderRadius: 10, padding: 10,
    flexDirection: "row", alignItems: "center", gap: 8,
    borderWidth: 1, borderColor: "#FFE082",
  },
  sectionLabel: { fontFamily: Fonts.semiBold, fontSize: 11, color: "#F57F17" },
  sectionValue: { fontFamily: Fonts.bold, fontSize: 13, color: "#1A1A1A", flex: 1 },
  statsRow: {
    flexDirection: "row", marginHorizontal: 16, marginTop: 10,
    backgroundColor: "#F8F8F8", borderRadius: 14, padding: 14, alignItems: "center",
  },
  statItem: { flex: 1, alignItems: "center", gap: 3 },
  statIcon: { fontSize: 18 },
  statValue: { fontFamily: Fonts.bold, fontSize: 14, color: "#1A1A1A" },
  statLabel: { fontFamily: Fonts.regular, fontSize: 10, color: "#8E8E93" },
  statDivider: { width: 1, height: 36, backgroundColor: "#E0E0E0" },
  completedBanner: {
    marginHorizontal: 16, marginTop: 12,
    backgroundColor: "#F0FFF4", borderRadius: 14, padding: 20,
    alignItems: "center", gap: 6, borderWidth: 1, borderColor: "#C6F6D5",
  },
  completedText: { fontFamily: Fonts.bold, fontSize: 16, color: "#2E7D32" },
  completedSub: { fontFamily: Fonts.regular, fontSize: 12, color: "#4CAF82" },
  idleBanner: {
    marginHorizontal: 16, marginTop: 12,
    backgroundColor: "#F8F8F8", borderRadius: 14, padding: 20,
    alignItems: "center", gap: 6, borderWidth: 1, borderColor: "#E0E0E0",
  },
  idleText: { fontFamily: Fonts.bold, fontSize: 16, color: "#8E8E93" },
  idleSub: { fontFamily: Fonts.regular, fontSize: 12, color: "#BDBDBD", textAlign: "center", lineHeight: 18 },
  refreshBtn: {
    position: "absolute" as const, top: 12, right: 12,
    width: 36, height: 36, borderRadius: 4,
    backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#DDDDDD",
    alignItems: "center" as const, justifyContent: "center" as const,
    zIndex: 500,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15, shadowRadius: 4, elevation: 3,
  },
  debugOverlay: {
    position: "absolute" as const, bottom: 8, left: 8,
    backgroundColor: "rgba(0,0,0,0.7)", borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 4, zIndex: 100,
  },
  debugText: { fontFamily: Fonts.regular, fontSize: 10, color: "#00FF88", letterSpacing: 0.3 },
});
