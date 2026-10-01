# NEXT-SESSION (2026-10-01 오후, main 푸시 완료 8ccaf66)

## 2026-10-01 오후 배치 (배포·푸시)
- **입력창 전역 수정**: `ui-field` 회색 채움+투명 테두리 → 흰 바탕+`--line-strong` 테두리+hover (친구 피드백 "입력 폼처럼 안 생김", globals.css 한 곳)
- nutrition-calculator(g/ml·나트륨·1일 기준치%·영양성분표 직접입력·ShareResult, ECharts 제거), csat-grade(전과목 한 번에·수능최저·D-day 2026-11-19 확인), css-unit-converter(16단위·px→rem 일괄·clamp()), picross(오늘의 #N·유일해 생성·드래그 칠하기)
- csat 등급컷: 2026학년도 확정(평가원 표준점수 + 종로학원 원점수 역산, 선택과목·탐구 17과목별) — f6ba957. **매년 12월 채점결과 발표 후** `src/utils/csatGrade.ts` 갱신 (출처: jongro.co.kr/service/examResult/ex<시험일>/go3_resultCut.asp, EUC-KR)
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
- 다음: morse-code, spirit-level, markdown-editor, screen-info, emoji-picker, retirement-calculator, image-ocr, image-compressor, reaction-test, background-remover, wedding-calculator, income-tax, invoice-generator (popular_tools offset 70~)
- **성능 과제**: ko.json 전체(2.1MB, gzip 511KB)가 모든 페이지 번들에 포함 → 도구별 네임스페이스 분리 로딩 검토(src/lib/i18n.ts 정적 import 구조). 미사용 키 정리로도 일부 감소
- 기준금리 변경 시 `src/utils/rentConvert.ts` BASE_RATE, 전기차 지방비 추경 시 `src/utils/evSubsidy.ts` RAW/DATA_DATE, LLM 단가 `src/utils/llmPricing.ts` 갱신
- 쓰지 않게 된 i18n 키 정리 (에이전트 보고서마다 목록 있음), ko.json `*.guide.guide.*` 중복 블록, `aspectRatio.businessNumber` 중첩 쓰레기
- ElectricityCalculator 전력기금 요율 공식 확인

## 3. 작업 방식 메모
- 에이전트: 컴포넌트/유틸/체크스크립트만 수정, i18n은 scratchpad `<x>_new.json`/`<x>_over.json` (`{"ko":{...},"en":{...}}`, **네임스페이스로 감싸지 말 것** — 감싸면 이중 중첩됨)
- 병합: `python scripts/merge-i18n.py <ns> new.json` → `... over.json --overwrite` → node로 키 확인. 기존 키와 충돌하는 "새" 키는 병합 안 되니 over로 다시 넣을 것
- 유입 유지: 기존 page `<title>`은 바꾸지 말 것(판매수수료·메뉴 선택기 사례)
- 빌드 후 verify: `python -m http.server 3040 -d out` + `node scripts/verify-page.mjs <path> --check-i18n [--dark --mobile --screenshot n]`
- 배포: SW 버전 bump(public/sw.js, 현재 v4.25.1) → `pnpm build && cp public/rss.xml public/_redirects out/ && npx wrangler pages deploy out --commit-dirty=true --commit-message=... --branch=main`

## 4. 재개 프롬프트
"docs/handoff/NEXT-SESSION.md 읽고, popular_tools 클릭 순위(offset 70~)에서 아직 안 한 도구 4개를 골라 같은 배치 방식(에이전트 4개 → i18n 병합 → tsc·check → build → verify-page → deploy → commit/push)으로 이어서 개선해줘. 단, 아래 확인 대기 답이 '번들 분리 먼저'면 그것부터."

## 5. 확인 대기
- 번역 파일(ko.json 2.1MB)을 도구별로 나눠 로딩하는 작업을 도구 개선보다 먼저 할까요?
- 사업자번호 상태조회용 `NTS_API_KEY`를 Cloudflare에 넣으셨나요?
