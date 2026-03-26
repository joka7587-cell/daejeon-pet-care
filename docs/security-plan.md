# 반려이음 보안 기획서

**프로젝트명:** 반려이음 (대전 반려동물 돌봄 매칭 앱)
**작성 목적:** 개인정보 보호, 위치정보 활용 동의, 결제 보안에 관한 기술적/법적 보안 계획

---

## 1. 개인정보 보호 체계

### 1.1 수집하는 개인정보 항목

반려이음 앱은 서비스 제공을 위해 아래와 같은 개인정보를 수집합니다. 모든 정보는 최소 수집 원칙에 따라 서비스 운영에 필수적인 항목만 수집합니다.

| 구분 | 수집 항목 | 수집 목적 | 보유 기간 |
|---|---|---|---|
| **필수 정보** | 이메일, 비밀번호(해시), 닉네임 | 회원 식별 및 인증 | 회원 탈퇴 시까지 |
| **선택 정보** | 프로필 사진, 자기소개, 전화번호 | 프로필 표시 및 긴급 연락 | 회원 탈퇴 시까지 |
| **반려동물 정보** | 이름, 품종, 나이, 체중, 건강상태 | 매칭 서비스 제공 | 회원 탈퇴 시까지 |
| **위치 정보** | GPS 좌표, 산책 경로 | 실시간 산책 추적 | 산책 완료 후 90일 |
| **결제 정보** | 결제 수단(PG사 토큰), 거래 내역 | 결제 처리 및 정산 | 전자상거래법 5년 |
| **인증 정보** | 자격증 이미지, 신분증 대조 결과 | 도그워커 신원 확인 | 인증 유효기간 동안 |

### 1.2 개인정보 암호화 방식

모든 민감 정보는 업계 표준 암호화 알고리즘을 적용하여 보호합니다.

**비밀번호 암호화:** 비밀번호는 bcrypt 알고리즘(salt rounds: 12)으로 단방향 해싱하여 저장합니다. 원본 비밀번호는 서버 메모리에도 보관하지 않으며, 로그인 시 해시 비교만 수행합니다.

```typescript
// 비밀번호 해싱 (회원가입 시)
import bcrypt from "bcryptjs";
const passwordHash = await bcrypt.hash(password, 12);

// 비밀번호 검증 (로그인 시)
const isValid = await bcrypt.compare(inputPassword, storedHash);
```

**전송 구간 암호화:** 클라이언트와 서버 간 모든 통신은 TLS 1.3(HTTPS)으로 암호화됩니다. API 서버는 HSTS(HTTP Strict Transport Security) 헤더를 설정하여 HTTPS 접속을 강제합니다.

**DB 암호화:** 데이터베이스는 AES-256 기반의 TDE(Transparent Data Encryption)를 적용하여 저장 데이터를 암호화합니다. 백업 파일 역시 동일한 수준의 암호화가 적용됩니다.

**민감 정보 마스킹:** 이메일, 전화번호 등 민감 정보는 API 응답 시 부분 마스킹 처리합니다.

| 정보 유형 | 원본 | 마스킹 결과 |
|---|---|---|
| 이메일 | user@example.com | u***@example.com |
| 전화번호 | 010-1234-5678 | 010-****-5678 |
| 신분증 번호 | 901015-1234567 | 901015-1****** |

### 1.3 세션 보안

세션 관리는 HTTP-only 쿠키 기반으로 구현되며, XSS 공격으로부터 세션 토큰을 보호합니다.

| 보안 설정 | 값 | 설명 |
|---|---|---|
| `httpOnly` | true | JavaScript에서 쿠키 접근 차단 |
| `secure` | true (프로덕션) | HTTPS에서만 쿠키 전송 |
| `sameSite` | "lax" | CSRF 공격 방지 |
| `maxAge` | 7일 | 세션 만료 시간 |
| `path` | "/" | 쿠키 적용 경로 |

---

## 2. 위치정보 활용 동의 절차

### 2.1 법적 근거

반려이음 앱의 위치정보 수집 및 활용은 **위치정보의 보호 및 이용 등에 관한 법률**(위치정보법)에 근거합니다. 위치정보 수집 전 반드시 사용자의 명시적 동의를 받으며, 동의 내용은 서버에 기록합니다.

### 2.2 동의 수집 절차

위치정보 동의는 3단계로 진행됩니다. 각 단계에서 사용자가 거부할 수 있으며, 거부 시 해당 기능만 제한됩니다.

