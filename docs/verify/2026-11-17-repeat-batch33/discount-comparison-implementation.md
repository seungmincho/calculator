# 33 할인 조건 비교 — 부모 연결 완료

2026-11-17 KST.31/32/38 전체 타입 체크포인트 뒤 승인된 부모 연결이다. 제품 TS는 아래 자체 검증을 마친 안정 상태이며 독립/브라우저 발견 대응 외 편집을 멈춘다. 빌드·배포·커밋·Chrome·전체 tsc는 실행하지 않았다.

## 구현 범위

- 기존 `DiscountCalculator.tsx`의 세 모드와 최대3개 연속 할인 계산식을 유지하고 `DiscountComparison.tsx`를 같은 경로에 연결했다. 비교 조건은 기존 계산·중복 할인·초기화와 별도 상태다. 기본 결과/중복 결과 가져오기는 클릭 당시 최종 금액을 기존 화면과 같은 `Math.round`로 한 번 반올림한다. 원가보다 큰 최종 가격은 기본 가져오기를 막는다.
- 최대4조건의 정수 가격·수량·금액 쿠폰·배송비,0원/빈칸 구분, 상품 금액까지만 쿠폰 차감, 총액/개당 평균의 별도 공동 최저는 준비 helper 그대로다. 모든 존재 행이 유효할 때만 전체 snapshot/복사/TXT/공유가 가능하다. 미완/무효 행은 그대로 보이고 유효 개수를 표시한다. 개당 최저는 반올림 전 정수 교차곱으로 비교한다.
- 초기 SSR/첫 client 트리는 기본 상태로 같고 `requestAnimationFrame`에서 기본5개 입력과 `compare` 전체를 한 번 복원한다. 복원 전 writer/조작/반출은 비활성이다. 동일한 query key가 여러 개인 비교 링크도 전체 무효로 안내하며 일부 행만 복원하지 않는다.
- 기본 URL writer는 현재 URL을 바탕으로 main5개 key만 갱신한다. 원래 관계없는 query(중복값 포함),hash,history.state를 보존한다. 비교 입력을 수정하면 기존 compare를 제거하고 이후 기본 입력/초기화에서도 되살리지 않는다. 새 비교 링크는 명시 공유할 때만 생성한다. hash/same-query popstate는 비교 이름/초안을 바꾸지 않는다.
- ‘기본 계산 링크 복사’는 compare 없이 기본 모드/입력을 담고, 비교 결과의 ShareResult 링크는 기본 입력+전체 유효 숫자 조건을 담는다. 이름은 링크/이미지 행 라벨에 넣지 않으며 전체 복사/TXT에는 포함될 수 있다. 기존 중복 할인 단계는 링크에 포함되지 않는다는 안내를 추가했다.
- 실제 공용 ShareResult38의 `resultKey`를 사용한다. 비교 전체 복사/TXT와 공유 링크/이미지, 기존 기본 결과 복사는 서로의 늦은 반출을 취소한다. 입력/locale/URL/새 요청/언마운트 경계를 보존한다. native 실패 뒤 legacy 성공을 확인하고, 실패 시 정확한 읽기 전용 원문/재시도를 제공한다. focus/select 실패도 안내하며 원문을 유지한다.

## 소유 파일과 번역

제품: `src/components/DiscountCalculator.tsx`, `DiscountComparison.tsx`, `src/utils/discountComparison.ts`, `discountComparisonActions.ts`.

자체 검사: `scripts/check-discount-comparison.ts`, `check-discount-comparison-actions.ts`, `check-discount-comparison-components.mjs`, `check-discount-comparison-parent.mjs`, `check-discount-share-ownership.mjs`.

`translations-discount-comparison.json` KO/EN `discountCalculator.comparison` 최종65leaf. 준비58에 기본 링크/초기화/중복율 접근성/복사 복구7키를 추가했다. 공용 메시지/가이드/메타는 integrator만 반영한다.

## 자체 검증

준비 **10domain+3actions+6child**, 연결 **8actual-parent+4actual-ShareResult 경합**, 합계 **31그룹 PASS**. 계산 helper는 변경하지 않아 준비13그룹은 다시 실행하지 않았고, 영향을 받은 실제 자식6과 새 부모8/공유4를 실행했다. 새 부모/자식/검사2개 scoped ESLint exit0·경고0이다. 초기 lint의 불필요 memo 의존성1개는 단순 URL 계산으로 제거했다.

```powershell
node --experimental-strip-types scripts/check-discount-comparison-parent.mjs
node --experimental-strip-types scripts/check-discount-share-ownership.mjs
node --experimental-strip-types scripts/check-discount-comparison-components.mjs
npx eslint src/components/DiscountCalculator.tsx src/components/DiscountComparison.tsx scripts/check-discount-comparison-parent.mjs scripts/check-discount-share-ownership.mjs
```

