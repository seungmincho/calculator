# JSON 트리 경로·선택 값 읽기 설계

2026-11-17, `taxi_repeat`. 제품 TS/번역/공용 파일 변경 없이 현재 부모와 설치 엔진을 읽고 만든 연결 전 설계다. CSV 성능 후속 결함 대응이 우선이며, 32차 구현 완료나 브라우저 검증을 뜻하지 않는다.

## 현재 코드에서 확인한 경계

- `JsonFormatter.tsx`의 `TreeNode.path`/`expandedNodes`/`expandAll`은 점으로 연결한 문자열이다. `a.b` 한 키와 `a`→`b`가 같은 identity가 되고, 빈 키는 `filter(Boolean)`에서 빠진다. `nodeKey`가 숫자처럼 보이면 객체 키도 배열처럼 표시한다.
- 현재 root는 별도 노드가 아니며 객체/배열의 자식만 렌더한다. 빈 객체/배열 및 primitive root에는 선택 조작이 없다.
- 트리 표시 문자열은 100자로 줄이지만 경로 복사만 있다. 새 선택 값 복사는 표시용 문자열과 분리해야 한다.
- `handleCopyPath`는 거부를 삼키면서 성공 상태를 먼저 만든다. 기존 전체 출력 복사도 `execCommand(false)`를 성공으로 처리하고 이전 Promise/2초 타이머가 새 상태에 적용될 수 있다. 새 경로/값 복사와 기존 전체 출력 복사는 같은 시스템 Clipboard를 쓰므로 하나의 요청 세대로 묶어야 한다.
- 정렬 replacer의 `{}`+`sorted[k] = ...`는 `__proto__`를 own data key로 보존하지 않는다. 통계 `keyFreq[k] = (keyFreq[k] || 0) + 1`은 inherited `constructor`/`toString` 등도 읽는다. 이 두 데이터 사전만 고치고 현재 들여쓰기·배열 순서·차트 구성은 유지한다.
- 파싱은 현재 300ms debounce와 source/json5 일치 여부로 유효 결과를 구분한다. 새로운 선택/복사도 `parsedState.source === input && parsedState.json5 === json5Mode`인 결과만 사용해야 한다.
- 파일/URL import, 자동 복구, 기존 JSONPath 예제·저장본, 전체 formatter의 큰 입력 성능은 이번 경로 개선의 재설계 대상이 아니다.

## 제안하는 작은 API

새 순수 파일 `src/utils/jsonTreeSelection.ts`, 작은 복사 포트 `src/utils/jsonTreeCopy.ts`, 선택 결과 자식 `src/components/JsonTreeSelectionPanel.tsx`를 먼저 준비하고 부모는 체크포인트 뒤 연결한다. 정렬/통계의 관련 데이터 사전 보완은 부모 최소 변경으로도 충분하다. 이름은 구현 시 불필요하게 더 나누지 않는다.

```ts
type JsonTreeSegment =
  | { readonly kind: 'key'; readonly key: string }
  | { readonly kind: 'index'; readonly index: number }
type JsonTreePath = readonly JsonTreeSegment[]

treeNodeId(path): string
resolveTreeNode(root, path):
  | { ok: true; value: unknown; parent: object | null; property: string | number | null }
  | { ok: false; reason: 'missing' | 'wrongContainer' | 'invalidIndex' }
toJsonPointer(path): string
serializeSelectedJson(value, indent, sort):
  | { ok: true; text: string }
  | { ok: false; reason: 'notJsonValue' }
buildLiteralJsonPath(path): { expression: string; expectedTokens: readonly string[] }
verifyLiteralJsonPath(root, path, engine):
  | { ok: true; expression: string }
  | { ok: false; reason: 'unsupported' | 'unavailable' }
```

