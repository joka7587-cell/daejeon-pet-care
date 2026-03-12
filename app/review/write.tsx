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

function haptic() {
  if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

const SERVICE_LABELS: Record<string, string> = {
  emergency: "긴급 방문 돌봄",
  walk_service: "대신 산책",
  walk_partner: "산책 친구",
  short_care: "단기 돌봄 교환",
};

export default function WriteReviewScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { dispatch } = useApp();
  const [rating, setRating] = useState(0);
  const [content, setContent] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const targetName = (params.targetName as string) || "돌보미";
  const serviceType = (params.serviceType as string) || "emergency";

  const handleSubmit = () => {
    if (rating === 0) {
      if (Platform.OS === "web") {
        alert("별점을 선택해주세요!");
      } else {
        Alert.alert("알림", "별점을 선택해주세요!");
      }
      return;
    }
    if (!content.trim()) {
      if (Platform.OS === "web") {
        alert("후기를 작성해주세요!");
      } else {
        Alert.alert("알림", "후기를 작성해주세요!");
      }
      return;
    }

    haptic();

    const review: Review = {
      id: `rev_${Date.now()}`,
      fromUserId: "me",
      fromNickname: "나",
      rating,
      content: content.trim(),
      serviceType,
      createdAt: new Date().toISOString(),
    };

    dispatch({ type: "ADD_REVIEW", payload: review });
    setSubmitted(true);

    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
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
          <Text style={styles.targetEmoji}>👤</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.targetName}>{targetName}</Text>
            <Text style={styles.targetService}>
              {SERVICE_LABELS[serviceType] || serviceType}
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

        {/* 후기 내용 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>후기 내용</Text>
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
