# 대전 반려이음 - 전체 스택 배포 가이드

이 문서는 대전 반려이음 앱의 백엔드, 웹 프론트엔드, 모바일 앱을 배포하는 방법을 설명합니다.

## 📋 배포 아키텍처

```
┌─────────────────────────────────────────────────────┐
│                    모바일 앱 (iOS/Android)           │
│              EAS Build → App Store/Play Store        │
└────────────────────┬────────────────────────────────┘
                     │ API 호출
┌────────────────────▼────────────────────────────────┐
│              웹 프론트엔드 (Netlify)                  │
│         https://daejeon-pet-care.netlify.app        │
└────────────────────┬────────────────────────────────┘
                     │ API 호출
┌────────────────────▼────────────────────────────────┐
│            백엔드 API (Render/Railway)               │
│         https://daejeon-pet-care-api.onrender.com   │
└────────────────────┬────────────────────────────────┘
                     │ DB 연결
┌────────────────────▼────────────────────────────────┐
│         PostgreSQL 데이터베이스 (클라우드)            │
└─────────────────────────────────────────────────────┘
```

## 🚀 단계별 배포 가이드

### 1️⃣ 백엔드 서버 배포 (Render 또는 Railway)

#### Render 배포

1. **Render 계정 생성**
   - https://render.com 방문
   - GitHub 계정으로 가입

2. **PostgreSQL 데이터베이스 생성**
   ```
   Dashboard → New+ → PostgreSQL
   - Name: daejeon-pet-care-db
   - Region: Singapore (또는 가장 가까운 지역)
   - PostgreSQL Version: 15
   ```

3. **백엔드 서비스 배포**
   ```
   Dashboard → New+ → Web Service
   - Repository: GitHub 연결
   - Build Command: pnpm install && pnpm run build
   - Start Command: node dist/index.js
   - Environment Variables 설정 (아래 참고)
   ```

4. **환경 변수 설정**
   ```
   DATABASE_URL=postgresql://user:password@host:5432/dbname
   NODE_ENV=production
   PORT=3000
   JWT_SECRET=your_jwt_secret_key_here
   CORS_ORIGIN=https://daejeon-pet-care.netlify.app,https://your-mobile-app-domain.com
   KAKAO_MAP_API_KEY=your_kakao_map_key
   ```

#### Railway 배포

1. **Railway 계정 생성**
   - https://railway.app 방문
   - GitHub 계정으로 가입

2. **프로젝트 생성**
   ```
   New Project → GitHub Repo
   - Repository 선택
   - Deploy 클릭
   ```

3. **PostgreSQL 추가**
   ```
   Add Service → PostgreSQL
   - 자동으로 DATABASE_URL 환경 변수 생성됨
   ```

4. **환경 변수 설정**
   - Railway 대시보드에서 Variables 탭에 위의 환경 변수 추가

### 2️⃣ 웹 프론트엔드 배포 (Netlify)

1. **Netlify 계정 생성**
   - https://netlify.com 방문
   - GitHub 계정으로 가입

2. **새 사이트 배포**
   ```
   Sites → Add new site → Import an existing project
   - GitHub 저장소 선택
   - Build command: pnpm run build && pnpm exec expo export --platform web
   - Publish directory: dist
   ```

3. **환경 변수 설정**
   ```
   Site settings → Build & deploy → Environment
   REACT_APP_API_URL=https://daejeon-pet-care-api.onrender.com
   REACT_APP_ENV=production
   REACT_APP_KAKAO_MAP_KEY=your_kakao_map_key
   ```

4. **커스텀 도메인 설정** (선택사항)
   ```
   Site settings → Domain management → Add custom domain
   DNS 레코드 설정 후 완료
   ```

### 3️⃣ 모바일 앱 배포 (EAS Build)

#### 사전 준비

1. **Expo 계정 생성**
   ```bash
   npx eas-cli@latest login
   ```

2. **프로젝트 설정**
   ```bash
   npx eas-cli@latest build:configure
   ```

#### iOS 배포

1. **Apple Developer 계정 필요**
   - https://developer.apple.com 가입
   - $99/년 비용

2. **프로비저닝 프로필 생성**
   ```bash
   npx eas-cli@latest credentials
   # iOS → Production → Create new
   ```

3. **빌드 및 배포**
   ```bash
   # 프로덕션 빌드 생성
   npx eas-cli@latest build --platform ios --profile production

   # App Store Connect에 제출
   npx eas-cli@latest submit --platform ios --latest
   ```

