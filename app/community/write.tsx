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
      <View style={styles.header}>
        <Pressable
          onPress={() => { haptic(); router.back(); }}
          style={({ pressed }) => [styles.cancelBtn, pressed && { opacity: 0.7 }]}
        >
          <Text style={styles.cancelBtnText}>취소</Text>
        </Pressable>
        <Text style={styles.headerTitle}>글쓰기</Text>
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
                category === cat && styles.categoryChipActive,
                pressed && { opacity: 0.7 },
              ]}
            >
              <Text style={[
                styles.categoryChipText,
                category === cat && styles.categoryChipTextActive,
              ]}>
                {cat}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* 제목 */}
        <TextInput
          style={styles.titleInput}
          placeholder="제목을 입력하세요"
          placeholderTextColor="#C0C0C0"
          value={title}
          onChangeText={setTitle}
          maxLength={50}
          returnKeyType="next"
        />

        {/* 본문 */}
        <TextInput
          style={styles.contentInput}
          placeholder="내용을 입력하세요..."
          placeholderTextColor="#C0C0C0"
          value={content}
          onChangeText={setContent}
          multiline
          textAlignVertical="top"
          maxLength={1000}
        />

        <Text style={styles.charCount}>{content.length}/1000</Text>
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
    borderBottomColor: "#F0F0F0",
  },
  cancelBtn: { paddingHorizontal: 8, paddingVertical: 4 },
  cancelBtnText: { fontSize: 15, color: "#757575" },
  headerTitle: { fontSize: 17, fontWeight: "700", color: "#1A1A1A" },
  submitBtn: {
    backgroundColor: "#FF7043",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  submitBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  content: { padding: 16, gap: 16 },
  categoryRow: { flexDirection: "row", gap: 8 },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    backgroundColor: "#fff",
  },
  categoryChipActive: { borderColor: "#FF7043", backgroundColor: "#FFF3EE" },
  categoryChipText: { fontSize: 13, color: "#757575" },
  categoryChipTextActive: { color: "#FF7043", fontWeight: "700" },
  titleInput: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1A1A1A",
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
    paddingBottom: 12,
  },
  contentInput: {
    fontSize: 15,
    color: "#1A1A1A",
    lineHeight: 22,
    minHeight: 200,
  },
  charCount: { fontSize: 12, color: "#C0C0C0", textAlign: "right" },
});
