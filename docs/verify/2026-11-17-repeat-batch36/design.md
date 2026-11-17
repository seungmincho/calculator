# 36차 DutchPay 저장·복사 복구 구현 설계

2026-11-17 KST. root가 후보의 최소 범위를 확정했다. **현재는 읽기 설계와 크기 계산만 완료했으며 제품·검사 TS/공용 메시지/codec은 변경하지 않았다.** 31 native 발견 대응이 우선이고, 31/32/38 타입 체크포인트 뒤 root 신호로 미연결 준비를 시작한다.

## 유지하는 것과 손실 방지

`src/utils/dutchPay.ts`의 정산식·v1 URL codec을 그대로 재사용한다. 현재 폼은 항목 추가 개수 제한이 없고 decoder만 100항목을 읽는다. 새 저장은 **현재 활성 모드의 State → encodeState → decodeState → 알려진 State 필드의 정확한 비교**를 통과해야 한다. 101항목, 잘리는 문자열, 숫자 정규화·인덱스/among 손실 등은 저장하지 않고 현재 폼·기존 기록 raw를 보존하며 지원 범위를 안내한다. URL 동작/codec을 늘리거나 입력 항목을 임의 삭제하지 않는다.

기존 기록도 d가 codec의 손실 없는 정규 형태인지 검증한다. base64url을 크기 제한 아래에서 풀고 UTF-8/JSON/버전·배열 구조를 확인한 뒤 `encodeState(decoded) === d`로 잃어버린 필드·항목·기본값 치환을 배제한다. 정상 기존 writer가 저장한 d는 이 형태다. 손상·미지원·잘림이 필요한 저장 원본은 일부 항목만 필터링해서 정상 목록으로 만들지 않는다. 해당 key의 쓰기를 막고 재조회 안내를 제공한다. 읽기만으로 migration/기본값을 쓰지 않는다.

저장 대상은 기존처럼 현재 모드의 지출 목록 하나다. 부모의 비활성 모드 초안까지 새 schema로 저장하지 않으며, `apply`의 다른 모드 기본 예시 처리도 유지한다. 명단 순서·중복 이름·빈 문자열·문자 escape는 보존한다. 저장된 화면 제목은 현재처럼 `state.title.trim()`이다.

## 실제 크기 계산과 파싱 상한

2026-11-17에 Node `--experimental-strip-types --input-type=module`에서 **실제 encodeState/decodeState/settle을 import**해 계산했다. 코드나 JSON 원본을 저장하는 제품 동작은 실행하지 않았다.

경계 입력: 사람30명 × 이름20 UTF-16 단위, 모임명30, 지출100개 × 이름30, weight9.9, amount1e11(현재 URL decoder가 허용하는 범위), payer/leader29, unit1000, dir floor, `among=[1..29]`. 전원 제외 마스크는10자리이며 전원일 때 마스크 생략보다 크다. 이름·모임명은 JSON에서 문자당6바이트가 되는 제어문자 또는 lone surrogate로 채웠다. 현재 검증에서 제어문자를 금지하지 않으므로 이 경계도 보존한다.

| 문자열 입력 | v1 tuple UTF-8 bytes | d ASCII bytes | 최근10개 JSON bytes¹ | 계좌60자 JSON bytes |
| --- | ---: | ---: | ---: | ---: |
| ASCII | 7,100 | 9,467 | 95,691 | 62 |
| 한글 `가` | 14,360 | 19,147 | 193,091 | 182 |
| 6바이트 escape 제어문자 | 25,250 | 33,667 | 339,191 | 362 |
| lone surrogate | 25,250 | 33,667 | 339,191 | 362 |

¹ 각 항목 `at=8640000000000000`(유효 Date의 양수 끝값), total1e13, n30. 음수 Date 끝값까지 유효 timestamp로 허용하면 항목당1바이트가 더해져 **339,201 bytes**다. 실제로 trim에 지워지지 않는 제어문자 코드 `[1,2,3,4,5,6,7,14,15,16]`를 써서 서로 다른 d10개를 만들었고, 10개 모두 title30자·d 고유·raw339,201을 확인했다. 허용된 문자열 범위에서는 JSON escape6바이트/UTF-16 단위가 최댓값이다.

계산 핵심식은 다음과 같다. 저장소 접근이 없는 읽기 조사용 계산이며 제품 상수를 변경한 것이 아니다.

```js
const encoded = encodeState(state)
const tupleBytes = Buffer.byteLength(Buffer.from(encoded, 'base64url'))
const record = { d: encoded, title: state.title.trim(), total: settle(state.people, state.expenses).total, n: 30, at: -8640000000000000 }
const rawBytes = Buffer.byteLength(JSON.stringify(records), 'utf8')
// 100항목: encode/decode의 전체 State 동일
// 101항목: 원본101 → decode100; byte 상한만으로 손실을 막을 수 없음
```

