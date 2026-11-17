# 32 JSON Formatter 독립 검토

2026-11-17 KST. 검토 담당 `gpa_scenarios`. 작성자 final ready 뒤 실제 제품 소스와 설치된 jsonpath-plus/JSON5를 대조했다. **독립12그룹 PASS, 추가 제품 결함/수정 요청 없음.** 제품·기존 검사·공용 파일은 수정하지 않았다.33 준비 TS도 고정한 상태이며 Chrome/전체 타입/빌드는 실행하지 않았다.

## 방법과 경계

`node docs/verify/2026-11-17-repeat-batch32/check-json-tree-independent.mjs`

작성자의 assertions·준비 probe·부모 fixture는 실행하거나 복사하지 않았다. `json-formatter-harness.mjs`의 일반 componentHarness/all/text host만 사용하고 별도 own-property resolver, Pointer decoder, 재귀 통계 oracle, 실제 부모 이벤트 fixture를 작성했다. host는 이전19차 hook/host에 memo와 async module 포트만 추가한 것으로, 실제 제품 TSX 몸체·TreeNode·private formatter/statistics 함수·선택 panel을 실행한다. CodeMirror/차트/Clipboard는 host 또는 I/O 포트다.

JSON Pointer는 공식 [RFC 6901 §3–5](https://www.rfc-editor.org/rfc/rfc6901.html#section-3)를 독립 열람했다. `~0`/`~1` escape, 역변환 순서, 빈 root와 `/` 빈 key, Unicode 정규화를 하지 않는 토큰 비교를 대조했다. URI fragment를 생성하거나 모든 JSONPath 구현 호환성을 주장하지 않는다.

## 통과한12그룹

1. **typed identity/Pointer:** 19종 키×3깊이의57경로를 별도 descriptor resolver·Pointer decoder와 대조했다. 빈 key/root, dotted/nested, 객체 `0`/배열0, `/`·`~1`·`~01`, 따옴표/역슬래시/개행/한글/emoji/Unicode 조합형을 분리한다. 상속 속성과 accessor는 읽지 않는다.
2. **설치 엔진 실제 노드:** 지원17종 키×6값=102개를 배열 안 객체·같은 primitive decoy와 함께 실행했다. 새 literal의 eval:false/wrap/resultType, 결과1개, 부모 객체 identity/실제 속성/value identity가 독립 resolver와 일치한다.6종 미지원 조상은 엔진 실행0회로 거부하며 같은 값의 다른 속성을 반환하는 포트도 합격시키지 않는다.
3. **own-key·비유한 값:** `__proto__`/`constructor`/`toString`/`hasOwnProperty` 정렬과 빈도를 독립 재귀 집계와 대조한다. 배열 순서를 유지하고 선택 subtree의 NaN/±Infinity는 JSON의 null로 조용히 바꾸지 않는다.
4. **긴 미리보기:** 50k 경계에 CRLF/surrogate pair를 놓고 페이지별 최대50,001단위·경계 비분할·전체 원문 재결합을 확인한다.
5. **실제 트리 동작:** `d.e`와 `d→e`를 따로 펼치고 각 leaf1/2를 명시 선택한다. 빈 key/숫자 객체 key/배열 label도 구분한다. 정렬은 같은 선택을 유지하면서 형식 key만 바꾸고 locale은 선택 key를 유지한다.
6. **실제 formatter/통계:** 특수 키 원문을 UI 정렬 후 실제 output editor에서 받아 parse해 동일 구조를 확인한다. 원문 입력은 그대로이고 실제 private 통계의 모든 타입/키 빈도/노드수/깊이가 별도 oracle과 같다. 실제 stats 모드의 차트 props도 존재한다.
7. **falsy/root/불가 경로:** null/false/0/빈 문자열/빈 객체/배열 root 선택과 빈 Pointer 실제 복사를 확인한다. 미지원 조상의 하위 JSONPath는 거부하지만 Pointer와 값0은 계속 반출할 수 있다.
8. **전체 긴 값:** 약12만 UTF-16 단위 문자열에서 실제 부모가 전달하는 전체 값, 실제 panel 페이지 재결합, native 포트의 복사 내용, 거절 후 recovery 전체 텍스트가 모두 일치한다. 트리100자 미리보기와 반출을 혼동하지 않는다.
9. **JSON5 계약 분리:** NaN/Infinity를 포함한 선택 값 JSON만 비활성화하고 Pointer/지원 경로와 유한한 형제값은 유지한다. 기존 전체 formatter의 JSON5→JSON null 직렬화 동작은 그대로임을 실제 전체 출력 복사로 확인한다.
10. **복사 경합·복구:** 선택 값→Pointer/전체 출력의 역순 완료, 입력 A→오류→A 왕복 뒤 옛 handler, 모드 전환, 현재 실패 readOnly 복구, root 빈 Pointer 재시도·legacy true, 언마운트 뒤 늦은 거절을 확인한다. 이전 거절은 새 fallback을 시작하지 않는다.
11. **기존 저장 쿼리:** 기존 v1 schema의12개 저장본은 parser가 수락하고13번째 추가는 기존limit로 거부한다. 실제 부모의 저장본 onLoad→임의 필터 Enter 실행은 이전 eval 옵션 계약(명시 eval:false 없음)을 유지하며 tree literal 검증과 분리된다. 입력/선택/실행 뒤 저장소 raw bytes와 URL은 그대로다. 저장 패널 CRUD/lock 자체를 이번 검토에서 다시 검증했다고 주장하지 않는다.
12. **늦은 literal import:** 선택 A 직후 import Promise가 처리되기 전에 미지원 선택 B로 바꾸거나 원문을 교체한다. 과거 경로 검증의 엔진 호출은0이며 최신 선택/원문만 남는다. 후속 최신 유효 경로는 엔진1회로 정상 검증한다.

## 결과와 남은 확인

최초 독립 실행11그룹과 추가 async import 경계1그룹을 각각 실행해 모두 통과했다. 이미 통과한11그룹은 마지막 경계 추가 때 반복하지 않았다. 작성자 검사를 재실행한 건수를 추가하지 않았다. 신규 독립 JS 범위 lint는 exit0·오류/경고0이다. Node의 기존 package module-type 안내는 검사 실패가 아니다.

실제 browser DOM/CodeMirror·동적 chunk 로딩·native clipboard·320px·font/layout은 전담 verifier의 결과와 분리한다. 공용 메타/번역/전체 타입은 통합 담당이 처리한다. 현재 제품 변경 요청 없이 연결 구현을 승인 가능한 상태로 판단한다.
