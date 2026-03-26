# 반려이음 API 명세서

**프로젝트명:** 반려이음 (대전 반려동물 돌봄 매칭 앱)
**기술 스택:** Expo SDK 54 + Express + tRPC + Drizzle ORM + MySQL
**Base URL:** `http://127.0.0.1:3000/api/trpc`

---

## 1. 인증 API (auth)

인증 시스템은 이메일/비밀번호 로그인과 카카오 소셜 로그인을 지원하며, 가입 시 보호자(owner)와 도그워커(walker) 역할을 선택합니다. 세션은 HTTP-only 쿠키 기반으로 관리됩니다.

| 엔드포인트 | 메서드 | 인증 | 설명 |
|---|---|---|---|
| `auth.register` | mutation | 불필요 | 이메일/비밀번호 회원가입 |
| `auth.login` | mutation | 불필요 | 이메일/비밀번호 로그인 |
| `auth.kakaoLogin` | mutation | 불필요 | 카카오 소셜 로그인 |
| `auth.me` | query | 선택 | 현재 로그인 사용자 정보 조회 |
| `auth.logout` | mutation | 불필요 | 로그아웃 (세션 쿠키 삭제) |

### 1.1 회원가입 (auth.register)

이메일과 비밀번호를 사용한 신규 회원가입입니다. 비밀번호는 bcrypt로 해싱되어 DB에 저장됩니다.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123!",
  "name": "홍길동",
  "appRole": "owner"
}
```

**Input Schema (Zod):**
```typescript
z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1),
  appRole: z.enum(["owner", "walker"]),
})
```

**Response (성공):**
```json
{
  "success": true,
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "홍길동",
    "appRole": "owner"
  }
}
```

**Response (실패 - 중복 이메일):**
```json
{
  "success": false,
  "message": "이미 등록된 이메일입니다"
}
```

### 1.2 로그인 (auth.login)

등록된 이메일과 비밀번호로 로그인합니다. 성공 시 세션 쿠키가 설정됩니다.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123!"
}
```

**Response (성공):**
```json
{
  "success": true,
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "홍길동",
    "appRole": "owner"
  }
}
```

**Response (실패):**
```json
{
  "success": false,
  "message": "이메일 또는 비밀번호가 올바르지 않습니다"
}
```

### 1.3 카카오 소셜 로그인 (auth.kakaoLogin)

카카오 SDK를 통해 받은 카카오 사용자 ID로 로그인합니다. 최초 로그인 시 자동으로 계정이 생성됩니다.

**Request Body:**
```json
{
  "kakaoId": "kakao_1234567890",
  "name": "카카오닉네임",
  "email": "kakao@example.com",
  "appRole": "walker"
}
```

**Response (성공):**
```json
{
  "success": true,
  "user": {
    "id": 2,
    "kakaoId": "kakao_1234567890",
    "name": "카카오닉네임",
    "appRole": "walker"
  },
  "isNewUser": true
}
```

---

## 2. 친구 API (friends)

친구 코드 기반의 친구 추가 시스템입니다. 고유 코드를 검색하여 친구 요청을 보내고, 상대방이 수락/거절할 수 있습니다.

| 엔드포인트 | 메서드 | 인증 | 설명 |
|---|---|---|---|
| `friends.registerCode` | mutation | 불필요 | 친구 코드 등록/갱신 |
| `friends.searchByCode` | query | 불필요 | 친구 코드로 사용자 검색 |
| `friends.sendRequest` | mutation | 불필요 | 친구 요청 보내기 |
| `friends.receivedRequests` | query | 불필요 | 받은 친구 요청 목록 |
| `friends.sentRequests` | query | 불필요 | 보낸 친구 요청 목록 |
| `friends.acceptRequest` | mutation | 불필요 | 친구 요청 수락 |
| `friends.rejectRequest` | mutation | 불필요 | 친구 요청 거절 |
| `friends.addFriend` | mutation | 불필요 | 직접 친구 추가 |
| `friends.list` | query | 불필요 | 친구 목록 조회 |
| `friends.removeFriend` | mutation | 불필요 | 친구 삭제 |

