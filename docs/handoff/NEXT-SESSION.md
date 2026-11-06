# NEXT-SESSION (2026-10-12 — 개선 루프 배치 17~34 인계)

## 2026-11-06 2027 4대보험 반영 · 4대보험 계산기 (미커밋)

- **`src/utils/insuranceRates.ts`**: 2026·2027 두 벌(`INSURANCE_BY_YEAR`), `INSURANCE`는 2027-01-01 00:00 KST부터 2027로 자동 전환(모듈 로드 시각 기준). 2027 = 국민연금 10%(근로자 5%)·건보 7.19% 동결·장기요양 건보료의 13.90%(2026.10.30 장기요양위원회). 고용보험 2.0%는 정부안이라 `employmentProposed: 0.01`로만 두고 0.9% 유지 — **시행령 제12조 개정되면 employmentRate 를 0.01로, employmentProposed 삭제.** 국민연금 상·하한은 2027.6까지 659만/41만, 7월 고시 후 갱신.
- **1월 1일에 반드시 다시 빌드·배포**: 1/1 전에 빌드한 정적 HTML(2026)과 브라우저(2027)가 달라 hydration 경고가 나고, 표·메타 문구가 2026으로 남는다. 건강보험 월 상·하한(healthInsurance.ts)·산재 평균(fourInsurance.ts ACCIDENT_AVG)도 12월 고시 후 갱신.
- 연봉 계산기: 4대보험 기준 연도 2026/2027 선택(`?year=2027`), 다른 연도와 월 차이, 고용보험 인상안 금액. 연봉 실수령액 표·구간 페이지: 비교 연도 열(2026 빌드 → 2027 열)과 FAQ(연봉 5,000만원 월 −11,000원).
- **`/four-insurance/`** 신규: 근로자·회사 항목별, 회사 규모별 고용안정(0.25~0.85%), 산재 요율 입력(기본 2026 평균 1.47%), 회사 총 인건비, 2026↔2027 비교. `scripts/check-four-insurance.ts`.
- 검증: 급여 관련 검사 11종 + check-four-insurance PASS, 전체 tsc 0, 새 파일 lint 0(SalaryCalculator 기존 3건 그대로), 빌드 779p, 정적 HTML 팁 400건 외 0, 로컬 Pages 375px 넘침 0·콘솔 오류 0.
- **배포**: 2026-11-06 09:19·09:21 UTC 두 번 "Failed to publish your Function. Unknown internal error"(파일 업로드는 성공, 운영은 v4.35.7 그대로). Functions 번들 1.2MB(gzip 243KB)로 한도 문제 아님, 같은 시각 Cloudflare 싱가포르 네트워크 장애 진행 중. 09:32 UTC 세 번째도 같은 실패(실패 배포 18b3cf10·7f2b0cbc·077bc409) → **사용자가 나중에 직접 배포하기로 함.** `out/` 빌드본은 준비됨(SW v4.35.8). 배포 전에 dev 서버를 띄웠다면(out/dev 생김) 다시 빌드. 배포 목록에 다른 곳에서 한 배포 `b8a4bea2`(source 29567a4)가 섞여 있음 — 출처 확인 필요.

## 2026-11-06 새해 해돋이 시간 · 일출·일몰 계산기 (운영 배포, 커밋 da7e2193)

- **`src/lib/sun/solar.ts`**: 일출 방정식(굴절 -0.833°, 해발 0m). 2026-01-01 천문연 발표 7곳과 같은 분으로 일치, 동지·하지 서울 낮 길이 9h34m·14h46m. `scripts/check-sun.ts`(node 24로 바로 실행). 처음 쓴 식은 날짜 번호가 하루 밀려 있었음(연초엔 몇 초 차이라 안 보였음) — 이벤트가 같은 KST 날짜에 떨어지는지 테스트로 막았다.
- **`/new-year-sunrise/`**: 명소 19곳(`src/lib/sun/places.ts`), 기본 시각은 해발 0m(천문연 기준), 산 정상은 높이 반영 값을 참고로만. `/api/sunrise-weather`는 1월 1일 9일 전(12/23)부터 MET 구름양, 그 전엔 MET를 부르지 않음. 제목 연도는 빌드 시점의 다음 1월 1일 — **FAQ 문구의 "2027년"과 시각은 해마다 고쳐야 한다.** 12/23 이후 운영에서 구름 예보가 실제로 나오는지 확인 필요.
- **`/sunrise-sunset/`**: 21개 도시·내 위치(URL에 넣지 않음), 일출·일몰·남중·낮 길이·시민박명·골든아워, 월 표, 연중 낮 길이 차트. 정적 HTML은 빌드 날짜, 브라우저는 오늘로 바뀜.
- 검증: check-sun PASS, 전체 tsc 0, 새 파일 lint 0, 빌드 778p, 정적 HTML 팁 400건 외 0, 로컬 Pages에서 375px 넘침 0·콘솔 오류 0. 운영 Pages `044518fa`, SW v4.35.7.

