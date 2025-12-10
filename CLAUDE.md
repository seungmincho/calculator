# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Korean financial calculator web application ("툴허브") built with Next.js 15, providing comprehensive financial, health, and utility calculators. The app is deployed on Cloudflare Pages and includes SEO optimization and AdSense integration.

## Development Commands

```bash
# Development server (runs on port 3030)
pnpm dev

# Build production bundle
pnpm build

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

## Architecture

### Technology Stack
- **Framework**: Next.js 15 with App Router (static export mode)
- **Styling**: Tailwind CSS v4 with dark mode support
- **Icons**: Lucide React
- **Deployment**: Cloudflare Pages with Wrangler
- **Monetization**: Google AdSense integration
- **Language**: Korean (ko_KR locale) with English support

### High-Level Architecture

#### App Router Structure
```
src/app/
├── layout.tsx          # Root layout with metadata and providers
├── page.tsx           # Home page (salary calculator)
├── [tool-name]/       # Individual tool pages
│   └── page.tsx       # Server component with Suspense boundary
├── tips/              # Tips section with dynamic routing
│   └── [id]/          # generateStaticParams for static generation
└── api/               # Minimal API routes
```

#### Internationalization (i18n) Architecture
The project uses a **dual-layer i18n system**:
- **Server-side**: next-intl configuration in `/src/i18n.ts` and `/src/routing.ts`
- **Client-side**: LanguageContext + I18nWrapper for client-side language switching
- **Message files**: `/messages/ko.json` and `/messages/en.json`
- **Fallback strategy**: Korean messages as fallback on load failure

#### Component Architecture Patterns
- **Page Components**: Server components with client component imports
- **Calculator Components**: Client components with URL state synchronization
- **Shared Components**: CalculationHistory, Header, Footer, ToolsShowcase
- **Custom Hooks**: useCalculationHistory, useMessages for reusable logic

### Key Components

#### Financial Calculators
- `SalaryCalculator`: Korean salary tax calculator with 4대보험 (4 major insurances) and income tax calculations
- `LoanCalculator`: Loan payment calculator
- `SavingsCalculator`: Savings interest calculator
- `RetirementCalculator`: Retirement savings calculator
- `TaxCalculator`: Income tax and various taxes
- `ExchangeRateCalculator`: Real-time currency conversion
- `RealEstateCalculator`: Real estate transaction fees and taxes
- `StockCalculator`: Stock trading fees and returns
- `CarLoanCalculator`: Auto purchase loan calculator
- `CarTaxCalculator`: Car registration and acquisition taxes
- `FuelCalculator`: **NEW** Business vehicle fuel costs and depreciation with manual fuel price input

#### Health & Fitness Tools
- `BMICalculator`: Body mass index and health analysis
- `CalorieCalculator`: BMR and daily calorie requirements
- `BodyFatCalculator`: Body fat percentage calculation
- `WorkHoursCalculator`: Part-time work hours and overtime calculation

#### Development & Utility Tools
- `JsonFormatter`: JSON formatting and validation
- `JsonCsvConverter`: High-performance JSON ↔ CSV conversion
- `JwtDecoder`: JWT token analysis and validation
- `UuidGenerator`: UUID generation (v1, v4, v7, nil)
- `CronTester`: Cron expression validation and testing
- `SqlFormatter`: SQL query formatting
- `RegexExtractor`: Pattern matching and text extraction
- `MarkdownViewer`: Markdown preview and rendering
- `TimeConverter`: Global timezone conversion and Unix timestamps
- `ImageResizer`: Image resizing and compression
- `ImageEditor`: Basic image editing tools
- `QrGenerator`: **NEW** QR code generation with custom logo insertion

#### Simple Games & Tools
- `LottoGenerator`: Korean lottery number generation with statistics
- `LadderGame`: Online ladder game for decision making

### Component Architecture Patterns
- **Calculator Structure**: Each calculator follows consistent pattern with Suspense wrapping, URL state management, and real-time calculations
- **State Management**: useState patterns with URL parameter syncing for shareable links
- **Input Handling**: Number formatting with comma separators and validation
- **Calculation History**: Reusable `CalculationHistory` component with localStorage integration
- **Manual Save Pattern**: Recent calculators use manual save buttons instead of auto-save to prevent unnecessary history entries

### Internationalization
- **Framework**: Next-intl with Korean/English support (Korean default)
- **Structure**: `/messages/` JSON files, `LanguageContext` + `I18nWrapper` for client-side switching
- **Routing**: Configured in `/src/routing.ts` and `/src/i18n.ts`

### Custom Hooks
- `useCalculationHistory`: localStorage-based history management with type safety
- `useMessages`: Dynamic locale message loading with fallback support

### SEO & Metadata
- Comprehensive Korean SEO metadata in layout.tsx
- OpenGraph and Twitter card support
- JSON-LD structured data for search engines
- Domain: toolhub.ai.kr

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
// Common pattern in calculator components
const updateURL = (params: Record<string, any>) => {
  const url = new URL(window.location.href);
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, String(value));
  });
  window.history.replaceState({}, '', url);
};
```

