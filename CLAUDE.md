# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Korean all-in-one web tool platform ("툴허브") built with Next.js 16, providing 160+ tools across financial calculators, developer utilities, media tools, health tools, and browser games. Deployed on Cloudflare Pages as a static PWA with offline support, SEO optimization, and AdSense integration.

## Development Commands

```bash
# Development server (runs on port 3030, Turbopack enabled)
pnpm dev

# Build production bundle (DO NOT run this - user will handle builds manually)
# pnpm build

# Start production server (for testing)
pnpm start

# Linting
pnpm lint

# Static export
pnpm export

# Cloudflare Pages deployment
pnpm cf:deploy

# Test Cloudflare Pages locally
pnpm wrangler:dev
```

**IMPORTANT: Do NOT run `pnpm build` unless explicitly requested by the user. The user will handle builds manually.**

## Architecture

### Technology Stack
- **Framework**: Next.js 16 with App Router (static export mode, Turbopack dev)
- **Language**: TypeScript, React 19
- **Styling**: Tailwind CSS v4 with dark mode support
- **Icons**: Lucide React
- **Code Editor**: CodeMirror 6 via @uiw/react-codemirror (JSON syntax highlighting, code folding, search)
- **JSON Processing**: json5 (JSON5/JSONC parsing), jsonpath-plus (JSONPath queries), jsonrepair (auto-fix broken JSON)
- **Charts**: Recharts
- **3D**: Babylon.js (3D viewer)
- **PDF**: jsPDF (PDF export)
- **OCR**: Tesseract.js (image text extraction)
- **P2P Gaming**: PeerJS (WebRTC) + Supabase (signaling)
- **Barcodes/QR**: JsBarcode, qrcode
- **Deployment**: Cloudflare Pages with Wrangler
- **PWA**: Service Worker + manifest.json + offline page
- **Monetization**: Google AdSense integration
- **Language**: Korean (ko_KR locale) with English support

### High-Level Architecture

#### App Router Structure
```
src/app/
├── layout.tsx          # Root layout with metadata, PWA, providers
├── page.tsx            # Home page (salary calculator)
├── games/page.tsx      # Game hub listing page
├── tips/              # Tips section with dynamic routing
│   ├── page.tsx
│   └── [id]/page.tsx  # generateStaticParams for static generation
├── offline/page.tsx    # PWA offline fallback page
└── [tool-name]/page.tsx  # 100+ individual tool pages
```

#### Component Architecture
```
src/
├── components/        # All UI components (100+ files)
├── config/
│   └── menuConfig.ts  # Central menu configuration (4 categories)
├── contexts/
│   └── LanguageContext.tsx  # Client-side language state
├── hooks/             # Custom React hooks
├── utils/             # Utility functions
└── app/               # Next.js App Router pages
```

### Key Components

#### Financial Calculators (14 tools)
- `SalaryCalculator`: Korean salary with 4대보험 and income tax
- `LoanCalculator`: Loan payment calculator
- `SavingsCalculator`: Savings interest calculator
- `RetirementCalculator`: Retirement savings calculator
- `TaxCalculator`: Income tax and various taxes
- `ExchangeRateCalculator`: Currency conversion
- `RealEstateCalculator`: Real estate transaction fees and taxes
- `StockCalculator`: Stock trading fees and returns
- `CarLoanCalculator`: Auto purchase loan calculator
- `CarTaxCalculator`: Car registration and acquisition taxes
- `FuelCalculator`: Business vehicle fuel costs and depreciation
- `BogeumjariLoanCalculator`: 보금자리론 (government housing loan) calculator
- `MonthlyRentSubsidyCalculator`: 월세보조금 (rent subsidy) calculator
- `MedianIncomeTable`: 중위소득 (median income) reference table
- `LottoTaxCalculator`: Lottery prize tax (22%/33% brackets) with net amount
- `NationalPensionCalculator`: National pension estimator (early/normal/deferred)
- `SalaryRank`: Salary percentile rank by age/gender/industry (NTS data)
- `MealDiary`: Daily meal/calorie diary with trend charts and CSV export

#### Health & Fitness Tools (4 tools)
- `BMICalculator`: Body mass index and health analysis
- `CalorieCalculator`: BMR and daily calorie requirements
- `BodyFatCalculator`: Body fat percentage calculation
- `WorkHoursCalculator`: Part-time work hours and overtime

