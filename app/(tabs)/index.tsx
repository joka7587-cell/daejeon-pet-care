import React from "react";
import { ScrollView, View, Text, Pressable, StyleSheet, FlatList } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useApp } from "@/lib/app-context";
import { MOCK_CARETAKERS, MOCK_REQUESTS, SERVICE_TYPES } from "@/lib/mock-data";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

function haptic() {
  if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

// 반려인 홈
function OwnerHome() {
  const { state } = useApp();
  const router = useRouter();
  const nearbyCaretakers = MOCK_CARETAKERS.filter(
    (c) => c.isActive && (c.neighborhood === state.profile.neighborhood || true)
  ).slice(0, 3);

  const services = SERVICE_TYPES.owner;

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
              onPress={() => { haptic(); router.push("/(tabs)/explore" as never); }}
              style={({ pressed }) => [
                styles.serviceCard,
                { borderColor: svc.color + "40", backgroundColor: svc.color + "12" },
                pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] },
              ]}
            >
              <Text style={styles.serviceEmoji}>{svc.emoji}</Text>
              <Text style={[styles.serviceTitle, { color: svc.color }]}>{svc.title}</Text>
              <Text style={styles.serviceDesc}>{svc.description}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* 긴급 요청 배너 */}
      <Pressable
        onPress={() => { haptic(); router.push("/(tabs)/requests" as never); }}
        style={({ pressed }) => [styles.urgentBanner, pressed && { opacity: 0.85 }]}
      >
        <Text style={styles.urgentEmoji}>🚨</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.urgentTitle}>긴급 돌봄이 필요하신가요?</Text>
          <Text style={styles.urgentDesc}>지금 바로 근처 돌보미에게 요청하세요</Text>
        </View>
        <Text style={styles.urgentArrow}>›</Text>
      </Pressable>

      {/* 근처 돌보미 */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>근처 활동 중인 돌보미</Text>
          <Pressable onPress={() => { haptic(); router.push("/(tabs)/explore" as never); }}>
            <Text style={styles.seeAll}>전체보기</Text>
          </Pressable>
        </View>
        {nearbyCaretakers.map((c) => (
          <Pressable
            key={c.id}
            onPress={() => { haptic(); router.push(`/profile/${c.id}` as never); }}
            style={({ pressed }) => [styles.caretakerCard, pressed && { opacity: 0.85 }]}
          >
            <View style={styles.caretakerAvatar}>
              <Text style={{ fontSize: 28 }}>{c.profileEmoji}</Text>
              {c.isActive && <View style={styles.activeDot} />}
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Text style={styles.caretakerName}>{c.nickname}</Text>
                <View style={styles.neighborhoodTag}>
                  <Text style={styles.neighborhoodTagText}>{c.neighborhood}</Text>
                </View>
              </View>
              <Text style={styles.caretakerBio} numberOfLines={1}>{c.bio}</Text>
              <View style={{ flexDirection: "row", gap: 6, marginTop: 4 }}>
                {c.services?.map((s) => (
                  <View key={s} style={styles.serviceTag}>
                    <Text style={styles.serviceTagText}>{s}</Text>
                  </View>
                ))}
              </View>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={styles.rating}>⭐ {c.rating}</Text>
              <Text style={styles.distance}>{c.distance}</Text>
            </View>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

// 돌보미 홈
function CaretakerHome() {
  const { state, dispatch } = useApp();
  const router = useRouter();
  const pendingRequests = MOCK_REQUESTS.filter(
    (r) => r.status === "pending" && (r.type === "emergency" || r.type === "walk_request")
  );

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

      {/* 활동 상태 토글 */}
      <Pressable
        onPress={() => { haptic(); dispatch({ type: "TOGGLE_CARETAKER_ACTIVE" }); }}
        style={({ pressed }) => [
          styles.activeToggle,
          state.profile.isCaretakerActive ? styles.activeToggleOn : styles.activeToggleOff,
          pressed && { opacity: 0.85 },
        ]}
      >
        <View style={styles.activeToggleLeft}>
          <Text style={styles.activeToggleEmoji}>
            {state.profile.isCaretakerActive ? "🟢" : "⚫"}
          </Text>
          <View>
            <Text style={styles.activeToggleTitle}>
              {state.profile.isCaretakerActive ? "활동 중" : "활동 중지"}
            </Text>
            <Text style={styles.activeToggleDesc}>
              {state.profile.isCaretakerActive
                ? "요청을 받고 있어요"
                : "탭하여 활동 시작"}
            </Text>
          </View>
        </View>
        <View style={[
          styles.toggleSwitch,
          state.profile.isCaretakerActive ? styles.toggleSwitchOn : styles.toggleSwitchOff,
        ]}>
          <View style={[
            styles.toggleThumb,
            state.profile.isCaretakerActive ? styles.toggleThumbOn : styles.toggleThumbOff,
          ]} />
        </View>
      </Pressable>

      {/* 제공 서비스 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>제공 가능한 서비스</Text>
        <View style={{ flexDirection: "row", gap: 12 }}>
          {SERVICE_TYPES.caretaker.map((svc) => (
            <View
              key={svc.id}
              style={[styles.caretakerServiceCard, { borderColor: svc.color + "50", backgroundColor: svc.color + "10" }]}
            >
              <Text style={{ fontSize: 32 }}>{svc.emoji}</Text>
              <Text style={[styles.serviceTitle, { color: svc.color }]}>{svc.title}</Text>
              <Text style={styles.serviceDesc}>{svc.description}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* 새 요청 목록 */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>새로운 요청</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{pendingRequests.length}</Text>
          </View>
          <Pressable onPress={() => { haptic(); router.push("/(tabs)/requests" as never); }}>
            <Text style={styles.seeAll}>전체보기</Text>
          </Pressable>
        </View>

        {pendingRequests.slice(0, 3).map((req) => (
          <Pressable
            key={req.id}
            onPress={() => { haptic(); router.push(`/request/${req.id}` as never); }}
            style={({ pressed }) => [styles.requestCard, pressed && { opacity: 0.85 }]}
          >
            {req.isUrgent && (
              <View style={styles.urgentTag}>
                <Text style={styles.urgentTagText}>🚨 긴급</Text>
              </View>
            )}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <Text style={{ fontSize: 36 }}>{req.petEmoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.requestTitle}>{req.title}</Text>
                <Text style={styles.requestMeta}>
                  {req.requester} · {req.neighborhood} · {req.date} {req.time}
                </Text>
                <Text style={styles.requestDuration}>⏱ {req.duration}</Text>
              </View>
            </View>
          </Pressable>
        ))}

        {pendingRequests.length === 0 && (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>🌙</Text>
            <Text style={styles.emptyText}>새로운 요청이 없어요</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

export default function HomeScreen() {
  const { state } = useApp();
  const isCaretaker = state.profile.role === "caretaker";

  return (
    <ScreenContainer className="px-4 pt-2">
      {isCaretaker ? <CaretakerHome /> : <OwnerHome />}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
  },
  greeting: { fontSize: 14, color: "#757575" },
  nickname: { fontSize: 22, fontWeight: "800", color: "#1A1A1A" },
  neighborhoodBadge: {
    backgroundColor: "#FFF3EE",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "#FFCCBC",
  },
  neighborhoodText: { fontSize: 13, fontWeight: "600", color: "#FF7043" },
  section: { marginBottom: 24 },
  sectionHeader: { flexDirection: "row", alignItems: "center", marginBottom: 12, gap: 8 },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: "#1A1A1A", marginBottom: 12 },
  seeAll: { fontSize: 13, color: "#FF7043", fontWeight: "600", marginLeft: "auto" },
  serviceGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  serviceCard: {
    width: "47%",
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 16,
    gap: 6,
  },
  serviceEmoji: { fontSize: 28 },
  serviceTitle: { fontSize: 15, fontWeight: "700" },
  serviceDesc: { fontSize: 12, color: "#757575", lineHeight: 16 },
  urgentBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF3EE",
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#FFCCBC",
    gap: 12,
  },
  urgentEmoji: { fontSize: 28 },
  urgentTitle: { fontSize: 15, fontWeight: "700", color: "#FF7043" },
  urgentDesc: { fontSize: 13, color: "#757575", marginTop: 2 },
  urgentArrow: { fontSize: 24, color: "#FF7043" },
  caretakerCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    gap: 12,
    borderWidth: 1,
    borderColor: "#F0F0F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  caretakerAvatar: { position: "relative", width: 48, height: 48, alignItems: "center", justifyContent: "center" },
  activeDot: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#4CAF82",
    borderWidth: 2,
    borderColor: "#fff",
  },
  caretakerName: { fontSize: 15, fontWeight: "700", color: "#1A1A1A" },
  caretakerBio: { fontSize: 12, color: "#757575", marginTop: 2 },
  neighborhoodTag: {
    backgroundColor: "#F5F5F5",
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  neighborhoodTagText: { fontSize: 11, color: "#555", fontWeight: "500" },
  serviceTag: {
    backgroundColor: "#F0FFF4",
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: "#C8E6C9",
  },
  serviceTagText: { fontSize: 10, color: "#4CAF82", fontWeight: "600" },
  rating: { fontSize: 13, fontWeight: "600", color: "#FF9800" },
  distance: { fontSize: 12, color: "#9E9E9E", marginTop: 2 },
  activeToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1.5,
  },
  activeToggleOn: { backgroundColor: "#F0FFF4", borderColor: "#4CAF82" },
  activeToggleOff: { backgroundColor: "#F5F5F5", borderColor: "#E0E0E0" },
  activeToggleLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  activeToggleEmoji: { fontSize: 24 },
  activeToggleTitle: { fontSize: 16, fontWeight: "700", color: "#1A1A1A" },
  activeToggleDesc: { fontSize: 12, color: "#757575", marginTop: 2 },
  toggleSwitch: {
    width: 50,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  toggleSwitchOn: { backgroundColor: "#4CAF82" },
  toggleSwitchOff: { backgroundColor: "#BDBDBD" },
  toggleThumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleThumbOn: { alignSelf: "flex-end" },
  toggleThumbOff: { alignSelf: "flex-start" },
  caretakerServiceCard: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 16,
    gap: 6,
    alignItems: "center",
  },
  countBadge: {
    backgroundColor: "#EF5350",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  countBadgeText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  requestCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#F0F0F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  urgentTag: {
    alignSelf: "flex-start",
    backgroundColor: "#FFEBEE",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 8,
  },
  urgentTagText: { fontSize: 11, color: "#EF5350", fontWeight: "700" },
  requestTitle: { fontSize: 14, fontWeight: "700", color: "#1A1A1A" },
  requestMeta: { fontSize: 12, color: "#757575", marginTop: 3 },
  requestDuration: { fontSize: 12, color: "#4CAF82", marginTop: 3, fontWeight: "600" },
  emptyCard: {
    alignItems: "center",
    padding: 32,
    backgroundColor: "#F5F5F5",
    borderRadius: 16,
    gap: 8,
  },
  emptyEmoji: { fontSize: 40 },
  emptyText: { fontSize: 15, color: "#9E9E9E", fontWeight: "500" },
});
