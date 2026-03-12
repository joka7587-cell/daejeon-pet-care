import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  FlatList,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useApp } from "@/lib/app-context";
import { MOCK_CARETAKERS, MOCK_OWNERS, NEIGHBORHOODS } from "@/lib/mock-data";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

function haptic() {
  if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

type OwnerTab = "walk_partner" | "find_caretaker" | "walk_request" | "short_care";
type CaretakerTab = "emergency" | "walk_service";

function OwnerExplore() {
  const { state } = useApp();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<OwnerTab>("find_caretaker");
  const [selectedNeighborhood, setSelectedNeighborhood] = useState<string>("전체");

  const tabs: { id: OwnerTab; label: string; emoji: string }[] = [
    { id: "find_caretaker", label: "돌보미 찾기", emoji: "🏠" },
    { id: "walk_partner", label: "산책 친구", emoji: "🚶" },
    { id: "walk_request", label: "산책 부탁", emoji: "🐾" },
    { id: "short_care", label: "돌봄 교환", emoji: "🤝" },
  ];

  const neighborhoods = ["전체", ...NEIGHBORHOODS];

  const filteredCaretakers = MOCK_CARETAKERS.filter((c) => {
    if (selectedNeighborhood !== "전체" && c.neighborhood !== selectedNeighborhood) return false;
    return true;
  });

  const filteredOwners = MOCK_OWNERS.filter((o) => {
    if (selectedNeighborhood !== "전체" && o.neighborhood !== selectedNeighborhood) return false;
    return true;
  });

  return (
    <View style={{ flex: 1 }}>
      {/* 탭 */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabScroll}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingVertical: 8 }}
      >
        {tabs.map((tab) => (
          <Pressable
            key={tab.id}
            onPress={() => { haptic(); setActiveTab(tab.id); }}
            style={({ pressed }) => [
              styles.tab,
              activeTab === tab.id && styles.tabActive,
              pressed && { opacity: 0.8 },
            ]}
          >
            <Text style={styles.tabEmoji}>{tab.emoji}</Text>
            <Text style={[styles.tabLabel, activeTab === tab.id && styles.tabLabelActive]}>
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* 동네 필터 */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.neighborhoodScroll}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingVertical: 8 }}
      >
        {neighborhoods.map((n) => (
          <Pressable
            key={n}
            onPress={() => { haptic(); setSelectedNeighborhood(n); }}
            style={({ pressed }) => [
              styles.neighborhoodChip,
              selectedNeighborhood === n && styles.neighborhoodChipActive,
              pressed && { opacity: 0.8 },
            ]}
          >
            <Text style={[
              styles.neighborhoodChipText,
              selectedNeighborhood === n && styles.neighborhoodChipTextActive,
            ]}>
              {n === "전체" ? "📍 전체" : n}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* 목록 */}
      <FlatList
        data={activeTab === "walk_partner" || activeTab === "short_care" ? filteredOwners : filteredCaretakers}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, gap: 12 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>🔍</Text>
            <Text style={styles.emptyText}>해당 동네에 결과가 없어요</Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => { haptic(); router.push(`/profile/${item.id}` as never); }}
            style={({ pressed }) => [styles.userCard, pressed && { opacity: 0.85 }]}
          >
            <View style={styles.userAvatarWrap}>
              <Text style={{ fontSize: 36 }}>{item.profileEmoji}</Text>
              {item.role === "caretaker" && (item as any).isActive && (
                <View style={styles.activeDot} />
              )}
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                <Text style={styles.userName}>{item.nickname}</Text>
                <View style={styles.neighborhoodTag}>
                  <Text style={styles.neighborhoodTagText}>📍 {item.neighborhood}</Text>
                </View>
                {item.distance && (
                  <Text style={styles.distanceText}>{item.distance}</Text>
                )}
              </View>
              <Text style={styles.userBio} numberOfLines={2}>{item.bio}</Text>
              {item.role === "caretaker" && (item as any).services && (
                <View style={{ flexDirection: "row", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                  {(item as any).services.map((s: string) => (
                    <View key={s} style={styles.serviceTag}>
                      <Text style={styles.serviceTagText}>{s}</Text>
                    </View>
                  ))}
                </View>
              )}
              {item.role === "owner" && (item as any).pets && (
                <View style={{ flexDirection: "row", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                  {(item as any).pets.map((p: any) => (
                    <View key={p.name} style={styles.petTag}>
                      <Text style={styles.petTagText}>{p.emoji} {p.name} ({p.breed})</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
            <View style={{ alignItems: "flex-end", gap: 4 }}>
              <Text style={styles.ratingText}>⭐ {item.rating}</Text>
              <Text style={styles.reviewText}>후기 {item.reviewCount}</Text>
            </View>
          </Pressable>
        )}
      />
    </View>
  );
}

function CaretakerExplore() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<CaretakerTab>("emergency");
  const [selectedNeighborhood, setSelectedNeighborhood] = useState<string>("전체");

  const tabs: { id: CaretakerTab; label: string; emoji: string; color: string }[] = [
    { id: "emergency", label: "긴급 방문 돌봄", emoji: "🚨", color: "#EF5350" },
    { id: "walk_service", label: "대신 산책", emoji: "🦮", color: "#4CAF82" },
  ];

  const neighborhoods = ["전체", ...NEIGHBORHOODS];

  const filteredOwners = MOCK_OWNERS.filter((o) => {
    if (selectedNeighborhood !== "전체" && o.neighborhood !== selectedNeighborhood) return false;
    return true;
  });

  return (
    <View style={{ flex: 1 }}>
      {/* 탭 */}
      <View style={[styles.tabScroll, { paddingHorizontal: 16, paddingVertical: 8, flexDirection: "row", gap: 10 }]}>
        {tabs.map((tab) => (
          <Pressable
            key={tab.id}
            onPress={() => { haptic(); setActiveTab(tab.id); }}
            style={({ pressed }) => [
              styles.caretakerTab,
              activeTab === tab.id && { backgroundColor: tab.color, borderColor: tab.color },
              pressed && { opacity: 0.8 },
            ]}
          >
            <Text style={styles.tabEmoji}>{tab.emoji}</Text>
            <Text style={[
              styles.tabLabel,
              activeTab === tab.id ? { color: "#fff" } : { color: "#555" },
            ]}>
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* 동네 필터 */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.neighborhoodScroll}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingVertical: 8 }}
      >
        {neighborhoods.map((n) => (
          <Pressable
            key={n}
            onPress={() => { haptic(); setSelectedNeighborhood(n); }}
            style={({ pressed }) => [
              styles.neighborhoodChip,
              selectedNeighborhood === n && styles.neighborhoodChipActiveGreen,
              pressed && { opacity: 0.8 },
            ]}
          >
            <Text style={[
              styles.neighborhoodChipText,
              selectedNeighborhood === n && styles.neighborhoodChipTextActiveGreen,
            ]}>
              {n === "전체" ? "📍 전체" : n}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* 요청 목록 */}
      <FlatList
        data={filteredOwners}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, gap: 12 }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.infoCard}>
            <Text style={styles.infoCardText}>
              💡 돌봄 요청이 있는 반려인 목록이에요. 프로필을 확인하고 연락해보세요!
            </Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>🔍</Text>
            <Text style={styles.emptyText}>해당 동네에 결과가 없어요</Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => { haptic(); router.push(`/profile/${item.id}` as never); }}
            style={({ pressed }) => [styles.userCard, pressed && { opacity: 0.85 }]}
          >
            <Text style={{ fontSize: 36 }}>{item.profileEmoji}</Text>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Text style={styles.userName}>{item.nickname}</Text>
                <View style={styles.neighborhoodTag}>
                  <Text style={styles.neighborhoodTagText}>📍 {item.neighborhood}</Text>
                </View>
              </View>
              <Text style={styles.userBio} numberOfLines={2}>{item.bio}</Text>
              {(item as any).pets && (
                <View style={{ flexDirection: "row", gap: 6, marginTop: 6 }}>
                  {(item as any).pets.map((p: any) => (
                    <View key={p.name} style={styles.petTag}>
                      <Text style={styles.petTagText}>{p.emoji} {p.name}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={styles.ratingText}>⭐ {item.rating}</Text>
            </View>
          </Pressable>
        )}
      />
    </View>
  );
}

export default function ExploreScreen() {
  const { state } = useApp();
  const isCaretaker = state.profile.role === "caretaker";

  return (
    <ScreenContainer className="pt-2">
      <View style={styles.screenHeader}>
        <Text style={styles.screenTitle}>{isCaretaker ? "요청 찾기" : "서비스 찾기"}</Text>
        <View style={styles.neighborhoodBadge}>
          <Text style={styles.neighborhoodBadgeText}>📍 {state.profile.neighborhood || "전체"}</Text>
        </View>
      </View>
      {isCaretaker ? <CaretakerExplore /> : <OwnerExplore />}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  screenHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  screenTitle: { fontSize: 22, fontWeight: "800", color: "#1A1A1A" },
  neighborhoodBadge: {
    backgroundColor: "#FFF3EE",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: "#FFCCBC",
  },
  neighborhoodBadgeText: { fontSize: 12, fontWeight: "600", color: "#FF7043" },
  tabScroll: { backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#F0F0F0" },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "#E0E0E0",
    backgroundColor: "#fff",
  },
  tabActive: { borderColor: "#FF7043", backgroundColor: "#FFF3EE" },
  tabEmoji: { fontSize: 14 },
  tabLabel: { fontSize: 13, fontWeight: "600", color: "#757575" },
  tabLabelActive: { color: "#FF7043" },
  caretakerTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#E0E0E0",
    backgroundColor: "#fff",
  },
  neighborhoodScroll: { backgroundColor: "#FAFAFA", borderBottomWidth: 1, borderBottomColor: "#F0F0F0" },
  neighborhoodChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    backgroundColor: "#fff",
  },
  neighborhoodChipActive: { borderColor: "#FF7043", backgroundColor: "#FFF3EE" },
  neighborhoodChipActiveGreen: { borderColor: "#4CAF82", backgroundColor: "#F0FFF4" },
  neighborhoodChipText: { fontSize: 13, color: "#555", fontWeight: "500" },
  neighborhoodChipTextActive: { color: "#FF7043", fontWeight: "700" },
  neighborhoodChipTextActiveGreen: { color: "#4CAF82", fontWeight: "700" },
  userCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: "#F0F0F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  userAvatarWrap: { position: "relative", width: 44, height: 44, alignItems: "center", justifyContent: "center" },
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
  userName: { fontSize: 15, fontWeight: "700", color: "#1A1A1A" },
  userBio: { fontSize: 12, color: "#757575", marginTop: 4, lineHeight: 18 },
  neighborhoodTag: {
    backgroundColor: "#F5F5F5",
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  neighborhoodTagText: { fontSize: 11, color: "#555", fontWeight: "500" },
  distanceText: { fontSize: 11, color: "#9E9E9E" },
  serviceTag: {
    backgroundColor: "#F0FFF4",
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: "#C8E6C9",
  },
  serviceTagText: { fontSize: 10, color: "#4CAF82", fontWeight: "600" },
  petTag: {
    backgroundColor: "#FFF3EE",
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: "#FFCCBC",
  },
  petTagText: { fontSize: 10, color: "#FF7043", fontWeight: "600" },
  ratingText: { fontSize: 13, fontWeight: "600", color: "#FF9800" },
  reviewText: { fontSize: 11, color: "#9E9E9E" },
  emptyCard: {
    alignItems: "center",
    padding: 40,
    gap: 8,
  },
  emptyEmoji: { fontSize: 40 },
  emptyText: { fontSize: 15, color: "#9E9E9E", fontWeight: "500" },
  infoCard: {
    backgroundColor: "#F0FFF4",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#C8E6C9",
  },
  infoCardText: { fontSize: 13, color: "#4CAF82", lineHeight: 18 },
});
