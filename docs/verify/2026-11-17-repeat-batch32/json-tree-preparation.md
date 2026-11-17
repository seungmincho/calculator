# JSON 트리 선택값 — 미연결 준비

2026-11-17. 승인된 API와 추가 제안(JSON5 비유한 값 거부, 명시 50k 미리보기)을 신규 파일로 준비했다. **도메인 10그룹·실제 자식 4그룹 PASS, 신규 6파일 lint exit 0. TS 편집 고정.** 기존 `JsonFormatter.tsx`·저장 JSONPath helper/API/schema·canonical 번역은 수정하지 않았다. 부모 연결/브라우저/전체 타입 검사 완료를 뜻하지 않는다.

## 파일과 API

- `src/utils/jsonTreeSelection.ts`: typed key/index path identity, own data-property resolver, RFC6901 문자열 Pointer, 엄격한 선택값 JSON 직렬화, 안전한 정렬 사전/Map 빈도, backtick literal 생성과 엔진 검증, 50k 미리보기.
- `src/utils/jsonTreeCopy.ts`: `output/value/pointer/path`가 공유하는 단일 최신 요청 guard와 native/legacy 복사 포트. 빈 문자열 root Pointer도 복사한다. 성공은 native resolve 또는 legacy의 실제 boolean true뿐이며 stale 거부는 fallback하지 않는다.
- `src/components/JsonTreeSelectionPanel.tsx`: 선택 결과/검증 상태/copy 상태를 prop으로 받는 표시 자식. 엔진이나 Clipboard I/O를 직접 시작하지 않는다. `selectionKey`, `pointer`, `value`, `path`, `pending`, `copied`, `onCopy`를 받는다.
- `src/components/JsonTreeCopyRecovery.tsx`: 실패 당시 전체 snapshot을 readOnly로 표시하고 선택/재시도/닫기 제공. root Pointer가 빈 문자열이면 그 의미를 따로 안내한다.
- `scripts/check-json-tree-selection.ts`, `docs32/check-json-tree-children.mjs`.
- `docs32/translations-json-tree.json`: `jsonFormatter.selection` 아래 KO/EN 각각 **37leaf**. 통합 담당에게 전달했으며 부모 연결 신호 전 canonical 병합은 보류 요청했다.

`verifyJsonTreeLiteral`은 public token 배열이 예상 token과 완전히 일치하는 경우에만 `eval:false, wrap:true, resultType:'all'`로 평가한다. 결과 수/own parent identity/property/value identity를 모두 확인한다. 배열 property는 설치 엔진이 반환하는 숫자 또는 그 정확한 십진 문자열만 허용하고, 객체 key는 문자열 그대로 비교한다. 미지원 조상 key가 있으면 하위 경로도 불가다. `$`는 typed root를 바로 사용해 설치 엔진의 falsy-root 누락을 피한다. 기존 임의 쿼리/필터는 이 검증 포트와 별개다.

`serializeJsonTreeValue`는 선택 subtree 어디에라도 NaN/±Infinity가 있으면 `nonFinite`를 반환한다. 경로/Pointer를 막지 않는다. 출력은 파싱된 값의 JSON 직렬화이며 원문 숫자 표기/중복 키/손실된 Number 정밀도를 복원한다고 주장하지 않는다. `sortJsonTreeObject`는 `Object.fromEntries`로 `__proto__`도 data key로 보존한다. `jsonTreeKeyFrequencies`는 parser-created 비순환 데이터용 Map이며 큰 배열을 spread 인자로 넘기지 않는다.

미리보기는 50,000 UTF-16 단위 경계를 기준으로 CRLF/surrogate 사이만 앞당긴다. 이 때문에 한 구간은 최대 50,001단위일 수 있다. 인접 구간을 합치면 전체 원문과 일치한다. 페이지마다 textarea key가 달라 이전 native 선택이 다음 구간에 남지 않는다. 복사 callback에는 항상 전체 value JSON이 전달되며 수동 복구도 전체 텍스트다.

