# NEXT-SESSION (2026-10-04 — Claude 인수인계)

최신 상태는 [2026-10-04 Claude 인수인계](2026-10-04-claude.md)를 먼저 읽는다. 제품 커밋 `54a9999`는 main에 푸시·운영 배포됐고 PWA는 `v4.31.21`이다. 종료 문서 커밋은 이후에 추가된다. 다음 개발 범위는 사용자가 지정한다.

아래는 보존된 과거 기록이다. 당시의 미배포 상태·작업 후보·승인 범위를 현재 상태로 해석하지 않는다.

# 과거 기록 (2026-10-02 밤 — 당시 로컬 커밋만)

## 2026-10-02 밤 — 연속 배치 2 (미배포, 로컬 커밋)
- 고도화: pyeong-calculator, car-loan-calculator, inheritance-gift-tax(개정안 2024·2025 무산 → 현행법), comprehensive-property-tax(종부세+재산세 보유세, 과세표준 공식 버그), qr-generator, image-resizer, barcode-generator, password-generator(모듈로 편향), + 마무리 배치 electricity-calculator·image-converter·pdf-tools·timer
- 신규: /greeting-generator 인사말 생성기(문구는 src/utils/greetings.ts에 한국어로, 명절 날짜는 45일 이내만 표시)
- 홈 OG 이미지 교체(scripts/generate-home-og.mjs, URL ?v=2) — 배포 후 카카오 디버거 캐시 초기화 권장
- 접근성: 7개 계산기 a11y 패스, 공용 DatePicker(키보드·label prop), GuideSection(h2>button) — 전 도구 반영
- 배포 전 할 일: `node scripts/generate-redirects-rss.js`(인사말 생성기 RSS), SW v4.31.0
- 확인 필요: 상속세 세대생략 20억 기준(10년 합산 여부), 종부세 재산세 공제 45% vs 60%, 이미지 HEIC 크롬 지원(heic2any 도입 여부), 인사말 승진 문구가 합격 등에 섞임
- 함정: python 일괄 치환에서 2칸 들여쓴 문자열이 4칸 줄에도 매칭됨 → count 확인 / 작은따옴표 TS 문자열 안에 ' 넣지 말 것

## 2026-10-02 저녁 — 검색량 큰 계산기 7개 고도화 (미배포)
- **빌드가 자동 모드 권한에 막혀 배포 못 함** → 다음: SW v4.30.0→v4.31.0 bump → `pnpm build && cp public/rss.xml public/_redirects out/ && npx wrangler pages deploy out ...` → verify → push
- 대상: compound-calculator, health-insurance, national-pension, dsr-calculator, ovulation-calculator, exchange-calculator, real-estate-calculator. 각 `src/utils/<x>.ts` + `scripts/check-<x>.ts`
- 큰 버그: 국민연금 기본연금액 약 1/3 과소(계수 1.29 자리에 0.43), DSR 스트레스 전·후 한도 동일값·수도권 가산 1.5→3.0, 건보 재산 점수표 가짜·2025 점수당 금액, 복리 연복리 월적립 이자 0, 부동산 취득세 6천만~6억 선형보간·등록세 이중부과, 환율 API 실패 시 가짜 환율을 "지금"으로 표시
- 부동산 계산기는 "집 살 때 총 필요 현금" 한 화면으로 재구성(종부세·양도세·전세대출 탭 제거 → 전용 도구 링크). 기존 acquisitionTax/brokerageFee/loanSchedule utils 재사용
- 배란일: 생리일 URL 파라미터 제거(localStorage만), ShareResult 없음(건강 정보)
- dev 서버 검증 함정: **내장 브라우저에 SW(toolhub-static-*)가 등록돼 옛 청크를 줌** → 번역 키 노출·hydration 오류처럼 보임. `navigator.serviceWorker.getRegistrations()` unregister + `caches.delete` 후 재확인 (7개 모바일·다크 OK)
- 확인 필요(에이전트 보고): 건보 10원 미만 절사 시점·지역 최저보험료 방식·전월세 월세×40, 국민연금 부양가족연금 2026 금액·A값 3,193,511 고시 원문, DSR 혼합형 고정비중 50%+ 반영비율·신용대출 산식, 환율 비주요 통화 스프레드 5%(대략치), 부동산 조정대상지역 목록 기준일
- 미사용 i18n 키 대량: compoundCalculator(result/comparison/common…), healthInsurance(workplace/regional/comparison/insurance…), nationalPension(u·title·description 외 전부), dsrCalc(income/newLoan/existing/result/limit/stress, guide.* 틀린 내용), ovulationCalculator(calculate/result/safe*…), realEstate(description/input/result/guide), 최상위 `exchange`. localStorage.ts의 'real-estate'·'exchange' 히스토리 타이틀도 미사용
- 다음 후보: car-tax-calculator(annual-car-tax와 중복 정리), 연말·신년 인사말 생성기(12월 전), 재직·경력증명서

