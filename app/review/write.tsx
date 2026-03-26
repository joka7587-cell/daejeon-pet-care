import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  Platform,
  Alert,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useApp, Review } from "@/lib/app-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import { Fonts } from "@/hooks/use-fonts";

function haptic(type: "light" | "success" = "light") {
  if (Platform.OS !== "web") {
    if (type === "success") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    else Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }
}

const SERVICE_LABELS: Record<string, string> = {
  emergency: "긴급 방문 돌봄",
  walk_service: "대신 산책",
  walk_partner: "산책 친구",
  short_care: "단기 돌봄 교환",
};

const REVIEW_TAGS_WALKER = [
  "시간 약속을 잘 지켜요",
  "산책을 꼼꼼하게 해줘요",
  "사진을 잘 보내줘요",
  "반려견을 잘 다뤄요",
  "친절하고 매너가 좋아요",
  "소통이 원활해요",
  "재이용 의사 있어요",
];

const REVIEW_TAGS_OWNER = [
  "반려견이 순해요",
  "정보를 정확히 알려줘요",
  "시간 약속을 잘 지켜요",
  "친절하고 매너가 좋아요",
  "소통이 원활해요",
  "재이용 의사 있어요",
];

export default function WriteReviewScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { state, dispatch } = useApp();
  const [rating, setRating] = useState(0);
  const [content, setContent] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const targetName = (params.targetName as string) || "돌보미";
  const serviceType = (params.serviceType as string) || "emergency";
  const reviewType = (params.reviewType as string) || "walker";
  const tags = reviewType === "owner" ? REVIEW_TAGS_OWNER : REVIEW_TAGS_WALKER;

  const toggleTag = (tag: string) => {
    haptic();
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = () => {
    if (rating === 0) {
      Alert.alert("알림", "별점을 선택해주세요!");
      return;
    }

    haptic("success");

    const review: Review = {
      id: `rev_${Date.now()}`,
      fromUserId: state.profile.friendCode || "me",
      fromNickname: state.profile.nickname,
      fromEmoji: state.profile.avatarEmoji,
      toUserId: (params.walkerId as string) || "unknown",
      rating,
      content: content.trim() || selectedTags.join(", "),
      tags: selectedTags,
      serviceType,
      createdAt: new Date().toISOString(),
    };

    dispatch({ type: "ADD_REVIEW", payload: review });

    dispatch({
      type: "ADD_NOTIFICATION",
      payload: {
        id: `notif_review_${Date.now()}`,
        type: "match",
        title: "⭐ 새 리뷰가 등록되었습니다",
        body: `${state.profile.nickname}님이 ${rating}점 리뷰를 남겼습니다.`,
        isRead: false,
        createdAt: new Date().toISOString(),
      },
    });

    setSubmitted(true);
  };

  if (submitted) {
    return (
      <ScreenContainer edges={["top", "bottom", "left", "right"]} className="p-6">
        <View style={styles.successContainer}>
          <Text style={styles.successEmoji}>🎉</Text>
          <Text style={styles.successTitle}>후기 작성 완료!</Text>
          <Text style={styles.successDesc}>
            {targetName}님에게 {rating}점 후기를 남겼습니다.
          </Text>
          <Pressable
            onPress={() => { haptic(); router.back(); }}
            style={({ pressed }) => [styles.doneBtn, pressed && { opacity: 0.85 }]}
          >
            <Text style={styles.doneBtnText}>확인</Text>
          </Pressable>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      {/* 헤더 */}
      <View style={styles.header}>
        <Pressable
          onPress={() => { haptic(); router.back(); }}
          style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.7 }]}
        >
          <Text style={styles.backBtnText}>‹</Text>
        </Pressable>
        <Text style={styles.headerTitle}>후기 작성</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* 대상 정보 */}
        <View style={styles.targetCard}>
          <Text style={styles.targetEmoji}>{reviewType === "owner" ? "🏠" : "🐕‍🦺"}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.targetName}>{targetName}</Text>
            <Text style={styles.targetService}>
              {SERVICE_LABELS[serviceType] || serviceType} · {reviewType === "owner" ? "보호자 리뷰" : "도그워커 리뷰"}
            </Text>
          </View>
        </View>

        {/* 별점 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>별점</Text>
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((star) => (
              <Pressable
                key={star}
                onPress={() => { haptic(); setRating(star); }}
                style={({ pressed }) => [pressed && { transform: [{ scale: 1.1 }] }]}
              >
                <Text style={[styles.star, star <= rating && styles.starActive]}>
                  {star <= rating ? "★" : "☆"}
                </Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.ratingLabel}>
            {rating === 0 ? "별점을 선택해주세요" :
             rating === 1 ? "별로예요" :
             rating === 2 ? "그저 그래요" :
             rating === 3 ? "보통이에요" :
             rating === 4 ? "좋아요!" : "최고예요! 🎉"}
          </Text>
        </View>

        {/* 태그 선택 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>이런 점이 좋았어요</Text>
          <View style={styles.tagsWrap}>
            {tags.map((tag) => (
              <Pressable
                key={tag}
                onPress={() => toggleTag(tag)}
                style={[styles.tag, selectedTags.includes(tag) && styles.tagActive]}
              >
                <Text style={[styles.tagText, selectedTags.includes(tag) && styles.tagTextActive]}>
                  {tag}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* 후기 내용 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>상세 후기 (선택)</Text>
          <TextInput
            style={styles.textArea}
            placeholder="돌봄 서비스는 어떠셨나요? 다른 반려인에게 도움이 될 후기를 남겨주세요."
            placeholderTextColor="#BDBDBD"
            value={content}
            onChangeText={setContent}
            multiline
            maxLength={500}
            textAlignVertical="top"
          />
          <Text style={styles.charCount}>{content.length}/500</Text>
        </View>

        {/* 제출 버튼 */}
        <Pressable
          onPress={handleSubmit}
          style={({ pressed }) => [
            styles.submitBtn,
            pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
          ]}
        >
          <Text style={styles.submitBtnText}>후기 등록하기</Text>
        </Pressable>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  backBtnText: { fontSize: 28, color: "#1A1A1A" },
  headerTitle: { flex: 1, textAlign: "center", fontSize: 17, fontWeight: "700", color: "#1A1A1A" },
  content: { padding: 20, gap: 24, paddingBottom: 40 },
  targetCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FFF3EE",
    borderRadius: 16,
    padding: 16,
  },
  targetEmoji: { fontSize: 40 },
  targetName: { fontSize: 16, fontWeight: "700", color: "#1A1A1A" },
  targetService: { fontSize: 13, color: "#FF7043", marginTop: 2 },
  section: { gap: 12 },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#1A1A1A" },
  starsRow: { flexDirection: "row", justifyContent: "center", gap: 12 },
  star: { fontSize: 40, color: "#E0E0E0" },
  starActive: { color: "#FFB300" },
  ratingLabel: { textAlign: "center", fontSize: 14, color: "#757575" },
  textArea: {
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 12,
    padding: 16,
    fontSize: 14,
    color: "#1A1A1A",
    minHeight: 120,
    lineHeight: 22,
  },
  charCount: { textAlign: "right", fontSize: 12, color: "#9E9E9E" },
  tagsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tag: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F5F5F5",
    borderWidth: 1,
    borderColor: "#E5E5EA",
  },
  tagActive: { backgroundColor: "#FFF5F0", borderColor: "#FF6B35" },
  tagText: { fontFamily: Fonts.medium, fontSize: 13, color: "#636366" },
  tagTextActive: { color: "#FF6B35" },
  submitBtn: {
    backgroundColor: "#FF7043",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  submitBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  successContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  successEmoji: { fontSize: 64 },
  successTitle: { fontSize: 22, fontWeight: "800", color: "#1A1A1A" },
  successDesc: { fontSize: 15, color: "#757575", textAlign: "center" },
  doneBtn: {
    backgroundColor: "#FF7043",
    borderRadius: 14,
    paddingHorizontal: 40,
    paddingVertical: 14,
    marginTop: 16,
  },
  doneBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
