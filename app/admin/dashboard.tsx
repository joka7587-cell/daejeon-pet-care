/**
 * 관리자 전용 대시보드
 * Phase 26: 대전 5개 구별 매칭 통계, 관제 지도, 워커 승인, 시스템 리셋
 */
import { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Alert,
  Dimensions,
  Platform,
  Modal,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { Image } from "expo-image";
import Svg, { Circle, Text as SvgText } from "react-native-svg";
import { WebView } from "react-native-webview";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { ScreenContainer } from "@/components/screen-container";
import { useRouter } from "expo-router";
import { useApp } from "@/lib/app-context";
import { Fonts, Typography } from "@/hooks/use-fonts";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  DISTRICT_STATS,
  TODAY_REVENUE,
  ACTIVE_WALKERS,
  PENDING_WALKERS,
  DASHBOARD_SUMMARY,
  WALKER_STATUS_MAP,
  APPROVAL_STATUS_MAP,
  type DistrictStats,
  type ActiveWalkerLocation,
  type PendingWalker,
} from "@/lib/admin-dashboard-data";
import { getApiBaseUrl } from "@/constants/oauth";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const haptic = () => {
  if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
};

// ─── SVG 원형 차트 컴포넌트 ───
function PieChart({ data, size = 200 }: { data: DistrictStats[]; size?: number }) {
  const total = data.reduce((sum, d) => sum + d.matchCount, 0);
  const radius = size / 2 - 10;
  const center = size / 2;
  let cumulativeAngle = -90; // 12시 방향부터 시작

  const slices = data.map((d) => {
    const angle = (d.matchCount / total) * 360;
    const startAngle = cumulativeAngle;
    const endAngle = cumulativeAngle + angle;
    cumulativeAngle = endAngle;

    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;

    const x1 = center + radius * Math.cos(startRad);
    const y1 = center + radius * Math.sin(startRad);
    const x2 = center + radius * Math.cos(endRad);
    const y2 = center + radius * Math.sin(endRad);

    const largeArc = angle > 180 ? 1 : 0;
    const path = `M ${center} ${center} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;

    // 라벨 위치 (호의 중간)
    const midAngle = ((startAngle + endAngle) / 2 * Math.PI) / 180;
    const labelR = radius * 0.65;
    const lx = center + labelR * Math.cos(midAngle);
    const ly = center + labelR * Math.sin(midAngle);

    return { ...d, path, lx, ly, angle };
  });

  const sliceElements = (() => {
    const strokeWidth = 40;
    const r = radius - strokeWidth / 2;
    const circumference = 2 * Math.PI * r;
    let offset = circumference * 0.25;
    return data.map((d, i) => {
      const sliceLen = (d.matchCount / total) * circumference;
      const dashArray = `${sliceLen} ${circumference - sliceLen}`;
      const currentOffset = offset;
      offset -= sliceLen;
      return <Circle key={i} cx={center} cy={center} r={r} fill="none" stroke={d.color} strokeWidth={strokeWidth} strokeDasharray={dashArray} strokeDashoffset={currentOffset} strokeLinecap="butt" />;
    });
  })();

  return (
    <View style={{ alignItems: "center" }}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>{sliceElements}<Circle cx={center} cy={center} r={radius - 50} fill="white" /><SvgText x={center} y={center - 8} textAnchor="middle" fontSize={12} fill="#8E8E93" fontFamily={Fonts.medium}>{"총 매칭"}</SvgText><SvgText x={center} y={center + 14} textAnchor="middle" fontSize={20} fontWeight="bold" fill="#1A1A1A" fontFamily={Fonts.bold}>{`${total}건`}</SvgText></Svg>

      {/* 범례 */}
      <View style={styles.legendContainer}>
        {data.map((d, i) => (
          <View key={i} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: d.color }]} />
            <Text style={[styles.legendText, { fontFamily: Fonts.medium }]}>
              {d.district}
            </Text>
            <Text style={[styles.legendValue, { fontFamily: Fonts.bold }]}>
              {d.percentage}%
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── 가장 단순한 카카오맵 샘플 HTML ───
function generateSimpleMapHTML(apiKey: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0,user-scalable=no"><style>*{margin:0;padding:0}html,body,#map{width:100%;height:100%}</style></head><body><div id="map"></div><script src="https://dapi.kakao.com/v2/maps/sdk.js?appkey=${apiKey}&autoload=false"></script><script>kakao.maps.load(function(){var c=document.getElementById('map');var map=new kakao.maps.Map(c,{center:new kakao.maps.LatLng(36.3504,127.3845),level:4});if(window.ReactNativeWebView){window.ReactNativeWebView.postMessage(JSON.stringify({type:'ready'}))}});</script></body></html>`;
}

// ─── 관제 지도 HTML 생성 (워커 마커 포함) ───
function generateControlMapHTML(
  apiKey: string,
  walkers: ActiveWalkerLocation[],
): string {
  const walkersJSON = JSON.stringify(
    walkers.map((w) => ({
      id: w.id,
      nickname: w.nickname,
      emoji: w.profileEmoji,
      lat: w.latitude,
      lng: w.longitude,
      district: w.district,
      neighborhood: w.neighborhood,
      status: w.status,
      petName: w.petName,
      petBreed: w.petBreed,
      ownerName: w.ownerName,
      distance: w.distanceCovered,
      elapsed: w.elapsedMinutes,
    }))
  );

  const statusColors: Record<string, string> = {
    walking: "#4CAF82",
    resting: "#F59E0B",
    returning: "#3B82F6",
  };
  const statusLabels: Record<string, string> = {
    walking: "\uC0B0\uCC45 \uC911",
    resting: "\uD734\uC2DD \uC911",
    returning: "\uBCF5\uADC0 \uC911",
  };
  const statusColorsJSON = JSON.stringify(statusColors);
  const statusLabelsJSON = JSON.stringify(statusLabels);

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0,user-scalable=no"><style>*{margin:0;padding:0;box-sizing:border-box}html,body{width:100%;height:100%;overflow:hidden}#map{width:100%;height:100%}.wm{display:flex;align-items:center;justify-content:center;width:44px;height:44px;border-radius:50%;border:3px solid #FFF;box-shadow:0 2px 10px rgba(0,0,0,.3);font-size:20px;cursor:pointer;position:relative}.wm:hover{transform:scale(1.15)}.wm .pr{position:absolute;width:44px;height:44px;border-radius:50%;border:2px solid;animation:p 1.5s ease-in-out infinite}@keyframes p{0%{transform:scale(1);opacity:.6}100%{transform:scale(2.2);opacity:0}}.iw{padding:12px 14px;border-radius:12px;background:#FFF;box-shadow:0 4px 16px rgba(0,0,0,.12);min-width:200px;font-family:-apple-system,sans-serif}.iw .wn{font-size:14px;font-weight:700;color:#1A1A1A;margin-bottom:4px}.iw .wd{font-size:11px;color:#8E8E93;margin-bottom:3px}.iw .wb{display:inline-block;padding:2px 8px;border-radius:10px;font-size:10px;font-weight:600;color:#FFF;margin-top:4px}.dl{font-size:13px;font-weight:600;color:#2E7D32;background:rgba(255,255,255,.85);padding:3px 8px;border-radius:8px;border:1px solid rgba(46,125,50,.2)}</style></head><body><div id="map"></div><script src="https://dapi.kakao.com/v2/maps/sdk.js?appkey=${apiKey}&autoload=false"></script><script>kakao.maps.load(function(){var c=document.getElementById('map');var map=new kakao.maps.Map(c,{center:new kakao.maps.LatLng(36.3504,127.3845),level:4});map.addControl(new kakao.maps.ZoomControl(),kakao.maps.ControlPosition.RIGHT);var ds=[{n:'\uC11C\uAD6C',la:36.355,lo:127.38},{n:'\uC720\uC131\uAD6C',la:36.385,lo:127.33},{n:'\uC911\uAD6C',la:36.33,lo:127.42},{n:'\uB3D9\uAD6C',la:36.32,lo:127.455},{n:'\uB300\uB355\uAD6C',la:36.43,lo:127.42}];ds.forEach(function(d){var e=document.createElement('div');e.className='dl';e.textContent=d.n;new kakao.maps.CustomOverlay({position:new kakao.maps.LatLng(d.la,d.lo),content:e,map:map,yAnchor:0.5})});var sc=${statusColorsJSON};var sl=${statusLabelsJSON};var ws=${walkersJSON};var oiw=null;ws.forEach(function(w){var pos=new kakao.maps.LatLng(w.lat,w.lng);var co=sc[w.status]||'#8E8E93';var la=sl[w.status]||w.status;var el=document.createElement('div');el.className='wm';el.style.background=co;el.innerHTML='<div class="pr" style="border-color:'+co+'"></div>'+w.emoji;new kakao.maps.CustomOverlay({position:pos,content:el,map:map,yAnchor:0.5});var ic='<div class="iw"><div class="wn">'+w.emoji+' '+w.nickname+'</div><div class="wd">\uD83D\uDCCD '+w.district+' '+w.neighborhood+'</div><div class="wd">\uD83D\uDC3E '+w.petName+'('+w.petBreed+') \u00B7 \uBCF4\uD638\uC790: '+w.ownerName+'</div><div class="wd">\uD83D\uDEB6 '+w.distance+'km \u00B7 '+w.elapsed+'\uBD84 \uACBD\uACFC</div><div class="wb" style="background:'+co+'">'+la+'</div></div>';var iw=new kakao.maps.InfoWindow({content:ic,removable:true});el.addEventListener('click',function(){if(oiw)oiw.close();iw.open(map,new kakao.maps.Marker({position:pos,map:null}));oiw=iw;if(window.ReactNativeWebView)window.ReactNativeWebView.postMessage(JSON.stringify({type:'markerClick',id:w.id}))})});if(window.ReactNativeWebView)window.ReactNativeWebView.postMessage(JSON.stringify({type:'ready'}))});</script></body></html>`;
}

// ─── 관제 지도 컴포넌트 (카카오맵 WebView) ───
function ControlMap({ walkers }: { walkers: ActiveWalkerLocation[] }) {
  const mapWidth = SCREEN_WIDTH - 48;
  const mapHeight = mapWidth * 0.85;
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [mapReady, setMapReady] = useState(false);
  const webViewRef = useRef<any>(null);

  useEffect(() => {
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
          setLoading(false);
        }
      } catch {
        setError("API 키를 가져오는 데 실패했습니다.");
        setLoading(false);
      }
    };
    fetchKey();
  }, []);

  const [useFullMap, setUseFullMap] = useState(false);

  const handleMessage = useCallback((event: { nativeEvent: { data: string } }) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === "ready") {
        setLoading(false);
        if (!useFullMap) {
          // 단순 지도 로드 성공 → 풀 버전으로 전환
          setTimeout(() => setUseFullMap(true), 500);
        } else {
          setMapReady(true);
        }
      } else if (data.type === "error") {
        setError(data.message);
        setLoading(false);
      } else if (data.type === "markerClick") {
        haptic();
      }
    } catch {
      // ignore
    }
  }, [useFullMap]);

  // 단순 지도 → 풀 버전 전환
  const currentHTML = apiKey
    ? (useFullMap ? generateControlMapHTML(apiKey, walkers) : generateSimpleMapHTML(apiKey))
    : "";

  return (
    <View style={[styles.mapContainer, { width: mapWidth, height: mapHeight }]}>
      {error ? (
        <View style={styles.mapErrorContainer}>
          <Text style={styles.mapErrorEmoji}>⚠️</Text>
          <Text style={[styles.mapErrorText, { fontFamily: Fonts.medium }]}>{error}</Text>
          <Text style={[styles.mapErrorSub, { fontFamily: Fonts.regular }]}>
            카카오 Developers에서 JavaScript API 키를 발급받아 설정해주세요.
          </Text>
        </View>
      ) : apiKey ? (
        <>
          {Platform.OS === "web" ? (
            <iframe
              srcDoc={currentHTML}
              style={{
                width: "100%",
                height: "100%",
                border: "none",
                borderRadius: 12,
              }}
              title="관제 지도"
            />
          ) : (
            <WebView
              ref={webViewRef}
              source={{ html: currentHTML }}
              style={{ flex: 1, borderRadius: 12 }}
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
            <View style={styles.mapLoadingOverlay}>
              <ActivityIndicator size="large" color="#2E7D32" />
              <Text style={[styles.mapLoadingText, { fontFamily: Fonts.regular }]}>대전 관제 지도 로딩 중...</Text>
            </View>
          )}
        </>
      ) : (
        <View style={styles.mapLoadingOverlay}>
          <ActivityIndicator size="large" color="#2E7D32" />
          <Text style={[styles.mapLoadingText, { fontFamily: Fonts.regular }]}>API 키 확인 중...</Text>
        </View>
      )}
    </View>
  );
}

