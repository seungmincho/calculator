# NEXT-SESSION (2026-11-08 밤 — 4차: 성과 측정·네이버 CTR·팀 밸런스 배포·푸시 완료)

## 지금 상태 (2026-11-08 밤)

**운영 배포 완료(Claude, 7ac6d672, SW v4.35.16)·푸시 완료·IndexNow 8 URL(200).** 다음 배포는 SW v4.35.17.

- **6차(2026-11-08 밤)**: 신규 /overseas-stock-tax·/card-fee-calculator·/prepayment-fee(서브에이전트 병렬, 공식 출처 확인), 택시 대전 11/1 인상·시간대별 요금, 적금 상호금융 저율 5.9%, 날짜 입력 클릭 시 달력(layout 전역)·color-scheme 사이트 테마, 기본값 URL 8종, 가계부 문구, 퇴사 정산 재직 연수 표시. 후속은 백로그 #62. 원격과 로컬이 같다.

- **4차(2026-11-08 밤)**: 성과 측정(CF 7일 한국 913·네이버 695/주, 구글 색인 1/363 → 백로그 #58), 네이버 노출 많고 CTR 낮은 7페이지 description 앞에 구체 숫자(#59), 음력 월별 양력 대조표(빌드 연도·다음 해 — **연초 재빌드 때 넘어감**), 팀 나누기 밸런스 모드 실제 구현(#60, utils/teamBalance.ts·scripts/check-team-balance.ts). 빌드는 가용 6.1GB라 `LOW_MEMORY_BUILD=1`(워커 1개)로 — 정상 완료.
- **CTR 효과 측정**: 11/22~12/6 서치어드바이저에서 taxi-fare 59,258 노출 0.4%·lunar 22,169 0.4%·shipping 12,131 0.8%·pyeong 8,394 0.5%·team-divider 6,190 0.7%·roman 4,944 0.5%·gpa 4,545 1.1%(11/8 이전 기간) 과 비교. 같은 때 **구글 색인 재확인**: 사용자가 11/8부터 상위 페이지 색인 생성 요청(하루 ~10) 진행 중 → GSC 페이지 보고서 색인 수(11/8 기준 1/363)·크롤링 통계를 캡처로 받아 비교(백로그 #58).

### 1. 미완료·대기 (막힌 이유)

- 김장 계산기 aT 2026 김장비용 — 외부 발표 대기. **예약 작업 `kimjang-at-2026-cost-update`(11/19 10:00)** 가 확인·로컬 커밋까지 → 결과 리뷰 후 배포.
- 전월세 전환 기준금리 — **예약 작업 `bok-base-rate-1126-update`(11/26 15:00)** 가 금통위 결과 반영·로컬 커밋 → 리뷰 후 배포.
- 수능 가채점(11/20)·확정(12/11) 등급컷 — 예약 작업이 초안, 배포 여부는 사용자 확인.
- 스키장 개장일 10곳 — 리조트 공지 대기(용평·하이원 "11월 말", 곤지암 "12월 중"). `src/lib/ski/resorts.ts` opening + FAQ·asOf.
- 12월 국회·고시 — 0-5 절 '12월 할 일'(부양가족 300만·중기 감면 기한·부가세 카드 1.2%·전기차 취득세 70만·국민연금 A값·건보 상하한·기초연금). 백로그 #57.
- **1월 1일 재빌드·배포 필수**(4대보험 `INSURANCE` 모듈 상수 연도 전환).
- 아이 키 3~18세 LMS 원본·금값 계산기 — 사용자 자료·결정 대기(아래 확인 대기).
- 급하지 않은 정리: 백로그 #55(기본값 URL 남은 도구)·#56(적금 준조합원 5%, 가계부 낡은 문구, 전력기금 출처).

### 2. 재개 프롬프트

> 툴허브(C:\projects\salary-calculator) 개선 루프를 이어서 해 줘. 먼저 `docs/handoff/NEXT-SESSION.md` 맨 위 "미완료·대기"를 보고, 예약 작업(11/19 김장·11/26 금통위·수능 등급컷)이 남긴 로컬 커밋이 있으면 리뷰하고, 날짜가 된 외부 발표(스키장 개장 공지, 12월 국회 세제개편안·국민연금 A값)를 웹으로 확인해 반영해. 그다음 `docs/handoff/IMPROVEMENT-LOOP.md` 백로그에서 다음 묶음(약 10개)을 계획해 보여 주고, 신규 도구는 기획안 승인 후 서브에이전트 병렬(동시 4개 안팎)로. 검증은 `node scripts/generate-scoped-messages.mjs` → `node scripts/i18n-namespaces.cjs --audit` → 전체 tsc(4GB 캡) → `scripts/check-*.ts` 전부 → dev 브라우저. 묶음이 끝나면 메모리 여유(커밋 9GB+·실메모리 7GB+)를 확인하고 Claude 가 직접 빌드 → `check-static-html`·`audit-seo-static` → wrangler pages dev 확인 → node22 wrangler 배포 → curl → IndexNow → 푸시. 사용자가 배포를 말해도 진행 중인 개선을 먼저 끝낸다.

### 3. 확인 대기 (사용자에게 물을 것)

- **구글 색인 진단 화면 2장**(2026-11-08 측정 후속, 백로그 #58): GSC 설정 → 크롤링 통계(요청 추이 + 호스트 상태: robots.txt 가져오기·DNS·서버 연결), URL 검사 `/taxi-fare/` → "실제 URL 테스트" 결과.
- 질병관리청 성장도표 원본 엑셀을 받아 줄 수 있나요? (아이 키 3~18세 값을 원본으로 교체)
- 금값 계산기를 실시간 시세로 만들까요? 그러려면 공공데이터포털에서 "금융위원회_일반상품시세정보" 키를 발급해 주셔야 해요.
- Cloudflare 대시보드(보안 → 봇 / AI Crawl Control)에서 AI 크롤러가 막혀 있지 않은지 확인하셨나요?

### 0-5. 2026-11-08 3차 묶음 (신규 2 사용자 기획 승인 + 개선)

- **`/resignation-pay/` 퇴사하면 받는 돈**(f23e3c56): retirementPay·annualLeave·unemploymentBenefit·yearEndTax 재사용. 기납부 소득세는 간이세액표×재직 개월 근사, 피보험 단위기간은 재직일×6/7 근사(다른 회사 합산 미반영 — ponytail 주석). 정당한 이직 사유(시행규칙 별표 2) 원문 미확인 — 기존 실업급여 문구 재사용.
- **`/heater-electricity-cost/` 난방기구 전기세**(f23e3c56): calcBill(평소+난방) − calcBill(평소). 기구 정격 W 는 출처 없는 '흔한 예시'로 표기(사용자가 수정). 출처가 한전(.co.kr)뿐이라 SEO 감사 ymyl 경고 남음.
- **홈 '새 도구·업데이트'**: addedDate + updatedDate(추가일보다 나중) 최신순. **도구를 눈에 띄게 고치면 menuConfig `updatedDate` 갱신**(AGENTS.md 규칙). 1/15 간소화 일정 → /year-end-checklist.
- **혈압 기록기 정정(5e70bd6f)**: 분류가 ACC/AHA(130~139 = 1단계)인데 본문·FAQ 는 대한고혈압학회라 어긋났음 → 국내(정상·주의·전단계 130~139/80~89·1기 140/90·2기 160/100, 위기만 ACC/AHA). 2026 제6판 진단 140/90 유지 확인(보도), 6판 신설 이완기 단독 고혈압 등은 미반영(화면에 명시). 저장 기록도 표시할 때 다시 분류.
- **근거·출처 50곳(5e70bd6f·a76b9fab)**: 건강 11·세금노동 19·금융생활 20 page.tsx 에 공식 링크와 '기준: 2026년 …'. SEO 감사 noOfficialSourceLink 58→26, noBasisDate 73→25(남은 것은 대부분 순수 계산 도구). audit 정규식이 'YYYY년 M월 D일 기준/확인'도 인식.
- **마진 계산기 간이과세**: 판매가×15%×10% − 매입 공급대가×0.5%(부가세법 §63③, 음수 0).
- **일몰 조항(1ba54f13)**: 전기차 취득세 140만 ~2026.12.31(정부안 의안 2221925: 2029년까지 70만, 국회 심의) — 수소차는 2027.12.31. 부가세 카드 1.3% ~2026.12.31(개편안 1.2%·500만). DSR 지방 0.75% 2027 미발표. 계산은 현행, 문구만.
- **기본값이면 URL 쿼리 없음 18종(e2e83616·88c396e0)**. 남은 후보: BMI·카드공제·마진 등(아래 백로그 #55).
- 검증: tsc 0, audit 0, check 전부(esbuild 5개 제외), 빌드본 wrangler pages dev 375px·hydration 0, check-static-html 팁 400 외 0, 운영 curl.

**12월 할 일(국회·고시)** — 6차 추가: 자동차세 2027년 1월 연납 공제율(2026은 시행령 개정으로 5% 유지, 2027 미발표 — 화면은 "5% 유지 가정" 표기, annualCarTax LUMP_RATE), 카드 세액공제 2027 개편안 → cardFee·vat, 택시 전남·대구 고시, 해외주식 연말 매도 마감일(백로그 #62). 기존: 세제개편안 통과 시 ① 부양가족 소득 300만/750만(dependentDeduction) ② 중기 감면 기한 연장(smeTaxExemption) ③ 부가세 카드 1.2%·500만(vat.ts, 공급일 기준 분기) ④ 전기차 취득세 70만(carAcquisitionTax·evSubsidy·carLoan, 취득일 기준 분기). **국민연금 A값**(nationalPension.ts `A_VALUE` 3,193,511원은 2025.12~2026.11 적용 — 12월 새 A값 고시 → pension-calculator 기준 줄 함께). 건보 상·하한·2027 기초연금 선정기준액.

### 0-4. 2026-11-08 2차 묶음 (신규 3 사용자 기획 승인 + 개선 6)

- **`/child-tax-credit/`**(db1cc5c8): 부칙 §2(법률 제21548호, 2026.4.21) — 2026 귀속 9세·2027 10세·2028 11세·2029 12세 이상인데 2017년생 제외 → 2026~2029 귀속 모두 2016년 이전 출생, 2030 귀속부터 본문 13세 이상(2017년생 다시 대상). 손자녀·위탁아동은 시행령 요건 미확인(자녀처럼 20세 이하로).
- **`/sme-tax-exemption/`**(db1cc5c8): **조특법 §30 취업 기한 2026.12.31 그대로(2025.12 개정 연장 없음)** — 2027년 취업자는 대상 아님. 12월 국회에서 세제개편안(기한 2029년 말 연장·비수도권 청년 기간 확대 등, 보도 기준) 통과되면 `src/utils/smeTaxExemption.ts`·FAQ 갱신. 종료 달 계산(취업일 산입)·이직 시 나이 기준일은 예규 미확인(ponytail 주석).
- **`/year-end-checklist/`**(db1cc5c8): 26항목, localStorage `toolhub:year-end-checklist:${TAX_YEAR}`, 일정은 국세청 2025 귀속 보도자료(2026.1.14) 기준 '예년' 표기 → **2027년 1월 국세청 2026 귀속 안내 나오면 날짜 교체**. 검사가 TAX_YEAR>2026 이면 실패하도록(혼인공제 2026 신고분까지).
- **보금자리론 정정(b745be35)**: 업무처리기준(2026.07.20) — 신용점수 271~614·인정소득은 LTV '60% 이내' 제한(10%p 누적 차감 아님), 생애최초는 미적용. 업무처리기준 PDF 파일명이 개정마다 바뀜(page 출처 링크 확인).
- **판매수수료(b745be35)**: 11번가 부가세 포함·배송비 3.3% 공식 FAQ 근거. 11번가 카테고리 요율·쿠팡 배송비 3%·VAT 는 로그인 필요로 확인 불가.
- **날짜 안전화(4fe7d4eb)**: 중위소득·아동수당·프리랜서·연휴 플래너·세금 일정은 page 가 `todayKST()` 빌드 날짜를 넘겨 첫 렌더 고정, 홈·허브 NEW 배지·크론탭은 마운트 후. 남은 것: `insuranceRates` INSURANCE 모듈 상수 → **1/1 재빌드 필수 그대로**.
- **정리(62c8837f)**: 연말정산 허브 '달라진 점'에 교육비 소득 제한 폐지, MobileResultLink → `@/lib/i18n/shared`(check-scoped-translations 통과), check-agent-api·mcp·everland(-planner)·theme-parks 는 머리 주석의 esbuild 명령으로 실행(전부 PASS), 사다리·로또 남은 색.
- 검증: 전체 tsc 0, audit 0, check-*.ts 전부(esbuild 5개 제외) 통과, dev 375px 넘침 0(자녀세액공제 표 sr-only 넘침 → 스크롤 래퍼 `relative` 로 수정), 날짜 바꾼 페이지 hydration 경고 0.
- **예약 작업 2개 등록됨(2026-11-08, Auto 모드)**: `kimjang-at-2026-cost-update`(11/19 10:00 aT 김장비용 → kimjang.ts), `bok-base-rate-1126-update`(11/26 15:00 금통위 → rentConvert BASE_RATE). 둘 다 로컬 커밋까지만, 결과 확인 후 배포는 사용자.

### 0-3. 2026-11-08 연말정산 랜딩 3종 + 작은 개선 (사용자 기획 승인, 서브에이전트 병렬)

- **`/education-tax-credit/`**(64903faf): `src/utils/educationTaxCredit.ts`. 1인 한도는 §59의4③1호 단서 "각 목 합산" → 마목(2026 신설 초등 1·2학년·9세 미만 예체능 학원·체육시설, 시행령 §118의6⑧~⑩ 월 단위·주 1회 이상)은 학교 교육비와 합쳐 300만. **2026.1.1 이후 지급분부터 부양가족 교육비는 나이·소득 제한 없음**(법률 제21221호, casenote 현행본 "나이 및 소득의 제한을 받지 아니하되" 확인). 세금은 1인 한도 적용 합계를 한도 없는 `eduSelf` 자리에 넣어 `itemTaxSaving`. 학원비·교복은 카드 공제 중복 가능(조특령 §121의2⑥2 제외 목록에 없음). 확인 못 함: 고3 수능 응시료·전형료 한도 구분, 12월 선납 학원비 귀속연도.
- **`/donation-tax-credit/`**(64903faf): `src/utils/donationTaxCredit.ts` + **yearEndTax.ts 에 `political?`·`donationSpecial?`·`donationReligious?`**(기존 `donation` = 일반 종교 외, 기존 결과 불변 — 난수 2,000건 assert). 일반 한도 소득금액 = 근로소득금액 − 특례(§59의4④ 원문). 정치자금 = 조특법 §76 10만 110분의 100·초과 15%·3천만 초과 25%, 표준세액공제와 함께(⑨1호에 없음). 2024 한정 3천만 초과 +10%p(⑧)는 FAQ 에서 정정. 미확인: 특례 100% 한도의 근로자 적용 근거(§34② 사업자 산식 준용), 정치자금 소득금액 한도(계산 미반영). 허브는 일반 하나만 받으므로 링크는 `dn` 만.
- **`/dependent-deduction/`**(64903faf): `src/utils/dependentDeduction.ts`. 나이 하루라도(§53⑤), 소득금액 100만(근로만 총급여 500만), 분리과세 제외(§14③), 공적연금 총연금액 5,166,666원 경계(§47의2), 추가공제(§51), 맞벌이 배분 조합 최대 2^12. 부녀자·한부모는 calc 입력이 없어 `elderly` 에 0.5/1 을 얹어 계산(주석, 허브 링크엔 빠짐). 미확인: 시행령 §106(위탁아동 세부, casenote 404), 사적연금 1,500만 초과 분리과세 선택 시 소득금액 제외 여부(보수적으로 포함). **12월 국회에서 세제개편안(소득금액 300만·총급여 750만) 통과되면 적용 연도 확인 후 반영**.
- 허브(`YearEndTaxCalculator`)에 세 랜딩 딥링크, relatedTools·메뉴(계산기 > 세금)·OG·RSS. 기본값이면 URL 에 쿼리를 붙이지 않음.
- **작은 개선(f9c5fde8)**: 종합소득세 고배당 분리과세 실제 계산(`?hd=`, 2026 귀속만, dividend.ts 재사용), 연봉·대출·유류비 i18n 모듈 영어 지연 로드(러닝 페이스·지원금은 en JSON 정적 import 제거), 로또 생성기·사다리 하드코딩 색 → 토큰(공 색 유지). 사다리 결과 행 키보드는 이미 돼 있었음.
- 검증: 전체 tsc 0, audit 미해결 0, check-*.ts 전부 통과(단 check-agent-api·check-mcp·check-everland·check-everland-planner·check-theme-parks 는 node 직접 실행 시 모듈 로딩 오류 — esbuild 번들 실행용, 이번 변경과 무관), dev 375px 넘침 0·h1 1·키 노출 0, 영어 연봉 계산기 hydration 오류 0.
- **이번에 알게 된 것(백로그)**: 번역 레지스트리(`src/lib/i18n.ts`)가 한국어만 로드 → 일반 도구 ~370개는 영어 선택해도 한국어. `check-scoped-translations.mjs` 는 MobileResultLink 가 레지스트리를 import 해서(70b99942~) 원래부터 실패.

### 0-2. 2026-11-07 묶음 (신규 2 + 개선 7, 사용자 승인)

- **`/energy-voucher/`**: `src/utils/energyVoucher.ts`(누리집 원문: 1인 295,200·2인 407,500·3인 532,700·4인+ 701,300, 하절기 몫만 40,700~102,000, 신청 6/15~12/31, 사용 ~2027-05-31, 노인 1961-12-31 이전·영유아 2019-01-01 이후). **해마다 5~6월 새 공고 → 금액·기간·출생일 기준·`EV_YEAR`·`APPLY_PERIOD`.** 잔액 이월 문구는 원문에 없어 안 씀.
- **`/eitc/`**: `src/utils/eitc.ts` — 금액은 법 공식이 아니라 **시행령 별표 11 산정표 규칙**(10만원 구간, 점증=미만·점감=이상 값, 천원 올림, 4만원 미만 0, 끝 경계 행)으로 재현, 원문 표 4,023지점 일치(`check-eitc.ts`). 2026 소득분까지 같은 기준. **세제개편안(2027 소득분: 2,600/3,700/5,200만·최대 180/310/360만) 12월 국회 통과 시 상수·`INCOME_YEARS` 갱신**, 번역 날짜(8/27·12/17·12/1)·간주전세금 55%·`sources.asOf`·별표 링크 시행일.
- **로또**: `public/lottoData.ts` 1188~1248회 추가(동행복권 새 경로 `lt645/selectPstLt645InfoNew.do`, 구 API 는 HTML 302). 갱신 `node scripts/update-lotto-data.mjs`(검사 자동, 실패 시 원복), 검사 `check-lotto-data.ts`. **방문자 브라우저가 제3자 CORS 프록시(allorigins·corsproxy)로 구 API 를 매번 부르던 자동 업데이트·버튼·`lottoUpdater.ts`·가짜 1100회 목 데이터 삭제.** **새 회차 자동 반영**: Pages Function `functions/api/lotto-latest.ts`(`?after=N` → N+1회부터 최대 50회, 엣지 캐시 토 20시~일 6시 KST 10분·그 밖 1시간, 실패 502 no-store) + `lottoDataLoader.getLottoData()` 가 정적 데이터에 메모리로 합침(페이지당 요청 1번, localStorage 경로 삭제). 파서는 `src/utils/lottoRemote.ts` 하나(갱신 스크립트도 사용), 검사 `node scripts/check-lotto-remote.ts [--live]`(이 PC 에서 live 통과). **배포 후 확인: `curl "https://toolhub.ai.kr/api/lotto-latest?after=1245"` 가 draws 3개 이상 — Cloudflare 해외 IP 가 동행복권에 막히면 502(OPINET 전례), 그땐 정적 갱신만으로 운영.** next dev 에선 Function 이 없어 404 → 정적만. LottoGenerator 하드코딩 색(purple·green·yellow) 남음.
- **홈 시즌 카드**(`seasonalPicks.ts`, `check-daily-puzzles.ts` 갱신): 건배사 12/19~24, 정시 1/2~1/7(원서 마감 D-n), 겨울 축제 1/8~2/10. 다가오는 일정에 정시 원서 마감(1/7)·에너지바우처 마감(12/31, 같은 날이면 고향사랑기부가 먼저). 2슬롯 경쟁 때문에 1월엔 salaryNewYear 카드가 가려짐.
- 작은 것: 건배사 결과 제목 "건배사 N개"(`greetingGenerator.resultsTitleToast`), 결정 도구 바 영어 UI(`DecisionToolsBar` 클라이언트화 — 한국어 HTML 동일, aria-label 만 "랜덤/결정"), `/roulette` 저장 이미지 "돌림판", 사다리 하나씩 공개 후 포커스 유지, 수능 D-day approx·lateFeb 삭제, `lotto.a11y.checkLatest` 삭제.
- 검증: 전체 tsc 0, lint 0 errors, audit 미해결 0, check 9종 PASS, dev 375px·라이트/다크·영어 바·로또 프록시 요청 0.

### 0-1. 2026-11-07 신규 2종 (사용자 기획 승인)

- **`/winter-festivals/` 2026-27 겨울 축제 일정**: `src/lib/festivals.ts` 12곳(확정 4: 화천 산천어 1/9~31·서울빛초롱 12/11~1/31·아침고요 12/4~3/14·해운대 11/29~1/18, 나머지 8곳은 지난 시즌 실제 기간으로 "예년"). **공지 나오면 갱신**: 평창송어·홍천강 꽁꽁·철원 한탄강·포천 동장군·태백산 눈·대관령 눈꽃·함평 겨울빛·광복로 트리 → `SOURCES` 에 `<id>2027` + `dates` + 번역 `guide.sources.items.<키>` → `node scripts/check-winter-festivals.ts`. 아침고요·해운대는 관광공사에만 날짜 — 주최 측 누리집 갱신되면 대조. 인제 빙어(3년 연속 취소)·안동 암산(2026 취소)·보성차밭 등은 근거 부족으로 뺐음.
- **`/toast-speech/` 건배사 모음**: 인사말 생성기 재사용(`GreetingGenerator` 에 `defaultSituation`·`embedded` prop — 기존 /greeting-generator 동작 그대로 확인) + 건배 구호 31개(`src/utils/toastChants.ts`, greetings.ts toast 구호와 선창·후창 일치를 `check-toast-chants.ts` 가 검사). 생성기 결과 제목이 건배사에서도 "인사말 5개"(기존과 같음) — 바꾸려면 greetingGenerator 키 추가.
- 2027 시험 일정은 보류: 큐넷 2027 시행계획 공고 전(작년 11/27·12/4), 한능검 2027 은 국사편찬위 사이트에 아직 없음. **11월 말 재확인 후 기획.**
- 검증: 전체 tsc 0, 새 파일 lint 0, audit 미해결 0, check 2종 PASS, dev 375px 넘침 0·라이트/다크·h1 하나·번역 키 노출 0.

### 0. 2026-11-07 정보형 신규 3종 (사용자 기획 승인, 서브에이전트 3개 병렬)

- **`/civil-servant-pay/` 공무원 봉급표·실수령액**: `src/utils/civilServantPay.ts`(인사처 2026 봉급표 별표3·10·11을 HTML 파싱, 표본 28칸 assert — `scripts/check-civil-servant-pay.ts`). 공제 = 공무원연금 기여금 9%(기준소득월액 = 이번 달 과세 보수로 근사, 160% 상한은 2026 평균액 고시를 못 찾아 미적용) + 건보·장기요양(`fourInsurance`) + `wageTax`. 정액급식비 16만(비과세)·직급보조비(별표15, 과세). **2027은 정부안 3.9% 일률 추정(100원 반올림) → 2027년 1월 공무원보수규정 개정되면 확정 표로 교체(`TODO(2027-01)`), 군인 봉급표 탭 추가 검토.** 2027 3.9% 출처는 언론(SBS Biz) — 정부 원문 보도자료 찾으면 교체.
- **`/jeongsi-2027/` 2027학년도 정시 일정**: `src/utils/jeongsi.ts`(대교협 2027 시행계획 주요사항 2025-04-30 원문 + 2026-07-31 기본사항 개정본 대조, 수능 11/19·성적 12/11). 대학별 마감 시각·군별 고사일은 "대학별". 내년엔 폴더 복사해 `/jeongsi-2028`. 이 작업에서 `csatDday.ts` 추가모집을 원문대로 2/19~26 으로 고침(예전 "2월 말" 근사).
- **`/seasonal-food/` + `/seasonal-food/1/`~`/12/` 이달의 제철 음식**: `src/utils/seasonalFood.ts` 79품목(농사로 이달의 식재료, 해수부 이달의 수산물 2017~2026 선정 기록). **12월 해수부 이달의 수산물 발표되면 `MOF_PICKS[12]`·`mofPick.m12`·`guide.sources.asOf` 교체**(지금은 2025-12 대게류·대구). 공공데이터 제철농식품 CSV(15151241)·농사로 API 키가 있으면 대조 가능. 월 페이지 FAQ JSON-LD 는 루트에만. `RelatedTools` 에 `href` prop 추가(메뉴에 없는 하위 경로용).
- 검증: 전체 tsc 0, 새 파일 lint 0, i18n audit 미해결 0, check 4종(+csat-dday) PASS, dev 375px 가로 넘침 0(제철 달력 sr-only 가 넘침 만들던 것 `relative` 로 수정)·라이트/다크·번역 키 노출 0. 빌드본 확인은 배포 때.

## 2026-11-06 10연속 개선 배치 (2026-11-07 운영 배포)

- **김장 계산기**: aT 2026 김장비용 조사 아직 미발표(11/6). 2024는 11.19, 2025는 11.18 보도 → **11/17~20께 재확인**. 총액만 나오면 `AT_TOTAL_2025` 참고 총액만 교체(품목별은 2024.11.21 유지). 11.3 농식품부 대책 기사의 238,280원은 10월 하순 기준·조사기관 미확인이라 안 씀.
- **스키장**: 11/6 기준 휘닉스 11/27·알펜시아 11/28 외 공지 없음. 용평·하이원 "11월 말", 곤지암 "12월 중"(11/17 제설 시작). 지산 얼리버드 공지 본문은 사람이 확인.
- **보금자리론**: 공사가 11/1 공시(10월과 동일) 뒤 **11/9부터 전 만기 +0.10%p** 재공시 → 11/9 값 반영(11/8까지는 이전 금리). 매월 갱신 절차는 `src/utils/bogeumjari.ts` RATE_BASIS 주석(현재→PREV, 같은 달 재공시면 PREV 유지).
- **계산 API·MCP**: /api/calc/retirement·unemployment·minimum-wage, MCP 도구 8개. 배포 후 `tools/list` 로 8개 확인.
- **YMYL 근거·기준일**: 18곳에 근거 상자/기준일 줄(b2a0f752). law.go.kr 은 없는 조문도 200을 돌려줘서 조문 단위 URL(지방세법 제12조·주택임대차보호법 제7조의2·소득세법 제129조·조특법 제86조의3·제95조의2 등)은 법령명까지만 확인됨. 빌드 후 `node scripts/audit-seo-static.cjs out` 재측정.
- **`/manito/` 마니또 뽑기(db5cb66c)**: 배정·링크 로직 `src/utils/manito.ts`(검사 `scripts/check-manito.ts`). 링크 = `#1`+가린 JSON(XOR+base64url, 암호 아님 — 화면 문구도 그렇게 안내). 받는 쪽은 hash 를 useSyncExternalStore 로 읽어 정적 HTML·첫 렌더는 진행자 화면. 첫 화면 예시는 시드 1 고정이라 명단을 고치면 무작위 시드로 바꾼다(같은 명단을 넣어 배정을 재현하는 부정 방지). 12월 홈 시즌 카드에 넣을지 검토.
- **`/calendar-2027/` 2027 달력(cd32e1fa)**: `src/utils/yearCalendar.ts`(24절기·명절은 천문연 달력자료 2027을 그대로 — 검사 `scripts/check-year-calendar.ts`). **해마다 11월 초**: 천문연 calendarData?year=다음해 로 SOLAR_TERMS·CUSTOM_DAYS 추가 → `src/app/calendar-2027` 폴더를 `calendar-2028` 로 복사(YEAR·TITLE 리터럴·DESC·FAQ 숫자) → menuConfig·번역·OG. 천문연 2026 페이지는 2026.4 공휴일 규정 개정 전 자료라 노동절·제헌절이 없음(사이트 데이터가 맞음).
- **`/dividend-calculator/` 배당금 계산기(cd32e1fa)**: `src/utils/dividend.ts` 조문 주석(소득세법 §129·§14, 조특법 §104의27 고배당 분리과세 2026~2028 사업연도, ISA §91의18, 건보 시행규칙 §44). 미국 조약세율 15%는 국세청 원문 미확인(입력칸 기본값). 종합과세 추가 세액은 계산하지 않고 안내만. 검사 `scripts/check-dividend.ts`.
- **2026-11-07 신규 7종(사용자 기획 승인, 2026-11-07 운영 배포 — 10개 새 페이지 200·h1 확인, /api/wind-chill 16곳 응답 확인, IndexNow 21+32 URL 전송 200)**: `/wind-chill`(24573a7d) · `/dependent-eligibility`·`/json-to-typescript`(41cab118) · `/yut-nori`(464041e7) · `/child-growth`(94952cce) · `/youth-future-savings`(96cceebc) · `/basic-pension`(f1a69ba5).
  - 체감온도: 새 Pages Function `/api/wind-chill`(MET 16곳, 캐시 3h) — **배포 후 응답 확인**(next dev 에서는 안 돌아서 실데이터 임시 파일로만 확인함). 식·단계는 기상청 기상자료개방포털, 기상청 체감온도 생활지수는 2026-05-01 서비스 종료.
  - 피부양자: 시행규칙 별표1·1의2(2025.4.23 개정). 금융소득 1천만원 제외가 피부양자 판정에도 쓰이는지 **확인 필요**(결과 갈릴 때만 경고).
  - 아이 키: 36~227개월 LMS는 질병관리청 공식 계산기 곡선에서 L·S 역산(원본 xls 미확보, 차이 ≤1.5백분위수). 사용자가 「성장도표 데이터 테이블.xls」를 주면 교체. **2027년 12월 성장도표 개정판 공표 → 교체**.
  - 청년미래적금: 금융위 만기 예시 4개 일치. **3차 가입 일정·2027 예산안(우대형 15% 등) 확정 시 갱신**. 기여금 이자(기본금리)·특별중도해지 세부는 은행 상품설명서 근거.
  - 기초연금: 2026 고시값. **12월 말 2027 선정기준액 고시·1월 기준연금액 확정 시 갱신**, 차등 지급·부부감액 축소는 법 개정 필요(미확정). 이자 4만원 공제 단위·부부 소득역전 배분은 확인 필요.
  - 윷놀이: 게임 허브에서 AI 전용 게임은 온라인 대전 버튼을 숨김(GameHub). 관련 도구 목록은 4·6개 규칙(check-related-tools) — 새 링크 넣을 때 개수 확인.
- **남은 것**: DecisionToolsBar(15페이지 공용 서버 컴포넌트) 한국어 하드코딩, 돌림판 저장 이미지 문구가 /roulette 에서도 "메뉴 룰렛", 사다리 결과 공개 후 포커스가 행에서 빠짐, 건강보험 상·하한·점수당 금액은 12월 2027 고시 후 갱신.

## 2026-11-06 AI 검색·에이전트 대응 (2026-11-07 운영 배포 — /mcp 도구 8개·/api/tools·/api/calc 7종 운영 응답 확인)

- **`public/llms.txt`**(llmstxt.org 형식): `scripts/generate-llms-txt.cjs`가 menuConfig·ko 번역으로 만들고, `generate-redirects-rss.js` 끝에서 함께 돈다(도구 추가 때 자동 갱신). 맨 위에 연말·연초 핵심 13개와 계산 API 안내. robots.txt 주석으로 위치 표시.
- **`/api/calc/{salary|four-insurance|age|sun|retirement|unemployment|minimum-wage}`**: 페이지와 같은 utils로 계산한 JSON(CORS *, 캐시 1시간, noindex). 정적 HTML은 기본값 결과라 에이전트가 쿼리 값을 정확히 받으려면 이 API가 필요. 명세 `public/openapi.json`, 테스트 `scripts/check-agent-api.ts`(esbuild 번들 후 실행, 잘못된 입력 14종 400).
- 운영에서 AI 크롤러 UA(GPTBot·ClaudeBot·PerplexityBot·Google-Extended 등)는 200이었지만, Cloudflare AI 봇 차단은 실제 봇 IP로 판단하므로 **대시보드(보안 → 봇 / AI Crawl Control)에서 차단 여부 확인 필요**(사용자).
- **IndexNow**: 키 파일 `public/39688abd60472a6f22b49655a86486b4.txt`(공개값), 전송 `node scripts/indexnow.mjs --recent 7`(또는 경로를 슬래시 없이 나열, `--dry-run`). api.indexnow.org(Bing 등 공유)와 네이버 서치어드바이저에 직접 보낸다. **배포 후에만** — 키 파일이 운영에 없으면 보내기 전에 멈춘다. 2026-11-06 첫 전송 완료(도구 10개 + 홈, api.indexnow.org 202 · 네이버 200). 다음 배포 뒤에도 같은 명령.
- **원격 MCP 서버 `/mcp`**(`functions/mcp.ts` → `src/lib/mcpServer.ts`): Streamable HTTP, 상태 없음, 인증 없음, POST JSON-RPC만(GET 405, 알림 202). 도구 8개 search_tools·net_salary·social_insurance·korean_age·sun_times·severance_pay·unemployment_benefit·minimum_wage — 계산은 `handleCalc` 재사용. 프로토콜 2025-06-18·03-26·2024-11-05 협상.
- **도구 검색 `/api/tools?q=`**(`src/lib/toolSearch.ts`): menuConfig + 공용 번역 ko·en 이름·설명 점수(이름 3·경로 2·설명 1, 흔한 말 0.2, 한 글자 낱말 제외). 테스트 `scripts/check-mcp.ts`(esbuild 번들 후 실행). 배포 후 `curl -X POST https://toolhub.ai.kr/mcp -H 'content-type: application/json' -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'` 로 확인. MCP 레지스트리 등록은 나중에(사용자 판단).

## 2026-11-06 스키장 개장일·날씨 (2026-11-07 운영 배포)

- **`/ski-resorts/`**: 12곳(`src/lib/ski/resorts.ts`). 2026/27 개장 목표가 나온 곳은 휘닉스 11/27·알펜시아 11/28뿐(11/6 기준), 나머지 `opening: null` → "공지 전 · 예년 시기" 표시, 추천은 예년 시기 첫날(11/21·12/1·12/11) 전 날짜를 "개장 전(예상)"으로 뺀다. **리조트 공지가 나오면 `opening`에 날짜·출처를 채운다(11월 중하순).**
- `/api/ski-forecast`: MET 12곳, 엣지 캐시 3시간. 09~17시 요약(`skiDays`)과 점수(`skiScore`: 날씨 60%·요일 혼잡 40%, 비 3mm·바람 14m/s 이상은 45점 상한). `scripts/check-ski.ts`. SW v4.35.10, 빌드 782p.

## 2026-11-06 나이표 · 2027년 달라지는 것 (2026-11-07 운영 배포)

- **`/age-table/`**: 1930년생~내년생, 올해·내년 만 나이·연 나이·띠(간지·색)·초등 입학(빠른년생 2002년 1~2월생까지), 띠별 나이, 설날 경계 안내(`lunarToSolar`로 1900~2050). 제목 연도는 빌드 시점. **FAQ의 2027 문구(정미년·양띠 나이)는 해마다 갱신.** `scripts/check-age-table.ts`.
- **`/changes-2027/`**: 13개 항목 시행일 순(2026.12.10 휴게 생략 ~ 2027.7 국민연금 상·하한), 숫자는 각 utils에서 계산(최저임금·4대보험·중위소득·실업급여 하한·아동수당 연령). 상단 요약: 월급 300만원 4대보험 +7,770원, 연봉 5,000만원 실수령 −11,000원. **12월 말 정부 「2027년부터 이렇게 달라집니다」 나오면 항목 보강**, 고용보험 2.0% 확정 시 eiRate 확정 처리·FAQ 숫자 갱신.
- 관련 도구·메뉴(계산기 > 기타)·OG·RSS, SW v4.35.9. 빌드 781p, 정적 HTML 팁 외 0, 375px 넘침 0·콘솔 오류 0.
- **배포 대기 묶음**(4f92f9ed·bcb56bb7·79facd07·이번): out/ 빌드본 최신. 배포 전에 dev 서버를 띄웠다면 다시 빌드.

## 2026-11-06 2027 4대보험 반영 · 4대보험 계산기 (커밋 4f92f9ed, 미배포)

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
