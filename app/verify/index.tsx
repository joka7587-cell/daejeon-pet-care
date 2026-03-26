import { useState, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Alert,
  Platform,
  Modal,
  TextInput,
} from "react-native";
import { Image } from "expo-image";
import { ScreenContainer } from "@/components/screen-container";
import { useApp, WalkerVerification } from "@/lib/app-context";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";

function haptic() {
  if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

// 반려동물 관련 전문성 퀴즈 문항
const QUIZ_QUESTIONS = [
  {
    id: 1,
    question: "반려견이 산책 중 다른 개에게 공격적인 행동을 보일 때 가장 적절한 대처는?",
    options: [
      "목줄을 강하게 당겨 제지한다",
      "침착하게 방향을 바꿔 거리를 둔다",
      "큰 소리로 혼을 낸다",
      "그냥 지나가도록 둔다",
    ],
    correct: 1,
  },
  {
    id: 2,
    question: "여름철 반려견 산책 시 주의해야 할 사항으로 가장 중요한 것은?",
    options: [
      "가능한 오래 산책시킨다",
      "아스팔트 온도를 확인하고 이른 아침이나 저녁에 산책한다",
      "물을 산책 후에만 준다",
      "직사광선 아래에서 훈련시킨다",
    ],
    correct: 1,
  },
  {
    id: 3,
    question: "반려견의 체온이 정상 범위인 것은?",
    options: [
      "35.5~36.5°C",
      "36.5~37.5°C",
      "38.0~39.2°C",
      "40.0~41.0°C",
    ],
    correct: 2,
  },
  {
    id: 4,
    question: "반려견이 초콜릿을 섭취했을 때 올바른 대처는?",
    options: [
      "물을 많이 먹인다",
      "즉시 동물병원에 연락한다",
      "다음 날까지 관찰한다",
      "우유를 먹인다",
    ],
    correct: 1,
  },
  {
    id: 5,
    question: "소형견의 일일 적정 산책 시간은?",
    options: [
      "5~10분",
      "20~30분",
      "1~2시간",
      "3시간 이상",
    ],
    correct: 1,
  },
  {
    id: 6,
    question: "반려견이 꼬리를 다리 사이에 감추는 행동의 의미는?",
    options: [
      "기쁨",
      "공격 준비",
      "두려움 또는 불안",
      "배고픔",
    ],
    correct: 2,
  },
  {
    id: 7,
    question: "반려견 산책 시 리드줄(목줄)의 적정 길이는?",
    options: [
      "30cm 이내",
      "1~2m",
      "5m 이상",
      "리드줄 없이 산책",
    ],
    correct: 1,
  },
  {
    id: 8,
    question: "반려견에게 절대 먹이면 안 되는 음식이 아닌 것은?",
    options: [
      "포도",
      "양파",
      "삶은 닭가슴살",
      "자일리톨",
    ],
    correct: 2,
  },
  {
    id: 9,
    question: "반려견이 헐떡거리며 침을 많이 흘리고 비틀거릴 때 의심할 수 있는 것은?",
    options: [
      "배고픔",
      "열사병(열중증)",
      "기쁨",
      "졸림",
    ],
    correct: 1,
  },
  {
    id: 10,
    question: "산책 중 반려견이 풀을 뜯어먹는 행동의 일반적인 원인은?",
    options: [
      "배가 고파서",
      "소화 불량이나 위장 불편감 해소",
      "장난",
      "영양 과잉",
    ],
    correct: 1,
  },
];

const CERT_TYPES = [
  { id: "pet_sitter", label: "반려동물행동교정사", emoji: "🎓" },
  { id: "groomer", label: "반려동물미용사", emoji: "✂️" },
  { id: "trainer", label: "반려견훈련사", emoji: "🐕" },
  { id: "vet_tech", label: "동물간호복지사", emoji: "🏥" },
  { id: "pet_manager", label: "반려동물관리사", emoji: "📋" },
  { id: "other", label: "기타 관련 자격증", emoji: "📜" },
];

type VerifyStep = "overview" | "cert" | "identity" | "quiz" | "result";

export default function VerifyScreen() {
  const { state, dispatch } = useApp();
  const router = useRouter();
  const verification = state.walkerVerification;

  const [step, setStep] = useState<VerifyStep>("overview");
  const [certImageUri, setCertImageUri] = useState<string | undefined>(verification.certImageUri);
  const [selectedCertType, setSelectedCertType] = useState<string>(verification.certType || "");
  const [identityAgreed, setIdentityAgreed] = useState(verification.identityAgreed);
  const [bgCheckAgreed, setBgCheckAgreed] = useState(verification.backgroundCheckAgreed);

  // 퀴즈 상태
  const [quizIndex, setQuizIndex] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [quizFinished, setQuizFinished] = useState(false);
  const [quizScore, setQuizScore] = useState(0);

  const accentColor = "#4CAF82";

  const getVerificationProgress = () => {
    let count = 0;
    if (verification.certUploaded) count++;
    if (verification.identityAgreed && verification.backgroundCheckAgreed) count++;
    if (verification.quizPassed) count++;
    return count;
  };

  const getLevelLabel = (level: WalkerVerification["verificationLevel"]) => {
    switch (level) {
      case "none": return "미인증";
      case "basic": return "기본 인증";
      case "certified": return "전문 인증";
      case "premium": return "프리미엄 인증";
    }
  };

  const getLevelColor = (level: WalkerVerification["verificationLevel"]) => {
    switch (level) {
      case "none": return "#9E9E9E";
      case "basic": return "#FF9800";
      case "certified": return "#2196F3";
      case "premium": return "#9C27B0";
    }
  };

  const getLevelEmoji = (level: WalkerVerification["verificationLevel"]) => {
    switch (level) {
      case "none": return "⚪";
      case "basic": return "🟡";
      case "certified": return "🔵";
      case "premium": return "🟣";
    }
  };

  // 자격증 업로드
  const handlePickCert = async () => {
    haptic();
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setCertImageUri(result.assets[0].uri);
    }
  };

  const handleCertSubmit = () => {
    if (!certImageUri || !selectedCertType) {
      const msg = "자격증 이미지와 종류를 모두 선택해주세요.";
      Platform.OS === "web" ? alert(msg) : Alert.alert("알림", msg);
      return;
    }
    haptic();
    dispatch({
      type: "SET_WALKER_VERIFICATION",
      payload: {
        certUploaded: true,
        certImageUri,
        certType: selectedCertType,
      },
    });
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setStep("overview");
  };

  // 신원 확인
  const handleIdentitySubmit = () => {
    if (!identityAgreed || !bgCheckAgreed) {
      const msg = "모든 항목에 동의해주세요.";
      Platform.OS === "web" ? alert(msg) : Alert.alert("알림", msg);
      return;
    }
    haptic();
    dispatch({
      type: "SET_WALKER_VERIFICATION",
      payload: {
        identityAgreed: true,
        backgroundCheckAgreed: true,
      },
    });
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setStep("overview");
  };

  // 퀴즈
  const handleQuizAnswer = (answerIndex: number) => {
    haptic();
    setSelectedAnswer(answerIndex);
  };

  const handleQuizNext = () => {
    if (selectedAnswer === null) return;
    haptic();
    const newAnswers = [...answers, selectedAnswer];
    setAnswers(newAnswers);
    setSelectedAnswer(null);

    if (quizIndex < QUIZ_QUESTIONS.length - 1) {
      setQuizIndex(quizIndex + 1);
    } else {
      // 채점
      let correct = 0;
      newAnswers.forEach((a, i) => {
        if (a === QUIZ_QUESTIONS[i].correct) correct++;
      });
      const score = Math.round((correct / QUIZ_QUESTIONS.length) * 100);
      setQuizScore(score);
      setQuizFinished(true);

      const passed = score >= 80;
      // 인증 레벨 결정
      let level: WalkerVerification["verificationLevel"] = "none";
      const v = state.walkerVerification;
      if (passed && v.certUploaded && v.identityAgreed) {
        level = "premium";
      } else if (passed && (v.certUploaded || v.identityAgreed)) {
        level = "certified";
      } else if (passed) {
        level = "basic";
      }

      dispatch({
        type: "SET_WALKER_VERIFICATION",
        payload: {
          quizPassed: passed,
          quizScore: score,
          quizDate: new Date().toISOString(),
          isVerified: passed,
          verifiedAt: passed ? new Date().toISOString() : undefined,
          verificationLevel: level,
        },
      });

      if (passed) {
        dispatch({
          type: "SET_PROFILE",
          payload: { hasTrainerCert: v.certUploaded },
        });
        dispatch({
          type: "ADD_NOTIFICATION",
          payload: {
            id: `notif_verify_${Date.now()}`,
            type: "match",
            title: "🎉 인증 완료!",
            body: `전문성 테스트를 통과하여 ${getLevelLabel(level)} 마크를 획득했습니다.`,
            isRead: false,
            createdAt: new Date().toISOString(),
          },
        });
      }
    }
  };

  const handleQuizRetry = () => {
    haptic();
    setQuizIndex(0);
    setAnswers([]);
    setSelectedAnswer(null);
    setQuizFinished(false);
    setQuizScore(0);
  };

  // === 개요 화면 ===
  if (step === "overview") {
    const progress = getVerificationProgress();
    return (
      <ScreenContainer edges={["top", "left", "right"]}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
          {/* 헤더 */}
          <View style={styles.header}>
            <Pressable onPress={() => { haptic(); router.back(); }} style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.7 }]}>
              <Text style={{ fontSize: 18 }}>←</Text>
            </Pressable>
            <Text style={[styles.headerTitle, { color: "#1A1A1A" }]}>도그워커 인증</Text>
            <View style={{ width: 40 }} />
          </View>

          {/* 인증 상태 카드 */}
          <View style={[styles.statusCard, { borderColor: getLevelColor(verification.verificationLevel) + "40" }]}>
            <View style={styles.statusTop}>
              <Text style={{ fontSize: 40 }}>{getLevelEmoji(verification.verificationLevel)}</Text>
              <View style={{ flex: 1, marginLeft: 16 }}>
                <Text style={[styles.statusLevel, { color: getLevelColor(verification.verificationLevel) }]}>
                  {getLevelLabel(verification.verificationLevel)}
                </Text>
                <Text style={[styles.statusDesc, { color: "#8E8E93" }]}>
                  {verification.isVerified
                    ? "인증이 완료되었습니다. 프로필에 인증 마크가 표시됩니다."
                    : "아래 단계를 완료하여 인증 마크를 획득하세요."}
                </Text>
              </View>
            </View>
            {/* 진행률 바 */}
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${(progress / 3) * 100}%`, backgroundColor: getLevelColor(verification.verificationLevel) }]} />
            </View>
            <Text style={[styles.progressText, { color: "#8E8E93" }]}>{progress}/3 단계 완료</Text>
          </View>

          {/* 인증 단계 카드들 */}
          <View style={styles.stepsContainer}>
            {/* 1. 자격증 업로드 */}
            <Pressable
              onPress={() => { haptic(); setStep("cert"); }}
              style={({ pressed }) => [
                styles.stepCard,
                { borderColor: verification.certUploaded ? accentColor + "60" : "#E8E8E8", backgroundColor: verification.certUploaded ? accentColor + "08" : "#F8F8F8" },
                pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] },
              ]}
            >
              <View style={styles.stepHeader}>
                <View style={[styles.stepNumber, { backgroundColor: verification.certUploaded ? accentColor : "#8E8E93" + "40" }]}>
                  <Text style={styles.stepNumberText}>{verification.certUploaded ? "✓" : "1"}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.stepTitle, { color: "#1A1A1A" }]}>자격증 업로드</Text>
                  <Text style={[styles.stepSubtitle, { color: "#8E8E93" }]}>
                    {verification.certUploaded
                      ? `${CERT_TYPES.find(c => c.id === verification.certType)?.label || "자격증"} 업로드 완료`
                      : "반려동물 관련 자격증을 업로드하세요"}
                  </Text>
                </View>
                <Text style={{ fontSize: 16, color: "#8E8E93" }}>→</Text>
              </View>
            </Pressable>

            {/* 2. 신원 확인 */}
            <Pressable
              onPress={() => { haptic(); setStep("identity"); }}
              style={({ pressed }) => [
                styles.stepCard,
                { borderColor: (verification.identityAgreed && verification.backgroundCheckAgreed) ? accentColor + "60" : "#E8E8E8", backgroundColor: (verification.identityAgreed && verification.backgroundCheckAgreed) ? accentColor + "08" : "#F8F8F8" },
                pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] },
              ]}
            >
              <View style={styles.stepHeader}>
                <View style={[styles.stepNumber, { backgroundColor: (verification.identityAgreed && verification.backgroundCheckAgreed) ? accentColor : "#8E8E93" + "40" }]}>
                  <Text style={styles.stepNumberText}>{(verification.identityAgreed && verification.backgroundCheckAgreed) ? "✓" : "2"}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.stepTitle, { color: "#1A1A1A" }]}>신원 확인</Text>
                  <Text style={[styles.stepSubtitle, { color: "#8E8E93" }]}>
                    {(verification.identityAgreed && verification.backgroundCheckAgreed)
                      ? "신분증 대조 및 범죄이력 조회 동의 완료"
                      : "신분증 대조 및 범죄이력 조회에 동의하세요"}
                  </Text>
                </View>
                <Text style={{ fontSize: 16, color: "#8E8E93" }}>→</Text>
              </View>
            </Pressable>

            {/* 3. 전문성 테스트 */}
            <Pressable
              onPress={() => { haptic(); setStep("quiz"); }}
              style={({ pressed }) => [
                styles.stepCard,
                { borderColor: verification.quizPassed ? accentColor + "60" : "#E8E8E8", backgroundColor: verification.quizPassed ? accentColor + "08" : "#F8F8F8" },
                pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] },
              ]}
            >
              <View style={styles.stepHeader}>
                <View style={[styles.stepNumber, { backgroundColor: verification.quizPassed ? accentColor : "#8E8E93" + "40" }]}>
                  <Text style={styles.stepNumberText}>{verification.quizPassed ? "✓" : "3"}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.stepTitle, { color: "#1A1A1A" }]}>전문성 테스트</Text>
                  <Text style={[styles.stepSubtitle, { color: "#8E8E93" }]}>
                    {verification.quizPassed
                      ? `${verification.quizScore}점으로 통과! (80점 이상)`
                      : "반려동물 관리 퀴즈 10문항 (80점 이상 통과)"}
                  </Text>
                </View>
                <Text style={{ fontSize: 16, color: "#8E8E93" }}>→</Text>
              </View>
            </Pressable>
          </View>

          {/* 인증 혜택 안내 */}
          <View style={[styles.benefitCard, { backgroundColor: "#F8F8F8", borderColor: "#E8E8E8" }]}>
            <Text style={[styles.benefitTitle, { color: "#1A1A1A" }]}>인증 혜택</Text>
            <View style={styles.benefitRow}>
              <Text style={{ fontSize: 20 }}>🟡</Text>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.benefitLabel, { color: "#1A1A1A" }]}>기본 인증</Text>
                <Text style={[styles.benefitDesc, { color: "#8E8E93" }]}>퀴즈 통과 시 기본 인증 마크 부여</Text>
              </View>
            </View>
            <View style={styles.benefitRow}>
              <Text style={{ fontSize: 20 }}>🔵</Text>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.benefitLabel, { color: "#1A1A1A" }]}>전문 인증</Text>
                <Text style={[styles.benefitDesc, { color: "#8E8E93" }]}>퀴즈 + 자격증 또는 신원확인 완료</Text>
              </View>
            </View>
            <View style={styles.benefitRow}>
              <Text style={{ fontSize: 20 }}>🟣</Text>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.benefitLabel, { color: "#1A1A1A" }]}>프리미엄 인증</Text>
                <Text style={[styles.benefitDesc, { color: "#8E8E93" }]}>전체 3단계 완료 시 최고 등급 부여, 검색 상위 노출</Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </ScreenContainer>
    );
  }

  // === 자격증 업로드 화면 ===
  if (step === "cert") {
    return (
      <ScreenContainer edges={["top", "left", "right"]}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
          <View style={styles.header}>
            <Pressable onPress={() => { haptic(); setStep("overview"); }} style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.7 }]}>
              <Text style={{ fontSize: 18 }}>←</Text>
            </Pressable>
            <Text style={[styles.headerTitle, { color: "#1A1A1A" }]}>자격증 업로드</Text>
            <View style={{ width: 40 }} />
          </View>

          <View style={styles.formSection}>
            <Text style={[styles.formLabel, { color: "#1A1A1A" }]}>자격증 종류 선택</Text>
            <View style={styles.certGrid}>
              {CERT_TYPES.map((cert) => (
                <Pressable
                  key={cert.id}
                  onPress={() => { haptic(); setSelectedCertType(cert.id); }}
                  style={({ pressed }) => [
                    styles.certChip,
                    {
                      borderColor: selectedCertType === cert.id ? accentColor : "#E8E8E8",
                      backgroundColor: selectedCertType === cert.id ? accentColor + "15" : "#F8F8F8",
                    },
                    pressed && { opacity: 0.8 },
                  ]}
                >
                  <Text style={{ fontSize: 20 }}>{cert.emoji}</Text>
                  <Text style={[styles.certChipLabel, { color: selectedCertType === cert.id ? accentColor : "#1A1A1A" }]}>
                    {cert.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.formSection}>
            <Text style={[styles.formLabel, { color: "#1A1A1A" }]}>자격증 이미지</Text>
            <Pressable
              onPress={handlePickCert}
              style={({ pressed }) => [
                styles.uploadArea,
                { borderColor: certImageUri ? accentColor : "#E8E8E8", backgroundColor: "#F8F8F8" },
                pressed && { opacity: 0.8 },
              ]}
            >
              {certImageUri ? (
                <Image source={{ uri: certImageUri }} style={styles.certPreview} contentFit="contain" />
              ) : (
                <View style={styles.uploadPlaceholder}>
                  <Text style={{ fontSize: 40 }}>📄</Text>
                  <Text style={[styles.uploadText, { color: "#8E8E93" }]}>탭하여 자격증 이미지를 선택하세요</Text>
                  <Text style={[styles.uploadHint, { color: "#8E8E93" }]}>JPG, PNG 형식 지원</Text>
                </View>
              )}
            </Pressable>
          </View>

          <Pressable
            onPress={handleCertSubmit}
            style={({ pressed }) => [
              styles.submitBtn,
              { backgroundColor: (certImageUri && selectedCertType) ? accentColor : "#8E8E93" + "40" },
              pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] },
            ]}
          >
            <Text style={styles.submitBtnText}>자격증 제출하기</Text>
          </Pressable>
        </ScrollView>
      </ScreenContainer>
    );
  }

  // === 신원 확인 화면 ===
  if (step === "identity") {
    return (
      <ScreenContainer edges={["top", "left", "right"]}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
          <View style={styles.header}>
            <Pressable onPress={() => { haptic(); setStep("overview"); }} style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.7 }]}>
              <Text style={{ fontSize: 18 }}>←</Text>
            </Pressable>
            <Text style={[styles.headerTitle, { color: "#1A1A1A" }]}>신원 확인</Text>
            <View style={{ width: 40 }} />
          </View>

          <View style={[styles.infoCard, { backgroundColor: "#FFF8E1", borderColor: "#FFE082" }]}>
            <Text style={{ fontSize: 20 }}>🔒</Text>
            <Text style={[styles.infoText, { color: "#F57F17" }]}>
              개인정보는 안전하게 암호화되어 저장되며, 인증 목적으로만 사용됩니다.
            </Text>
          </View>

          <View style={styles.formSection}>
            <Text style={[styles.formLabel, { color: "#1A1A1A" }]}>신원 확인 동의</Text>

            {/* 신분증 대조 동의 */}
            <Pressable
              onPress={() => { haptic(); setIdentityAgreed(!identityAgreed); }}
              style={({ pressed }) => [
                styles.agreementCard,
                {
                  borderColor: identityAgreed ? accentColor : "#E8E8E8",
                  backgroundColor: identityAgreed ? accentColor + "08" : "#F8F8F8",
                },
                pressed && { opacity: 0.8 },
              ]}
            >
              <View style={[styles.checkbox, { borderColor: identityAgreed ? accentColor : "#8E8E93", backgroundColor: identityAgreed ? accentColor : "transparent" }]}>
                {identityAgreed && <Text style={{ color: "#FFFFFF", fontSize: 14, fontWeight: "700" }}>✓</Text>}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.agreementTitle, { color: "#1A1A1A" }]}>신분증 대조 동의</Text>
                <Text style={[styles.agreementDesc, { color: "#8E8E93" }]}>
                  본인 확인을 위해 신분증(주민등록증, 운전면허증) 정보를 제공하는 것에 동의합니다. 제공된 정보는 본인 확인 후 즉시 폐기됩니다.
                </Text>
              </View>
            </Pressable>

            {/* 범죄이력 조회 동의 */}
            <Pressable
              onPress={() => { haptic(); setBgCheckAgreed(!bgCheckAgreed); }}
              style={({ pressed }) => [
                styles.agreementCard,
                {
                  borderColor: bgCheckAgreed ? accentColor : "#E8E8E8",
                  backgroundColor: bgCheckAgreed ? accentColor + "08" : "#F8F8F8",
                },
                pressed && { opacity: 0.8 },
              ]}
            >
              <View style={[styles.checkbox, { borderColor: bgCheckAgreed ? accentColor : "#8E8E93", backgroundColor: bgCheckAgreed ? accentColor : "transparent" }]}>
                {bgCheckAgreed && <Text style={{ color: "#FFFFFF", fontSize: 14, fontWeight: "700" }}>✓</Text>}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.agreementTitle, { color: "#1A1A1A" }]}>범죄이력 조회 동의</Text>
                <Text style={[styles.agreementDesc, { color: "#8E8E93" }]}>
                  반려동물 돌봄 서비스의 안전을 위해 범죄이력 조회에 동의합니다. 조회 결과는 서비스 이용 적격 여부 판단에만 사용됩니다.
                </Text>
              </View>
            </Pressable>

            {/* 개인정보 처리방침 */}
            <Pressable
              style={({ pressed }) => [styles.policyLink, pressed && { opacity: 0.7 }]}
            >
              <Text style={[styles.policyText, { color: accentColor }]}>📋 개인정보 처리방침 전문 보기</Text>
            </Pressable>
          </View>

          <Pressable
            onPress={handleIdentitySubmit}
            style={({ pressed }) => [
              styles.submitBtn,
              { backgroundColor: (identityAgreed && bgCheckAgreed) ? accentColor : "#8E8E93" + "40" },
              pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] },
            ]}
          >
            <Text style={styles.submitBtnText}>동의 및 제출</Text>
          </Pressable>
        </ScrollView>
      </ScreenContainer>
    );
  }

  // === 퀴즈 화면 ===
  if (step === "quiz") {
    if (quizFinished) {
      const passed = quizScore >= 80;
      return (
        <ScreenContainer edges={["top", "left", "right"]}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
            <View style={styles.header}>
              <Pressable onPress={() => { haptic(); setStep("overview"); }} style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.7 }]}>
                <Text style={{ fontSize: 18 }}>←</Text>
              </Pressable>
              <Text style={[styles.headerTitle, { color: "#1A1A1A" }]}>테스트 결과</Text>
              <View style={{ width: 40 }} />
            </View>

            <View style={[styles.resultCard, { backgroundColor: passed ? "#E8F5E9" : "#FFEBEE", borderColor: passed ? "#66BB6A" : "#EF5350" }]}>
              <Text style={{ fontSize: 60 }}>{passed ? "🎉" : "😢"}</Text>
              <Text style={[styles.resultTitle, { color: passed ? "#2E7D32" : "#C62828" }]}>
                {passed ? "축하합니다!" : "아쉽네요..."}
              </Text>
              <View style={styles.scoreCircle}>
                <Text style={[styles.scoreText, { color: passed ? "#2E7D32" : "#C62828" }]}>{quizScore}점</Text>
              </View>
              <Text style={[styles.resultDesc, { color: passed ? "#388E3C" : "#D32F2F" }]}>
                {passed
                  ? `10문항 중 ${Math.round(quizScore / 10)}문항 정답!\n인증 마크가 부여되었습니다.`
                  : `10문항 중 ${Math.round(quizScore / 10)}문항 정답.\n80점 이상이 필요합니다. 다시 도전해보세요!`}
              </Text>
            </View>

            {passed ? (
              <Pressable
                onPress={() => { haptic(); setStep("overview"); }}
                style={({ pressed }) => [styles.submitBtn, { backgroundColor: accentColor }, pressed && { opacity: 0.8 }]}
              >
                <Text style={styles.submitBtnText}>인증 현황 확인</Text>
              </Pressable>
            ) : (
              <Pressable
                onPress={handleQuizRetry}
                style={({ pressed }) => [styles.submitBtn, { backgroundColor: "#FF7043" }, pressed && { opacity: 0.8 }]}
              >
                <Text style={styles.submitBtnText}>다시 도전하기</Text>
              </Pressable>
            )}
          </ScrollView>
        </ScreenContainer>
      );
    }

    const q = QUIZ_QUESTIONS[quizIndex];
    return (
      <ScreenContainer edges={["top", "left", "right"]}>
        <View style={{ flex: 1, padding: 16 }}>
          <View style={styles.header}>
            <Pressable onPress={() => { haptic(); setStep("overview"); }} style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.7 }]}>
              <Text style={{ fontSize: 18 }}>←</Text>
            </Pressable>
            <Text style={[styles.headerTitle, { color: "#1A1A1A" }]}>전문성 테스트</Text>
            <View style={{ width: 40 }} />
          </View>

          {/* 진행률 */}
          <View style={styles.quizProgress}>
            <View style={[styles.quizProgressBar, { backgroundColor: "#E8E8E8" }]}>
              <View style={[styles.quizProgressFill, { width: `${((quizIndex + 1) / QUIZ_QUESTIONS.length) * 100}%`, backgroundColor: accentColor }]} />
            </View>
            <Text style={[styles.quizProgressText, { color: "#8E8E93" }]}>
              {quizIndex + 1} / {QUIZ_QUESTIONS.length}
            </Text>
          </View>

          {/* 문제 */}
          <View style={[styles.questionCard, { backgroundColor: "#F8F8F8", borderColor: "#E8E8E8" }]}>
            <Text style={[styles.questionText, { color: "#1A1A1A" }]}>{q.question}</Text>
          </View>

          {/* 보기 */}
          <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
            {q.options.map((opt, i) => (
              <Pressable
                key={i}
                onPress={() => handleQuizAnswer(i)}
                style={({ pressed }) => [
                  styles.optionCard,
                  {
                    borderColor: selectedAnswer === i ? accentColor : "#E8E8E8",
                    backgroundColor: selectedAnswer === i ? accentColor + "12" : "#F8F8F8",
                  },
                  pressed && { opacity: 0.8 },
                ]}
              >
                <View style={[styles.optionNumber, { backgroundColor: selectedAnswer === i ? accentColor : "#8E8E93" + "30" }]}>
                  <Text style={[styles.optionNumberText, { color: selectedAnswer === i ? "#FFFFFF" : "#1A1A1A" }]}>
                    {String.fromCharCode(65 + i)}
                  </Text>
                </View>
                <Text style={[styles.optionText, { color: "#1A1A1A" }]}>{opt}</Text>
              </Pressable>
            ))}
          </ScrollView>

          {/* 다음 버튼 */}
          <Pressable
            onPress={handleQuizNext}
            style={({ pressed }) => [
              styles.submitBtn,
              { backgroundColor: selectedAnswer !== null ? accentColor : "#8E8E93" + "40", marginTop: 12 },
              pressed && selectedAnswer !== null && { opacity: 0.8, transform: [{ scale: 0.97 }] },
            ]}
          >
            <Text style={styles.submitBtnText}>
              {quizIndex < QUIZ_QUESTIONS.length - 1 ? "다음 문제" : "제출하기"}
            </Text>
          </Pressable>
        </View>
      </ScreenContainer>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#f0f0f0", alignItems: "center", justifyContent: "center" },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: "700", textAlign: "center" },
  statusCard: { marginHorizontal: 16, marginTop: 8, padding: 20, borderRadius: 16, borderWidth: 1.5, backgroundColor: "#FFFFFF" },
  statusTop: { flexDirection: "row", alignItems: "center" },
  statusLevel: { fontSize: 20, fontWeight: "800" },
  statusDesc: { fontSize: 13, marginTop: 4, lineHeight: 18 },
  progressBar: { height: 6, borderRadius: 3, backgroundColor: "#E0E0E0", marginTop: 16 },
  progressFill: { height: 6, borderRadius: 3 },
  progressText: { fontSize: 12, marginTop: 6, textAlign: "right" },
  stepsContainer: { padding: 16, gap: 12 },
  stepCard: { borderRadius: 14, borderWidth: 1, padding: 16 },
  stepHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  stepNumber: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  stepNumberText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
  stepTitle: { fontSize: 16, fontWeight: "700" },
  stepSubtitle: { fontSize: 12, marginTop: 2 },
  benefitCard: { marginHorizontal: 16, padding: 16, borderRadius: 14, borderWidth: 1, gap: 12 },
  benefitTitle: { fontSize: 16, fontWeight: "700", marginBottom: 4 },
  benefitRow: { flexDirection: "row", alignItems: "center" },
  benefitLabel: { fontSize: 14, fontWeight: "600" },
  benefitDesc: { fontSize: 12, marginTop: 1 },
  formSection: { padding: 16 },
  formLabel: { fontSize: 16, fontWeight: "700", marginBottom: 12 },
  certGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  certChip: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, borderWidth: 1, gap: 6 },
  certChipLabel: { fontSize: 13, fontWeight: "600" },
  uploadArea: { borderWidth: 2, borderStyle: "dashed", borderRadius: 14, padding: 20, alignItems: "center", justifyContent: "center", minHeight: 200 },
  uploadPlaceholder: { alignItems: "center", gap: 8 },
  uploadText: { fontSize: 14, fontWeight: "600" },
  uploadHint: { fontSize: 12 },
  certPreview: { width: "100%", height: 200, borderRadius: 10 },
  submitBtn: { marginHorizontal: 16, paddingVertical: 16, borderRadius: 14, alignItems: "center" },
  submitBtnText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
  infoCard: { flexDirection: "row", alignItems: "center", marginHorizontal: 16, padding: 14, borderRadius: 12, borderWidth: 1, gap: 10, marginBottom: 8 },
  infoText: { flex: 1, fontSize: 13, lineHeight: 18 },
  agreementCard: { flexDirection: "row", alignItems: "flex-start", padding: 16, borderRadius: 14, borderWidth: 1, gap: 12, marginBottom: 12 },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, alignItems: "center", justifyContent: "center", marginTop: 2 },
  agreementTitle: { fontSize: 15, fontWeight: "700" },
  agreementDesc: { fontSize: 12, lineHeight: 18, marginTop: 4 },
  policyLink: { paddingVertical: 8 },
  policyText: { fontSize: 13, fontWeight: "600" },
  resultCard: { marginHorizontal: 16, marginTop: 8, padding: 32, borderRadius: 20, borderWidth: 1.5, alignItems: "center", gap: 12 },
  resultTitle: { fontSize: 24, fontWeight: "800" },
  scoreCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center", marginVertical: 8 },
  scoreText: { fontSize: 28, fontWeight: "800" },
  resultDesc: { fontSize: 14, textAlign: "center", lineHeight: 22 },
  quizProgress: { paddingHorizontal: 0, marginBottom: 16 },
  quizProgressBar: { height: 6, borderRadius: 3 },
  quizProgressFill: { height: 6, borderRadius: 3 },
  quizProgressText: { fontSize: 12, marginTop: 6, textAlign: "right" },
  questionCard: { padding: 20, borderRadius: 14, borderWidth: 1, marginBottom: 16 },
  questionText: { fontSize: 16, fontWeight: "600", lineHeight: 24 },
  optionCard: { flexDirection: "row", alignItems: "center", padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 10, gap: 12 },
  optionNumber: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  optionNumberText: { fontSize: 14, fontWeight: "700" },
  optionText: { flex: 1, fontSize: 14, lineHeight: 20 },
});