**1단계 - 앱 설치 시 (OS 권한 요청):**
앱 최초 실행 시 운영체제 수준의 위치 권한을 요청합니다. iOS에서는 "앱 사용 중 허용" / "항상 허용" / "허용 안 함" 중 선택할 수 있으며, Android에서는 "정확한 위치" / "대략적 위치" 옵션을 제공합니다.

```typescript
// expo-location 권한 요청
import * as Location from "expo-location";

const { status } = await Location.requestForegroundPermissionsAsync();
if (status !== "granted") {
  // 위치 권한 거부 시 산책 추적 기능 비활성화
  Alert.alert("위치 권한 필요", "산책 추적을 위해 위치 권한이 필요합니다.");
}
```

**2단계 - 프로필 등록 시 (서비스 동의):**
프로필 등록 화면에서 위치정보 이용약관에 대한 명시적 동의를 받습니다. 동의 항목은 다음과 같습니다.

| 동의 항목 | 필수/선택 | 내용 |
|---|---|---|
| 위치정보 수집 동의 | 필수 | 산책 중 GPS 좌표 수집 |
| 위치정보 제3자 제공 동의 | 필수 | 보호자에게 도그워커 위치 공유 |
| 위치정보 보관 동의 | 선택 | 산책 기록 90일 보관 |
| 백그라운드 위치 수집 동의 | 선택 | 앱 비활성 시에도 위치 수집 |

**3단계 - 산책 시작 시 (실시간 추적 동의):**
산책 시작 버튼을 누를 때 실시간 위치 추적이 시작됨을 안내하고, 도그워커의 최종 확인을 받습니다.

### 2.3 위치정보 보관 및 파기

산책 경로 데이터는 산책 완료 후 90일간 보관되며, 이후 자동 파기됩니다. 사용자가 직접 삭제를 요청할 경우 즉시 파기합니다.

```
[산책 완료] → [90일 보관] → [자동 파기 배치 실행]
                           → [사용자 삭제 요청] → [즉시 파기]
```

### 2.4 위치정보 접근 권한 관리

위치정보에 접근할 수 있는 주체와 범위를 엄격히 제한합니다.

| 접근 주체 | 접근 범위 | 접근 조건 |
|---|---|---|
| 도그워커 본인 | 자신의 산책 경로 전체 | 항상 |
| 보호자 | 매칭된 도그워커의 실시간 위치 | 산책 진행 중에만 |
| 보호자 | 매칭된 산책 기록 | 산책 완료 후 90일 |
| 시스템 관리자 | SOS 발생 시 위치 | 긴급 상황에만 |
| 제3자 | 접근 불가 | - |

---

## 3. 결제 보안

### 3.1 PCI DSS 준수

반려이음 앱은 카드 정보를 직접 수집하거나 저장하지 않습니다. 모든 결제 처리는 PCI DSS Level 1 인증을 받은 **포트원(PortOne)** PG사를 통해 이루어지며, 앱 서버에는 결제 토큰과 거래 ID만 저장됩니다.

### 3.2 에스크로 결제 보안

에스크로 결제는 보호자의 결제 금액을 PG사가 보관하고, 서비스 완료 확인 후 도그워커에게 정산하는 방식입니다. 이를 통해 양측의 거래 안전을 보장합니다.

| 단계 | 상태 | 금액 보관 위치 | 설명 |
|---|---|---|---|
| 결제 완료 | `escrow_held` | PG사 에스크로 계좌 | 보호자 결제 완료 |
| 산책 완료 | `escrow_held` | PG사 에스크로 계좌 | 도그워커 산책 완료 보고 |
| 보호자 확인 | `released` | 도그워커 계좌 | 보호자가 서비스 확인 |
| 자동 확인 | `released` | 도그워커 계좌 | 72시간 무응답 시 자동 정산 |
| 분쟁 발생 | `disputed` | PG사 에스크로 계좌 | 관리자 중재 필요 |

### 3.3 결제 위변조 방지

서버에서 PortOne API를 통해 모든 결제 건의 금액을 이중 검증합니다.

