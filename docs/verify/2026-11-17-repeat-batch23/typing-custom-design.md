# 23A 내 글 타자 연습 — 읽기 설계

2026-11-17 KST. [23차 계약](plan.md)과 `TypingTest.tsx`, `typingTest.ts`, 기존 회귀 스크립트를 읽은 준비 기록이다. **아직 TS/제품 코드를 작성하지 않았다.** 21차 타입 체크포인트와 이후 root 연결 신호가 우선이다.

## 기존 경계

- 부모 `Mode`는 daily/short/long/time이며 `Entry.mode`와 같은 타입이다. `finish`가 최근 100개·일일 best/tries를 쓰므로 사용자 지문을 여기에 추가하면 통계가 섞인다.
- `target`은 기존 고정 `TEXTS`/`streamText`이고 설정 effect가 reset+공유 URL 갱신을 한다. 기존 목록·순서·일일 선택 규칙을 바꿀 필요가 없다.
- interval effect는 `startAt/result`만으로 실행하며 시간제 종료를 호출한다. 새 작업공간이 기본 UI를 숨기기만 하면 타이머와 기록 쓰기가 계속될 수 있다.
- 기존 `diffTyped`는 마지막 한글 자모 prefix를 composing으로 추정한다. 실제 composition 이벤트와 분리돼 있으므로 사용자 지문 child에서는 명시적인 IME 상태를 더해야 한다.
- 기존 결과 `copyText`는 Clipboard rejection 뒤에도 성공 상태를 표시한다. 새 결과에 그대로 재사용하지 않고 실제 성공 여부와 수동 선택을 구분한다.

## 권장 구조

기존 `Mode`/기록 schema를 유지하고 별도 작업공간 선택 상태 `standard | custom`을 부모에 둔다. 새 `CustomTypingWorkspace`는 `active`만 받으며 방문 중 계속 마운트해 초안·확정 지문을 유지한다. 비활성일 때 UI를 숨기거나 null을 반환하되 타이머가 유지되지 않도록 명시 정리한다. 앱 번역 함수/언어 변경을 reset dependency에 넣지 않는다.

부모의 ‘내 글 연습’ 전환 핸들러는 기본 연습 reset과 세대 무효화를 먼저 수행한다. 기본 interval/finish에도 활성 작업공간 가드를 두어 이미 큐에 들어간 오래된 tick이 숨겨진 채 기록하지 않게 한다. 기존 모드/지문 인덱스/KO·EN/시간 설정과 공유 URL은 마지막 기본 설정 그대로 유지한다. 기본 방식 버튼으로 돌아오면 새 기본 시도이며 사용자 초안은 남는다.

child는 `draft`, 정규화 미리보기, 명시 확정한 `target`, 타수 언어, 현재 `typed`, 실행/결과 상태를 분리한다. 초안은 편집 즉시 미리보기만 바꾸고 ‘이 글로 시작’에서만 target과 연습 세대를 교체한다. 진행 중 적용 버튼에는 현재 시도를 교체한다는 안내를 붙인다. 같은 지문 재연습은 확정본을 재사용하며 수정 중 초안을 자동 적용하지 않는다. 내 글에서 나가면 진행 중 시도/타이머를 정리하고 초안·확정본은 보존한다.

## 순수 처리·IME

- 새 작은 유틸에서 CRLF/CR/LF·탭을 일반 공백으로 바꾸고 연속 일반 공백을 한 칸으로 정리한다. 앞뒤 일반 공백 제거 정책도 미리보기 안내에 명시한다. 원 초안은 별도로 보존하며 NFC/음역/문자 교정은 추가하지 않는다.
- 정규화 결과의 `[...text].length`로 10~1,000 코드포인트를 검증한다. 초안/결과를 잘라 자동 통과시키지 않는다. 지문 작성칸은 붙여넣기를 허용하고 실제 타자칸은 paste/drop을 차단한다.
- `diffTyped`, `correctKeystrokes`, `perMinute`, `wpm`, `accuracy`, `topMissed`를 재사용한다. 일반 평균·등급/순위·최고기록·일일통계를 사용자 지문 결과에 넣지 않는다.
- compositionstart/end와 native isComposing을 함께 본다. 조합 중 target과 같은 마지막 글자가 잠시 보여도 종료하지 않는다. compositionend의 최종 value를 다시 처리하고, 뒤따르는 input 이벤트가 완료를 두 번 만들지 못하게 완료/세대 ref를 둔다.
- 명시 확정된 마지막 입력이 목표의 자모 prefix인 오타인 경우에도 영원히 composing으로 남지 않도록, 완료 판정 시점의 ‘확정된 composing 후보’를 오타로 처리하는 경계를 검토한다. 기존 유틸의 추정 규칙 자체는 변경하지 않는다.
- 시계는 시작 시각과 현재 시각의 차이를 사용하고 한 세대에 interval 하나만 둔다. 적용/재시작/모드 이탈/언마운트에서 정리하며 오래된 tick/완료/복사 콜백을 무효화한다.

## 복사와 소유 파일 초안

사용자 결과 복사는 이번 속도·정확도·오타·소요시간만 포함하고 지문을 넣지 않는다. 같은 지문을 복원하는 URL처럼 표현하지 않는다. 기본 결과 복사도 공통 작은 helper로 native clipboard/legacy true만 성공 처리하고, 실패 시 readonly 요약과 선택/재시도를 제공할 수 있다. 비동기 복사 완료가 다른 결과 옆에 성공 표시를 남기지 않도록 결과 세대를 확인한다.

예상 소유: `TypingTest.tsx` 최소 연결, 새 `CustomTypingWorkspace.tsx`, `utils/customTyping.ts`, 필요 시 작은 복사 helper/복구 child, 관련 검사, `translations-typing-custom.json`. 기존 `typingTest.ts` 엔진/기록 schema는 재사용하며 공용 번역 원본은 통합 담당 소유다.

## 착수 뒤 검증

1. 9/10/1,000/1,001 코드포인트·이모지·줄바꿈/탭/반복 공백·초안 원문 보존·불가 입력 무잘림.
2. 초안 편집과 확정본/결과 분리, 같은 지문 재연습, KO/EN·앱 언어/기본 모드 왕복 보존.
3. 한글 조합 중 마지막 글자 일치·확정 뒤 완료·오타 prefix 확정·중복 input·빠른 재시작/stale 완료.
4. 기본→내 글→기본의 활성 interval 수와 기본 기록 미추가, 사용자 결과에 최근/일일/URL 원문 미포함.
5. 실제 성공·Clipboard rejection/legacy false·수동 선택·늦은 복사 완료, 320px·16px·44px·키보드.
6. 기존 `scripts/check-typing-test.ts` 회귀. 합성 IME 이벤트와 실제 모바일 OS IME 검증은 구분한다.