## (이전) 2026-10-02 오후 919fc6b

## 2026-10-02 오후 — 웹 조사 기반 신규 5종 + 양도세 + 소득세 버그
- 선정 근거: 비즈폼 실시간 인기 검색어(영수증·부동산임대차계약서·인사말·급여·위임장), 메뉴에 없던 고검색 계산기(복비·연간 자동차세)
- 신규: /brokerage-fee(요율표 `src/utils/brokerageFee.ts`, acquisitionTax.brokerFee가 재사용), /annual-car-tax(연납 공제 일할 — 1월 ≈4.58%), /pay-slip, /receipt-generator, /lease-contract(표준계약서 2023.10, 전세사기 예방 특약 11종)
- 고도화: /capital-gains-tax 재작성(단기세율 누락 버그, 중과 유예 2026.5.9 종료, 일시적 2주택 2년 단축 2026.10.1)
- **중요 버그 수정(512741a)**: `netSalary.ts` 월 소득세가 간이세액표보다 월 7~12만원 과대(연봉 4천 1인 156,300 vs 84,620). 이제 `src/utils/wageTaxTable.ts`(2026.2.27 간이세액표 원문 646행×11열) 사용. 연간 결정세액 추정은 `taxInfo.annualTaxEstimate`(연봉 계산기 참고 행, 성과급 final 기준). SalaryComparison 중복 로직 제거
  - 간이세액표 개정 시(보통 2~3월) wageTaxTable.ts 교체 + `node scripts/check-pay-slip.ts`
- 확인 필요: 자동차세 영업용 승합·화물 정액, 6·9월 연납 할인율 소수점, 양도세 일시적 2주택 시행령 원문, 임대차 신고 대상 지역(강원·전북 군), 영수증 가산세 조문 번호
- 다음 후보: 비즈폼 인기 "인사말"(연말·신년 인사말 생성기 — 12월 시즌 전에), 재직·경력증명서, 합의서·각서, health-insurance·national-pension 고도화

## (이전) 2026-10-02 오전 a695f91

## 2026-10-02 — 구글 유입 대비: 계산기 8개 고도화 + 문서 양식 5종 신규
- 배경: popular_tools 클릭 데이터는 구글 색인 전(네이버·내부 이동 위주)이라 **정리(삭제)는 10/29 GSC 확인 후**. 기준: 색인 2개월+ 노출≈0 & 방문≤10 → 301 병합. 1순위 후보 cs-*/dev-* 학습 페이지 9개. 결정 도구 9개는 9/30 분리라 판단 보류
- 퇴직금 통합: `/severance-pay` 삭제 → `/retirement-calculator/` 301 (`scripts/generate-redirects-rss.js` `movedRoutes` — 앞으로 통합·이전은 여기에). 쿼리 유지 확인(start/end 호환)
- 고도화(검색량 큰데 미개선): annual-leave, unemployment-benefit, weekly-holiday-pay, hourly-wage, savings-calculator, acquisition-tax, parental-leave, housing-subscription. 각각 `src/utils/<x>.ts` + `scripts/check-<x>.ts`
  - 실제 버그 수정: 취득세 농특세·지방교육세 중과, 육아기 단축급여 2025 상한, 6+6 공통개월, 적금 가짜 규칙·엉터리 FAQ, 연차 촉진제도 설명 반대