새 파싱 상한은 **최근 raw512KiB(524,288 bytes), 개별 d64KiB(65,536), 풀린 JSON48KiB(49,152), 계좌 raw1KiB(1,024)**로 정한다. 정상 writer의 최악값을 충분히 포함하고 알 수 없는 추가 필드/공백으로 부풀린 raw를 제한한다. 이것은 localStorage quota 보장이 아니라 파싱 비용 제한이다. 먼저 string.length로 명백한 초과를 거른 뒤 UTF-8 byte를 검사해 매우 큰 raw의 불필요한 추가 할당을 줄인다. 초과값을 자르지 않고 원본을 그대로 둔다.

## 도메인 API와 저장 계약

새 `src/utils/dutchPayStorage.ts`에서 두 key를 그대로 export한다. 저장 schema는 `dutchPay.recent = {d,title,total,n,at}[]`와 `dutchPay.account = JSON string` 그대로다. version/revision/origin 필드를 추가하지 않는다.

예정 API:

- `parseDutchPayRecent(raw)` / `parseDutchPayAccount(raw)`: null만 빈 정상 값으로 취급. 성공 시 raw와 복제한 값, 실패 시 raw를 버리지 않는 오류 결과. recent는 최대10개, 고유 d, 엄격한 알려진 필드 타입, title≤30, n1..30, total 유한 정수0..1e13, at 유효 Date의 정수 범위, canonical d/30명·100항목을 검사. account는 원문 문자열≤60이며 trim하거나 제어문자를 제거하지 않음.
- `prepareDutchPayRecent(state, now)`: 정확한 codec 왕복 확인→기존 계산기로 total→기존 다섯 필드 생성. `unsupportedState`이면 아무 write도 하지 않음. 현재 title과 전체 활성 State의 손실을 검사한 후에만 기존 제목 trim을 적용.
- `readDutchPayRecent(storage)` / `readDutchPayAccount(storage)`: getItem 차단·파싱 실패를 구분하고 정상 읽기는0 write. 저장 실패와 다른 key의 상태를 섞지 않음.
- `commitDutchPayRecent(expectedRaw, operation, ports, current)` / `commitDutchPayAccount(expectedRaw, value, ports, current)`: 같은 key Web Lock 안에서 current 확인→raw exact CAS→동기 setItem→readback exact 확인. recent operation은 저장 당시 entry upsert(같은 d 제거/맨 앞/10개) 또는 확인한 d 삭제. 지원하지 않는 lock 환경은 같은 CAS/readback 경로를 사용하되 서로 협조하지 않는 탭까지 원자적이라고 주장하지 않음.
- 실패 상태는 `unavailable`, `corrupt`, `tooLarge`, `unsupported`, `quota`, `conflict`, `unconfirmed`, `cancelled`를 필요한 UI 문구로 묶음. setItem 뒤 readback 실패/불일치는 이미 기록됐을 수 있으므로 `unconfirmed`; 이전 raw를 다시 쓰는 rollback 없음. 명시 재조회 전 같은 작업을 무조건 반복하지 않음.

Web Lock 이름은 해당 storage key 그대로여서 같은 key의 모든 새 save/delete/account 경로가 협조한다. 새로운 저장소를 만들지 않는다. 다른 탭이 key를 바꾸면 알려진 basis를 조용히 교체하지 않으며 작업 직전 CAS로 마지막 경합도 확인한다. `storage` event는 충돌 안내와 이전 작업 무효화에 사용하고 폼/계좌를 자동 적용하지 않는다.

## 부모 작업 수명과 사용자 흐름

`DutchPay.tsx`에 초기 URL 복원 완료 state를 두고 그 전 저장/삭제/불러오기 handler를 막는다. 첫 URL d 또는 과거 total/people 복원 순서와 기본 예시를 유지한다. 최근 기록은 항상 명시 불러오기이고 storage 읽기/재조회가 현재 계산 폼을 덮지 않는다.

최근 목록은 마지막 확인된 저장 상태, 현재 계산 폼, 저장 pending/status를 분리한다. 저장 클릭 당시 snapshot을 저장하므로 그 후 입력이 바뀌어도 저장이 현재 폼을 되돌리지 않는다. 성공 안내에는 작업 snapshot 의미값/세대를 붙여 바뀐 정산을 방금 저장한 것처럼 표시하지 않는다. 삭제는 저장 목록만 바꾸고 현재 로드된 정산을 자동 제거하지 않는다. 불러오기를 lock/read 뒤 적용한다면 클릭 당시 선택+폼 revision을 검사하고 대기 중 편집/새 선택/이탈 후에는 적용하지 않는다.