#### Development & Utility Tools (33 tools)
- `JsonFormatter`: JSON Formatter Pro - CodeMirror 6 editor, 4 modes (format/minify/tree/stats), JSONPath queries, JSON5/JSONC support, auto-fix broken JSON (jsonrepair), drag-and-drop, URL import, keyboard shortcuts
- `JsonCodeEditor`: CodeMirror 6 React wrapper with dark mode, error line decoration
- `JsonCsvConverter`: JSON to CSV conversion
- `JsonXmlConverter`: JSON to XML conversion
- `JwtDecoder`: JWT token analysis
- `UuidGenerator`: UUID generation (v1, v4, v7, nil)
- `CronTester`: Cron expression validation
- `SqlFormatter`: SQL query formatting
- `RegexExtractor`: Regex pattern matching with smart mode, preset patterns
- `MarkdownEditor`: Markdown editor with live preview, file upload, TOC, formatting toolbar (merged from MarkdownViewer)
- `CrontabGenerator`: Visual crontab builder with Korean descriptions
- `RegexBuilder`: Visual regex builder with pattern library
- `EnvEditor`: Environment variable editor with multi-format export
- `TimeConverter`: Timezone conversion and Unix timestamps
- `ImageResizer`: Image resizing and compression
- `ImageEditor`: Basic image editing tools
- `QrGenerator`: QR code generation with custom logo
- `BarcodeGenerator`: Barcode generation (JsBarcode)
- `Viewer3D`: 3D model viewer (Babylon.js, GLB/GLTF/OBJ/STL)
- `CharacterCounter`: Character, word, line counter
- `Base64Converter`: Base64 encoding/decoding
- `UrlEncoder`: URL encoding/decoding
- `HashGenerator`: Hash generation (MD5, SHA-1, SHA-256, SHA-512)
- `DiffViewer`: Text diff comparison tool
- `ColorConverter`: Color format conversion (HEX, RGB, HSL, CMYK)
- `LoremIpsumGenerator`: Lorem ipsum placeholder text generator
- `UnitConverter`: Unit conversion (length, weight, temperature, etc.)
- `TextConverter`: Text transformation (uppercase, lowercase, camelCase, etc.)
- `PasswordGenerator`: Secure password & passphrase generator with strength analysis
- `DdayCalculator`: D-Day counter, date difference, date add/subtract with Korean holidays
- `ImageWatermark`: Text/image watermark with position, opacity, rotation, tile repeat (Canvas API)
- `ImageOcr`: Image text extraction (OCR) using Tesseract.js with rotation support, multi-language
- `KeyboardConverter`: Korean-English keyboard mistype converter with Hangul jamo assembly/disassembly
- `GifMaker`: GIF animation creator from images (inline GIF89a encoder, no external libs)
- `BackgroundRemover`: Color-based background removal with chroma key
- `CollageMaker`: Photo collage maker with 5 layout templates

#### Games (25+ tools)
- `GameHub`: Game listing/hub page with game stats + achievements panel
- `LottoGenerator`: Korean lottery number generation with statistics
- `LadderGame`: 사다리 타기 게임 — 위치 직접 선택 모드(기본), colAssignments(열↔참가자 매핑), 시드 기반 URL 공유, 블라인드/한명씩공개/다중라운드/이미지저장 기능 포함
- `Omok`: 오목 (Gomoku) with AI opponent and online P2P multiplayer
- `Othello`: 오셀로 (Reversi) with AI opponent
- `Connect4`: 사목 (Connect Four) with AI opponent
- `Checkers`: 체커 with AI opponent
- `Mancala`: 만칼라 with AI opponent
- `Battleship`: 배틀쉽 with AI opponent
- `DotsAndBoxes`: 점과선 with AI opponent
- `Game2048`: 2048 puzzle game
- `Minesweeper`: 지뢰찾기
- `Sudoku`: 스도쿠
- `SnakeGame`: 스네이크 게임
- `FifteenPuzzle`: 15-puzzle (3x3/4x4/5x5) with solvability check
- `FlappyBird`: Flappy Bird clone with tuned physics
- `Hangman`: Korean hangman with jamo decomposition
- `PacMan`: Pac-Man with 4 ghost AI strategies
- Plus: WordRelay, NumberBaseball, MemoryGame, TetrisGame, TypingGame, WordQuiz

