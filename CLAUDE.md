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