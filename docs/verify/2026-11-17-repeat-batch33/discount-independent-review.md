# 33차 할인 비교 독립 검토

2026-11-17 KST, team_rotation. 제품은 작성자 소유이며 이 담당은 제품 TS를 수정하지 않았다. 계약/도메인/실제 부모·비교 child·ShareResult를 읽고 독립 기대값을 작성했다. 원저자 assertion을 실행/재사용하지 않고 일반 hook/DOM host만 재사용한다.

## 현재 결과

`check-discount-independent.mjs`의 **최종9그룹 PASS**, 검사 JS scoped lint **exit0·오류0·경고0**다. 최초8그룹 PASS 뒤 추가1그룹에서 아래 P2를 재현했고, 작성자 수정 후 `--copy-only`로 새 회귀1+영향3그룹을 재확인해 모두 통과했다. 영향 재실행을 새 검사 수로 더하지 않는다. 독립 검토의 미해결 결함은 없다.

통과 범위:

1. 고정 seed의700개×4조건을 별도 BigInt 산식으로 계산해 total/applied/excess/subtotal 및 총액/분수단가 최저 집합 대조. 총액 최저와 단가 최저가 다른 경우·표시 둘째 자리는 같지만 실제 분수가 다른 경우도 포함.
2. 숫자만 담는 v1 URL과 전체 무효 정책, 이름/ID 미포함, 빈칸·소수·부호·지수·초과를 원문에 남기고 전체 capture/최저 보류.
3. 실제 부모의 초기복원 전0 URL쓰기·조작 disabled, Strict mount replay 후 유효 RAF1개, 기본 입력/비교 동시 복원, 관계없는 중복 query/hash/history.state, 비교 수정 뒤 옛compare 제거·기본 reset/탐색 뒤 초안 보존.
4. 실제 기존3모드/순차할인 계산과 클릭 시점 원 단위 가져오기·이후 기본 입력과 독립·4개 한도·잘못된 기존 최종가 차단.
5. 실제 중복 compare 전체오류·기본 입력 복원 유지, 미완행/0원·locale 후 원문 보존/전체 반출 보류, 새 숫자 링크 재방문.
6. 기본 copy↔비교 copy↔실제 ShareResult copy의 양방향6조합. 새 복사 성공 뒤 옛 native rejection이 자동 legacy fallback/복구를 실행하지 않음.
7. 세 컴포넌트의 옛 성공 timer를 새 실패 뒤 실행해도 최신 복구 유지. native 거절/legacyfalse/true, 기본·비교 readOnly 원문/재시도.
8. 비교 복사와 TXT 실제 UTF-8 Blob bytes 동일, 고정 파일명/전체 이름, 늦은 ShareResult renderer 뒤 TXT 우선·이탈 뒤 old copy 무효·URL 정확1회 정리.

## 재현·해결한 P2 — 복사 피드백 A→B→A 부활

복사 성공 후 원가100000→123→100000 또는 KO→EN→KO로 되돌아오면 기본 Check 아이콘/비교 ‘복사됨’ 안내가 다시 나타난다. 다른 문맥 B일 때 이미 옛2초 callback을 실행해도 A복귀 후 표시가 살아난다. native 복사 자체가 다시 실행되는 결함은 아니며 **무효화돼야 할 과거 상태 안내가 부활하는 경계**다.

원인은 BasicCopyFeedback.context와 비교 Feedback.scope의 문자열만으로 표시 여부를 판정하는 데 있다. 값 왕복으로 문자열이 같아지면 옛 state가 다시 보인다. 그동안 guard는 무효화돼 옛 timer가 현재 성공 안내를 정리하지도 않는다. 독립 마지막 그룹에서 basic/비교×input/locale4조건 전부 `resurrected:true`(기대false)로 확인해 root/작성자에게 전달했다.

작성자가 양쪽 피드백에 실제 action token을 보관하고 `current(token)`까지 확인하도록 최소수정했다. `node --experimental-strip-types docs/verify/2026-11-17-repeat-batch33/check-discount-independent.mjs --copy-only`로 같은4조건을 유지해 전부 `resurrected:false`를 확인했다. 양방향6조합 late refusal, 세 옛 성공timer/최신 수동복구, 실제 TXT bytes/공유 renderer 취소의 영향3그룹도 PASS다. 독립 담당의 제품 수정은 없다.

## 검증 한계

실제 제품 함수를 esbuild로 묶고 일반 React hook/event host에서 실행한다. 부모·child·ShareResult 각각의 실제 state/effect/handler를 연결하며 Clipboard, renderer, RAF/timeouts, DOM selection/anchor는 제어 포트다. 실제 Blob 바이트를 비교했지만 PNG pixel/native OS 공유·Windows Clipboard·DOM 포커스·320px 레이아웃은 native 담당 증거로 구분한다. 저장소/가격 조회·외부 판매처/송금은 없다.

초기 독립 host에서 번역 `t.raw` 포트를 누락해 가이드 배열 렌더가 실패한 것은 fixture만 수정했다. 산식/제품 기대를 약화하지 않았다. Chrome/전체 tsc/빌드/커밋은 실행하지 않았다. 36 미연결 준비 TS는 계속 freeze다.