#### Shared Components
- `Header`: Sticky navigation with dropdown menus, recent tools tracking, global search (Ctrl+K), mobile responsive
- `Footer`: Minimal footer with branding
- `ToolsShowcase`: Card-based tool navigation grid with favorites support
- `SearchDialog`: Global command palette (Ctrl+K / Cmd+K) for searching all tools
- `Breadcrumb`: Auto-generated breadcrumb with JSON-LD structured data
- `RelatedTools`: Same-category tool recommendations (auto from menuConfig)
- `ToolJsonLd`: Per-tool WebApplication JSON-LD structured data
- `SkipToContent`: Skip-to-main-content accessibility link (i18n)
- `CalculationHistory`: localStorage-based calculation history with manual save
- `DailyTips`: Daily financial tips display
- `ProgressBar`: NProgress page transition indicator
- `ThemeToggle`: Dark/light mode toggle with system preference detection
- `LanguageToggle`: Korean/English language switcher
- `InstallPrompt`: PWA install prompt
- `FeedbackWidget`: User feedback collection
- `PDFExport`: PDF export for calculation results
- `GameLobby`: Reusable online game lobby (Supabase rooms)
- `GameStats`: AI game win/loss statistics with recharts
- `GameAchievements`: Achievement badge grid (collapsible) + `AchievementToast` (named export)
- `GameResultShare`: Game result sharing with native share API, clipboard, X/Twitter
- `GameConfetti`: Canvas-based confetti animation for win celebrations
- `AdSense`: Google AdSense ad component
- `I18nWrapper`: Client-side i18n provider

### Custom Hooks
- `useCalculationHistory`: localStorage-based history management with type safety
- `useMessages`: Dynamic locale message loading with fallback
- `useLottoData`: Lotto winning number data fetching
- `useGameRoom`: Supabase-based game room management
- `usePeerConnection`: WebRTC P2P connection for multiplayer games
- `useAIGameStats`: AI game statistics tracking (wins, losses, draws)
- `useGameAchievements`: 12-achievement system with localStorage persistence, streak/stat tracking
- `useGameSounds`: Web Audio API synthesized sounds (no audio files), toggle with localStorage

### Utility Files
- `localStorage.ts`: Type-safe localStorage wrapper with history titles
- `recentTools.ts`: Recent tool usage tracking per category
- `favorites.ts`: Tool favorites management (localStorage)
- `corsProxy.ts`: CORS proxy utility for external API calls
- `lottoDataLoader.ts` / `lottoUpdater.ts`: Lotto data management
- `wordlist.ts`: EFF-inspired word list for passphrase generation
- `koreanHolidays.ts`: Korean public holiday data (2024-2030, lunar included) + business day calculation

### Menu System
Central configuration in `/src/config/menuConfig.ts` with 5 categories:
- **calculators**: 59 financial/life calculators (7 subcategories: 급여/근로, 세금, 대출/금융, 부동산, 투자/저축, 생활비, 기타)
- **tools**: 79 development & utility tools (5 subcategories: 개발도구, 텍스트, 변환/인코딩, 생성기, 기타)
- **media**: 10 image/media tools
- **health**: 14 health & fitness tools
- **games**: 26 games (including GameHub, 7 AI board games, 17+ solo games)

Header and ToolsShowcase auto-read from menuConfig. Footer is minimal (no menu links).

#### MenuItem Fields
- `href`, `labelKey`, `descriptionKey`, `icon`: Required
- `addedDate?: string`: 'YYYY-MM-DD', 30일 이내면 NEW 배지 표시 (`isNewTool()` 헬퍼)
- `subcategory?: string`: 번역 키 (e.g., `subcategory.tax`), ToolsShowcase에서 그룹핑
- `modes?: GameMode[]`: 게임 전용 (ai/online/solo)

#### Mobile Bottom Navigation
`MobileBottomNav` component (md:hidden): 홈/즐겨찾기/최근/검색 4버튼, 바텀시트 UI.

### PWA Architecture
- `public/manifest.json`: Full PWA manifest with shortcuts, screenshots, categories
- `public/sw.js`: Service Worker for offline caching
- `src/app/offline/page.tsx`: Offline fallback page
- `src/components/InstallPrompt.tsx`: Install prompt UI
- Service Worker registration in layout.tsx with update notifications

### SEO & Metadata
- Comprehensive Korean SEO metadata in layout.tsx
- OpenGraph and Twitter card support
- JSON-LD structured data: site-level (WebSite + SoftwareApplication) + per-tool (WebApplication via ToolJsonLd) + per-game (VideoGame schema)
- Breadcrumb JSON-LD structured data (auto-generated via Breadcrumb component)
- Static sitemap generation (`src/app/sitemap.ts`) with all 110+ routes
- Naver site verification configured
- Domain: toolhub.ai.kr

