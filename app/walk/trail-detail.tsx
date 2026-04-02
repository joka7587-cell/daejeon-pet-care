/**
 * 산책로 상세 페이지
 * - 코스 정보 (난이도, 소요시간, 거리, 특징 태그)
 * - 카카오맵 WebView로 산책로 위치 표시
 * - 리뷰 섹션 (더미 리뷰 데이터)
 * - 사진 갤러리 섹션
 * - 반려견 관련 안내
 */
import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Dimensions,
  Platform,
  ActivityIndicator,
} from "react-native";
import { WebView } from "react-native-webview";
import { ScreenContainer } from "@/components/screen-container";
import { useLocalSearchParams, useRouter } from "expo-router";
import { DAEJEON_WALK_SPOTS, type WalkSpot } from "@/lib/daejeon-spots";
import { getApiBaseUrl } from "@/constants/oauth";
import { Fonts } from "@/hooks/use-fonts";
import * as Haptics from "expo-haptics";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

function haptic() {
  if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

// ─── 더미 리뷰 데이터 ───
interface Review {
  id: string;
  userName: string;
  userEmoji: string;
  rating: number;
  date: string;
  content: string;
  petInfo: string;
}

const REVIEWS_MAP: Record<string, Review[]> = {
  spot_1: [
    { id: "r1", userName: "초코맘", userEmoji: "👩", rating: 5, date: "2026.03.28", content: "수목원 산책로가 정말 넓고 그늘이 많아서 여름에도 좋아요. 초코가 잔디밭에서 뛰어놀기 좋았습니다!", petInfo: "포메라니안 · 3세" },
    { id: "r2", userName: "뽀삐아빠", userEmoji: "👨", rating: 4, date: "2026.03.25", content: "주말에는 사람이 많지만 평일에는 한적해요. 벤치가 많아서 쉬기 좋습니다.", petInfo: "비숑프리제 · 2세" },
    { id: "r3", userName: "달이엄마", userEmoji: "👩‍🦱", rating: 5, date: "2026.03.20", content: "배변봉투 비치대가 곳곳에 있어서 편해요. 산책로가 평탄해서 노견도 편하게 걸을 수 있어요.", petInfo: "골든리트리버 · 8세" },
  ],
  spot_2: [
    { id: "r4", userName: "하늘이맘", userEmoji: "👩‍🦰", rating: 5, date: "2026.03.30", content: "잔디밭이 넓어서 공놀이하기 최고예요! 한빛탑 앞에서 사진 찍기도 좋아요.", petInfo: "래브라도 · 4세" },
    { id: "r5", userName: "콩이아빠", userEmoji: "🧔", rating: 4, date: "2026.03.27", content: "주차장이 넓고 편의시설이 잘 되어 있어요. 다만 주말에는 행사가 있을 때 시끄러울 수 있어요.", petInfo: "시바이누 · 3세" },
  ],
  spot_3: [
    { id: "r6", userName: "몽이맘", userEmoji: "👩‍🦳", rating: 5, date: "2026.03.29", content: "호수 주변 산책로가 정말 예뻐요. 몽이가 물을 좋아해서 호수 근처에서 즐거워했어요.", petInfo: "푸들 · 5세" },
    { id: "r7", userName: "루루아빠", userEmoji: "👨‍🦲", rating: 4, date: "2026.03.22", content: "운동시설도 있어서 산책하면서 운동도 할 수 있어요. 다만 일부 구간은 자전거와 겹쳐요.", petInfo: "웰시코기 · 2세" },
  ],
  spot_9: [
    { id: "r8", userName: "나비맘", userEmoji: "👩‍🎓", rating: 5, date: "2026.03.31", content: "캠퍼스가 정말 깨끗하고 조용해요. 잔디밭에서 피크닉하면서 산책하기 좋아요!", petInfo: "말티즈 · 1세" },
    { id: "r9", userName: "보리아빠", userEmoji: "🧑", rating: 4, date: "2026.03.26", content: "카페도 근처에 많아서 산책 후 쉬기 좋아요. 리드줄은 꼭 해야 합니다.", petInfo: "진돗개 · 6세" },
  ],
  spot_11: [
    { id: "r10", userName: "해피맘", userEmoji: "👩‍🔬", rating: 5, date: "2026.04.01", content: "황톳길이 정말 특별한 경험이에요! 맨발로 걸으면 기분이 좋아져요. 강아지도 좋아했어요.", petInfo: "비글 · 3세" },
    { id: "r11", userName: "두부아빠", userEmoji: "👨‍💼", rating: 5, date: "2026.03.28", content: "숲 속 공기가 정말 좋아요. 두부가 신나서 뛰어다녔어요. 다만 발바닥 보호에 신경 써야 해요.", petInfo: "스피츠 · 4세" },
  ],
};

// 기본 리뷰 (매핑 없는 산책로용)
const DEFAULT_REVIEWS: Review[] = [
  { id: "rd1", userName: "산책러버", userEmoji: "🚶", rating: 4, date: "2026.03.25", content: "반려견과 함께 산책하기 좋은 곳이에요. 경치도 좋고 공기도 맑아요!", petInfo: "믹스견 · 3세" },
  { id: "rd2", userName: "댕댕이맘", userEmoji: "👩", rating: 5, date: "2026.03.20", content: "우리 강아지가 정말 좋아하는 산책로예요. 자주 올 예정입니다.", petInfo: "포메라니안 · 2세" },
];

// ─── 더미 사진 태그 → 이모지 매핑 (실제 사진 대신) ───
const PHOTO_EMOJIS: Record<string, string[]> = {
  arboretum: ["🌳", "🌿", "🍃", "🌲", "🌺", "🦋"],
  expo_park: ["🏟️", "🌿", "🎪", "🌳", "☀️", "🦮"],
  yurim: ["🏞️", "🦆", "🌳", "🌸", "🏃", "🐕"],
  gapcheon_park: ["🌊", "🌳", "🌉", "🦢", "🌅", "🐾"],
  gapcheon: ["🌊", "🚶", "🌉", "🌳", "🌙", "🐕‍🦺"],
  oworld: ["🦁", "🌲", "🏔️", "🌿", "🦜", "🐾"],
  bomunsan: ["⛰️", "🌲", "💧", "🌄", "🥾", "🐕"],
  daecheongho: ["🏔️", "🌊", "📸", "🌲", "🦅", "🐾"],
  kaist: ["🎓", "🌿", "☕", "🏛️", "🌳", "🐕"],
  daedeok: ["🔬", "🌳", "🚶", "🏢", "🍂", "🐾"],
  gyejoksan: ["🦶", "🌲", "🍂", "🏔️", "💚", "🐕"],
  dongchundang: ["🏯", "🌸", "🦆", "🌳", "📿", "🐾"],
};

// ─── 별점 렌더링 ───
function StarRating({ rating, size = 14 }: { rating: number; size?: number }) {
  const fullStars = Math.floor(rating);
  const hasHalf = rating - fullStars >= 0.5;
  return (
    <View style={{ flexDirection: "row", gap: 1 }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Text key={i} style={{ fontSize: size, color: i < fullStars ? "#F59E0B" : (i === fullStars && hasHalf ? "#F59E0B" : "#E5E7EB") }}>
          {i < fullStars ? "★" : (i === fullStars && hasHalf ? "★" : "☆")}
        </Text>
      ))}
    </View>
  );
}

