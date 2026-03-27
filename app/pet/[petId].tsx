import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  TextInput,
  Platform,
  Alert,
} from "react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { ScreenContainer } from "@/components/screen-container";
import { useApp, Pet } from "@/lib/app-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";

function haptic() {
  if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

const SIZE_OPTIONS: Pet["size"][] = ["소형", "중형", "대형"];
const EMOJI_OPTIONS = ["🐶", "🐕", "🦮", "🐩", "🐕‍🦺", "🦊", "🐱", "🐈", "🐰", "🐹"];

export default function PetDetailScreen() {
  const router = useRouter();
  const { petId } = useLocalSearchParams<{ petId: string }>();
  const { state, dispatch } = useApp();

  const pet = state.profile.pets.find((p) => p.id === petId);

  const [name, setName] = useState(pet?.name || "");
  const [breed, setBreed] = useState(pet?.breed || "");
  const [age, setAge] = useState(pet?.age?.toString() || "");
  const [size, setSize] = useState<Pet["size"]>(pet?.size || "소형");
  const [emoji, setEmoji] = useState(pet?.emoji || "🐶");
  const [photoUri, setPhotoUri] = useState<string | undefined>(pet?.photoUri);
  const [isEditing, setIsEditing] = useState(false);

  if (!pet) {
    return (
      <ScreenContainer edges={["top", "bottom", "left", "right"]}>
        <View style={styles.header}>
          <Pressable
            onPress={() => { haptic(); router.back(); }}
            style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.7 }]}
          >
            <Text style={styles.backBtnText}>‹</Text>
          </Pressable>
          <Text style={styles.headerTitle}>반려동물</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>🐾</Text>
          <Text style={styles.emptyText}>반려동물을 찾을 수 없어요</Text>
        </View>
      </ScreenContainer>
    );
  }

  const handlePickImage = async () => {
    haptic();

    // 권한 요청
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      if (Platform.OS === "web") {
        alert("사진 접근 권한이 필요합니다.");
      } else {
        Alert.alert("권한 필요", "사진 라이브러리 접근 권한이 필요합니다.\n설정에서 권한을 허용해주세요.");
      }
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const uri = result.assets[0].uri;
      setPhotoUri(uri);
      // 즉시 저장
      dispatch({
        type: "UPDATE_PET",
        payload: { petId: pet.id, updates: { photoUri: uri } },
      });
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    }
  };

  const handleTakePhoto = async () => {
    haptic();

    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      if (Platform.OS === "web") {
        alert("카메라 접근 권한이 필요합니다.");
      } else {
        Alert.alert("권한 필요", "카메라 접근 권한이 필요합니다.\n설정에서 권한을 허용해주세요.");
      }
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const uri = result.assets[0].uri;
      setPhotoUri(uri);
      dispatch({
        type: "UPDATE_PET",
        payload: { petId: pet.id, updates: { photoUri: uri } },
      });
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    }
  };

  const handleRemovePhoto = () => {
    haptic();
    setPhotoUri(undefined);
    dispatch({
      type: "UPDATE_PET",
      payload: { petId: pet.id, updates: { photoUri: undefined } },
    });
  };

  const handleSave = () => {
    haptic();
    if (!name.trim()) {
      if (Platform.OS === "web") {
        alert("이름을 입력해주세요.");
      } else {
        Alert.alert("입력 오류", "반려동물 이름을 입력해주세요.");
      }
      return;
    }

    dispatch({
      type: "UPDATE_PET",
      payload: {
        petId: pet.id,
        updates: {
          name: name.trim(),
          breed: breed.trim(),
          age: parseInt(age) || 0,
          size,
          emoji,
          photoUri,
        },
      },
    });

    setIsEditing(false);
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const handleDelete = () => {
    haptic();
    const doDelete = () => {
      dispatch({ type: "REMOVE_PET", payload: pet.id });
      router.back();
    };

    if (Platform.OS === "web") {
      if (confirm(`${pet.name}을(를) 삭제하시겠습니까?`)) {
        doDelete();
      }
    } else {
      Alert.alert(
        "반려동물 삭제",
        `${pet.name}을(를) 삭제하시겠습니까?\n삭제된 정보는 복구할 수 없습니다.`,
        [
          { text: "취소", style: "cancel" },
          { text: "삭제", style: "destructive", onPress: doDelete },
        ]
      );
    }
  };

  const showPhotoOptions = () => {
    haptic();
    if (Platform.OS === "web") {
      handlePickImage();
      return;
    }

    const options: any[] = [
      { text: "앨범에서 선택", onPress: handlePickImage },
      { text: "카메라로 촬영", onPress: handleTakePhoto },
    ];
    if (photoUri) {
      options.push({ text: "사진 삭제", onPress: handleRemovePhoto, style: "destructive" });
    }
    options.push({ text: "취소", style: "cancel" });

    Alert.alert("프로필 사진", "사진을 선택해주세요", options);
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
        <Text style={styles.headerTitle}>{pet.name}</Text>
        {isEditing ? (
          <Pressable
            onPress={handleSave}
            style={({ pressed }) => [styles.saveBtn, pressed && { opacity: 0.85 }]}
          >
            <Text style={styles.saveBtnText}>저장</Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={() => { haptic(); setIsEditing(true); }}
            style={({ pressed }) => [styles.editHeaderBtn, pressed && { opacity: 0.7 }]}
          >
            <Text style={styles.editHeaderBtnText}>수정</Text>
          </Pressable>
        )}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* 프로필 사진 영역 */}
        <View style={styles.photoSection}>
          <Pressable
            onPress={showPhotoOptions}
            style={({ pressed }) => [styles.photoContainer, pressed && { opacity: 0.85 }]}
          >
            {photoUri ? (
              <Image
                source={{ uri: photoUri }}
                style={styles.petPhoto}
                contentFit="cover"
                transition={200}
              />
            ) : (
              <View style={styles.photoPlaceholder}>
                <Text style={{ fontSize: 60 }}>{pet.emoji}</Text>
              </View>
            )}
            <View style={styles.cameraOverlay}>
              <Text style={{ fontSize: 16 }}>📷</Text>
            </View>
          </Pressable>
          <Text style={styles.photoHint}>탭하여 사진 변경</Text>
        </View>

        {/* 정보 카드 */}
        <View style={styles.infoCard}>
          {/* 이름 */}
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>이름</Text>
            {isEditing ? (
              <TextInput
                style={styles.fieldInput}
                value={name}
                onChangeText={setName}
                placeholder="이름 입력"
                placeholderTextColor="#BDBDBD"
              />
            ) : (
              <Text style={styles.fieldValue}>{pet.name}</Text>
            )}
          </View>

          {/* 품종 */}
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>품종</Text>
            {isEditing ? (
              <TextInput
                style={styles.fieldInput}
                value={breed}
                onChangeText={setBreed}
                placeholder="품종 입력"
                placeholderTextColor="#BDBDBD"
              />
            ) : (
              <Text style={styles.fieldValue}>{pet.breed}</Text>
            )}
          </View>

          {/* 나이 */}
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>나이</Text>
            {isEditing ? (
              <TextInput
                style={styles.fieldInput}
                value={age}
                onChangeText={setAge}
                placeholder="나이 입력"
                placeholderTextColor="#BDBDBD"
                keyboardType="numeric"
              />
            ) : (
              <Text style={styles.fieldValue}>{pet.age}살</Text>
            )}
          </View>

          {/* 크기 */}
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>크기</Text>
            {isEditing ? (
              <View style={styles.sizeOptions}>
                {SIZE_OPTIONS.map((s) => (
                  <Pressable
                    key={s}
                    onPress={() => { haptic(); setSize(s); }}
                    style={({ pressed }) => [
                      styles.sizeChip,
                      size === s && styles.sizeChipActive,
                      pressed && { opacity: 0.7 },
                    ]}
                  >
                    <Text style={[styles.sizeChipText, size === s && styles.sizeChipTextActive]}>
                      {s}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ) : (
              <Text style={styles.fieldValue}>{pet.size}</Text>
            )}
          </View>

          {/* 이모지 */}
          {isEditing && (
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>아이콘</Text>
              <View style={styles.emojiOptions}>
                {EMOJI_OPTIONS.map((e) => (
                  <Pressable
                    key={e}
                    onPress={() => { haptic(); setEmoji(e); }}
                    style={({ pressed }) => [
                      styles.emojiChip,
                      emoji === e && styles.emojiChipActive,
                      pressed && { opacity: 0.7 },
                    ]}
                  >
                    <Text style={{ fontSize: 24 }}>{e}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}
        </View>

        {/* 삭제 버튼 */}
        <View style={{ paddingHorizontal: 16, marginTop: 24 }}>
          <Pressable
            onPress={handleDelete}
            style={({ pressed }) => [styles.deleteBtn, pressed && { opacity: 0.85 }]}
          >
            <Text style={styles.deleteBtnText}>🗑️ 반려동물 삭제</Text>
          </Pressable>
        </View>
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
  saveBtn: { backgroundColor: "#2E7D32", borderRadius: 8, paddingHorizontal: 14, paddingVertical: 6 },
  saveBtnText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
  editHeaderBtn: { paddingHorizontal: 10, paddingVertical: 6 },
  editHeaderBtnText: { color: "#2E7D32", fontSize: 14, fontWeight: "600" },
  photoSection: {
    alignItems: "center",
    paddingVertical: 24,
    gap: 8,
  },
  photoContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    overflow: "hidden",
    position: "relative",
    backgroundColor: "#F8F8F8",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  petPhoto: {
    width: 140,
    height: 140,
  },
  photoPlaceholder: {
    width: 140,
    height: 140,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E8F5E9",
  },
  cameraOverlay: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#2E7D32",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#FFFFFF",
  },
  photoHint: {
    fontSize: 12,
    color: "#9E9E9E",
  },
  infoCard: {
    marginHorizontal: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#F0F0F0",
    gap: 16,
  },
  fieldRow: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 12,
    color: "#9E9E9E",
    fontWeight: "600",
  },
  fieldValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1A1A1A",
  },
  fieldInput: {
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: "#1A1A1A",
  },
  sizeOptions: {
    flexDirection: "row",
    gap: 8,
  },
  sizeChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    backgroundColor: "#FFFFFF",
  },
  sizeChipActive: {
    borderColor: "#2E7D32",
    backgroundColor: "#E8F5E9",
  },
  sizeChipText: {
    fontSize: 13,
    color: "#8E8E93",
    fontWeight: "500",
  },
  sizeChipTextActive: {
    color: "#2E7D32",
    fontWeight: "700",
  },
  emojiOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  emojiChip: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  emojiChipActive: {
    borderColor: "#2E7D32",
    backgroundColor: "#E8F5E9",
    borderWidth: 2,
  },
  deleteBtn: {
    backgroundColor: "#FFF3F3",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#FFCDD2",
  },
  deleteBtnText: {
    color: "#EF5350",
    fontSize: 15,
    fontWeight: "700",
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  emptyEmoji: { fontSize: 48 },
  emptyText: { fontSize: 16, fontWeight: "600", color: "#8E8E93" },
});
