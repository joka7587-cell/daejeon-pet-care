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
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { ScreenContainer } from "@/components/screen-container";
import { useApp, Pet } from "@/lib/app-context";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";

function haptic() {
  if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

const PET_EMOJIS = [
  "🐶", "🐕", "🦮", "🐩", "🐕‍🦺",
  "🐱", "🐈", "🐈‍⬛", "🐰", "🐹",
  "🐦", "🐢", "🐠", "🦜", "🐾",
  "🦊", "🐻", "🐼", "🦁", "🐯",
];

const SIZE_OPTIONS: { label: string; value: "소형" | "중형" | "대형"; desc: string }[] = [
  { label: "소형", value: "소형", desc: "10kg 미만" },
  { label: "중형", value: "중형", desc: "10~25kg" },
  { label: "대형", value: "대형", desc: "25kg 이상" },
];

const POPULAR_BREEDS = [
  "말티즈", "포메라니안", "푸들", "치와와", "시츄",
  "골든 리트리버", "래브라도 리트리버", "진돗개", "비숑 프리제", "웰시 코기",
  "프렌치 불독", "닥스훈트", "비글", "사모예드", "시바 이누",
  "페르시안", "러시안 블루", "스코티시 폴드", "브리티시 숏헤어", "기타",
];

export default function PetRegisterScreen() {
  const router = useRouter();
  const { dispatch, state } = useApp();

  const [name, setName] = useState("");
  const [breed, setBreed] = useState("");
  const [age, setAge] = useState("");
  const [size, setSize] = useState<"소형" | "중형" | "대형" | null>(null);
  const [emoji, setEmoji] = useState("🐶");
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [showBreedPicker, setShowBreedPicker] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const isValid = name.trim() && breed.trim() && age.trim() && size;

  const handlePickPhoto = async () => {
    haptic();
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]) {
        setPhotoUri(result.assets[0].uri);
      }
    } catch (_) {}
  };

  const handleTakePhoto = async () => {
    haptic();
    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]) {
        setPhotoUri(result.assets[0].uri);
      }
    } catch (_) {}
  };

  const handleSubmit = () => {
    if (!isValid) return;
    haptic();

    const parsedAge = parseInt(age, 10);
    if (isNaN(parsedAge) || parsedAge < 0 || parsedAge > 30) {
      if (Platform.OS === "web") {
        alert("나이는 0~30 사이의 숫자를 입력해주세요");
      } else {
        Alert.alert("알림", "나이는 0~30 사이의 숫자를 입력해주세요");
      }
      return;
    }

    const newPet: Pet = {
      id: `pet_${Date.now()}`,
      name: name.trim(),
      breed: breed.trim(),
      age: parsedAge,
      size: size!,
      emoji,
      photoUri: photoUri || undefined,
    };

    dispatch({ type: "ADD_PET", payload: newPet });

    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    router.back();
  };

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
        <Text style={styles.headerTitle}>반려동물 등록</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* 사진 업로드 */}
        <View style={styles.photoSection}>
          <Pressable
            onPress={handlePickPhoto}
            style={({ pressed }) => [styles.photoCircle, pressed && { opacity: 0.8 }]}
          >
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={styles.photoImage} contentFit="cover" />
            ) : (
              <>
                <Text style={styles.photoEmoji}>{emoji}</Text>
                <Text style={styles.photoHint}>사진 추가</Text>
              </>
            )}
          </Pressable>
          <View style={styles.photoActions}>
            <Pressable
              onPress={handlePickPhoto}
              style={({ pressed }) => [styles.photoActionBtn, pressed && { opacity: 0.7 }]}
            >
              <Text style={styles.photoActionText}>📷 앨범</Text>
            </Pressable>
            <Pressable
              onPress={handleTakePhoto}
              style={({ pressed }) => [styles.photoActionBtn, pressed && { opacity: 0.7 }]}
            >
              <Text style={styles.photoActionText}>📸 카메라</Text>
            </Pressable>
            {photoUri && (
              <Pressable
                onPress={() => { haptic(); setPhotoUri(null); }}
                style={({ pressed }) => [styles.photoActionBtn, styles.photoRemoveBtn, pressed && { opacity: 0.7 }]}
              >
                <Text style={[styles.photoActionText, { color: "#EF5350" }]}>삭제</Text>
              </Pressable>
            )}
          </View>
        </View>

        {/* 이모지 선택 */}
        <View style={styles.fieldSection}>
          <Text style={styles.fieldLabel}>아이콘</Text>
          <Pressable
            onPress={() => { haptic(); setShowEmojiPicker(!showEmojiPicker); }}
            style={({ pressed }) => [styles.emojiSelector, pressed && { opacity: 0.8 }]}
          >
            <Text style={styles.selectedEmoji}>{emoji}</Text>
            <Text style={styles.emojiSelectorText}>변경</Text>
          </Pressable>
          {showEmojiPicker && (
            <View style={styles.emojiGrid}>
              {PET_EMOJIS.map((e) => (
                <Pressable
                  key={e}
                  onPress={() => { haptic(); setEmoji(e); setShowEmojiPicker(false); }}
                  style={({ pressed }) => [
                    styles.emojiOption,
                    emoji === e && styles.emojiOptionActive,
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <Text style={{ fontSize: 28 }}>{e}</Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        {/* 이름 입력 */}
        <View style={styles.fieldSection}>
          <Text style={styles.fieldLabel}>이름 *</Text>
          <TextInput
            style={styles.textInput}
            placeholder="반려동물 이름"
            placeholderTextColor="#BDBDBD"
            value={name}
            onChangeText={setName}
            maxLength={20}
            returnKeyType="next"
          />
        </View>

        {/* 품종 입력 */}
        <View style={styles.fieldSection}>
          <Text style={styles.fieldLabel}>품종 *</Text>
          <Pressable
            onPress={() => { haptic(); setShowBreedPicker(!showBreedPicker); }}
            style={({ pressed }) => [styles.selectInput, pressed && { opacity: 0.8 }]}
          >
            <Text style={breed ? styles.selectInputText : styles.selectInputPlaceholder}>
              {breed || "품종을 선택하세요"}
            </Text>
            <Text style={{ color: "#9E9E9E" }}>{showBreedPicker ? "▲" : "▼"}</Text>
          </Pressable>
          {showBreedPicker && (
            <View style={styles.breedGrid}>
              {POPULAR_BREEDS.map((b) => (
                <Pressable
                  key={b}
                  onPress={() => { haptic(); setBreed(b); setShowBreedPicker(false); }}
                  style={({ pressed }) => [
                    styles.breedChip,
                    breed === b && styles.breedChipActive,
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <Text style={[styles.breedChipText, breed === b && styles.breedChipTextActive]}>
                    {b}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
          {breed === "기타" && (
            <TextInput
              style={[styles.textInput, { marginTop: 8 }]}
              placeholder="품종을 직접 입력하세요"
              placeholderTextColor="#BDBDBD"
              value={breed === "기타" ? "" : breed}
              onChangeText={(text) => setBreed(text || "기타")}
              maxLength={30}
            />
          )}
        </View>

        {/* 나이 입력 */}
        <View style={styles.fieldSection}>
          <Text style={styles.fieldLabel}>나이 (살) *</Text>
          <TextInput
            style={styles.textInput}
            placeholder="숫자만 입력 (예: 3)"
            placeholderTextColor="#BDBDBD"
            value={age}
            onChangeText={(text) => setAge(text.replace(/[^0-9]/g, ""))}
            keyboardType="number-pad"
            maxLength={2}
            returnKeyType="done"
          />
        </View>

        {/* 크기 선택 */}
        <View style={styles.fieldSection}>
          <Text style={styles.fieldLabel}>크기 *</Text>
          <View style={styles.sizeRow}>
            {SIZE_OPTIONS.map((opt) => (
              <Pressable
                key={opt.value}
                onPress={() => { haptic(); setSize(opt.value); }}
                style={({ pressed }) => [
                  styles.sizeOption,
                  size === opt.value && styles.sizeOptionActive,
                  pressed && { opacity: 0.8 },
                ]}
              >
                <Text style={[styles.sizeLabel, size === opt.value && styles.sizeLabelActive]}>
                  {opt.label}
                </Text>
                <Text style={[styles.sizeDesc, size === opt.value && { color: "#FF7043" }]}>
                  {opt.desc}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* 등록 버튼 */}
        <Pressable
          onPress={handleSubmit}
          disabled={!isValid}
          style={({ pressed }) => [
            styles.submitBtn,
            !isValid && styles.submitBtnDisabled,
            pressed && isValid && { opacity: 0.85, transform: [{ scale: 0.97 }] },
          ]}
        >
          <Text style={styles.submitBtnText}>
            {emoji} 반려동물 등록하기
          </Text>
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
  scrollContent: { padding: 20, gap: 20, paddingBottom: 40 },
  photoSection: { alignItems: "center", gap: 12 },
  photoCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#FFF3EE",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFCCBC",
    borderStyle: "dashed",
    overflow: "hidden",
  },
  photoImage: { width: 120, height: 120, borderRadius: 60 },
  photoEmoji: { fontSize: 48 },
  photoHint: { fontSize: 11, color: "#FF7043", fontWeight: "600", marginTop: 4 },
  photoActions: { flexDirection: "row", gap: 8 },
  photoActionBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: "#F5F5F5",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  photoRemoveBtn: { borderColor: "#FFCDD2", backgroundColor: "#FFF5F5" },
  photoActionText: { fontSize: 13, color: "#555", fontWeight: "600" },
  fieldSection: { gap: 8 },
  fieldLabel: { fontSize: 14, fontWeight: "700", color: "#1A1A1A" },
  textInput: {
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: "#1A1A1A",
    backgroundColor: "#fff",
  },
  selectInput: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
  },
  selectInputText: { fontSize: 15, color: "#1A1A1A" },
  selectInputPlaceholder: { fontSize: 15, color: "#BDBDBD" },
  emojiSelector: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#FFF3EE",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#FFCCBC",
  },
  selectedEmoji: { fontSize: 32 },
  emojiSelectorText: { fontSize: 13, color: "#FF7043", fontWeight: "600" },
  emojiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    backgroundColor: "#FAFAFA",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#F0F0F0",
  },
  emojiOption: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  emojiOptionActive: {
    borderColor: "#FF7043",
    backgroundColor: "#FFF3EE",
    borderWidth: 2,
  },
  breedGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    backgroundColor: "#FAFAFA",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#F0F0F0",
  },
  breedChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    backgroundColor: "#fff",
  },
  breedChipActive: { borderColor: "#FF7043", backgroundColor: "#FFF3EE" },
  breedChipText: { fontSize: 13, color: "#555" },
  breedChipTextActive: { color: "#FF7043", fontWeight: "700" },
  sizeRow: { flexDirection: "row", gap: 10 },
  sizeOption: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#E0E0E0",
    backgroundColor: "#fff",
    gap: 4,
  },
  sizeOptionActive: {
    borderColor: "#FF7043",
    backgroundColor: "#FFF3EE",
  },
  sizeLabel: { fontSize: 15, fontWeight: "700", color: "#555" },
  sizeLabelActive: { color: "#FF7043" },
  sizeDesc: { fontSize: 11, color: "#9E9E9E" },
  submitBtn: {
    backgroundColor: "#FF7043",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
  },
  submitBtnDisabled: { backgroundColor: "#BDBDBD", opacity: 0.6 },
  submitBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
