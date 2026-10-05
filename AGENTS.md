# AGENTS.md

툴허브(toolhub.ai.kr) — 계산기·개발 도구·미디어·건강·게임을 모은 한국어 웹 도구 사이트.
Next.js 16 App Router 정적 export(`out/`) · React 19 · TypeScript · Tailwind CSS v4 · Cloudflare Pages · PWA.

- 컴포넌트·훅·유틸 목록, 아키텍처 설명, 새 도구 코드 템플릿, 기획 원칙 전문:
  [`docs/codebase-guide.md`](docs/codebase-guide.md)
- 진행 상황과 다음 작업: [`docs/handoff/NEXT-SESSION.md`](docs/handoff/NEXT-SESSION.md)

## 명령

패키지 매니저는 **npm** 이다. 이 PC 에서 pnpm 은 store 위치 문제가 있다(lockfile 은 둘 다 있다).

```bash
npm run dev                  # 번역 생성 후 next dev --turbopack, 포트 3039
npm run lint                 # eslint .
npx tsc --noEmit             # 타입 검사
npm run messages:generate    # messages/ko·en.json → messages/generated/ · src/lib/i18n/ns/ (dev·build 가 먼저 돌린다)
npm run messages:check       # 생성본이 원본과 어긋났는지만 본다
node scripts/i18n-namespaces.cjs --apply   # 컴포넌트에 '@/lib/i18n/ns/<ns>' import 삽입
node scripts/i18n-namespaces.cjs --audit   # 쓰는 네임스페이스가 모두 등록됐는지 검사
node scripts/generate-og.mjs <slug>        # public/og/<slug>.png + page.tsx openGraph·twitter images 삽입
node scripts/generate-redirects-rss.js     # menuConfig → public/_redirects · public/rss.xml
node scripts/check-static-html.cjs out     # 빌드 후: 본문이 숨겨졌거나 h1 이 없는 페이지 목록
npm run wrangler:dev         # out/ 을 Cloudflare Pages 로컬로 띄운다
```

**`npm run build` 는 사용자가 요청할 때만 돌린다.** `export`·`wrangler:deploy`·`cf:deploy` 도 안에서
`next build` 를 돈다. 빌드 중 타입 검사는 메모리를 많이 먹으므로, `npx tsc --noEmit` 을 따로 통과시킨
뒤에만 `SKIP_BUILD_TYPECHECK=1` 로 끈다(`next.config.ts`).

## 단일 출처

- `src/config/menuConfig.ts` — 메뉴의 정본. Header·ToolsShowcase·SearchDialog·GameHub·`sitemap.ts` 가 여기서
  읽는다. 카테고리는 `calculators | tools | media | health | games`.
  - 필수: `href`·`labelKey`·`descriptionKey`·`icon`. 선택: `addedDate`('YYYY-MM-DD', 30일 안이면 NEW 배지),
    `updatedDate`(sitemap lastmod·RSS pubDate), `subcategory`(번역 키), `modes`(게임 전용 `ai | online | solo`).
- `src/config/toolIcons.ts` — 화면에 쓰는 라인 아이콘(`<ToolIcon href=... />`). menuConfig 의 emoji `icon` 은 화면에 쓰지 않는다.
- `src/app/globals.css` — 색·모서리·그림자 토큰. 바꾸면 전 페이지에 반영된다.
- `src/utils/insuranceRates.ts` — 4대보험 요율·국민연금 상한(2026). 요율이 바뀌면 여기만 고친다.
- `src/lib/i18n.ts` — 번역 레지스트리(next-intl 대체). 원본은 `messages/ko.json`·`en.json` 뿐이고
  `messages/generated/`·`src/lib/i18n/ns/` 는 생성물이라 손으로 고치지 않는다.

## 깨면 안 되는 것

- **`useSearchParams` 는 `@/hooks/useSearchParams` 에서만 가져온다.** `next/navigation` 것을 쓰면 static
  export 프리렌더가 bailout 해서 도구 본문이 HTML 에서 빠지고 Google 이 색인하지 못한다. API 는 같고 서버에서는 빈 params 다.
