import { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Alert,
  Platform,
  ActivityIndicator,
  ScrollView,
  TextInput,
} from "react-native";
import { WebView } from "react-native-webview";
import { ScreenContainer } from "@/components/screen-container";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useApp, WalkSession, WalkRoutePoint } from "@/lib/app-context";
import * as Haptics from "expo-haptics";
import * as Location from "expo-location";
import { useKeepAwake } from "expo-keep-awake";
import { calculateDistance } from "@/lib/location-service";
import { Fonts } from "@/hooks/use-fonts";
import { getApiBaseUrl } from "@/constants/oauth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  Easing,
} from "react-native-reanimated";

function haptic(type: "light" | "success" | "error" = "light") {
  if (Platform.OS === "web") return;
  if (type === "success") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  else if (type === "error") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  else Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function formatDist(km: number): string {
  if (km < 0.01) return "0m";
  if (km < 1) return `${Math.round(km * 1000)}m`;
  return `${km.toFixed(2)}km`;
}

function formatSpeed(kmh: number): string {
  return `${kmh.toFixed(1)} km/h`;
}

// ─── 엑스포과학공원 시뮬레이션 경로 ───
const EXPO_WALK_ROUTE = [
  { lat: 36.3742, lng: 127.3918 }, // 1. 엑스포과학공원 정문
  { lat: 36.3750, lng: 127.3925 }, // 2. 과학공원 내부 산책로
  { lat: 36.3758, lng: 127.3935 }, // 3. 한빛탑 광장
  { lat: 36.3765, lng: 127.3928 }, // 4. 한빛탑 북쪽
  { lat: 36.3772, lng: 127.3915 }, // 5. 엑스포 다리 입구
  { lat: 36.3780, lng: 127.3900 }, // 6. 엑스포 다리 중간
  { lat: 36.3788, lng: 127.3885 }, // 7. 엑스포 다리 건너편
  { lat: 36.3785, lng: 127.3868 }, // 8. 갑천변 산책로 진입
  { lat: 36.3778, lng: 127.3855 }, // 9. 갑천변 산책로 중간
  { lat: 36.3770, lng: 127.3845 }, // 10. 갑천변 산책로 남쪽
  { lat: 36.3762, lng: 127.3858 }, // 11. 엑스포 시민광장 방면
  { lat: 36.3755, lng: 127.3870 }, // 12. 엑스포 시민광장
];

// ─── 카카오맵 HTML 생성 (실시간 마커 이동 지원) ───
function generateTrackerMapHTML(apiKey: string): string {
  return `<!DOCTYPE html>
<html><head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/>
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:100%;height:100%;overflow:hidden}
#map{width:100%;height:100%}
#error{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);background:#f5f5f5;padding:20px;border-radius:8px;text-align:center;font-family:sans-serif;color:#333;z-index:1000}
</style>
</head><body>
<div id="map"></div>
<div id="error" style="display:none"></div>
<script src="https://dapi.kakao.com/v2/maps/sdk.js?appkey=${apiKey}&autoload=false"></script>
<script>
var map, marker, polyline, routePath = [];
console.log('[KakaoMap] SDK loading with key:', '${apiKey}'.substring(0,10) + '...');
window.addEventListener('error', function(e) {
  console.error('[KakaoMap] Error:', e.message);
  document.getElementById('error').style.display = 'block';
  document.getElementById('error').innerHTML = '<p>❌ 지도 로드 실패</p><p style="font-size:12px;margin-top:8px">' + e.message + '</p>';
});
if (typeof kakao === 'undefined') {
  console.error('[KakaoMap] kakao object not found');
  document.getElementById('error').innerHTML = '<p>❌ 카카오맵 SDK 로드 실패</p>';
  document.getElementById('error').style.display = 'block';
}
kakao.maps.load(function(){
  var center = new kakao.maps.LatLng(36.376, 127.387);
  map = new kakao.maps.Map(document.getElementById('map'), {
    center: center,
    level: 3
  });

  // 마커 생성 - 산책 중인 위치
  var markerImage = new kakao.maps.MarkerImage(
    'https://t1.daumcdn.net/localimg/localimages/07/mapapidoc/markerStar.png',
    new kakao.maps.Size(24, 35)
  );
  marker = new kakao.maps.Marker({
    position: center,
    map: map,
    image: markerImage
  });

  // 경로 폴리라인 - 딥 그린
  polyline = new kakao.maps.Polyline({
    map: map,
    path: [],
    strokeWeight: 5,
    strokeColor: '#2E7D32',
    strokeOpacity: 0.9,
    strokeStyle: 'solid'
  });

  // 시작 마커 (출발점)
  var startOverlay = new kakao.maps.CustomOverlay({
    position: center,
    content: '<div style="background:#2E7D32;color:white;padding:3px 8px;border-radius:12px;font-size:11px;font-weight:bold;box-shadow:0 2px 6px rgba(0,0,0,0.3)">출발</div>',
    yAnchor: 2.5
  });
  startOverlay.setMap(map);

  console.log('[KakaoMap] Map initialized successfully');
  // 준비 완료 알림
  try {
    window.ReactNativeWebView.postMessage(JSON.stringify({type:'ready'}));
    console.log('[KakaoMap] Ready message sent to RN');
  } catch(e) {
    console.log('[KakaoMap] RN bridge not available (web mode)');
  }
});

// SDK 로드 실패 처리
if (typeof kakao === 'undefined') {
  console.error('[KakaoMap] Kakao SDK failed to load');
  document.getElementById('error').innerHTML = '<p>❌ 카카오맵 SDK 로드 실패</p><p style="font-size:12px;margin-top:8px">API 키를 확인하세요</p>';
  document.getElementById('error').style.display = 'block';
}

// RN에서 호출하는 위치 업데이트 함수
window.updatePosition = function(lat, lng, index) {
  if (!map || !marker) return;
  var pos = new kakao.maps.LatLng(lat, lng);
  marker.setPosition(pos);
  map.panTo(pos);

  routePath.push(pos);
  polyline.setPath(routePath);

  // 경유지 번호 오버레이
  if (index > 0) {
    var overlay = new kakao.maps.CustomOverlay({
      position: pos,
      content: '<div style="background:#2E7D32;color:white;width:20px;height:20px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:bold;box-shadow:0 1px 4px rgba(0,0,0,0.3)">' + (index+1) + '</div>',
      yAnchor: 2.0
    });
    overlay.setMap(map);
  }
};

// 산책 완료 시 전체 경로 보기
window.fitRoute = function() {
  if (!map || routePath.length < 2) return;
  var bounds = new kakao.maps.LatLngBounds();
  for (var i = 0; i < routePath.length; i++) {
    bounds.extend(routePath[i]);
  }
  map.setBounds(bounds);
};
</script>
</body></html>`;
}

// 체크리스트 아이템 타입
interface CheckItem {
  id: string;
  label: string;
  emoji: string;
  checked: boolean;
  checkedAt?: string;
  note?: string;
}

const DEFAULT_CHECKLIST: Omit<CheckItem, "checked">[] = [
  { id: "poop", label: "배변 완료", emoji: "💩" },
  { id: "water", label: "물 섭취", emoji: "💧" },
  { id: "snack", label: "간식 급여", emoji: "🦴" },
  { id: "play", label: "놀이 시간", emoji: "🎾" },
  { id: "social", label: "다른 강아지 만남", emoji: "🐕" },
  { id: "issue", label: "특이사항 발생", emoji: "⚠️" },
];

export default function WalkTrackerScreen() {
  useKeepAwake();

  const { petName, petEmoji, requestId, ownerName } = useLocalSearchParams<{
    petName: string;
    petEmoji: string;
    requestId?: string;
    ownerName?: string;
  }>();
  const router = useRouter();
  const { state, dispatch } = useApp();

  // 산책 세션 상태
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [status, setStatus] = useState<"ready" | "active" | "paused" | "completed">("ready");
  const [elapsedSec, setElapsedSec] = useState(0);
  const [pausedSec, setPausedSec] = useState(0);
  const [distance, setDistance] = useState(0);
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [maxSpeed, setMaxSpeed] = useState(0);
  const [routePoints, setRoutePoints] = useState<WalkRoutePoint[]>([]);
  const [isGpsReady, setIsGpsReady] = useState(false);
  const [pointCount, setPointCount] = useState(0);

  // 카카오맵 WebView
  const webViewRef = useRef<WebView>(null);
  const [apiKey, setApiKey] = useState<string>("");
  const [mapReady, setMapReady] = useState(false);

  // 시뮬레이션 인덱스
  const simIndexRef = useRef(0);
  const simTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 라이브 체크리스트
  const [checklist, setChecklist] = useState<CheckItem[]>(
    DEFAULT_CHECKLIST.map((c) => ({ ...c, checked: false }))
  );
  const [showChecklist, setShowChecklist] = useState(false);
  const [issueNote, setIssueNote] = useState("");

  // SOS 상태
  const [sosTriggered, setSosTriggered] = useState(false);
  const [stationaryTimer, setStationaryTimer] = useState(0);
  const lastMovementRef = useRef<number>(Date.now());

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const locationSubRef = useRef<Location.LocationSubscription | null>(null);
  const pauseStartRef = useRef<number | null>(null);

  // 애니메이션
  const pulseScale = useSharedValue(1);
  const pulseAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  useEffect(() => {
    if (status === "active") {
      pulseScale.value = withRepeat(
        withTiming(1.15, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        -1, true
      );
    } else {
      pulseScale.value = withTiming(1, { duration: 200 });
    }
  }, [status]);

  // 카카오맵 API 키 가져오기
  useEffect(() => {
    const fetchKey = async () => {
      try {
        const baseUrl = getApiBaseUrl();
        if (!baseUrl) {
          console.warn("API base URL not available");
          return;
        }
        const res = await fetch(`${baseUrl}/api/kakao-map-key`);
        if (!res.ok) {
          console.warn("API key fetch failed:", res.status);
          return;
        }
        const data = await res.json();
        if (data.key) {
          setApiKey(data.key);
        } else {
          console.warn("No API key in response");
        }
      } catch (e) {
        console.warn("API key fetch error:", e);
      }
    };
    fetchKey();
  }, [])

  // 타이머
  useEffect(() => {
    if (status === "active") {
      timerRef.current = setInterval(() => {
        setElapsedSec((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [status]);

  // 정지 감지 (SOS 용) - 5분 이상 정지 시 경고
  useEffect(() => {
    if (status !== "active") return;
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - lastMovementRef.current) / 1000);
      setStationaryTimer(elapsed);
      if (elapsed >= 300 && !sosTriggered) {
        triggerSOS("auto");
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [status, sosTriggered]);

  // GPS 권한
  useEffect(() => {
    (async () => {
      if (Platform.OS === "web") {
        setIsGpsReady(true);
        return;
      }
      try {
        const { status: permStatus } = await Location.requestForegroundPermissionsAsync();
        if (permStatus === "granted") {
          setIsGpsReady(true);
        } else {
          Alert.alert("위치 권한 필요", "산책 추적을 위해 위치 권한이 필요합니다.");
        }
      } catch (e) {
        console.warn("Location permission error:", e);
      }
    })();
    return () => { if (locationSubRef.current) locationSubRef.current.remove(); };
  }, []);

  // ─── LocalStorage 감시: 관리자 시뮬레이션 데이터 동기화 ───
  useEffect(() => {
    if (status !== "active" || !mapReady || !apiKey) return;

    const watchLocalStorage = async () => {
      try {
        const data = await AsyncStorage.getItem("walk_simulation_current");
        if (data) {
          const { lat, lng, index } = JSON.parse(data);
          console.log("[Tracker] LocalStorage update:", { lat, lng, index });
          sendPositionToMap(lat, lng, index);
          addSimulatedPoint(lat, lng);
        }
      } catch (e) {
        console.error("[Tracker] LocalStorage read error:", e);
      }
    };

    // 5초마다 LocalStorage 확인
    const interval = setInterval(watchLocalStorage, 5000);
    return () => clearInterval(interval);
  }, [status, mapReady, apiKey]);

  // ─── 5초마다 GPS 시뮬레이션 + WebView 마커 이동 ───
  useEffect(() => {
    if (status === "active" && mapReady && apiKey) {
      // 첫 번째 포인트 즉시 전송
      const firstPt = EXPO_WALK_ROUTE[0];
      sendPositionToMap(firstPt.lat, firstPt.lng, 0);
      addSimulatedPoint(firstPt.lat, firstPt.lng);
      simIndexRef.current = 1;

      simTimerRef.current = setInterval(() => {
        const idx = simIndexRef.current;
        if (idx >= EXPO_WALK_ROUTE.length) {
          // 경로 끝나면 처음부터 반복
          simIndexRef.current = 0;
          return;
        }
        const pt = EXPO_WALK_ROUTE[idx];
        sendPositionToMap(pt.lat, pt.lng, idx);
        addSimulatedPoint(pt.lat, pt.lng);
        simIndexRef.current = idx + 1;
      }, 5000);
    } else {
      if (simTimerRef.current) {
        clearInterval(simTimerRef.current);
        simTimerRef.current = null;
      }
    }
    return () => {
      if (simTimerRef.current) {
        clearInterval(simTimerRef.current);
        simTimerRef.current = null;
      }
    };
  }, [status, mapReady, apiKey]);

  const sendPositionToMap = (lat: number, lng: number, index: number) => {
    if (webViewRef.current) {
      const js = `window.updatePosition(${lat}, ${lng}, ${index}); true;`;
      if (Platform.OS === "web") {
        // iframe에서는 postMessage 사용
        try {
          (webViewRef.current as any).injectJavaScript?.(js);
        } catch {}
      } else {
        webViewRef.current.injectJavaScript(js);
      }
    }
  };

  const addSimulatedPoint = (lat: number, lng: number) => {
    const point: WalkRoutePoint = {
      lat,
      lng,
      timestamp: new Date().toISOString(),
    };
    setRoutePoints((prev) => {
      const newPoints = [...prev, point];
      if (prev.length > 0) {
        const lastPt = prev[prev.length - 1];
        const segDist = calculateDistance(lastPt.lat, lastPt.lng, lat, lng);
        if (segDist < 5) {
          setDistance((d) => d + segDist);
          lastMovementRef.current = Date.now();
        }
      }
      return newPoints;
    });
    setPointCount((c) => c + 1);
    // 시뮬레이션 속도: 약 3~5 km/h
    const simSpeed = 3.5 + Math.random() * 1.5;
    setCurrentSpeed(simSpeed);
    setMaxSpeed((prev) => Math.max(prev, simSpeed));
  };

  const handleWebViewMessage = useCallback((event: { nativeEvent: { data: string } }) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === "ready") {
        setMapReady(true);
      } else if (data.type === "error") {
        console.error("KakaoMap error:", data.message);
      }
    } catch {}
  }, []);

  // SOS 트리거
  const triggerSOS = (type: "manual" | "auto") => {
    haptic("error");
    setSosTriggered(true);

    const msg = type === "auto"
      ? `⚠️ ${petName || "반려동물"} 산책 중 5분 이상 이동이 감지되지 않습니다. 확인이 필요합니다.`
      : `🆘 ${state.profile.nickname}님이 긴급 도움을 요청했습니다!`;

    dispatch({
      type: "ADD_NOTIFICATION",
      payload: {
        id: `sos_${Date.now()}`,
        type: "system",
        title: type === "auto" ? "⚠️ 이동 감지 안됨" : "🆘 긴급 SOS",
        body: msg,
        isRead: false,
        createdAt: new Date().toISOString(),
        relatedId: sessionId || undefined,
      },
    });

    if (type === "manual") {
      Alert.alert(
        "🆘 SOS 발송 완료",
        "보호자에게 긴급 알림이 전송되었습니다.\n현재 위치가 공유됩니다.",
        [{ text: "확인" }]
      );
    } else {
      Alert.alert(
        "⚠️ 이동 감지 안됨",
        "5분 이상 이동이 감지되지 않았습니다.\n보호자에게 알림이 전송되었습니다.\n\n괜찮으시면 '확인'을 눌러주세요.",
        [
          { text: "확인", onPress: () => { lastMovementRef.current = Date.now(); setSosTriggered(false); } },
        ]
      );
    }
  };

  // 체크리스트 토글
  const toggleCheckItem = (id: string) => {
    haptic();
    setChecklist((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, checked: !item.checked, checkedAt: !item.checked ? new Date().toISOString() : undefined }
          : item
      )
    );

    const item = checklist.find((c) => c.id === id);
    if (item && !item.checked) {
      dispatch({
        type: "ADD_NOTIFICATION",
        payload: {
          id: `check_${id}_${Date.now()}`,
          type: "match",
          title: `${item.emoji} ${item.label}`,
          body: `${petName || "반려동물"} - ${item.label} (${new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })})`,
          isRead: false,
          createdAt: new Date().toISOString(),
          relatedId: sessionId || undefined,
        },
      });
    }
  };

  // 산책 시작
  const handleStart = () => {
    haptic("success");
    const id = `walk_${Date.now()}`;
    setSessionId(id);
    setStatus("active");
    setElapsedSec(0);
    setDistance(0);
    setPausedSec(0);
    setCurrentSpeed(0);
    setMaxSpeed(0);
    setRoutePoints([]);
    setPointCount(0);
    simIndexRef.current = 0;
    lastMovementRef.current = Date.now();
    setSosTriggered(false);

    const session: WalkSession = {
      id,
      requestId: requestId || undefined,
      petName: petName || "반려동물",
      petEmoji: petEmoji || "🐾",
      startedAt: new Date().toISOString(),
      status: "active",
      totalDistanceKm: 0,
      totalDurationSec: 0,
      routePoints: [],
      avgSpeedKmh: 0,
      maxSpeedKmh: 0,
      pausedDurationSec: 0,
      neighborhood: "",
    };
    dispatch({ type: "START_WALK_SESSION", payload: session });
  };

  // 산책 일시정지
  const handlePause = () => {
    haptic();
    setStatus("paused");
    pauseStartRef.current = Date.now();
  };

  // 산책 재개
  const handleResume = () => {
    haptic();
    setStatus("active");
    if (pauseStartRef.current) {
      setPausedSec((prev) => prev + Math.floor((Date.now() - (pauseStartRef.current || 0)) / 1000));
      pauseStartRef.current = null;
    }
  };

  // 산책 완료
  const handleComplete = () => {
    Alert.alert(
      "산책을 완료할까요?",
      "산책 기록이 저장됩니다.",
      [
        { text: "취소", style: "cancel" },
        {
          text: "완료",
          style: "destructive",
          onPress: () => {
            haptic("success");
            setStatus("completed");

            // 전체 경로 보기
            if (webViewRef.current) {
              const js = `window.fitRoute(); true;`;
              webViewRef.current.injectJavaScript(js);
            }

            dispatch({
              type: "UPDATE_WALK_SESSION",
              payload: {
                sessionId: sessionId!,
                updates: {
                  totalDistanceKm: distance,
                  totalDurationSec: elapsedSec,
                  maxSpeedKmh: maxSpeed,
                  avgSpeedKmh: (distance / (elapsedSec / 3600)) || 0,
                  pausedDurationSec: pausedSec,
                },
              },
            });
            dispatch({ type: "COMPLETE_WALK_SESSION", payload: sessionId! });
          },
        },
      ],
      { cancelable: false }
    );
  };

  const isReady = status === "ready";
  const isActive = status === "active";
  const isPaused = status === "paused";
  const isCompleted = status === "completed";

  const avgSpeed = elapsedSec > 0 ? (distance / (elapsedSec / 3600)) || 0 : 0;
  const checkedCount = checklist.filter((c) => c.checked).length;

  const getStatusInfo = () => {
    if (isActive) return { text: "산책 중", color: "#2E7D32", dot: true };
    if (isPaused) return { text: "일시정지", color: "#FF9500", dot: true };
    if (isCompleted) return { text: "산책 완료", color: "#8E8E93", dot: false };
    return { text: "대기 중", color: "#8E8E93", dot: false };
  };
  const statusInfo = getStatusInfo();

  const mapHTML = apiKey ? generateTrackerMapHTML(apiKey) : "";
  
  // 디버깅용 로그
  useEffect(() => {
    console.log("[Tracker] apiKey:", apiKey ? "✓ loaded" : "✗ not loaded");
    console.log("[Tracker] mapReady:", mapReady);
    console.log("[Tracker] status:", status);
    console.log("[Tracker] pointCount:", pointCount);
  }, [apiKey, mapReady, status, pointCount]);

  return (
    <ScreenContainer>
      {/* 헤더 - 딥 그린 테마 */}
      <View style={st.header}>
        <Pressable onPress={() => router.back()} style={{ padding: 8 }}>
          <Text style={st.headerBack}>취소</Text>
        </Pressable>
        <View style={{ alignItems: "center" }}>
          <Text style={st.headerTitle}>{petEmoji} {petName}</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 }}>
            <View style={[st.statusDotSmall, { backgroundColor: statusInfo.color }]} />
            <Text style={[st.statusTextSmall, { color: statusInfo.color }]}>{statusInfo.text}</Text>
          </View>
        </View>
        {(isActive || isPaused) ? (
          <Pressable onPress={() => setShowChecklist(!showChecklist)} style={st.checklistToggle}>
            <Text style={st.checklistToggleText}>{showChecklist ? "지도" : "체크"}</Text>
          </Pressable>
        ) : <View style={{ width: 50 }} />}
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1 }}>
        {/* ─── 카카오맵 WebView (무조건 렌더링) ─── */}
        {!showChecklist && (
          <View style={st.mapContainer}>
            {apiKey ? (
              <>
                {Platform.OS === "web" ? (
                  <iframe
                    srcDoc={mapHTML}
                    style={{
                      width: "100%",
                      height: "100%",
                      border: "none",
                      borderRadius: 12,
                    }}
                    title="카카오맵 산책 추적"
                    onLoad={() => {
                      console.log("[Tracker] iframe loaded");
                      setMapReady(true);
                    }}
                  />
                ) : (
                  <WebView
                    ref={webViewRef}
                    source={{ html: mapHTML }}
                    style={{ flex: 1, borderRadius: 12 }}
                    onMessage={handleWebViewMessage}
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
                    onLoadStart={() => console.log("[Tracker] WebView loading...")}
                    onLoadEnd={() => {
                      console.log("[Tracker] WebView loaded");
                      setMapReady(true);
                    }}
                    onError={(e) => {
                      console.error("[Tracker] WebView Error:", e.nativeEvent);
                      setMapReady(false);
                    }}
                    onHttpError={(e) => {
                      console.error("[Tracker] WebView HTTP Error:", e.nativeEvent);
                      setMapReady(false);
                    }}
                  />
                )}
                {/* 지도 위 상태 배지 */}
                <View style={st.mapOverlayBadge}>
                  <View style={[st.mapStatusDot, { backgroundColor: statusInfo.color }]} />
                  <Text style={st.mapOverlayText}>
                    {isActive ? "실시간 추적 중" : isReady ? "대기 중" : isPaused ? "일시 정지" : "완료"}
                  </Text>
                </View>
                {/* 경유지 카운터 */}
                {pointCount > 0 && (
                  <View style={st.mapPointBadge}>
                    <Text style={st.mapPointText}>경유지 {pointCount}</Text>
                  </View>
                )}
              </>
            ) : (
              <View style={st.mapLoading}>
                <ActivityIndicator size="large" color="#2E7D32" />
                <Text style={st.mapLoadingText}>카카오맵 로딩 중...</Text>
              </View>
            )}
          </View>
        )}

        <View style={st.content}>
          {/* SOS 버튼 */}
          {(isActive || isPaused) && (
            <Pressable onPress={() => triggerSOS("manual")} style={({ pressed }) => [st.sosBtn, pressed && { opacity: 0.8 }]}>
              <View style={{ flex: 1 }}>
                <Text style={st.sosBtnText}>🆘 긴급 상황 (SOS)</Text>
                <Text style={st.sosBtnSub}>클릭 시 보호자에게 긴급 알림 전송</Text>
              </View>
              <Text style={{ fontSize: 28 }}>🚨</Text>
            </Pressable>
          )}
          {stationaryTimer >= 180 && !sosTriggered && (
            <View style={st.stationaryWarn}>
              <Text style={st.stationaryWarnText}>
                {`⚠️ ${Math.floor(stationaryTimer / 60)}분 이상 이동이 없습니다.`}
              </Text>
            </View>
          )}

          {/* 실시간 통계 그리드 */}
          <View style={st.statsGrid}>
            <View style={st.statCard}>
              <Text style={{ fontSize: 18 }}>⏱️</Text>
              <Text style={st.statValue}>{formatTime(elapsedSec)}</Text>
              <Text style={st.statLabel}>경과 시간</Text>
            </View>
            <View style={st.statCard}>
              <Text style={{ fontSize: 18 }}>📏</Text>
              <Text style={st.statValue}>{formatDist(distance)}</Text>
              <Text style={st.statLabel}>이동 거리</Text>
            </View>
            <View style={st.statCard}>
              <Text style={{ fontSize: 18 }}>📍</Text>
              <Text style={st.statValue}>{pointCount}</Text>
              <Text style={st.statLabel}>경유지</Text>
            </View>
            <View style={st.statCard}>
              <Text style={{ fontSize: 18 }}>⚡</Text>
              <Text style={st.statValue}>{formatSpeed(currentSpeed)}</Text>
              <Text style={st.statLabel}>현재 속도</Text>
            </View>
          </View>

          {/* 라이브 체크리스트 (토글) */}
          {showChecklist && (isActive || isPaused) && (
            <View style={st.checklistSection}>
              <Text style={st.checklistTitle}>📋 산책 체크리스트</Text>
              <Text style={st.checklistSub}>체크 시 보호자에게 실시간 알림이 전송됩니다</Text>
              {checklist.map((item) => (
                <Pressable
                  key={item.id}
                  onPress={() => toggleCheckItem(item.id)}
                  style={[st.checkItem, item.checked && st.checkItemChecked]}
                >
                  <View style={[st.checkBox, item.checked && st.checkBoxChecked]}>
                    {item.checked && <Text style={st.checkMark}>✓</Text>}
                  </View>
                  <Text style={{ fontSize: 18 }}>{item.emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[st.checkLabel, item.checked && st.checkLabelChecked]}>
                      {item.label}
                    </Text>
                    {item.checked && item.checkedAt && (
                      <Text style={st.checkTime}>
                        {new Date(item.checkedAt).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
                      </Text>
                    )}
                  </View>
                </Pressable>
              ))}

              {/* 특이사항 메모 */}
              <View style={st.issueSection}>
                <Text style={st.issueLabel}>📝 특이사항 메모</Text>
                <TextInput
                  style={st.issueInput}
                  placeholder="산책 중 특이사항을 기록하세요"
                  placeholderTextColor="#8E8E93"
                  value={issueNote}
                  onChangeText={setIssueNote}
                  multiline
                  numberOfLines={2}
                  textAlignVertical="top"
                />
              </View>
            </View>
          )}

          {/* GPS 상태 */}
          {!isGpsReady && !isCompleted && (
            <View style={st.gpsWarn}>
              <ActivityIndicator size="small" color="#FF9500" />
              <Text style={st.gpsWarnText}>GPS 신호를 찾고 있습니다...</Text>
            </View>
          )}

          {/* 완료 요약 */}
          {isCompleted && (
            <View style={st.completeSummary}>
              <Text style={{ fontSize: 40 }}>🎉</Text>
              <Text style={st.completeTitle}>산책 완료!</Text>
              <Text style={st.completeStat}>
                {formatDist(distance)} · {formatTime(elapsedSec)} · 평균 {formatSpeed(avgSpeed)}
              </Text>
              <Text style={st.completeRoute}>
                경유지 {pointCount}곳 · 최고속도 {formatSpeed(maxSpeed)}
              </Text>
              {checkedCount > 0 && (
                <View style={st.completeChecklist}>
                  <Text style={st.completeCheckTitle}>체크리스트 ({checkedCount}/{checklist.length})</Text>
                  {checklist.filter((c) => c.checked).map((item) => (
                    <Text key={item.id} style={st.completeCheckItem}>
                      {item.emoji} {item.label}
                    </Text>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* 컨트롤 버튼 */}
          <View style={st.controls}>
            {isReady && (
              <Pressable
                onPress={handleStart}
                style={({ pressed }) => [
                  st.startBtn,
                  pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] },
                ]}
              >
                <Text style={st.startBtnText}>🐾 산책 시작</Text>
              </Pressable>
            )}

            {isActive && (
              <View style={st.btnRow}>
                <Pressable
                  onPress={handlePause}
                  style={({ pressed }) => [st.ctrlBtn, st.pauseBtn, pressed && { opacity: 0.8 }]}
                >
                  <Text style={st.ctrlBtnText}>⏸ 일시정지</Text>
                </Pressable>
                <Pressable
                  onPress={handleComplete}
                  style={({ pressed }) => [st.ctrlBtn, st.completeBtn, pressed && { opacity: 0.8 }]}
                >
                  <Text style={st.ctrlBtnText}>✅ 완료</Text>
                </Pressable>
              </View>
            )}

            {isPaused && (
              <View style={st.btnRow}>
                <Pressable
                  onPress={handleResume}
                  style={({ pressed }) => [st.ctrlBtn, st.resumeBtn, pressed && { opacity: 0.8 }]}
                >
                  <Text style={st.ctrlBtnText}>▶ 재개</Text>
                </Pressable>
                <Pressable
                  onPress={handleComplete}
                  style={({ pressed }) => [st.ctrlBtn, st.completeBtn, pressed && { opacity: 0.8 }]}
                >
                  <Text style={st.ctrlBtnText}>✅ 완료</Text>
                </Pressable>
              </View>
            )}

            {isCompleted && (
              <View style={st.btnRow}>
                <Pressable
                  onPress={() => router.push("/walk/history" as never)}
                  style={({ pressed }) => [st.ctrlBtn, st.completeBtn, pressed && { opacity: 0.8 }]}
                >
                  <Text style={st.ctrlBtnText}>📋 기록 보기</Text>
                </Pressable>
                <Pressable
                  onPress={() => router.back()}
                  style={({ pressed }) => [st.ctrlBtn, { backgroundColor: "#F0F0F0" }, pressed && { opacity: 0.8 }]}
                >
                  <Text style={[st.ctrlBtnText, { color: "#8E8E93" }]}>홈으로</Text>
                </Pressable>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const st = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
    backgroundColor: "#2E7D32",
  },
  headerBack: { fontFamily: Fonts.semiBold, fontSize: 16, color: "#FFFFFF" },
  headerTitle: { fontFamily: Fonts.bold, fontSize: 17, color: "#FFFFFF" },
  statusDotSmall: { width: 6, height: 6, borderRadius: 3 },
  statusTextSmall: { fontFamily: Fonts.medium, fontSize: 11 },
  checklistToggle: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  checklistToggleText: { fontFamily: Fonts.semiBold, fontSize: 12, color: "#FFFFFF" },

  // ─── 카카오맵 컨테이너 ───
  mapContainer: {
    flex: 1,
    minHeight: 300,
    height: 350,
    margin: 12,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "#2E7D32",
    backgroundColor: "#F5F5F5",
  },
  mapLoading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  mapLoadingText: { fontFamily: Fonts.medium, fontSize: 14, color: "#2E7D32" },
  mapOverlayBadge: {
    position: "absolute",
    top: 12,
    left: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.95)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  mapStatusDot: { width: 8, height: 8, borderRadius: 4 },
  mapOverlayText: { fontFamily: Fonts.semiBold, fontSize: 12, color: "#2E7D32" },
  mapPointBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: "#2E7D32",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  mapPointText: { fontFamily: Fonts.bold, fontSize: 11, color: "#FFFFFF" },

  content: { padding: 16, gap: 14 },

  // SOS
  sosBtn: {
    backgroundColor: "#FF3B30",
    borderRadius: 14,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  sosBtnText: { fontFamily: Fonts.bold, fontSize: 16, color: "#FFFFFF" },
  sosBtnSub: { fontFamily: Fonts.regular, fontSize: 11, color: "#FFB3AE" },
  stationaryWarn: {
    backgroundColor: "#FFF8E1",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#FFECB3",
  },
  stationaryWarnText: { fontFamily: Fonts.medium, fontSize: 13, color: "#F57F17" },

  // Stats
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  statCard: {
    flex: 1,
    minWidth: "46%" as any,
    alignItems: "center",
    backgroundColor: "#F8F8F8",
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E8E8E8",
    gap: 3,
  },
  statValue: { fontFamily: Fonts.bold, fontSize: 16, color: "#1A1A1A", fontVariant: ["tabular-nums"] },
  statLabel: { fontFamily: Fonts.regular, fontSize: 10, color: "#8E8E93" },

  // Checklist
  checklistSection: {
    backgroundColor: "#F8F8F8",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E8E8E8",
  },
  checklistTitle: { fontFamily: Fonts.bold, fontSize: 16, color: "#1A1A1A", marginBottom: 4 },
  checklistSub: { fontFamily: Fonts.regular, fontSize: 11, color: "#8E8E93", marginBottom: 12 },
  checkItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#E8E8E8",
  },
  checkItemChecked: { opacity: 0.7 },
  checkBox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#E8E8E8",
    alignItems: "center",
    justifyContent: "center",
  },
  checkBoxChecked: { backgroundColor: "#2E7D32", borderColor: "#2E7D32" },
  checkMark: { color: "white", fontSize: 14, fontWeight: "bold" },
  checkLabel: { fontFamily: Fonts.medium, fontSize: 14, color: "#1A1A1A", flexShrink: 1 },
  checkLabelChecked: { color: "#8E8E93", textDecorationLine: "line-through" },
  checkTime: { fontFamily: Fonts.regular, fontSize: 11, color: "#8E8E93", marginTop: 2 },

  // Issue Memo
  issueSection: { marginTop: 16 },
  issueLabel: { fontFamily: Fonts.semiBold, fontSize: 14, color: "#1A1A1A", marginBottom: 8 },
  issueInput: {
    backgroundColor: "#FFFFFF",
    color: "#1A1A1A",
    borderWidth: 1,
    borderColor: "#E8E8E8",
    borderRadius: 10,
    padding: 12,
    fontSize: 13,
    fontFamily: Fonts.regular,
    minHeight: 60,
  },

  // GPS
  gpsWarn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
  },
  gpsWarnText: { fontFamily: Fonts.medium, color: "#FF9500" },

  // Complete Summary
  completeSummary: {
    backgroundColor: "#F0FFF0",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#2E7D32",
  },
  completeTitle: { fontFamily: Fonts.bold, fontSize: 22, color: "#2E7D32" },
  completeStat: { fontFamily: Fonts.regular, fontSize: 14, color: "#666" },
  completeRoute: { fontFamily: Fonts.medium, fontSize: 13, color: "#2E7D32" },
  completeChecklist: { marginTop: 12, alignSelf: "stretch", paddingTop: 12, borderTopWidth: 1, borderTopColor: "#E5E5EA" },
  completeCheckTitle: { fontFamily: Fonts.semiBold, fontSize: 13, color: "#1A1A1A", marginBottom: 6, textAlign: "center" },
  completeCheckItem: { fontFamily: Fonts.regular, fontSize: 13, color: "#8E8E93", textAlign: "center", paddingVertical: 2 },

  // Controls
  controls: { paddingVertical: 12, gap: 12 },
  startBtn: {
    backgroundColor: "#2E7D32",
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
  },
  startBtnText: { fontFamily: Fonts.bold, fontSize: 16, color: "white" },
  btnRow: { flexDirection: "row", gap: 12 },
  ctrlBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  ctrlBtnText: { fontFamily: Fonts.bold, fontSize: 15, color: "white" },
  pauseBtn: { backgroundColor: "#FF9500" },
  resumeBtn: { backgroundColor: "#34C759" },
  completeBtn: { backgroundColor: "#2E7D32" },
});
