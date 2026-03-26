import React, { useState } from "react";
import {
  View,
  Text,
  Pressable,
  FlatList,
  StyleSheet,
  Platform,
  TextInput,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Alert,
  Dimensions,
} from "react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { ScreenContainer } from "@/components/screen-container";
import { useApp, Post, PostComment } from "@/lib/app-context";
import * as Haptics from "expo-haptics";

function haptic() {
  if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

type Category = "전체" | "자유" | "산책" | "돌봄" | "정보";
const CATEGORIES: Category[] = ["전체", "자유", "산책", "돌봄", "정보"];
const CATEGORY_EMOJIS: Record<string, string> = {
  "자유": "💬",
  "산책": "🚶",
  "돌봄": "🏠",
  "정보": "📢",
};

const DEMO_POSTS: Post[] = [
  {
    id: "dp1",
    authorId: "u1",
    authorNickname: "골든리트리버 맘",
    authorEmoji: "👩",
    category: "산책",
    title: "유성구 갑천변 산책 후기",
    content: "오늘 갑천변에서 골든이랑 산책했어요! 날씨가 너무 좋아서 1시간 넘게 걸었네요. 다른 강아지 친구들도 많이 만났어요 🐕\n\n산책로가 잘 정비되어 있어서 대형견도 편하게 걸을 수 있었습니다. 추천해요!",
    likes: ["u2", "u3"],
    comments: [
      { id: "dc1", authorId: "u2", authorNickname: "말티즈 아빠", content: "저도 거기 자주 가요! 다음에 같이 산책해요 🐩", createdAt: new Date(Date.now() - 3600000).toISOString() },
    ],
    createdAt: new Date(Date.now() - 7200000).toISOString(),
    neighborhood: "유성구",
  },
  {
    id: "dp2",
    authorId: "u2",
    authorNickname: "말티즈 아빠",
    authorEmoji: "👨",
    category: "정보",
    title: "둔산동 새로 오픈한 동물병원 정보",
    content: "둔산동에 새로 오픈한 '해피펫 동물병원' 다녀왔어요. 원장님이 정말 친절하시고 시설도 깔끔합니다.\n\n위치: 둔산동 갤러리아 근처\n진료시간: 오전 9시 ~ 오후 8시\n일요일 휴무",
    likes: ["u1", "u3", "u4"],
    comments: [],
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    neighborhood: "둔산",
  },
  {
    id: "dp3",
    authorId: "u3",
    authorNickname: "관평동 강아지맘",
    authorEmoji: "👩",
    category: "돌봄",
    title: "단기 돌봄 교환 후기 (대만족!)",
    content: "이번 주말에 반려이음 앱으로 단기 돌봄 교환을 했어요. 솜이를 맡기고 저도 상대방 강아지를 돌봐줬는데, 서로 너무 만족했습니다!\n\n앱으로 매칭하니까 같은 동네라 편하고, 채팅으로 미리 소통할 수 있어서 안심이 됐어요.",
    likes: ["u1"],
    comments: [
      { id: "dc2", authorId: "u4", authorNickname: "노은동 지현", content: "저도 해보고 싶어요! 어떻게 신청하나요?", createdAt: new Date(Date.now() - 43200000).toISOString() },
      { id: "dc3", authorId: "u3", authorNickname: "관평동 강아지맘", content: "홈 화면에서 '단기 돌봄 교환' 누르시면 돼요! 😊", createdAt: new Date(Date.now() - 40000000).toISOString() },
    ],
    createdAt: new Date(Date.now() - 172800000).toISOString(),
    neighborhood: "관평",
  },
  {
    id: "dp4",
    authorId: "u5",
    authorNickname: "봉명동 태양",
    authorEmoji: "👴",
    category: "자유",
    title: "우리 강아지 자랑합니다 😍",
    content: "오늘 미용 다녀온 우리 콩이! 너무 귀엽지 않나요? 미용사분이 정말 잘 해주셨어요.\n\n봉명동에 있는 '멍멍미용실' 추천합니다!",
    likes: ["u1", "u2", "u3", "u4", "u5"],
    comments: [
      { id: "dc4", authorId: "u1", authorNickname: "골든리트리버 맘", content: "너무 귀여워요!! 🥰", createdAt: new Date(Date.now() - 86400000 * 2).toISOString() },
    ],
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    neighborhood: "봉명",
  },
];

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "방금 전";
  if (mins < 60) return `${mins}분 전`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}일 전`;
  return `${Math.floor(days / 7)}주 전`;
}

export default function CommunityScreen() {
  const { state, dispatch } = useApp();
  const [selectedCategory, setSelectedCategory] = useState<Category>("전체");
  const [showWriteModal, setShowWriteModal] = useState(false);
  const [expandedPost, setExpandedPost] = useState<string | null>(null);
  const [commentText, setCommentText] = useState("");
  const [replyTo, setReplyTo] = useState<{ postId: string; authorNickname: string } | null>(null);

  // 새 게시글 작성 상태
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newCategory, setNewCategory] = useState<"자유" | "산책" | "돌봄" | "정보">("자유");
  const [newImageUri, setNewImageUri] = useState<string | null>(null);

  // 이미지 전체화면 보기
  const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);

  // 수정 모달 상태
  const [showEditModal, setShowEditModal] = useState(false);
  const [editPostId, setEditPostId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editCategory, setEditCategory] = useState<"자유" | "산책" | "돌봄" | "정보">("자유");

  // 더보기 메뉴 상태
  const [menuPostId, setMenuPostId] = useState<string | null>(null);

  const allPosts = [...(state.posts || []), ...DEMO_POSTS];
  const filteredPosts = selectedCategory === "전체"
    ? allPosts
    : allPosts.filter((p) => p.category === selectedCategory);

  const userId = "me";

  const handleLike = (postId: string) => {
    haptic();
    dispatch({ type: "LIKE_POST", payload: { postId, userId } });
  };

  const handleComment = (postId: string) => {
    if (!commentText.trim()) return;
    haptic();

    const content = replyTo
      ? `@${replyTo.authorNickname} ${commentText.trim()}`
      : commentText.trim();

    const comment: PostComment = {
      id: `c_${Date.now()}`,
      authorId: userId,
      authorNickname: state.profile.nickname || "사용자",
      content,
      createdAt: new Date().toISOString(),
    };

    dispatch({ type: "ADD_COMMENT", payload: { postId, comment } });

    // 게시글 작성자에게 댓글 알림
    const post = allPosts.find((p) => p.id === postId);
    if (post && post.authorId !== userId) {
      dispatch({
        type: "ADD_NOTIFICATION",
        payload: {
          id: `notif_${Date.now()}`,
          type: "comment",
          title: "새 댓글",
          body: `${state.profile.nickname || "사용자"}님이 "당신의 게시글"에 댓글을 달았어요: ${content.substring(0, 30)}...`,
          relatedId: postId,
          fromNickname: state.profile.nickname || "사용자",
          isRead: false,
          createdAt: new Date().toISOString(),
        },
      });
    }

    setCommentText("");
    setReplyTo(null);
  };

  const handleReplyTo = (postId: string, authorNickname: string) => {
    haptic();
    setReplyTo({ postId, authorNickname });
    setExpandedPost(postId);
  };

  const handlePickImage = async () => {
    haptic();
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]) {
        setNewImageUri(result.assets[0].uri);
      }
    } catch (_) {}
  };

  const handleSubmitPost = () => {
    if (!newTitle.trim() || !newContent.trim()) return;
    haptic();

    const post: Post = {
      id: `p_${Date.now()}`,
      authorId: userId,
      authorNickname: state.profile.nickname || "사용자",
      authorEmoji: state.profile.role === "caretaker" ? "🏠" : "🐶",
      category: newCategory,
      title: newTitle.trim(),
      content: newContent.trim(),
      imageUri: newImageUri || undefined,
      likes: [],
      comments: [],
      createdAt: new Date().toISOString(),
      neighborhood: state.profile.neighborhood || "유성구",
    };

    dispatch({ type: "ADD_POST", payload: post });
    setNewTitle("");
    setNewContent("");
    setNewImageUri(null);
    setShowWriteModal(false);

    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const handleDeletePost = (postId: string) => {
    haptic();
    const doDelete = () => {
      dispatch({ type: "DELETE_POST", payload: postId });
      setMenuPostId(null);
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    };

    if (Platform.OS === "web") {
      if (confirm("이 게시글을 삭제하시겠습니까?")) {
        doDelete();
      }
    } else {
      Alert.alert(
        "게시글 삭제",
        "이 게시글을 삭제하시겠습니까?\n삭제된 게시글은 복구할 수 없습니다.",
        [
          { text: "취소", style: "cancel" },
          { text: "삭제", style: "destructive", onPress: doDelete },
        ]
      );
    }
  };

  const handleEditPost = (post: Post) => {
    haptic();
    setEditPostId(post.id);
    setEditTitle(post.title);
    setEditContent(post.content);
    setEditCategory(post.category);
    setMenuPostId(null);
    setShowEditModal(true);
  };

  const handleSubmitEdit = () => {
    if (!editPostId || !editTitle.trim() || !editContent.trim()) return;
    haptic();

    dispatch({
      type: "EDIT_POST",
      payload: {
        postId: editPostId,
        title: editTitle.trim(),
        content: editContent.trim(),
        category: editCategory,
      },
    });

    setShowEditModal(false);
    setEditPostId(null);
    setEditTitle("");
    setEditContent("");

    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const isMyPost = (post: Post) => post.authorId === userId;

  const renderPost = ({ item }: { item: Post }) => {
    const isExpanded = expandedPost === item.id;
    const isLiked = item.likes.includes(userId);
    const isMine = isMyPost(item);
    const showMenu = menuPostId === item.id;

    return (
      <View style={styles.postCard}>
        {/* 작성자 정보 */}
        <View style={styles.postHeader}>
          <Text style={styles.postAuthorEmoji}>{item.authorEmoji}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.postAuthorName}>{item.authorNickname}</Text>
            <Text style={styles.postMeta}>
              📍 {item.neighborhood} · {timeAgo(item.createdAt)}
            </Text>
          </View>
          <View style={[styles.categoryBadge, { backgroundColor: getCategoryColor(item.category) + "20" }]}>
            <Text style={[styles.categoryBadgeText, { color: getCategoryColor(item.category) }]}>
              {CATEGORY_EMOJIS[item.category]} {item.category}
            </Text>
          </View>
          {isMine && (
            <Pressable
              onPress={() => { haptic(); setMenuPostId(showMenu ? null : item.id); }}
              style={({ pressed }) => [styles.moreBtn, pressed && { opacity: 0.6 }]}
            >
              <Text style={styles.moreBtnText}>⋯</Text>
            </Pressable>
          )}
        </View>

        {/* 더보기 메뉴 */}
        {showMenu && isMine && (
          <View style={styles.menuDropdown}>
            <Pressable
              onPress={() => handleEditPost(item)}
              style={({ pressed }) => [styles.menuItem, pressed && { backgroundColor: "#F8F8F8" }]}
            >
              <Text style={styles.menuItemText}>✏️ 수정하기</Text>
            </Pressable>
            <View style={styles.menuDivider} />
            <Pressable
              onPress={() => handleDeletePost(item.id)}
              style={({ pressed }) => [styles.menuItem, pressed && { backgroundColor: "#FFF3F3" }]}
            >
              <Text style={[styles.menuItemText, { color: "#EF5350" }]}>🗑️ 삭제하기</Text>
            </Pressable>
          </View>
        )}

        {/* 제목 및 내용 */}
        <Text style={styles.postTitle}>{item.title}</Text>
        <Text style={styles.postContent} numberOfLines={isExpanded ? undefined : 3}>
          {item.content}
        </Text>

        {/* 이미지 */}
        {item.imageUri && (
          <Pressable
            onPress={() => setFullScreenImage(item.imageUri!)}
            style={({ pressed }) => [pressed && { opacity: 0.9 }]}
          >
            <Image
              source={{ uri: item.imageUri }}
              style={styles.postImage}
              contentFit="cover"
              transition={200}
            />
          </Pressable>
        )}

        {/* 좋아요 & 댓글 */}
        <View style={styles.postActions}>
          <Pressable
            onPress={() => handleLike(item.id)}
            style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.7 }]}
          >
            <Text style={[styles.actionText, isLiked && { color: "#EF5350" }]}>
              {isLiked ? "❤️" : "🤍"} {item.likes.length}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => { haptic(); setExpandedPost(isExpanded ? null : item.id); }}
            style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.7 }]}
          >
            <Text style={styles.actionText}>💬 {item.comments.length}</Text>
          </Pressable>
        </View>

        {/* 댓글 섹션 */}
        {isExpanded && (
          <View style={styles.commentsSection}>
            {item.comments.length === 0 && (
              <Text style={styles.noCommentsText}>아직 댓글이 없어요. 첫 댓글을 달아보세요!</Text>
            )}
            {item.comments.map((c) => {
              const isReply = c.content.startsWith("@");
              return (
                <View key={c.id} style={[styles.commentItem, isReply && styles.commentItemReply]}>
                  <View style={styles.commentHeader}>
                    <Text style={styles.commentAuthor}>{c.authorNickname}</Text>
                    <Text style={styles.commentTime}>{timeAgo(c.createdAt)}</Text>
                  </View>
                  <Text style={styles.commentContent}>
                    {isReply ? (
                      <>
                        <Text style={styles.mentionText}>{c.content.split(" ")[0]} </Text>
                        {c.content.substring(c.content.indexOf(" ") + 1)}
                      </>
                    ) : c.content}
                  </Text>
                  {c.authorId !== userId && (
                    <Pressable
                      onPress={() => handleReplyTo(item.id, c.authorNickname)}
                      style={({ pressed }) => [styles.replyBtn, pressed && { opacity: 0.7 }]}
                    >
                      <Text style={styles.replyBtnText}>답글</Text>
                    </Pressable>
                  )}
                </View>
              );
            })}

            {/* 답글 대상 표시 */}
            {replyTo && replyTo.postId === item.id && (
              <View style={styles.replyToBar}>
                <Text style={styles.replyToText}>@{replyTo.authorNickname}님에게 답글</Text>
                <Pressable
                  onPress={() => { haptic(); setReplyTo(null); }}
                  style={({ pressed }) => [pressed && { opacity: 0.7 }]}
                >
                  <Text style={styles.replyToCancelText}>✕</Text>
                </Pressable>
              </View>
            )}

            <View style={styles.commentInputRow}>
              <TextInput
                style={styles.commentInput}
                placeholder={replyTo && replyTo.postId === item.id ? `@${replyTo.authorNickname}님에게 답글...` : "댓글을 입력하세요..."}
                placeholderTextColor="#BDBDBD"
                value={commentText}
                onChangeText={setCommentText}
                returnKeyType="send"
                onSubmitEditing={() => handleComment(item.id)}
              />
              <Pressable
                onPress={() => handleComment(item.id)}
                disabled={!commentText.trim()}
                style={({ pressed }) => [
                  styles.commentSendBtn,
                  !commentText.trim() && { opacity: 0.4 },
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Text style={styles.commentSendBtnText}>등록</Text>
              </Pressable>
            </View>
          </View>
        )}
      </View>
    );
  };

  return (
    <ScreenContainer className="pt-2">
      {/* 헤더 */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>커뮤니티</Text>
        <Pressable
          onPress={() => { haptic(); setShowWriteModal(true); }}
          style={({ pressed }) => [styles.writeBtn, pressed && { opacity: 0.85 }]}
        >
          <Text style={styles.writeBtnText}>✏️ 글쓰기</Text>
        </Pressable>
      </View>

      {/* 카테고리 필터 */}
      <View style={styles.categoryRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
          {CATEGORIES.map((cat) => (
            <Pressable
              key={cat}
              onPress={() => { haptic(); setSelectedCategory(cat); }}
              style={({ pressed }) => [
                styles.categoryChip,
                selectedCategory === cat && styles.categoryChipActive,
                pressed && { opacity: 0.7 },
              ]}
            >
              <Text style={[
                styles.categoryChipText,
                selectedCategory === cat && styles.categoryChipTextActive,
              ]}>
                {cat === "전체" ? "전체" : `${CATEGORY_EMOJIS[cat]} ${cat}`}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* 게시글 목록 */}
      <FlatList
        data={filteredPosts}
        renderItem={renderPost}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.postList}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>📝</Text>
            <Text style={styles.emptyText}>아직 게시글이 없어요</Text>
            <Text style={styles.emptySubText}>첫 번째 글을 작성해보세요!</Text>
          </View>
        }
      />

      {/* 글쓰기 모달 */}
      <Modal visible={showWriteModal} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Pressable
                onPress={() => { haptic(); setShowWriteModal(false); }}
                style={({ pressed }) => [pressed && { opacity: 0.7 }]}
              >
                <Text style={styles.modalCancel}>취소</Text>
              </Pressable>
              <Text style={styles.modalTitle}>새 글 작성</Text>
              <Pressable
                onPress={handleSubmitPost}
                disabled={!newTitle.trim() || !newContent.trim()}
                style={({ pressed }) => [
                  styles.modalSubmitBtn,
                  (!newTitle.trim() || !newContent.trim()) && { opacity: 0.4 },
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Text style={styles.modalSubmitText}>등록</Text>
              </Pressable>
            </View>

            {/* 카테고리 선택 */}
            <View style={styles.modalCategoryRow}>
              {(["자유", "산책", "돌봄", "정보"] as const).map((cat) => (
                <Pressable
                  key={cat}
                  onPress={() => { haptic(); setNewCategory(cat); }}
                  style={({ pressed }) => [
                    styles.modalCategoryChip,
                    newCategory === cat && { backgroundColor: getCategoryColor(cat), borderColor: getCategoryColor(cat) },
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <Text style={[
                    styles.modalCategoryText,
                    newCategory === cat && { color: "#FFFFFF" },
                  ]}>
                    {CATEGORY_EMOJIS[cat]} {cat}
                  </Text>
                </Pressable>
              ))}
            </View>

            <TextInput
              style={styles.modalTitleInput}
              placeholder="제목을 입력하세요"
              placeholderTextColor="#BDBDBD"
              value={newTitle}
              onChangeText={setNewTitle}
              maxLength={50}
            />
            <TextInput
              style={styles.modalContentInput}
              placeholder="내용을 입력하세요..."
              placeholderTextColor="#BDBDBD"
              value={newContent}
              onChangeText={setNewContent}
              multiline
              maxLength={1000}
              textAlignVertical="top"
            />

            {/* 이미지 첨부 */}
            {newImageUri ? (
              <View style={styles.imagePreviewContainer}>
                <Image source={{ uri: newImageUri }} style={styles.imagePreview} contentFit="cover" />
                <Pressable
                  onPress={() => { haptic(); setNewImageUri(null); }}
                  style={({ pressed }) => [styles.imageRemoveBtn, pressed && { opacity: 0.7 }]}
                >
                  <Text style={styles.imageRemoveBtnText}>✕</Text>
                </Pressable>
              </View>
            ) : (
              <Pressable
                onPress={handlePickImage}
                style={({ pressed }) => [styles.imageAttachBtn, pressed && { opacity: 0.7 }]}
              >
                <Text style={styles.imageAttachBtnText}>📷 사진 첨부</Text>
              </Pressable>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* 이미지 전체화면 모달 */}
      <Modal visible={!!fullScreenImage} animationType="fade" transparent>
        <Pressable
          onPress={() => setFullScreenImage(null)}
          style={styles.fullScreenOverlay}
        >
          <View style={styles.fullScreenCloseBtn}>
            <Text style={styles.fullScreenCloseText}>✕ 닫기</Text>
          </View>
          {fullScreenImage && (
            <Image
              source={{ uri: fullScreenImage }}
              style={styles.fullScreenImage}
              contentFit="contain"
            />
          )}
        </Pressable>
      </Modal>

      {/* 수정 모달 */}
      <Modal visible={showEditModal} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Pressable
                onPress={() => { haptic(); setShowEditModal(false); setEditPostId(null); }}
                style={({ pressed }) => [pressed && { opacity: 0.7 }]}
              >
                <Text style={styles.modalCancel}>취소</Text>
              </Pressable>
              <Text style={styles.modalTitle}>글 수정</Text>
              <Pressable
                onPress={handleSubmitEdit}
                disabled={!editTitle.trim() || !editContent.trim()}
                style={({ pressed }) => [
                  styles.modalSubmitBtn,
                  (!editTitle.trim() || !editContent.trim()) && { opacity: 0.4 },
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Text style={styles.modalSubmitText}>수정</Text>
              </Pressable>
            </View>

            {/* 카테고리 선택 */}
            <View style={styles.modalCategoryRow}>
              {(["자유", "산책", "돌봄", "정보"] as const).map((cat) => (
                <Pressable
                  key={cat}
                  onPress={() => { haptic(); setEditCategory(cat); }}
                  style={({ pressed }) => [
                    styles.modalCategoryChip,
                    editCategory === cat && { backgroundColor: getCategoryColor(cat), borderColor: getCategoryColor(cat) },
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <Text style={[
                    styles.modalCategoryText,
                    editCategory === cat && { color: "#FFFFFF" },
                  ]}>
                    {CATEGORY_EMOJIS[cat]} {cat}
                  </Text>
                </Pressable>
              ))}
            </View>

            <TextInput
              style={styles.modalTitleInput}
              placeholder="제목을 입력하세요"
              placeholderTextColor="#BDBDBD"
              value={editTitle}
              onChangeText={setEditTitle}
              maxLength={50}
            />
            <TextInput
              style={styles.modalContentInput}
              placeholder="내용을 입력하세요..."
              placeholderTextColor="#BDBDBD"
              value={editContent}
              onChangeText={setEditContent}
              multiline
              maxLength={1000}
              textAlignVertical="top"
            />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ScreenContainer>
  );
}

function getCategoryColor(cat: string): string {
  switch (cat) {
    case "자유": return "#9C27B0";
    case "산책": return "#FF7043";
    case "돌봄": return "#4CAF82";
    case "정보": return "#2196F3";
    default: return "#8E8E93";
  }
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerTitle: { fontSize: 24, fontWeight: "800", color: "#1A1A1A" },
  writeBtn: { backgroundColor: "#FF7043", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  writeBtnText: { color: "#FFFFFF", fontSize: 13, fontWeight: "700" },
  categoryRow: { paddingVertical: 8 },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    backgroundColor: "#FFFFFF",
  },
  categoryChipActive: { borderColor: "#FF7043", backgroundColor: "#FF7043" },
  categoryChipText: { fontSize: 13, color: "#8E8E93", fontWeight: "500" },
  categoryChipTextActive: { color: "#FFFFFF", fontWeight: "700" },
  postList: { padding: 16, gap: 14, paddingBottom: 40 },
  postCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#F0F0F0",
    gap: 10,
  },
  postHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  postAuthorEmoji: { fontSize: 28 },
  postAuthorName: { fontSize: 14, fontWeight: "700", color: "#1A1A1A" },
  postMeta: { fontSize: 11, color: "#9E9E9E", marginTop: 1 },
  categoryBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  categoryBadgeText: { fontSize: 11, fontWeight: "600" },
  moreBtn: { paddingHorizontal: 8, paddingVertical: 4 },
  moreBtnText: { fontSize: 20, color: "#9E9E9E", fontWeight: "700" },
  menuDropdown: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  menuItem: { paddingHorizontal: 16, paddingVertical: 12 },
  menuItemText: { fontSize: 14, fontWeight: "600", color: "#1A1A1A" },
  menuDivider: { height: 1, backgroundColor: "#F0F0F0" },
  postTitle: { fontSize: 16, fontWeight: "700", color: "#1A1A1A" },
  postContent: { fontSize: 14, color: "#8E8E93", lineHeight: 20 },
  postActions: { flexDirection: "row", gap: 16, paddingTop: 4 },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  actionText: { fontSize: 13, color: "#8E8E93" },
  commentsSection: {
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
    paddingTop: 12,
    gap: 10,
  },
  commentItem: {
    backgroundColor: "#FAFAFA",
    borderRadius: 10,
    padding: 10,
    gap: 4,
  },
  commentItemReply: {
    marginLeft: 16,
    borderLeftWidth: 2,
    borderLeftColor: "#FF704330",
  },
  commentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  commentAuthor: { fontSize: 12, fontWeight: "700", color: "#1A1A1A" },
  commentContent: { fontSize: 13, color: "#8E8E93", lineHeight: 18 },
  commentTime: { fontSize: 10, color: "#9E9E9E" },
  mentionText: { color: "#FF7043", fontWeight: "700" },
  noCommentsText: { fontSize: 13, color: "#BDBDBD", textAlign: "center", paddingVertical: 8 },
  replyBtn: { alignSelf: "flex-start", paddingVertical: 2 },
  replyBtnText: { fontSize: 11, color: "#FF7043", fontWeight: "600" },
  replyToBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#FFF3EE",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "#FFCCBC",
  },
  replyToText: { fontSize: 12, color: "#FF7043", fontWeight: "600" },
  replyToCancelText: { fontSize: 14, color: "#9E9E9E", fontWeight: "700" },
  commentInputRow: { flexDirection: "row", gap: 8, marginTop: 4 },
  commentInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: "#1A1A1A",
  },
  commentSendBtn: { backgroundColor: "#FF7043", borderRadius: 10, paddingHorizontal: 14, justifyContent: "center" },
  commentSendBtnText: { color: "#FFFFFF", fontSize: 13, fontWeight: "700" },
  emptyContainer: { alignItems: "center", paddingVertical: 60, gap: 8 },
  emptyEmoji: { fontSize: 48 },
  emptyText: { fontSize: 16, fontWeight: "600", color: "#8E8E93" },
  emptySubText: { fontSize: 13, color: "#9E9E9E" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: "85%",
    gap: 14,
  },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  modalCancel: { fontSize: 15, color: "#8E8E93" },
  modalTitle: { fontSize: 17, fontWeight: "700", color: "#1A1A1A" },
  modalSubmitBtn: { backgroundColor: "#FF7043", borderRadius: 8, paddingHorizontal: 14, paddingVertical: 6 },
  modalSubmitText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
  modalCategoryRow: { flexDirection: "row", gap: 8 },
  modalCategoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  modalCategoryText: { fontSize: 12, color: "#8E8E93", fontWeight: "500" },
  modalTitleInput: {
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: "#1A1A1A",
    fontWeight: "600",
  },
  modalContentInput: {
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: "#1A1A1A",
    minHeight: 150,
    lineHeight: 22,
  },
  postImage: {
    width: "100%" as unknown as number,
    height: 200,
    borderRadius: 12,
  },
  imagePreviewContainer: {
    position: "relative" as const,
    borderRadius: 12,
    overflow: "hidden" as const,
  },
  imagePreview: {
    width: "100%" as unknown as number,
    height: 160,
    borderRadius: 12,
  },
  imageRemoveBtn: {
    position: "absolute" as const,
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  imageRemoveBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700" as const,
  },
  imageAttachBtn: {
    borderWidth: 1.5,
    borderColor: "#E0E0E0",
    borderStyle: "dashed" as const,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center" as const,
  },
  imageAttachBtnText: {
    fontSize: 14,
    color: "#9E9E9E",
    fontWeight: "600" as const,
  },
  fullScreenOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },
  fullScreenCloseBtn: {
    position: "absolute" as const,
    top: 60,
    right: 20,
    zIndex: 10,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  fullScreenCloseText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600" as const,
  },
  fullScreenImage: {
    width: Dimensions.get("window").width,
    height: Dimensions.get("window").height * 0.7,
  },
});
