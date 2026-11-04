# 에버랜드 방문 플래너 — 2026-11-04

사용자 승인: 툴허브 내부에서 **날씨와 예상 혼잡도에 따른 방문 날짜 추천과 이유**를 주 기능으로 만든다. 지도·현재 대기시간은 보조 기능이다.

## 경로와 렌더링

- `/everland/`: 추천 3일, 목적별 가중치, 주말·공휴일 필터, 날짜 비교, 시간대별 예보, 공유 이미지·URL.
- `/everland/date/YYYY-MM-DD/`: 예보가 있는 날짜의 고유 URL, 해당 날짜를 첫 결과로 표시.
- `/everland/map/`: 공개 안내도 위 놀이기구와 현재 대기 현황.
- `/everland-wait-times/`: 지도 페이지로 301.
- `/everland/sitemap.xml`: 현재 예보 날짜를 포함한 동적 사이트맵. robots.txt에서 연결.

기존 Next.js static export를 유지한다. `/everland/` 정적 페이지가 공통 CSS를 생성하고, `functions/everland/[[path]].ts`가 같은 React 컴포넌트를 **react-dom/server.edge**로 서버 렌더링한다. `ASSETS.fetch('/everland/')`에서 스타일시트만 읽고 Next의 RSC 스크립트는 삽입하지 않는다. `src/entries/everland-client.tsx`가 동일한 초기 데이터로 hydrate한다. Next 내부 링크로 정적 RSC가 로드된 경우 공개 도메인에서 문서 탐색으로 진입한다. 개발 확인은 Next dev가 아닌 Pages dev를 사용한다.

`npm run dev/build/export/wrangler:deploy`에서 브라우저 번들을 자동 생성한다. 직접 자산만 갱신할 때는 `npm run everland:assets`. `public/everland-assets/planner.js`는 생성물이다.

검색 로봇과 일반 방문자에게 같은 본문을 제공한다. 추천 이유, 예보 발표·확인 시각, 근거, 한계, FAQ는 HTML에 있다. canonical, WebApplication, BreadcrumbList, OG, 메뉴·RSS·사이트맵을 연결했다. AI 인용이나 검색 노출을 보장하지 않는다. 별도의 가상 정확도·리뷰·평점 데이터는 넣지 않았다.

## 날씨와 추천 규칙

- MET Norway Locationforecast, 용인 에버랜드 `37.294,127.204`. 식별 User-Agent와 출처 링크, CC BY 4.0 표기. API 키 불필요.
- `everland_weather`에 성공 응답을 저장하고 1시간 이내 재조회하지 않는다. Cron은 기존 10분 간격을 유지한다. 페이지는 캐시가 없거나 3시간 이상 지연된 경우 갱신을 시도한다.
- 기온 °C, 풍속 m/s, 강수 mm 단위와 숫자 범위를 검증한다. 비 결측치를 0으로 채우지 않는다. 시간대가 겹치는 강수 누적 구간은 중복 집계하지 않는다.
- KST 10~18시를 비교하며 최소 6시간 자료가 필요하다. 강수는 예보 구간과 방문 시간의 중첩 비율로 배분한다. 이는 강수 확률이나 정확한 비 시작 시각이 아니다. 먼 예보의 6~12시간 해상도를 알린다.
- 예보 발표·수집 후 24시간을 넘으면 추천 중단. 5일 이후는 변동 가능성을 별도 표시. 지난 시간 자료가 부족한 오늘은 전일 방문 추천에서 제외한다.
- 혼잡도는 **요일·공휴일 달력 규칙**이다. 월~목 상대적으로 여유, 금요일 보통, 주말·공휴일 혼잡. 강수로 사람이 줄 것이라고 추정하지 않는다. 실제 입장객 수나 검증된 대기시간 예측이 아니다.
- 날씨/달력 가중치: 여유롭게 70/30, 아이 동반 85/15, 기구 중심 80/20. 비·추위·더위·바람에 감점. 큰 비·강풍·극한 기온·뇌우 시 45점 상한. 상세 수식은 `src/lib/everland/planner.ts`; 현장 운휴 기준과 구분한다.
- `everland_daily`에 관측 수와 표시 대기시간 중앙값의 일평균을 보존한다. 아직 이 자료를 검증된 혼잡 모델이라고 사용하지 않는다. 원시 스냅샷은 기존 7일 보관.

MET 출처: <https://api.met.no/weatherapi/locationforecast/2.0/documentation>, <https://api.met.no/doc/License>. Google AI 검색 지침: <https://developers.google.com/search/docs/appearance/ai-features>.

## 안내도

사용자가 지정한 PDF: <https://wwwrod.everland.com/web/images/front/everland/common/everland.pdf>. 확인한 파일은 2페이지이며 지도는 두 번째 페이지, PDF 생성 시각은 2023-05-04다. 지도 영역을 발췌해 `public/everland-assets/guide-map.webp`로 저장했다. 원본 이미지 저작권은 에버랜드 측에 있으며 별도 상업 재사용 허락은 확인하지 못했다. 출처·판본·일부 발췌 사실을 기록한다.

`src/lib/everland/map.ts`는 원본 1418×1323 렌더에서 시설 번호를 대조한 39개 위치다. 지도 이미지 경계 `[0,185,1138,1045]`로 좌표를 정규화한다. 위경도를 일러스트에 선형 투영하지 않는다. 입구·길찾기 좌표가 아니다. 현재와 이름이 다르거나 위치를 확정하지 못한 시설은 목록에서 위치 미확인으로 구분한다. T 익스프레스처럼 라이브 API에 없는 안내도 시설은 위치만 표시하고 운영 상태·대기시간을 만들지 않는다.

전체 지도는 주요 8개를 표시한다. 확대하거나 검색하면 39개 위치가 나타난다. 확대·축소·전체 보기, 한국어/영어 검색, 표시 선택, 상태 필터 지원. iframe은 동일 출처만 허용하며 원시 대기시간 API는 공개하지 않는다.

## 배포와 확인

기존 `toolhub` D1 및 `toolhub-everland-collector`를 사용한다. `0002_visit_planner.sql`은 날씨와 일 집계 테이블 추가만 수행한다. 기존 Pages 환경변수·다른 바인딩을 교체하지 않는다.

1. 전체 `npx tsc --noEmit`, 변경 범위 ESLint, messages generate/check, namespace audit.
2. `scripts/check-everland-planner.ts`와 기존 `scripts/check-everland.ts`를 esbuild로 컴파일해 실행. 전자는 `@/` 별칭이 있으므로 `--packages=external` 대신 React/React DOM/lucide만 external로 지정한다.
3. 타입 통과 후 `SKIP_BUILD_TYPECHECK=1 LOW_MEMORY_BUILD=1 npm run build` (Windows는 PowerShell 환경변수 사용).
4. Pages dev와 격리된 로컬 D1에서 `node scripts/verify-everland-planner.mjs [baseURL]` 실행.
5. D1 migration → Worker → Pages 미리보기 → 운영 순서. 이 PC의 Wrangler 3은 Node 22로 실행한다.

로컬 검증 자료는 `.wrangler/everland-replan/evidence/`에 있다. 운영 반영과 검증 결과는 `docs/verify/2026-11-04-everland-planner.md`에 기록한다.