부모8그룹은 초기 복원 전0쓰기, 전체/중복 잘못된 compare, main5개+숫자 조건 재방문, unknown query/hash/history state, 비교 편집→기본 편집/초기화 시 오래된 compare 부활 차단,3모드/연속 할인 수치,원단위 가져오기 후 원본 독립,원가0/잘못된 최종가격,모든행 유효 반출,기본/비교 복사 경합·수동 선택 예외를 검사한다.

루트 검토가 제안한 전체 복사→공유 링크 경합은 수정 전 실제 자식+실제 ShareResult hook/event fixture에서 재현했다. 전체 복사 대기→새 링크 native 성공→옛 native 거절 때 legacy 호출이 **1회(기대0)** 발생했다. 보완 후 양방향 clipboard와 이미지 대기→TXT 우선,focus/select 예외를 포함한4그룹이 통과했다. I/O만 모의하며 실제 공용 컴포넌트를 실행한다. 이미 OS에 전달된 native 작업 자체의 취소를 보장하는 검사는 아니다.

첫 부모 fixture는 URLSearchParams가 원래 미인코딩 콜론/쉼표를 한 번 인코딩하는 정상 동작까지 ‘복원 후0쓰기’로 기대해 실패했다. 복원 **전**0쓰기와 복원 후한번정규화·이후동일주소생략으로 기대를 고쳤다. 또 자식 host의 MobileResultLink 외부 포트를 누락한 것은 fixture 구성만 수정했다. 제품 계산 결함으로 보고하지 않는다.

## 실제 브라우저 전달 경계/선택자

- 기본: `[data-discount-basic-mode="discountRate|finalPrice|discountAmount"]`, `[data-discount-basic-field="original|rate|amount|final"]`, `[data-discount-basic-action="reset|copy-link"]`, `[data-discount-basic-copy="original|rate|savings|final"]`, `[data-discount-basic-result]`.
- 기본 복구: `[data-discount-basic-manual]`, `[data-discount-basic-select]`, `[data-discount-basic-retry]`. 중복: `[data-discount-multi-rate="0|1|2"]`, `[data-discount-multi-add]`, `[data-discount-multi-remove]`, `[data-discount-multi-result]`.
- 비교: `[data-discount-comparison]`, `[data-discount-row]`, `[data-discount-field="name|unitPrice|quantity|coupon|shipping"][data-discount-id]`, `[data-discount-remove]`, `[data-discount-action="add|import-basic|import-multi|copy|txt|select-text"]`.
- 결과: `#discount-comparison-result`, `[data-discount-valid-count]`, `[data-discount-incomplete]`, `[data-discount-lowest="total|unit"]`, `[data-discount-result][data-discount-status]`, `[data-discount-value][data-discount-id]`, `[data-discount-feedback]`, `[data-discount-manual]`.
- 실제 공유: `[data-discount-share-boundary] [data-share-action="copy|share|save"]`, 공용 `[data-share-recovery]`.
- 비교 URL: `compare=v1:unit,quantity,coupon,shipping;...` 최대256자/4행. 예: `?mode=discountAmount&original=15000&rate=17&amount=2000&final=13000&compare=v1:80000,1,0,0;76000,1,0,5000&keep=1#result`. decoded 숫자만, 이름은 기본 라벨로 복원한다.
- TXT 고정 `discount-comparison.txt`, 전체 조건/모든 산식 항목/공동 최저를 포함한다. 이미지 파일 stem `discount-comparison`, 최대4행 라벨은 조건1~4이며 각 행은 총액/개당 평균이다.

## 독립 A→B→A 발견 보완

독립 team 검토에서 기본/비교 복사 성공 안내가 입력 또는 locale A→B→A 왕복 뒤 다시 나타나는 P2를 재현했다. 현재 내용 문자열만 같으면 옛 feedback를 표시하고, 무효화된 옛 타이머도 지우지 못하던 경계다. 최초 native6/6은 이 추가 경계 전의 별도 증거다. Chrome 종료 후 기본/비교 Feedback에 완료 요청의 guard token을 함께 보관하고 표시 시에도 `current(token)`을 확인하도록 최소 보완했다.

추가 자체 parent1+child1에서 성공/실패복구/TXT 안내·옛 타이머·URL/locale 왕복 뒤 옛 안내가 돌아오지 않고 새 요청은 정상 표시됨을 확인했다. 관련 실제 ShareResult 교차 반출4도 PASS, 영향4파일 ESLint0·경고0. 최종 자체 누적은 **10domain+3actions+7child+9parent+4shared=33그룹**이며 기존 통과 검사 전체를 반복하지 않았다. 번역/계산/URL 형식 변경은 없다. 제품 TS 다시 안정·고정 상태다.

native A→B→A 영향 재검사와 전체 타입은 지정 담당 검증에 남아 있다. 이 문서는 자체 fixture를 Chrome 성공으로 주장하지 않는다.