```typescript
// 결제 검증 로직
async function verifyPayment(impUid: string, expectedAmount: number) {
  // 1. PortOne 액세스 토큰 발급
  const tokenRes = await axios.post("https://api.iamport.kr/users/getToken", {
    imp_key: process.env.PORTONE_IMP_KEY,
    imp_secret: process.env.PORTONE_IMP_SECRET,
  });
  const accessToken = tokenRes.data.response.access_token;

  // 2. 실제 결제 정보 조회
  const paymentRes = await axios.get(
    `https://api.iamport.kr/payments/${impUid}`,
    { headers: { Authorization: accessToken } }
  );

  // 3. 금액 비교 검증
  const actualAmount = paymentRes.data.response.amount;
  if (actualAmount !== expectedAmount) {
    // 위변조 감지 → 결제 취소 + 관리자 알림
    await cancelPayment(impUid, "금액 위변조 감지");
    throw new Error("PAYMENT_AMOUNT_MISMATCH");
  }

  return { verified: true, amount: actualAmount };
}
```

---

## 4. 도그워커 신원 확인 보안

### 4.1 자격증 검증 프로세스

도그워커 인증 시 업로드되는 자격증 이미지는 다음과 같은 보안 절차를 거칩니다.

| 단계 | 처리 내용 | 보안 조치 |
|---|---|---|
| 업로드 | 이미지 파일 수신 | 파일 크기 제한(10MB), MIME 타입 검증 |
| 저장 | S3 암호화 저장 | SSE-S3 서버 사이드 암호화 |
| 검증 | OCR 자격증 번호 추출 | 한국산업인력공단 API 대조 (향후) |
| 보관 | 인증 완료 후 보관 | 인증 유효기간 동안만 보관 |
| 파기 | 유효기간 만료 시 | 자동 삭제 배치 실행 |

### 4.2 범죄이력 조회 동의

도그워커 가입 시 범죄이력 조회 동의를 받습니다. 현재는 동의 체크박스 기반이며, 향후 경찰청 API 연동을 통한 자동 조회를 계획하고 있습니다.

```typescript
// 범죄이력 조회 동의 기록
interface BackgroundCheckConsent {
  userId: number;
  consentGiven: boolean;
  consentDate: string;
  consentMethod: "app_checkbox"; // 향후 "police_api" 추가
  ipAddress: string;
}
```

---

## 5. 앱 보안 강화 조치

### 5.1 입력값 검증

모든 API 입력값은 Zod 스키마를 통해 서버 사이드에서 검증됩니다. SQL Injection, XSS 등의 공격을 원천 차단합니다.

```typescript
// Zod 스키마 기반 입력 검증 예시
const registerSchema = z.object({
  email: z.string().email("올바른 이메일 형식이 아닙니다"),
  password: z.string()
    .min(8, "비밀번호는 8자 이상이어야 합니다")
    .regex(/[A-Z]/, "대문자를 포함해야 합니다")
    .regex(/[0-9]/, "숫자를 포함해야 합니다")
    .regex(/[!@#$%^&*]/, "특수문자를 포함해야 합니다"),
  name: z.string().min(1).max(50),
  appRole: z.enum(["owner", "walker"]),
});
```

### 5.2 Rate Limiting

API 남용을 방지하기 위해 엔드포인트별 요청 제한을 적용합니다.

| 엔드포인트 | 제한 | 기간 | 초과 시 |
|---|---|---|---|
| `auth.login` | 5회 | 15분 | 15분 차단 |
| `auth.register` | 3회 | 1시간 | 1시간 차단 |
| `friends.sendRequest` | 10회 | 1시간 | 429 에러 |
| `location.update` | 720회 | 1시간 | 무시 (5초 간격) |
| 기타 API | 100회 | 1분 | 429 에러 |

### 5.3 보안 헤더

```typescript
// Express 보안 헤더 설정
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  res.setHeader("Content-Security-Policy", "default-src 'self'");
  next();
});
```

---

## 6. 개인정보 처리방침 요약

반려이음 앱은 **개인정보 보호법** 및 **위치정보법**을 준수하며, 다음과 같은 권리를 보장합니다.

| 권리 | 내용 | 처리 기한 |
|---|---|---|
| 열람권 | 수집된 개인정보 열람 요청 | 10일 이내 |
| 정정권 | 부정확한 정보 수정 요청 | 10일 이내 |
| 삭제권 | 개인정보 삭제 요청 | 10일 이내 |
| 처리정지권 | 개인정보 처리 중단 요청 | 10일 이내 |
| 동의철회권 | 위치정보 수집 동의 철회 | 즉시 |
| 이동권 | 개인정보 이동 요청 | 30일 이내 |

**개인정보 보호 책임자:** 앱 설정 > 개인정보 처리방침에서 확인 가능
**문의 채널:** 앱 내 고객센터 또는 이메일