### Calculation History Architecture
- Uses localStorage with type-safe interface in `/src/utils/localStorage.ts`
- Custom hook `useCalculationHistory` for consistent access
- Manual save pattern (button click) instead of auto-save
- Title generation based on calculator type and inputs

## Development Notes

- ESLint is disabled during builds (ignoreDuringBuilds: true)
- Uses pnpm as package manager
- Korean-first UI/UX with comprehensive English translations
- Dark mode support with system preference detection
- Responsive design with mobile-first approach
- Environment variable NEXT_PUBLIC_ADSENSE_ID for AdSense integration
- Static sitemap generation with all tool routes

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
  labelKey: 'footer.links.newTool',           // Footer/Header 메뉴명
  descriptionKey: 'toolsShowcase.tools.newTool.description',  // ToolsShowcase 설명
  icon: '🔧'  // 이모지 아이콘
}
```

#### Step 2: 번역 파일 추가 (ko.json, en.json)
```json
// messages/ko.json - 2곳에 추가 필요

// 1) footer.links 섹션에 메뉴명 추가
"footer": {
  "links": {
    "newTool": "새 도구"
  }
}

// 2) toolsShowcase.tools 섹션에 설명 추가
"toolsShowcase": {
  "tools": {
    "newTool": {
      "title": "새 도구",
      "description": "새 도구에 대한 간단한 설명"
    }
  }
}
```

#### Step 3: sitemap.ts에 URL 추가
```typescript
// /src/app/sitemap.ts
{
  url: 'https://toolhub.ai.kr/new-tool',
  lastModified: new Date(),
  changeFrequency: 'weekly',
  priority: 0.8,
}
```

#### 메뉴 시스템 구조
```
/src/config/menuConfig.ts (공통 설정)
    ↓ (자동 반영)
├── Header.tsx (드롭다운 메뉴)
├── ToolsShowcase.tsx (카드형 네비게이션)
└── Footer.tsx (간소화됨 - 메뉴 없음)
```

**중요**: Header와 ToolsShowcase는 menuConfig에서 자동으로 메뉴를 가져오므로 별도 수정이 필요 없습니다.

---

### 2. Internationalization-First Development
When adding new features, always follow this sequence:

#### Step 1: Create Translation Files First
1. **Add Korean translations** to `/messages/ko.json`:
```json
"newFeature": {
  "title": "새 기능",
  "description": "기능 설명",
  "button": "버튼 텍스트",
  "labels": {
    "input": "입력 라벨",
    "output": "출력 라벨"
  }
}
```

2. **Add English translations** to `/messages/en.json`:
```json
"newFeature": {
  "title": "New Feature",
  "description": "Feature description",
  "button": "Button Text",
  "labels": {
    "input": "Input Label",
    "output": "Output Label"
  }
}
```

#### Step 2: Implement Component with Translations
```typescript
const NewFeatureComponent = () => {
  const t = useTranslations('newFeature');
  const tc = useTranslations('common');

  return (
    <div>
      <h1>{t('title')}</h1>
      <p>{t('description')}</p>
      <button>{t('button')}</button>
    </div>
  );
};
```

#### Step 3: Update Navigation
메뉴 추가는 위의 "Adding New Menu Items" 섹션을 참고하세요.

### 3. Translation Key Naming Conventions
- Use camelCase for keys: `buttonText`, `errorMessage`
- Group related keys: `labels.input`, `messages.success`
- Use descriptive names: `pasteFromClipboard` not `paste`
- Consistent naming across features

### 4. Dynamic Content Translation
For conditional or dynamic content:
```typescript
// Good: Multiple specific keys
{isSupported ? t('clipboardSupported') : t('clipboardNotSupported')}