### Accessibility
- Skip-to-content link (i18n-aware via SkipToContent component)
- Global focus-visible styles (blue outline)
- aria-label, aria-expanded, aria-haspopup on Header navigation
- SearchDialog with combobox role, aria-activedescendant, focus trap
- Breadcrumb with aria-current="page"

### Search & Discovery
- Global search command palette (Ctrl+K / Cmd+K) via SearchDialog
- Searches by tool name, description, URL path, and category
- Keyboard navigation (arrow keys, Enter, Escape)
- Recent tools tracking in Header dropdown (per category)

### Favorites System
- localStorage-based tool favorites via `favorites.ts` utility
- Star icon on ToolsShowcase cards (hover/focus to reveal)
- Dedicated "Favorites" section at top of ToolsShowcase when items exist

### Internationalization
- **Framework**: next-intl with Korean/English support (Korean default)
- **Server-side**: `/src/i18n.ts` and `/src/routing.ts`
- **Client-side**: `LanguageContext` + `I18nWrapper`
- **Message files**: `/messages/ko.json` and `/messages/en.json`
- **Fallback**: Korean messages as fallback on load failure

## Key Architecture Decisions

### Static Export Configuration
```typescript
// next.config.ts
const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true },
  distDir: 'out'
};
```

### URL State Management Pattern
All calculators sync state with URL parameters for shareable links:
```typescript
const updateURL = (params: Record<string, any>) => {
  const url = new URL(window.location.href);
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, String(value));
  });
  window.history.replaceState({}, '', url);
};
```

### Game Architecture Pattern

All board games follow a consistent 3-layer pattern:

```
src/components/games/*AI.tsx    ← AI game wrapper (state, hooks, UI chrome)
src/components/*Board.tsx       ← Board renderer (canvas, touch/mouse/keyboard)
src/utils/gameAI/*.ts           ← AI algorithm (minimax/alpha-beta, pure logic)
```

**AI Game Wrapper (`*AI.tsx`)** — integrates all hooks and UI:
- `useAIGameStats` — win/loss/draw statistics (localStorage)
- `useGameAchievements` — 12-achievement tracking with `recordGameResult()` on game end
- `useGameSounds` — synthesized sound effects (`playMove`, `playWin`, `playLose`, `playDraw`, `playInvalid`)
- `GameAchievements` panel + `AchievementToast` for unlock notifications
- `GameResultShare` for sharing results
- `GameConfetti` on win
- Sound toggle button (`🔊`/`🔇`) with i18n label via `useTranslations('gameSounds')`
- Undo support (Easy mode only, Omok/Connect4/Othello): replays move history from initial state

**Board Renderer (`*Board.tsx`)** — canvas-based rendering:
- Mouse hover preview + click to move
- Touch support (`onTouchStart/Move/End` + `touchAction: 'none'`) on Omok/Connect4/Othello
- Keyboard navigation (arrow keys + Enter) on Omok/Connect4/Othello

**AI Algorithm (`gameAI/*.ts`)** — pure functions:
- Minimax with alpha-beta pruning, iterative deepening
- Difficulty levels control search depth
- No side effects, testable in isolation

**Online Multiplayer** (Omok only currently):
- `useGameRoom` (Supabase signaling) + `usePeerConnection` (WebRTC P2P)
- `GameLobby` component for room management

**SEO**: Each game page has JSON-LD `VideoGame` schema + canonical URL

**i18n Namespaces for games**:
- `achievements` — badge names/descriptions, UI labels (title, progress, locked, unlocked, dismiss)
- `gameSounds` — sound toggle labels (enabled, disabled), undo label
- `gameResultShare` — share dialog labels
- `{gameName}` (e.g., `omok`, `othello`) — game-specific labels (title, rules, difficulty, etc.)

### Recent Tools Tracking
Header shows recently used tools per category (max 4) using `recentTools.ts` utility with localStorage.

## New Tool Planning Guide (기능 기획 원칙)

**"단순 계산기가 아니라, 이 도구 하나로 충분하다"는 경험을 만들어야 한다.**

새 도구를 만들기 전에 반드시 아래 체크리스트를 검토하고, 사용자에게 기획안을 제시한 후 개발에 착수한다.

### 기획 시 반드시 고려할 7가지 관점

#### 1. 입력 UX — 사용자가 최소한으로 입력하게
- 날짜는 달력 피커 제공, 직접 입력도 허용
- 선택지가 있으면 드롭다운/라디오 (자유입력 최소화)
- 기본값을 현실적인 값으로 세팅 (빈칸 X)
- URL 파라미터로 입력값 복원 (공유 링크)

