import {
  ScrollView,
  View,
  Text,
  Pressable,
  StyleSheet,
  Image,
  FlatList,
  Modal,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { ScreenContainer } from "@/components/screen-container";
import { useApp } from "@/lib/app-context";
import { getWorkerDetail, getCertificationEmoji } from "@/lib/worker-details";
import { MOCK_CARETAKERS } from "@/lib/mock-data";
import { Fonts } from "@/hooks/use-fonts";
import * as Haptics from "expo-haptics";

const haptic = () => {
  try {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch {}
};

export default function WorkerDetailScreen() {
  const { workerId } = useLocalSearchParams<{ workerId: string }>();
  const router = useRouter();
  const { state, dispatch } = useApp();
  const [selectedTab, setSelectedTab] = useState<"info" | "experience" | "equipment">("info");
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImageUri, setSelectedImageUri] = useState("");

  const workerDetail = useMemo(() => {
    if (!workerId) return null;
    return getWorkerDetail(workerId);
  }, [workerId]);

  const worker = useMemo(() => {
    if (!workerId) return null;
    return MOCK_CARETAKERS.find((c) => c.id === workerId);
  }, [workerId]);

  if (!workerDetail || !worker) {
    return (
      <ScreenContainer className="bg-white">
        <View style={s.centerContainer}>
          <Text style={s.errorText}>워커 정보를 찾을 수 없습니다.</Text>
        </View>
      </ScreenContainer>
    );
  }

  const handleStartChat = () => {
    haptic();
    const roomId = `room_worker_${workerId}`;
    const existingRoom = (state.chatRooms || []).find((r) => r.id === roomId);

    if (!existingRoom) {
      dispatch({
        type: "ADD_CHAT_ROOM",
        payload: {
          id: roomId,
          participantId: workerId,
          participantName: workerDetail.nickname,
          participantEmoji: workerDetail.profileEmoji,
          type: "worker",
          lastMessage: "대화를 시작하세요",
          lastMessageTime: new Date().toISOString(),
          unreadCount: 0,
        },
      });
    }

    router.push(`/chat/${roomId}` as never);
  };

  return (
    <ScreenContainer className="bg-white">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        {/* 헤더 - 뒤로가기 + 공유 */}
        <View style={s.header}>
          <Pressable
            onPress={() => {
              haptic();
              router.back();
            }}
            style={({ pressed }) => [s.headerBtn, pressed && { opacity: 0.7 }]}
          >
            <Text style={{ fontSize: 24 }}>‹</Text>
          </Pressable>
          <Text style={s.headerTitle}>워커 프로필</Text>
          <Pressable style={({ pressed }) => [s.headerBtn, pressed && { opacity: 0.7 }]}>
            <Text style={{ fontSize: 20 }}>⋯</Text>
          </Pressable>
        </View>

        {/* 프로필 카드 */}
        <View style={s.profileCard}>
          <View style={s.profileHeader}>
            <Text style={s.profileEmoji}>{workerDetail.profileEmoji}</Text>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Text style={s.profileName}>{workerDetail.nickname}</Text>
                {workerDetail.isVerified && (
                  <View style={s.verifiedBadge}>
                    <Text style={s.verifiedText}>✓ 인증</Text>
                  </View>
                )}
              </View>
              {workerDetail.specialBadge && (
                <View style={s.specialBadge}>
                  <Text style={s.specialBadgeText}>{workerDetail.specialBadge}</Text>
                </View>
              )}
              <Text style={s.profileBio}>{workerDetail.bio}</Text>
            </View>
          </View>

          {/* 평점 + 가격 */}
          <View style={s.profileStats}>
            <View style={s.statItem}>
              <Text style={s.statLabel}>평점</Text>
              <Text style={s.statValue}>⭐ {workerDetail.rating}</Text>
              <Text style={s.statSubtext}>({workerDetail.reviewCount}건)</Text>
            </View>
            <View style={s.statDivider} />
            <View style={s.statItem}>
              <Text style={s.statLabel}>시간당</Text>
              <Text style={s.statValue}>₩{workerDetail.pricePerHour.toLocaleString()}</Text>
            </View>
            <View style={s.statDivider} />
            <View style={s.statItem}>
              <Text style={s.statLabel}>응답</Text>
              <Text style={s.statValue}>{workerDetail.responseTime}</Text>
            </View>
          </View>

          {/* 소개 텍스트 */}
          <View style={s.introSection}>
            <Text style={s.introTitle}>소개</Text>
            <Text style={s.introText}>{workerDetail.introduction}</Text>
          </View>

          {/* 특이사항 */}
          <View style={s.notesSection}>
            <Text style={s.notesTitle}>특이사항</Text>
            <Text style={s.notesText}>{workerDetail.specialNotes}</Text>
          </View>
        </View>

        {/* 탭 네비게이션 */}
        <View style={s.tabNav}>
          <Pressable
            onPress={() => {
              haptic();
              setSelectedTab("info");
            }}
            style={[s.tabButton, selectedTab === "info" && s.tabButtonActive]}
          >
            <Text style={[s.tabText, selectedTab === "info" && s.tabTextActive]}>정보</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              haptic();
              setSelectedTab("experience");
            }}
            style={[s.tabButton, selectedTab === "experience" && s.tabButtonActive]}
          >
            <Text style={[s.tabText, selectedTab === "experience" && s.tabTextActive]}>경력</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              haptic();
              setSelectedTab("equipment");
            }}
            style={[s.tabButton, selectedTab === "equipment" && s.tabButtonActive]}
          >
            <Text style={[s.tabText, selectedTab === "equipment" && s.tabTextActive]}>장비</Text>
          </Pressable>
        </View>

        {/* 탭 콘텐츠 - 정보 */}
        {selectedTab === "info" && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>자격증 & 인증</Text>
            <View style={{ gap: 12 }}>
              {workerDetail.certifications.map((cert) => (
                <Pressable
                  key={cert.id}
                  onPress={() => {
                    haptic();
                    setSelectedImageUri(cert.imageUri);
                    setShowImageModal(true);
                  }}
                  style={({ pressed }) => [s.certCard, pressed && { opacity: 0.85 }]}
                >
                  <View style={s.certIcon}>
                    <Text style={{ fontSize: 28 }}>{getCertificationEmoji(cert.name)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.certName}>{cert.name}</Text>
                    <Text style={s.certIssuer}>{cert.issuer}</Text>
                    <Text style={s.certDate}>{cert.issueDate}</Text>
                  </View>
                  {cert.verified && <View style={s.verifiedMark} />}
                </Pressable>
              ))}
            </View>

            {/* 서비스 정보 */}
            <Text style={[s.sectionTitle, { marginTop: 24 }]}>제공 서비스</Text>
            <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
              {workerDetail.services.map((svc) => (
                <View key={svc} style={s.serviceTag}>
                  <Text style={s.serviceTagText}>{svc}</Text>
                </View>
              ))}
              {workerDetail.canHandleLargeDogs && (
                <View style={s.serviceTag}>
                  <Text style={s.serviceTagText}>🐕 대형견 OK</Text>
                </View>
              )}
              {workerDetail.hasTrainerCert && (
                <View style={[s.serviceTag, { backgroundColor: "#FFF3E0" }]}>
                  <Text style={[s.serviceTagText, { color: "#E65100" }]}>🏆 훈련사</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* 탭 콘텐츠 - 경력 */}
        {selectedTab === "experience" && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>대전 지역 산책 경력</Text>
            <View style={{ gap: 12 }}>
              {workerDetail.experiences.map((exp, idx) => (
                <View key={idx} style={s.experienceCard}>
                  <View style={s.expHeader}>
                    <Text style={s.expDistrict}>{exp.district}</Text>
                    <Text style={s.expYears}>{exp.years}년 경력</Text>
                  </View>
                  <Text style={s.expSpec}>{exp.specialization}</Text>
                  <View style={s.expStats}>
                    <View style={s.expStatItem}>
                      <Text style={s.expStatLabel}>완료 산책</Text>
                      <Text style={s.expStatValue}>{exp.completedWalks}회</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* 탭 콘텐츠 - 장비 */}
        {selectedTab === "equipment" && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>보유 장비</Text>
            <View style={{ gap: 10 }}>
              {workerDetail.equipment.map((eq) => (
                <View key={eq.id} style={s.equipmentCard}>
                  <View style={s.equipmentIcon}>
                    <Text style={{ fontSize: 24 }}>{eq.icon}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.equipmentName}>{eq.name}</Text>
                    <Text style={s.equipmentDesc}>{eq.description}</Text>
                  </View>
                  {eq.available && <View style={s.availableBadge} />}
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {/* 하단 액션 버튼 */}
      <View style={s.bottomActions}>
        <Pressable
          onPress={handleStartChat}
          style={({ pressed }) => [
            s.chatButton,
            pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
          ]}
        >
          <Text style={s.chatButtonText}>💬 산책 예약 상담하기</Text>
        </Pressable>
      </View>

      {/* 이미지 모달 */}
      <Modal visible={showImageModal} transparent animationType="fade">
        <Pressable
          style={s.modalOverlay}
          onPress={() => setShowImageModal(false)}
        >
          <View style={s.modalContent}>
            <Text style={{ fontSize: 32, color: "#fff", marginBottom: 12 }}>
              {getCertificationEmoji(
                workerDetail.certifications.find((c) => c.imageUri === selectedImageUri)?.name || ""
              )}
            </Text>
            <Text style={s.modalText}>
              {workerDetail.certifications.find((c) => c.imageUri === selectedImageUri)?.name}
            </Text>
            <Pressable
              onPress={() => setShowImageModal(false)}
              style={s.modalCloseBtn}
            >
              <Text style={{ fontSize: 28, color: "#fff" }}>✕</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </ScreenContainer>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  headerBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontFamily: Fonts.bold,
    fontSize: 16,
    color: "#1A1A1A",
  },
  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  errorText: {
    fontFamily: Fonts.regular,
    fontSize: 16,
    color: "#8E8E93",
  },

  // 프로필 카드
  profileCard: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 20,
    backgroundColor: "#FFF8F5",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#FFE0D0",
  },
  profileHeader: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  profileEmoji: {
    fontSize: 48,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#fff",
    textAlign: "center",
    lineHeight: 60,
  },
  profileName: {
    fontFamily: Fonts.bold,
    fontSize: 18,
    color: "#1A1A1A",
  },
  verifiedBadge: {
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  verifiedText: {
    fontFamily: Fonts.medium,
    fontSize: 12,
    color: "#2E7D32",
  },
  specialBadge: {
    backgroundColor: "#FF6B35",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 4,
    alignSelf: "flex-start",
  },
  specialBadgeText: {
    fontFamily: Fonts.bold,
    fontSize: 11,
    color: "#fff",
  },
  profileBio: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    color: "#666",
    marginTop: 4,
  },

  // 통계
  profileStats: {
    flexDirection: "row",
    gap: 0,
    marginBottom: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#FFD0B8",
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statLabel: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    color: "#999",
    marginBottom: 4,
  },
  statValue: {
    fontFamily: Fonts.bold,
    fontSize: 14,
    color: "#FF6B35",
  },
  statSubtext: {
    fontFamily: Fonts.regular,
    fontSize: 11,
    color: "#999",
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    backgroundColor: "#FFD0B8",
  },

  // 소개
  introSection: {
    marginBottom: 12,
  },
  introTitle: {
    fontFamily: Fonts.bold,
    fontSize: 13,
    color: "#1A1A1A",
    marginBottom: 6,
  },
  introText: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    color: "#555",
    lineHeight: 20,
  },

  // 특이사항
  notesSection: {},
  notesTitle: {
    fontFamily: Fonts.bold,
    fontSize: 13,
    color: "#1A1A1A",
    marginBottom: 6,
  },
  notesText: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    color: "#666",
    lineHeight: 18,
  },

  // 탭 네비게이션
  tabNav: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
    gap: 0,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabButtonActive: {
    borderBottomColor: "#FF6B35",
  },
  tabText: {
    fontFamily: Fonts.medium,
    fontSize: 14,
    color: "#999",
  },
  tabTextActive: {
    color: "#FF6B35",
    fontFamily: Fonts.bold,
  },

  // 섹션
  section: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontFamily: Fonts.bold,
    fontSize: 15,
    color: "#1A1A1A",
    marginBottom: 12,
  },

  // 자격증 카드
  certCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  certIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#F5F5F5",
    alignItems: "center",
    justifyContent: "center",
  },
  certName: {
    fontFamily: Fonts.bold,
    fontSize: 13,
    color: "#1A1A1A",
  },
  certIssuer: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
  certDate: {
    fontFamily: Fonts.regular,
    fontSize: 11,
    color: "#999",
    marginTop: 2,
  },
  verifiedMark: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#4CAF50",
    alignItems: "center",
    justifyContent: "center",
  },

  // 서비스 태그
  serviceTag: {
    backgroundColor: "#E3F2FD",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  serviceTagText: {
    fontFamily: Fonts.medium,
    fontSize: 12,
    color: "#1976D2",
  },

  // 경력 카드
  experienceCard: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: "#F9F9F9",
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#FF6B35",
  },
  expHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  expDistrict: {
    fontFamily: Fonts.bold,
    fontSize: 14,
    color: "#1A1A1A",
  },
  expYears: {
    fontFamily: Fonts.medium,
    fontSize: 12,
    color: "#FF6B35",
  },
  expSpec: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    color: "#666",
    marginBottom: 8,
  },
  expStats: {
    flexDirection: "row",
    gap: 12,
  },
  expStatItem: {
    flex: 1,
  },
  expStatLabel: {
    fontFamily: Fonts.regular,
    fontSize: 11,
    color: "#999",
  },
  expStatValue: {
    fontFamily: Fonts.bold,
    fontSize: 13,
    color: "#FF6B35",
    marginTop: 2,
  },

  // 장비 카드
  equipmentCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  equipmentIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#F5F5F5",
    alignItems: "center",
    justifyContent: "center",
  },
  equipmentName: {
    fontFamily: Fonts.bold,
    fontSize: 13,
    color: "#1A1A1A",
  },
  equipmentDesc: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
  availableBadge: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#4CAF50",
  },

  // 하단 액션
  bottomActions: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },
  chatButton: {
    backgroundColor: "#FF6B35",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  chatButtonText: {
    fontFamily: Fonts.bold,
    fontSize: 15,
    color: "#fff",
  },

  // 모달
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    alignItems: "center",
    justifyContent: "center",
  },
  modalContent: {
    width: "80%",
    backgroundColor: "#333",
    borderRadius: 16,
    paddingVertical: 32,
    alignItems: "center",
  },
  modalText: {
    fontFamily: Fonts.bold,
    fontSize: 14,
    color: "#fff",
    textAlign: "center",
  },
  modalCloseBtn: {
    position: "absolute" as const,
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
});
