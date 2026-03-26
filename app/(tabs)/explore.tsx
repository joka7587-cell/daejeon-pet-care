import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  FlatList,
  TextInput,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useApp } from "@/lib/app-context";
import { MOCK_CARETAKERS, MOCK_OWNERS, MOCK_REQUESTS, NEIGHBORHOODS, type MockUser } from "@/lib/mock-data";
import { useRouter, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";
import { Fonts } from "@/hooks/use-fonts";

function haptic() {
  if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

type SortOption = "distance" | "rating" | "price" | "reviews";
type OwnerTab = "walk_partner" | "find_caretaker" | "walk_request" | "short_care";
type CaretakerTab = "emergency" | "walk_service";

// 필터 패널 컴포넌트
function FilterPanel({
  sortBy,
  setSortBy,
  largeDogOnly,
  setLargeDogOnly,
  trainerOnly,
  setTrainerOnly,
  verifiedOnly,
  setVerifiedOnly,
}: {
  sortBy: SortOption;
  setSortBy: (s: SortOption) => void;
  largeDogOnly: boolean;
  setLargeDogOnly: (b: boolean) => void;
  trainerOnly: boolean;
  setTrainerOnly: (b: boolean) => void;
  verifiedOnly: boolean;
  setVerifiedOnly: (b: boolean) => void;
}) {
  const sortOptions: { id: SortOption; label: string }[] = [
    { id: "distance", label: "거리순" },
    { id: "rating", label: "평점순" },
    { id: "price", label: "가격순" },
    { id: "reviews", label: "후기순" },
  ];

  const toggleFilters: { label: string; active: boolean; onToggle: () => void }[] = [
    { label: "대형견 가능", active: largeDogOnly, onToggle: () => setLargeDogOnly(!largeDogOnly) },
    { label: "훈련사 자격", active: trainerOnly, onToggle: () => setTrainerOnly(!trainerOnly) },
    { label: "인증 돌보미", active: verifiedOnly, onToggle: () => setVerifiedOnly(!verifiedOnly) },
  ];

  return (
    <View style={s.filterPanel}>
      {/* 정렬 */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
        {sortOptions.map((opt) => (
          <Pressable
            key={opt.id}
            onPress={() => { haptic(); setSortBy(opt.id); }}
            style={[s.sortChip, sortBy === opt.id && s.sortChipActive]}
          >
            <Text style={[s.sortChipText, sortBy === opt.id && s.sortChipTextActive]}>
              {opt.label}
            </Text>
          </Pressable>
        ))}
        <View style={s.filterDivider} />
        {toggleFilters.map((f) => (
          <Pressable
            key={f.label}
            onPress={() => { haptic(); f.onToggle(); }}
            style={[s.filterChip, f.active && s.filterChipActive]}
          >
            <Text style={[s.filterChipText, f.active && s.filterChipTextActive]}>
              {f.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

// 돌보미 카드 컴포넌트
function WalkerCard({ item, onPress }: { item: MockUser; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [s.walkerCard, pressed && { opacity: 0.85 }]}
    >
      <View style={s.walkerCardTop}>
        <View style={s.walkerAvatar}>
          <Text style={{ fontSize: 32 }}>{item.profileEmoji}</Text>
          {item.isActive && <View style={s.onlineDot} />}
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <Text style={s.walkerName}>{item.nickname}</Text>
            {item.isVerified && (
              <View style={s.verifiedBadge}><Text style={s.verifiedText}>✓ 인증</Text></View>
            )}
            {item.hasTrainerCert && (
              <View style={s.trainerBadge}><Text style={s.trainerText}>훈련사</Text></View>
            )}
          </View>
          <Text style={s.walkerBio} numberOfLines={1}>{item.bio}</Text>
        </View>
      </View>

      <View style={s.walkerStats}>
        <View style={s.walkerStatItem}>
          <Text style={s.walkerStatValue}>⭐ {item.rating}</Text>
          <Text style={s.walkerStatLabel}>평점</Text>
        </View>
        <View style={s.walkerStatDivider} />
        <View style={s.walkerStatItem}>
          <Text style={s.walkerStatValue}>{item.reviewCount}</Text>
          <Text style={s.walkerStatLabel}>후기</Text>
        </View>
        <View style={s.walkerStatDivider} />
        <View style={s.walkerStatItem}>
          <Text style={s.walkerStatValue}>{item.distance}</Text>
          <Text style={s.walkerStatLabel}>거리</Text>
        </View>
        <View style={s.walkerStatDivider} />
        <View style={s.walkerStatItem}>
          <Text style={s.walkerStatValue}>
            {item.pricePerHour ? `₩${(item.pricePerHour / 1000).toFixed(0)}k` : "-"}
          </Text>
          <Text style={s.walkerStatLabel}>시간당</Text>
        </View>
      </View>

      {item.services && (
        <View style={s.walkerTags}>
          {item.services.map((svc) => (
            <View key={svc} style={s.serviceTag}>
              <Text style={s.serviceTagText}>{svc}</Text>
            </View>
          ))}
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
        </View>
      )}
    </Pressable>
  );
}

function OwnerExplore({ initialTab }: { initialTab?: string }) {
  const { state } = useApp();
  const router = useRouter();
  const validTabs: OwnerTab[] = ["find_caretaker", "walk_partner", "walk_request", "short_care"];
  const startTab = validTabs.includes(initialTab as OwnerTab) ? (initialTab as OwnerTab) : "find_caretaker";
  const [activeTab, setActiveTab] = useState<OwnerTab>(startTab);
  const [selectedNeighborhood, setSelectedNeighborhood] = useState<string>("전체");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("distance");
  const [largeDogOnly, setLargeDogOnly] = useState(false);
  const [trainerOnly, setTrainerOnly] = useState(false);
  const [verifiedOnly, setVerifiedOnly] = useState(false);

  useEffect(() => {
    if (initialTab && validTabs.includes(initialTab as OwnerTab)) {
      setActiveTab(initialTab as OwnerTab);
    }
  }, [initialTab]);

  const tabs: { id: OwnerTab; label: string; emoji: string }[] = [
    { id: "find_caretaker", label: "돌보미", emoji: "🏠" },
    { id: "walk_partner", label: "산책 메이트", emoji: "🚶" },
    { id: "walk_request", label: "산책 부탁", emoji: "🐾" },
    { id: "short_care", label: "돌봄 교환", emoji: "🤝" },
  ];

  const neighborhoods = ["전체", ...NEIGHBORHOODS];

  const filteredAndSorted = useMemo(() => {
    const isCaretakerList = activeTab === "find_caretaker";
    let data: MockUser[] = isCaretakerList ? [...MOCK_CARETAKERS] : [...MOCK_OWNERS];

    // 동네 필터
    if (selectedNeighborhood !== "전체") {
      data = data.filter((d) => d.neighborhood === selectedNeighborhood);
    }

    // 검색어 필터
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      data = data.filter(
        (d) =>
          d.nickname.toLowerCase().includes(q) ||
          d.bio.toLowerCase().includes(q) ||
          d.neighborhood.toLowerCase().includes(q)
      );
    }

    // 토글 필터 (돌보미 탭에서만)
    if (isCaretakerList) {
      if (largeDogOnly) data = data.filter((d) => d.canHandleLargeDogs);
      if (trainerOnly) data = data.filter((d) => d.hasTrainerCert);
      if (verifiedOnly) data = data.filter((d) => d.isVerified);
    }

    // 정렬
    data.sort((a, b) => {
      switch (sortBy) {
        case "distance":
          return (a.distanceKm ?? 99) - (b.distanceKm ?? 99);
        case "rating":
          return b.rating - a.rating;
        case "price":
          return (a.pricePerHour ?? 99999) - (b.pricePerHour ?? 99999);
        case "reviews":
          return b.reviewCount - a.reviewCount;
        default:
          return 0;
      }
    });

    return data;
  }, [activeTab, selectedNeighborhood, searchQuery, sortBy, largeDogOnly, trainerOnly, verifiedOnly]);

  const filteredRequests = useMemo(() => {
    let data = MOCK_REQUESTS.filter((r) => r.type === "walk_request");
    if (selectedNeighborhood !== "전체") {
      data = data.filter((r) => r.neighborhood === selectedNeighborhood);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      data = data.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          r.requester.toLowerCase().includes(q)
      );
    }
    return data;
  }, [selectedNeighborhood, searchQuery]);

  const showFilters = activeTab === "find_caretaker";

  return (
    <View style={{ flex: 1 }}>
      {/* 검색바 */}
      <View style={s.searchBar}>
        <Text style={s.searchIcon}>🔍</Text>
        <TextInput
          style={s.searchInput}
          placeholder="이름, 동네, 키워드로 검색"
          placeholderTextColor="#AEAEB2"
          value={searchQuery}
          onChangeText={setSearchQuery}
          returnKeyType="done"
        />
        {searchQuery.length > 0 && (
          <Pressable onPress={() => setSearchQuery("")}>
            <Text style={s.searchClear}>✕</Text>
          </Pressable>
        )}
      </View>

      {/* 탭 */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingVertical: 8 }}
      >
        {tabs.map((tab) => (
          <Pressable
            key={tab.id}
            onPress={() => { haptic(); setActiveTab(tab.id); }}
            style={[s.tab, activeTab === tab.id && s.tabActive]}
          >
            <Text style={s.tabEmoji}>{tab.emoji}</Text>
            <Text style={[s.tabLabel, activeTab === tab.id && s.tabLabelActive]}>
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* 동네 필터 */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 6, paddingVertical: 6 }}
        style={{ backgroundColor: "#FAFAFA" }}
      >
        {neighborhoods.map((n) => (
          <Pressable
            key={n}
            onPress={() => { haptic(); setSelectedNeighborhood(n); }}
            style={[s.neighborhoodChip, selectedNeighborhood === n && s.neighborhoodChipActive]}
          >
            <Text style={[s.neighborhoodChipText, selectedNeighborhood === n && s.neighborhoodChipTextActive]}>
              {n}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* 필터 패널 (돌보미 탭에서만) */}
      {showFilters && (
        <FilterPanel
          sortBy={sortBy}
          setSortBy={setSortBy}
          largeDogOnly={largeDogOnly}
          setLargeDogOnly={setLargeDogOnly}
          trainerOnly={trainerOnly}
          setTrainerOnly={setTrainerOnly}
          verifiedOnly={verifiedOnly}
          setVerifiedOnly={setVerifiedOnly}
        />
      )}

      {/* 결과 수 */}
      <View style={s.resultCount}>
        <Text style={s.resultCountText}>
          {activeTab === "walk_request"
            ? `산책 요청 ${filteredRequests.length}건`
            : `${filteredAndSorted.length}명`}
        </Text>
      </View>

      {/* 목록 */}
      {activeTab === "walk_request" ? (
        <FlatList
          data={filteredRequests}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20, gap: 10 }}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <Pressable
              onPress={() => { haptic(); router.push("/request/new" as never); }}
              style={({ pressed }) => [s.createBtn, pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] }]}
            >
              <Text style={s.createBtnText}>+ 산책 부탁하기</Text>
            </Pressable>
          }
          ListEmptyComponent={
            <View style={s.emptyCard}>
              <Text style={{ fontSize: 40 }}>🐾</Text>
              <Text style={s.emptyText}>산책 요청이 없어요</Text>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => { haptic(); router.push(`/request/${item.id}` as never); }}
              style={({ pressed }) => [s.requestCard, pressed && { opacity: 0.85 }]}
            >
              <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
                <View style={s.requestEmoji}>
                  <Text style={{ fontSize: 24 }}>{item.petEmoji}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Text style={s.requestTitle} numberOfLines={1}>{item.title}</Text>
                    {item.isUrgent && (
                      <View style={s.urgentBadge}><Text style={s.urgentText}>긴급</Text></View>
                    )}
                  </View>
                  <Text style={s.requestMeta}>{item.requester} · {item.neighborhood}</Text>
                  <Text style={s.requestDetail}>📅 {item.date} {item.time} · ⏱ {item.duration}</Text>
                </View>
              </View>
            </Pressable>
          )}
        />
      ) : (
        <FlatList
          data={filteredAndSorted}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20, gap: 10 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={s.emptyCard}>
              <Text style={{ fontSize: 40 }}>🔍</Text>
              <Text style={s.emptyText}>결과가 없어요</Text>
              <Text style={s.emptySubText}>필터를 변경해보세요</Text>
            </View>
          }
          renderItem={({ item }) => (
            <WalkerCard
              item={item}
              onPress={() => { haptic(); router.push(`/profile/${item.id}` as never); }}
            />
          )}
        />
      )}
    </View>
  );
}