#### 2. 결과 표시 — 한눈에 파악 가능하게
- 핵심 숫자를 크고 굵게 (실수령액, 총 금액 등)
- 세부 내역은 접이식(collapse)이나 탭으로 분리
- 비교 표시: "세전 vs 세후", "이번 달 vs 저번 달" 등 대비
- 시각화: 구간별 바 차트, 타임라인, 파이 차트 (Recharts)

#### 3. 시뮬레이션 & 비교 — 단순 계산을 넘어서
- "만약 ~라면?" 시나리오 비교 (예: 지금 퇴사 vs 3개월 후)
- 슬라이더로 변수 조정 시 결과 실시간 변경
- 여러 케이스 동시 비교 테이블

#### 4. 정확성 & 신뢰도 — 전문 도구 수준
- 최신 법령/요율 기준 명시 ("2025년 기준")
- 상한/하한/예외 케이스 자동 처리
- 계산 로직의 근거 출처 표시 (관련 법조항, 공식 사이트 링크)
- 자격 요건 사전 체크 (수급 가능 여부 등)

#### 5. 가이드 & 교육 — 도구 + 지식
- 가이드 섹션에 "이것만 알면 된다" 핵심 정리
- FAQ 형태로 자주 묻는 질문 포함
- 관련 제도/절차 안내 (예: 실업급여 신청 절차)
- 관련 공식 사이트 바로가기 링크

#### 6. 공유 & 저장 — 결과의 재사용
- URL 파라미터에 입력값 인코딩 → 링크 공유
- 결과 카드 이미지 저장 (Canvas → PNG)
- PDF 내보내기 (필요 시)
- 계산 히스토리 localStorage 저장
- 카톡/SNS 공유 최적화 (메타태그 or 이미지)

#### 7. 관련 도구 연계 — 사이트 체류시간 증가
- RelatedTools로 같은 카테고리 도구 자동 추천
- 워크플로 연계 안내 (예: 퇴직금 계산기 → 실업급여 계산기 → IRP)
- 가이드 섹션에서 관련 도구 자연스럽게 링크

### 도구 유형별 추가 고려사항

| 유형 | 추가 고려 |
|------|----------|
| **금융/세금 계산기** | 최신 세율/요율 반영, 세전/세후 명확 구분, 공제 항목 체크박스 |
| **생활 도구** | 가전/품목 선택형 입력, 절약 팁, 계절/지역 변수 |
| **바이럴/재미 도구** | 결과 이미지 공유, 애니메이션, 히스토리, 재시도 유도 |
| **개발자 도구** | 복사 버튼, 코드 하이라이팅, 입출력 동시 표시, 단축키 |
| **게임** | 난이도 선택, 통계/업적, 사운드, 결과 공유 |

### 기획안 제시 형식

새 도구 개발 요청 시 아래 형식으로 기획안을 먼저 정리하고 사용자 확인 후 개발:

```markdown
## [도구명]
**핵심**: 한 줄 컨셉

| 기능 | 설명 |
|------|------|
| 입력 | ... |
| 결과 | ... |
| 시뮬레이션 | ... |
| 가이드 | ... |
| 공유 | ... |
```

## Development Workflow for New Features

### 새 도구 추가 시 수정할 파일 (순서대로, 탐색 불필요)

| # | 파일 | 작업 | 코드 위치 힌트 |
|---|------|------|---------------|
| 1 | `/src/config/menuConfig.ts` | 메뉴 항목 추가 | 적절한 카테고리 items 배열 끝에 추가 |
| 2 | `/messages/ko.json` | 한국어 번역 3곳 | footer.links + toolsShowcase.tools + 컴포넌트 네임스페이스 |
| 3 | `/messages/en.json` | 영어 번역 3곳 | ko.json과 동일 구조 |
| 4 | `/src/app/sitemap.ts` | URL 추가 | 배열 끝에 추가 |
| 5 | `/src/app/[tool-name]/page.tsx` | 페이지 생성 | 새 디렉토리 + page.tsx |
| 6 | `/src/components/[ToolName].tsx` | 컴포넌트 생성 | 새 파일 |

**Header, ToolsShowcase, SearchDialog, GameHub는 menuConfig에서 자동 반영되므로 별도 수정 불필요.**

### Step 1: menuConfig.ts

