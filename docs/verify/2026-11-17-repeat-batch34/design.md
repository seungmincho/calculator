# 34차 숫자 한글 변환 — 입력 보존과 복사 복구 설계

2026-11-17 KST. `NumberToKorean.tsx`, `NumberToKoreanBatch.tsx`, 계산/일괄 유틸, 기존 검사, GPA 복사 복구 패턴을 읽고 정한 계약이다. root가 raw/IME/전역 복사 소유권과 초기 예시·명시 빈 query 정책을 승인했다. 28·30차 체크포인트 뒤 신규 파일만 준비했으며, 현재 부모·계산/일괄 유틸·canonical은 미수정이다. 실제 준비 결과와 검증 한계는 `preparation.md`를 따른다.

## 유지할 계산·입출력 계약

- `numberToKorean.ts`의 `parseAmount/toKoreanReading/toKoreanFormal/toHanja/toMixed/toEnglish/canonical/addDigits`는 변경하지 않는다. 숫자 정수부는 문자열로20자리까지 정확하게 처리하며,20자 DOM maxLength를 넣어 부호·쉼표·소수부 입력을 막지 않는다. 한글 역변환의 기존 safe-integer 제한도 유지한다.
- 숫자0·음수·소수는 읽기 결과가 있어도 계약서식/한자 금액표기는 비어 있는 현재 정책을 유지한다. 선행0, 소수 뒤0, 음수0의 정규값도 계산 유틸에 맡긴다.
- 빠른 금액은 양수 입력의 정수부에 더하고 소수부를 보존한다. 현재 음수/유효하지 않은 입력은0을 기준으로 빠른 금액을 적용하는 의미를 바꾸지 않는다. 더한 정수부가20자리를 넘으면 입력을 바꾸지 않는다.
- 일괄은100물리행/전체30,000 UTF-16자/행300자다. 마지막 개행1개는 종료 기호로 처리하고 의도된 추가 빈행은 줄번호 간격으로 남긴다. 탭만 라벨/금액 구분자이며, 잘못된 행을 누락하지 않는다.
- 단일 parser는 쉼표를 제거해 읽지만 일괄은 쉼표 그룹을 더 엄격히 검증한다. 이번 작업에서 두 정책을 합치거나, 단일 blur 정리를 일괄 원문에 적용하지 않는다.
- TSV/CSV는 기존7열·원래 순서·오류 행·텍스트/수식 보호를 유지한다. CSV는 BOM과 기존 `number-to-korean-batch.csv` 파일명으로 내보낸다. 일괄 라벨/원문·prefix/spacing은 URL이나 새 장기 저장에 넣지 않는다.

## 단일 입력과 IME

상태는 `raw`와 `composing`, 최초 URL 복원 완료 여부, 사용자 편집 여부, 예시 안내 여부로 나눈다. 결과는 raw를 기존 parser에 넘겨 계산하되 입력 필드에 결과/정규값을 역으로 덮어쓰지 않는다.

| 이벤트 | 처리 |
|---|---|
| 일반 onChange | DOM의 value를 그대로 저장한다. 쉼표 삽입·trim·caret 재지정 없이 selection을 브라우저 편집 결과대로 둔다. 사용자 편집 표시와 복사 무효화를 즉시 적용한다. |
| 일반 blur | 기존 `formatInput`의 숫자형 문법에 맞고 `parseAmount`도 유효할 때만 쉼표 정리를 적용한다. 정리 후에도 값이 같으면 상태를 바꾸지 않는다. |
| 미완성/한글 입력 | `-`, `−`, `.`, `-.` 등 미완성 문자열과 한글 역변환 원문은 그대로 남긴다. 숫자형 `123.`의 마지막 점과 `1.00`의 원문 소수부도 기존 정리 규칙대로 보존한다. |
| compositionstart | 동기 ref와 UI state로 조합 시작을 기록한다. 기존 복사 요청/복구 안내는 무효화한다. |
| 조합 중 onChange | 조합 원문을 그대로 표시한다. blur 정리, URL 반영, 빠른 금액/비우기/복사로 원문을 덮지 않는다. 해당 버튼은 비활성+handler guard 양쪽으로 보호한다. |
| compositionend | 이벤트의 최종 raw를 반영하고 조합 상태를 해제한다. 초점이 입력에 있으면 즉시 정리하지 않는다. 후속 정상 blur에서 정리한다. |
| 조합 중 blur | 원문 정리를 보류한다. 조합 종료 뒤 이미 초점이 밖이라면 마지막 input 이벤트까지 반영된 다음, 원문 세대와 비초점 상태가 여전히 같을 때만 지연 정리를 적용한다. 새 편집/재초점/취소가 있으면 생략한다. |
| 명시 비우기 | 조합 중이 아닐 때 raw를 빈값으로 만들고 예시 안내와 복사 상태를 없앤다. 자동 예시 복구나 강제 focus는 하지 않는다. |