## 2026-11-06 김장 시기 예보 · 테마파크 월별 달력 · 시간대별 기록 (운영 배포, 커밋 357caa3e)

- **기록 집계**: D1 `0004_history.sql` — `ride_hourly`(날짜·KST 시·기구별 표본·운영·평균/최대 대기, `_park` = 공원 중앙값)와 `park_schedules`(ThemeParks.wiki `/schedule` OPERATING만, 12시간마다). 원본 스냅샷은 7일 뒤 지워지지만 이 표는 계속 남는다. 첫 수집 때 남아 있던 11/4 15시 이후 원본으로 백필(운영 2,900행 확인). Worker `3c42876c`.
- **`/kimjang-timing/`**: 15개 도시(웨더아이 2019 평년 표에 있는 곳만), `functions/api/kimjang-forecast.ts`가 MET Norway 15곳을 받아 엣지 캐시 3시간. 기준 = 일평균 4℃·최저 0℃ 이하가 3일 이어지는 첫날. 김장 계산기 상단·가이드에서 링크.
- **`/everland/calendar/YYYY-MM/`·`/lotte-world/calendar/…`**: 2026-11부터 다음 3개월까지, `/calendar/`는 현재 달로 302. 칸 = 요일·공휴일 규칙 혼잡도, 운영시간(평소보다 늦게 닫으면 +), 예보 범위 점수, 지난 날 실측 평균 대기(에버랜드만). 경주월드는 운영시간 데이터가 없어 404. 공원 사이트맵에 월 URL 포함.
- 검증: 테스트 3종(check-everland·check-theme-parks·check-everland-planner) PASS, 전체 tsc 0, 새 파일 lint 0(김장 계산기의 기존 오류 5건은 그대로), 빌드 776p, check-static-html 팁 400건 외 0. 로컬 Pages(격리 D1 `.wrangler/verify-1106`)에서 375px·데스크톱·다크, 쿼리 공유 링크 hydration 오류 없음. 운영 Pages `f7c06351`, SW v4.35.6, curl로 주요 URL 확인.
- **다음**: 12월 초(기록 4주) 달력 혼잡도를 요일별 실측으로 바꾸고 "요일·시간대별 실제 대기 통계" 페이지 기획. 해돋이 2027(12월 중순 전 공개) 기획. 원격 main에는 이 변경이 없다 — GitHub Actions 배포가 원격 main으로 돌면 이번 기능이 빠진다.

## 2026-11-04 테마파크 변경 커밋

- 사용자 요청으로 에버랜드·롯데월드·경주월드 추천/지도/수집/검색 구성과 스크롤 수정을 함께 커밋한다. 번역·메뉴·패키지의 다른 작업은 분리했고, 기존 로컬 수정은 보존했다. 아래 미푸시 문구는 각 개발 단계 시점의 기록이다.

## 2026-11-04 지도 중첩 스크롤 수정

- 사용자 스크린샷의 롯데월드 iframe/지도 이중 스크롤을 재현했다. iframe이 부모 hydration보다 빨리 로드되면 높이 메시지가 누락돼 1,200px에 고정되던 문제다. listener 등록 및 iframe load 때 높이를 재요청하도록 세 공원에 적용했다.
- 기본 지도 높이 제한 제거, 확대 시에만 내부 스크롤, 지도 경계 휠 전달 복구. 브라우저 번들 캐시 버전 추가. 전체 Next build 없이 지도 번들 재생성 + Functions 배포, 운영 Pages `2b1c682b`.
- 타입/ESLint 및 운영 3개 공원 스크롤 회귀 검사 통과(의도적 JS 지연, 실제 휠, 확대/축소, 층/검색, 320/390px, iframe 재로드). [검증 기록](../verify/2026-11-04-park-map-scroll.md). commit/push 미실행.