#### Android 배포

1. **Google Play Developer 계정 필요**
   - https://play.google.com/console 가입
   - $25 일회성 비용

2. **키스토어 생성**
   ```bash
   npx eas-cli@latest credentials
   # Android → Production → Create new
   ```

3. **빌드 및 배포**
   ```bash
   # 프로덕션 빌드 생성
   npx eas-cli@latest build --platform android --profile production

   # Google Play에 제출
   npx eas-cli@latest submit --platform android --latest
   ```

## 🔧 환경 변수 관리

### 백엔드 (.env)
```
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://user:password@host:5432/dbname
JWT_SECRET=your_jwt_secret_key_here
CORS_ORIGIN=https://daejeon-pet-care.netlify.app,https://your-mobile-app-domain.com
KAKAO_MAP_API_KEY=your_kakao_map_key
```

### 웹 프론트엔드 (.env.production)
```
REACT_APP_API_URL=https://daejeon-pet-care-api.onrender.com
REACT_APP_ENV=production
REACT_APP_KAKAO_MAP_KEY=your_kakao_map_key
```

### 모바일 앱 (app.config.ts)
```typescript
const env = {
  apiUrl: 'https://daejeon-pet-care-api.onrender.com',
  kakaoMapKey: 'your_kakao_map_key',
  scheme: 'manus...',
  iosBundleId: 'space.manus.daejeon.pet.care.t...',
  androidPackage: 'space.manus.daejeon.pet.care.t...',
};
```

## 📊 모니터링 및 로깅

### Render/Railway 모니터링
- 대시보드에서 실시간 로그 확인
- 자동 헬스 체크 설정 (Dockerfile의 HEALTHCHECK)

### Netlify 모니터링
- Analytics 탭에서 트래픽 모니터링
- 배포 로그 확인

### 에러 추적
- Sentry 통합 (선택사항)
```bash
npm install @sentry/react @sentry/tracing
```

## 🐛 트러블슈팅

### 백엔드 배포 실패
```
문제: Build failed
해결: 
1. pnpm-lock.yaml 파일 확인
2. Node 버전 일치 확인 (18.x)
3. 빌드 로그 상세 확인
```

### 웹 프론트엔드 배포 실패
```
문제: Expo export 실패
해결:
1. pnpm run build 로컬에서 테스트
2. node_modules 캐시 초기화
3. Netlify 빌드 환경 변수 확인
```

### 모바일 앱 배포 실패
```
문제: EAS Build 실패
해결:
1. eas.json 설정 확인
2. app.config.ts 유효성 확인
3. 자격증 및 프로비저닝 프로필 확인
```

### API 연결 실패
```
문제: 모바일/웹에서 API 호출 실패
해결:
1. CORS 설정 확인 (백엔드 CORS_ORIGIN)
2. API 엔드포인트 URL 확인
3. 네트워크 요청 로그 확인 (DevTools)
```

## 📝 배포 체크리스트

- [ ] 백엔드 환경 변수 설정 완료
- [ ] 데이터베이스 마이그레이션 완료
- [ ] 웹 프론트엔드 환경 변수 설정 완료
- [ ] 모바일 앱 환경 변수 설정 완료
- [ ] CORS 설정 확인
- [ ] SSL/TLS 인증서 설정 (자동)
- [ ] 헬스 체크 엔드포인트 테스트
- [ ] API 연결 테스트
- [ ] 모바일 앱 로컬 테스트
- [ ] 웹 프론트엔드 로컬 테스트
- [ ] 프로덕션 배포 전 스테이징 테스트

## 🔐 보안 체크리스트

- [ ] JWT_SECRET 안전하게 저장
- [ ] DATABASE_URL 암호화
- [ ] CORS_ORIGIN 정확하게 설정
- [ ] 환경 변수 노출 방지 (.env 파일 .gitignore)
- [ ] HTTPS 강제 (Netlify/Render 자동)
- [ ] 헤더 보안 설정 (netlify.toml 포함)
- [ ] 데이터베이스 백업 설정
- [ ] 정기적인 보안 업데이트

## 📞 지원

배포 중 문제가 발생하면:
1. 배포 로그 확인
2. 환경 변수 재확인
3. 로컬 환경에서 테스트
4. 클라우드 제공자 문서 참고

---

**마지막 업데이트**: 2026년 4월 8일
**버전**: 1.0.0
