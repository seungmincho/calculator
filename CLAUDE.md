# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Korean all-in-one web tool platform ("툴허브") built with Next.js 16, providing 50+ tools across financial calculators, developer utilities, health tools, and browser games. Deployed on Cloudflare Pages as a static PWA with offline support, SEO optimization, and AdSense integration.

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
└── [tool-name]/page.tsx  # 50+ individual tool pages
```

#### Component Architecture
```
src/
├── components/        # All UI components (70+ files)
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

#### Health & Fitness Tools (4 tools)
- `BMICalculator`: Body mass index and health analysis
- `CalorieCalculator`: BMR and daily calorie requirements
- `BodyFatCalculator`: Body fat percentage calculation
- `WorkHoursCalculator`: Part-time work hours and overtime

#### Development & Utility Tools (24 tools)
- `JsonFormatter`: JSON formatting and validation
- `JsonCsvConverter`: JSON to CSV conversion
- `JsonXmlConverter`: JSON to XML conversion
- `JwtDecoder`: JWT token analysis
- `UuidGenerator`: UUID generation (v1, v4, v7, nil)
- `CronTester`: Cron expression validation
- `SqlFormatter`: SQL query formatting
- `RegexExtractor`: Regex pattern matching
- `MarkdownViewer`: Markdown preview
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

#### Games (10 tools)
- `GameHub`: Game listing/hub page with game stats
- `LottoGenerator`: Korean lottery number generation with statistics
- `LadderGame`: Online ladder game for decision making
- `Omok`: 오목 (Gomoku) with AI opponent and online P2P multiplayer
- `Othello`: 오셀로 (Reversi) with AI opponent
- `Connect4`: 사목 (Connect Four) with AI opponent
- `Checkers`: 체커 with AI opponent
- `Mancala`: 만칼라 with AI opponent
- `Battleship`: 배틀쉽 with AI opponent
- `DotsAndBoxes`: 점과선 with AI opponent

#### Shared Components
- `Header`: Sticky navigation with dropdown menus, recent tools tracking, global search (Ctrl+K), mobile responsive
- `Footer`: Minimal footer with branding
- `ToolsShowcase`: Card-based tool navigation grid with favorites support
- `SearchDialog`: Global command palette (Ctrl+K / Cmd+K) for searching all 52 tools
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
- `AdSense`: Google AdSense ad component
- `I18nWrapper`: Client-side i18n provider

### Custom Hooks
- `useCalculationHistory`: localStorage-based history management with type safety
- `useMessages`: Dynamic locale message loading with fallback
- `useLottoData`: Lotto winning number data fetching
- `useGameRoom`: Supabase-based game room management
- `usePeerConnection`: WebRTC P2P connection for multiplayer games
- `useAIGameStats`: AI game statistics tracking (wins, losses, draws)

### Utility Files
- `localStorage.ts`: Type-safe localStorage wrapper with history titles
- `recentTools.ts`: Recent tool usage tracking per category
- `favorites.ts`: Tool favorites management (localStorage)
- `corsProxy.ts`: CORS proxy utility for external API calls
- `lottoDataLoader.ts` / `lottoUpdater.ts`: Lotto data management

### Menu System
Central configuration in `/src/config/menuConfig.ts` with 4 categories:
- **calculators**: 14 financial calculators
- **tools**: 24 development & utility tools
- **health**: 4 health & fitness tools
- **games**: 10 games (including GameHub)

Header and ToolsShowcase auto-read from menuConfig. Footer is minimal (no menu links).

### PWA Architecture
- `public/manifest.json`: Full PWA manifest with shortcuts, screenshots, categories
- `public/sw.js`: Service Worker for offline caching
- `src/app/offline/page.tsx`: Offline fallback page
- `src/components/InstallPrompt.tsx`: Install prompt UI
- Service Worker registration in layout.tsx with update notifications