- **페이지 전체를 `<Suspense>` 로 감싸지 않는다.** React 19.2 는 12.8KB 넘는 완료 경계를 `</main>` 뒤 숨김
  영역으로 빼고 제자리에 fallback(스피너)만 남긴다. 검색엔진은 스피너만 색인한다. 빌드 후 `check-static-html.cjs` 로 확인.
- **Tailwind v4 는 동적 클래스 이름을 못 읽는다.** `` `bg-${color}-50` `` 대신 클래스 이름을 그대로 적는다.
- **`dynamic(..., { ssr: false })` 는 Server Component(page.tsx)에서 쓸 수 없다.** `'use client'` 컴포넌트 안에서만.
- Recharts `Tooltip formatter`·`Pie label` 콜백 인자는 optional 이다 → `value ?? 0`.
- JSX 에서 `unknown` 값을 `&&` 로 쓰면 타입 오류가 난다 → `!!parsedResult?.data && ...`.
- Tesseract.js v6 `recognize()` 결과의 단어는 `data.words` 가 아니라 `data.blocks[].paragraphs[].lines[].words[]`
  에 있다. `createWorker(langs)` 는 dynamic import 로.

## 번역(i18n)

- 컴포넌트는 `import { useTranslations } from '@/lib/i18n'` 과 함께 `import '@/lib/i18n/ns/<ns>'` 로 자기
  네임스페이스를 등록한다. 빠뜨리면 화면에 키가 그대로 나온다. `<GuideSection namespace="x" />` 도 마찬가지다.
- 도구 하나에 세 곳: `footer.links` · `toolsShowcase.tools` · 컴포넌트 네임스페이스. ko·en 둘 다.
- 네임스페이스 이름은 컴포넌트명 camelCase(`PasswordGenerator` → `passwordGenerator`). 키도 camelCase,
  묶을 때는 `result.title`·`guide.tips.items` 처럼.
- 배열은 `(t.raw('guide.items') as string[])`. ko.json 에 실제 배열이 없으면 `.map is not a function` 으로 죽는다.
- 번역 키 불일치가 가장 흔한 런타임 오류다. 컴포넌트를 만들면 `t()`·`t.raw()` 키를 ko.json 구조와 하나씩
  맞춰 본다(중첩 여부까지). 병렬 에이전트를 쓸 때는 컴포넌트와 그 번역을 **같은 에이전트**가 함께 쓴다.

## 디자인 시스템 (토스 스타일) — 페이지별 색 하드코딩 금지

목표는 "AI 가 만든 티" 없는 도구 모음이다. 색은 의미가 있을 때만(주요 버튼·오류/경고·결과 숫자),
아이콘은 단색 라인 한 종류, 박스는 흰색·회색 두 가지.

- 토큰(`:root`/`.dark` CSS 변수라 `dark:` 접두사가 필요 없다)
  - 텍스트 `text-fg`(제목) `text-body`(본문·라벨) `text-sub`(보조) `text-muted`(설명) `text-faint`(플레이스홀더·비활성)
  - 배경 `bg-canvas`(페이지) `bg-surface`(카드) `bg-field` `bg-subtle`(카드 안 구역·정보 박스) `bg-soft`(칩·보조 버튼·hover) `bg-track`
  - 테두리 `border-line` `border-line-strong` · 브랜드 `text-primary` `bg-primary` `bg-primary-soft`
- 컴포넌트 클래스: `ui-card`·`ui-field`·`ui-btn`·`ui-btn-soft`. `@layer components` 라 함께 쓴 유틸리티가 이긴다.
- 강조: 선택된 탭·세그먼트·칩은 `bg-primary text-white`, 선택된 옵션 카드·항목은 `bg-primary-soft text-primary`
  (+`border-primary`). 선택 상태를 회색으로 두지 않는다. 첫 화면에 기본값으로 결과가 보이게 한다.
- 그림자는 팝오버·모달에만. 팔레트: gray/slate = 토스 그레이, blue = #3182F6, indigo·violet·purple → blue. 폰트 Pretendard.
- 결과가 있는 도구는 결과 카드 아래에 `<ShareResult card={{ tool, label, headline, sub?, rows? }} />`
  (`src/components/ShareResult.tsx`)를 붙이고, URL 파라미터로 결과가 재현되게 한다.