지연 blur 정리는 조합 종료/blur 순서를 한 가지로 가정하지 않는다. 세대와 초점 검사를 통과하지 못하면 정리를 생략해 원문 보존을 우선한다. 복사할 수 있는 현재 결과가 없거나 조합 중이면 해당 복사/공유 버튼을 비활성화한다. `inputMode="decimal"`, text 입력과 기존 역변환 붙여넣기는 유지한다.

`autoFocus`는 제거한다. 최초 진입에서 키보드를 자동으로 열지 않는다. 중간 삽입·삭제·범위 교체의 DOM selection은 브라우저 검사로 확인하고 결과값만 맞으면 통과 처리하지 않는다.

## 초기 예시와 URL 우선순위

AGENTS의 기본 결과 노출 원칙에 따라 서버와 첫 client 렌더 모두 고정 예시 `123456789`(입력 표시 `123,456,789`)와 예시 안내를 보여 준다. 로케일별 임의 숫자나 날짜를 사용하지 않는다.

1. hydration 전/최초 렌더는 동일 예시다.
2. 최초 URL 복원은 `has('n')`로 존재 여부를 판단한다. `n=` 빈값, 유효한 n, 무효인 n 모두 예시보다 우선하며 원문을 표시한다. 유효 숫자 n의 최초 비편집 표시만 기존 숫자형 정리를 사용할 수 있다.
3. 복원보다 먼저 사용자가 raw를 편집하거나 조합/빠른 금액/비우기를 시작했다면 URL을 나중에 덮어쓰지 않는다. 옵션만 바꾼 것은 금액 원문 편집으로 간주하지 않는다.
4. 처음 query를 읽었다는 이유만으로 n을 삭제하거나 예시를 URL에 다시 쓰지 않는다. 예시 안내는 URL 입력 또는 사용자의 첫 원문 변경에서 해제한다. 언어/옵션 변경으로 예시를 다시 삽입하지 않는다.
5. 이후 유효한 입력의 URL은 지금처럼 `canonical(parsed)` 한 개 n으로 동기화한다. 다른 query/hash/history.state는 보존한다. 일반 무효 입력은 기존처럼 공유 불가이며 임의 원문을 새 query로 노출하지 않는다.
6. **호환 확장:** 기존 명시 비우기는 n을 제거했으나 이제 `n=`을 유지한다. 새 기본 예시가 새로고침에서 빈 입력을 되살리지 않도록 빈 입력의 의도를 같은 기존 키로 표현한다. 새 query 키/저장소는 없다. 이미 존재하는 무효 query는 최초 복원 읽기만으로 지우지 않는다.

링크 복사는 `window.location.href`의 늦은 effect 결과를 그대로 복사하지 않고 클릭 시점의 현재 parsed/raw 세대로 URL을 만든다. 유효한 현재 결과의 canonical n만 공유하며 prefix/spacing/batch는 포함하지 않는다. 명시 빈값 상태의 링크 복사 버튼은 기존처럼 비활성이다. 사용자의 비우기·편집 이후에는 같은 방문에서 예시를 자동 복구하지 않는다.

## 복사 소유권과 복구 UI

클립보드는 단일·링크·일괄이 공유하는 자원이다. 부모가 **전역 최신 복사 요청1개**를 소유하고, 자식 일괄은 클릭 시 현재 TSV와 대상 정보를 부모에게 전달한다. 단일 모바일/데스크톱/각 결과 행/링크/일괄은 서로 다른 target ID를 사용하지만 세대와 요청 순번은 공유한다.

순수 guard의 token은 `{revision,request,target}`이다. 클릭은 request를 증가시키고 이전 대상의 성공/실패/복구 UI와 성공 timeout을 정리한다. raw/접두사/띄어쓰기/locale 또는 번역된 export 문구 변경은 revision을 무효화한다. 입력 이벤트는 Promise가 해소되기 전에 동기적으로 무효화하고, effect/레이아웃 경계는 외부 옵션·언어 변경을 보강한다. 정리 effect는 입력 원문을 수정하지 않는다.

복사 순서는 다음과 같다.

1. 클릭 시 현재 target/label/text/context를 확정한다. 빈 결과/조합 중/무효 결과는 요청을 시작하지 않는다.
2. native `writeText`가 있으면 실행한다. 성공해도 아직 현재 token인 경우에만 성공 안내를 표시한다.
3. native 부재/거부 후 **여전히 현재 요청인 경우에만** legacy fallback을 실행한다. 숨긴 readOnly textarea를 생성→focus/select/setSelectionRange한 뒤에도 token을 다시 확인하고 `execCommand('copy') === true`일 때만 성공이다.
4. 선택·복사 false/throw는 실패다. 임시 노드는 finally에서 제거한다. focus 복원은 원래 요소가 여전히 유효하고 새로운 사용자 요청의 초점을 빼앗지 않는 경우에만 수행한다.
5. 늦은 native 실패는 fallback을 호출하지 않는다. 늦은 성공/실패와 이전2초 timeout도 현재 안내를 바꾸지 않는다. 이미 시작한 native clipboard Promise 자체를 취소할 수 있다고 주장하지 않는다.
6. 성공 timeout은 자신의 token이 아직 현재이고 자신의 성공 안내가 남아 있을 때만 지운다. 새 요청·편집·닫기·언마운트에서 timeout을 해제한다.

