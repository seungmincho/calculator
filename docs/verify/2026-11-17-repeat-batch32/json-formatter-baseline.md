# 현재 JSON Formatter 부모 — 변경 전 재현

2026-11-17. 신규 32차 유틸/자식이 아직 연결되지 않은 현재 `JsonFormatter.tsx`에서 두 결함을 실제 입력/버튼 흐름으로 재현했다. 이것은 제품 PASS가 아닌 **변경 전 결함 근거**다. 제품/공용 TS를 수정하지 않았으며 해당 baseline JS scoped lint exit 0을 확인했다.

```powershell
node docs/verify/2026-11-17-repeat-batch32/check-json-formatter-baseline.mjs
```

입력 원문:

```json
{"a.b":{"direct":1},"a":{"b":{"nested":2}},"__proto__":{"keep":3},"constructor":"ctor","toString":4}
```

1. 실제 편집기의 onChange로 입력하고 기존 300ms parsing debounce를 진행한다.
2. 트리뷰를 열고 root key `a`를 펼친다. 중첩 key `b`는 접혀 있음을 먼저 확인한다.
3. 별도 root key `a.b`의 펼침 버튼을 클릭하면 `a.b`뿐 아니라 중첩 `a`→`b`도 펼쳐진다. 실제 TreeNode 몸체를 실행해 각각의 `aria-expanded`를 확인했다. 새 helper의 identity 결과로 대신하지 않았다.
4. 포맷팅으로 돌아가 실제 설정 버튼을 열고 ‘키 정렬 (A-Z)’ checkbox를 켠다.
5. 실제 읽기 전용 출력 편집기의 JSON을 parse하면 own `__proto__`가 빠진다. `constructor`와 `toString`은 남고 입력 편집기 원문은 그대로임을 확인했다.

실행 결과는 `REPRODUCED` 두 건을 표시한다. `--after` 옵션은 같은 원문과 클릭 순서에 대해 펼침 독립/전체 own 구조 보존을 기대하도록 준비했다. 부모 연결 뒤 새 UI selector에 필요한 fixture 조정은 가능하지만 원문/클릭 의미와 기대 구조는 유지한다.

이 검사는 실제 부모·실제 TreeNode를 번들하고 hook/host만 제어한다. 공용 이벤트 harness는 수정하지 않았고 local wrapper에서 `React.memo`만 passthrough로 제공했다. CodeMirror/차트는 host placeholder로 바꾸되 부모가 전달하는 onChange와 현재 output value를 사용한다. 실제 React DOM/CodeMirror native 입력/브라우저 스크롤 검사와는 구분한다.

초기 fixture의 번역 mode key(`treeView`)와 esbuild 함수명 가정만 바로잡았다. 제품 오류를 고친 것으로 집계하지 않았다. 32차 준비 도메인10·자식4 결과는 이 실제 부모 baseline을 대체하지 않으며, baseline 두 재현도 그 PASS 수에 더하지 않는다.
