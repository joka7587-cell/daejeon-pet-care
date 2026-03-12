import { ScrollView, View, Text, Pressable, StyleSheet, FlatList, TouchableOpacity } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useApp } from "@/lib/app-context";
import { MOCK_CARETAKERS, MOCK_REQUESTS, SERVICE_TYPES } from "@/lib/mock-data";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

function haptic() {
  if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

interface NearbyRequest {
  id: number;
  title: string;
  service: string;
  distance: number;
  date: string;
  time: string;
  requesterName: string;
  rating: number;
  isUrgent: boolean;
}

const NEARBY_REQUESTS: NearbyRequest[] = [
  {
    id: 1,
    title: "오후 산책 부탁드립니다",
    service: "산책",
    distance: 0.8,
    date: "2025-03-13",
    time: "14:00",
    requesterName: "미영",
    rating: 4.8,
    isUrgent: false,
  },
  {
    id: 2,
    title: "긴급! 오늘 저녁 돌봐주실 분",
    service: "긴급 돌봄",
    distance: 1.2,
    date: "2025-03-12",
    time: "18:00",
    requesterName: "준호",
    rating: 4.9,
    isUrgent: true,
  },
  {
    id: 3,
    title: "주말 산책 친구 찾습니다",
    service: "산책",
    distance: 0.5,
    date: "2025-03-15",
    time: "10:00",
    requesterName: "지은",
    rating: 4.7,
    isUrgent: false,
  },
];

// 반려인 홈
function OwnerHome() {
  const { state } = useApp();
  const router = useRouter();
  const nearbyCaretakers = MOCK_CARETAKERS.filter(
    (c) => c.isActive && (c.neighborhood === state.profile.neighborhood || true)
  ).slice(0, 3);

  const services = SERVICE_TYPES.owner;

  const handleServicePress = (serviceId: string) => {
    haptic();
    // 각 서비스별로 적절한 화면으로 이동
    switch (serviceId) {
      case "walk_partner":
        // 산책 친구 찾기 → 찾기 탭의 산책 친구 탭
        router.push({ pathname: "/(tabs)/explore", params: { tab: "walk_partner" } } as never);
        break;
      case "find_caretaker":
        // 돌보미 찾기 → 찾기 탭의 돌보미 찾기 탭
        router.push({ pathname: "/(tabs)/explore", params: { tab: "find_caretaker" } } as never);
        break;
      case "walk_request":
        // 산책 부탁하기 → 요청 작성 화면
        router.push("/request/new" as never);
        break;
      case "short_care":
        // 단기 돌봄 교환 → 찾기 탭의 돌봄 교환 탭
        router.push({ pathname: "/(tabs)/explore", params: { tab: "short_care" } } as never);
        break;
      default:
        router.push({ pathname: "/(tabs)/explore", params: { tab: serviceId } } as never);
    }
  };

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
      {/* 헤더 */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>안녕하세요 👋</Text>
          <Text style={styles.nickname}>{state.profile.nickname || "반려인"}</Text>
        </View>
        <View style={styles.neighborhoodBadge}>
          <Text style={styles.neighborhoodText}>📍 {state.profile.neighborhood || "동네 미설정"}</Text>
        </View>
      </View>

      {/* 빠른 서비스 버튼 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>무엇을 찾으시나요?</Text>
        <View style={styles.serviceGrid}>
          {services.map((svc) => (
            <Pressable
              key={svc.id}
              onPress={() => handleServicePress(svc.id)}
              style={({ pressed }) => [
                styles.serviceCard,
                { borderColor: svc.color + "40", backgroundColor: svc.color + "12" },
                pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] },
              ]}
            >
              <Text style={styles.serviceEmoji}>{svc.emoji}</Text>
              <Text style={styles.serviceName}>{svc.title}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* 근처 돌봄 요청 */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>근처 돌봄 요청</Text>
          <Pressable onPress={() => { haptic(); router.push("/(tabs)/requests" as never); }}>
            <Text style={styles.seeAllLink}>모두 보기 →</Text>
          </Pressable>
        </View>
        <View style={styles.requestsList}>
          {NEARBY_REQUESTS.map((req) => (
            <Pressable
              key={req.id}
              onPress={() => { haptic(); router.push(`/request/${req.id}` as never); }}
              style={({ pressed }) => [
                styles.requestCard,
                pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
              ]}
            >
              <View style={styles.requestHeader}>
                <View style={styles.requestTitleContainer}>
                  <Text style={styles.requestTitle}>{req.title}</Text>
                  {req.isUrgent && (
                    <View style={styles.urgentBadge}>
                      <Text style={styles.urgentText}>긴급</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.requestRating}>⭐ {req.rating}</Text>
              </View>

              <View style={styles.requestInfo}>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>서비스</Text>
                  <Text style={styles.infoValue}>{req.service}</Text>
                </View>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>거리</Text>
                  <Text style={styles.infoValue}>{req.distance} km</Text>
                </View>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>시간</Text>
                  <Text style={styles.infoValue}>{req.time}</Text>
                </View>
              </View>

              <View style={styles.requestFooter}>
                <Text style={styles.requesterName}>{req.requesterName}님의 요청</Text>
                <TouchableOpacity
                  style={styles.acceptBtn}
                  onPress={() => { haptic(); router.push(`/request/${req.id}` as never); }}
                >
                  <Text style={styles.acceptBtnText}>수락하기</Text>
                </TouchableOpacity>
              </View>
            </Pressable>
          ))}
        </View>
      </View>

      {/* 추천 돌보미 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>추천 돌보미</Text>
        <FlatList
          data={nearbyCaretakers}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => { haptic(); router.push(`/profile/${item.id}` as never); }}
              style={({ pressed }) => [
                styles.caretakerCard,
                pressed && { opacity: 0.8 },
              ]}
            >
              <View style={styles.caretakerInfo}>
                <View style={styles.caretakerAvatar}>
                  <Text style={styles.avatarText}>{(item.nickname || "돌").charAt(0)}</Text>
                </View>
                <View style={styles.caretakerDetails}>
                  <Text style={styles.caretakerName}>{item.nickname || "돌보미"}</Text>
                  <Text style={styles.caretakerRole}>{item.role === "caretaker" ? "돌보미" : "산책친구"}</Text>
                  <Text style={styles.caretakerRating}>⭐ {item.rating} (리뷰)</Text>
                </View>
              </View>
            </Pressable>
          )}
          scrollEnabled={false}
        />
      </View>
    </ScrollView>
  );
}

// 돌보미 홈
function CaretakerHome() {
  const { state } = useApp();
  const router = useRouter();

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
      {/* 헤더 */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>안녕하세요 👋</Text>
          <Text style={styles.nickname}>{state.profile.nickname || "돌보미"}</Text>
        </View>
        <View style={styles.neighborhoodBadge}>
          <Text style={styles.neighborhoodText}>📍 {state.profile.neighborhood || "동네 미설정"}</Text>
        </View>
      </View>

      {/* 활동 상태 */}
      <View style={styles.section}>
        <View style={styles.statusCard}>
          <View>
            <Text style={styles.statusLabel}>현재 활동 상태</Text>
            <Text style={styles.statusValue}>🟢 온라인</Text>
          </View>
          <Pressable
            style={styles.statusToggle}
            onPress={() => haptic()}
          >
            <Text style={styles.statusToggleText}>오프라인</Text>
          </Pressable>
        </View>
      </View>

      {/* 제공 서비스 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>제공 서비스</Text>
        <View style={styles.serviceGrid}>
          {SERVICE_TYPES.caretaker.map((svc) => (
            <Pressable
              key={svc.id}
              onPress={() => {
                haptic();
                router.push({ pathname: "/(tabs)/explore", params: { tab: svc.id } } as never);
              }}
              style={({ pressed }) => [
                styles.serviceCard,
                { borderColor: svc.color + "40", backgroundColor: svc.color + "12" },
                pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] },
              ]}
            >
              <Text style={styles.serviceEmoji}>{svc.emoji}</Text>
              <Text style={styles.serviceName}>{svc.title}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* 새 요청 */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>새 요청 (3)</Text>
          <Pressable onPress={() => { haptic(); router.push("/(tabs)/requests" as never); }}>
            <Text style={styles.seeAllLink}>모두 보기 →</Text>
          </Pressable>
        </View>
        <View style={styles.requestsList}>
          {MOCK_REQUESTS.slice(0, 2).map((req) => (
            <Pressable
              key={req.id}
              onPress={() => { haptic(); router.push(`/request/${req.id}` as never); }}
              style={({ pressed }) => [
                styles.requestCard,
                pressed && { opacity: 0.85 },
              ]}
            >
              <View style={styles.requestHeader}>
                <Text style={styles.requestTitle}>{req.title}</Text>
                <Text style={styles.requestDate}>{req.date}</Text>
              </View>
              <Text style={styles.requestDescription}>{req.description}</Text>
              <View style={styles.requestActions}>
                <TouchableOpacity style={styles.acceptBtn}>
                  <Text style={styles.acceptBtnText}>수락</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.rejectBtn}>
                  <Text style={styles.rejectBtnText}>거절</Text>
                </TouchableOpacity>
              </View>
            </Pressable>
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

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 8,
  },
  greeting: {
    fontSize: 14,
    color: "#9E9E9E",
    marginBottom: 2,
  },
  nickname: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1A1A1A",
  },
  neighborhoodBadge: {
    backgroundColor: "#FFF3E0",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  neighborhoodText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#FF7043",
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1A1A1A",
  },
  seeAllLink: {
    fontSize: 12,
    color: "#FF7043",
    fontWeight: "600",
  },
  serviceGrid: {
    flexDirection: "row",
    gap: 12,
    flexWrap: "wrap",
  },
  serviceCard: {
    flex: 1,
    minWidth: "30%",
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    gap: 8,
  },
  serviceEmoji: {
    fontSize: 28,
  },
  serviceName: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1A1A1A",
    textAlign: "center",
  },
  requestsList: {
    gap: 12,
  },
  requestCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#F0F0F0",
    padding: 12,
    gap: 12,
  },
  requestHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  requestTitleContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  requestTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1A1A1A",
    flex: 1,
  },
  requestRating: {
    fontSize: 12,
    color: "#FF7043",
    fontWeight: "600",
  },
  requestDate: {
    fontSize: 12,
    color: "#9E9E9E",
  },
  requestDescription: {
    fontSize: 13,
    color: "#616161",
    lineHeight: 18,
  },
  urgentBadge: {
    backgroundColor: "#EF5350",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  urgentText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#fff",
  },
  requestInfo: {
    flexDirection: "row",
    gap: 12,
  },
  infoItem: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 11,
    color: "#9E9E9E",
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1A1A1A",
  },
  requestFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  requesterName: {
    fontSize: 12,
    color: "#9E9E9E",
  },
  acceptBtn: {
    backgroundColor: "#FF7043",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  acceptBtnText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  rejectBtn: {
    backgroundColor: "#F5F5F5",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  rejectBtnText: {
    color: "#616161",
    fontSize: 12,
    fontWeight: "700",
  },
  requestActions: {
    flexDirection: "row",
    gap: 8,
  },
  caretakerCard: {
    flexDirection: "row",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F5F5F5",
  },
  caretakerInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  caretakerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#FF7043",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 20,
    fontWeight: "700",
    color: "#fff",
  },
  caretakerDetails: {
    flex: 1,
  },
  caretakerName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1A1A1A",
  },
  caretakerRole: {
    fontSize: 12,
    color: "#9E9E9E",
    marginTop: 2,
  },
  caretakerRating: {
    fontSize: 12,
    color: "#FF7043",
    marginTop: 2,
  },
  statusCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
    borderRadius: 12,
    padding: 16,
  },
  statusLabel: {
    fontSize: 12,
    color: "#9E9E9E",
    marginBottom: 4,
  },
  statusValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1A1A1A",
  },
  statusToggle: {
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  statusToggleText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#616161",
  },
});