## 2026-11-04 롯데월드·경주월드 방문 플래너 확장

- 사용자 요청으로 `/lotte-world/`(잠실), `/gyeongju-world/`를 추가했다. 날씨·달력 기반 예상 혼잡도로 추천 날짜와 이유를 제공하고, 롯데월드는 실내 위주 조건을 선택할 수 있다. 세 공원 간 링크·홈 메뉴·SEO 메타데이터·서버 HTML·날짜별 sitemap 연결.
- 공식 2026년 9월 지도: 롯데월드 지하/1~4층/매직아일랜드 6구역 42개 시설, 경주월드 26개. 모바일 개요 겹침 방지, 최대 8배 확대·검색·선택. 숫자는 시설 번호이며 대기시간이 아니다.
- D1 `0003_theme_parks.sql` 적용, 공원별 날씨 저장 분리. 롯데월드 제공처는 운영 상태만 지원하고 숫자 대기는 없다. 경주월드는 실시간 운영/대기 미지원 명시. 실제 Cron 롯데월드 수집 17:20:34 KST 확인.
- Worker `e81a1a54-2239-4311-b5d7-006b6386ccad`, 최종 Pages `8b764030`, SW v4.35.5. 타입·번역·lint·알고리즘/저장소·전체 build·로컬/미리보기/운영 브라우저·기존 에버랜드 회귀 통과. 운영 홈 진입·모바일 지도·검색봇 HTML 확인, 검증 서버 종료.
- [구현·출처](../theme-park-planners.md), [검증 기록](../verify/2026-11-04-theme-park-planners.md). 기존 미커밋 변경과 stash 보존, commit/push 미실행. 원격 main만 재배포하면 로컬 기능이 빠질 수 있다.

## 2026-11-04 에버랜드 방문 날짜 추천으로 재구성·운영 반영

- 사용자 승인에 따라 `/everland/`를 신설했다. 날씨·예상 혼잡도 기반 추천 날짜와 이유가 메인이고, `/everland/map/`는 보조 지도·대기시간 화면이다. 옛 wait-times 경로는 지도 페이지로 301.
- MET Norway 실제 예보, 목적별 가중치·주말 필터·날짜별 상세·공유 이미지/URL, 검색 로봇이 읽는 서버 HTML·날짜별 URL·사이트맵을 제공한다. 혼잡도는 검증된 ML 모델이 아닌 요일·공휴일 규칙이며 화면에 명시.
- 사용자 지정 2023년 PDF 안내도 위 39개 시설 위치를 범례와 대조했다. 개요 8개, 확대·검색 시 전체 표시. 최신 시설·정확한 입구를 보장하지 않으며 출처·판본과 이용 허락 미확인 상태를 문서화.
- D1 날씨·일별 집계 테이블 추가. Worker `9ae18cbf-ab8a-4c76-83d4-1d6779febe3e`, 운영 Pages `82f1d5a8`, SW v4.35.4. 16:30:34 KST 새 Cron의 스냅샷·일 집계 저장 확인.
- 타입·lint·번역·알고리즘/SQLite 테스트·전체 build 및 실제 운영 브라우저 검증 통과(320/390px, SSR·필터·공유·지도·날짜 URL·사이트맵). 기존 tips 400개 h1 누락 외 새 정적 HTML 문제 없음.
- 구현/운영: [방문 플래너 안내](../everland-planner.md), [검증·배포 기록](../verify/2026-11-04-everland-planner.md). 기존 미커밋 변경 보존, 이번 기능도 커밋·push 미실행. 원격 main 재배포 시 유의.

## 2026-11-04 에버랜드 로컬 직접 배포

