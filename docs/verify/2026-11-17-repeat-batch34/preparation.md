# 34차 숫자 한글 변환 — 미연결 준비 결과

2026-11-17 KST. 28·30차 체크포인트 뒤 승인 범위인 **신규 파일만 준비 완료**했다. 기존 `NumberToKorean.tsx` / `NumberToKoreanBatch.tsx` / 계산·일괄 유틸은 수정하지 않았다. 부모 연결은 31·32·38차 체크포인트 뒤 root의 신호를 기다린다. canonical 번역·생성물·메타·패키지·저장소는 변경하지 않았다.

## 준비 파일과 API

| 파일 | 준비 내용 |
|---|---|
| `src/utils/numberToKoreanEditing.ts` | 고정 SSR/첫 client 예시, raw/IME/초점/편집/복원 세대 reducer, 숫자형 blur 정리, 기존 quick-add 의미, 현재 원문 기반 URL 빌더 |
| `src/utils/numberToKoreanActions.ts` | 전 대상 공용 request/revision guard, native/legacy 실제 성공 판정, 부모 소유 controller, 실패 text snapshot, retry/close/성공 timeout/언마운트 세대 보호 |
| `src/components/NumberToKoreanCopyRecovery.tsx` | 전체 readOnly 원문·수동 선택·실패 안내·현재 재시도·닫기. 선택을 복사 성공으로 표현하지 않음 |
| `scripts/check-number-to-korean-editing.ts` | 입력·URL·정밀도·IME 순수 검사 14그룹 |
| `scripts/check-number-to-korean-actions.ts` | clipboard/DOM 선택/요청 경합/timeout 제어 포트 검사 14그룹 |
| `docs/verify/2026-11-17-repeat-batch34/check-number-recovery.mjs` | 실제 복구 자식 코드와 제어 textarea 포트 4그룹 |
| `docs/verify/2026-11-17-repeat-batch34/translations-number.json` | KO/EN 동일 구조 14키: `editing` 7개 + `copyRecovery` 7개 |

입력 API는 `initialNumberEditingState()`, `reduceNumberEditing(state, action)`, `formatNumberOnBlur(raw)`, `addNumberQuickAmount(raw, amount)`, `numberInputSyncUrl(currentUrl, state)`, `numberShareUrl(currentUrl, state)`다. 순수 함수에는 DOM/history/storage 접근이 없다.

- 초기 raw는 `123,456,789`로 고정한다. query가 없을 때만 예시를 유지한다. `has('n')`가 참이면 빈값과 무효 원문도 우선한다. 이미 편집/조합/비우기/quick 동작을 시작했다면 늦은 최초 복원은 입력을 바꾸지 않는다.
- 일반 change는 원문을 그대로 저장한다. 한글/미완성/무효 입력의 blur는 원문을 유지한다. 숫자 정리는 기존 parser와 숫자형 문법을 모두 만족할 때만 적용하고 20자리 정수·긴 소수부·끝점·소수 뒤0을 문자열로 보존한다.
- 조합 중 blur는 `normalizePending`만 남긴다. 조합 종료와 후속 input 뒤 최신 generation으로 예약한 정리는 아직 비초점·비조합·동일 세대일 때만 적용된다. 재초점/clear/새 세대는 이전 예약을 거부한다.
- URL 단순 읽기는 쓰기 계획을 반환하지 않는다. 사용자 clear는 기존 키로 `n=`을 명시한다. 유효 입력은 canonical n, 무효 편집은 n 삭제다. 다른 query/hash는 보존한다. 현재 링크 복사는 URL effect가 아직 실행되지 않아도 클릭 순간 raw로 만든다.

복사 API는 `createNumberCopyController(ports, onChange)`다. `request({target,text,label})` / `invalidate()` / `getSnapshot()` / `retry(token)` / `close(token)` / `dispose()`를 제공한다. target은 `formal`, `formal-mobile`, `contract`, `chinese`, `mixed`, `reading`, `english`, `link`, `batch`며 모두 같은 최신 요청을 공유한다.

- native 성공과 `execCommand('copy') === true`만 성공이다. 늦은 거부는 fallback을 시작하지 않으며 늦은 성공/실패는 새 안내를 덮지 않는다.
- request 객체를 복사해 보관하므로 호출자가 객체를 나중에 수정해도 실제 요청과 복구 원문이 달라지지 않는다.
- fallback은 focus/select 뒤 소유권을 다시 확인하고 임시 DOM을 finally로 정리한다. 새 입력으로 소유권을 잃은 뒤에는 이전 focus도 복원하지 않는다.
- 성공 timeout은 자기 token에만 작동한다. 오래된 retry/close handler는 새 대상에 영향을 주지 않는다. 이미 시작한 native Clipboard 요청의 물리적 쓰기 자체를 취소한다고 보장하지 않는다.