### SEO & Metadata
- Comprehensive Korean SEO metadata in layout.tsx
- OpenGraph and Twitter card support
- JSON-LD structured data: site-level (WebSite + SoftwareApplication) + per-tool (WebApplication via ToolJsonLd)
- Breadcrumb JSON-LD structured data (auto-generated via Breadcrumb component)
- Static sitemap generation (`src/app/sitemap.ts`) with all 50+ routes
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
All board games follow a consistent pattern:
- Wrapper component (e.g., `Omok.tsx`) handles mode selection (AI/Online)
- Board component (e.g., `OmokBoard.tsx`) handles game logic and rendering
- AI opponents use minimax/alpha-beta pruning algorithms
- Online multiplayer via `useGameRoom` (Supabase) + `usePeerConnection` (WebRTC)
- Game stats tracked via `useAIGameStats` hook with localStorage persistence

### Recent Tools Tracking
Header shows recently used tools per category (max 4) using `recentTools.ts` utility with localStorage.

## Development Workflow for New Features

### 1. Adding New Menu Items (Quick Reference)

메뉴 시스템은 **단일 설정 파일**로 관리됩니다. 새 도구를 추가할 때 아래 파일들만 수정하면 됩니다:

#### 수정 파일 목록 (순서대로)
1. `/src/config/menuConfig.ts` - 메뉴 항목 추가
2. `/messages/ko.json` - 한국어 번역 추가
3. `/messages/en.json` - 영어 번역 추가
4. `/src/app/sitemap.ts` - SEO sitemap 추가
5. `/src/app/[tool-name]/page.tsx` - 페이지 생성
6. `/src/components/[ToolName].tsx` - 컴포넌트 생성

#### Step 1: menuConfig.ts에 메뉴 항목 추가
```typescript
// /src/config/menuConfig.ts
// 적절한 카테고리(calculators, tools, health, games)에 추가
{
  href: '/new-tool',
  labelKey: 'footer.links.newTool',
  descriptionKey: 'toolsShowcase.tools.newTool.description',
  icon: '🔧'
}
```

#### Step 2: 번역 파일 추가 (ko.json, en.json)
```json
// messages/ko.json - 2곳에 추가 필요

// 1) footer.links 섹션에 메뉴명 추가
"footer": { "links": { "newTool": "새 도구" } }

// 2) toolsShowcase.tools 섹션에 설명 추가
"toolsShowcase": { "tools": { "newTool": { "title": "새 도구", "description": "설명" } } }
```

#### Step 3: sitemap.ts에 URL 추가
```typescript
{ url: 'https://toolhub.ai.kr/new-tool', lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 }
```

#### 메뉴 시스템 구조
```
/src/config/menuConfig.ts (공통 설정)
    ↓ (자동 반영)
├── Header.tsx (드롭다운 메뉴 + 최근 사용)
├── ToolsShowcase.tsx (카드형 네비게이션)
└── Footer.tsx (간소화됨 - 메뉴 없음)
```

**중요**: Header와 ToolsShowcase는 menuConfig에서 자동으로 메뉴를 가져오므로 별도 수정이 필요 없습니다.

### 2. Internationalization-First Development

#### Step 1: Create Translation Files First
Add Korean translations to `/messages/ko.json` and English to `/messages/en.json`.

#### Step 2: Implement Component with Translations
```typescript
const NewFeatureComponent = () => {
  const t = useTranslations('newFeature');
  return <h1>{t('title')}</h1>;
};
```

### 3. Translation Key Naming Conventions
- camelCase keys: `buttonText`, `errorMessage`
- Group related: `labels.input`, `messages.success`
- Descriptive names: `pasteFromClipboard` not `paste`

### 4. Validation Checklist
Before completing a feature:
- [ ] All UI text uses translation functions
- [ ] Both Korean and English translations complete
- [ ] Navigation updated (menuConfig + translations)
- [ ] Sitemap updated
- [ ] Dark mode compatible
- [ ] Mobile responsive

## Development Notes

- ESLint is disabled during builds (ignoreDuringBuilds: true)
- Uses pnpm as package manager
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

### Code Quality
- Prefer TypeScript interfaces over `any` types
- Use useCallback for expensive operations
- Implement proper error boundaries
- Add comprehensive error handling for clipboard and file operations
- Follow consistent naming conventions

### Testing Considerations
- Test calculation accuracy with edge cases
- Verify responsive design on all screen sizes
- Test keyboard navigation and accessibility
- Validate internationalization coverage
- Check dark mode compatibility
