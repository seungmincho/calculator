# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Korean financial calculator web application ("툴허브") built with Next.js 15, providing salary, loan, and savings calculators. The app is deployed on Vercel and includes SEO optimization, AdSense integration, and Vercel Analytics.

## Development Commands

Development server (runs on port 3030):
```bash
pnpm dev
```

Build and deployment:
```bash
pnpm build
pnpm start
```

Static export (configured in next.config.ts):
```bash
pnpm export
```

Cloudflare deployment:
```bash
pnpm cf:deploy
```

Linting:
```bash
pnpm lint
```

## Architecture

- **Framework**: Next.js 15 with App Router
- **Styling**: Tailwind CSS v4 with dark mode support
- **Icons**: Lucide React
- **Analytics**: Vercel Analytics
- **Monetization**: Google AdSense integration
- **Language**: Korean (ko_KR locale)

### File Structure
- `/src/app/`: Next.js app directory with page routes
- `/src/components/`: Reusable calculator components
- Each calculator has dedicated page route and component

### Key Components
- `SalaryCalculator`: Korean salary tax calculator with 4대보험 (4 major insurances) and income tax calculations
- `LoanCalculator`: Loan payment calculator
- `SavingsCalculator`: Savings interest calculator
- `AdSense`: Google AdSense integration component

### Component Architecture Patterns
- **Calculator Structure**: Each calculator follows consistent pattern with Suspense wrapping, URL state management, and real-time calculations
- **State Management**: useState patterns with URL parameter syncing for shareable links
- **Input Handling**: Number formatting with comma separators and validation
- **Calculation History**: Reusable `CalculationHistory` component with localStorage integration

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

## Development Notes

- ESLint is disabled during builds (ignoreDuringBuilds: true)
- Uses pnpm as package manager
- Korean UI/UX with financial calculation focus
- Dark mode support throughout
- Responsive design with mobile-first approach
- Environment variable NEXT_PUBLIC_ADSENSE_ID for AdSense integration

## Development Workflow for New Features

### 1. Internationalization-First Development
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
- Add to Header navigation with `t('footer.links.newFeature')`
- Add to Footer links in both language files
- Update sitemap.ts with new route

### 2. Translation Key Naming Conventions
- Use camelCase for keys: `buttonText`, `errorMessage`
- Group related keys: `labels.input`, `messages.success`
- Use descriptive names: `pasteFromClipboard` not `paste`
- Consistent naming across features

### 3. Dynamic Content Translation
For conditional or dynamic content:
```typescript
// Good: Multiple specific keys
{isSupported ? t('clipboardSupported') : t('clipboardNotSupported')}

// Avoid: Generic keys with parameters
{t('clipboardStatus', {supported: isSupported})}
```

### 4. Validation Checklist
Before completing a feature:
- [ ] All UI text uses translation functions
- [ ] Both Korean and English translations complete
- [ ] Navigation updated in both languages
- [ ] Placeholder text translated
- [ ] Error messages translated
- [ ] Button labels translated
- [ ] Form labels translated

This workflow ensures consistent internationalization and prevents the need for translation retrofitting.