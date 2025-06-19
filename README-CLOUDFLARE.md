# Cloudflare Workers 배포 가이드

## 사전 요구사항

1. **Cloudflare 계정** 및 **Wrangler CLI** 설치
```bash
npm install -g wrangler
```

2. **Wrangler 로그인**
```bash
wrangler login
```

## 설정 방법

### 1. wrangler.toml 설정
```toml
name = "salary-calculator"
compatibility_date = "2024-12-01"
pages_build_output_dir = "out"

[env.production]
account_id = "your-account-id"  # 필수: Cloudflare 계정 ID
zone_id = "your-zone-id"       # 선택: 커스텀 도메인 사용시

[env.production.vars]
NODE_ENV = "production"
NEXT_PUBLIC_ADSENSE_ID = "ca-pub-2070759131396958"
```

### 2. 계정 ID 찾기
```bash
wrangler whoami
```

### 3. 환경 변수 설정
```bash
# 개발 환경
cp .env.example .env.local

# 프로덕션 환경 (Cloudflare Dashboard에서 설정)
```

## 배포 명령어

### 로컬 개발
```bash
# Next.js 개발 서버
pnpm dev

# Cloudflare Pages 로컬 개발
pnpm run wrangler:dev
```

### 프로덕션 배포
```bash
# 빌드 및 배포
pnpm run cf:deploy

# 또는 단계별로
pnpm build
wrangler pages deploy out
```

## 커스텀 도메인 설정

1. **Cloudflare Dashboard**에서 도메인 추가
2. **DNS 설정** (A/CNAME 레코드)
3. **wrangler.toml**에 routes 추가:
```toml
[env.production.routes]
pattern = "toolhub.ai.kr/*"
custom_domain = true
```

## 주요 변경사항

- ✅ `next.config.ts`: static export 설정
- ✅ `wrangler.toml`: Cloudflare Workers 설정
- ✅ `package.json`: 배포 스크립트 추가
- ❌ `vercel.json`: 제거됨

## 문제 해결

### 빌드 오류
```bash
# 캐시 클리어
rm -rf .next out

# 재빌드
pnpm build
```

### 환경 변수 확인
```bash
wrangler pages secret list
```

## 모니터링

- **Cloudflare Analytics**: 트래픽 및 성능 모니터링
- **Real User Monitoring (RUM)**: 사용자 경험 추적
- **Workers Analytics**: Functions 성능 분석