// ─── 카카오맵 HTML 생성 ───
function generateTrailMapHTML(apiKey: string, spot: WalkSpot): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; overflow: hidden; }
    #map { width: 100%; height: 100%; }
    .spot-marker {
      display: flex; align-items: center; justify-content: center;
      width: 48px; height: 48px; border-radius: 50%;
      background: #2E7D32; border: 3px solid #FFFFFF;
      box-shadow: 0 3px 12px rgba(0,0,0,0.3);
      font-size: 22px; cursor: pointer;
    }
    .spot-info {
      padding: 14px 16px; border-radius: 14px;
      background: #FFFFFF; box-shadow: 0 4px 20px rgba(0,0,0,0.12);
      min-width: 220px; font-family: -apple-system, sans-serif;
    }
    .spot-info .name { font-size: 15px; font-weight: 700; color: #1A1A1A; margin-bottom: 4px; }
    .spot-info .loc { font-size: 12px; color: #8E8E93; margin-bottom: 6px; }
    .spot-info .tags { display: flex; flex-wrap: wrap; gap: 4px; }
    .spot-info .tag {
      padding: 2px 8px; border-radius: 10px; font-size: 10px;
      font-weight: 600; color: #2E7D32; background: #E8F5E9;
    }
    #loading {
      display: flex; align-items: center; justify-content: center;
      width: 100%; height: 100%; font-family: -apple-system, sans-serif;
      color: #2E7D32; font-size: 14px;
    }
  </style>
</head>
<body>
  <div id="loading">지도를 불러오는 중...</div>
  <div id="map" style="display:none;"></div>
  <script src="https://dapi.kakao.com/v2/maps/sdk.js?appkey=${apiKey}&autoload=false"></script>
  <script>
    kakao.maps.load(function() {
      document.getElementById('loading').style.display = 'none';
      document.getElementById('map').style.display = 'block';
      
      var container = document.getElementById('map');
      var map = new kakao.maps.Map(container, {
        center: new kakao.maps.LatLng(${spot.latitude}, ${spot.longitude}),
        level: 3
      });
      
      map.addControl(new kakao.maps.ZoomControl(), kakao.maps.ControlPosition.RIGHT);
      
      // 산책로 마커
      var markerEl = document.createElement('div');
      markerEl.className = 'spot-marker';
      markerEl.textContent = '${spot.emoji}';
      
      var markerOverlay = new kakao.maps.CustomOverlay({
        position: new kakao.maps.LatLng(${spot.latitude}, ${spot.longitude}),
        content: markerEl,
        map: map,
        yAnchor: 0.5
      });
      
      // 인포윈도우
      var infoContent = '<div class="spot-info">' +
        '<div class="name">${spot.emoji} ${spot.name}</div>' +
        '<div class="loc">📍 ${spot.district} ${spot.dong}</div>' +
        '<div class="tags">' +
        ${spot.features.map(f => `'<span class="tag">${f}</span>' +`).join('\n        ')}
        '</div></div>';
      
      var infoWindow = new kakao.maps.InfoWindow({
        content: infoContent,
        removable: true
      });
      
      var marker = new kakao.maps.Marker({
        position: new kakao.maps.LatLng(${spot.latitude}, ${spot.longitude}),
        map: null
      });
      
      markerEl.addEventListener('click', function() {
        infoWindow.open(map, marker);
      });
      
      // 초기에 인포윈도우 열기
      setTimeout(function() {
        infoWindow.open(map, marker);
      }, 500);
      
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ready' }));
      }
    });
  </script>
