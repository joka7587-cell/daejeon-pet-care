import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Alert,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useApp, UserRole, Neighborhood, Pet } from "@/lib/app-context";
import { NEIGHBORHOODS } from "@/lib/mock-data";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

function haptic() {
  if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

export default function ProfileScreen() {
  const { state, dispatch } = useApp();
  const { profile } = state;
  const isCaretaker = profile.role === "caretaker";
  const [showNeighborhoodPicker, setShowNeighborhoodPicker] = useState(false);
  const [editingNickname, setEditingNickname] = useState(false);
  const [tempNickname, setTempNickname] = useState(profile.nickname);

  const handleRoleSwitch = () => {
    haptic();
    const newRole: UserRole = isCaretaker ? "owner" : "caretaker";
    dispatch({ type: "SET_ROLE", payload: newRole });
  };

  const handleNeighborhoodChange = (n: Neighborhood) => {
    haptic();
    dispatch({ type: "SET_NEIGHBORHOOD", payload: n });
    setShowNeighborhoodPicker(false);
  };

  const handleAddPet = () => {
    haptic();
    const samplePets: Pet[] = [
      { id: Date.now().toString(), name: "초코", breed: "포메라니안", age: 2, size: "소형", emoji: "🦊" },
      { id: Date.now().toString(), name: "뭉치", breed: "골든 리트리버", age: 3, size: "대형", emoji: "🐕" },
      { id: Date.now().toString(), name: "콩이", breed: "말티즈", age: 1, size: "소형", emoji: "🐩" },
    ];
    const randomPet = samplePets[Math.floor(Math.random() * samplePets.length)];
    dispatch({ type: "ADD_PET", payload: randomPet });
  };

  const handleResetOnboarding = () => {
    haptic();
    dispatch({ type: "SET_ONBOARDED", payload: false });
  };

  return (
    <ScreenContainer className="pt-2">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        {/* 프로필 헤더 */}
        <View style={[styles.profileHeader, isCaretaker ? styles.profileHeaderGreen : styles.profileHeaderOrange]}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarEmoji}>{isCaretaker ? "🏠" : "🐶"}</Text>
          </View>
          <Text style={styles.profileName}>{profile.nickname || "닉네임 미설정"}</Text>
          <View style={[styles.roleBadge, isCaretaker ? styles.roleBadgeGreen : styles.roleBadgeOrange]}>
            <Text style={styles.roleBadgeText}>
              {isCaretaker ? "🏠 돌보미" : "🐶 반려인"}
            </Text>
          </View>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{profile.rating > 0 ? profile.rating.toFixed(1) : "-"}</Text>
              <Text style={styles.statLabel}>평점</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{profile.reviewCount}</Text>
              <Text style={styles.statLabel}>후기</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{profile.pets.length}</Text>
              <Text style={styles.statLabel}>반려동물</Text>
            </View>
          </View>
        </View>

        <View style={{ paddingHorizontal: 16, gap: 16, marginTop: 16 }}>
          {/* 기본 정보 */}
          <SectionCard title="기본 정보">
            <InfoRow label="닉네임" value={profile.nickname || "미설정"} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>동네</Text>
              <Pressable
                onPress={() => { haptic(); setShowNeighborhoodPicker(!showNeighborhoodPicker); }}
                style={({ pressed }) => [styles.editBtn, pressed && { opacity: 0.7 }]}
              >
                <Text style={styles.editBtnText}>
                  📍 {profile.neighborhood || "미설정"} ✏️
                </Text>
              </Pressable>
            </View>

            {showNeighborhoodPicker && (
              <View style={styles.neighborhoodPicker}>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  {NEIGHBORHOODS.map((n) => (
                    <Pressable
                      key={n}
                      onPress={() => handleNeighborhoodChange(n as Neighborhood)}
                      style={({ pressed }) => [
                        styles.neighborhoodChip,
                        profile.neighborhood === n && styles.neighborhoodChipActive,
                        pressed && { opacity: 0.7 },
                      ]}
                    >
                      <Text style={[
                        styles.neighborhoodChipText,
                        profile.neighborhood === n && styles.neighborhoodChipTextActive,
                      ]}>
                        {n}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}
          </SectionCard>

          {/* 반려동물 (반려인 전용) */}
          {!isCaretaker && (
            <SectionCard title="내 반려동물">
              {profile.pets.length === 0 ? (
                <Text style={styles.emptyText}>등록된 반려동물이 없어요</Text>
              ) : (
                profile.pets.map((pet) => (
                  <View key={pet.id} style={styles.petCard}>
                    <Text style={{ fontSize: 32 }}>{pet.emoji}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.petName}>{pet.name}</Text>
                      <Text style={styles.petInfo}>{pet.breed} · {pet.age}살 · {pet.size}</Text>
                    </View>
                  </View>
                ))
              )}
              <Pressable
                onPress={handleAddPet}
                style={({ pressed }) => [styles.addPetBtn, pressed && { opacity: 0.7 }]}
              >
                <Text style={styles.addPetBtnText}>+ 반려동물 추가</Text>
              </Pressable>
            </SectionCard>
          )}

          {/* 돌보미 서비스 (돌보미 전용) */}
          {isCaretaker && (
            <SectionCard title="제공 서비스">
              <View style={styles.serviceList}>
                <View style={styles.serviceItem}>
                  <Text style={styles.serviceEmoji}>🚨</Text>
                  <Text style={styles.serviceText}>긴급 방문 돌봄</Text>
                  <View style={styles.serviceAvailBadge}>
                    <Text style={styles.serviceAvailText}>제공 가능</Text>
                  </View>
                </View>
                <View style={styles.serviceItem}>
                  <Text style={styles.serviceEmoji}>🦮</Text>
                  <Text style={styles.serviceText}>대신 산책</Text>
                  <View style={styles.serviceAvailBadge}>
                    <Text style={styles.serviceAvailText}>제공 가능</Text>
                  </View>
                </View>
              </View>
              <View style={styles.caretakerNote}>
                <Text style={styles.caretakerNoteText}>
                  💡 돌보미는 긴급 방문 돌봄과 대신 산책 서비스만 제공할 수 있어요
                </Text>
              </View>
            </SectionCard>
          )}

          {/* 역할 전환 */}
          <SectionCard title="역할 설정">
            <Text style={styles.roleDesc}>
              현재 역할: <Text style={{ fontWeight: "700", color: isCaretaker ? "#4CAF82" : "#FF7043" }}>
                {isCaretaker ? "돌보미" : "반려인"}
              </Text>
            </Text>
            <Text style={styles.roleSubDesc}>
              {isCaretaker
                ? "반려인으로 전환하면 모든 서비스를 이용할 수 있어요"
                : "돌보미로 전환하면 요청을 받고 서비스를 제공할 수 있어요"}
            </Text>
            <Pressable
              onPress={handleRoleSwitch}
              style={({ pressed }) => [
                styles.roleSwitchBtn,
                isCaretaker ? styles.roleSwitchBtnOrange : styles.roleSwitchBtnGreen,
                pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
              ]}
            >
              <Text style={styles.roleSwitchBtnText}>
                {isCaretaker ? "🐶 반려인으로 전환" : "🏠 돌보미로 전환"}
              </Text>
            </Pressable>
          </SectionCard>

          {/* 앱 설정 */}
          <SectionCard title="앱 설정">
            <Pressable
              onPress={handleResetOnboarding}
              style={({ pressed }) => [styles.settingRow, pressed && { opacity: 0.7 }]}
            >
              <Text style={styles.settingText}>온보딩 다시 보기</Text>
              <Text style={styles.settingArrow}>›</Text>
            </Pressable>
          </SectionCard>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  profileHeader: {
    alignItems: "center",
    paddingVertical: 28,
    paddingHorizontal: 16,
    gap: 8,
  },
  profileHeaderOrange: { backgroundColor: "#FFF3EE" },
  profileHeaderGreen: { backgroundColor: "#F0FFF4" },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 4,
  },
  avatarEmoji: { fontSize: 40 },
  profileName: { fontSize: 22, fontWeight: "800", color: "#1A1A1A" },
  roleBadge: { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 5 },
  roleBadgeOrange: { backgroundColor: "#FF7043" },
  roleBadgeGreen: { backgroundColor: "#4CAF82" },
  roleBadgeText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  statsRow: { flexDirection: "row", alignItems: "center", marginTop: 8, gap: 24 },
  statItem: { alignItems: "center", gap: 2 },
  statValue: { fontSize: 20, fontWeight: "800", color: "#1A1A1A" },
  statLabel: { fontSize: 11, color: "#757575" },
  statDivider: { width: 1, height: 28, backgroundColor: "#E0E0E0" },
  sectionCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#F0F0F0",
    gap: 12,
  },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#1A1A1A" },
  infoRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  infoLabel: { fontSize: 14, color: "#757575" },
  infoValue: { fontSize: 14, fontWeight: "600", color: "#1A1A1A" },
  editBtn: { paddingHorizontal: 10, paddingVertical: 4, backgroundColor: "#F5F5F5", borderRadius: 8 },
  editBtnText: { fontSize: 13, color: "#FF7043", fontWeight: "600" },
  neighborhoodPicker: {
    backgroundColor: "#FAFAFA",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#F0F0F0",
  },
  neighborhoodChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    backgroundColor: "#fff",
  },
  neighborhoodChipActive: { borderColor: "#FF7043", backgroundColor: "#FFF3EE" },
  neighborhoodChipText: { fontSize: 13, color: "#555" },
  neighborhoodChipTextActive: { color: "#FF7043", fontWeight: "700" },
  emptyText: { fontSize: 13, color: "#9E9E9E", textAlign: "center", paddingVertical: 8 },
  petCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FAFAFA",
    borderRadius: 12,
    padding: 12,
  },
  petName: { fontSize: 15, fontWeight: "700", color: "#1A1A1A" },
  petInfo: { fontSize: 12, color: "#757575", marginTop: 2 },
  addPetBtn: {
    borderWidth: 1.5,
    borderColor: "#FF7043",
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center",
    borderStyle: "dashed",
  },
  addPetBtnText: { color: "#FF7043", fontSize: 14, fontWeight: "600" },
  serviceList: { gap: 10 },
  serviceItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#FAFAFA",
    borderRadius: 12,
    padding: 12,
  },
  serviceEmoji: { fontSize: 24 },
  serviceText: { flex: 1, fontSize: 14, fontWeight: "600", color: "#1A1A1A" },
  serviceAvailBadge: { backgroundColor: "#F0FFF4", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  serviceAvailText: { fontSize: 11, color: "#4CAF82", fontWeight: "700" },
  caretakerNote: {
    backgroundColor: "#F0FFF4",
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: "#C8E6C9",
  },
  caretakerNoteText: { fontSize: 12, color: "#4CAF82", lineHeight: 18 },
  roleDesc: { fontSize: 14, color: "#555" },
  roleSubDesc: { fontSize: 13, color: "#9E9E9E", lineHeight: 18 },
  roleSwitchBtn: {
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  roleSwitchBtnOrange: { backgroundColor: "#FF7043" },
  roleSwitchBtnGreen: { backgroundColor: "#4CAF82" },
  roleSwitchBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  settingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
  settingText: { fontSize: 14, color: "#555" },
  settingArrow: { fontSize: 20, color: "#9E9E9E" },
});