실패하면 readOnly 전체 텍스트, ‘전체 선택’, ‘현재 결과 다시 복사’, ‘닫기’를 제공한다. 자동 선택을 성공 복사로 표현하지 않는다. 선택이 실패하면 직접 선택 안내를 남긴다. 입력/옵션/언어 변경은 오래된 복구 패널을 닫으며 retry는 현재 target/context로 새 요청을 시작한다. 예전 버튼 handler를 늦게 호출해도 현재 세대가 아니면 동작하지 않는다.

부모에 공통 copy state를 두어 batch의 `copying`/`copied` 표시도 동일 소유권에서 파생한다. batch 자체의 다운로드 오류 상태는 복사 상태와 분리한다. CSV는 클릭 순간의 전체 결과를 계속 직렬화하며 기존 BOM/일회 URL 생성/해제 정책을 유지한다. 복사 복구를 위해 라벨이나 결과를 장기 저장하지 않는다.

## 최소 파일/API 범위

| 파일 | 역할 |
|---|---|
| `src/utils/numberToKoreanEditing.ts` 신규 | 고정 예시, 숫자형 blur 정리, 조합/편집 세대에 따른 정리 가능 여부, n 존재/빈값을 구분하는 초기 복원 및 현재 공유 URL 빌더 |
| `src/utils/numberToKoreanActions.ts` 신규 | 공통 복사 guard, current 검증을 포함한 native/fallback 포트, copied/failed/stale 결과 |
| `src/components/NumberToKoreanCopyRecovery.tsx` 신규 | 전체 readOnly 텍스트·선택/재시도/닫기. 사용자 입력/URL 계산은 하지 않음 |
| `src/components/NumberToKorean.tsx` 최소 연결 | raw/IME/예시/URL 상태, 전역 copy state와 timeout 소유, 기존 결과/옵션/quick 동작 유지 |
| `src/components/NumberToKoreanBatch.tsx` 최소 연결 | raw/옵션/번역 변경 무효화 통지, TSV 클릭 snapshot을 공통 copy handler로 전달. 계산·CSV 변경 없음 |
| `scripts/check-number-to-korean-editing.ts`, `scripts/check-number-to-korean-actions.ts` 신규 | 순수 정책·정밀도·URL·가짜 Clipboard/선택/timer 경계 |
| `docs/verify/2026-11-17-repeat-batch34/translations-number.json` 예정 | 새 안내/복구/예시 KO·EN 조각. canonical은 통합 담당 |

GPA의 검증된 `copyGpaText`·global request 패턴을 참고하지만 이 도구가 GPA 전용 모듈을 import하거나 기존 복사 도구 전체를 공용화하는 리팩터링은 하지 않는다. 새 패키지/서버/계정/장기 저장은 없다.

## 검증 계획과 구분

- 순수 입력:20자리/2^53 초과/음수/소수·끝점·선행0·쉼표/한글 원문/invalid 보존, 기존 quick 음수 의미와 overflow no-op. 값뿐 아니라 raw 불변 여부를 검사한다.
- URL: SSR/첫 client 예시 동일, 없는 n/빈 n/무효 n/유효 n, 최초1회 복원, hydration 전 편집·조합 우선, 명시 clear→n=→새 방문 빈값, 다른 query/hash/history.state 보존, effect 전 링크 복사 현재값.
- 복사: native 성공/거부/API 부재, fallback true/false/throw와 select 실패, target 교체 양방향(단일→batch/batch→링크), 입력·옵션·locale·번역 ready·언마운트 중 늦은 완료, 이전 성공 timeout, retry/close 세대.
- 실제 부모: 조합 시작/중간/종료/blur 재배열과 quick/reset 차단, 미완성 raw, 결과/options/계산 불변, 복구 textarea 전체 text/선택/키보드 focus. 기존 계산·일괄 scripts와 독립 CSV/TSV reader도 범위에 맞게 확인한다.
- 실제 브라우저: 가운데 입력/삭제/범위치환 후 selectionStart/End, 자동 focus0, 한국어 IME/붙여넣기, KO·EN/320px, native clipboard 거부/선택, CSV 전체100행·오류/수식/따옴표/개행 roundtrip. 실제 기기/OS별 IME 동작을 전수 보장하지 않는다.

현재는 신규 파일의 미연결 준비 단계다. 기존 부모 연결은 31·32·38차 체크포인트 뒤 신호에 맞추고, 독립 검토·브라우저·전체 타입 검사는 각 담당자가 진행한다. 빌드·배포·커밋은 하지 않는다.