계좌는 기존 자동 저장을 유지한다. 입력 즉시 memory account와 편집 화면 공지를 갱신하고 최신 입력 세대로 쓰기를 예약한다. 이전 lock 대기 요청은 취소·무효화하며 callback 직전에 다시 확인한다. 쓰기/검증은 lock 내부 동기 구간에서 끝내고 **검증된 자기 write basis는 callback 안에서 즉시 갱신**한다. 이후 React 상태 반영을 기다리는 사이 새 입력이 들어와 자기 write를 타 탭 경합으로 오인하지 않게 한다. 오래된 완료는 새 입력/상태를 덮지 않는다.

계좌 write 실패는 입력을 되돌리지 않고 ‘현재 화면에서 사용할 수 있지만 기기 저장이 안 됨’과 재시도를 제공한다. conflict/unconfirmed/corrupt에는 자동 재쓰기를 중단한다. 명시 ‘저장 상태 다시 확인’은 basis/상태만 다시 읽고 현재 입력은 보존하며 자동 저장을 재개하지 않는다. 이후 명시 재시도 또는 새 사용자 편집으로 현재 입력 저장을 진행한다. 첫 정상 초기 읽기만 저장 계좌를 입력에 적용한다. 원본 폐기/reset 메뉴는 첫 범위에서 추가하지 않는다.

StrictMode cleanup은 pending 토큰/timer/lock signal만 무효화하며 setup 뒤 새 행동을 막는 state/ref 불일치를 만들지 않는다. readback 확인 불가에서 성공을 단정하지 않고, 재조회 후에는 실제 저장된 내용과 현재 memory의 차이를 표시한다.

## 복사·공용 공유 경계

새 `dutchPayCopy.ts`는 amount/notice/link 요청을 하나의 부모 guard로 직렬화한다. native resolve 또는 legacy `=== true`만 copied. 현재 State/공지 문자열/ro/locale/목표/닫기/언마운트 변경 뒤 late rejection의 fallback과 옛 성공 timer를 막는다. 금액 원문은 기존 정수 숫자, notice/roLink는 기존 문자열 그대로다.

`DutchPayCopyRecovery.tsx`는 readOnly 전체 원문, 선택·재시도·닫기를 제공한다. 실패를 송금 성공으로 표시하지 않는다. 닫기/복구 완료 뒤 연결된 원래 버튼 또는 유효한 대체 버튼으로 focus를 돌린다. 복구 입력16px/수정한 버튼44px/320px KOEN을 확인한다.

ShareResult 내부 구현은 수정하지 않는다. 같은 DutchPay 화면에서 교차 클릭할 때는 ShareResult 래퍼의 click capture로 부모의 오래된 copy 요청을 무효화하고, 부모 copy 시작 때 로컬 반출 revision을 ShareResult의 기존 optional `resultKey`에 반영하는 작은 연결을 사용한다. 실제 부모 fixture에서 양방향 late rejection을 확인한다. 이미 OS에 제출된 복사는 되돌릴 수 없고 사이트 전체 Clipboard를 전역 직렬화한다고 주장하지 않는다.

계좌는 encoded d·최근 기록·ro 공지/DOM에 포함하지 않는다. ro에서 저장/계좌 입력 UI를 숨기며 ‘복사해서 수정’ 이후에만 편집으로 전환한다. 편집 notice와 사용자가 명시적으로 보내는 ShareResult text에는 계좌가 들어가는 기존 계약을 유지한다. 결과 key가 memory에서 계좌 변경을 구분할 수는 있지만 계좌를 URL/storage의 다른 key/로그/스크린샷에 새로 넣지 않는다.

## 파일·단계·검증

1. root 신호 후 미연결 `dutchPayStorage.ts`, `dutchPayCopy.ts`, `DutchPayCopyRecovery.tsx`, `scripts/check-dutch-pay-storage.ts`/copy 검사, KOEN fragment를 완결 단위로 준비. 기존 `dutchPay.ts` 수정 없음.
2. 별도 승인된 부모 시점에 `DutchPay.tsx`의 load/store/copy와 저장 상태만 연결. 무관한 계산/UI 전체를 리팩터링하지 않음. 화면 grid의 모바일 열 지정과 수정 조작 크기는 최소 보완.
3. 실제 부모 fixture로 URL 우선·메모리 보존·late 작업/Strict·ro/account·양방향 공유 경합, 순수 parser/CAS/한도/quota·readback/lock fallback을 검사. 100/101항목과 339,201-byte 기록, 길지만 실제 허용 범위인 escape를 회귀로 포함.
4. 기존 `scripts/check-dutch-pay.ts` 계산/URL 검사는 유지. scoped lint 후 TS freeze, 원본 messages/meta는 integrate, Chrome은 verify, 전체 tsc는 지정 통합 담당. 실제 native Clipboard/두 탭 Web Locks/320px는 그 별도 단계 결과로만 보고.

초기 준비가 승인되기 전 제품/검사 TS는 작성하지 않는다. 새 계정·은행 연결·송금 실행/확인·저장 개수 확장·백업 schema·codec 확장은 범위 밖이다.
