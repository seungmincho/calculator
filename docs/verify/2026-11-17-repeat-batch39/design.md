# 39 정규식 처리 — 읽기 설계

2026-11-17 KST.33 자체·독립·native 발견 대응 뒤 작성했다. **39 제품/유틸/검사 TS는 아직 작성하지 않았다.** 원래 `RegexExtractor.tsx`, 계산 이력 hook, root의 실제 VM9+스마트 handler3 재현과 plan을 읽었다. 아래는 구현 경계를 정리한 설계이며33/34 전체 체크포인트 뒤 별도 준비 신호를 따른다.

## 분리할 책임과 API

- 새 `src/utils/regexEngine.ts`: 구조/길이 검증, 실행, 빈 일치 진행, 점진 출력 builder, replacement token 처리, 선형 줄 인덱스, 스마트 변환. 동기 순수 함수지만 **제품에서는 Worker 안에서만** 호출한다. 실패는 코드와 수치만 반환하고 사용자 원문을 로그/오류 문자열에 섞지 않는다.
- 새 `src/lib/regex/regex.worker.ts`, `protocol.ts`, `client.ts`: request/response schema와 실행 수명.19 Diff의 Worker 수명 패턴은 읽고 재사용 가능한 구조만 참고한다. 기존 Diff client/worker는 수정하지 않는다.
- 새 `src/utils/regexSnapshot.ts` 또는 engine 내 분리 함수: URL/저장 이력의 방어적 projection, 현재 입력과 성공 snapshot의 동일성. URL/이력 parser는 정규식을 실행하지 않는다.
- 새 `src/utils/regexActions.ts`: 최신 파일 선택/본문 편집 세대, 취소/실패/4MiB·디코딩 입력 제한, 출력/링크 clipboard 소유권, TXT URL 해제. 기존 공용 이력 저장소나 TTS/OCR 전달 키는 수정하지 않는다.
- 기존 `RegexExtractor.tsx`: draft·작업 종류·debounce/취소·프리셋/스마트 UI·history/URL 연결. 필요하면 결과/복구만 `RegexResultPanel.tsx`로 분리하고 입력 전체를 재작성하지 않는다. KO/EN fragment는 같은 담당, canonical/meta는 integrator 소유.

요청은 `{id, revision, operation, pattern, flags, replacement, inputText, transform}`의 불변 객체다. operation은 기존 `grep|replace|extract`; transform은 실행 함수/코드가 아닌 `none|dedupe|uppercaseMatch` enum이다. 성공은 `{id, revision, outputText, matchCount, inputLineCount, outputNonblankLines, outputLength, details, detailsTruncated}`와 요청 snapshot을 연결한다. 실패는 `{id, revision, error:{code,limit?,actual?}}`; 부분 출력은 성공 응답에 넣지 않는다.

## Worker·자동 실행·취소

