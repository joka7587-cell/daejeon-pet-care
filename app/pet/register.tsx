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
  const [weight, setWeight] = useState("");
  const [aggression, setAggression] = useState<"없음" | "주의" | "위험">("없음");
  const [medicalConditions, setMedicalConditions] = useState("");
  const [walkNotes, setWalkNotes] = useState<string[]>([]);
  const [preferredTrails, setPreferredTrails] = useState<string[]>([]);

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
      aggression,
      medicalConditions: medicalConditions.trim(),
      walkNotes,
      preferredTrails,
      weight: weight ? parseFloat(weight) : undefined,
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
      <View style={[styles.header, { backgroundColor: "#FFFFFF", borderBottomColor: "#E8E8E8" }]}>
        <Pressable
          onPress={() => { haptic(); router.back(); }}
          style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.7 }]}
        >
          <Text style={[styles.backBtnText, { color: "#1A1A1A" }]}>‹</Text>
        </Pressable>
        <Text style={[styles.headerTitle, { color: "#1A1A1A" }]}>반려동물 등록</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { backgroundColor: "#FFFFFF" }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* 사진 업로드 */}
        <View style={styles.photoSection}>
          <Pressable
            onPress={handlePickPhoto}
            style={({ pressed }) => [styles.photoCircle, { backgroundColor: "#F8F8F8", borderColor: "#E8E8E8" }, pressed && { opacity: 0.8 }]}
          >
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={styles.photoImage} contentFit="cover" />
            ) : (
              <>
                <Text style={styles.photoEmoji}>{emoji}</Text>
                <Text style={[styles.photoHint, { color: "#8E8E93" }]}>사진 추가</Text>
              </>
            )}
          </Pressable>
          <View style={styles.photoActions}>
            <Pressable
              onPress={handlePickPhoto}
              style={({ pressed }) => [styles.photoActionBtn, { backgroundColor: "#F8F8F8" }, pressed && { opacity: 0.7 }]}
            >
              <Text style={[styles.photoActionText, { color: "#1A1A1A" }]}>📷 앨범</Text>
            </Pressable>
            <Pressable
              onPress={handleTakePhoto}
              style={({ pressed }) => [styles.photoActionBtn, { backgroundColor: "#F8F8F8" }, pressed && { opacity: 0.7 }]}
            >
              <Text style={[styles.photoActionText, { color: "#1A1A1A" }]}>📸 카메라</Text>
            </Pressable>
            {photoUri && (
              <Pressable
                onPress={() => { haptic(); setPhotoUri(null); }}
                style={({ pressed }) => [styles.photoActionBtn, styles.photoRemoveBtn, { backgroundColor: "#F8F8F8" }, pressed && { opacity: 0.7 }]}
              >
                <Text style={[styles.photoActionText, { color: "#EF5350" }]}>삭제</Text>
              </Pressable>
            )}
          </View>
        </View>

        {/* 이모지 선택 */}
        <View style={styles.fieldSection}>
          <Text style={[styles.fieldLabel, { color: "#8E8E93" }]}>아이콘</Text>
          <Pressable
            onPress={() => { haptic(); setShowEmojiPicker(!showEmojiPicker); }}
            style={({ pressed }) => [styles.emojiSelector, { backgroundColor: "#F8F8F8", borderColor: "#FFCCBC" }, pressed && { opacity: 0.8 }]}
          >
            <Text style={styles.selectedEmoji}>{emoji}</Text>
            <Text style={styles.emojiSelectorText}>변경</Text>
          </Pressable>
          {showEmojiPicker && (
            <View style={[styles.emojiGrid, { backgroundColor: "#F8F8F8", borderColor: "#E8E8E8" }]}>
              {PET_EMOJIS.map((e) => (
                <Pressable
                  key={e}
                  onPress={() => { haptic(); setEmoji(e); setShowEmojiPicker(false); }}
                  style={({ pressed }) => [
                    styles.emojiOption,
                    { backgroundColor: "#FFFFFF", borderColor: "#E8E8E8" },
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
          <Text style={[styles.fieldLabel, { color: "#8E8E93" }]}>이름 *</Text>
          <TextInput
            style={[styles.textInput, { backgroundColor: "#F8F8F8", borderColor: "#E8E8E8", color: "#1A1A1A" }]}
            placeholder="반려동물 이름"
            placeholderTextColor={"#8E8E93"}
            value={name}
            onChangeText={setName}
            maxLength={20}
            returnKeyType="next"
          />
        </View>

        {/* 품종 입력 */}
        <View style={styles.fieldSection}>
          <Text style={[styles.fieldLabel, { color: "#8E8E93" }]}>품종 *</Text>
          <Pressable
            onPress={() => { haptic(); setShowBreedPicker(!showBreedPicker); }}
            style={({ pressed }) => [styles.selectInput, { backgroundColor: "#F8F8F8", borderColor: "#E8E8E8" }, pressed && { opacity: 0.8 }]}
          >
            <Text style={breed ? [styles.selectInputText, { color: "#1A1A1A" }] : [styles.selectInputPlaceholder, { color: "#8E8E93" }]}>
              {breed || "품종을 선택하세요"}
            </Text>
            <Text style={{ color: "#8E8E93" }}>{showBreedPicker ? "▲" : "▼"}</Text>
          </Pressable>
          {showBreedPicker && (
            <View style={[styles.breedGrid, { backgroundColor: "#F8F8F8", borderColor: "#E8E8E8" }]}>
              {POPULAR_BREEDS.map((b) => (
                <Pressable
                  key={b}
                  onPress={() => { haptic(); setBreed(b); setShowBreedPicker(false); }}
                  style={({ pressed }) => [
                    styles.breedChip,
                    { backgroundColor: "#FFFFFF", borderColor: "#E8E8E8" },
                    breed === b && styles.breedChipActive,
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <Text style={[styles.breedChipText, { color: "#8E8E93" }, breed === b && styles.breedChipTextActive]}>
                    {b}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
          {breed === "기타" && (
            <TextInput
              style={[styles.textInput, { marginTop: 8, backgroundColor: "#F8F8F8", borderColor: "#E8E8E8", color: "#1A1A1A" }]}
              placeholder="품종을 직접 입력하세요"
              placeholderTextColor={"#8E8E93"}
              value={breed === "기타" ? "" : breed}
              onChangeText={(text) => setBreed(text || "기타")}
              maxLength={30}
            />
          )}
        </View>

        {/* 나이 입력 */}
        <View style={styles.fieldSection}>
          <Text style={[styles.fieldLabel, { color: "#8E8E93" }]}>나이 (살) *</Text>
          <TextInput
            style={[styles.textInput, { backgroundColor: "#F8F8F8", borderColor: "#E8E8E8", color: "#1A1A1A" }]}
            placeholder="숫자만 입력 (예: 3)"
            placeholderTextColor={"#8E8E93"}
            value={age}
            onChangeText={(text) => setAge(text.replace(/[^0-9]/g, ""))}
            keyboardType="number-pad"
            maxLength={2}
            returnKeyType="done"
          />
        </View>

        {/* 크기 선택 */}
        <View style={styles.fieldSection}>
          <Text style={[styles.fieldLabel, { color: "#8E8E93" }]}>크기 *</Text>
          <View style={styles.sizeRow}>
            {SIZE_OPTIONS.map((opt) => (
              <Pressable
                key={opt.value}
                onPress={() => { haptic(); setSize(opt.value); }}
                style={({ pressed }) => [
                  styles.sizeOption,
                  { backgroundColor: "#FFFFFF", borderColor: "#E8E8E8" },
                  size === opt.value && styles.sizeOptionActive,
                  pressed && { opacity: 0.8 },
                ]}
              >
                <Text
                  style={[
                    styles.sizeLabel,
                    { color: "#8E8E93" },
                    size === opt.value && styles.sizeLabelActive,
                  ]}
                >
                  {opt.label}
                </Text>
                <Text style={[styles.sizeDesc, { color: "#8E8E93" }]}>{opt.desc}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* 추가 정보 */}
        <View style={styles.fieldSection}>
          <Text style={[styles.fieldLabel, { color: "#8E8E93" }]}>추가 정보 (선택)</Text>
          <TextInput
            style={[styles.textInput, { backgroundColor: "#F8F8F8", borderColor: "#E8E8E8", color: "#1A1A1A" }]}
            placeholder="몸무게 (kg)"
            placeholderTextColor={"#8E8E93"}
            value={weight}
            onChangeText={(text) => setWeight(text.replace(/[^0-9.]/g, ""))}
            keyboardType="numeric"
            maxLength={5}
          />
          <TextInput
            style={[styles.textInput, { marginTop: 8, backgroundColor: "#F8F8F8", borderColor: "#E8E8E8", color: "#1A1A1A" }]}
            placeholder="주의해야 할 공격성 (없으면 비워두세요)"
            placeholderTextColor={"#8E8E93"}
            value={aggression === "없음" ? "" : aggression}
            onChangeText={(t) => setAggression(t ? "주의" : "없음")}
          />
          <TextInput
            style={[styles.textInput, { marginTop: 8, minHeight: 80, paddingTop: 12, textAlignVertical: "top", backgroundColor: "#F8F8F8", borderColor: "#E8E8E8", color: "#1A1A1A" }]}
            placeholder="앓고 있는 질병이나 복용 중인 약 (없으면 비워두세요)"
            placeholderTextColor={"#8E8E93"}
            value={medicalConditions}
            onChangeText={setMedicalConditions}
            multiline
          />
        </View>

        <Pressable
          onPress={handleSubmit}
          disabled={!isValid}
          style={({ pressed }) => [
            styles.submitBtn,
            !isValid && styles.submitBtnDisabled,
            pressed && { opacity: 0.8 },
          ]}
        >
          <Text style={styles.submitBtnText}>등록하기</Text>
        </Pressable>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  backBtn: { padding: 6 },
  backBtnText: { fontSize: 28, fontWeight: "300" },
  headerTitle: { fontSize: 17, fontWeight: "600" },
  scrollContent: { padding: 20, paddingBottom: 40 },
  photoSection: { alignItems: "center", marginBottom: 24 },
  photoCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    overflow: "hidden",
    marginBottom: 12,
  },
  photoImage: { width: "100%", height: "100%" },
  photoEmoji: { fontSize: 52 },
  photoHint: { fontSize: 13, fontWeight: "500", marginTop: 4 },
  photoActions: { flexDirection: "row", gap: 10 },
  photoActionBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  photoActionText: { fontSize: 13, fontWeight: "600" },
  photoRemoveBtn: {},
  fieldSection: { marginBottom: 24 },
  fieldLabel: { fontSize: 14, fontWeight: "600", marginBottom: 8, marginLeft: 4 },
  textInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
  },
  selectInput: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  selectInputText: { fontSize: 15 },
  selectInputPlaceholder: { fontSize: 15 },
  emojiSelector: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
  },
  selectedEmoji: { fontSize: 32 },
  emojiSelectorText: { fontSize: 13, color: "#FF7043", fontWeight: "600" },
  emojiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    marginTop: 8,
  },
  emojiOption: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
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
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    marginTop: 8,
  },
  breedChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  breedChipActive: { borderColor: "#FF7043", backgroundColor: "#FFF3EE" },
  breedChipText: { fontSize: 13 },
  breedChipTextActive: { color: "#FF7043", fontWeight: "700" },
  sizeRow: { flexDirection: "row", gap: 10 },
  sizeOption: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    gap: 4,
  },
  sizeOptionActive: {
    borderColor: "#FF7043",
    backgroundColor: "#FFF3EE",
  },
  sizeLabel: { fontSize: 15, fontWeight: "700" },
  sizeLabelActive: { color: "#FF7043" },
  sizeDesc: { fontSize: 11 },
  submitBtn: {
    backgroundColor: "#FF7043",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
  },
  submitBtnDisabled: { backgroundColor: "#BDBDBD", opacity: 0.6 },
  submitBtnText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
});
