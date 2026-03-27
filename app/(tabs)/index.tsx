import { useState, useMemo } from "react";
import {
  ScrollView,
  View,
  Text,
  Pressable,
  StyleSheet,
  FlatList,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useApp } from "@/lib/app-context";
import { MOCK_CARETAKERS, MOCK_REQUESTS, SERVICE_TYPES } from "@/lib/mock-data";
import {
  DAEJEON_WALK_SPOTS,
  getTodayRecommendedSpot,
  getSpotsByDistrict,
  getWalkersNearSpot,
  getDistrictFromNeighborhood,
  type WalkSpot,
} from "@/lib/daejeon-spots";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";
import { Fonts } from "@/hooks/use-fonts";

function haptic() {
  if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

const DISTRICTS = ["전체", "서구", "유성구", "중구", "동구", "대덕구"] as const;

// ─── 구 필터 탭 컴포넌트 ───
function DistrictTabs({
  selected,
  onSelect,
}: {
  selected: string;
  onSelect: (d: string) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 20, gap: 8, paddingVertical: 10 }}
    >
      {DISTRICTS.map((d) => {
        const isActive = selected === d;
        return (
          <Pressable
            key={d}
            onPress={() => {
              haptic();
              onSelect(d);
            }}
            style={[s.districtTab, isActive && s.districtTabActive]}
          >
            <Text style={[s.districtTabText, isActive && s.districtTabTextActive]}>
              {d}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

// ─── 오늘의 추천 산책로 카드 ───
function RecommendedSpotCard({
  spot,
  nearbyWalkers,
  onPress,
}: {
  spot: WalkSpot;
  nearbyWalkers: typeof MOCK_CARETAKERS;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [s.spotCard, pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] }]}
    >
      {/* 상단 배경 그라데이션 효과 */}
      <View style={s.spotCardHeader}>
        <View style={s.spotEmojiWrap}>
          <Text style={{ fontSize: 36 }}>{spot.emoji}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
            <Text style={s.spotBadge}>오늘의 추천</Text>
          </View>
          <Text style={s.spotName}>{spot.name}</Text>
          <Text style={s.spotLocation}>
            📍 {spot.district} {spot.dong}
          </Text>
        </View>
      </View>

      {/* 산책로 정보 */}
      <View style={s.spotInfoRow}>
        <View style={s.spotInfoItem}>
          <Text style={s.spotInfoLabel}>난이도</Text>
          <Text style={s.spotInfoValue}>{spot.difficulty}</Text>
        </View>
        <View style={s.spotInfoDivider} />
        <View style={s.spotInfoItem}>
          <Text style={s.spotInfoLabel}>소요시간</Text>
          <Text style={s.spotInfoValue}>{spot.walkTime}</Text>
        </View>
        <View style={s.spotInfoDivider} />
        <View style={s.spotInfoItem}>
          <Text style={s.spotInfoLabel}>평점</Text>
          <Text style={s.spotInfoValue}>⭐ {spot.rating}</Text>
        </View>
      </View>

      {/* 특징 태그 */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 6, paddingTop: 8 }}
      >
        {spot.features.slice(0, 4).map((f) => (
          <View key={f} style={s.featureTag}>
            <Text style={s.featureTagText}>{f}</Text>
          </View>
        ))}
      </ScrollView>

      {/* 근처 활동 워커 */}
      {nearbyWalkers.length > 0 && (
        <View style={s.spotWalkers}>
          <Text style={s.spotWalkersLabel}>
            이 근처 활동 중인 돌보미 {nearbyWalkers.length}명
          </Text>
          <View style={{ flexDirection: "row", gap: -4 }}>
            {nearbyWalkers.slice(0, 4).map((w, i) => (
              <View
                key={w.id}
                style={[
                  s.miniAvatar,
                  { marginLeft: i > 0 ? -6 : 0, zIndex: 10 - i },
                ]}
              >
                <Text style={{ fontSize: 14 }}>{w.profileEmoji}</Text>
              </View>
            ))}
            {nearbyWalkers.length > 4 && (
              <View style={[s.miniAvatar, { marginLeft: -6, backgroundColor: "#FFE0D0" }]}>
                <Text style={{ fontSize: 9, color: "#2E7D32", fontFamily: Fonts.bold }}>
                  +{nearbyWalkers.length - 4}
                </Text>
              </View>
            )}
          </View>
        </View>
      )}
    </Pressable>
  );
}

// ─── 워커 카드 (리디자인) ───
function WalkerCard({
  item,
  onPress,
}: {
  item: (typeof MOCK_CARETAKERS)[0];
  onPress: () => void;
}) {
  const district = item.district || getDistrictFromNeighborhood(item.neighborhood);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [s.walkerCard, pressed && { opacity: 0.85 }]}
    >
      <View style={s.walkerCardTop}>
        <View style={s.walkerAvatar}>
          <Text style={{ fontSize: 28 }}>{item.profileEmoji}</Text>
          {item.isActive && <View style={s.onlineDot} />}
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <Text style={s.walkerName}>{item.nickname}</Text>
            {item.specialBadge && (
              <View style={s.expertBadge}>
                <Text style={s.expertBadgeText}>{item.specialBadge}</Text>
              </View>
            )}
            {item.isVerified && !item.specialBadge && (
              <View style={s.verifiedBadge}>
                <Text style={s.verifiedText}>✓ 인증</Text>
              </View>
            )}
          </View>
          <Text style={s.walkerBio} numberOfLines={1}>
            {item.bio}
          </Text>
        </View>
      </View>

      {/* 가격 + 동네 + 평점 */}
      <View style={s.walkerMetaRow}>
        <View style={s.walkerMetaItem}>
          <Text style={s.walkerMetaLabel}>시간당</Text>
          <Text style={s.walkerMetaValue}>
            {item.pricePerHour
              ? `₩${item.pricePerHour.toLocaleString()}`
              : "문의"}
          </Text>
        </View>
        <View style={s.walkerMetaDivider} />
        <View style={s.walkerMetaItem}>
          <Text style={s.walkerMetaLabel}>활동 지역</Text>
          <Text style={s.walkerMetaValue}>
            {district} {item.neighborhood}
          </Text>
        </View>
        <View style={s.walkerMetaDivider} />
        <View style={s.walkerMetaItem}>
          <Text style={s.walkerMetaLabel}>평점</Text>
          <Text style={s.walkerMetaValue}>⭐ {item.rating}</Text>
        </View>
      </View>

      {/* 서비스 태그 + 뱃지 */}
      <View style={s.walkerTags}>
        {item.hasTrainerCert && (
          <View style={s.trainerBadge}>
            <Text style={s.trainerText}>훈련사</Text>
          </View>
        )}
        {item.canHandleLargeDogs && (
          <View style={s.largeDogTag}>
            <Text style={s.largeDogTagText}>대형견 OK</Text>
          </View>
        )}
        {item.responseTime && (
          <View style={s.responseTag}>
            <Text style={s.responseTagText}>⚡ {item.responseTime}</Text>
          </View>
        )}
        <View style={s.reviewTag}>
          <Text style={s.reviewTagText}>후기 {item.reviewCount}건</Text>
        </View>
      </View>
    </Pressable>
  );
}