1. draft 변경 즉시 이전 debounce/Worker/file-read/output 요청을 무효화하고300ms 뒤 단일 요청을 만든다. 컴파일을 포함한 RegExp 실행은 Worker만 한다. 처음 URL 복원 전에는 실행/주소 쓰기를 하지 않는다.
2. 요청당 Worker 하나,5초 timer 하나를 소유한다. 성공/실패/취소/초과/생성 또는 postMessage throw/onerror/onmessageerror/프로토콜 오류에서 한 번만 settle·terminate·timer 정리한다. id와 세대가 다른 메시지는 상태를 바꾸지 않는다. Worker 사용 불가이면 안내하고 main thread로 후퇴하지 않는다.
3. ‘중지’는 해당 revision의 자동 재실행을 억제한다. 같은 입력의 effect가 다시 실행돼도 중지 상태를 유지하고 명시 재시도만 새 요청을 만든다. 입력/프리셋/스마트 action은 새 revision이므로300ms 실행을 다시 예약할 수 있다. Strict replay/언마운트는 물리 Worker와 debounce를 함께 정리한다.
4. 정규식 역추적을 중단할 수 있는 것은 외부 Worker 종료다. Worker 안의 시간 확인은 exec 한 번이 막히면 실행되지 않으므로 보장으로 설명하지 않는다. [MDN Worker terminate](https://developer.mozilla.org/en-US/docs/Web/API/Worker/terminate)의 종료 동작을 사용한다.
5. 부모 연결 시 `visibilitychange`의 hidden과 `pagehide`에서 debounce/현재 Worker를 취소하고 마지막 성공 snapshot을 유지한다. 복귀했다고 자동으로 다시 실행하지 않으며 명시 재시도나 입력 편집으로만 재개한다. main thread timer는 background throttling을 받을 수 있으므로5초는 중단 기준이지 모든 환경의 엄격 wall-clock 상한이라고 설명하지 않는다.

## 정확한 문자열 의미와 한도

plan의 초기 한도는 input1,000,000/pattern10,000/replacement100,000/output4,000,000 UTF-16 단위,일치100,000,파일4MiB다. 입력/패턴/치환은 길이를 자르지 않고 검증한다. 출력은 append 전에 남은 budget을 확인하고 초과 즉시 실패한다. 긴 단일치환을 먼저 조립하지 않고 literal/capture/앞·뒤 문맥 조각 각각의 길이를 먼저 합산한다. 조각 배열의 개수도 무한히 커지지 않게 일정 크기 buffer로 합친다.

- extract의 nonglobal은 기존 `input.match(regex).join('\n')`처럼 첫 전체 일치+캡처를 포함한다. unmatched capture는 join의 빈 문자열 의미를 유지한다. global은 전체 일치만 출력한다. details와 matchCount는 실제 match 개수이므로 캡처 출력 행 수와 혼동하지 않는다.
- 빈 일치의 `lastIndex`는 u/v이면 코드포인트,그 외 코드유닛으로 진행한다. 끝의 빈 일치도 한 번 포함하고 끝낸다. 미일치·nonglobal·sticky 종료를 별도로 검증한다. 플래그의 지원 여부는 해당 JS 엔진의 RegExp 생성 결과를 따른다. UI g/i/m/s 외 기존 URL d/y/u/v도 임의로 지우지 않는다.
- grep은 원문을 LF로만 나누는 기존 정책을 유지해 CRLF의 CR도 원문 그대로다. 결과는 해당 행 한 번씩/입력 순서다. root가 지적한 **동일 RegExp 재사용**의 g행별 reset/nonglobal y행간 lastIndex 상태도 작은 native `line.match(regex)` oracle로 대조한다. 단순 ‘행마다 새 RegExp’로 바꾸지 않는다. global match 배열을 무제한 만들지 않고 순회하되 결과 행 수와 내부 탐색 일치 상한은 구분한다.
- replacement는 [ECMAScript GetSubstitution](https://tc39.es/ecma262/multipage/text-processing.html#sec-getsubstitution) 및 [MDN replace](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/replace)의 토큰 규칙을 따른다. 없는 숫자 캡처는 문자 유지,존재하지만 미일치 캡처는 빈 값,두 자리 해석 실패 시 한 자리 해석 등을 native oracle로 확인한다. named capture와 앞/뒤 문맥은 원본 기준이며 이미 치환된 문자열을 참조하지 않는다. 코드를 문자열로 평가하지 않는다.
- 첫5개 상세만 전달해도 한 일치의 많은 nested captures가 반복적으로 원문을 참조하면 structured clone이 커질 수 있다. 따라서 **출력 원문은 정확히 유지하되 상세 미리보기만 총20,000 UTF-16/필드2,000/캡처20개 제안 한도**로 별도 표시하고 전체 길이·캡처 수·생략 사실을 보낸다. 이 숫자는 추가 제안이며 구현 준비 때 root 확인 대상으로 둔다. DOM 출력은50,000단위 미리보기+정확한 전체 길이,복사/TXT는 성공 전체 문자열이다.

## 스마트 처리3건

- dedupe는 첫 등장 순서의 `Set(lines)` 의미를 유지하는 별도 Worker job으로 보낸다. 이전 debounce와 정규식 Worker를 먼저 취소해 예전 숫자 추출이 결과를 덮지 못하게 한다. 저장/공유용 snapshot에 dedupe 종류를 기록한다.
- capitalize는 `'\b(\w)'` 매치의 명시 `uppercaseMatch` 변환이다. `$1` 문자열을 대문자화하지 않는다. JS의 기존 ASCII 중심 `\w` 범위를 임의로 다국어 제목 변환으로 확대하지 않는다. 일반 치환 입력/패턴/작업을 직접 바꾸면 transform을none으로 돌려 숨은 변환을 남기지 않는다. flags 변경은 명시 transform의 전체/첫 일치 범위에 적용한다.
- 양끝 구분자는 기존 ‘공백으로 나눈 앞2토큰’ 입력을 유지하고 각각을 리터럴로 escape한다. 여러 글자 종료문자열을 한 글자 집합으로 바꾸지 않는다. 전체 앞/내용/뒤 일치 추출 의미와 첫 종료문자열 정책,포함된 #/정규식 메타/개행을 oracle로 확인한다. 기본 괄호 구분자도 보존한다.
- dedupe 뒤 다음 일반 입력 편집을 어떤 실행으로 볼지 UI에 명시한다. 최소안은 snapshot만dedupe이고 일반 패턴/본문/operation 편집은 일반regex job으로 전환한다. 공유·history에서 dedupe를 복원하려면 별도 transform enum도 함께 복원해 다른 연산으로 표시되지 않게 한다.

## 결과·파일·복사·저장

최소안은 이전 성공 결과를 지우지 않고 ‘이전 입력의 결과’ 상태로 둔다. 변경/실패/중지 시 **현재 결과 저장/공유는 막고**, 이전 출력의 복사/TXT를 제공한다면 버튼 가까이에 이전 snapshot임을 명시한다. 출력 건수/행 수/처리 모드/파일명도 같은 snapshot에서 읽는다. 빈 성공 결과와 실패를 구별한다.

clipboard 출력/링크는 공통 request owner를 사용해 서로의 늦은 fallback·타이머·복구 안내를 취소한다. native 성공 뒤 이미 일어난 OS 쓰기를 되돌린다고 약속하지 않는다. 복사 실패 시 정확한 읽기 전용 전체 내용·수동 선택·재시도를 제공하고 focus/select throw도 입력을 보존한다.4M 전체 선택용 field는 평소50k 미리보기와 구분해 명시 펼치기 가능성을 검토한다. TXT는 전체 문자열, 클릭 시점 operation 파일명,URL 생성 전후 세대검사·해제 소유권을 갖는다.

FileReader는 abort와 읽기 세대 검사 둘 다 사용한다. 늦은 onload/onerror/abort가 새본문·새파일·언마운트를 덮지 못한다. 선택 input.value를 비워 동일 파일 재선택이 가능하게 한다. 파일 실패는 현재 입력/성공 결과를 유지한다. 원문을 console에 출력하지 않는다.

이력 저장은 현재 draft와 성공 snapshot이 같을 때만 가능하다. 기존 regex type/inputs/result를 유지하고 matchCount/transform 등은 부가 필드로 넣는다. `replacement`는 inputs에서 계속 읽고,구형 inputText는 result쪽 fallback을 유지한다. 새 상세5개 제한 때문에 이력 카드의 `matches.length`를 전체 개수로 쓰지 않도록 **명시 matchCount 우선,구형 배열 길이 fallback**으로 바꾼다. saveCalculation의 boolean 실패를 안내하고 입력/결과를 남긴다. 공용 history hook/store 전체 개편은 하지 않는다.

## URL/공유

초기 기본 트리→hydrated1회 URL restore→sync ready 순서로 잡고 자기 replaceState를 외부 복원으로 처리하지 않는다. 기존 이중 인코딩 문자열은 추가decode를 try/catch해 복원한다. malformed percent는 raw값을 유지하고 복원 안내를 표시하며 화면을 죽이지 않는다. 새 writer도 기존 계약과 호환되는 이중 인코딩을 유지하면 `%20` 같은 문자 자체와 이미 인코딩된 문자의 모호성을 추가로 만들지 않는다. replacement도 복원하고 smart enum은 허용 목록만 읽는다.

unknown query/hash/history.state는 유지한다. 큰 입력의 완성 URL 한도는 **16,384문자 제안**이며 실제 사용자 텍스트 길이 한도와 다른 제약으로 설명한다. 초과 시 숫자처럼 일부만 잘라 공유하지 않고 공유를 막는다. 이전 입력 URL이 남아 복사되지 않도록 해당 도구 소유 key만 제거하거나 갱신 실패 상태로 표시하는 정책을 준비 시 확정한다. 본문이 URL에 들어가는 기존 동작을 ‘원문이 저장/노출되지 않음’으로 설명하지 않는다. 출력 TXT는 URL 한도와 별개다.

## 검증 단위

1. 순수: root 정상4회귀·빈일치4·Unicode/CRLF/끝0길이·g/y/u/v·nonglobalcaptures,토큰별 및 짧은 임의 문자열의 native replace/match/grep oracle. 임계한도·임계+1와 출력확장 budget,초과시 부분성공0. 스마트3재현의 정확한 수정 결과.
2. client: 가짜포트의 생성/post/error/messageerror/timeout/cancel/늦은 A→B→A/Strict한번종료. 역추적은 별도 실제 Node worker thread에서 외부timeout으로 종료하고,main thread에 위험패턴을 실행하지 않는다.
3. 실제부모:300ms debounce취소/재시도·스마트dedupe우선·프리셋/이력replacement·URL 초기복원/손상/기타key·최신파일·결과snapshot·교차copy/수동선택/옛timer·저장실패.
4. 독립 담당은 별도 oracle/assertion,실제 Chrome 담당은 Worker bundle·취소/heartbeat·native clipboard/TXT/장문50k preview·KOEN320px. 전체 tsc는 모든 TS고정 뒤 integrator만 실행한다.