- `origin/feat/everland-wait-times` 최신 `e11e7f74`를 로컬 main으로 fast-forward했다. 기존 미커밋 기능을 보존했고 `stash@{0}`에 통합 전 백업을 남겼다. 원격 main은 아직 `f3c8c31c`이며 이번 작업에서 push하지 않았다.
- 기존 D1 `toolhub`의 실제 이름을 확인해 Pages/Worker 바인딩을 보완했다. 수집기 `toolhub-everland-collector`와 10분 Cron을 배포했다. Pages 운영 배포는 `dcf97f72`, SW v4.35.3. https://toolhub.ai.kr/everland-wait-times/ 정상 응답 확인.
- 전체 tsc·Function/Worker tsc·기능/브라우저 테스트·lint·번역 검사 통과, 772/772 build 성공. 저메모리 선택 옵션 `LOW_MEMORY_BUILD=1` 추가. 기존 noindex 팁 400개 h1 누락 외 static HTML 문제 없음.
- 통합된 npm lockfile의 Windows 전용 직접 의존성 잔여 항목을 정리했고 기존 패키지 버전은 바꾸지 않았다. 15:10:34 KST 실제 Cron 수집 성공(57개 시설·대기시간 34개), 15:12 운영 화면의 실제 데이터와 모바일/데스크톱·검색·지도·영문 검증 통과. 첫 기록 시점이므로 추이는 다음 정상 수집 이후 표시된다.
- 상세: [로컬 배포 검증](../verify/2026-11-04-everland-local-deploy.md). 운영 소스에는 원격 main에 없는 기존 로컬 개선도 포함된다.

## 2026-10-27 별냥 링크 운영 배포 완료

- 이전 세션은 footer d1c87262 push만 했고 배포는 하지 않았다. 이번 사용자 요청으로 기존 운영 소스를 유지해 전체 tsc/build 후 Wrangler Pages salary-calculator/main에 직접 배포했다.
- 배포: https://bc6004c7.salary-calculator-d6q.pages.dev . 운영 toolhub.ai.kr 홈/TTS/메뉴의 별냥 링크와 sw.js v4.35.2를 확인했다. 기존 TTS/메뉴 개선도 유지한다.
- 기존 운영 커밋 4개와 origin/main을 merge하고 캐시 변경까지 f3c8c31c로 push했다. 기존 미커밋 기능/문서는 보존했다. 원격만 빌드하면 이 로컬 개선이 빠질 수 있다. 아래 이전 기록의 배포 미수행/원격 통합 대기는 해결됐다.

## 2026-10-27 별냥 상호 소개 링크 (별도 커밋·푸시 완료)

- 사용자 요청으로 공통 푸터의 별냥 소개와 한·영 번역을 별도 작업 폴더에서 추가하고, `d1c87262`를 origin/main에 푸시했다. 변경 파일 5개만 포함했다.
- `C:\projects\salary-calculator\.claude\worktrees\codex-byeolnyang-footer`에서 확인할 수 있다. 번역 생성·일치, namespace audit 미해결 0, Footer ESLint·범위 타입 검사, 개발 서버와 모바일 링크 표시를 확인했다. 전체 빌드·직접 배포는 실행하지 않았다.
- 원래 main의 미푸시 4개 커밋과 기존 미커밋 작업은 보존했다. 로컬 main과 새 origin/main이 갈라져 있으므로 다음 툴허브 작업 때 기존 변경을 보존한 뒤 원격 변경을 통합해야 한다. force push하지 않는다.
- 기존 미추적 `.github/workflows/deploy.yml`은 이번 푸시에 포함하지 않았다. 푸시 후 GitHub 배포 check/status가 아직 없어서 운영 반영은 미확인이다.
- 드라이브 간 경로 오류가 났던 `D:\projects\saju-tarot\.claude\worktrees\toolhub-crosslink` 검증 폴더도 보존했다. 자동 승인 검토가 force 삭제를 거절하여 제거하지 않았다.

전체 흐름·백로그·완료 로그는 [IMPROVEMENT-LOOP.md](IMPROVEMENT-LOOP.md).