// Avoid: Generic keys with parameters
{t('clipboardStatus', {supported: isSupported})}
```

### 5. Validation Checklist
Before completing a feature:
- [ ] All UI text uses translation functions
- [ ] Both Korean and English translations complete
- [ ] Navigation updated in both languages
- [ ] Placeholder text translated
- [ ] Error messages translated
- [ ] Button labels translated
- [ ] Form labels translated

This workflow ensures consistent internationalization and prevents the need for translation retrofitting.

## Recent Completed Features

### ✅ QR Code Generator (2024)
- QR code generation with custom logo insertion
- Support for text, URL, email, phone, SMS, WiFi, vCard formats
- Image copying functionality with canvas manipulation
- Complete Korean/English translations
- Integrated into Header, Footer, ToolsShowcase, sitemap

### ✅ Fuel Calculator (2024)
- Business vehicle fuel cost and depreciation calculation
- Manual fuel price input (replaced real-time API)
- Manual save functionality for calculation history
- Comprehensive guide content with business expense rules
- Vehicle type efficiency and depreciation data
- Complete Korean/English translations

## Potential Next Tasks

### High Priority
1. **Performance Optimization**
   - Implement lazy loading for heavy components
   - Optimize bundle size and Core Web Vitals
   - Add service worker for offline functionality

2. **Enhanced SEO**
   - Add more structured data for rich snippets
   - Implement breadcrumb navigation
   - Create tool-specific landing pages with better content

3. **User Experience**
   - Add keyboard shortcuts for power users
   - Implement bulk operations for calculators
   - Add export/import for calculation histories

### Medium Priority
4. **New Calculator Categories**
   - Insurance calculators (life, health, car)
   - Investment calculators (compound interest, portfolio)
   - Business calculators (ROI, break-even analysis)

5. **Advanced Features**
   - PDF report generation for calculations
   - Email sharing functionality
   - Multi-language support expansion (Japanese, Chinese)

6. **Analytics & Insights**
   - Usage analytics dashboard
   - Popular calculation patterns
   - User feedback collection system

### Low Priority
7. **Integration Features**
   - API endpoints for calculator functions
   - Webhook support for business integrations
   - Plugin system for custom calculators

8. **Mobile App**
   - Progressive Web App (PWA) enhancement
   - Native mobile app consideration
   - Offline calculation capabilities

## Development Best Practices

### When Adding New Calculators
1. **menuConfig.ts에 메뉴 항목 추가** (Header, ToolsShowcase 자동 반영)
2. **번역 파일 업데이트** (ko.json, en.json - footer.links, toolsShowcase.tools 섹션)
3. **sitemap.ts에 URL 추가**
4. **페이지 컴포넌트 생성** (`/src/app/[tool-name]/page.tsx`)
5. **계산기 컴포넌트 생성** (`/src/components/[ToolName].tsx`)
6. localStorage.ts에 history title 추가 (히스토리 기능 사용 시)
7. Use manual save pattern for better UX
8. Include comprehensive guide content

### Code Quality
- Prefer TypeScript interfaces over any types
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