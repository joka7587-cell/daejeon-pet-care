# 빌드 스테이지
FROM node:18-alpine AS builder

WORKDIR /app

# 의존성 설치
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile

# 소스 코드 복사 및 빌드
COPY . .
# ESM 형식으로 빌드하되 .mjs 확장자로 출력
RUN pnpm run build && mv dist/index.js dist/index.mjs

# 프로덕션 스테이지
FROM node:18-alpine

WORKDIR /app

# 프로덕션 의존성만 설치
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --prod --frozen-lockfile

# 빌드된 파일 복사
COPY --from=builder /app/dist ./dist

# 헬스 체크
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:' + (process.env.PORT || 3000) + '/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# 환경 변수 기본값
ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["node", "dist/index.mjs"]