### 2.1 친구 코드 등록 (friends.registerCode)

사용자의 고유 친구 코드를 서버에 등록합니다. 이미 등록된 경우 정보를 갱신합니다.

**Request Body:**
```json
{
  "userId": 1,
  "code": "ABC123",
  "nickname": "댕댕이맘",
  "profileEmoji": "🐕",
  "neighborhood": "유성구 봉명동",
  "role": "owner"
}
```

### 2.2 친구 요청 보내기 (friends.sendRequest)

상대방에게 친구 요청을 보냅니다. 중복 요청은 차단됩니다.

**Request Body:**
```json
{
  "fromUserId": 1,
  "toUserId": 2,
  "fromNickname": "댕댕이맘",
  "fromEmoji": "🐕",
  "fromNeighborhood": "유성구 봉명동",
  "fromRole": "owner",
  "fromCode": "ABC123",
  "toNickname": "산책왕",
  "toEmoji": "🦮"
}
```

---

## 3. 결제 API (Payment - PortOne 연동)

결제 시스템은 **포트원(PortOne, 구 아임포트)** SDK를 연동하여 에스크로 방식으로 동작합니다. 산책이 완료된 후에야 도그워커에게 대금이 지급됩니다.

### 3.1 결제 플로우

결제 프로세스는 다음과 같은 단계로 진행됩니다. 보호자가 예약 시 결제를 진행하면 금액이 에스크로 계좌에 보관되고, 산책 완료 확인 후 도그워커에게 정산됩니다.

```
[보호자] 예약 → [클라이언트] PortOne SDK 결제창 호출
    → [PG사] 결제 승인 → [PortOne 서버] 웹훅 전송
    → [반려이음 서버] 결제 검증 + DB 저장 (escrow_held)
    → [산책 완료] → [서버] 에스크로 해제 → [도그워커] 정산
```

### 3.2 결제 요청 (payment.create)

| 항목 | 값 |
|---|---|
| **엔드포인트** | `payment.create` |
| **메서드** | mutation |
| **인증** | 필요 (protectedProcedure) |

**Request Body:**
```json
{
  "bookingId": "booking_20260326_001",
  "amount": 15000,
  "paymentMethod": "kakaopay",
  "walkerId": 2,
  "petIds": [1],
  "scheduledDate": "2026-03-28",
  "scheduledTime": "14:00",
  "duration": "1시간"
}
```

**Response (성공):**
```json
{
  "success": true,
  "paymentId": "pay_20260326_001",
  "status": "escrow_held",
  "merchantUid": "반려이음_booking_20260326_001",
  "impUid": "imp_1234567890",
  "amount": 15000,
  "message": "결제가 완료되었습니다. 산책 완료 후 정산됩니다."
}
```

### 3.3 결제 검증 웹훅 (payment.verify)

PortOne 서버에서 결제 완료 후 전송하는 웹훅을 처리합니다. 결제 금액 위변조를 검증합니다.

| 항목 | 값 |
|---|---|
| **엔드포인트** | `POST /api/payment/webhook` |
| **메서드** | POST (Express 직접 라우트) |
| **인증** | PortOne 서명 검증 |

**Webhook Payload:**
```json
{
  "imp_uid": "imp_1234567890",
  "merchant_uid": "반려이음_booking_20260326_001",
  "status": "paid",
  "amount": 15000
}
```

**서버 검증 로직:**
```typescript
// 1. PortOne API로 실제 결제 정보 조회
const portoneResponse = await axios.get(
  `https://api.iamport.kr/payments/${imp_uid}`,
  { headers: { Authorization: accessToken } }
);

