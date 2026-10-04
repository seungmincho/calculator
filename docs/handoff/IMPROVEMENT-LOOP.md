# 연속 개선 루프 (2026-10-04~)

**최상위 목표: 방문자·사용자 수를 늘리고, 자주 다시 오게 만든다.**
판단 기준은 하나다 — "이 작업이 새 방문을 만들거나(검색·공유), 다시 오게 하거나(신뢰·습관), 이탈을 막는가?"

## 1회 반복 = 1배치

1. **선택** — 아래 백로그에서 가장 위의 미완료 항목. 우선순위 규칙:
   - P0 신뢰: 방문 상위 도구의 틀린 수치·기준(공식 출처로 확인). 틀린 계산은 재방문을 끊는다.
   - P1 시즌 유입: 4~8주 안에 검색이 몰리는 주제(연말정산·수능·최저임금 개정·연말연시).
   - P2 재방문 장치: 홈 개인화, 오늘의 콘텐츠·연속 기록, PWA, 히스토리.
   - P3 유입 확장: 검색량 큰 미보유 도구, 내부 링크·허브, 구조화 데이터.
   - P4 체감 성능: 모바일 LCP·번들.
2. **구현** — 독립 파일 단위로 에이전트 최대 6개 병렬. 공유 파일(menuConfig·sitemap·messages/*.json·page.tsx·sw.js)은 메인만 수정. 에이전트 i18n은 scratchpad `{"ko":{...},"en":{...}}`(네임스페이스로 감싸지 않음) → `python scripts/merge-i18n.py <ns> <file> [--overwrite]` → `npm run messages:generate`.
3. **검증** — `for f in scripts/check-*.ts; do node $f; done` 전부 통과, `npx tsc --noEmit`, `npm run messages:check`, 변경 화면 브라우저 확인(라이트·다크·모바일, 라벨·키보드·aria-live).
4. **커밋** — 배치마다 로컬 커밋. `git add`는 명시 경로만.
5. **기록** — 이 파일의 백로그·완료 로그 갱신. 새로 발견한 문제는 백로그에 추가.
6. **체크포인트 배포** — 3배치마다(또는 큰 수정 직후): SW 버전 bump → build → 빌드본 검증 → deploy → push. 사용량이 언제 끊길지 모르므로 마지막에 몰아서 하지 않는다.

## 가드레일

- 보존: `.claude/agents/`, `.claude/launch.json`, `.omx/`(사용자 파일, untracked) — add·삭제 금지.
- 기존 page `<title>` 유지(검색 유입 보호). 공식 출처로 확인 못 한 수치는 바꾸지 않고 "확인 불가"로 남긴다.
- `welfarePolicy.ts`·정부지원금·청년월세는 2026-10-04 검증 완료 — 새 공식 자료 없이 손대지 않는다.
- **메모리**: 사용자가 원격 작업 중 — 100%가 되면 PC 강제 재부팅(회사 왕복 1시간). 동시 에이전트 4개 안팎, 전체 tsc·next build는 단독 실행(여유 10GB+ 확인), 큰 파일에 넓은 범위 `grep -o` 금지. 감시: scratchpad `memguard.ps1`(여유 3GB 미만이면 grep·tsc·build·playwright만 종료, 로그 memguard.log).
- 전체 lint 일괄 수정 금지. `.env.local`·wrangler.toml 내용 출력 금지. 빌드와 브라우저 검사는 순차.

## 백로그

| # | 우선 | 항목 | 상태 |
|---|------|------|------|
| 1 | P0 | 금융 도구 42개 공식 기준 점검 — 6개 분야 + 최저임금 단일화 | 완료(배치1) |
| 1b | P0 | 생활비 요금 공식 기준(fuel·taxi-fare·shipping·pc-electricity·installment·electricity) | 완료(배치1) |
| 2 | P2 | 홈 "오늘의 퍼즐" 줄(일일 퍼즐 7종 완료 여부·연속 기록) + 날짜 기반 시즌 카드 | 완료(배치1) |
| 3 | P1 | `/year-end-tax` 연말정산 미리보기 모드: 1~9월 카드 사용액 → 연간 추정, 25% 문턱까지 남은 금액, 10~12월 신용/체크 배분, IRP 12/31 마감, 공유 "13월의 월급 +N만원" (10/31까지) | 1번 C1 결과 후 |
| 4 | P1 | 시즌 레일 확장: 마감일 D-day 칩 + "캘린더에 추가"(.ics, 라이브러리 없이) — `/annual-car-tax`·`/year-end-tax`·`/csat-dday` 재사용 (10/20까지) | 2번 후 |
| 5 | P1 | 해외직구 관부가세 계산기 `/customs-duty` 신규 | 완료(배치1) |
| 6 | P1 | 김장 계산기 `/kimjang-calculator` 신규 — 11월 aT 2026 김장비용 발표 시 단가 갱신 | 완료(배치1) |
| 7 | P1 | 2027 최저임금 전용 `/minimum-wage` 신규(위반 여부·월 환산·2026 대비) — 공식 고시액 확인 후 (11/30까지) | 1번 B2 결과 후 |
| 8 | P1 | 연휴·연차 플래너 `/holiday-planner` 신규 | 완료(배치1) |
| 9 | P1 | 건강검진 대상 조회 `/health-checkup` 신규 | 완료(배치1) |
| 10 | P1 | 2027 4대보험 요율 토글 + `/four-insurance` 신규 + `/salary-table?year=2027` — 공식 고시 후 (12/1까지) | 확정 대기 |
| 11 | P1 | `/greeting-generator` 2027 정미년 연말·신년 문구 (12/1까지) | 후보 |
| 12 | P3 | 결정 도구 3종(order-picker·ladder-game·menu-roulette) SSR 복구 | 완료(배치1) |
| 12a | P3 | 큰 Suspense 제거: SalaryCalculator.tsx:1361·HourlyWage.tsx:438·bogeumjari page.tsx:158 (+ MonthlyRentSubsidy·TaxCalculator·time-converter·chess·git-visualizer) — 원인: React 19.2가 12.8KB 넘는 완료 Suspense 경계를 `</main>` 뒤 숨김 영역으로 빼냄. 7개 Suspense 제거(+HourlyWage useState URL 읽기 → effect) | 완료(배치2) |
| 12k | P3 | 정적 HTML에 h1 없는 페이지: /games(허브)·/pomodoro·/svg-editor·/calculation-history (tips/[id] 400개는 의도적 noindex). 점검 스크립트: `node scripts/check-static-html.cjs out` — 배포 전마다 돌릴 것 | 후보 |
| 12l | — | /cs-hub 번역 키 노출(tools.algorithm.cta·tools.visualizer.cta·tools.quiz.cta — 분할 전부터) | 후보 |
| 12b | P3 | 보이는 FAQ 공용 서버 컴포넌트 `ToolFaq.tsx`(JSON-LD + `<details>`) → 39개 page.tsx 교체, JSON-LD url 끝 슬래시 통일(35개 불일치) | 1번 병합 후 |
| 12c | P3 | sitemap lastmod `updatedDate?`, RSS·_redirects를 menuConfig에서 생성(누락 /running-pace 복구), RSS 최신순·description | 완료(배치1) |
| 12d | P3 | 사실 오류: bonus FAQ 연금 상한 590만원(→ INSURANCE 참조), omok FAQ 15×15(실제 19×19), menu-roulette FAQ 프리셋 불일치, salary featureList "산재보험"(계산 안 함), salary-rank 2024 귀속 데이터 확인 | 1번 병합 후 |
| 12e | P2 | ShareResult 추가: bogeumjari·work-hours·fuel·grade·gpa-calculator·bonus·installment·lunar·shipping·pc-electricity·menu-picker / 자체 공유(taxi-fare·gpa-converter·DecisionTools·LadderGame) 통일 | 1번 병합 후 |
| 12f | P3 | 내부 링크: bogeumjari·salary-rank·omok에 RelatedTools, bogeumjari 본문→dsr·취득세·복비·상환표·전세대출, RelatedTools 교차 카테고리 무작위 추천 개선 | 후보 |
| 12g | P3 | description 80자 미만 10개 보강(number-to-korean·order-picker·ladder·fuel·keyboard·work-hours·gpa-calculator·installment·crossword·lunar), 얇은 본문(omok·ladder·crossword·salary-rank·menu-picker·bonus) | 후보 |
| 12h | — | (사용자) 네이버 서치어드바이저 sitemap.xml·rss.xml 제출 | 사용자 액션 |
| 13 | P4 | **번역 legacy 청크 2.3MB(전송 681KB)** 가 도구 페이지 대부분의 초기 로드에 포함 → 느린 4G에서 9~11초 조작 불가. `generate-scoped-messages.mjs`로 전 네임스페이스 생성 + `src/lib/i18n.ts` import 330곳을 네임스페이스 모듈로 codemod — 레지스트리 방식(`registerMessages` + 네임스페이스별 side-effect import). 검증: 정적 HTML 358페이지 키 노출 증가 0, 브라우저 30페이지 hydration 후 노출 0. 초기 JS(gzip) 숫자한글 254KB·택시 257KB | 완료(배치3) |
| 13a | P4 | 완료: Link prefetch 끄기(ToolsShowcase·RelatedTools·Footer·DecisionToolsBar·ladder page — 스크롤 시 최대 2.8MB 비압축 HTML), `public/_headers` `/_next/static/*` immutable, 모든 페이지의 supabase-js 제거(toolAnalytics → fetch) | 완료(배치1) |
| 13b | P4 | AdSense·Axeptio를 lazyOnload로(TBT 1~1.5초) — 광고 수익·동의 요건 판단 필요 | 사용자 결정 |
| 13c | P4 | Pretendard 웹폰트 385KB(woff2 16개, jsdelivr): 모바일 시스템 폰트 or 자체 호스팅 | 사용자 결정(디자인) |
| 13d | P4 | SW 설치 시 HTML 10개 선캐시 축소·idle 이후로, en/shared.json 정적 import 지연 로드 | 후보 |
| 12i | P3 | `DecisionToolClient.tsx`(/roulette 외 팀나누기·제비뽑기·동전 등 8개) ssr:false → dynamic(SSR+코드분할)으로, DecisionToolPage sr-only h1 중복 제거 | 완료(배치2) |
| 12j | — | 사다리 공유 링크 버그: seed 복원 effect(LadderGame.tsx:791)가 participants·complexity 반영 전 기본값(3명·3)으로 생성 → buildLadderLines(seed,count,complexity)로 URL 값 직접 사용, 기록 불러오기 같은 버그도 수정 | 완료(배치2) |
| 19 | P0 | `/monthly-rent-subsidy` 계산 로직 공식 근거 없음("LH 월세지원금" 모델·지원율 20~40%·신혼 25만원 등) → 사용자 결정으로 `/youth-rent-subsidy` 301 통합(movedRoutes), 페이지·컴포넌트·메뉴·OG 삭제, i18n `rentSubsidy`·footer/toolsShowcase 키는 미사용으로 남김 | 완료(배치2) |
| 20 | P0 | 2027-01-01 전: YouthRentSubsidyCalculator `MEDIAN_INCOME_2026`·government-subsidy page 중위소득 → `utils/medianIncome.ts`(2027 고시 제2026-157호 포함) 참조로 | 12월 |
| 21 | P1 | 법 개정 예정 반영: 근기법 제54조 휴게 생략(2026.12.10~), 고용보험 가입 소득기준 전환(2027.1.1~, weeklyHolidayPay·hourly-wage "월 60시간 미만" 문구), 시간단위 연차(2027.6.10~), 2028 이직자 기초일액 1년 보수 | 시행 전 |
| 25 | P0 | 자녀세액공제 대상 2026~29 귀속 "2016년 이전 출생"(2026.4.21 개정, 2030~ 13세 이상) — netSalary `annualTaxEstimate`·간이세액표 자녀 집계(8~20세) 확인·정정 — netSalary가 yearEndTax childCredit 사용(결과 불변). 남은 것: 급여 계산기 '8~20세 자녀' 입력 하나가 간이세액표·연간 추정 겸용이라 2017~18년생 자녀는 연간 추정 과대(참고값) | 부분 완료(배치2) |
| 26 | P1 | 연말정산 시즌: /year-end-tax "2026 귀속 달라진 점 + 2027 개정안" 카드, 12/31 연금저축·IRP·카드 마감 D-day, 1/15 간소화 카운트다운, 공유 이미지 — 미리보기 모드(?mode=preview)·Q4 체크카드 전략·IRP 채우기 | 완료(배치2) |
| 27 | P1 | 자동차 취등록세: 전기차 감면 2026.12.31 종료 D-day·인기 차종 프리셋 / 종부세 11월 고지 시즌 고지서 대조·일시적 2주택 처분기한 D-day | 11월 전 |
| 28 | — | CarTaxCalculator·보금자리론 페이지 하드코딩 한국어·glass·light/dark 쌍 → i18n·토큰 / 양도세 일시적 2주택 계약일 입력(8.3 이전 계약 판정) / 로또 수령처(2등 지점) 확인 / 보금자리 전세사기피해자 조건·신용점수 LTV 차감 | 후보 |
| 29 | P2 | 보금자리론 매월 1일 금리 갱신 예약 작업 + "지난달 대비" 배지, 시군구→규제지역 자동, ShareResult, 디딤돌 비교·DSR 연결 | 후보 |
| 22 | — | CAGR 프리셋 수치(코스피 10년 3.5% 등) 출처 불명·낡음 → 수치 라벨 제거 | 후보 |
| 23 | — | 미사용 옛 i18n 키 정리(parentalLeave.guide·reducedHours·hourlyWage.minimumWage·healthInsurance regional/guide·nationalPension aValueDesc 등 — 옛 수치 포함), PensionCalculator glass 스타일·하드코딩 문구 | 후순위 |
| 24 | P3 | /pension-calculator vs /national-pension 키워드 잠식 → 간이→상세 딥링크·역할 구분 | 후보 |
| 14 | P2 | `ShareResult`에 카카오톡 공유 추가 — 카카오 앱 키·도메인 등록 필요(사용자 액션) | 사용자 확인 필요 |
| 15 | P2 | 웹 푸시: `PushNotificationManager`는 붙어 있으나 `.env.local`에 VAPID·워커 URL 없음 → 운영도 비어 있으면 죽은 코드. 구현 또는 제거 | 사용자 확인 필요 |
| 16 | P1 | 12월 이후: 근로장려금 금액 계산기 `/eitc`, "2027 달라지는 것" 허브, 아동수당 2027, 실업급여 2027, 자동차세 1월 연납 배너, 에너지바우처, 정미년 운세 카드 | 12월 |
| 17 | P3 | 경쟁사 대비 롱테일 공백: 일용직 급여, 1RM, 임대수익률, 구독료 합계 | 여유 시 |
| 18 | — | 기존 lint 오류(539) 범위 정해 점진 정리 | 후순위 |

조사 근거(2026-10-04 시즌 수요 조사): 2027 수치(최저임금 10,700원·국민연금 10%·건보 7.19% 동결·고용보험 1.0%)는 2차 출처 기준 — 반영 전 공식 고시 확인.

## 완료 로그

(배치 끝날 때마다 한 줄: 날짜 · 커밋 · 요약)

- 2026-10-04 배치1 · 금융·생활비 48개 도구 공식 기준 점검(국민연금 계산기 10배 과대, 택시 15개 시·도 요금, 자동차 취등록세 등록세 이중부과, 실업급여 하한>상한, 보금자리 수도권 LTV 등) + 신규 4종(관부가세·김장·연휴 플래너·건강검진) + 홈 오늘의 퍼즐·시즌 카드 + 결정 도구 SSR + 성능 소규모(prefetch·_headers·supabase-js 제거) + RSS/sitemap. 검증: check 147개·tsc 0·messages:check. 배포 11bb5f43 (SW v4.32.0, 빌드 워커 cpus:4 — 기본 19개면 메모리 감시가 빌드 종료)
- 2026-10-04 배치2 · Suspense 7곳 제거(React 19.2 12.8KB 경계 숨김 — 연봉·시급·보금자리·세금 등), 결정 도구 9종 SSR, 사다리 공유 버그, 연말정산 미리보기, 월세지원금→청년월세 301, CLAUDE.md 템플릿 Suspense 제거, scripts/check-static-html.cjs. 검증: check 147·tsc 0·브라우저(연말정산·연봉/시급 공유·동전·5명 사다리) 배포 713f6873 (SW v4.32.1). 빌드: 사전 tsc 통과 후 SKIP_BUILD_TYPECHECK=1 (빌드 중 타입검사 ~5GB로 감시가 종료시킴)
- 2026-10-04 배치3 · 번역 레지스트리 분할(legacy 2.3MB 제거, 345파일 ns import, scripts/i18n-namespaces.cjs --apply/--audit, CLAUDE.md 템플릿·체크리스트). 검증: messages:check·tsc 0·check 147·정적 키 노출 diff 0·브라우저 30페이지