</body>
</html>`;
}

export default function TrailDetailScreen() {
  const router = useRouter();
  const { spotId } = useLocalSearchParams<{ spotId: string }>();
  const webViewRef = useRef<WebView>(null);
  const [apiKey, setApiKey] = useState("");
  const [mapReady, setMapReady] = useState(false);

  // 산책로 데이터 찾기
  const spot = useMemo(() => {
    return DAEJEON_WALK_SPOTS.find((s) => s.id === spotId) || DAEJEON_WALK_SPOTS[0];
  }, [spotId]);

  // 리뷰 데이터
  const reviews = useMemo(() => {
    return REVIEWS_MAP[spot.id] || DEFAULT_REVIEWS;
  }, [spot.id]);

  // 사진 이모지
  const photos = useMemo(() => {
    return PHOTO_EMOJIS[spot.imageTag] || ["📷", "🌳", "🐾", "🌿", "☀️", "🏞️"];
  }, [spot.imageTag]);

  // 평균 평점 계산
  const avgRating = useMemo(() => {
    const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
    return (sum / reviews.length).toFixed(1);
  }, [reviews]);

  // API 키 가져오기
  useEffect(() => {
    let cancelled = false;
    const fetchKey = async () => {
      try {
        const base = getApiBaseUrl();
        const res = await fetch(`${base}/api/kakao-map-key`);
        const data = await res.json();
        if (!cancelled && data.apiKey) setApiKey(data.apiKey);
      } catch {
        // 폴백: 환경변수에서 직접 로드 시도
        if (!cancelled) {
          setTimeout(() => {
            if (!cancelled) setApiKey("bacaa8f1d9ab392f51dce2e886e5e15b");
          }, 2000);
        }
      }
    };
    fetchKey();
    return () => { cancelled = true; };
  }, []);

  // 난이도 색상
  const difficultyColor = spot.difficulty === "쉬움" ? "#4CAF82" : spot.difficulty === "보통" ? "#F59E0B" : "#EF4444";

  return (
    <ScreenContainer edges={["top", "left", "right"]}>
      {/* 헤더 */}
      <View style={st.header}>
        <Pressable
          onPress={() => { haptic(); router.back(); }}
          style={({ pressed }) => [st.backBtn, pressed && { opacity: 0.7 }]}
        >
          <Text style={st.backBtnText}>‹</Text>
        </Pressable>
        <Text style={st.headerTitle} numberOfLines={1}>{spot.name}</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* 히어로 섹션 */}
        <View style={st.hero}>
          <View style={st.heroEmojiWrap}>
            <Text style={{ fontSize: 64 }}>{spot.emoji}</Text>
          </View>
          <Text style={st.heroName}>{spot.name}</Text>
          <Text style={st.heroLocation}>📍 {spot.district} {spot.dong}</Text>
          <View style={st.heroRating}>
            <StarRating rating={spot.rating} size={18} />
            <Text style={st.heroRatingText}>{spot.rating}</Text>
            <Text style={st.heroReviewCount}>리뷰 {reviews.length}개</Text>
          </View>
        </View>

        {/* 코스 정보 카드 */}
        <View style={st.section}>
          <Text style={st.sectionTitle}>코스 정보</Text>
          <View style={st.infoGrid}>
            <View style={st.infoItem}>
              <Text style={st.infoEmoji}>🏃</Text>
              <Text style={st.infoLabel}>난이도</Text>
              <View style={[st.difficultyBadge, { backgroundColor: difficultyColor + "20" }]}>
                <Text style={[st.difficultyText, { color: difficultyColor }]}>{spot.difficulty}</Text>
              </View>
            </View>
            <View style={st.infoDivider} />
            <View style={st.infoItem}>
              <Text style={st.infoEmoji}>⏱️</Text>
              <Text style={st.infoLabel}>소요시간</Text>
              <Text style={st.infoValue}>{spot.walkTime}</Text>
            </View>
            <View style={st.infoDivider} />
            <View style={st.infoItem}>
              <Text style={st.infoEmoji}>⭐</Text>
              <Text style={st.infoLabel}>평점</Text>
              <Text style={st.infoValue}>{spot.rating}</Text>
            </View>
          </View>
        </View>

        {/* 특징 태그 */}
        <View style={st.section}>
          <Text style={st.sectionTitle}>특징</Text>
          <View style={st.tagsWrap}>
            {spot.features.map((f) => (
              <View key={f} style={st.featureTag}>
                <Text style={st.featureTagText}>{f}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* 반려견 안내 */}
        <View style={st.section}>
          <Text style={st.sectionTitle}>🐾 반려견 안내</Text>
          <View style={st.petInfoCard}>
            <Text style={st.petInfoText}>{spot.petFriendly}</Text>
          </View>
        </View>

        {/* 소개 */}
        <View style={st.section}>
          <Text style={st.sectionTitle}>소개</Text>
          <Text style={st.descText}>{spot.description}</Text>
        </View>

        {/* 카카오맵 위치 */}
        <View style={st.section}>
          <Text style={st.sectionTitle}>📍 위치</Text>
          <View style={st.mapContainer}>
            {apiKey ? (
              <WebView
                ref={webViewRef}
                source={{ html: generateTrailMapHTML(apiKey, spot) }}
                style={{ flex: 1, minHeight: 250 }}
                originWhitelist={["*"]}
                javaScriptEnabled
                domStorageEnabled
                mixedContentMode="always"
                allowFileAccess
                allowUniversalAccessFromFileURLs
                scrollEnabled={false}
                onMessage={(event) => {
                  try {
                    const data = JSON.parse(event.nativeEvent.data);
                    if (data.type === "ready") setMapReady(true);
                  } catch {}
                }}
                onError={(e) => console.error("TrailMap WebView Error:", e.nativeEvent)}
              />
            ) : (
              <View style={st.mapLoading}>
                <ActivityIndicator size="small" color="#2E7D32" />
                <Text style={st.mapLoadingText}>지도를 불러오는 중...</Text>
              </View>
            )}
          </View>
        </View>

        {/* 사진 갤러리 */}
        <View style={st.section}>
          <Text style={st.sectionTitle}>📸 사진</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 10 }}
          >
            {photos.map((emoji, i) => (
              <View key={i} style={st.photoCard}>
                <Text style={{ fontSize: 40 }}>{emoji}</Text>
                <Text style={st.photoLabel}>
                  {spot.name.slice(0, 4)}...
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* 리뷰 섹션 */}
        <View style={st.section}>
          <View style={st.reviewHeader}>
            <Text style={st.sectionTitle}>리뷰</Text>
            <View style={st.reviewSummary}>
              <Text style={st.reviewAvg}>{avgRating}</Text>
              <StarRating rating={Number(avgRating)} size={14} />
              <Text style={st.reviewCount}>({reviews.length})</Text>
            </View>
          </View>
          {reviews.map((review) => (
            <View key={review.id} style={st.reviewCard}>
              <View style={st.reviewTop}>
                <View style={st.reviewUser}>
                  <Text style={{ fontSize: 24 }}>{review.userEmoji}</Text>
                  <View>
                    <Text style={st.reviewUserName}>{review.userName}</Text>
                    <Text style={st.reviewPetInfo}>{review.petInfo}</Text>
                  </View>
                </View>
                <Text style={st.reviewDate}>{review.date}</Text>
              </View>
              <View style={{ marginVertical: 6 }}>
                <StarRating rating={review.rating} size={12} />
              </View>
              <Text style={st.reviewContent}>{review.content}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* 하단 고정 버튼 */}
      <View style={st.bottomBar}>
        <Pressable
          onPress={() => {
            haptic();
            router.push("/(tabs)/map" as never);
          }}
          style={({ pressed }) => [st.bottomBtn, pressed && { opacity: 0.9, transform: [{ scale: 0.97 }] }]}
        >
          <Text style={st.bottomBtnText}>🗺️ 근처 돌보미 찾기</Text>
        </Pressable>
      </View>
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
    borderBottomWidth: 0.5,
    borderBottomColor: "#E5E7EB",
  },
  backBtn: {
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
  },
  backBtnText: {
    fontSize: 28,
    fontFamily: Fonts.medium,
    color: "#2E7D32",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 17,
    fontFamily: Fonts.semiBold,
    color: "#1A1A1A",
  },
  hero: {
    alignItems: "center",
    paddingVertical: 28,
    paddingHorizontal: 20,
    backgroundColor: "#F0FFF0",
  },
  heroEmojiWrap: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  heroName: {
    fontSize: 24,
    fontFamily: Fonts.bold,
    color: "#1A1A1A",
    marginBottom: 6,
    textAlign: "center",
  },
  heroLocation: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: "#8E8E93",
    marginBottom: 12,
  },
  heroRating: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  heroRatingText: {
    fontSize: 16,
    fontFamily: Fonts.bold,
    color: "#F59E0B",
  },
  heroReviewCount: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    color: "#8E8E93",
  },
  section: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: Fonts.bold,
    color: "#1A1A1A",
    marginBottom: 14,
  },
  infoGrid: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  infoItem: {
    flex: 1,
    alignItems: "center",
    gap: 6,
  },
  infoDivider: {
    width: 1,
    backgroundColor: "#E5E7EB",
    marginHorizontal: 8,
  },
  infoEmoji: {
    fontSize: 22,
  },
  infoLabel: {
    fontSize: 12,
    fontFamily: Fonts.regular,
    color: "#8E8E93",
  },
  infoValue: {
    fontSize: 16,
    fontFamily: Fonts.bold,
    color: "#1A1A1A",
  },
  difficultyBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  difficultyText: {
    fontSize: 14,
    fontFamily: Fonts.semiBold,
  },
  tagsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  featureTag: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "#E8F5E9",
  },
  featureTagText: {
    fontSize: 13,
    fontFamily: Fonts.medium,
    color: "#2E7D32",
  },
  petInfoCard: {
    backgroundColor: "#FFF8E1",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#FFE082",
  },
  petInfoText: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: "#5D4037",
    lineHeight: 22,
  },
  descText: {
    fontSize: 15,
    fontFamily: Fonts.regular,
    color: "#3C3C43",
    lineHeight: 24,
  },
  mapContainer: {
    height: 250,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "#2E7D32",
  },
  mapLoading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F5F5F5",
  },
  mapLoadingText: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    color: "#8E8E93",
  },
  photoCard: {
    width: 100,
    height: 100,
    borderRadius: 14,
    backgroundColor: "#F0FFF0",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#C8E6C9",
    gap: 4,
  },
  photoLabel: {
    fontSize: 10,
    fontFamily: Fonts.medium,
    color: "#8E8E93",
  },
  reviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  reviewSummary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  reviewAvg: {
    fontSize: 18,
    fontFamily: Fonts.bold,
    color: "#F59E0B",
  },
  reviewCount: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    color: "#8E8E93",
  },
  reviewCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  reviewTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  reviewUser: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  reviewUserName: {
    fontSize: 14,
    fontFamily: Fonts.semiBold,
    color: "#1A1A1A",
  },
  reviewPetInfo: {
    fontSize: 11,
    fontFamily: Fonts.regular,
    color: "#8E8E93",
    marginTop: 1,
  },
  reviewDate: {
    fontSize: 12,
    fontFamily: Fonts.regular,
    color: "#C7C7CC",
  },
  reviewContent: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: "#3C3C43",
    lineHeight: 22,
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingVertical: 12,
    paddingBottom: 28,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 0.5,
    borderTopColor: "#E5E7EB",
  },
  bottomBtn: {
    backgroundColor: "#2E7D32",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  bottomBtnText: {
    fontSize: 16,
    fontFamily: Fonts.bold,
    color: "#FFFFFF",
  },
});