- `treeNodeId`는 segment tuple 배열을 `JSON.stringify`한 결과. 예: root `[]`, 빈 key `[["key",""]]`, 숫자 객체 key `[["key","0"]]`, 배열 index `[["index",0]]`. 문자열을 다시 점/괄호로 분해하지 않는다. 정렬은 표시 순서만 바꾸므로 selection/expanded identity가 변하지 않는다.
- resolver는 매 단계 container 종류를 확인한다. key는 배열이 아닌 object의 `Object.hasOwn`, index는 배열의 안전한 비음수 정수/범위/own slot만 허용한다. falsy 값은 성공 분기 안의 값이며 없음과 혼동하지 않는다. 입력은 JSON/JSON5 파서가 만든 데이터이며 외부 getter 객체를 새로 지원하지 않는다.
- Pointer는 문자열 표현 RFC6901로 key의 `~`→`~0`, `/`→`~1` 순서로 escape한다. 배열 index는 십진 정수다. root는 **빈 문자열**이고 빈 key는 `/`다. root Pointer를 복사할 때 falsy 검사로 무시하지 않는다. URI fragment 표현/URL 입력은 새로 추가하지 않는다.
- 선택 값은 파싱된 현재 값 전체를 JSON 직렬화한 결과다. 원문 공백/숫자 표기/중복 키/이미 JS Number로 읽힌 정밀도까지 원상 복구한다고 주장하지 않는다. 기존 parser를 그대로 쓴다.
- JSON5의 `NaN`/`Infinity`처럼 JSON으로 그대로 표현할 수 없는 값 또는 그 하위 값은 새 선택 값 JSON 복사에서 `null`로 조용히 바꾸지 않고 불가 안내를 제안한다. Pointer와 지원 가능한 JSONPath는 유지한다. 기존 전체 formatter의 JSON5 직렬화 동작을 이 변경으로 재정의하지 않는다.

## JSONPath: 설치 엔진이 해석한 경로만 제공

root의 [14키 조사](jsonpath-engine-reading.md)와 별도로, 설치 `jsonpath-plus` 10.3.0의 README backtick 설명 및 `src/jsonpath.js`의 `_trace`/`toPathArray`를 읽었다. 제품 파일 없이 inline Node ESM으로 27개 키를 검사했다. 후보는 객체 key 앞에 문서화된 backtick literal 표식을 붙이는 방식이다. JSON 문자열 escape를 다시 디코드한다고 가정하지 않고 key의 실제 문자를 사용한다.

| 키 종류 | 이 한 단계 probe 결과 |
|---|---|
| `a.b`, 빈 key, `0`, `/`, `~`, 한글, `*`, `..`, `$`, backtick, `constructor`, `__proto__`, 큰/작은따옴표, 역슬래시, 실제 개행, comma, `(x)`, `:`, emoji | 예상 token과 일치하고 decoy 옆에서 정확한 own target 1개 |
| `x]y`, `x[y`, semicolon, `^`, `@string()`, `%@%`, `%%@@%%` | tokenizer가 바꾸거나 나누므로 불가 |

이는 제한된 합성 probe이며 모든 키/중첩 조합이나 모든 JSONPath 구현에서의 호환성을 보증하지 않는다. 재현은 `node docs/verify/2026-11-17-repeat-batch32/check-json-tree-literal-probe.mjs`로 실행한다. 추가로 숫자 객체 key→배열 index→literal descendant, 같은 primitive 값을 가진 decoy, 미지원 조상 key와 falsy root의 설치 엔진 한계를 확인했다. 설계 probe 3그룹 PASS·해당 JS scoped lint exit 0이며 제품 도메인/브라우저 완료 건수로 집계하지 않는다. 구현의 의미 있는 체크에서 조합/decoy를 확대한다.

검증 순서는 다음과 같다.