## 실제 실행한 검사

```powershell
node scripts/check-json-tree-selection.ts
node docs/verify/2026-11-17-repeat-batch32/check-json-tree-children.mjs
npx eslint src/utils/jsonTreeSelection.ts src/utils/jsonTreeCopy.ts src/components/JsonTreeSelectionPanel.tsx src/components/JsonTreeCopyRecovery.tsx scripts/check-json-tree-selection.ts docs/verify/2026-11-17-repeat-batch32/check-json-tree-children.mjs
```

도메인 10그룹은 독립 Pointer decoder와 own target 기대값, 빈/root/숫자 키 구분, accessor/상속/잘못된 index 거부, 14만 행 배열 빈도 및 특수 키 정렬, JSON5 nonfinite subtree, 실제 설치 엔진의 20종 지원 키×5값×2중첩 문맥, 미지원 key/ancestor의 평가 0회, 잘못된 결과 metadata, 모든 preview 구간과 전체 복사, 네 복사 대상 간 resolve/reject 역순을 포함한다.

실제 자식 4그룹은 KO/EN root 빈 Pointer/세 복사 버튼, 전체 preview 재결합·전체 복사·locale 보존/selection 변경 리셋, 경로 불가와 nonfinite의 대상별 비활성화, 전체 수동 텍스트·선택 실패/재시도/busy/닫기를 확인했다. 실제 TSX를 번들하고 hook/host ref만 제어한 검사이며 브라우저의 focus/layout/Clipboard를 인증하지 않는다. 앞서 작성한 설계 probe 3그룹은 이 준비 결과에 더하지 않는다.

## 부모 연결 시 남은 작업

1. TreeNode 경로/expanded/선택 identity를 typed segments로 옮기고 root·빈 key·숫자 객체 key를 명확히 표시한다. 버튼은 별도 펼침/선택으로 나누고 hover 전용 조작을 없앤다. 정렬/언어/같은 입력 내 모드 왕복에서는 선택 identity를 유지한다.
2. 입력/JSON5 변경은 즉시 선택 및 이전 작업을 무효화한다. parsing debounce 동안 과거 parsedState를 사용하지 않는다. async engine import/검증은 source+selection+request 세대와 mounted를 확인하며, 실패해도 Pointer/값을 유지한다.
3. `selectionKey`는 source revision+typed selection+format 설정으로 만든다. language만 바뀌면 바꾸지 않는다. 같은 문구로 되돌아와도 revision은 증가해 오래된 작업이 살아나지 않는다.
4. 기존 전체 출력 복사와 새 선택 복사는 같은 guard를 사용한다. click snapshot/current checks/2초 성공 타이머/복구 닫기·재시도·unmount를 부모에 연결한다. 이전 OS clipboard 요청의 실제 쓰기를 취소할 수 있다는 보장은 하지 않는다.
5. 기존 정렬 formatter는 own-key 사전 생성만 바꾸고 일반 JSON5 직렬화 계약을 유지한다. 새 strict 선택값 serializer를 전체 formatter에 무조건 적용하지 않는다. 통계의 Map 보완도 데이터 key 빈도에 한정한다.
6. 부모 actual-event/기존 저장 쿼리 회귀, 독립 검토, 브라우저320px·키보드·실제 Clipboard/대형 선택 확인, 공용 번역/메타 및 전체 타입 체크포인트는 후속 단계다.

안정 selector: `[data-json-tree-selection]`, `[data-json-tree-pointer]`, `[data-json-tree-path]`, `[data-json-tree-path-status]`, `[data-json-tree-value]`의 preview start/end/total, `[data-json-tree-page="first|previous|next|last"]`, `[data-json-tree-copy="value|pointer|path"]`, `[data-json-tree-recovery]`, `[data-json-tree-manual]`, `[data-json-tree-manual-select]`, `[data-json-tree-retry]`.

기존 parent/공용 파일·신규 패키지·Chrome·전체 tsc·빌드·배포·git 작업은 수행하지 않았다.