- 신규 문서 양식 5종 (tools > generators): /iou-generator, /resignation-letter, /power-of-attorney, /certified-letter, /employment-contract
  - 공통 엔진 `src/components/document/{DocumentGenerator,paper,fields}.tsx` + `src/utils/document.ts`. 새 양식 = 템플릿 객체 하나(IouGenerator.tsx 참고). 용지 본문은 한국어 하드코딩, 개인정보 URL 금지(localStorage `docgen_<id>`)
  - 내용증명 ↔ 차용증 localStorage 불러오기 연동
- **i18n 새 네임스페이스 함정**: 한 줄 `"ns": {}` 스텁에 merge-i18n.py를 쓰면 키가 최상위로 새어 나감(JSON은 유효). 스텁을 json.dumps로 통째 치환(scratchpad fill_ns.py 방식)
- Git Bash에서 `node scripts/verify-page.mjs /path/` → 경로가 MSYS 변환돼 `/`만 검사됨. `MSYS_NO_PATHCONV=1` 필수. verify-page는 HTTP 상태만 보므로 iframe JS로 raw key·overflow 검사함
- 앱 내장 브라우저에선 SW 등록 실패 콘솔 에러가 나옴(sw.js 200) — 환경 문제, 무시
- 확인 필요(에이전트 보고): 취득세 6~9억 세율 반올림 자리·국민주택채권 매입률, 퇴직소득 연금수령 21년차 50% 감면 법령 원문, 청약 10·15 규제지역 현행 여부, 청년미래적금 공식 자료, 위임장 부동산 등기 대리(법무사) 안내 누락
- 다음 후보(검색량 큼·미개선): car-tax-calculator(방문 0), capital-gains-tax, real-estate-calculator(중개수수료), health-insurance, national-pension, exchange-calculator, compound-calculator, dsr-calculator, ovulation-calculator. 문서 양식 추가 후보: 영수증, 합의서, 각서, 경위서, 시말서
- 미사용 i18n 키 대량(각 컴포넌트 재작성으로 옛 키 남음) — 번들 크기 과제와 함께 정리

## (이전) 2026-10-01 저녁 배포 8cf7483

## 2026-10-01 밤 — 수능 시즌 콘텐츠 (b9907fc)
- 신규 `/csat-dday/` (수능 D-day·시간표·준비물·가채점표·응원 카드·대입 일정). 준비물·4교시 세부·문항 수는 "예년 기준" 표기 → **2027 수험생 유의사항 공고 후 `src/utils/csatDday.ts`/i18n 확인**
- `/csat-grade` health → calculators 이동
- 예약 작업: 11/20 09:00 가채점 컷 초안, 12/11 13:00 확정 컷 초안 (scheduled-tasks, 로컬 커밋까지만 하고 배포 여부 질문)
- 새 i18n 네임스페이스는 merge-i18n.py가 못 만듦 → 파일 끝에 `"ns": {}` 스텁 추가 후 병합
- SW v4.29.0 (2026-10-02)

## 2026-10-01 저녁 — 배치 3~8 (24개 도구) + Impeccable 디자인 정리, 한 번에 배포
- 3: emoji-picker, retirement-calculator(퇴직금 — 2023~ 퇴직소득세로 재작성), image-ocr, image-compressor
- 4: color-blindness-simulator, notepad, roman-numeral, loan-calculator
- 5: reaction-test, background-remover, wedding-calculator(한국소비자원 2025.8 수치 확인), income-tax(+freelancerTax 복식부기 기준경비율 1/2 버그 수정)
- 6: invoice-generator(한글 PDF = html2canvas, jsPDF optional dep로 설치됨·package.json 미기재), time-converter, moving-cost(손없는날 음력), budget-calculator
- 7: calorie-calculator, screen-compare, text-converter, body-fat-calculator
- 8: mbti-test(연애 스타일·유명인 섹션 제거됨 — 검색 유입 줄면 복원 검토), blood-sugar, bmi-calculator(대한비만학회 2022), tetris
- 각 page.tsx의 틀린 SEO/FAQ 문구(기준치·없는 기능)도 메인에서 정정. 공통 헬퍼: scratchpad featurelist.py (JSON-LD featureList 교체)
- **Impeccable 스킬 설치**(.claude/skills/impeccable + .claude/agents, 훅은 설치 안 함 — 편집마다 다운로드 바이너리 실행). 감사 135→62건: `--faint` #8b95a1(대비 3:1), 측면 색 테두리 제거, `scripts/strip-dead-gradient-stops.py`(죽은 그라데이션 448개), 배경 색 얼룩 제거. 재감사: `.claude/skills/impeccable/scripts/impeccable detect --json src/components`
- body `overflow-wrap: break-word` — "A·B·C" 같은 긴 문자열이 모바일 레이아웃을 넓히던 문제(텍스트 변환·로마숫자)
- 빌드가 메모리 부족(WSL·bun·Claude 창)으로 segfault/exit 134 날 수 있음 → 재시도하면 됨(코드 문제 아님)
- **성과 측정**: 2026-10-29 전후 Search Console에서 위 24개 + 오전 배치 페이지의 노출·클릭을 직전 4주와 비교 (CF Web Analytics는 내부 이동 위주라 부적합)
- 다음 후보(클릭순, 미개선): omok·mancala·checkers·othello·battleship·dots-and-boxes(BoardGamePage 공통), chess, color-blindness 외 offset 118~ (popular_tools 재조회)


