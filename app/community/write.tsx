import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  Platform,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useApp, Post } from "@/lib/app-context";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";

function haptic() {
  if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

const CATEGORIES = ["자유", "산책", "돌봄", "정보"] as const;

export default function CommunityWriteScreen() {
  const router = useRouter();
  const { state, dispatch } = useApp();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState<typeof CATEGORIES[number]>("자유");

  const handleSubmit = () => {
    if (!title.trim() || !content.trim()) return;
    haptic();

    const post: Post = {
      id: `post_${Date.now()}`,
      authorId: "me",
      authorNickname: state.profile.nickname || "익명",
      authorEmoji: state.profile.role === "caretaker" ? "🏠" : "🐶",
      category,
      title: title.trim(),
      content: content.trim(),
      neighborhood: state.profile.neighborhood || "유성구",
      likes: [],
      comments: [],
      createdAt: new Date().toISOString(),
    };

    dispatch({ type: "ADD_POST", payload: post });

    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    router.back();
  };

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <View style={[styles.header, { borderBottomColor: "#E8E8E8" }]}>
        <Pressable
          onPress={() => { haptic(); router.back(); }}
          style={({ pressed }) => [styles.cancelBtn, pressed && { opacity: 0.7 }]}
        >
          <Text style={[styles.cancelBtnText, { color: "#8E8E93" }]}>취소</Text>
        </Pressable>
        <Text style={[styles.headerTitle, { color: "#1A1A1A" }]}>글쓰기</Text>
        <Pressable
          onPress={handleSubmit}
          disabled={!title.trim() || !content.trim()}
          style={({ pressed }) => [
            styles.submitBtn,
            (!title.trim() || !content.trim()) && { opacity: 0.4 },
            pressed && { opacity: 0.85 },
          ]}
        >
          <Text style={styles.submitBtnText}>등록</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* 카테고리 선택 */}
        <View style={styles.categoryRow}>
          {CATEGORIES.map((cat) => (
            <Pressable
              key={cat}
              onPress={() => { haptic(); setCategory(cat); }}
              style={({ pressed }) => [
                styles.categoryChip,
                { borderColor: "#E8E8E8", backgroundColor: "#FFFFFF" },
                category === cat && styles.categoryChipActive,
                category === cat && { backgroundColor: "#F8F8F8" },
                pressed && { opacity: 0.7 },
              ]}
            >
              <Text style={[
                styles.categoryChipText,
                { color: "#8E8E93" },
                category === cat && styles.categoryChipTextActive,
              ]}>
                {cat}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* 제목 */}
        <TextInput
          style={[styles.titleInput, { color: "#1A1A1A", borderBottomColor: "#E8E8E8" }]}
          placeholder="제목을 입력하세요"
          placeholderTextColor={"#8E8E93"}
          value={title}
          onChangeText={setTitle}
          maxLength={50}
          returnKeyType="next"
        />

        {/* 본문 */}
        <TextInput
          style={[styles.contentInput, { color: "#1A1A1A" }]}
          placeholder="내용을 입력하세요..."
          placeholderTextColor={"#8E8E93"}
          value={content}
          onChangeText={setContent}
          multiline
          textAlignVertical="top"
          maxLength={1000}
        />

        <Text style={[styles.charCount, { color: "#8E8E93" }]}>{content.length}/1000</Text>
      </ScrollView>
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
  },
  cancelBtn: { paddingHorizontal: 8, paddingVertical: 4 },
  cancelBtnText: { fontSize: 15 },
  headerTitle: { fontSize: 17, fontWeight: "700" },
  submitBtn: {
    backgroundColor: "#2E7D32",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  submitBtnText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
  content: { padding: 16, gap: 16 },
  categoryRow: { flexDirection: "row", gap: 8 },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  categoryChipActive: { borderColor: "#2E7D32" },
  categoryChipText: { fontSize: 13 },
  categoryChipTextActive: { color: "#2E7D32", fontWeight: "700" },
  titleInput: {
    fontSize: 18,
    fontWeight: "700",
    borderBottomWidth: 1,
    paddingBottom: 12,
  },
  contentInput: {
    fontSize: 15,
    lineHeight: 22,
    minHeight: 200,
  },
  charCount: { fontSize: 12, textAlign: "right" },
});
