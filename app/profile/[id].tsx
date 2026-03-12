import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useLocalSearchParams, useRouter } from "expo-router";
import { MOCK_CARETAKERS, MOCK_OWNERS } from "@/lib/mock-data";
import { useApp } from "@/lib/app-context";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

function haptic() {
  if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

const SAMPLE_REVIEWS = [
  { id: "rv1", author: "말티즈 아빠", rating: 5, text: "정말 꼼꼼하게 돌봐주셨어요! 강아지도 좋아했어요 🐾", date: "2주 전" },
  { id: "rv2", author: "포메 집사", rating: 5, text: "시간 약속도 잘 지키시고 중간에 사진도 보내주셔서 안심됐어요", date: "1달 전" },
  { id: "rv3", author: "골든이 맘", rating: 4, text: "친절하고 믿음직스러웠어요. 다음에도 부탁드릴게요!", date: "2달 전" },
];

export default function ProfileDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { state } = useApp();
  const isCaretaker = state.profile.role === "caretaker";
  const [requested, setRequested] = useState(false);

  const allUsers = [...MOCK_CARETAKERS, ...MOCK_OWNERS];
  const user = allUsers.find((u) => u.id === id);

  if (!user) {
    return (
      <ScreenContainer className="p-6">
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ fontSize: 48 }}>😕</Text>
          <Text style={{ fontSize: 18, fontWeight: "700", color: "#555", marginTop: 12 }}>
            프로필을 찾을 수 없어요
          </Text>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>돌아가기</Text>
          </Pressable>
        </View>
      </ScreenContainer>
    );
  }

  const isUserCaretaker = user.role === "caretaker";

  const handleRequest = () => {
    haptic();
    setRequested(true);
  };

  return (
    <ScreenContainer edges={["top", "left", "right", "bottom"]}>
      {/* 헤더 */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.backBtnSmall, pressed && { opacity: 0.7 }]}>
          <Text style={styles.backBtnSmallText}>‹</Text>
        </Pressable>
        <Text style={styles.headerTitle}>프로필</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* 프로필 헤더 */}
        <View style={[styles.profileHeader, isUserCaretaker ? styles.profileHeaderGreen : styles.profileHeaderOrange]}>
          <View style={styles.avatarWrap}>
            <Text style={styles.avatarEmoji}>{user.profileEmoji}</Text>
            {isUserCaretaker && (user as any).isActive && (
              <View style={styles.activeDot} />
            )}
          </View>
          <Text style={styles.userName}>{user.nickname}</Text>
          <View style={[styles.roleBadge, isUserCaretaker ? styles.roleBadgeGreen : styles.roleBadgeOrange]}>
            <Text style={styles.roleBadgeText}>
              {isUserCaretaker ? "🏠 돌보미" : "🐶 반려인"}
            </Text>
          </View>
          <View style={styles.neighborhoodBadge}>
            <Text style={styles.neighborhoodBadgeText}>📍 {user.neighborhood}</Text>
            {user.distance && <Text style={styles.distanceText}> · {user.distance}</Text>}
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>⭐ {user.rating}</Text>
              <Text style={styles.statLabel}>평점</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{user.reviewCount}</Text>
              <Text style={styles.statLabel}>후기</Text>
            </View>
          </View>
        </View>

        <View style={{ padding: 16, gap: 16 }}>
          {/* 소개 */}
          <View style={styles.infoCard}>
            <Text style={styles.infoCardTitle}>소개</Text>
            <Text style={styles.infoCardText}>{user.bio}</Text>
          </View>

          {/* 제공 서비스 (돌보미) */}
          {isUserCaretaker && (user as any).services && (
            <View style={styles.infoCard}>
              <Text style={styles.infoCardTitle}>제공 서비스</Text>
              <View style={{ gap: 8 }}>
                {(user as any).services.map((s: string) => (
                  <View key={s} style={styles.serviceItem}>
                    <Text style={styles.serviceEmoji}>
                      {s === "긴급 방문 돌봄" ? "🚨" : "🦮"}
                    </Text>
                    <Text style={styles.serviceText}>{s}</Text>
                    <View style={styles.availBadge}>
                      <Text style={styles.availBadgeText}>
                        {(user as any).isActive ? "가능" : "불가"}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* 반려동물 (반려인) */}
          {!isUserCaretaker && (user as any).pets && (
            <View style={styles.infoCard}>
              <Text style={styles.infoCardTitle}>반려동물</Text>
              <View style={{ gap: 8 }}>
                {(user as any).pets.map((p: any) => (
                  <View key={p.name} style={styles.petItem}>
                    <Text style={{ fontSize: 32 }}>{p.emoji}</Text>
                    <View>
                      <Text style={styles.petName}>{p.name}</Text>
                      <Text style={styles.petInfo}>{p.breed} · {p.size}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* 후기 */}
          <View style={styles.infoCard}>
            <Text style={styles.infoCardTitle}>후기 ({SAMPLE_REVIEWS.length})</Text>
            <View style={{ gap: 12 }}>
              {SAMPLE_REVIEWS.map((rv) => (
                <View key={rv.id} style={styles.reviewItem}>
                  <View style={styles.reviewHeader}>
                    <Text style={styles.reviewAuthor}>{rv.author}</Text>
                    <Text style={styles.reviewDate}>{rv.date}</Text>
                  </View>
                  <View style={styles.reviewStars}>
                    {Array.from({ length: rv.rating }).map((_, i) => (
                      <Text key={i} style={styles.star}>⭐</Text>
                    ))}
                  </View>
                  <Text style={styles.reviewText}>{rv.text}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>

      {/* 하단 버튼 */}
      {!isCaretaker && (
        <View style={styles.bottomActions}>
          {requested ? (
            <View style={styles.requestedCard}>
              <Text style={styles.requestedText}>✅ 요청이 전송됐어요!</Text>
            </View>
          ) : (
            <Pressable
              onPress={handleRequest}
              style={({ pressed }) => [
                styles.requestBtn,
                isUserCaretaker ? styles.requestBtnGreen : styles.requestBtnOrange,
                pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
              ]}
            >
              <Text style={styles.requestBtnText}>
                {isUserCaretaker ? "🏠 돌봄 요청하기" : "🚶 산책 친구 요청"}
              </Text>
            </Pressable>
          )}
        </View>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  headerTitle: { fontSize: 17, fontWeight: "700", color: "#1A1A1A" },
  backBtnSmall: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F5F5F5",
    alignItems: "center",
    justifyContent: "center",
  },
  backBtnSmallText: { fontSize: 22, color: "#555", lineHeight: 28 },
  profileHeader: {
    alignItems: "center",
    paddingVertical: 28,
    paddingHorizontal: 16,
    gap: 8,
  },
  profileHeaderOrange: { backgroundColor: "#FFF3EE" },
  profileHeaderGreen: { backgroundColor: "#F0FFF4" },
  avatarWrap: {
    position: "relative",
    width: 80,
    height: 80,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    borderRadius: 40,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 4,
  },
  avatarEmoji: { fontSize: 40 },
  activeDot: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#4CAF82",
    borderWidth: 2.5,
    borderColor: "#fff",
  },
  userName: { fontSize: 22, fontWeight: "800", color: "#1A1A1A" },
  roleBadge: { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 5 },
  roleBadgeOrange: { backgroundColor: "#FF7043" },
  roleBadgeGreen: { backgroundColor: "#4CAF82" },
  roleBadgeText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  neighborhoodBadge: { flexDirection: "row", alignItems: "center" },
  neighborhoodBadgeText: { fontSize: 13, color: "#555" },
  distanceText: { fontSize: 13, color: "#9E9E9E" },
  statsRow: { flexDirection: "row", alignItems: "center", gap: 24, marginTop: 4 },
  statItem: { alignItems: "center", gap: 2 },
  statValue: { fontSize: 18, fontWeight: "800", color: "#1A1A1A" },
  statLabel: { fontSize: 11, color: "#757575" },
  statDivider: { width: 1, height: 28, backgroundColor: "#E0E0E0" },
  infoCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#F0F0F0",
    gap: 12,
  },
  infoCardTitle: { fontSize: 15, fontWeight: "700", color: "#1A1A1A" },
  infoCardText: { fontSize: 14, color: "#555", lineHeight: 22 },
  serviceItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#FAFAFA",
    borderRadius: 10,
    padding: 10,
  },
  serviceEmoji: { fontSize: 22 },
  serviceText: { flex: 1, fontSize: 14, fontWeight: "600", color: "#1A1A1A" },
  availBadge: { backgroundColor: "#F0FFF4", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  availBadgeText: { fontSize: 11, color: "#4CAF82", fontWeight: "700" },
  petItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FAFAFA",
    borderRadius: 10,
    padding: 10,
  },
  petName: { fontSize: 15, fontWeight: "700", color: "#1A1A1A" },
  petInfo: { fontSize: 12, color: "#757575", marginTop: 2 },
  reviewItem: {
    borderBottomWidth: 1,
    borderBottomColor: "#F5F5F5",
    paddingBottom: 12,
    gap: 4,
  },
  reviewHeader: { flexDirection: "row", justifyContent: "space-between" },
  reviewAuthor: { fontSize: 13, fontWeight: "700", color: "#1A1A1A" },
  reviewDate: { fontSize: 12, color: "#9E9E9E" },
  reviewStars: { flexDirection: "row", gap: 2 },
  star: { fontSize: 12 },
  reviewText: { fontSize: 13, color: "#555", lineHeight: 20 },
  bottomActions: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
    backgroundColor: "#fff",
  },
  requestBtn: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  requestBtnOrange: { backgroundColor: "#FF7043" },
  requestBtnGreen: { backgroundColor: "#4CAF82" },
  requestBtnText: { color: "#fff", fontSize: 17, fontWeight: "700" },
  requestedCard: {
    backgroundColor: "#F0FFF4",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#C8E6C9",
  },
  requestedText: { fontSize: 16, fontWeight: "700", color: "#4CAF82" },
  backBtn: {
    marginTop: 16,
    backgroundColor: "#FF7043",
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  backBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});