## 실행 결과

| 실행 | 결과 |
|---|---|
| `node scripts/check-number-to-korean-editing.ts` | 14그룹 PASS |
| `node scripts/check-number-to-korean-actions.ts` | 14그룹 PASS |
| `node docs/verify/2026-11-17-repeat-batch34/check-number-recovery.mjs` | 실제 자식 4그룹 PASS |
| 신규 제품 3파일 + TS 검사 2파일 + MJS 검사 1파일 범위 ESLint | 최종 오류0/경고0 |

**총 32그룹.** ESLint 최초 실행에서 검사 파일의 `prefer-const` 1건이 있었고 선언만 고친 뒤 해당 파일 lint를 다시 통과했다. 나머지 5파일은 최초 실행에서 오류·경고가 없었다. Node의 기존 package module-type 경고는 제품 실패가 아니며 이를 없애려고 package 설정을 변경하지 않았다.

검사에는 2^53 초과·정확한20자리·긴 소수, `n=` 새 방문, 무효 query 읽기0쓰기, early edit/IME/clear/quick 우선, composition blur 재배열, 단일↔일괄↔링크 늦은 거부/성공, fallback false/throw/truthy 거부, 100행 TSV·한글·emoji 전체 UTF-16 선택, 이전 성공 timer/복구 handler가 포함된다.

## 연결 시 남은 작업과 검사 한계

1. 부모는 raw/조합 상태를 동기 ref로 먼저 갱신하고 기존 결과 계산에 raw를 넘긴다. main input의 강제 formatting/autoFocus를 제거한다. 단순 focus 변화만으로 복사 세대를 바꾸지 않으며, blur가 raw를 바꾼 경우에는 복사를 무효화한다. fallback의 임시 focus가 자기 복사를 불필요하게 취소하지 않도록 이 경계를 실제 부모에서 확인한다.
2. 조합 중 blur 예약은 최종 input 이후 최신 generation을 캡처하고, 브라우저의 실제 focus도 확인한다. 부모의 최초 hydration 처리·지연 예약 cleanup·history.state 보존은 아직 연결하지 않아 실제 부모 검증 대상이다.
3. 부모 controller 1개를 batch에도 전달한다. 단일/일괄 raw, prefix, spacing, locale, 번역된 TSV 헤더가 바뀌면 동기 handler 또는 layout 경계에서 invalidate한다. 구식 token을 묶은 recovery callback만 넘긴다. batch 다운로드 오류는 copy 상태와 분리하며 CSV snapshot/BOM/수식 보호는 유지한다.
4. 실제 자식 검사는 React hook harness로 제품을 번들하고 textarea 메서드만 제어했다. 실제 DOM selection, 입력 caret, 기기 IME, native clipboard, 320px 레이아웃은 검증하지 않았다. 해당 범위는 부모 연결 후 verify의 단독 Chrome 검사다.
5. 기존 계산·일괄 유틸은 변경하지 않았으므로 과거 전체 검사를 반복하지 않았다. 연결 뒤 실제 사용 경로에 맞게 기존 회귀/100행 CSV reader를 확인한다. 전체 TypeScript 검사·빌드·배포·커밋은 실행하지 않았다.

준비 제품/검사 TS는 안정 상태로 고정한다. 이후 기존 담당 기능의 실제 결함 요청이 오면 우선 대응하며, 부모 연결·canonical 병합은 조율된 단계 신호 뒤 진행한다.

## 31·32·38차 전체 타입에 포함된 준비 파일 보완

통합 담당의 전체 타입 첫 실행에서 이 준비 코드 `numberToKoreanActions.ts`의 native `writeText` truthy 검사에 TS2774 1건이 보고됐다. 지원 여부를 `typeof globalThis.navigator?.clipboard?.writeText === 'function'`으로 명시하는 한 줄만 수정했다. 기존 브라우저의 함수/API 부재 분기는 동일하며 다른 제품·부모는 수정하지 않았다.

영향 확인은 copy 도메인14그룹 재통과, 실제 기본 경로의 `globalThis.navigator` 함수 성공/API 부재 제어 검사 통과, 해당 제품 파일 ESLint exit0/오류0/경고0이다. 이 재검사는 앞선32그룹에 중복 집계하지 않는다. Chrome은 반복하지 않았고 전체 타입 재실행은 통합 담당에게 넘겼다. 준비 TS는 다시 고정한다.