// ─── 반려인(보호자) 홈 ───
function OwnerHome() {
  const { state } = useApp();
  const router = useRouter();
  const [selectedDistrict, setSelectedDistrict] = useState<string>("전체");

  const todaySpot = useMemo(() => getTodayRecommendedSpot(), []);

  // 선택한 구에 해당하는 산책 명소
  const districtSpots = useMemo(() => {
    if (selectedDistrict === "전체") return DAEJEON_WALK_SPOTS.slice(0, 3);
    return getSpotsByDistrict(selectedDistrict).slice(0, 3);
  }, [selectedDistrict]);

  // 선택한 구에 해당하는 워커 필터링
  const filteredWalkers = useMemo(() => {
    if (selectedDistrict === "전체") {
      return MOCK_CARETAKERS.filter((c) => c.isActive);
    }
    return MOCK_CARETAKERS.filter((c) => {
      const d = c.district || getDistrictFromNeighborhood(c.neighborhood);
      return d === selectedDistrict && c.isActive;
    });
  }, [selectedDistrict]);

  // 추천 산책로 근처 워커
  const nearbyWalkers = useMemo(() => {
    return getWalkersNearSpot(todaySpot.district, MOCK_CARETAKERS).filter(
      (w) => w.isActive
    );
  }, [todaySpot]);

  const services = SERVICE_TYPES.owner;

  const handleServicePress = (serviceId: string) => {
    haptic();
    switch (serviceId) {
      case "walk_partner":
        router.push({ pathname: "/(tabs)/explore", params: { tab: "walk_partner" } } as never);
        break;
      case "find_caretaker":
        router.push({ pathname: "/(tabs)/explore", params: { tab: "find_caretaker" } } as never);
        break;
      case "walk_request":
        router.push("/request/new" as never);
        break;
      case "short_care":
        router.push({ pathname: "/(tabs)/explore", params: { tab: "short_care" } } as never);
        break;
      default:
        router.push({ pathname: "/(tabs)/explore", params: { tab: serviceId } } as never);
    }
  };

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
      {/* 헤더 */}
      <View style={s.header}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 2 }}>
            <Text style={s.headerGreeting}>안녕하세요,</Text>
            <View style={s.daejeonBadge}>
              <Text style={s.daejeonBadgeText}>Daejeon Only</Text>
            </View>
          </View>
          <Text style={s.headerName}>{state.profile.nickname || "반려인"}님</Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Pressable
            onPress={() => {
              haptic();
              router.push("/notifications" as never);
            }}
            style={({ pressed }) => [s.iconBtn, pressed && { opacity: 0.7 }]}
          >
            <Text style={{ fontSize: 18 }}>🔔</Text>
            {(state.notifications || []).filter((n: any) => !n.isRead).length > 0 && (
              <View style={s.notifDot} />
            )}
          </Pressable>
          <Pressable
            onPress={() => {
              haptic();
              router.push("/(tabs)/profile" as never);
            }}
            style={({ pressed }) => [s.avatarBtn, pressed && { opacity: 0.7 }]}
          >
            <Text style={{ fontSize: 20 }}>{state.profile.avatarEmoji || "😊"}</Text>
          </Pressable>
        </View>
      </View>

      {/* 위치 배너 */}
      <View style={s.locationBar}>
        <Text style={s.locationIcon}>📍</Text>
        <Text style={s.locationText}>
          {state.profile.neighborhood || "동네 미설정"} · 대전광역시
        </Text>
      </View>

      {/* 구 필터 탭 */}
      <DistrictTabs selected={selectedDistrict} onSelect={setSelectedDistrict} />

      {/* 오늘의 추천 산책로 */}
      <View style={s.section}>
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>오늘의 추천 산책로</Text>
          <Pressable
            onPress={() => {
              haptic();
              router.push("/(tabs)/map" as never);
            }}
          >
            <Text style={s.seeAll}>전체보기</Text>
          </Pressable>
        </View>
        <RecommendedSpotCard
          spot={todaySpot}
          nearbyWalkers={nearbyWalkers}
          onPress={() => {
            haptic();
            router.push("/(tabs)/map" as never);
          }}
        />

        {/* 구별 추가 산책 명소 */}
        {districtSpots.length > 0 && districtSpots[0].id !== todaySpot.id && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 10, marginTop: 12 }}
          >
            {districtSpots
              .filter((sp) => sp.id !== todaySpot.id)
              .slice(0, 3)
              .map((sp) => (
                <Pressable
                  key={sp.id}
                  onPress={() => {
                    haptic();
                    router.push("/(tabs)/map" as never);
                  }}
                  style={({ pressed }) => [s.miniSpotCard, pressed && { opacity: 0.85 }]}
                >
                  <Text style={{ fontSize: 24 }}>{sp.emoji}</Text>
                  <Text style={s.miniSpotName} numberOfLines={1}>
                    {sp.name}
                  </Text>
                  <Text style={s.miniSpotInfo}>
                    ⭐ {sp.rating} · {sp.walkTime}
                  </Text>
                </Pressable>
              ))}
          </ScrollView>
        )}
      </View>

      {/* 서비스 그리드 */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>서비스</Text>
        <View style={s.serviceGrid}>
          {services.map((svc) => (
            <Pressable
              key={svc.id}
              onPress={() => handleServicePress(svc.id)}
              style={({ pressed }) => [
                s.serviceCard,
                pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
              ]}
            >
              <View style={[s.serviceIconWrap, { backgroundColor: svc.color + "15" }]}>
                <Text style={s.serviceEmoji}>{svc.emoji}</Text>
              </View>
              <Text style={s.serviceName}>{svc.title}</Text>
              <Text style={s.serviceDesc}>{svc.description}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* 산책 기록 배너 */}
      {(state.walkSessions || []).length > 0 && (
        <View style={s.section}>
          <Pressable
            onPress={() => {
              haptic();
              router.push("/walk/history" as never);
            }}
            style={({ pressed }) => [s.bannerCard, s.bannerWalk, pressed && { opacity: 0.85 }]}
          >
            <View style={s.bannerIconWrap}>
              <Text style={{ fontSize: 24 }}>🐾</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.bannerTitle}>산책 기록 확인</Text>
              <Text style={s.bannerSub}>돌보미의 산책 기록을 확인해보세요</Text>
            </View>
            <Text style={{ fontSize: 16, color: "#2E7D32" }}>›</Text>
          </Pressable>
        </View>
      )}

      {/* 추천 돌보미 (구 필터 적용) */}
      <View style={s.section}>
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>
            {selectedDistrict === "전체"
              ? "추천 돌보미"
              : `${selectedDistrict} 돌보미`}
          </Text>
          <Pressable
            onPress={() => {
              haptic();
              router.push("/(tabs)/explore" as never);
            }}
          >
            <Text style={s.seeAll}>더보기</Text>
          </Pressable>
        </View>

        {filteredWalkers.length === 0 ? (
          <View style={s.emptyCard}>
            <Text style={{ fontSize: 32 }}>🔍</Text>
            <Text style={s.emptyText}>
              {selectedDistrict}에 활동 중인 돌보미가 없어요
            </Text>
            <Text style={s.emptySubText}>다른 지역을 선택해보세요</Text>
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            {filteredWalkers.slice(0, 5).map((item) => (
              <WalkerCard
                key={item.id}
                item={item}
                onPress={() => {
                  haptic();
                  router.push(`/profile/${item.id}` as never);
                }}
              />
            ))}
          </View>
        )}
      </View>

      {/* 근처 요청 */}
      <View style={s.section}>
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>근처 돌봄 요청</Text>
          <Pressable
            onPress={() => {
              haptic();
              router.push("/(tabs)/requests" as never);
            }}
          >
            <Text style={s.seeAll}>더보기</Text>
          </Pressable>
        </View>
        <View style={{ gap: 10 }}>
          {MOCK_REQUESTS.slice(0, 3).map((req) => (
            <Pressable
              key={req.id}
              onPress={() => {
                haptic();
                router.push(`/request/${req.id}` as never);
              }}
              style={({ pressed }) => [s.requestCard, pressed && { opacity: 0.85 }]}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <View style={s.requestEmoji}>
                  <Text style={{ fontSize: 24 }}>{req.petEmoji}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Text style={s.requestTitle} numberOfLines={1}>
                      {req.title}
                    </Text>
                    {req.isUrgent && (
                      <View style={s.urgentBadge}>
                        <Text style={s.urgentText}>긴급</Text>
                      </View>
                    )}
                  </View>
                  <Text style={s.requestMeta}>
                    {req.requester} · 📍 {req.neighborhood} · {req.date} {req.time}
                  </Text>
                </View>
              </View>
            </Pressable>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

// ─── 돌보미(워커) 홈 ───
function CaretakerHome() {
  const { state, dispatch } = useApp();
  const router = useRouter();
  const [handledRequests, setHandledRequests] = useState<Record<string, "accepted" | "rejected">>({});
  const [selectedDistrict, setSelectedDistrict] = useState<string>("전체");

  const todaySpot = useMemo(() => getTodayRecommendedSpot(), []);

  const handleAcceptRequest = (reqId: string, reqTitle: string, requesterName: string) => {
    haptic();
    setHandledRequests((prev) => ({ ...prev, [String(reqId)]: "accepted" }));
    dispatch({
      type: "ADD_NOTIFICATION",
      payload: {
        id: `notif_accept_${Date.now()}`,
        type: "match",
        title: "요청 수락 완료",
        body: `"${reqTitle}" 요청을 수락했습니다.`,
        relatedId: String(reqId),
        fromNickname: requesterName,
        isRead: false,
        createdAt: new Date().toISOString(),
      },
    });
    const chatRoomId = `request_${reqId}`;
    dispatch({
      type: "ADD_CHAT_MESSAGE",
      payload: {
        roomId: `room_${chatRoomId}`,
        message: {
          id: `sys_${Date.now()}`,
          senderId: 0,
          senderName: "시스템",
          content: `요청이 수락되었습니다. ${requesterName}님과 대화를 시작해보세요!`,
          type: "text",
          createdAt: new Date().toISOString(),
        },
      },
    });
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleRejectRequest = (reqId: string, reqTitle: string) => {
    haptic();
    setHandledRequests((prev) => ({ ...prev, [String(reqId)]: "rejected" }));
    dispatch({
      type: "ADD_NOTIFICATION",
      payload: {
        id: `notif_reject_${Date.now()}`,
        type: "match",
        title: "요청 거절",
        body: `"${reqTitle}" 요청을 거절했습니다.`,
        relatedId: String(reqId),
        isRead: false,
        createdAt: new Date().toISOString(),
      },
    });
  };

  const completedWalks = (state.walkSessions || []).filter((ws) => ws.status === "completed").length;

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
      {/* 헤더 */}
      <View style={s.header}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 2 }}>
            <Text style={s.headerGreeting}>안녕하세요,</Text>
            <View style={s.daejeonBadge}>
              <Text style={s.daejeonBadgeText}>Daejeon Only</Text>
            </View>
          </View>
          <Text style={s.headerName}>{state.profile.nickname || "돌보미"}님</Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Pressable
            onPress={() => {
              haptic();
              router.push("/notifications" as never);
            }}
            style={({ pressed }) => [s.iconBtn, pressed && { opacity: 0.7 }]}
          >
            <Text style={{ fontSize: 18 }}>🔔</Text>
            {(state.notifications || []).filter((n: any) => !n.isRead).length > 0 && (
              <View style={s.notifDot} />
            )}
          </Pressable>
          <Pressable
            onPress={() => {
              haptic();
              router.push("/(tabs)/profile" as never);
            }}
            style={({ pressed }) => [s.avatarBtn, pressed && { opacity: 0.7 }]}
          >
            <Text style={{ fontSize: 20 }}>{state.profile.avatarEmoji || "😊"}</Text>
          </Pressable>
        </View>
      </View>

      {/* 활동 상태 카드 */}
      <View style={s.section}>
        <View style={[s.statusCard, state.profile.isOnline ? s.statusOnline : s.statusOffline]}>
          <View style={{ flex: 1 }}>
            <Text style={s.statusLabel}>현재 상태</Text>
            <Text style={[s.statusValue, { color: state.profile.isOnline ? "#34C759" : "#FF3B30" }]}>
              {state.profile.isOnline ? "● 활동 중" : "● 오프라인"}
            </Text>
            {!state.profile.isOnline && <Text style={s.statusHint}>새 요청을 받지 않습니다</Text>}
          </View>
          <Pressable
            onPress={() => {
              haptic();
              dispatch({ type: "TOGGLE_ONLINE" });
              if (Platform.OS !== "web") {
                Haptics.notificationAsync(
                  state.profile.isOnline
                    ? Haptics.NotificationFeedbackType.Warning
                    : Haptics.NotificationFeedbackType.Success
                );
              }
            }}
            style={({ pressed }) => [
              s.statusToggleBtn,
              state.profile.isOnline ? s.toggleOff : s.toggleOn,
              pressed && { opacity: 0.8 },
            ]}
          >
            <Text style={[s.toggleText, state.profile.isOnline ? { color: "#FF3B30" } : { color: "#34C759" }]}>
              {state.profile.isOnline ? "비활성화" : "활성화"}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* 통계 요약 */}
      <View style={s.section}>
        <View style={s.statsRow}>
          <View style={s.statCard}>
            <Text style={s.statNumber}>{completedWalks}</Text>
            <Text style={s.statLabel}>완료 산책</Text>
          </View>
          <View style={s.statCard}>
            <Text style={s.statNumber}>{state.profile.rating?.toFixed(1) || "0.0"}</Text>
            <Text style={s.statLabel}>평점</Text>
          </View>
          <View style={s.statCard}>
            <Text style={s.statNumber}>{MOCK_REQUESTS.filter((r) => r.status === "pending").length}</Text>
            <Text style={s.statLabel}>대기 요청</Text>
          </View>
        </View>
      </View>

      {/* 구 필터 탭 */}
      <DistrictTabs selected={selectedDistrict} onSelect={setSelectedDistrict} />

      {/* 오늘의 추천 산책로 (돌보미도 볼 수 있음) */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>오늘의 추천 산책로</Text>
        <Pressable
          onPress={() => {
            haptic();
            router.push("/(tabs)/map" as never);
          }}
          style={({ pressed }) => [s.spotCardMini, pressed && { opacity: 0.85 }]}
        >
          <Text style={{ fontSize: 28 }}>{todaySpot.emoji}</Text>
          <View style={{ flex: 1 }}>
            <Text style={s.spotCardMiniName}>{todaySpot.name}</Text>
            <Text style={s.spotCardMiniInfo}>
              📍 {todaySpot.district} · ⭐ {todaySpot.rating} · {todaySpot.walkTime}
            </Text>
          </View>
          <Text style={{ fontSize: 16, color: "#2E7D32" }}>›</Text>
        </Pressable>
      </View>

      {/* 제공 서비스 */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>제공 서비스</Text>
        <View style={{ flexDirection: "row", gap: 10 }}>
          {SERVICE_TYPES.caretaker.map((svc) => (
            <Pressable
              key={svc.id}
              onPress={() => {
                haptic();
                router.push({ pathname: "/(tabs)/explore", params: { tab: svc.id } } as never);
              }}
              style={({ pressed }) => [
                s.serviceCardSmall,
                { borderColor: svc.color + "30" },
                pressed && { opacity: 0.85 },
              ]}
            >
              <Text style={{ fontSize: 24 }}>{svc.emoji}</Text>
              <Text style={s.serviceNameSmall}>{svc.title}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* 산책 기록 + 대시보드 */}
      <View style={s.section}>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <Pressable
            onPress={() => {
              haptic();
              router.push("/walk/history" as never);
            }}
            style={({ pressed }) => [s.bannerCard, s.bannerWalk, { flex: 1 }, pressed && { opacity: 0.85 }]}
          >
            <Text style={{ fontSize: 20 }}>🐾</Text>
            <Text style={[s.bannerTitle, { fontSize: 13 }]}>산책 기록</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              haptic();
              router.push("/dashboard" as never);
            }}
            style={({ pressed }) => [
              s.bannerCard,
              { flex: 1, backgroundColor: "#F0F5FF", borderColor: "#D0E0FF" },
              pressed && { opacity: 0.85 },
            ]}
          >
            <Text style={{ fontSize: 20 }}>📊</Text>
            <Text style={[s.bannerTitle, { fontSize: 13, color: "#3478F6" }]}>대시보드</Text>
          </Pressable>
        </View>
      </View>

      {/* 새 요청 */}
      <View style={s.section}>
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>새 요청</Text>
          <Pressable
            onPress={() => {
              haptic();
              router.push("/(tabs)/requests" as never);
            }}
          >
            <Text style={s.seeAll}>더보기</Text>
          </Pressable>
        </View>
        <View style={{ gap: 10 }}>
          {MOCK_REQUESTS.slice(0, 3).map((req) => (
            <View key={req.id} style={s.requestCard}>
              <Pressable
                onPress={() => {
                  haptic();
                  router.push(`/request/${req.id}` as never);
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 10 }}>
                  <View style={s.requestEmoji}>
                    <Text style={{ fontSize: 24 }}>{req.petEmoji}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <Text style={s.requestTitle} numberOfLines={1}>
                        {req.title}
                      </Text>
                      {req.isUrgent && (
                        <View style={s.urgentBadge}>
                          <Text style={s.urgentText}>긴급</Text>
                        </View>
                      )}
                    </View>
                    <Text style={s.requestMeta}>
                      {req.requester} · {req.neighborhood} · {req.date} {req.time}
                    </Text>
                  </View>
                </View>
              </Pressable>
              <View style={s.requestActions}>
                {handledRequests[String(req.id)] ? (
                  <View
                    style={[
                      s.actionBadge,
                      handledRequests[String(req.id)] === "accepted" ? s.acceptedBadge : s.rejectedBadge,
                    ]}
                  >
                    <Text
                      style={[
                        s.actionBadgeText,
                        handledRequests[String(req.id)] === "accepted" ? { color: "#34C759" } : { color: "#FF3B30" },
                      ]}
                    >
                      {handledRequests[String(req.id)] === "accepted" ? "✓ 수락됨" : "✕ 거절됨"}
                    </Text>
                  </View>
                ) : (
                  <>
                    <Pressable
                      onPress={() => handleRejectRequest(req.id, req.title)}
                      style={({ pressed }) => [s.rejectBtn, pressed && { opacity: 0.7 }]}
                    >
                      <Text style={s.rejectBtnText}>거절</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => handleAcceptRequest(req.id, req.title, req.requester)}
                      style={({ pressed }) => [s.acceptBtn, pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] }]}
                    >
                      <Text style={s.acceptBtnText}>수락</Text>
                    </Pressable>
                  </>
                )}
              </View>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

export default function HomeScreen() {
  const { state } = useApp();
  const isOwner = state.profile.role === "owner";

  return (
    <ScreenContainer className="bg-background">
      {isOwner ? <OwnerHome /> : <CaretakerHome />}
    </ScreenContainer>
  );
}

const s = StyleSheet.create({
  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 12,
  },
  headerGreeting: {
    fontFamily: Fonts.regular,
    fontSize: 14,
    color: "#8E8E93",
    letterSpacing: -0.2,
  },
  headerName: {
    fontFamily: Fonts.extraBold,
    fontSize: 22,
    color: "#1A1A1A",
    letterSpacing: -0.5,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#F8F8F8",
    alignItems: "center",
    justifyContent: "center",
    position: "relative" as const,
  },
  avatarBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#FFF0EB",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#2E7D32",
  },
  notifDot: {
    position: "absolute" as const,
    top: 4,
    right: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#FF3B30",
    borderWidth: 1.5,
    borderColor: "#F8F8F8",
  },

  // Location
  locationBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 20,
    marginBottom: 4,
  },
  locationIcon: { fontSize: 14 },
  locationText: {
    fontFamily: Fonts.semiBold,
    fontSize: 13,
    color: "#2E7D32",
  },

  // District Tabs
  districtTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F5F5F5",
    borderWidth: 1,
    borderColor: "#E8E8E8",
  },
  districtTabActive: {
    backgroundColor: "#2E7D32",
    borderColor: "#2E7D32",
  },
  districtTabText: {
    fontFamily: Fonts.semiBold,
    fontSize: 13,
    color: "#8E8E93",
  },
  districtTabTextActive: {
    color: "#FFFFFF",
    fontFamily: Fonts.bold,
  },

  // Section
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontFamily: Fonts.bold,
    fontSize: 18,
    color: "#1A1A1A",
    letterSpacing: -0.3,
    marginBottom: 12,
  },
  seeAll: {
    fontFamily: Fonts.semiBold,
    fontSize: 13,
    color: "#2E7D32",
    marginBottom: 12,
  },

  // ─── Recommended Spot Card ───
  spotCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#F0F0F0",
    shadowColor: "#2E7D32",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  spotCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 12,
  },
  spotEmojiWrap: {
    width: 60,
    height: 60,
    borderRadius: 16,
    backgroundColor: "#FFF5F0",
    alignItems: "center",
    justifyContent: "center",
  },
  spotBadge: {
    fontFamily: Fonts.bold,
    fontSize: 10,
    color: "#FFFFFF",
    backgroundColor: "#2E7D32",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    overflow: "hidden",
  },
  spotName: {
    fontFamily: Fonts.extraBold,
    fontSize: 18,
    color: "#1A1A1A",
    letterSpacing: -0.3,
  },
  spotLocation: {
    fontFamily: Fonts.medium,
    fontSize: 12,
    color: "#8E8E93",
    marginTop: 2,
  },
  spotInfoRow: {
    flexDirection: "row",
    backgroundColor: "#FAFAFA",
    borderRadius: 12,
    padding: 10,
  },
  spotInfoItem: {
    flex: 1,
    alignItems: "center",
  },
  spotInfoDivider: {
    width: 1,
    backgroundColor: "#E8E8E8",
    marginVertical: 2,
  },
  spotInfoLabel: {
    fontFamily: Fonts.regular,
    fontSize: 10,
    color: "#8E8E93",
    marginBottom: 2,
  },
  spotInfoValue: {
    fontFamily: Fonts.bold,
    fontSize: 13,
    color: "#1A1A1A",
  },
  featureTag: {
    backgroundColor: "#F0FFF4",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "#C8E6C9",
  },
  featureTagText: {
    fontFamily: Fonts.medium,
    fontSize: 11,
    color: "#2E7D32",
  },
  spotWalkers: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F5F5F5",
  },
  spotWalkersLabel: {
    fontFamily: Fonts.medium,
    fontSize: 12,
    color: "#8E8E93",
  },
  miniAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#FFF0EB",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },

  // Mini Spot Card
  miniSpotCard: {
    width: 120,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#F0F0F0",
    alignItems: "center",
    gap: 6,
  },
  miniSpotName: {
    fontFamily: Fonts.bold,
    fontSize: 12,
    color: "#1A1A1A",
    textAlign: "center",
  },
  miniSpotInfo: {
    fontFamily: Fonts.regular,
    fontSize: 10,
    color: "#8E8E93",
  },

  // Spot Card Mini (Caretaker)
  spotCardMini: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FFF5F0",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#FFD9C7",
  },
  spotCardMiniName: {
    fontFamily: Fonts.bold,
    fontSize: 14,
    color: "#1A1A1A",
  },
  spotCardMiniInfo: {
    fontFamily: Fonts.regular,
    fontSize: 11,
    color: "#8E8E93",
    marginTop: 2,
  },

  // Service Grid
  serviceGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  serviceCard: {
    width: "48%" as any,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#F0F0F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  serviceIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  serviceEmoji: {
    fontSize: 22,
  },
  serviceName: {
    fontFamily: Fonts.bold,
    fontSize: 14,
    color: "#1A1A1A",
    marginBottom: 2,
  },
  serviceDesc: {
    fontFamily: Fonts.regular,
    fontSize: 11,
    color: "#8E8E93",
    lineHeight: 15,
  },
  serviceCardSmall: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#F0F0F0",
  },
  serviceNameSmall: {
    fontFamily: Fonts.bold,
    fontSize: 13,
    color: "#1A1A1A",
  },

  // Banner
  bannerCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
  },
  bannerWalk: {
    backgroundColor: "#FFF5F0",
    borderColor: "#FFD9C7",
  },
  bannerIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#2E7D3215",
    alignItems: "center",
    justifyContent: "center",
  },
  bannerTitle: {
    fontFamily: Fonts.bold,
    fontSize: 14,
    color: "#2E7D32",
  },
  bannerSub: {
    fontFamily: Fonts.regular,
    fontSize: 11,
    color: "#C4724A",
    marginTop: 1,
  },

  // ─── Walker Card (Redesigned) ───
  walkerCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#F0F0F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  walkerCardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  walkerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#FFF0EB",
    alignItems: "center",
    justifyContent: "center",
    position: "relative" as const,
  },
  onlineDot: {
    position: "absolute" as const,
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#34C759",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  walkerName: {
    fontFamily: Fonts.bold,
    fontSize: 15,
    color: "#1A1A1A",
  },
  walkerBio: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    color: "#8E8E93",
    marginTop: 2,
  },
  expertBadge: {
    backgroundColor: "#2E7D32",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  expertBadgeText: {
    fontFamily: Fonts.bold,
    fontSize: 9,
    color: "#FFFFFF",
  },
  verifiedBadge: {
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  verifiedText: {
    fontFamily: Fonts.bold,
    fontSize: 9,
    color: "#2E7D32",
  },
  trainerBadge: {
    backgroundColor: "#FFF3E0",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  trainerText: {
    fontFamily: Fonts.bold,
    fontSize: 10,
    color: "#E65100",
  },

  // Walker Meta Row
  walkerMetaRow: {
    flexDirection: "row",
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F5F5F5",
  },
  walkerMetaItem: {
    flex: 1,
    alignItems: "center",
  },
  walkerMetaDivider: {
    width: 1,
    backgroundColor: "#F0F0F0",
    marginVertical: 2,
  },
  walkerMetaLabel: {
    fontFamily: Fonts.regular,
    fontSize: 10,
    color: "#8E8E93",
    marginBottom: 2,
  },
  walkerMetaValue: {
    fontFamily: Fonts.bold,
    fontSize: 12,
    color: "#1A1A1A",
  },

  // Walker Tags
  walkerTags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 10,
  },
  largeDogTag: {
    backgroundColor: "#E3F2FD",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  largeDogTagText: {
    fontFamily: Fonts.medium,
    fontSize: 10,
    color: "#1976D2",
  },
  responseTag: {
    backgroundColor: "#FFF8E1",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  responseTagText: {
    fontFamily: Fonts.medium,
    fontSize: 10,
    color: "#F57F17",
  },
  reviewTag: {
    backgroundColor: "#F5F5F5",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  reviewTagText: {
    fontFamily: Fonts.medium,
    fontSize: 10,
    color: "#8E8E93",
  },

  // Empty
  emptyCard: {
    alignItems: "center",
    padding: 32,
    backgroundColor: "#FAFAFA",
    borderRadius: 16,
    gap: 8,
  },
  emptyText: {
    fontFamily: Fonts.medium,
    fontSize: 14,
    color: "#8E8E93",
  },
  emptySubText: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    color: "#C0C0C0",
  },

  // Request Card
  requestCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#F0F0F0",
  },
  requestEmoji: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#FFF5F0",
    alignItems: "center",
    justifyContent: "center",
  },
  requestTitle: {
    fontFamily: Fonts.bold,
    fontSize: 14,
    color: "#1A1A1A",
    flex: 1,
  },
  requestMeta: {
    fontFamily: Fonts.regular,
    fontSize: 11,
    color: "#8E8E93",
    marginTop: 3,
  },
  urgentBadge: {
    backgroundColor: "#FF3B30",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  urgentText: {
    fontFamily: Fonts.bold,
    fontSize: 9,
    color: "#FFFFFF",
  },
  requestActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F8F8F8",
  },
  acceptBtn: {
    backgroundColor: "#2E7D32",
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
  },
  acceptBtnText: {
    fontFamily: Fonts.bold,
    color: "#FFFFFF",
    fontSize: 13,
  },
  rejectBtn: {
    backgroundColor: "#F8F8F8",
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
  },
  rejectBtnText: {
    fontFamily: Fonts.semiBold,
    color: "#8E8E93",
    fontSize: 13,
  },
  actionBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  acceptedBadge: {
    backgroundColor: "#F0FFF0",
  },
  rejectedBadge: {
    backgroundColor: "#FFF0F0",
  },
  actionBadgeText: {
    fontFamily: Fonts.bold,
    fontSize: 13,
  },

  // Status Card (Caretaker)
  statusCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  statusOnline: {
    backgroundColor: "#F0FFF0",
    borderColor: "#C8E6C9",
  },
  statusOffline: {
    backgroundColor: "#FFF5F0",
    borderColor: "#FFD9C7",
  },
  statusLabel: {
    fontFamily: Fonts.regular,
    fontSize: 11,
    color: "#8E8E93",
    marginBottom: 2,
  },
  statusValue: {
    fontFamily: Fonts.extraBold,
    fontSize: 16,
  },
  statusHint: {
    fontFamily: Fonts.regular,
    fontSize: 11,
    color: "#2E7D32",
    marginTop: 2,
  },
  statusToggleBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  toggleOn: {
    backgroundColor: "#F0FFF0",
    borderColor: "#34C759",
  },
  toggleOff: {
    backgroundColor: "#FFF0F0",
    borderColor: "#FF3B30",
  },
  toggleText: {
    fontFamily: Fonts.bold,
    fontSize: 12,
  },

  // Stats
  statsRow: {
    flexDirection: "row",
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#F8F8F8",
    borderRadius: 14,
    padding: 14,
    alignItems: "center",
  },
  statNumber: {
    fontFamily: Fonts.extraBold,
    fontSize: 22,
    color: "#1A1A1A",
  },
  statLabel: {
    fontFamily: Fonts.medium,
    fontSize: 11,
    color: "#8E8E93",
    marginTop: 2,
  },
  // 대전 전용 배지
  daejeonBadge: {
    backgroundColor: "#FFC107",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  daejeonBadgeText: {
    fontFamily: Fonts.bold,
    fontSize: 10,
    color: "#1A1A1A",
    letterSpacing: 0.5,
  },
});