```typescript
// /src/config/menuConfig.ts — 카테고리: calculators | tools | health | games

// 일반 도구/계산기
{ href: '/new-tool', labelKey: 'footer.links.newTool', descriptionKey: 'toolsShowcase.tools.newTool.description', icon: '🔧', addedDate: '2026-03-20', subcategory: 'subcategory.others' }

// 게임 (games 카테고리) — modes 필드 필수!
// modes: ['ai', 'online'] → AI 대전 + 온라인 대전 지원 보드게임 (GameHub에서 모드 선택 후 인라인 플레이)
// modes: ['solo']         → 솔로 게임 (GameHub 카드 클릭 시 해당 페이지로 이동)
{ href: '/new-game', labelKey: 'footer.links.newGame', descriptionKey: 'toolsShowcase.tools.newGame.description', icon: '🎮', modes: ['solo'] }
```

**새 게임 추가 시 GameHub 수정 불필요** — menuConfig에 `modes` 포함해서 추가하면 자동으로 GameHub에 표시됨.
- 보드게임(`['ai', 'online']`) 추가 시: `/src/app/games/page.tsx`의 dynamic import 맵에도 컴포넌트 추가 필요
- 솔로게임(`['solo']`) 추가 시: GameHub.tsx 수정 불필요, 개별 페이지만 생성

**AI 보드게임 추가 시 추가 파일:**
- `/src/components/games/NewGameAI.tsx` — AI wrapper (useGameAchievements, useGameSounds, useAIGameStats 통합)
- `/src/components/NewGameBoard.tsx` — Canvas 기반 보드 렌더러
- `/src/utils/gameAI/newGameAI.ts` — AI 알고리즘 (minimax/alpha-beta)
- page.tsx에 JSON-LD `VideoGame` 스키마 추가
- `useGameAchievements`의 `GameType` 유니온에 새 게임 타입 추가 (`src/hooks/useGameAchievements.ts`)

### Step 2: 번역 파일 (ko.json, en.json) — 3곳 수정

```jsonc
// ── 1) footer.links 섹션 (ko.json ~line 1310 부근, en.json ~line 1035 부근)
// 마지막 항목 뒤에 추가. 쉼표 주의!
"newTool": "새 도구"

// ── 2) toolsShowcase.tools 섹션 (ko.json ~line 3320 부근, en.json ~line 3321 부근)
// 마지막 항목 뒤에 추가
"newTool": {
  "title": "새 도구",
  "description": "한 줄 설명"
}

// ── 3) 컴포넌트 네임스페이스 (파일 맨 끝, 닫는 } 바로 전)
// ko.json, en.json 모두 파일 마지막 부분에 추가
"newTool": {
  "title": "새 도구",
  "description": "상세 설명",
  "guide": {
    "title": "가이드",
    "section1": { "title": "...", "items": ["...", "..."] }
  }
  // ... 컴포넌트에서 사용할 모든 번역 키
}
```

### Step 3: sitemap.ts

```typescript
// /src/app/sitemap.ts — 배열 끝, ] 바로 전에 추가
{
  url: 'https://toolhub.ai.kr/new-tool/',
  lastModified: new Date(),
  changeFrequency: 'monthly',  // 도구=monthly, 계산기=weekly, 게임=weekly
  priority: 0.8,               // 일반=0.7~0.8, 인기=0.9
}
```

### Step 4: page.tsx 템플릿

```typescript
// /src/app/new-tool/page.tsx
import { Metadata } from 'next'
import { Suspense } from 'react'
import NewTool from '@/components/NewTool'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: '한국어 제목 - 키워드 | 툴허브',
  description: '80-160자 설명',
  keywords: '키워드1, 키워드2, 키워드3',
  openGraph: {
    title: '제목 | 툴허브',
    description: 'OG 설명',
    url: 'https://toolhub.ai.kr/new-tool',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '제목',
    description: '설명',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/new-tool',
  },
}

export default function NewToolPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '한국어 제목',
    description: '설명',
    url: 'https://toolhub.ai.kr/new-tool',
    applicationCategory: 'UtilityApplication', // or DeveloperApplication
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: ['기능1', '기능2']
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center">Loading...</div>}>
            <I18nWrapper>
              <NewTool />
            </I18nWrapper>
          </Suspense>
        </div>
      </div>
    </>
  )
}
```

### Step 5: 컴포넌트 템플릿