// ─── 맥동 점 애니메이션 ───
function PulsingDot({ color }: { color: string }) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.6);

  useEffect(() => {
    scale.value = withRepeat(
      withTiming(2, { duration: 1500, easing: Easing.out(Easing.ease) }),
      -1,
      false
    );
    opacity.value = withRepeat(
      withTiming(0, { duration: 1500, easing: Easing.out(Easing.ease) }),
      -1,
      false
    );
  }, [scale, opacity]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <View style={styles.pulsingContainer}>
      <Animated.View style={[styles.pulsingRing, { borderColor: color }, animStyle]} />
      <View style={[styles.pulsingCore, { backgroundColor: color }]} />
    </View>
  );
}

// ─── 워커 승인 카드 ───
function ApprovalCard({
  walker,
  onApprove,
  onReject,
}: {
  walker: PendingWalker;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}) {
  const [showCert, setShowCert] = useState(false);
  const statusInfo = APPROVAL_STATUS_MAP[walker.status];

  return (
    <View style={styles.approvalCard}>
      {/* 헤더 */}
      <View style={styles.approvalHeader}>
        <View style={styles.approvalProfile}>
          <Text style={styles.approvalEmoji}>{walker.profileEmoji}</Text>
          <View style={{ flex: 1 }}>
            <Text style={[styles.approvalName, { fontFamily: Fonts.bold }]}>{walker.realName}</Text>
            <Text style={[styles.approvalNickname, { fontFamily: Fonts.regular }]}>
              @{walker.nickname} · {walker.age}세
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusInfo.bgColor }]}>
            <Text style={[styles.statusBadgeText, { color: statusInfo.color, fontFamily: Fonts.semiBold }]}>
              {statusInfo.label}
            </Text>
          </View>
        </View>
      </View>

      {/* 정보 */}
      <View style={styles.approvalInfo}>
        <View style={styles.infoRow}>
          <Text style={[styles.infoLabel, { fontFamily: Fonts.medium }]}>지역</Text>
          <Text style={[styles.infoValue, { fontFamily: Fonts.regular }]}>{walker.district} {walker.neighborhood}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={[styles.infoLabel, { fontFamily: Fonts.medium }]}>자격증</Text>
          <Text style={[styles.infoValue, { fontFamily: Fonts.regular }]}>{walker.certType}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={[styles.infoLabel, { fontFamily: Fonts.medium }]}>경력</Text>
          <Text style={[styles.infoValue, { fontFamily: Fonts.regular }]}>{walker.experience}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={[styles.infoLabel, { fontFamily: Fonts.medium }]}>대형견</Text>
          <Text style={[styles.infoValue, { fontFamily: Fonts.regular }]}>
            {walker.canHandleLargeDogs ? "가능 ✅" : "불가 ❌"}
          </Text>
        </View>
      </View>

      {/* 자기소개 */}
      <Text style={[styles.approvalBio, { fontFamily: Fonts.regular }]}>{walker.bio}</Text>

      {/* 자격증 사진 보기 */}
      <Pressable
        onPress={() => { haptic(); setShowCert(true); }}
        style={({ pressed }) => [styles.certButton, pressed && { opacity: 0.7 }]}
      >
        <Text style={[styles.certButtonText, { fontFamily: Fonts.semiBold }]}>📋 자격증 사진 확인</Text>
      </Pressable>

      {/* 승인/거절 버튼 */}
      {walker.status === "pending" && (
        <View style={styles.approvalActions}>
          <Pressable
            onPress={() => { haptic(); onApprove(walker.id); }}
            style={({ pressed }) => [styles.approveBtn, pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] }]}
          >
            <Text style={[styles.approveBtnText, { fontFamily: Fonts.bold }]}>✅ 승인</Text>
          </Pressable>
          <Pressable
            onPress={() => { haptic(); onReject(walker.id); }}
            style={({ pressed }) => [styles.rejectBtn, pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] }]}
          >
            <Text style={[styles.rejectBtnText, { fontFamily: Fonts.bold }]}>❌ 거절</Text>
          </Pressable>
        </View>
      )}

      {/* 자격증 모달 */}
      <Modal visible={showCert} transparent animationType="fade" onRequestClose={() => setShowCert(false)}>
        <Pressable style={styles.certModalOverlay} onPress={() => setShowCert(false)}>
          <View style={styles.certModalContent}>
            <Text style={[styles.certModalTitle, { fontFamily: Fonts.bold }]}>
              {walker.realName}님의 자격증
            </Text>
            <Image
              source={{ uri: walker.certPhotoUrl }}
              style={styles.certImage}
              contentFit="cover"
            />
            <Text style={[styles.certModalType, { fontFamily: Fonts.medium }]}>{walker.certType}</Text>
            <Pressable
              onPress={() => setShowCert(false)}
              style={({ pressed }) => [styles.certCloseBtn, pressed && { opacity: 0.7 }]}
            >
              <Text style={[styles.certCloseBtnText, { fontFamily: Fonts.semiBold }]}>닫기</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

