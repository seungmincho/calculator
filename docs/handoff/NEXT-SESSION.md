# NEXT-SESSION (2026-10-12 — 개선 루프 배치 17~34 인계)

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

전체 흐름·백로그·완료 로그는 [IMPROVEMENT-LOOP.md](IMPROVEMENT-LOOP.md).

## 1. 상태
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