function CaretakerExplore({ initialTab }: { initialTab?: string }) {
  const router = useRouter();
  const validTabs: CaretakerTab[] = ["emergency", "walk_service"];
  const startTab = validTabs.includes(initialTab as CaretakerTab) ? (initialTab as CaretakerTab) : "emergency";
  const [activeTab, setActiveTab] = useState<CaretakerTab>(startTab);
  const [selectedNeighborhood, setSelectedNeighborhood] = useState<string>("전체");

  useEffect(() => {
    if (initialTab && validTabs.includes(initialTab as CaretakerTab)) {
      setActiveTab(initialTab as CaretakerTab);
    }
  }, [initialTab]);

  const tabs: { id: CaretakerTab; label: string; emoji: string; color: string }[] = [
    { id: "emergency", label: "긴급 방문 돌봄", emoji: "🚨", color: "#FF3B30" },
    { id: "walk_service", label: "대신 산책", emoji: "🦮", color: "#34C759" },
  ];

  const neighborhoods = ["전체", ...NEIGHBORHOODS];

  const filteredOwners = MOCK_OWNERS.filter((o) => {
    if (selectedNeighborhood !== "전체" && o.neighborhood !== selectedNeighborhood) return false;
    return true;
  });

  return (
    <View style={{ flex: 1 }}>
      <View style={{ paddingHorizontal: 16, paddingVertical: 8, flexDirection: "row", gap: 10 }}>
        {tabs.map((tab) => (
          <Pressable
            key={tab.id}
            onPress={() => { haptic(); setActiveTab(tab.id); }}
            style={[
              s.caretakerTab,
              activeTab === tab.id && { backgroundColor: tab.color, borderColor: tab.color },
            ]}
          >
            <Text style={s.tabEmoji}>{tab.emoji}</Text>
            <Text style={[s.tabLabel, activeTab === tab.id ? { color: "#fff" } : { color: "#555" }]}>
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 6, paddingVertical: 6 }}
        style={{ backgroundColor: "#FAFAFA" }}
      >
        {neighborhoods.map((n) => (
          <Pressable
            key={n}
            onPress={() => { haptic(); setSelectedNeighborhood(n); }}
            style={[s.neighborhoodChip, selectedNeighborhood === n && s.neighborhoodChipActive]}
          >
            <Text style={[s.neighborhoodChipText, selectedNeighborhood === n && s.neighborhoodChipTextActive]}>
              {n}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <FlatList
        data={filteredOwners}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, gap: 10 }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={s.infoCard}>
            <Text style={s.infoCardText}>
              💡 돌봄 요청이 있는 반려인 목록이에요. 프로필을 확인하고 연락해보세요!
            </Text>
          </View>
        }
        ListEmptyComponent={
          <View style={s.emptyCard}>
            <Text style={{ fontSize: 40 }}>🔍</Text>
            <Text style={s.emptyText}>결과가 없어요</Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => { haptic(); router.push(`/profile/${item.id}` as never); }}
            style={({ pressed }) => [s.walkerCard, pressed && { opacity: 0.85 }]}
          >
            <View style={s.walkerCardTop}>
              <View style={s.walkerAvatar}>
                <Text style={{ fontSize: 32 }}>{item.profileEmoji}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.walkerName}>{item.nickname}</Text>
                <Text style={s.walkerBio} numberOfLines={1}>{item.bio}</Text>
              </View>
              <Text style={s.ratingText}>⭐ {item.rating}</Text>
            </View>
            {item.pets && (
              <View style={s.walkerTags}>
                {item.pets.map((p) => (
                  <View key={p.name} style={s.petTag}>
                    <Text style={s.petTagText}>{p.emoji} {p.name} ({p.breed})</Text>
                  </View>
                ))}
              </View>
            )}
          </Pressable>
        )}
      />
    </View>
  );
}