1. typed own resolver로 target/parent/property를 구한다.
2. public `JSONPath.toPathArray(candidate)`를 직접 만든 예상 token 배열과 정확히 비교한다. 배열 길이와 각 token이 모두 같아야 한다. regex 전처리, bracket/semicolon 분리, 특수 토큰 치환, placeholder가 발생하면 실행/복사 불가다. 조상 key 하나라도 미지원이면 하위 선택의 JSONPath 역시 불가이며 Pointer/값 복사는 계속 제공한다.
3. token 검사에 통과한 경로만 `JSONPath({ path, json: root, eval: false, wrap: true, resultType: 'all' })`로 실행한다.
4. 결과가 1개이고 값뿐 아니라 `parent` 동일 객체와 `parentProperty`가 resolver가 지정한 own 속성과 일치해야 한다. primitive 값은 `Object.is`, object/array는 identity로 비교한다. 같은 값을 가진 다른 키나 wildcard 문서가 우연히 하나인 경우를 합격시키지 않는다.
5. root `$`는 falsy root를 누락시키는 설치 엔진의 기존 특성 때문에 typed root 자체로 처리한다. 현재 저장 쿼리 helper도 정확한 `$`만 직접 보완한다. 새 기능이 쿼리 helper를 전면 교체하지 않는다.

엔진 lazy import가 느리거나 실패해도 값 JSON/Pointer는 바로 쓸 수 있다. 새 선택/input/mode/unmount 세대가 발생하면 이전 검증 완료는 무시한다. 엔진 검증은 선택된 한 노드에서만 하며 모든 트리 노드마다 import/평가하지 않는다. UI는 “JSONPath (jsonpath-plus)”라는 지원 범위를 설명하고 지원 불가이면 그 복사 버튼을 비활성화한 뒤 Pointer/값 복사를 안내한다. 자동 저장·쿼리 실행·장기 캐시를 추가하지 않는다.

**기존과 신규 eval 경계:** 현재 `executeJsonPath`는 `evaluateSavedJsonPath(..., options => JSONPath(options))`이고 기존 helper가 넘기는 옵션은 path/json뿐이다. 따라서 현재 임의 쿼리에 이미 `eval:false`가 있다고 주장하지 않는다. root와 합의한 `eval:false`는 **이번에 자동 생성하는 literal 경로 검증**에 명시한다. 기존 저장 필터/임의 쿼리의 평가 옵션·저장 schema·12개 제한·잠금/복원 계약은 그대로 둔다. 기존 필터가 안전하다거나 JSONPath 표준 전체를 준수한다는 새 주장은 하지 않는다.

## UI와 상태 연결

- root를 모든 데이터 타입에서 선택 가능한 첫 노드로 제공한다. 펼침 toggle과 선택 버튼을 분리해 중첩 button을 만들지 않는다. 배열 index/객체 key 표시는 segment 종류로 결정한다. 빈 key와 root는 번역된 이름으로 구분한다.
- row 선택은 작은 선택 결과 패널을 갱신한다. 값 JSON·JSON Pointer·지원 확인된 JSONPath의 세 버튼은 모바일에서도 항상 보이며 hover에만 의존하지 않는다. 선택은 명시 클릭/키보드 버튼으로 하며 clipboard를 자동으로 쓰지 않는다.
- selected path/expanded Set은 정렬·들여쓰기·언어 전환에 유지한다. 입력/JSON5 설정 변경 시 selection과 이전 복사 상태를 즉시 무효화한다. parsing debounce 동안 이전 값을 복사하지 않는다. 트리 밖 모드 전환은 pending 작업과 복사 상태만 무효화하고 같은 입력의 선택 자체는 유지할 수 있다.
- 새로운 복사 guard는 전체 출력/선택 값/Pointer/JSONPath가 공유한다. 클릭 당시 text와 target, input revision, selected identity, mode/options를 캡처하고, 늦은 거부가 새 작업 뒤 legacy fallback을 실행하지 못하게 한다. native resolve 또는 실제 legacy `true`만 성공, 실패 시 읽기 전용 전체 텍스트·선택·명시 재시도. 이전 성공 제거 타이머도 request로 소유한다. 이미 OS에 맡긴 clipboard 쓰기를 취소할 수 있다고 주장하지 않는다.
- stale DOM handler도 action 시작 전에 current snapshot인지 확인한다. 사용자 입력이 원래 문자열로 돌아와도 세대는 증가하므로 예전 작업이 다시 살아나지 않는다.
- 작은 패널의 값 표시가 큰 하위 객체 전체를 매번 textarea에 넣는 병목이 될 수 있다. **구현 전 조율 제안:** 보이는 값 preview는 명시된 50k UTF-16 구간/이전·다음으로 제한하되 전체 복사와 실패 후 수동 선택은 전체 snapshot을 사용한다. CSV의 CRLF/emoji 경계 정책을 참고하되 사용자 입력이나 실제 선택값을 자르지 않는다. 새 가상화/파서는 넣지 않는다. 이 미리보기 제안은 현 32차 확정 계약과 구분한다.
- 수정하는 트리 조작은 44px, 검색/복구 입력은 16px, 토큰 색과 가로 min-width/overflow를 사용한다. 장식 아이콘 추가나 전체 차트 디자인 변경은 하지 않는다.