## 2026-10-01 오후 배치 (배포·푸시)
- **입력창 전역 수정**: `ui-field` 회색 채움+투명 테두리 → 흰 바탕+`--line-strong` 테두리+hover (친구 피드백 "입력 폼처럼 안 생김", globals.css 한 곳)
- nutrition-calculator(g/ml·나트륨·1일 기준치%·영양성분표 직접입력·ShareResult, ECharts 제거), csat-grade(전과목 한 번에·수능최저·D-day 2026-11-19 확인), css-unit-converter(16단위·px→rem 일괄·clamp()), picross(오늘의 #N·유일해 생성·드래그 칠하기)
- csat 등급컷: 2026학년도 확정(평가원 표준점수 + 종로학원 원점수 역산, 선택과목·탐구 17과목별) — f6ba957. **매년 12월 채점결과 발표 후** `src/utils/csatGrade.ts` 갱신 (출처: jongro.co.kr/service/examResult/ex<시험일>/go3_resultCut.asp, EUC-KR)
- 배치 2 (c0ea49f): morse-code(한글 SKATS·WAV·탭키·코흐 연습), spirit-level(버블 방향·기울기 수학 수정, 180° 보정, 진북 나침반 — **실기기 확인 필요**), markdown-editor(표/링크 XSS 수정, GFM, 자동저장, 서식 복사), screen-info(뷰포트·Hz 추정·브레이크포인트·PPI)
- 모바일 함정: `grid lg:grid-cols-3`만 쓰면 모바일 암묵 열이 overflow-x-auto 자식 폭만큼 늘어남 → `grid-cols-1` 같이 쓸 것
- dev 서버(Turbopack)는 ko.json 병합 후 클라이언트 번들이 갱신 안 됨(서버 HTML만 갱신) → 빌드본으로 확인


## 2026-09-30 ~ 10-01 세션에서 한 것 (전부 배포·푸시)
- 토스 스타일 전역 디자인 시스템, ToolIcon, 새 로고, 결정 도구 9개 URL 분리 (이전 인계 내용)
- **공유 공통화**: `ShareResult` + `src/utils/shareCard.ts` (1080×1350 카드) — 결과 있는 도구는 결과 아래에 붙임
- **도구별 OG 이미지 318개**: `pnpm og [slug]` (`scripts/generate-og.mjs`) — page의 openGraph가 layout 이미지를 덮어써서 대부분 og:image가 없었음(카톡 미리보기 텍스트만). 새 도구 추가 시 필수
- **도구 고도화 (클릭 순위 상위부터, 배치당 에이전트 4개)**: salary-calculator(상위%·인상), hangman/crossword/korean-wordle(오늘의 #N·연속기록·공유 격자), aspect-ratio, water-bill/gas-bill(2026 공식 요금, 기존 가짜 누진·부가세 제거), presentation-timer, salary-rank(salaryInsights 공유), subnet-calculator, parking-fee, random-picker(시드 검증 추첨), dday(기념일), fancy-text, TTS, sales-commission(오픈마켓 탭 기본 유지 + 영업 커미션 탭), noise-meter(Leq·층간소음 39/34), typing-test(자모 타수), image-mosaic, color-blind-test(혼동선 검사판), percent, collage-maker, vat-calculator, business-number, car-maintenance(교체주기 탭), exercise-calorie, military-discharge, dutch-pay, ip-checker(`functions/api/ip.ts`), stock-calculator, monitor-test, interior-calculator, korean-syllable, speed-test, alcohol-calculator, rent-converter, character-counter, unit-converter, world-clock, base-converter, metronome, font-preview, number-baseball, minesweeper, sleep-calculator, due-date, age-calculator, freelancer-tax, loan-schedule, signature-generator, jeonse-loan, ev-subsidy, year-end-tax(2026 귀속), investment-calculator, llm-token-calculator, biorhythm
- `koreanHolidays.ts` 대체공휴일 규칙·노동절/제헌절(2026~)·선거일 수정 (dday.ts가 재사용)
- 회귀 체크: `for f in scripts/check-*.ts; do node $f; done` + `node scripts/check-net-salary.mjs`

## 1. 사용자 액션
- **사업자번호 휴·폐업 조회**: 공공데이터포털 "국세청_사업자등록정보 진위확인 및 상태조회" 활용신청 → Cloudflare Pages 환경변수(Secret) `NTS_API_KEY`. 없으면 UI가 홈택스 안내로 대체됨 (`functions/api/business-status.ts`)
- 카톡 미리보기 캐시: developers.kakao.com/tool/debugger/sharing 에서 초기화
- 실기기 확인 권장: 한글 IME 입력(타자연습·워들·십자말), 마이크(소음측정), 음성(TTS)

## 2. 다음 후보 (popular_tools 클릭 순)
- 다음: emoji-picker, retirement-calculator, image-ocr, image-compressor, reaction-test, background-remover, wedding-calculator, income-tax, invoice-generator (popular_tools offset 70~)
- **성능 과제**: ko.json 전체(2.1MB, gzip 511KB)가 모든 페이지 번들에 포함 → 도구별 네임스페이스 분리 로딩 검토(src/lib/i18n.ts 정적 import 구조). 미사용 키 정리로도 일부 감소
- 기준금리 변경 시 `src/utils/rentConvert.ts` BASE_RATE, 전기차 지방비 추경 시 `src/utils/evSubsidy.ts` RAW/DATA_DATE, LLM 단가 `src/utils/llmPricing.ts` 갱신
- 쓰지 않게 된 i18n 키 정리 (에이전트 보고서마다 목록 있음), ko.json `*.guide.guide.*` 중복 블록, `aspectRatio.businessNumber` 중첩 쓰레기
- ElectricityCalculator 전력기금 요율 공식 확인

## 3. 작업 방식 메모
- 에이전트: 컴포넌트/유틸/체크스크립트만 수정, i18n은 scratchpad `<x>_new.json`/`<x>_over.json` (`{"ko":{...},"en":{...}}`, **네임스페이스로 감싸지 말 것** — 감싸면 이중 중첩됨)
- 병합: `python scripts/merge-i18n.py <ns> new.json` → `... over.json --overwrite` → node로 키 확인. 기존 키와 충돌하는 "새" 키는 병합 안 되니 over로 다시 넣을 것
- 유입 유지: 기존 page `<title>`은 바꾸지 말 것(판매수수료·메뉴 선택기 사례)
- 빌드 후 verify: `python -m http.server 3040 -d out` + `node scripts/verify-page.mjs <path> --check-i18n [--dark --mobile --screenshot n]`
- 배포: SW 버전 bump(public/sw.js, 현재 v4.30.0) → `pnpm build && cp public/rss.xml public/_redirects out/ && npx wrangler pages deploy out --commit-dirty=true --commit-message=... --branch=main`

## 4. 재개 프롬프트
"docs/handoff/NEXT-SESSION.md 읽고, popular_tools 클릭 순위(offset 70~)에서 아직 안 한 도구 4개를 골라 같은 배치 방식(에이전트 4개 → i18n 병합 → tsc·check → build → verify-page → deploy → commit/push)으로 이어서 개선해줘. 단, 아래 확인 대기 답이 '번들 분리 먼저'면 그것부터."

## 5. 확인 대기
- 번역 파일(ko.json 2.1MB)을 도구별로 나눠 로딩하는 작업을 도구 개선보다 먼저 할까요?
- 사업자번호 상태조회용 `NTS_API_KEY`를 Cloudflare에 넣으셨나요?