export default function ExploreScreen() {
  const { state } = useApp();
  const isCaretaker = state.profile.role === "caretaker";
  const params = useLocalSearchParams<{ tab?: string }>();

  return (
    <ScreenContainer>
      <View style={s.screenHeader}>
        <Text style={s.screenTitle}>{isCaretaker ? "요청 찾기" : "찾기"}</Text>
      </View>
      {isCaretaker ? <CaretakerExplore initialTab={params.tab} /> : <OwnerExplore initialTab={params.tab} />}
    </ScreenContainer>
  );
}

const s = StyleSheet.create({
  // Screen Header
  screenHeader: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 8,
  },
  screenTitle: {
    fontFamily: Fonts.extraBold,
    fontSize: 24,
    color: "#1A1A1A",
    letterSpacing: -0.5,
  },

  // Search Bar
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginBottom: 4,
    backgroundColor: "#F5F5F5",
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 42,
    gap: 8,
  },
  searchIcon: { fontSize: 14 },
  searchInput: {
    flex: 1,
    fontFamily: Fonts.regular,
    fontSize: 14,
    color: "#1A1A1A",
    paddingVertical: 0,
  },
  searchClear: {
    fontFamily: Fonts.medium,
    fontSize: 14,
    color: "#AEAEB2",
    padding: 4,
  },

  // Tabs
  tab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "#E5E5EA",
    backgroundColor: "#fff",
  },
  tabActive: {
    borderColor: "#FF6B35",
    backgroundColor: "#FFF5F0",
  },
  tabEmoji: { fontSize: 14 },
  tabLabel: {
    fontFamily: Fonts.semiBold,
    fontSize: 13,
    color: "#8E8E93",
  },
  tabLabelActive: { color: "#FF6B35" },
  caretakerTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#E5E5EA",
    backgroundColor: "#fff",
  },

  // Neighborhood Chips
  neighborhoodChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E5E5EA",
  },
  neighborhoodChipActive: {
    borderColor: "#FF6B35",
    backgroundColor: "#FFF5F0",
  },
  neighborhoodChipText: {
    fontFamily: Fonts.medium,
    fontSize: 12,
    color: "#8E8E93",
  },
  neighborhoodChipTextActive: {
    fontFamily: Fonts.bold,
    color: "#FF6B35",
  },

  // Filter Panel
  filterPanel: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  sortChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: "#F5F5F5",
  },
  sortChipActive: {
    backgroundColor: "#FF6B35",
  },
  sortChipText: {
    fontFamily: Fonts.medium,
    fontSize: 12,
    color: "#636366",
  },
  sortChipTextActive: {
    fontFamily: Fonts.bold,
    color: "#FFFFFF",
  },
  filterDivider: {
    width: 1,
    height: 20,
    backgroundColor: "#E5E5EA",
    alignSelf: "center",
    marginHorizontal: 4,
  },
  filterChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E5EA",
    backgroundColor: "#fff",
  },
  filterChipActive: {
    borderColor: "#FF6B35",
    backgroundColor: "#FFF5F0",
  },
  filterChipText: {
    fontFamily: Fonts.medium,
    fontSize: 12,
    color: "#8E8E93",
  },
  filterChipTextActive: {
    fontFamily: Fonts.semiBold,
    color: "#FF6B35",
  },

  // Result Count
  resultCount: {
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  resultCountText: {
    fontFamily: Fonts.medium,
    fontSize: 12,
    color: "#AEAEB2",
  },

  // Walker Card
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
    backgroundColor: "#FFF5F0",
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
  walkerStats: {
    flexDirection: "row",
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F5F5F5",
  },
  walkerStatItem: {
    flex: 1,
    alignItems: "center",
  },
  walkerStatValue: {
    fontFamily: Fonts.bold,
    fontSize: 13,
    color: "#1A1A1A",
  },
  walkerStatLabel: {
    fontFamily: Fonts.regular,
    fontSize: 10,
    color: "#AEAEB2",
    marginTop: 1,
  },
  walkerStatDivider: {
    width: 1,
    height: 24,
    backgroundColor: "#F0F0F0",
    alignSelf: "center",
  },
  walkerTags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 10,
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
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  trainerText: {
    fontFamily: Fonts.bold,
    fontSize: 9,
    color: "#E65100",
  },
  serviceTag: {
    backgroundColor: "#F0FFF4",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: "#C8E6C9",
  },
  serviceTagText: {
    fontFamily: Fonts.medium,
    fontSize: 10,
    color: "#34C759",
  },
  largeDogTag: {
    backgroundColor: "#E3F2FD",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: "#BBDEFB",
  },
  largeDogTagText: {
    fontFamily: Fonts.medium,
    fontSize: 10,
    color: "#1976D2",
  },
  responseTag: {
    backgroundColor: "#FFF8E1",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: "#FFECB3",
  },
  responseTagText: {
    fontFamily: Fonts.medium,
    fontSize: 10,
    color: "#F57F17",
  },
  petTag: {
    backgroundColor: "#FFF5F0",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: "#FFD9C7",
  },
  petTagText: {
    fontFamily: Fonts.medium,
    fontSize: 10,
    color: "#FF6B35",
  },
  ratingText: {
    fontFamily: Fonts.bold,
    fontSize: 13,
    color: "#FF9500",
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
  requestDetail: {
    fontFamily: Fonts.medium,
    fontSize: 11,
    color: "#636366",
    marginTop: 4,
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
  createBtn: {
    backgroundColor: "#FF6B35",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 8,
  },
  createBtnText: {
    fontFamily: Fonts.bold,
    color: "#fff",
    fontSize: 15,
  },

  // Empty & Info
  emptyCard: {
    alignItems: "center",
    padding: 40,
    gap: 8,
  },
  emptyText: {
    fontFamily: Fonts.medium,
    fontSize: 15,
    color: "#AEAEB2",
  },
  emptySubText: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    color: "#C7C7CC",
  },
  infoCard: {
    backgroundColor: "#F0FFF4",
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#C8E6C9",
  },
  infoCardText: {
    fontFamily: Fonts.medium,
    fontSize: 13,
    color: "#34C759",
    lineHeight: 18,
  },
});
