# 48차 CharacterCounter 구현·자체 검증

2026-11-17 KST. 구현과 자체 검사 완료, 제품/검사 TS freeze. native 브라우저·독립 검토·전체 타입 검사는 각 담당의 후속 결과를 기다린다. 빌드·Chrome·전체 tsc·배포·커밋은 실행하지 않았다.

## 변경과 보존 범위

- `src/components/CharacterCounter.tsx`: 최신 원고 ref와 전역/문항별 revision으로 초기 복원, 편집, undo, 복사, 자동 저장, 전체 초기화를 연결했다. 저장 key/schema 및 분석·정리 함수는 그대로다.
- `src/utils/characterCounterDraft.ts`: 5개 문항의 초기 필드별 병합과 실제 변경 판정, 전체 필드 복원 undo, 옛 undo token 차단을 담당한다.
- `src/utils/characterCounterActions.ts`: 기존 `copyShareResultLink`를 재사용한다. 실제 native 성공/legacy true만 성공, 실패는 원문 snapshot을 보존하며 명시 재시도를 제공한다.
- `src/components/CharacterCopyRecovery.tsx`: 읽기 전용 전체 원문·전체 선택·다시 복사·닫기. 입력 16px/버튼 44px/디자인 토큰과 KO/EN을 적용했다.
- `translations-character.json`: 양쪽 각각 13leaf. 통합 담당에게 최종 병합을 요청했다. 기존 description/guide/FAQ/showcase/meta는 통합 담당 소유다.

초기 저장본을 읽는 동안 실제로 바뀐 `title/text/target/basis`만 현재 입력을 우선한다. 다른 문항/필드는 저장본에서 복원한다. 초기 명시 탭 선택·편집이 없으면 저장된 활성 탭을 복원한다. 정상 읽기 자체는 쓰지 않고, 초기 편집 결과가 저장 baseline과 다를 때만 정상 자동 저장한다. 손상·접근 불가 상태는 원고 편집을 허용하면서 raw 자동 덮어쓰기를 막는다.

정리·현재 문항 비우기·수정본 복원은 한 단계 undo를 만든다. 이후 같은 문항의 실제 편집은 이전 undo를 무효화한다. 탭만 왕복하고 해당 문항을 편집하지 않았다면 undo가 유지되며, 복원 undo는 제목/본문/목표/기준 전체를 되돌린다.

자동 저장은 기다리는 잠금 안에서도 수명·operation·문서 revision을 확인한다. 확인 당시 원고와 달라진 전체 초기화 요청은 삭제하지 않고 취소 안내를 표시한다. readback 확인 뒤 raw/baseline을 잠금 안에서 갱신한다. 원래 `withWritingStorageLock`의 Web Locks + CAS/readback을 재사용하며 미지원 환경의 완전한 동시 쓰기 원자성은 주장하지 않는다. readback 오류는 실제 쓰기가 이미 일어났을 수 있으므로 원본 보존/롤백을 보장하지 않고 성공 표시를 하지 않는다.

전체 초기화는 확인 후 `characterCounter.v2`만 제거한다. `characterCounter.writingVersions.v1`과 수동 수정본 20개, 백업 11차, Diff handoff 25차의 제품 파일·저장 규칙은 변경하지 않았다. 부모는 최신 `current/activeTab`을 계속 전달하고, `onRestore`에서 현재 문항/revision을 확인해 기존 확인 절차를 거친 복원을 적용한다. 초기 복원 전 수정본 fieldset만 비활성화한다.

맞춤법은 Clipboard 요청을 시작하고 await 전에 고정 `https://nara-speller.co.kr/speller/`를 `_blank`, `noopener,noreferrer`로 연다. 원문을 주소나 요청 본문에 넣지 않는다. null 반환은 팝업 차단으로 단정하지 않고 열기 요청 안내를 한다. 실제 외부 사이트/개인 원고를 이용한 검증은 하지 않았다. 시스템이 이미 수행한 Clipboard 쓰기를 취소한다고 주장하지 않으며 오래된 추가 fallback/상태만 막는다.

## 실행 근거

`node scripts/check-character-counter-state.ts` — **9그룹 PASS**.

1. 필드별 초기 병합·다른 문항 보존·원본 배열 불변.
2. 실제 변경 없는 입력과 초기 명시 탭0의 구분.
3. 5문항×4필드 20좌표·공백/개행/한글/emoji 원문 보존.
4. 전체 필드 undo·탭 왕복·입력 ABA 뒤 옛 undo 차단.
5. no-op 변환·잘못된 업데이트·전체 초기화 revision.
6. Clipboard 거부/부재와 fallback false/throw/true의 실제 결과.
7. 일반 복사/맞춤법 복사 소유권 및 오래된 거부의 fallback0.
8. 캡처 원문 재시도·이전 닫기/성공 timer 차단.
9. 언마운트 뒤 늦은 성공의 상태 갱신0.