// 2. 결제 금액 위변조 검증
if (portoneResponse.data.amount !== expectedAmount) {
  throw new Error("결제 금액 위변조 감지");
}

// 3. DB 상태 업데이트
await updatePaymentStatus(merchant_uid, "escrow_held");
```

### 3.4 에스크로 해제 (payment.release)

산책 완료 후 보호자가 확인하면 에스크로를 해제하여 도그워커에게 정산합니다.

**Request Body:**
```json
{
  "paymentId": "pay_20260326_001",
  "bookingId": "booking_20260326_001",
  "confirmedByOwner": true
}
```

### 3.5 PortOne 연동 설정

PortOne(구 아임포트) 연동을 위해 다음 환경변수가 필요합니다. 테스트 모드에서는 실제 결제 없이 시뮬레이션이 가능합니다.

| 환경변수 | 설명 | 예시 |
|---|---|---|
| `PORTONE_IMP_KEY` | 가맹점 식별코드 | `imp12345678` |
| `PORTONE_IMP_SECRET` | REST API 시크릿 | `AbCdEfGh...` |
| `PORTONE_MERCHANT_ID` | 가맹점 고유 ID | `store_12345` |

**클라이언트 결제창 호출 (React Native):**
```typescript
import IMP from "iamport-react-native";

const paymentData = {
  pg: "kakaopay",
  pay_method: "card",
  merchant_uid: `반려이음_${bookingId}`,
  name: "산책 서비스 - 1시간",
  amount: 15000,
  buyer_email: user.email,
  buyer_name: user.name,
  buyer_tel: user.phone,
  escrow: true, // 에스크로 결제 활성화
  app_scheme: "manus20260312...", // 앱 딥링크 스킴
};
```

---

## 4. 지도 API (Maps - Kakao Maps 연동)

산책 경로 실시간 추적을 위해 **카카오맵 API**를 연동합니다. 도그워커의 GPS 좌표를 수집하여 지도 위에 Polyline으로 표시합니다.

### 4.1 위치 데이터 전송 (location.update)

도그워커 앱에서 5~10초 간격으로 GPS 좌표를 서버에 전송합니다.

| 항목 | 값 |
|---|---|
| **엔드포인트** | `location.update` |
| **메서드** | mutation |
| **호출 주기** | 5~10초 |

**Request Body:**
```json
{
  "walkSessionId": "walk_001",
  "latitude": 36.3504,
  "longitude": 127.3845,
  "timestamp": "2026-03-28T14:05:30.000Z",
  "speed": 4.2,
  "accuracy": 5.0
}
```

### 4.2 실시간 위치 조회 (location.getLatest)

보호자가 도그워커의 현재 위치와 산책 경로를 조회합니다.

**Request Body:**
```json
{
  "walkSessionId": "walk_001"
}
```

**Response:**
```json
{
  "currentPosition": {
    "latitude": 36.3504,
    "longitude": 127.3845,
    "timestamp": "2026-03-28T14:05:30.000Z"
  },
  "route": [
    { "lat": 36.3500, "lng": 127.3840, "ts": "2026-03-28T14:00:00.000Z" },
    { "lat": 36.3502, "lng": 127.3842, "ts": "2026-03-28T14:00:10.000Z" },
    { "lat": 36.3504, "lng": 127.3845, "ts": "2026-03-28T14:05:30.000Z" }
  ],
  "totalDistance": 0.85,
  "elapsedTime": 330,
  "status": "walking"
}
```

### 4.3 카카오맵 API 설정

카카오맵 JavaScript API를 사용하여 지도 위에 산책 경로를 Polyline으로 표시합니다.

| 환경변수 | 설명 | 발급처 |
|---|---|---|
| `KAKAO_MAP_APP_KEY` | 카카오 JavaScript 앱 키 | [Kakao Developers](https://developers.kakao.com) |
| `KAKAO_REST_API_KEY` | 카카오 REST API 키 | [Kakao Developers](https://developers.kakao.com) |

**지도 Polyline 표시 (React Native WebView):**
```javascript
// 카카오맵 Polyline 생성
const polyline = new kakao.maps.Polyline({
  map: map,
  path: routePoints.map(p => new kakao.maps.LatLng(p.lat, p.lng)),
  strokeWeight: 5,
  strokeColor: "#FF6B35",
  strokeOpacity: 0.8,
  strokeStyle: "solid",
});

