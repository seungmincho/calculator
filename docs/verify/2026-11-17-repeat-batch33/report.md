# 33차 완료 — 할인 후 구매 조건 비교

2026-11-17 KST. 기존 /discount-calculator/에 수량·금액 쿠폰·배송비를 포함한 최대4조건 비교를 연결했다. **자체33그룹·독립9그룹·실제 Chrome6/6·전체 타입 첫 실행 PASS**다. [계약](plan.md) · [통합 기록](integration-checks.json). 새 경로·판매처 조회·장기 저장은 없고 배포하지 않았다.

같은 상품의 할인 후 개당 가격×수량에서 상품 금액까지만 쿠폰을 빼고 배송비를 더한다. 실제 적용/초과 쿠폰, 총액과 개당 평균의 별도 공동 최저를 표시한다. 빈칸·소수·음수·범위 초과를0으로 바꾸지 않으며 모든 행이 유효할 때만 전체 반출한다. 기존 세 계산 모드와 최대3단계 할인은 유지하고 현재 결과 가져오기는 클릭 당시 화면과 같은 원 단위 반올림을 적용한다.

숫자 조건만 비교 링크에 담고, 직접 입력한 이름과 중복 할인 단계는 제외한다고 안내한다. 이름은 전체 복사/TXT에 포함될 수 있다. 기본 링크와 비교 링크의 범위를 구분하고 관계없는 query/hash/history.state를 보존한다. 복사/TXT/공유는 같은 snapshot과 최신 요청을 사용하며 실패 시 전체 원문 선택·재시도·닫기를 제공한다.

## 구현·독립 검토

[작성자 보고서](discount-comparison-implementation.md): 순수10+actions3+실제 child7+부모9+ShareResult 경합4=33그룹 PASS. 준비 검사 중 영향을 받지 않은 부분은 다시 실행하지 않았다. 준비6파일 및 마지막 영향4파일 scoped lint 오류·경고0이다.

[독립 검토](discount-independent-review.md):9그룹 PASS·검사 JS lint0, 미해결 결함0. 별도 BigInt 산식으로700×4조건과 공동 최저 집합, 실제 부모/child/ShareResult의 URL·반출·실패 경계를 대조했다. 검증은 실제 컴포넌트에 제어 I/O 포트를 연결한 범위이며 native 검증과 구분한다.

두 경계를 발견해 수정했다. 전체 내역 복사 대기→새 공유 링크 성공→옛 거부에서 legacy fallback1회(기대0)가 실행되던 문제는 모든 반출의 양방향 요청 무효화로 해결했다. 이후 독립 검토에서 입력/언어 A→B→A 왕복 시 과거 복사 성공 안내가 부활하는 P2를 재현했다. 피드백에 요청 token을 보관하고 표시 시 최신성도 확인하도록 보완한 뒤 자체 추가2·관련 공유4, 독립 영향4, 실제 Chrome copy1흐름을 통과했다. 영향 재실행은 그룹 수에 중복 합산하지 않았다.

## 실제 브라우저

[최종 리뷰](review-browser.md) · [결과 JSON](browser/final-results.json):6/6 PASS, 최종06:44:02 KST Chrome 종료. 첫6개 통과는 뒤에 발견한 피드백 경계 이전 증거이며, 수정 후 copy1만 재확인한 최종 결과다. JS pageerror·hydration·unhandled 오류0이다.

- 기존3모드·0원·잘못된 최종가,101원의15% 할인86원/연속 할인73원 가져오기,4조건 한도·BigInt 산식·분수 단가/총액 공동 최저·미완 입력 보류를 확인했다.
- 실제 숫자 링크 새 방문, 이름 제외·기본 링크 분리·관계없는 query/hash/state 보존과 잘못된 버전 전체 거부를 확인했다.
- native Clipboard와 실제 UTF-8 TXT1,927바이트가 일치했고1080×1350 PNG113,895바이트에4조건 총액/단가가 표시됐다. Windows Clipboard CRLF는 논리 비교에만 정규화하고 TXT 원 bytes는 보존했다.
- 수동 선택 실패/선택/재시도, 기본↔전체↔공유의 늦은 거부 fallback0, 성공 timer/SPA 이탈과 A→B→A 안내 부활0을 확인했다.
- 320px 다크 KO/EN에서 가로 넘침0, 입력16px/조작44px와 조건 보존을 확인했다.

고정 헤더가 긴 element 캡처 중간에 겹친 artifact는 문서 가로 overflow와 구분했다. 실제 OS 공유창·판매처 정책·모든 모바일 기기 검증은 범위 밖이다. 이미 OS에 제출한 Clipboard 작업 자체를 취소할 수 있다는 보장은 하지 않는다.

## 공용 통합·타입

ko/en72leaf(작성자65+가이드7), 정적117사용·오류0을 확인했다. description/OG/Twitter/JSON-LD·FAQ·showcase와 menu updatedDate2026-11-17을 실제 기능에 맞췄다.34와 함께 생성/check1,578파일·apply0·audit own543+child6/미해결0(기존 동적 알림60), 공용3파일 lint0을 통과했다. 발견 파일은 redirects472/RSS382/llms315도구·45,715바이트다.

33/34는 같은 전체 타입 실행을 공유한다. 모든 TS writer 고정과 Chrome 종료 후 **06:44:29 KST, 여유4.29GiB, node --max-old-space-size=2048 node_modules/typescript/bin/tsc --noEmit 첫 실행 exit0·진단0**이다.36/37의 안정된 미연결 준비 파일도 타입에 포함됐지만 해당 부모 기능 완료를 뜻하지 않는다. [34차 기록](../2026-11-17-repeat-batch34/integration-checks.json).

현재 제품/공용 범위 diff와 문서 링크 확인은 통합 기록에 남겼다. 저장소 전체 lint·운영 정적 export 성공으로 확대하지 않는다. 빌드·배포·dev 재시작·커밋·푸시는 실행하지 않았다.