```typescript
// /src/components/NewTool.tsx
'use client'

import { useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { Copy, Check, BookOpen /* 필요한 아이콘 */ } from 'lucide-react'

export default function NewTool() {
  const t = useTranslations('newTool')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // ── 클립보드 복사 (프로젝트 공통 패턴) ──
  const copyToClipboard = useCallback(async (text: string, id: string) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text)
      } else {
        const textarea = document.createElement('textarea')
        textarea.value = text
        textarea.style.position = 'fixed'
        textarea.style.left = '-999999px'
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand('copy')
        document.body.removeChild(textarea)
      }
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    } catch {
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    }
  }, [])

  return (
    <div className="space-y-8">
      {/* 헤더 */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
      </div>

      {/* 메인 그리드: 설정(1/3) + 결과(2/3) */}
      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-4">
            {/* 설정 패널 */}
          </div>
        </div>
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            {/* 결과 패널 */}
          </div>
        </div>
      </div>

      {/* 가이드 섹션 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
          {t('guide.title')}
        </h2>
        {/* 가이드 내용 — 배열은 t.raw('guide.section.items') as string[] */}
      </div>
    </div>
  )
}
```

### 공통 Tailwind 클래스 패턴

```
카드:         bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6
입력 필드:    w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500
메인 버튼:    bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg px-4 py-3 font-medium hover:from-blue-700 hover:to-indigo-700
보조 버튼:    bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg
제목 텍스트:  text-gray-900 dark:text-white
부제 텍스트:  text-gray-500 dark:text-gray-400
정보 박스:    bg-blue-50 dark:bg-blue-950 rounded-xl p-6
체크박스:     accent-blue-600
```

### 번역 키 네이밍 규칙

- camelCase: `buttonText`, `errorMessage`
- 그룹핑: `settings.length`, `result.title`, `guide.tips.items`
- 배열은 `t.raw('key')` 사용: `(t.raw('guide.items') as string[]).map(...)`
- 컴포넌트 네임스페이스 = 컴포넌트명 camelCase (예: `PasswordGenerator` → `passwordGenerator`)

### 알고리즘 시각화 추가 시 가이드 콘텐츠 요구사항

새 알고리즘 시각화를 추가할 때 반드시 아래 7개 섹션을 **ko.json + en.json** 모두에 포함해야 한다. GuideSection 컴포넌트가 자동으로 렌더링한다.

```jsonc
// {algorithmName}Visualizer.guide 내부
"guide": {
  "title": "가이드",
  "whatIs": {
    "title": "XXX란?",
    "description": "알고리즘의 핵심 개념을 2~3문장으로 설명"
  },
  "howToUse": {
    "title": "사용 방법",
    "items": ["시각화 도구 조작법 4~5단계"]
  },
  "howItWorks": {
    "title": "동작 원리",
    "items": [
      "알고리즘의 단계별 동작을 4~5개 항목으로 설명",
      "각 단계가 왜 필요한지, 어떤 자료구조를 사용하는지 포함",
      "시간/공간 복잡도 언급"
    ]
  },
  "realWorld": {
    "title": "실무 활용",
    "items": [
      "이 알고리즘이 실제로 쓰이는 곳 4~5개",
      "구체적 제품/서비스명 포함 (예: Google Maps, Linux 커널)",
      "어떤 문제를 해결하는지 명시"
    ]
  },
  "comparison": {
    "title": "비슷한 알고리즘",
    "items": [
      "유사 알고리즘 A vs 현재 알고리즘 — 차이점과 각각의 장단점",
      "유사 알고리즘 B — 언제 대신 사용하는지",
      "3~4개 비교 항목"
    ]
  },
  "tips": {
    "title": "학습 팁",
    "items": ["시각화 도구로 학습할 때의 팁 3~4개"]
  },
  "faq": {
    "title": "자주 묻는 질문",
    "items": [
      { "q": "질문", "a": "답변" }  // 2~3개
    ]
  }
}
```

**알고리즘 추가 시 수정 파일:**
- `/src/app/algorithm/{name}/page.tsx` — 페이지 (메타데이터 + JSON-LD)
- `/src/components/algorithm/visualizers/{Name}Visualizer.tsx` — 시각화 컴포넌트
- `/src/components/algorithm/visualizers/{Name}Canvas2D.tsx` — Canvas 렌더러
- `/src/utils/algorithm/{name}.ts` — 알고리즘 로직 (순수 함수)
- `/messages/ko.json`, `/messages/en.json` — `{name}Visualizer` 네임스페이스 + `algorithmHub.algorithms.{name}` 항목
- `/src/components/algorithm/AlgorithmSidebar.tsx` — 사이드바에 추가

