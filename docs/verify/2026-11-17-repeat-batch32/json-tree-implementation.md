# JSON 트리 선택값 — 부모 연결 결과

2026-11-17. `JsonFormatter.tsx` 부모 연결을 완료했다. 준비 도메인 10그룹·자식 4그룹에 이어, **실제 부모 8그룹·수정 전과 동일한 입력/클릭 회귀 2건·기존 저장 JSONPath 8그룹 PASS**. 아래 범위 10파일 scoped ESLint exit 0이며, 마지막 테스트 assertion 수정 뒤 해당 JS lint도 별도로 exit 0을 확인했다. 제품 TS 편집은 안정 상태다. 이후 독립 담당의 12그룹과 native 담당의 실제 Chrome 6흐름도 PASS·제품 추가 수정0으로 통지받았다. 이번 부모 연결을 포함한 전체 타입 검사는 지정 담당의 후속 단계다.

## 실제 변경

- `src/components/JsonFormatter.tsx`: 펼침과 선택에 typed key/index 경로를 사용한다. 루트·빈 키·숫자 객체 키와 배열 index를 구분하고, 펼침/선택 버튼을 분리했다. 트리 전체가 접혀도 선택값은 유지한다. 정렬·언어·같은 입력의 모드 왕복도 선택을 유지한다.
- 준비한 `jsonTreeSelection.ts`, `jsonTreeCopy.ts`, `JsonTreeSelectionPanel.tsx`, `JsonTreeCopyRecovery.tsx`를 연결했다. 선택 subtree의 JSON, RFC6901 Pointer, 설치 엔진에서 검증된 literal JSONPath만 각각 복사한다. 미지원 literal은 Pointer와 값 복사를 막지 않는다. 루트 Pointer는 빈 문자열이다.
- 기존 출력 복사와 새 세 복사 대상은 하나의 Clipboard 요청 세대를 공유한다. native resolve 또는 legacy `true`만 성공이며, 실패 대상의 전체 readOnly 텍스트·선택·재시도를 제공한다. 입력/선택/모드/들여쓰기/정렬/JSON5 변경과 unmount 뒤 이전 완료는 표시되지 않고 늦은 거부는 fallback하지 않는다. 이미 OS에 맡긴 Clipboard 쓰기 자체의 취소를 보장하지 않는다.
- 입력 변경 즉시 이전 선택을 비운다. 300ms parse 대기에는 과거 source의 파싱 결과를 사용하지 않는다. lazy JSONPath 검증도 source/selection/request/mounted 가드로 뒤늦은 표시를 막는다. 현재 tree 모드를 다시 눌렀을 때 검증을 무효화한 채 영구 대기하는 문제가 없도록 같은 모드 클릭은 no-op이다.
- 큰 선택값은 50,000 UTF-16 단위 구간으로 미리 본다(CRLF/서로게이트 경계 때문에 구간 최대 50,001). 모든 구간에 접근할 수 있고, 복사와 수동 복구에는 전체 문자열을 전달한다. JSON5 NaN/±Infinity가 선택 subtree에 있으면 선택값 JSON 복사만 불가이며 null로 조용히 바꾸지 않는다.
- 기존 정렬 사전 생성은 own `__proto__`를 보존하도록 바꾸고, 통계 키 빈도는 Map으로 계산한다. own `toString`이 숫자인 객체도 트리 검색에서 문자열로 강제 변환하지 않아 표시가 중단되지 않는다. 큰 collapsed subtree는 자식 JSX 목록을 만들지 않는다.
- 입력 위 모바일 결과 이동 링크와 결과 anchor, 새 트리 조작/복사/구간 버튼 44px, 필드 16px·토큰을 적용했다. 기존 CodeMirror와 JSONPath 프리셋 UI는 그대로 사용한다.

## 유지한 범위

기존 임의 JSONPath와 저장 필터의 실행 API/schema/저장 12개 제한을 바꾸지 않았다. 새 자동 literal 검증에만 `eval:false, wrap:true, resultType:'all'`을 사용한다. public token 배열의 정확한 일치와 결과의 own parent/property/value identity를 모두 확인하며 결과 1개나 값 동등성만으로 지원한다고 표시하지 않는다. 기존 query helper가 원래 `eval:false`였다고 주장하지 않는다.

기존 일반 format/minify/다운로드와 JSON5 전체 출력의 JSON.stringify 동작은 유지했다. 새 선택값의 엄격한 nonfinite 정책을 일반 출력에 확대하지 않았다. 원문 숫자 표기, 중복 키, 이미 Number 파싱에서 손실된 정밀도를 복원하는 기능이 아니다. 트리 가상화·파일/URL 가져오기 작업 세대의 전면 재설계도 이번 범위에 포함하지 않았다.