// ─── 메인 대시보드 ───
export default function AdminDashboard() {
  const router = useRouter();
  const { state, dispatch, resetApp } = useApp();
  const [pendingWalkers, setPendingWalkers] = useState<PendingWalker[]>(PENDING_WALKERS);
  const [isResetting, setIsResetting] = useState(false);
  const [selectedWalker, setSelectedWalker] = useState<ActiveWalkerLocation | null>(null);

  const handleApprove = useCallback((id: string) => {
    Alert.alert(
      "워커 승인",
      "이 워커를 승인하시겠습니까?",
      [
        { text: "취소", style: "cancel" },
        {
          text: "승인",
          onPress: () => {
            haptic();
            setPendingWalkers((prev) =>
              prev.map((w) => (w.id === id ? { ...w, status: "approved" as const } : w))
            );
          },
        },
      ]
    );
  }, []);

  const handleReject = useCallback((id: string) => {
    Alert.alert(
      "워커 거절",
      "이 워커를 거절하시겠습니까? 사유를 입력해주세요.",
      [
        { text: "취소", style: "cancel" },
        {
          text: "거절",
          style: "destructive",
          onPress: () => {
            haptic();
            setPendingWalkers((prev) =>
              prev.map((w) => (w.id === id ? { ...w, status: "rejected" as const } : w))
            );
          },
        },
      ]
    );
  }, []);

  const handleSystemReset = useCallback(() => {
    Alert.alert(
      "⚠️ System Reset",
      "모든 채팅 내역, 위치 데이터, 예약 데이터가 초기화됩니다.\n\n시연용 시드 데이터는 유지됩니다.\n\n계속하시겠습니까?",
      [
        { text: "취소", style: "cancel" },
        {
          text: "초기화",
          style: "destructive",
          onPress: async () => {
            haptic();
            setIsResetting(true);
            try {
              // 채팅 관련 키 삭제
              const allKeys = await AsyncStorage.getAllKeys();
              const chatKeys = allKeys.filter(
                (k) => k.includes("chat") || k.includes("message") || k.includes("location") || k.includes("walk_session")
              );
              if (chatKeys.length > 0) {
                await AsyncStorage.multiRemove(chatKeys);
              }
              // 앱 상태 리셋
              await resetApp();
              Alert.alert("초기화 완료", "모든 데이터가 초기화되었습니다.\n앱이 다시 시작됩니다.");
            } catch (e) {
              Alert.alert("오류", "초기화 중 오류가 발생했습니다.");
            } finally {
              setIsResetting(false);
            }
          },
        },
      ]
    );
  }, [resetApp]);

  const pendingCount = pendingWalkers.filter((w) => w.status === "pending").length;

  return (
    <ScreenContainer edges={["top", "left", "right"]}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* 헤더 */}
        <View style={styles.header}>
          <Pressable
            onPress={() => { haptic(); router.back(); }}
            style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}
          >
            <Text style={styles.backBtnText}>‹</Text>
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={[styles.headerTitle, { fontFamily: Fonts.bold }]}>관리자 대시보드</Text>
            <Text style={[styles.headerSubtitle, { fontFamily: Fonts.regular }]}>
              반려이음 · 대전 지역 관리
            </Text>
          </View>
          <View style={styles.adminBadge}>
            <Text style={[styles.adminBadgeText, { fontFamily: Fonts.semiBold }]}>ADMIN</Text>
          </View>
        </View>

        {/* ─── 섹션 1: 오늘 매출 요약 ─── */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { fontFamily: Fonts.bold }]}>📊 오늘의 현황</Text>
          <View style={styles.statsGrid}>
            <View style={[styles.statCard, { backgroundColor: "#2E7D3210" }]}>
              <Text style={[styles.statLabel, { fontFamily: Fonts.medium }]}>총 매출</Text>
              <Text style={[styles.statValue, { color: "#2E7D32", fontFamily: Fonts.extraBold }]}>
                {(TODAY_REVENUE.totalRevenue / 10000).toFixed(1)}만원
              </Text>
              <Text style={[styles.statChange, { color: "#4CAF82", fontFamily: Fonts.medium }]}>
                ▲ {TODAY_REVENUE.comparedYesterday}%
              </Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: "#4CAF8210" }]}>
              <Text style={[styles.statLabel, { fontFamily: Fonts.medium }]}>완료 산책</Text>
              <Text style={[styles.statValue, { color: "#4CAF82", fontFamily: Fonts.extraBold }]}>
                {TODAY_REVENUE.completedWalks}건
              </Text>
              <Text style={[styles.statSub, { fontFamily: Fonts.regular }]}>
                평균 {(TODAY_REVENUE.averagePerWalk / 10000).toFixed(1)}만원
              </Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: "#3B82F610" }]}>
              <Text style={[styles.statLabel, { fontFamily: Fonts.medium }]}>총 예약</Text>
              <Text style={[styles.statValue, { color: "#3B82F6", fontFamily: Fonts.extraBold }]}>
                {TODAY_REVENUE.totalBookings}건
              </Text>
              <Text style={[styles.statSub, { fontFamily: Fonts.regular }]}>
                오늘 신규 {DASHBOARD_SUMMARY.todayNewUsers}명
              </Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: "#A855F710" }]}>
              <Text style={[styles.statLabel, { fontFamily: Fonts.medium }]}>활성 유저</Text>
              <Text style={[styles.statValue, { color: "#A855F7", fontFamily: Fonts.extraBold }]}>
                {DASHBOARD_SUMMARY.totalUsers.toLocaleString()}명
              </Text>
              <Text style={[styles.statChange, { color: "#4CAF82", fontFamily: Fonts.medium }]}>
                ▲ {DASHBOARD_SUMMARY.monthlyGrowth}%
              </Text>
            </View>
          </View>
        </View>

        {/* ─── 섹션 2: 구별 매칭 점유율 원형 차트 ─── */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { fontFamily: Fonts.bold }]}>🥧 구별 매칭 점유율</Text>
          <View style={styles.chartCard}>
            <PieChart data={DISTRICT_STATS} size={220} />
            {/* 구별 상세 */}
            <View style={styles.districtDetails}>
              {DISTRICT_STATS.map((d, i) => (
                <View key={i} style={styles.districtRow}>
                  <View style={[styles.districtDot, { backgroundColor: d.color }]} />
                  <Text style={[styles.districtName, { fontFamily: Fonts.semiBold }]}>{d.district}</Text>
                  <View style={{ flex: 1 }} />
                  <Text style={[styles.districtCount, { fontFamily: Fonts.medium }]}>
                    {d.matchCount}건
                  </Text>
                  <Text style={[styles.districtWalkers, { fontFamily: Fonts.regular }]}>
                    워커 {d.activeWalkers}명
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* ─── 섹션 3: 관제 지도 ─── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { fontFamily: Fonts.bold }]}>🗺️ 실시간 관제 지도</Text>
            <View style={styles.liveIndicator}>
              <View style={styles.liveDot} />
              <Text style={[styles.liveText, { fontFamily: Fonts.semiBold }]}>LIVE</Text>
            </View>
          </View>
          <View style={styles.mapCard}>
            <ControlMap walkers={ACTIVE_WALKERS} />
            {/* 워커 목록 */}
            <View style={styles.walkerList}>
              {ACTIVE_WALKERS.map((w) => {
                const statusInfo = WALKER_STATUS_MAP[w.status];
                return (
                  <Pressable
                    key={w.id}
                    onPress={() => { haptic(); setSelectedWalker(w); }}
                    style={({ pressed }) => [styles.walkerRow, pressed && { opacity: 0.7 }]}
                  >
                    <Text style={styles.walkerEmoji}>{w.profileEmoji}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.walkerName, { fontFamily: Fonts.semiBold }]}>{w.nickname}</Text>
                      <Text style={[styles.walkerInfo, { fontFamily: Fonts.regular }]}>
                        {w.petName}({w.petBreed}) · {w.district}
                      </Text>
                    </View>
                    <View style={[styles.walkerStatusBadge, { backgroundColor: statusInfo.bgColor }]}>
                      <Text style={[styles.walkerStatusText, { color: statusInfo.color, fontFamily: Fonts.semiBold }]}>
                        {statusInfo.label}
                      </Text>
                    </View>
                    <Text style={[styles.walkerTime, { fontFamily: Fonts.medium }]}>{w.elapsedMinutes}분</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>

        {/* ─── 섹션 4: 워커 승인 시스템 ─── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { fontFamily: Fonts.bold }]}>👤 워커 승인 관리</Text>
            {pendingCount > 0 && (
              <View style={styles.pendingBadge}>
                <Text style={[styles.pendingBadgeText, { fontFamily: Fonts.bold }]}>{pendingCount}</Text>
              </View>
            )}
          </View>
          {pendingWalkers.map((w) => (
            <ApprovalCard
              key={w.id}
              walker={w}
              onApprove={handleApprove}
              onReject={handleReject}
            />
          ))}
        </View>

        {/* ─── 섹션 5: System Reset ─── */}
        <View style={[styles.section, styles.resetSection]}>
          <Text style={[styles.sectionTitle, { fontFamily: Fonts.bold, color: "#EF4444" }]}>
            ⚠️ 시스템 관리
          </Text>
          <Text style={[styles.resetDescription, { fontFamily: Fonts.regular }]}>
            시연용 데이터 초기화: 모든 채팅 내역, 위치 데이터, 예약 데이터를 삭제하고 앱을 초기 상태로 되돌립니다.
            시드 데이터(워커 5명, 예약 3건)는 앱 재시작 시 자동으로 다시 로드됩니다.
          </Text>
          <Pressable
            onPress={handleSystemReset}
            disabled={isResetting}
            style={({ pressed }) => [
              styles.resetButton,
              pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] },
              isResetting && { opacity: 0.5 },
            ]}
          >
            <Text style={[styles.resetButtonText, { fontFamily: Fonts.bold }]}>
              {isResetting ? "초기화 중..." : "🔄 System Reset"}
            </Text>
          </Pressable>
          <Text style={[styles.resetWarning, { fontFamily: Fonts.medium }]}>
            이 작업은 되돌릴 수 없습니다
          </Text>
        </View>

        {/* 하단 여백 */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* 워커 상세 모달 */}
      <Modal
        visible={!!selectedWalker}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedWalker(null)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setSelectedWalker(null)}>
          <View style={styles.modalContent}>
            {selectedWalker && (() => {
              const w = selectedWalker;
              const statusInfo = WALKER_STATUS_MAP[w.status];
              return (
                <>
                  <View style={styles.modalHandle} />
                  <View style={styles.modalHeader}>
                    <Text style={{ fontSize: 36 }}>{w.profileEmoji}</Text>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={[styles.modalName, { fontFamily: Fonts.bold }]}>{w.nickname}</Text>
                      <Text style={[styles.modalSub, { fontFamily: Fonts.regular }]}>
                        {w.district} {w.neighborhood}
                      </Text>
                    </View>
                    <View style={[styles.walkerStatusBadge, { backgroundColor: statusInfo.bgColor }]}>
                      <Text style={[styles.walkerStatusText, { color: statusInfo.color, fontFamily: Fonts.bold }]}>
                        {statusInfo.label}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.modalDetails}>
                    <View style={styles.modalDetailRow}>
                      <Text style={[styles.modalDetailLabel, { fontFamily: Fonts.medium }]}>반려견</Text>
                      <Text style={[styles.modalDetailValue, { fontFamily: Fonts.regular }]}>
                        {w.petName} ({w.petBreed})
                      </Text>
                    </View>
                    <View style={styles.modalDetailRow}>
                      <Text style={[styles.modalDetailLabel, { fontFamily: Fonts.medium }]}>보호자</Text>
                      <Text style={[styles.modalDetailValue, { fontFamily: Fonts.regular }]}>{w.ownerName}</Text>
                    </View>
                    <View style={styles.modalDetailRow}>
                      <Text style={[styles.modalDetailLabel, { fontFamily: Fonts.medium }]}>산책 시간</Text>
                      <Text style={[styles.modalDetailValue, { fontFamily: Fonts.regular }]}>{w.elapsedMinutes}분</Text>
                    </View>
                    <View style={styles.modalDetailRow}>
                      <Text style={[styles.modalDetailLabel, { fontFamily: Fonts.medium }]}>이동 거리</Text>
                      <Text style={[styles.modalDetailValue, { fontFamily: Fonts.regular }]}>{w.distanceCovered}km</Text>
                    </View>
                  </View>
                  <Pressable
                    onPress={() => { haptic(); setSelectedWalker(null); }}
                    style={({ pressed }) => [styles.modalCloseBtn, pressed && { opacity: 0.7 }]}
                  >
                    <Text style={[styles.modalCloseBtnText, { fontFamily: Fonts.semiBold }]}>닫기</Text>
                  </Pressable>
                </>
              );
            })()}
          </View>
        </Pressable>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F5F5" },
  contentContainer: { paddingBottom: 40 },

  // 헤더
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E8E8E8",
  },
  backBtn: { width: 36, height: 36, justifyContent: "center", alignItems: "center", marginRight: 8 },
  backBtnText: { fontSize: 28, color: "#1A1A1A", lineHeight: 32 },
  headerTitle: { fontSize: 20, color: "#1A1A1A" },
  headerSubtitle: { fontSize: 12, color: "#8E8E93", marginTop: 2 },
  adminBadge: {
    backgroundColor: "#2E7D32",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  adminBadgeText: { fontSize: 11, color: "#FFFFFF" },

  // 섹션
  section: { marginTop: 16, paddingHorizontal: 16 },
  sectionTitle: { fontSize: 18, color: "#1A1A1A", marginBottom: 12 },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },

  // 통계 그리드
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  statCard: {
    width: (SCREEN_WIDTH - 42) / 2,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E8E8E820",
  },
  statLabel: { fontSize: 12, color: "#8E8E93", marginBottom: 4 },
  statValue: { fontSize: 24, marginBottom: 2 },
  statChange: { fontSize: 11 },
  statSub: { fontSize: 11, color: "#8E8E93" },

  // 원형 차트
  chartCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "#E8E8E8",
  },
  legendContainer: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", marginTop: 16, gap: 12 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 12, color: "#1A1A1A" },
  legendValue: { fontSize: 12, color: "#8E8E93" },
  districtDetails: { marginTop: 16, gap: 8 },
  districtRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  districtDot: { width: 10, height: 10, borderRadius: 5 },
  districtName: { fontSize: 14, color: "#1A1A1A", width: 50 },
  districtCount: { fontSize: 13, color: "#1A1A1A", width: 45, textAlign: "right" },
  districtWalkers: { fontSize: 12, color: "#8E8E93", width: 65, textAlign: "right" },

  // 관제 지도
  mapCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E8E8E8",
  },
  mapContainer: {
    backgroundColor: "#FAFAFA",
    borderRadius: 12,
    overflow: "hidden",
    position: "relative" as const,
  },
  mapErrorContainer: {
    flex: 1,
    justifyContent: "center" as const,
    alignItems: "center" as const,
    padding: 24,
  },
  mapErrorEmoji: { fontSize: 40, marginBottom: 12 },
  mapErrorText: { fontSize: 14, color: "#1A1A1A", textAlign: "center" as const, marginBottom: 8 },
  mapErrorSub: { fontSize: 12, color: "#8E8E93", textAlign: "center" as const, lineHeight: 18 },
  mapLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#F8FBF5",
    justifyContent: "center" as const,
    alignItems: "center" as const,
    borderRadius: 12,
    gap: 12,
  },
  mapLoadingText: { fontSize: 13, color: "#8E8E93" },
  walkerMarker: { position: "absolute" as const, width: 32, height: 32, alignItems: "center" as const, justifyContent: "center" as const },
  markerEmoji: { fontSize: 18, position: "absolute" as const },
  pulsingContainer: { position: "absolute" as const, width: 32, height: 32, alignItems: "center" as const, justifyContent: "center" as const },
  pulsingRing: { position: "absolute" as const, width: 28, height: 28, borderRadius: 14, borderWidth: 2 },
  pulsingCore: { width: 8, height: 8, borderRadius: 4 },
  walkerList: { marginTop: 12, gap: 8 },
  walkerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: "#F8F8F8",
    gap: 10,
  },
  walkerEmoji: { fontSize: 24 },
  walkerName: { fontSize: 13, color: "#1A1A1A" },
  walkerInfo: { fontSize: 11, color: "#8E8E93", marginTop: 1 },
  walkerStatusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  walkerStatusText: { fontSize: 11 },
  walkerTime: { fontSize: 12, color: "#8E8E93" },
  liveIndicator: { flexDirection: "row", alignItems: "center", gap: 4 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#EF4444" },
  liveText: { fontSize: 12, color: "#EF4444" },

  // 워커 승인
  approvalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E8E8E8",
  },
  approvalHeader: { marginBottom: 12 },
  approvalProfile: { flexDirection: "row", alignItems: "center", gap: 10 },
  approvalEmoji: { fontSize: 36 },
  approvalName: { fontSize: 16, color: "#1A1A1A" },
  approvalNickname: { fontSize: 12, color: "#8E8E93", marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  statusBadgeText: { fontSize: 11 },
  approvalInfo: { gap: 6, marginBottom: 10 },
  infoRow: { flexDirection: "row", alignItems: "center" },
  infoLabel: { fontSize: 12, color: "#8E8E93", width: 55 },
  infoValue: { fontSize: 13, color: "#1A1A1A", flex: 1 },
  approvalBio: { fontSize: 13, color: "#555", lineHeight: 18, marginBottom: 12 },
  certButton: {
    backgroundColor: "#F0F0F0",
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 12,
  },
  certButtonText: { fontSize: 13, color: "#1A1A1A" },
  approvalActions: { flexDirection: "row", gap: 10 },
  approveBtn: {
    flex: 1,
    backgroundColor: "#4CAF82",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  approveBtnText: { fontSize: 14, color: "#FFFFFF" },
  rejectBtn: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#EF4444",
  },
  rejectBtnText: { fontSize: 14, color: "#EF4444" },

  // 자격증 모달
  certModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  certModalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    width: SCREEN_WIDTH - 48,
    alignItems: "center",
  },
  certModalTitle: { fontSize: 16, color: "#1A1A1A", marginBottom: 16 },
  certImage: { width: SCREEN_WIDTH - 96, height: (SCREEN_WIDTH - 96) * 0.75, borderRadius: 12, marginBottom: 12 },
  certModalType: { fontSize: 14, color: "#8E8E93", marginBottom: 16 },
  certCloseBtn: { backgroundColor: "#F0F0F0", paddingVertical: 10, paddingHorizontal: 32, borderRadius: 10 },
  certCloseBtnText: { fontSize: 14, color: "#1A1A1A" },

  // System Reset
  resetSection: {
    marginTop: 24,
    backgroundColor: "#FEF2F2",
    marginHorizontal: 16,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  resetDescription: { fontSize: 13, color: "#555", lineHeight: 20, marginBottom: 16 },
  resetButton: {
    backgroundColor: "#EF4444",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    marginBottom: 8,
  },
  resetButtonText: { fontSize: 16, color: "#FFFFFF" },
  resetWarning: { fontSize: 11, color: "#EF4444", textAlign: "center" },

  // 워커 상세 모달
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: "#D1D5DB",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 20,
  },
  modalHeader: { flexDirection: "row", alignItems: "center", marginBottom: 20 },
  modalName: { fontSize: 18, color: "#1A1A1A" },
  modalSub: { fontSize: 13, color: "#8E8E93", marginTop: 2 },
  modalDetails: { gap: 12, marginBottom: 20 },
  modalDetailRow: { flexDirection: "row", alignItems: "center" },
  modalDetailLabel: { fontSize: 13, color: "#8E8E93", width: 70 },
  modalDetailValue: { fontSize: 14, color: "#1A1A1A", flex: 1 },
  modalCloseBtn: {
    backgroundColor: "#F0F0F0",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  modalCloseBtnText: { fontSize: 14, color: "#1A1A1A" },

  // 승인 뱃지
  pendingBadge: {
    backgroundColor: "#EF4444",
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
  },
  pendingBadgeText: { fontSize: 12, color: "#FFFFFF" },
});