## own-key 보완

- 정렬 사전은 `Object.fromEntries(Object.keys(value).sort().map(...))` 또는 `Object.create(null)`에 data key를 넣어 만든다. `__proto__`를 prototype setter로 보내지 않는다. JSON.stringify의 숫자 모양 key 열거 순서까지 임의로 바꾸는 새 serializer는 만들지 않는다.
- `keyFreq`는 `Map<string, number>` 또는 null-prototype record의 own 조회로 계산한다. `__proto__`, `constructor`, `toString`, `hasOwnProperty`가 일반 키와 같은 정수 빈도를 가진다. depth/type 사전의 고정 키와 차트 데이터 형식은 유지한다.
- `countKeys`는 이미 `Object.keys/Object.values`를 쓰므로 근거 없이 재작성하지 않는다. 선택 resolver도 inherited 값은 반환하지 않는다.

## 준비/연결 검증 계획

1. 순수 path/Pointer: dotted vs nested, root vs 빈 key, `"0"` vs index0, `/~`, quotes/backslash/bracket/control chars/한글/emoji, special own keys, false/0/null/빈 문자열/빈 container. 독립 own-property resolver와 Pointer decoder를 oracle로 사용한다.
2. 엔진: 위 27개 key 및 중첩·배열 조합, decoy와 같은 primitive 값을 둔 형제, wildcard 단독 문서/형제 추가 문서. token 불일치 시 실행 포트 호출 0, eval:false 옵션 확인, unsupported 상태에서 JSONPath 복사 성공 0. 실행 결과 metadata를 별도 resolver와 대조한다.
3. 정렬/통계: JSON.parse한 특수 키 fixture를 정렬 후 재parse해 own 구조/배열 순서/키 빈도 보존. 기존 정상 formatter 결과와 들여쓰기 회귀. JSON5 비유한 값의 새 선택 복사 정책 분리.
4. 실제 부모: 개별 펼침 충돌 없음, root/빈 container 선택, 정렬·locale·접기 이후 같은 선택 유지, parsing 대기/무효 입력에서 오래된 값 차단, 선택 종류/전체 출력 간 복사 경합 및 stale fallback/타이머, readonly 대안과 전체 값 복사.
5. 기존 경계: JSONPath 예제/12개 저장본의 raw bytes·실행·불러오기 유지, 자동 저장/새 URL 없음. 파일 import/기존 format/minify/stats/단축키는 바꾸지 않은 계약으로 회귀.
6. 별도 브라우저 담당: 320px과 Tab/Enter/Space·항상 보이는 조작, native clipboard/거부·manual selection, 실제 설치 엔진과 같은 선택, 대형 선택 preview/전체 반출. 준비 도메인/부모/브라우저와 전체 타입 검사는 별도 증거로 기록한다.

현재 작성한 산출물은 이 MD와 read-only 설치 엔진 probe JS다. 제품/신규 TS·canonical 번역·메타·패키지·트리 가상화·빌드 변경은 없다.