`node docs/verify/2026-11-17-repeat-batch48/check-character-parent.mjs` — **9그룹 PASS**.

실제 부모와 새 helper를 번들해 실행하고 복구 자식도 실제 렌더한다. 범용29 hook host를 재사용하며 저장소·Web Locks·Clipboard·legacy DOM·팝업은 제어 포트다. `WritingVersionsPanel`은 props 포트로 분리하여 현재 탭/복원/undo 연결만 검사했다. 실제 버전 파일 UI/브라우저 native 동작을 이 검사에 포함했다고 주장하지 않는다.

1. 정상 복사, 거부+false의 실제 전체 원문 복구/선택/재시도.
2. 탭 변경·입력/언어 ABA 뒤 늦은 거부의 legacy0·잘못된 안내0.
3. 복원 microtask 전 여러 필드/문항 편집 병합, untouched 저장5탭, 정상 초기쓰기0.
4. 정리→새 입력→옛 undo 무효, 수정본 전체 필드 복원/undo, 옛 다른 탭 복원 callback 차단.
5. 현재 지우기 취소/undo, 전체 초기화 대기→새 입력 취소, 정상 전체 초기화의 수정본 key 보존.
6. 대기 저장 A/B 중 B만 쓰기, 언마운트 뒤 저장/초기화/Clipboard 완료 무효.
7. 손상 raw+초기 입력 보존, quota 재시도, 외부 CAS 충돌/readback 실패에 거짓 성공0.
8. 맞춤법 click의 동기 `copy→open`, 고정 URL/옵션/원문 미전달·복사 실패 복구·open throw 안내.
9. Strict effect 재실행 원고 보존/새 copy owner, cleanup 뒤 초기 복원 무효.

첫 fixture 실행에서 기존 성공 문구를 `복사했어요`라고 잘못 가정한 assertion만 실패했다. 실제 canonical 값 `복사됨`을 조회하는 기대값으로 수정했고 제품 변경 없이 9그룹이 통과했다. 이것을 제품 결함으로 집계하지 않는다.

`npx eslint`로 부모·복구 자식·순수 모듈2·TS검사·actual-parent MJS 총 **6파일 exit0/경고0**. 초기 복원 callback 명명까지 포함한 최종 제품 상태를 검사했다. 원래 root `before-fix.json`/baseline MJS와 별도 `clear-before-fix.json`/MJS는 덮어쓰지 않았다. 전체 자체 실행 수는 **18그룹**, baseline5+추가재현1은 별도 사전 근거다.

## Native/독립 핸드오프

초기 복원 callback은 `queueMicrotask(function restoreInitialCharacterDraft() { ... })`다. 이 함수만 보류하면 React/다른 자식 microtask를 막지 않고 조기 입력 경계를 재현할 수 있다.

| selector | 의미 |
|---|---|
| `[data-character-root]` | `data-character-ready=true/false`, `data-character-active=0..4`, `data-character-revision` |
| `[data-character-tab="0".."4"]` | 문항 전환 |
| `[data-character-title]`, `[data-character-content]`, `[data-character-target]` | 제목·본문·목표 입력 |
| `[data-character-basis="chars/charsNoSpace/bytesKr/x"]` | 글자 기준 |
| `[data-character-copy]`, `[data-character-speller]` | 공통 copy owner, 후자는 고정 URL 동기 열기 |
| `[data-character-transform="tidy/collapse/joinLines/stripSpecial/upper/lower"]` | 기존 정리 함수 |
| `[data-character-undo]`, `[data-character-clear]`, `[data-character-clear-all]` | undo/현재 지우기/전체 초기화 |
| `[data-character-save-status]` | loading/saving/autosaved/failed/corrupt/unavailable/conflict |
| `[data-character-save-retry]` | failed의 저장 재시도 |
| `[data-character-copy-recovery]`, `-manual`, `-select`, `-retry`, `-close` | 복구 section/readonly textarea/세 버튼 (모두 data-character-copy 접두사) |
| `[data-character-action-notice]` | clearCancelled/spellerOpened/spellerFailed |

자동 초안 schema는 `{tabs:[{title,text,target,basis}]×5,active}`와 기존 key 그대로다. Web Locks 이름도 `characterCounter.v2`다. snapshot20 key를 전체 초기화에 포함하지 않는다. 원문 글자수 계산·목표/기준·5문항은 기존 그대로이며 신규 수동 복사 textarea를 제외하면 추가 영구 저장/URL 원문 전송을 만들지 않았다.