// 도그워커 현재 위치 마커
const marker = new kakao.maps.Marker({
  position: new kakao.maps.LatLng(current.lat, current.lng),
  image: walkerMarkerImage,
});
```

### 4.4 SOS 긴급 알림 API (location.sos)

도그워커가 지정 구역을 크게 벗어나거나 일정 시간(5분 이상) 정지 시 보호자에게 긴급 알림을 전송합니다.

**Request Body:**
```json
{
  "walkSessionId": "walk_001",
  "type": "route_deviation",
  "message": "도그워커가 지정 경로에서 500m 이상 벗어났습니다",
  "latitude": 36.3600,
  "longitude": 127.3900
}
```

**SOS 트리거 조건:**

| 조건 | 임계값 | 알림 내용 |
|---|---|---|
| 경로 이탈 | 지정 구역에서 500m 이상 | "도그워커가 경로를 벗어났습니다" |
| 장시간 정지 | 5분 이상 동일 위치 | "도그워커가 5분 이상 멈춰있습니다" |
| 수동 SOS | 도그워커 직접 발동 | "긴급 상황이 발생했습니다" |

---

## 5. 에러 코드

모든 API는 일관된 에러 형식을 사용합니다.

| 코드 | HTTP 상태 | 설명 |
|---|---|---|
| `AUTH_INVALID_CREDENTIALS` | 401 | 이메일 또는 비밀번호 불일치 |
| `AUTH_EMAIL_EXISTS` | 409 | 이미 등록된 이메일 |
| `AUTH_UNAUTHORIZED` | 401 | 인증되지 않은 요청 |
| `FRIEND_ALREADY_EXISTS` | 409 | 이미 친구인 사용자 |
| `FRIEND_REQUEST_DUPLICATE` | 409 | 중복 친구 요청 |
| `PAYMENT_AMOUNT_MISMATCH` | 400 | 결제 금액 위변조 |
| `PAYMENT_NOT_FOUND` | 404 | 결제 정보 없음 |
| `BOOKING_SLOT_UNAVAILABLE` | 409 | 예약 시간 불가 |
| `LOCATION_PERMISSION_DENIED` | 403 | 위치 권한 거부 |

**에러 응답 형식:**
```json
{
  "success": false,
  "error": {
    "code": "AUTH_INVALID_CREDENTIALS",
    "message": "이메일 또는 비밀번호가 올바르지 않습니다"
  }
}
```

---

## 6. 인증 방식

### 6.1 세션 기반 인증 (기본)

서버는 HTTP-only 쿠키 기반 세션 인증을 사용합니다. 로그인 성공 시 `session` 쿠키가 자동 설정되며, 이후 모든 요청에 자동으로 포함됩니다.

```typescript
// 클라이언트 요청 시 credentials: "include" 필수
fetch("http://127.0.0.1:3000/api/trpc/auth.me", {
  credentials: "include",
});
```

### 6.2 카카오 OAuth 플로우

카카오 로그인은 react-native-kakao-login SDK를 통해 클라이언트에서 카카오 토큰을 받고, 서버에 카카오 ID를 전달하여 인증합니다.

```
[사용자] 카카오 로그인 버튼 탭
    → [Kakao SDK] 카카오 인증 화면
    → [카카오 서버] 인증 토큰 발급
    → [클라이언트] kakaoId 추출
    → [반려이음 서버] auth.kakaoLogin 호출
    → [서버] 사용자 조회/생성 + 세션 발급
```