## 1. 상태
- **2026-10-25 TTS·메뉴 룰렛 검색 표기/모바일 개선 (미배포·미커밋)**: 재생·돌리기를 첫 화면에 배치, 320px 룰렛 넘침 해소, 회전이 끝나지 않는 감속 로직을 4.2초 애니메이션으로 수정. 후보 변경 잠금·결과 초기화, TTS 클립보드 실패·저장값·키보드 재생 처리, 제목·H1·OG 정렬. 브라우저 22/22(실제 한국어 음성 이벤트 포함)·전체 tsc·변경 lint·TTS 유틸·번역 검사 통과. [검증 보고서](../verify/2026-10-25-tts-menu-report.md). 빌드·배포는 미실행. 다음 후보는 색약 테스트이며 아직 착수하지 않음.
- **2026-10-25 택시·택배 검색 표기/모바일 개선 (미배포·미커밋)**: 메타데이터·OG·메뉴 명칭 정리, 44px 입력/버튼·치수 한 줄 입력·결과→입력 이동·배송 제한 안내, 공유 URL hydration 수정. 브라우저 18/18·전체 tsc·변경 파일 lint·계산 회귀·번역 검사 통과. [검증 보고서](../verify/2026-10-25-taxi-shipping-report.md). `npm run build`는 사용자 요청 전 실행하지 않음. 사용자 기존 package.json/lock 및 .claude/.github 변경은 보존.
- **배치 17~34 배포·푸시 완료(2026-10-13)** — 운영 83828c1f, origin b8f07b5. 사용자가 빌드 후 wrangler:deploy 가 업로드 중 끊김(커밋 메모리 한도) → 여유 3GB 확보 뒤 node22 로 업로드만 다시 해서 성공. curl 로 /about/·/terms/·A* 가이드 본문·SW v4.35.0 확인.
- 배치33(SEO 정적 감사): 빌드본 확인 결과 check-static-html 문제 0(팁 상세 noindex 400p 제외), 감사 전후 — 알고리즘 본문 평균 1,240→2,286자, 근접 중복 1,566→105쌍(연봉표 15p만 남음), 얇은 페이지 9→4. 감사 재실행: `node scripts/audit-seo-static.cjs out <json>`(3분). /tips/ HTML 이 582KB(팁 400개 + RSC) — 무거우면 첫 50개만 렌더하고 나머지는 더보기.
- 배치34: /about/·/terms/ 신규, 개인정보처리방침을 실제 저장 항목에 맞춤. 운영 주체(개인/사업자) 이름은 적지 않음 — 사용자가 정하면 terms·about 에 추가.
- `public/sw.js` 캐시 버전은 커밋에서 v4.35.1 로 올림(운영 v4.35.0) — 이 배포에서 옛 API 캐시가 지워진다. 그 뒤 배포 때 다시 올리기. 빌드는 예약 여유 9GB+ 필요 — 이 PC는 다른 프로젝트(octopus-iq-mastra) nuxt dev 2개가 떠 있으면 여유가 0.6~3GB까지 내려가 dev 서버도 메모리 감시에 종료됨.
- 검증 방식: 범위 tsc(변경 파일 tsconfig, 2~3GB 캡) 0, 변경 줄 lint 신규만 확인, i18n audit 0, 저장소 전체 t() 키 누락 검사, dev 서버는 여유 6GB 이상일 때만(메모리 감시 함께, SW 해제 후 확인). 운영 사이트 일괄 자동 로드 금지(CF 분석·AdSense 오염).

## 2. 사용자 결정 대기
- 유가 수집(2026-10-20): GitHub cron 폐기(OPINET 이 해외 IP 에 빈 결과). `/api/fuel-prices` 실시간 조회 성공 시 최근 7일(전국+시도)을 Supabase 에 upsert(12시간 1회) — **배포해야 동작**. 6/1~10/19 공백은 사용자 CSV 로 채움. 7일 넘게 비면 오피넷 지역별 CSV(주유소 3종 + 자동차충전소 자동차부탄 원/ℓ — 용기충전소·용기판매소는 원/kg 이라 다름) → `node scripts/import-fuel-prices.mjs ... > fill.sql` → SQL Editor(빈 칸만 COALESCE). anon 쓰기 정책은 10-20 사용자가 DROP(확인함). 5/1~10/19 는 4종·LPG·전국 00 모두 채움(10-20 확인, 2,985행). 2026-10-20 새 OPINET 키는 국내에서도 빈 결과 — 예전 키 F260324567 유지
- 로또 WebApplication JSON-LD를 metadata.other(meta) → script로 (GuideSectionContent hidden 렌더는 배치33에서 완료)
- 연봉 실수령액 표 15페이지 금액별 고유 정보 추가 여부(#47)

## 3. 다음 후보 (IMPROVEMENT-LOOP.md 백로그)
- #46 2027 공식 수치(건보·장기요양·고용·간이세액표 등) — 고시 나오면 해당 util 한 곳씩
- 10/22 금통위 후 rentConvert.BASE_RATE
- 게임: 솔리테어 키보드(픽셀 드래그 구조라 출발→도착 더미 모델 필요), 오목·오델로·커넥트4 aria-label 영어 하드코딩·결과 안내 영역
- 영어 UI 남은 것: 데이터형 한국어(HttpStatus·PortReference·시각화 설명 등 — 영어 사용자 적어 후순위)
