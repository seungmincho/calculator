# 33 할인 비교 미연결 준비

2026-11-17 KST.28/30 체크포인트 뒤 승인된 준비이며 **기존 DiscountCalculator/ShareResult/공용 번역은 아직 수정하지 않았다.** 부모 연결은31/32/38 체크포인트 뒤 별도 신호를 따른다.

## 단위1 — 순수 계산·snapshot·v1 링크

`src/utils/discountComparison.ts`, `scripts/check-discount-comparison.ts` 완료. **10그룹 PASS**, 두 파일 scoped lint exit0·경고0이다. 별도 BigInt oracle840금액 조합과900분수 순서 조합, 총액/개당 독립 최저·공동 최저, 표시상 같지만 실제 다른 분수, 최대 교차곱998,010,990,000,000의 안전 범위를 확인했다.

빈칸/0/선행0/지수형/소수/부호/범위/이름40 code point/4조건/잘못된 ID를 검증하며 초안을 덮지 않는다. 일부 무효이면 개별 유효 결과만 보이고 전체 최저 및 capture는 보류한다. capture는 전체 숫자/이름/산식을 projection·freeze해 원래 배열 변경과 분리한다. 현재 계산 가져오기는 기존 Math.round를 한 번 적용한 후 범위를 확인한다.

API는 `evaluateDiscountComparison`, `captureDiscountComparison`, `createDiscountCondition`, `createDiscountComparisonExamples`, `encode/decodeDiscountComparison`, `discountComparisonUrl`, `formatDiscountComparison`이다. 링크 key는 `compare`, 형식은 `v1:unit,quantity,coupon,shipping;…`, 원문256자/최대4행이다. 숫자 이외 이름/id/계산 결과는 넣지 않고 전체 파싱 실패는 일부 복원으로 바꾸지 않는다. 정규 자체 export 최대154자와 정확256/257 경계를 검사했다. URL helper는 기존 main params/기타 query/hash를 보존한다.

## 단위2 — 전체 복사/TXT 액션

`discountComparisonActions.ts`와 `check-discount-comparison-actions.ts` **3그룹 PASS**. 입력/새 요청/언마운트 뒤 늦은 clipboard 거절이 fallback을 실행하지 않으며 native 성공·legacy true/false·예외를 구분한다. TXT는 정확한 UTF-8 전체 내용과 고정 `discount-comparison.txt`를 사용하고 URL 생성 중 무효화·실패·언마운트의 임시 URL 단일 해제를 확인했다. 이미지/공유 링크 액션을 지역 복제하지 않았다.

## 단위3 — 미연결 controlled 자식·번역

`src/components/DiscountComparison.tsx`와 `scripts/check-discount-comparison-components.mjs` **6그룹 PASS**. 실제 컴포넌트의 props/event/effect를 실행하고 native I/O만 포트로 대체했다.

- 기본2조건 즉시 결과, 미완/오류 행 표시·유효 개수·전체 최저/복사/TXT/ShareResult 보류,0과 빈칸 구분.
- 명시 기본/중복 결과 가져오기·기존 Math.round·이후 원본 변경과 분리, 최대4개/이름40 code point/삭제된 행의 옛 handler 무효.
- 다른 수량의 총액/단가 공동 최저,4조건 카드 요약·이름 없는 숫자 링크와 전체 clipboard/TXT 동일 snapshot.
- 늦은 clipboard 거절/fallback 차단, 수동 readOnly 선택·재시도, 이전 성공 타이머가 새 안내를 지우지 않음.
- TXT 저장 실패 후 입력/결과 유지, createObjectURL 중 외부 수정으로 stale가 되면 download 차단.
- locale/기본 URL/revision 변경의 늦은 액션 무효화, 사용자 초안 유지, ready 전 편집/공유 차단.

초기 이름 초과 fixture는 `긴 이름😀` 8회가 정확40 code point인데 초과라고 기대해 실패했다.9회로 경계 fixture만 고쳤고 제품 코드 변경은 없었다.

자식 props는 `rows/onChange/revision/ready/baseUrl/basicPrice/multiPrice/linkError?`다. 부모가 모든 입력/복원에 revision을 증가시키며, 이 자식은 주소나 저장소를 직접 쓰지 않는다. 이름/숫자 입력은 원문을 보존하고 삭제/추가는 안정 ID를 사용한다. `ShareResult`에는 string resultKey와 클릭 대상 card/url/text를 전달하지만 **실제 공유 비동기 수명은 root 소유38 보완에 의존**한다. 이 검사는 ShareResult를 props 관찰 포트로 대체했으므로 공용 renderer/native 공유 성공을 주장하지 않는다.

`translations-discount-comparison.json`은 KO/EN `discountCalculator.comparison` **58키**, placeholder 일치를 검사했다. canonical 원본은 수정하지 않았다. 이름/숫자 필드·모바일1열/16px/44px·전체 결과 이동·공유 요약과 상세의 범위 문구를 포함한다.

## 최종 안정 상태

신규6개 TS/JS 파일 모두 scoped lint exit0·오류/경고0, 자체 **10+3+6=19그룹 PASS**. 제품 파일은 안정 상태로 편집 중지한다. 기존 부모·기존3모드/중복 할인·URL writer·공용 ShareResult·canonical은 미수정이다.31/32/38 체크포인트 뒤 부모 연결 신호까지 기다린다. 부모의 초기 hydration/query 공존과 실제 공유 이미지·native 복사/TXT·320px 브라우저·전체 타입은 아직 남아 있다.