- 금지: 장식용 이모지(제목·버튼·라벨 앞), 라벨·섹션 제목 앞 아이콘, 색 틴트 박스(`bg-green-50` 등 — 정보 박스는
  `bg-subtle`, 경고만 amber/red), 그라데이션 버튼·배너, `backdrop-blur`, 배경 color blob, light/dark 색 쌍
  하드코딩, 인라인 `rgba()` 그림자, page.tsx 래퍼 배경. 게임처럼 이모지가 콘텐츠인 곳은 예외.
- 일괄 치환: `python scripts/codemod-design-tokens.py`(다시 돌려도 안전).

```
카드        ui-card p-6
입력        ui-field px-4 py-3
메인 버튼   ui-btn px-4 py-3
보조 버튼   ui-btn-soft px-4 py-2   또는  bg-soft hover:bg-subtle text-body rounded-xl
정보 박스   bg-subtle rounded-2xl p-5 text-sub   (경고: bg-amber-50 text-amber-800)
결과 숫자   text-3xl font-bold text-fg tabular-nums
```

## 새 도구 추가

**기획안을 먼저 사용자에게 보여 주고 확인받은 뒤 개발한다.** 목표는 "단순 계산기가 아니라 이 도구 하나로
충분하다"는 경험이다. 입력 UX · 결과 표시 · 시뮬레이션·비교 · 정확성(최신 법령·요율, 근거 출처) · 가이드·FAQ ·
공유·저장 · 관련 도구 연계 일곱 가지를 검토한다. 관점별 세부와 기획안 형식은 `docs/codebase-guide.md` §2.

수정할 파일(순서대로):

| # | 파일 | 작업 |
|---|------|------|
| 1 | `src/config/menuConfig.ts` + `src/config/toolIcons.ts` | 알맞은 카테고리 items 끝에 항목, 아이콘 매핑 한 줄 |
| 2 | `messages/ko.json`, `messages/en.json` | 세 곳(footer.links · toolsShowcase.tools · 컴포넌트 네임스페이스) |
| 3 | `src/app/[tool-name]/page.tsx` | 메타데이터 + JSON-LD(WebApplication). 템플릿은 가이드 §3 |
| 4 | `src/components/[ToolName].tsx` | `'use client'` 컴포넌트 |
| 5 | `public/og/[slug].png` | `node scripts/generate-og.mjs [slug]` — page 의 openGraph 가 layout 이미지를 덮어쓰므로 필수 |
| 6 | `public/rss.xml`, `public/_redirects` | `node scripts/generate-redirects-rss.js` (sitemap 은 menuConfig 에서 자동) |

- 계산 히스토리를 쓰면 `src/utils/localStorage.ts` 의 `generateHistoryTitle` 에 항목을 더한다.
- 게임은 menuConfig 에 `modes` 를 넣으면 GameHub 에 자동으로 뜬다. `['ai', 'online']` 보드게임은
  `src/components/GamesPageContent.tsx` 의 dynamic import 맵에도 넣는다.
- AI 보드게임은 `components/games/*AI.tsx`(래퍼) · `components/*Board.tsx`(캔버스) · `utils/gameAI/*.ts`(순수 AI)
  세 겹이고, `src/hooks/useGameAchievements.ts` 의 `GameType` 에 새 타입을 더하며 page.tsx 에 `VideoGame` JSON-LD 를 넣는다.
- 알고리즘 시각화는 가이드 7개 섹션(whatIs·howToUse·howItWorks·realWorld·comparison·tips·faq)을 ko·en 모두에
  넣는다. 스키마와 수정 파일은 `docs/codebase-guide.md` §4.

완료 체크리스트:

- [ ] 모든 UI 텍스트가 `t()` 를 거친다
- [ ] ko·en 번역 세 곳 완성
- [ ] menuConfig·toolIcons 항목, OG 이미지, RSS·_redirects 재생성
- [ ] 디자인 토큰만 사용(light/dark 색 쌍 하드코딩 없음), 모바일 반응형
- [ ] `npm run messages:generate` → `node scripts/i18n-namespaces.cjs --apply` → `--audit` 미해결 0건
      (페이지는 shared + 등록한 네임스페이스만 받는다)
- [ ] `npx tsc --noEmit` 오류 0
