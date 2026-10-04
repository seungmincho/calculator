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
- **빌드 방식(2026-10-04 밤~)**: 사용자가 PC로 다른 앱(ChatGPT·Mattermost·Chrome)을 쓰면 빌드 컴파일이 메모리 감시에 걸림 → 커밋된 상태를 별도 worktree `C:/projects/toolhub-build`(node_modules는 junction)에서 빌드. scratchpad `gated-build.sh`가 예약 여유 9GB+·실메모리 7GB+일 때만 빌드 시작. 빌드본은 worktree의 `out/`에서 배포.
- 전체 lint 일괄 수정 금지. `.env.local`·wrangler.toml 내용 출력 금지. 빌드와 브라우저 검사는 순차.

## 백로그

| # | 우선 | 항목 | 상태 |
|---|------|------|------|
| 1 | P0 | 금융 도구 42개 공식 기준 점검 — 6개 분야 + 최저임금 단일화 | 완료(배치1) |
| 1b | P0 | 생활비 요금 공식 기준(fuel·taxi-fare·shipping·pc-electricity·installment·electricity) | 완료(배치1) |
| 2 | P2 | 홈 "오늘의 퍼즐" 줄(일일 퍼즐 7종 완료 여부·연속 기록) + 날짜 기반 시즌 카드 | 완료(배치1) |
| 3 | P1 | `/year-end-tax` 연말정산 미리보기 모드: 1~9월 카드 사용액 → 연간 추정, 25% 문턱까지 남은 금액, 10~12월 신용/체크 배분, IRP 12/31 마감, 공유 "13월의 월급 +N만원" (10/31까지) | 완료(배치2, #26 미리보기 모드로 대체) |
| 4 | P1 | 시즌 레일 확장: 마감일 D-day 칩 + "캘린더에 추가"(.ics, 라이브러리 없이) — `/annual-car-tax`·`/year-end-tax`·`/csat-dday` 재사용 (10/20까지) | 완료(배치8): 홈 "다가오는 일정"(seasonalPicks.upcomingDeadlines, 카드+줄 3개까지) + AddToCalendar(.ics, 메모에 도구 링크) — 연말정산·자동차세 연납·종부세·수능 대입 일정 |
| 5 | P1 | 해외직구 관부가세 계산기 `/customs-duty` 신규 | 완료(배치1) |
| 6 | P1 | 김장 계산기 `/kimjang-calculator` 신규 — 11월 aT 2026 김장비용 발표 시 단가 갱신 | 완료(배치1) |
| 7 | P1 | 2027 최저임금 전용 `/minimum-wage` 신규 | 완료(배치4) |
| 8 | P1 | 연휴·연차 플래너 `/holiday-planner` 신규 | 완료(배치1) |
| 9 | P1 | 건강검진 대상 조회 `/health-checkup` 신규 | 완료(배치1) |
| 10 | P1 | 2027 4대보험 요율 토글 + `/four-insurance` 신규 + `/salary-table?year=2027` — 공식 고시 후 (12/1까지) | 확정 대기 |
| 11 | P1 | `/greeting-generator` 크리스마스·송년회 건배사·수능 응원 + 정미년, 시즌 기본값 | 완료(배치5) |
| 12 | P3 | 결정 도구 3종(order-picker·ladder-game·menu-roulette) SSR 복구 | 완료(배치1) |
| 12a | P3 | 큰 Suspense 제거: SalaryCalculator.tsx:1361·HourlyWage.tsx:438·bogeumjari page.tsx:158 (+ MonthlyRentSubsidy·TaxCalculator·time-converter·chess·git-visualizer) — 원인: React 19.2가 12.8KB 넘는 완료 Suspense 경계를 `</main>` 뒤 숨김 영역으로 빼냄. 7개 Suspense 제거(+HourlyWage useState URL 읽기 → effect) | 완료(배치2) |
| 12k | P3 | 정적 HTML에 h1 없는 페이지: /games(허브)·/pomodoro·/svg-editor·/calculation-history — games=GameHub ssr:false(닉네임 localStorage는 effect), pomodoro·history=컴포넌트에 h1 있으나 마운트 전 조기 return 추정 (tips/[id] 400개는 의도적 noindex). 점검 스크립트: `node scripts/check-static-html.cjs out` — 배포 전마다 돌릴 것 | 완료(배치4) |
| 12l | — | /cs-hub 번역 키 노출(tools.algorithm.cta·tools.visualizer.cta·tools.quiz.cta — 분할 전부터) | 완료(배치4) |
| 12b | P3 | ToolFaq(보이는 FAQ+JSON-LD)/FaqJsonLd — 상위 39페이지, JSON-LD url 슬래시 35개 | 완료(배치5) |
| 12c | P3 | sitemap lastmod `updatedDate?`, RSS·_redirects를 menuConfig에서 생성(누락 /running-pace 복구), RSS 최신순·description | 완료(배치1) |
| 12d | P3 | 사실 오류: bonus FAQ 연금 상한 590만원(→ INSURANCE 참조), omok FAQ 15×15(실제 19×19), menu-roulette FAQ 프리셋 불일치, salary featureList "산재보험"(계산 안 함), salary-rank 2024 귀속 데이터 확인 | 완료(배치8): 앞 4개는 배치5에서 정정, salary-rank는 공공데이터포털 국세청 근로소득 천분위(2024 귀속, data.go.kr/data/15082063) 구간 평균→경계 보간 추정치로 교체(SalaryCalculator 공유). 연령·성별·업종 표는 여전히 비공식 '추정' |
| 12e | P2 | ShareResult 추가: bogeumjari·work-hours·fuel·grade·gpa-calculator·bonus·installment·lunar·shipping·pc-electricity·menu-picker (+cs-hub 키), 보금자리 디딤돌 비교·다음 단계 링크, ShareResult 44px·복사 실패 처리 | 완료(배치4) |
| 12f | P3 | RelatedTools 큐레이션(src/config/relatedTools.ts 67도구 344링크, 무작위 제거) + bogeumjari·salary-rank·omok RelatedTools | 완료(배치5) |
| 12g | P3 | description 10개 보강, 얇은 본문 5개(omok·crossword·menu-picker·salary-rank·ladder) + 실제 동작과 다른 서술 정정 | 완료(배치5) |
| 12h | — | (사용자) 네이버 서치어드바이저 sitemap.xml·rss.xml 제출 | 사용자 액션 |
| 13 | P4 | **번역 legacy 청크 2.3MB(전송 681KB)** 가 도구 페이지 대부분의 초기 로드에 포함 → 느린 4G에서 9~11초 조작 불가. `generate-scoped-messages.mjs`로 전 네임스페이스 생성 + `src/lib/i18n.ts` import 330곳을 네임스페이스 모듈로 codemod — 레지스트리 방식(`registerMessages` + 네임스페이스별 side-effect import). 검증: 정적 HTML 358페이지 키 노출 증가 0, 브라우저 30페이지 hydration 후 노출 0. 초기 JS(gzip) 숫자한글 254KB·택시 257KB | 완료(배치3) |
| 13a | P4 | 완료: Link prefetch 끄기(ToolsShowcase·RelatedTools·Footer·DecisionToolsBar·ladder page — 스크롤 시 최대 2.8MB 비압축 HTML), `public/_headers` `/_next/static/*` immutable, 모든 페이지의 supabase-js 제거(toolAnalytics → fetch) | 완료(배치1) |
| 13b | P4 | AdSense·Axeptio를 lazyOnload로(TBT 1~1.5초) — 사용자 결정(2026-10-04): 그대로 유지 | 종료 |
| 13c | P4 | Pretendard 웹폰트 385KB(woff2 16개, jsdelivr): 사용자 결정(2026-10-04): 그대로 유지 | 종료 |
| 13d | P4 | en/shared.json 지연 로드(navigation.ts, 영어 선택 시만) — 완료(배치4). SW 설치 선캐시에서 도구 HTML 8개 제외 — 완료(배치9) | 완료 |
| 12i | P3 | `DecisionToolClient.tsx`(/roulette 외 팀나누기·제비뽑기·동전 등 8개) ssr:false → dynamic(SSR+코드분할)으로, DecisionToolPage sr-only h1 중복 제거 | 완료(배치2) |
| 12j | — | 사다리 공유 링크 버그: seed 복원 effect(LadderGame.tsx:791)가 participants·complexity 반영 전 기본값(3명·3)으로 생성 → buildLadderLines(seed,count,complexity)로 URL 값 직접 사용, 기록 불러오기 같은 버그도 수정 | 완료(배치2) |
| 19 | P0 | `/monthly-rent-subsidy` 계산 로직 공식 근거 없음("LH 월세지원금" 모델·지원율 20~40%·신혼 25만원 등) → 사용자 결정으로 `/youth-rent-subsidy` 301 통합(movedRoutes), 페이지·컴포넌트·메뉴·OG 삭제, i18n `rentSubsidy`·footer/toolsShowcase 키는 미사용으로 남김 | 완료(배치2) |
| 20 | P0 | 2027-01-01 전: YouthRentSubsidyCalculator `MEDIAN_INCOME_2026`·government-subsidy page 중위소득 → `utils/medianIncome.ts`(2027 고시 제2026-157호 포함) 참조로 | 12월 |
| 21 | P1 | 법 개정 예정 반영: 근기법 제54조 휴게 생략(2026.12.10~), 고용보험 가입 소득기준 전환(2027.1.1~, weeklyHolidayPay·hourly-wage "월 60시간 미만" 문구), 시간단위 연차(2027.6.10~), 2028 이직자 기초일액 1년 보수 | 시행 전 |
| 25 | P0 | 자녀세액공제 대상 2026~29 귀속 "2016년 이전 출생"(2026.4.21 개정, 2030~ 13세 이상) — netSalary `annualTaxEstimate`·간이세액표 자녀 집계(8~20세) 확인·정정 — netSalary가 yearEndTax childCredit 사용(결과 불변). 남은 것: 급여 계산기 '8~20세 자녀' 입력 하나가 간이세액표·연간 추정 겸용이라 2017~18년생 자녀는 연간 추정 과대(참고값) | 부분 완료(배치2) |
| 26 | P1 | 연말정산 시즌: /year-end-tax "2026 귀속 달라진 점 + 2027 개정안" 카드, 12/31 연금저축·IRP·카드 마감 D-day, 1/15 간소화 카운트다운, 공유 이미지 — 미리보기 모드(?mode=preview)·Q4 체크카드 전략·IRP 채우기 | 완료(배치2) |
| 27 | P1 | 자동차 취등록세 재작성(i18n·토큰·전기차 감면 D-day·예시 프리셋·공유, 가격 복원 버그) + 연납 KST D-day / 종부세 고지서 대조·납부기한·분납·일시적 2주택 | 완료(배치6) |
| 28 | — | 보금자리론 토큰·i18n + 전세사기피해자(9억·소득 무관·LTV 80·DTI 100·4억)·신용점수(271점 미만 불가, 271~614 LTV −10%p) hf.go.kr 확인 반영, h1 'LH' 삭제 / 양도세 일시적 2주택 계약일 입력(8.3까지 계약·계약금 → 3년, 시행령 제155조 대통령령 제36737호) / 로또 수령처 | 완료(배치8·9). 남은 것: 보금자리 util 문구(PERKS·체크 라벨) 영어 UI에서 한국어, 신용점수 차감의 생애최초 적용 여부·소득추정 −10%p·낙찰주택 100% 미검증 |
| 29 | P2 | 보금자리론 매월 1일 금리 갱신 예약 작업 + "지난달 대비" 배지, 시군구→규제지역 자동, ShareResult, 디딤돌 비교·DSR 연결 | 후보 |
| 22 | — | CAGR 프리셋 수치(코스피 10년 3.5% 등) 출처 불명·낡음 → 수치 라벨 제거 | 완료(배치8): 칩은 '연 2·3.5·5·7·10%' 예시만, page FAQ·description의 자산별 수익률 주장 삭제 |
| 23 | — | 미사용 옛 i18n 키 정리(parentalLeave.guide·reducedHours·hourlyWage.minimumWage·healthInsurance regional/guide·nationalPension aValueDesc 등 — 옛 수치 포함), PensionCalculator glass 스타일·하드코딩 문구 | 후순위 |
| 24 | P3 | /pension-calculator vs /national-pension 키워드 잠식 → 간이→상세 딥링크·역할 구분 | 완료(배치8): pension-calculator = 간이+월 보험료(토큰·i18n·ShareResult·가이드 정적 HTML), ?b&s&y&i 딥링크·역링크, nationalPension.ageInput(1988 이전 가입 연수 과대 수정). 남은 것: 딥링크 착지 시 hydration 경고 1건(useSearchParams 설계상 허용) |
| 14 | P2 | `ShareResult`에 카카오톡 공유 추가 — 카카오 앱 키·도메인 등록 필요(사용자 액션) | 사용자 확인 필요 |
| 15 | P2 | 웹 푸시: `PushNotificationManager`는 붙어 있으나 `.env.local`에 VAPID·워커 URL 없음 → 운영도 비어 있으면 죽은 코드. 구현 또는 제거 | 사용자 확인 필요 |
| 16 | P1 | 12월 이후: 근로장려금 금액 계산기 `/eitc`, "2027 달라지는 것" 허브, 아동수당 2027, 실업급여 2027, 자동차세 1월 연납 배너, 에너지바우처, 정미년 운세 카드 | 12월 |
| 17 | P3 | 경쟁사 대비 롱테일 공백: 일용직 급여, 1RM, 임대수익률, 구독료 합계 | 여유 시 |
| 30 | P1 | 신규: /daily-wage-tax·/rental-yield·/one-rep-max (구독료 합계는 보류) | 완료(배치7) |
| 31 | P1 | 법 개정 반영 — 근기법 제54조 휴게 생략(2026.12.10~): work-hours 휴게 경고·문구 / 고용보험 소득기준 전환(2027.1.1~): weekly-holiday-pay·hourly-wage "월 60시간 미만" 문구 + 시간단위 연차(2027.6.10) 예고, 연차 조항 번호를 개정 전후 모두 맞게 | 완료(배치7) |
| 32 | P0 | 2028-01-01 이후 이직자부터 구직급여 기초일액이 보수일액으로(고용보험법 제45조①, 부칙 제3조) → unemploymentBenefit.ts 개편 | 2027 하반기 |
| 33 | — | 게임 마무리: GameResultShare 닫기 버튼 aria-label·포커스 트랩, AI 대전 공유 제목이 '온라인 오목', Battleship 함선 이름 영어 | 완료(배치8): 다이얼로그 role·포커스 트랩·ESC·포커스 복귀, AI 공유 제목 "오목 AI 대전", 함선 이름 i18n, 죽은 `t()||'literal'` 폴백 제거. 남은 것: Battleship.tsx·ChessAI.tsx dark: 쌍 |
| 18 | — | 기존 lint 오류(539) 범위 정해 점진 정리 | 후순위 |
| 34 | — | 죽은 i18n 키(렌더링 안 되지만 틀린 옛 문구, 번들에 포함): pensionCalculator·salaryRank guide.guide/whatIs/howToUse/faq, hourlyWage.minimumWage(9,860원)·guide.*, weeklyHolidayPay.guide.*, unemploymentBenefit.guide.howToApply(워크넷), shippingCalc.guide.guide·volumeWeight*, pcElectricity·installmentCalc guide.{whatIs,howToUse,faq}, waterBill.avgInfo·guide.structure, gasBill.averageUsage·seasons·tierBreakdown, fuelCalculator.guide.usage·vehicleTypes, gpaConverterCalc.guide.howToUse·tips[0]·grades, gpaCalculator.guide.whatIs·faq[1], pyeongCalculator.guide.howToUse[2], lunarConverter.guide.faq — merge 스크립트 서식이 json.dumps와 달라 일괄 재작성 금지, 문자열 치환식 키 삭제 도구 필요 | 후보 |
| 38 | — | 감사 후속: 남은 것 — 외국인등록번호 2020.10 개편 적용 여부(검색으로 미확인), 할부 rateHint·쿠팡/11번가 수수료 범위·스마트스토어 COMMISSION_DATA(카테고리 차등 아님, 2025.10 인하, 배송비 주문관리수수료 미반영 — 판매자센터 기준 재작성 필요), 카카오T 블루 호출료, 고향사랑 특별재난 토글, workHours.legalMinBreak 4h~4h29 경계, 주차 PRESETS.seoul1(노상 500원), 차량정비 transmissionFluid 일반조건 10만km, 국방 시행령 제27조 인용, rentConvert.BASE_RATE 10월 금통위 후 갱신, 색각 viewDesc 'Viénot' 명칭. 완료: 실업급여 5배 문구(공모 시), 평수 전용률 노트, IP 문서용 대역 reserved, 소주 칼로리 315 | 일부 완료(배치14) |
| 39 | — | 감사 후속2: 종합소득세 계산기 2025 귀속 고정 → 2026 귀속 롤포워드(자녀세액공제 출생연도 기준 등), Gemini 3.8 Flash 프로모 가격 2026-12-31 종료(2027-01-01 2배 — llmPricing.ts 갱신), 평균 계산기 분산=모분산 표기·공백 구분 입력, 버팀목 병역 기간 입력(현재 sme만으로 39세), 판매수수료 11번가 카테고리 요율·쿠팡 배송비 3%·VAT 별도 여부 공식 확인 | 후보 |
| 35 | — | Battleship.tsx·ChessAI.tsx dark: 색 쌍 → 토큰 | 완료(배치9, 상태색 red·amber·green만 남김) |
| 36 | P0 | 종부세 일시적 2주택도 계약일 경과조치 — propertyHoldingTax.tempDeadlines(newAcq, bothAdjusted, contract?) + ComprehensivePropertyTax 입력 (2027.6.1 과세기준일분부터, 양도세 tempRule 재사용) | 완료(배치10): ?nc= 계약일, 종부세·양도세 8.3·취득세 8.26 |
| 37 | P1 | 연말정산 시즌 롱테일 랜딩 추가 후보: 의료비 세액공제·월세 세액공제·연금저축 세액공제(yearEndTax 함수 재사용, /card-deduction 방식) | 완료(배치11, 사용자 기획 승인): /medical-tax-credit·/rent-tax-credit·/pension-tax-credit + 연말정산 허브(섹션별 딥링크·항목별 카드), yearEndTax.itemTaxSaving. 남은 것: 월세 배우자 별도 세대 합산(2026~) 계산 미반영(안내만), 연말 연금 납입 마감 시각(금융사별) 미확정 |

조사 근거(2026-10-04 시즌 수요 조사): 2027 수치(최저임금 10,700원·국민연금 10%·건보 7.19% 동결·고용보험 1.0%)는 2차 출처 기준 — 반영 전 공식 고시 확인.

## 완료 로그

(배치 끝날 때마다 한 줄: 날짜 · 커밋 · 요약)

- 2026-10-04 배치1 · 금융·생활비 48개 도구 공식 기준 점검(국민연금 계산기 10배 과대, 택시 15개 시·도 요금, 자동차 취등록세 등록세 이중부과, 실업급여 하한>상한, 보금자리 수도권 LTV 등) + 신규 4종(관부가세·김장·연휴 플래너·건강검진) + 홈 오늘의 퍼즐·시즌 카드 + 결정 도구 SSR + 성능 소규모(prefetch·_headers·supabase-js 제거) + RSS/sitemap. 검증: check 147개·tsc 0·messages:check. 배포 11bb5f43 (SW v4.32.0, 빌드 워커 cpus:4 — 기본 19개면 메모리 감시가 빌드 종료)
- 2026-10-04 배치2 · Suspense 7곳 제거(React 19.2 12.8KB 경계 숨김 — 연봉·시급·보금자리·세금 등), 결정 도구 9종 SSR, 사다리 공유 버그, 연말정산 미리보기, 월세지원금→청년월세 301, CLAUDE.md 템플릿 Suspense 제거, scripts/check-static-html.cjs. 검증: check 147·tsc 0·브라우저(연말정산·연봉/시급 공유·동전·5명 사다리) 배포 713f6873 (SW v4.32.1). 빌드: 사전 tsc 통과 후 SKIP_BUILD_TYPECHECK=1 (빌드 중 타입검사 ~5GB로 감시가 종료시킴)
- 2026-10-04 배치3 · 번역 레지스트리 분할(legacy 2.3MB 제거, 345파일 ns import, scripts/i18n-namespaces.cjs --apply/--audit, CLAUDE.md 템플릿·체크리스트). 검증: messages:check·tsc 0·check 147·정적 키 노출 diff 0·브라우저 30페이지. 배포 c3989d24 (SW v4.32.2). 운영 초기 JS 전송: 숫자한글 257KB·택시 260KB(이전 1p JS 957KB·958KB)
- 2026-10-04 배치4 · 공유 11종(보금자리·성과급·할부·근무시간·유류비·택배·PC전기·성적·학점·음력·메뉴), /minimum-wage 신규, 음력 변환기 첫 렌더 결정적, h1 4페이지, useGameAchievements 마운트 후 로드, en/shared 지연, ShareResult 44px·복사 폴백, cs-hub 키. 검증: check 148·tsc 0·audit 0
- 2026-10-04 배치5 (a3cb5c0, 푸시됨, 배포 보류 — 사용자: 빌드는 나중에, 개선 먼저) · 상위 39페이지 보이는 FAQ·JSON-LD url·설명·본문, RelatedTools 큐레이션, 인사말 시즌(크리스마스·건배사·수능·정미년), 셔플 편향 수정(순서뽑기·사다리·가위바위보 → Fisher–Yates). 검증: check 149·tsc 0·audit 0
- 2026-10-04 배치6 · 보드게임 7종(토큰·한 번에 시작·내 기록/연승·다시하기/난이도 올리기·?d= 공유), 자동차 취등록세 재작성·전기차 감면 D-day·연납 D-day, 종부세 고지서 대조·납부 일정·일시적 2주택. 검증: check 149·tsc 0·audit 0. 배포 보류
- 2026-10-04 배치7 (96d0528) · 노동법 개정 반영(휴게 2026.12.10·고용보험 소득기준 2027.1.1·시간단위 연차 2027.6.10, 날짜별 안내), 신규 /daily-wage-tax·/rental-yield·/one-rep-max. 검증: check 152·tsc 0·audit 0. 배포 보류(배치5~7 누적) → NEXT-SESSION.md
- 2026-10-04 배치8 · 홈 "다가오는 일정"(마감 D-day + .ics 캘린더 추가, 도구 링크·알림) + 연말정산·자동차세 연납·종부세·수능 대입 일정 캘린더 버튼, salary-rank/연봉 계산기 백분위 2024 귀속 공식 자료, 국민연금 2종 역할 분리·딥링크, 게임 공유 다이얼로그 접근성·AI 공유 제목·함선 이름, 로또 수령처 정정, CAGR 출처 없는 수익률 제거. 검증: check 152·salary/net mjs·범위 tsc(변경 29파일) 0·audit 0. 브라우저 확인·배포는 배치5~8 함께(메모리 여유 부족, 사용자: 개선 먼저)
- 2026-10-04 배치9 · 신규 /card-deduction(사용자 기획 승인: 25% 문턱·한도·10~12월 신용→체크 전략·연말정산 딥링크·캘린더, yearEndTax.cardTaxSaving), 보금자리론 전세사기피해자·신용점수 규칙(hf.go.kr 원문 확인)·토큰·i18n·h1, 양도세 8.3 계약 경과조치 입력, 게임 2종 토큰, SW 선캐시 축소, 연말정산 showcase 설명 2026 귀속. 검증: check 152·범위 tsc(20파일) 0·audit 0. 배포는 5~9 함께
- 2026-10-04 배치10 · 종부세 일시적 2주택 계약일 경과조치(입력·check 4건), 연말정산 계산기 → /card-deduction 입력값 그대로 넘기는 링크. 검증: property-holding check·범위 tsc 0·audit 0
- 2026-10-05 배치11 · 연말정산 세액공제 랜딩 3종(법령 원문·국세청 상담 확인, 사례·FAQ 수치 전부 check 스크립트로 고정: 의료비 맞벌이 8가지 배분 비교·실손 차감, 월세 연도별 규칙 2021~2026·경정청구 기한 3/10+5년·현금영수증 비교, 연금 ISA 전환 §59의3③④·해지 시 16.5%·연금소득세) + 연말정산 계산기 허브화. 검증: check 155·범위 tsc(20파일) 0·audit 0. 작업 중 다른 프로젝트 tsc·nuxt로 예약 여유 0.3GB까지 떨어짐(우리 작업 아님)
- 2026-10-05 배치12 · 연말정산 사실 점검: 다른 페이지·번역의 옛 수치(월세 750만·7천만, 자녀공제 등) 없음 확인. 연봉 계산기(최상위 트래픽) 연말정산 가이드 정정 — '학원비·교재비 포함'(틀림 → 취학 전·초등 1·2학년 예체능(2026~)·교복·체험학습비), 의료비 제외 항목, 일정(1/15 간소화·3/10 신고), '연금저축으로 실수령액 증가'(→ 연말정산 환급) + 항목별 계산기 링크·토큰. 홈 '연금저축·IRP 마감' 줄 → /pension-tax-credit. 검증: 범위 tsc 0·audit 0
- 2026-10-05 배치13 · 상위 도구 화면 문구 정확도 감사 20종(급여·노동 6, 생활비 7, 기타 7 — 시급 실수령 비율·휴일 8시간 초과 100%·성과급 4대보험·퇴직금 IRP 과세이연·실업급여 240/270일·연차 소멸, 택배 해외요금(2026 EMS 표)·할부 부분무이자 구조·유류비 내보내기/연비 과장·택시 지역 기본요금·모범택시 심야할증·수도 절수, 주민번호 법 조항(개인정보보호법 24조의2)·도장 효력·학점 커트라인 근거 없음·키보드 예시 역전·음력 회귀년) + 시급 '평균 연봉' 4,200만(2022)→salaryInsights 2024 귀속 4,475만 단일 출처 + 숫자 한글 '일' 생략 규칙 + 신규 /hometown-donation(사용자 기획 승인, 조특법 §58 2026 40% 구간 원문 확인·10만 29,999원 이득·손익분기 207,475원) + 홈 12/31 고향사랑 마감 줄. 검증: check 156·범위 tsc 0·audit 0
- 2026-10-05 배치14 · 클릭 31~70위 중 30종 화면 문구 감사(돈·법 10: 주차 노상/노외, 판매수수료 표·네이버 수수료 개편, 전역 병장 시점, 전월세 전환 한도 범위(갱신·계약 중만)·월세/전세 유불리 역전, 부가세 미가공·간이과세 기준 / 건강·과학 10: 음주 '운전해도 된다'로 읽히는 문구 제거·처벌 조항, 색각 한국 통계 5.9%, 기간 계산 민법 161조, 타자 홈포지션, 속도 감면 기준 / 텍스트·개발 10: 깋 코드포인트, EU 서머타임 '폐지' 오류, 화씨 국가, 특수문자 스타일 수, TTS 온라인 음성 전송, 랜덤 시드 공정성 조건, 진법 없는 기능) + IP 문서용 대역 reserved·소주 315kcal·실업급여 5배 문구·평수 노트·IP 우회 팁 중립화. 검증: check 156·범위 tsc 0·audit 0
- 2026-10-05 배치15 · 클릭 71~130위 30종 문구 감사(돈 13·건강 34·기타 20건: 결손금 15년, 버팀목 39세 조건, 대출 LTV/DTI 설명 역전, 이사 평형 구간, 연봉비교 8~20세 자녀 / 수면 NREM 3단계·권장 7시간, 바이오리듬 '재미용' 명시, 혈당 등급 명칭, 체지방 '측정' 과장, MBTI 비공식, BMI WHO 기준 / 인보이스≠세금계산서, OCR 오프라인 주장 삭제, 서명 공인인증서·폰트 전송, 모스 해상 GMDSS, 기하평균 입력, 로마 숫자 단일 문자) + **2025 한국인 영양소 섭취기준(복지부 2025-12-31) 에너지적정비율 탄수 50~65%·단백질 10~20%** 코드(nutrition.AMDR)·문구 반영 + **판매수수료 시장 모드 재작성**(marketplaceFees.ts: 스마트스토어 = 주문관리 연매출 구간 + 판매 2.73/0.91%, 카테고리 무관·배송비엔 주문관리만 / 쿠팡 공식 카테고리표 / 11번가 사용자 입력·대표 13%) + 마진 계산기 프리셋 단일 출처·요율 중복 표기 버그. 검증: check 156·범위 tsc(25) 0·audit 0