### 완료 체크리스트

- [ ] 모든 UI 텍스트가 `t()` 번역 함수 사용
- [ ] ko.json, en.json 번역 완성 (footer.links + toolsShowcase.tools + 컴포넌트 네임스페이스)
- [ ] menuConfig.ts에 항목 추가됨
- [ ] sitemap.ts에 URL 추가됨
- [ ] 다크모드 호환 (모든 요소에 dark: 접두사)
- [ ] 모바일 반응형 (lg:grid-cols 등)
- [ ] TypeScript 에러 없음 (`npx tsc --noEmit`)

## Development Notes

- ESLint is disabled during builds (ignoreDuringBuilds: true)
- Uses npm as package manager (pnpm has store location issues on this machine; use `npm install` / `npm run`)
- Korean-first UI/UX with comprehensive English translations
- Dark mode support with system preference detection via ThemeToggle
- Responsive design with mobile-first approach
- Environment variable NEXT_PUBLIC_ADSENSE_ID for AdSense integration
- Static sitemap generation with all tool routes
- PWA with Service Worker, offline page, install prompt

## Development Best Practices

### When Adding New Tools
1. **menuConfig.ts에 메뉴 항목 추가** (Header, ToolsShowcase 자동 반영)
2. **번역 파일 업데이트** (ko.json, en.json - footer.links, toolsShowcase.tools 섹션)
3. **sitemap.ts에 URL 추가**
4. **페이지 컴포넌트 생성** (`/src/app/[tool-name]/page.tsx`)
5. **도구 컴포넌트 생성** (`/src/components/[ToolName].tsx`)
6. localStorage.ts에 history title 추가 (히스토리 기능 사용 시)
7. Use manual save pattern for better UX
8. Include comprehensive guide content

### i18n 병렬 작업 시 주의사항 (Critical)
병렬 에이전트로 여러 컴포넌트를 동시에 생성할 때 **i18n 키 불일치**가 가장 흔한 버그 원인이다.

- **컴포넌트와 번역 키를 반드시 동일 에이전트가 함께 작성**할 것. 컴포넌트 에이전트와 번역 에이전트를 분리하면 키 구조가 어긋남.
- **ko.json의 키 구조는 FLAT**: `t('gender')`, `t('reset')` 형태. 중첩 키(`settings.gender.label`)를 사용하면 런타임 MISSING_MESSAGE 에러 발생.
- **t.raw()로 읽는 배열 키**는 ko.json에 실제 배열(`["항목1", "항목2"]`)로 존재해야 함. 없으면 `e.raw(...).map is not a function` 크래시.
- **컴포넌트 생성 후 반드시 ko.json 키와 대조 검증** 수행. 특히 guide 섹션의 `t.raw('guide.xxx.items')` 호출.
- **번역 네임스페이스 규칙**: 컴포넌트명 camelCase (예: `PasswordGenerator` → `passwordGenerator`). `footer.links` + `toolsShowcase.tools` + 컴포넌트 네임스페이스 3곳 모두 추가.

### Code Quality
- Prefer TypeScript interfaces over `any` types
- Use useCallback for expensive operations
- Implement proper error boundaries
- Add comprehensive error handling for clipboard and file operations
- Follow consistent naming conventions

### TypeScript Gotchas
- **Recharts callback types**: `Tooltip formatter` and `Pie label` callbacks have optional params (`value?: number`, `name?: string`, `percent?: number`). Always use nullish coalescing (`value ?? 0`).
- **`unknown` type in JSX**: When using `&&` short-circuit in JSX with `unknown`-typed values (e.g., `parsedResult?.data`), wrap with `!!` to cast to boolean. Otherwise TypeScript errors with "Type 'unknown' is not assignable to type 'ReactNode'".
- **Tailwind CSS v4 JIT**: Dynamic class names like `` `bg-${color}-50` `` don't work. Must use explicit hardcoded class names.
- **`ssr: false` in Next.js 16**: `dynamic(() => ..., { ssr: false })` is NOT allowed in Server Components (page.tsx). Use it only in Client Components ('use client').
- **Tesseract.js v6 API**: `recognize()` returns `Page` type. Words are NOT at `data.words` — use nested `data.blocks[].paragraphs[].lines[].words[]`. Use `createWorker(langs)` with dynamic import.

### Testing Considerations
- Test calculation accuracy with edge cases
- Verify responsive design on all screen sizes
- Test keyboard navigation and accessibility
- Validate internationalization coverage
- Check dark mode compatibility