## 실행한 검사

```powershell
node docs/verify/2026-11-17-repeat-batch32/check-json-formatter-baseline.mjs --after
node docs/verify/2026-11-17-repeat-batch32/check-json-formatter-components.mjs
node scripts/check-jsonpath-presets.ts
npx eslint src/components/JsonFormatter.tsx src/components/JsonTreeSelectionPanel.tsx src/components/JsonTreeCopyRecovery.tsx src/utils/jsonTreeSelection.ts src/utils/jsonTreeCopy.ts scripts/check-json-tree-selection.ts docs/verify/2026-11-17-repeat-batch32/check-json-tree-children.mjs docs/verify/2026-11-17-repeat-batch32/check-json-formatter-baseline.mjs docs/verify/2026-11-17-repeat-batch32/json-formatter-harness.mjs docs/verify/2026-11-17-repeat-batch32/check-json-formatter-components.mjs
```

`check-json-formatter-baseline.mjs --after`는 수정 전 재현한 것과 같은 입력/클릭으로 literal `a.b`와 nested `a → b` 펼침 독립, sorted `__proto__` 보존을 확인한다. 수정 전 결과와 구별되는 2건의 after PASS다.

실제 부모 8그룹은 typed 경로/실제 설치 엔진, falsy·빈 루트/빈 Pointer 복사, 실제 legacy false/throw/true와 cross-target 늦은 거부, 입력·선택·설정·모드·JSON5·unmount 세대, 접기/동일 모드/언어/정렬 유지, JSON5 nonfinite의 대상별 제한, 11만 단위 이상의 전체 값 copy/recovery, 기존 저장 필터 load/실행과 own 키 통계를 다룬다. 마지막 그룹의 첫 fixture는 키 통계를 차트로 잘못 찾았으므로 실제 `<code>` 행/빈도 표시로 수정했고, 최종 8그룹을 모두 통과했다. VM은 React hooks/DOM/Clipboard 및 lazy 모듈 도착을 제어하고 라이브러리는 실제 설치본을 쓴다. 실제 브라우저 layout/focus/Clipboard 권한을 인증하는 검사가 아니다.

준비의 도메인 10그룹·실제 자식 4그룹은 변경하지 않아 반복 실행하지 않았다. 그 명령/범위는 `json-tree-preparation.md`에 남겨 두었다. 기존 저장 JSONPath 검사는 8그룹이며 filter·재귀·배열·Unicode, falsy root, 저장 schema/CAS/Web Lock 경계를 유지했다.

## 번역과 검증 selector

`docs/verify/2026-11-17-repeat-batch32/translations-json-tree.json`: KO/EN 각각 38leaf. 통합 담당이 canonical 병합·생성을 완료했다. 본 담당은 원본 번역/메타/생성물을 직접 수정하지 않았다.

- CodeMirror 입력: 기존 `.cm-content`/`JsonCodeEditor`, 저장된 query 입력 `#jsonpath-query` 유지.
- `[data-json-formatter-mode="tree|format|minify|stats"]`, `[data-json-formatter-indent]`, `[data-json-formatter-sort]`, `[data-json-formatter-json5]`, `[data-json-formatter-copy-output]`.
- `[data-json-tree-select]`와 `[data-json-tree-toggle]` 값은 typed tuple JSON이다. root `[]`, 객체 `a.b`는 `[["key","a.b"]]`, 배열 첫 칸은 예를 들어 `[["key","arr"],["index",0]]`이다. aria-label은 번역된 키/루트 이름을 포함한다.
- `[data-json-tree-selection]`, `[data-json-tree-pointer]`, `[data-json-tree-path]`, `[data-json-tree-path-status="checking|unsupported|unavailable"]`.
- `[data-json-tree-value]`의 `data-json-tree-preview-start/end/total`, `[data-json-tree-page="first|previous|next|last"]`, `[data-json-tree-copy="value|pointer|path"]`.
- `[data-json-tree-recovery="output|value|pointer|path"]`, `[data-json-tree-manual]`, `[data-json-tree-manual-select]`, `[data-json-tree-retry]`, `[data-json-tree-recovery-close]`.

새 파일 누락으로 전역 dev overlay가 생기지 않도록 자식/유틸 준비 후 parent를 완결된 패치로 연결했다. Chrome/전체 tsc/빌드/배포/commit/push는 실행하지 않았다.
