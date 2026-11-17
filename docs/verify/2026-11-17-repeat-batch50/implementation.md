# 50차 말하기 녹음 준비시간 — 작성자 완료

상태: **제품 연결·자체 19그룹·기존 영향 회귀 7그룹 PASS, 8파일 scoped ESLint 오류 0·경고 0. 제품/검사 TS 동결.** 독립·native·전체 타입 체크포인트는 아직 별도 대기다. Chrome·개인 마이크·사람 음성·모델 다운로드·빌드·배포·커밋은 실행하지 않았다.

## 변경 범위

- `src/utils/speakingPreparation.ts`: 0/3/5 값 검증, approval 시점 기준 monotonic deadline, 정수 초 표시, clock rollback 방어, 완료 1회·취소.
- `src/hooks/useSpeakingRecorder.ts`: run별 stream/recorder/context/chunks/timer 소유. `start(delay = 0)` 기존 무인자 호환, `preparing/remaining/phase/isBusy` 추가. permission 대기·준비·녹음·native stop 대기를 구분한다.
- `src/components/SpeakingPractice.tsx`: 메모리에서만 유지하는 기본 0초 선택, 메인과 기본 점검 재녹음 2경로 공통화, 정수 준비 숫자·문장·취소, 실제 handler까지 최신 busy 검사.
- `scripts/check-speaking-preparation.ts`, docs50 실제 hook/부모 harness·검사 3개와 기존 회귀 adapter, `translations-speaking-preparation.json` KO/EN 신규 8키.

canonical/generated/meta는 integrate 담당이다. 기존 speaking core/AI/worker/audio/storage/record schema는 수정하지 않았다. 준비 선택은 URL·IDB·localStorage에 저장하지 않는다.

## 실제 동작

0초는 기존처럼 마이크 승인 후 즉시 시작한다. 3/5초는 **승인된 뒤** 준비하며 그동안 stream만 보유하고 MediaRecorder·AudioContext를 만들지 않는다. 녹음 시간과 level은 0, take/Blob/전사/모델 요청은 0이다. deadline이 지나면 현재 run만 `MediaRecorder.start(250)`을 한 번 호출하며 그 시각부터 90초를 센다. 기존 MIME 순서, 0.5초 최소·빈 Blob 거부·최대 5 take는 유지한다.

준비는 100ms interval에서 남은 시간을 직접 계산하며 화면 상태는 정수 초가 바뀔 때만 갱신한다. 수동/자동 stop의 시각을 보관하므로 native stop 완료 callback 지연을 녹음 시간에 추가하지 않는다. stop 완료까지 busy이며 새 permission을 요청하지 않는다.

requesting/preparing의 명시 취소·hidden/pagehide는 run을 무효화하고 자원을 정리한다. 복귀만으로 재시작하지 않는다. 늦은 permission은 자기 stream만 닫는다. 이미 녹음 중인 background 정책은 기존처럼 유지한다. 이탈은 진행 중 recorder도 정리한다.

native `ondataavailable/onstop/onerror`, meter/preparation callback은 capture한 run과 recorder·예약 소유권을 확인한다. 옛 완료/오류로 새 stream/context를 닫거나 take를 중복 추가하지 않는다. close/stop 실패도 다른 자원 정리를 막지 않는다. baseline probe/`before-ownership.json`은 덮어쓰지 않았고 그 관측은 실제 native 이벤트 발생 주장과 구분한다.

부모의 mode/new session/open record/text/file take/title/transcript/저장/AI 시작은 최신 ref 및 동기 recorder busy 검사로 막는다. disabled 이전에 캡처한 handler를 호출해도 준비 중 새 연습이나 입력으로 바꾸지 않는다. **저장 중에는 title/transcript 최신 편집을 허용하는 기존 계약을 유지한다.** 두 재녹음 버튼은 동일한 delay와 최대횟수 검사·오류 초기화를 사용한다. 언어 변경은 선택·run·기존 원문을 초기화하지 않는다.

## 검증 결과

| 실행 | 결과 | 핵심 경계 |
|---|---:|---|
| `node scripts/check-speaking-preparation.ts` | 5 PASS | 0/3/5·소수 deadline·지연/rollback·취소·완료 1회 |
| `node docs/verify/2026-11-17-repeat-batch50/check-speaking-recorder.mjs` | 8 PASS | 실제 hook+가짜 permission/recorder/context: 중복 start, 준비 중 생성/Blob 0, 취소/hidden/pagehide, old stop/error/data/timer, 부분 생성 실패, 90초/최소시간, Strict 초기 replay/이탈 |
| `node docs/verify/2026-11-17-repeat-batch50/check-speaking-preparation-parent.mjs` | 6 PASS | 실제 parent+hook: 2버튼, same-event 및 캡처한 busy handler, 원고/기록 보존, 취소 후 명시 시작, 5 take, 저장 중 최신 편집, KO/EN/Strict/이탈 |
| `node docs/verify/2026-11-17-repeat-batch50/check-speaking-legacy-regression.mjs` | 기존 7 PASS | 20차 저장 snapshot·commit+목록 실패·CAS·삭제·검색·원문/TXT/요약URL·이탈 assertions 그대로 |

기존 회귀 adapter는 20차 파일을 읽어 **idle recorder mock의 추가 phase/isBusy 필드만 메모리에서 확장**한다. assertion과 제품 동작은 바꾸지 않는다. 기존 7그룹은 신규 19그룹에 합치거나 새 독립 결과로 세지 않는다. 새 actual harness는 실제 hook/부모를 실행하며 `SpeakingAIClient`, 음성 decode와 IDB를 제어 포트로 바꿔 호출 수 0/저장 snapshot만 확인한다. 실제 native Blob 길이·권한 화면·CSS·모바일 배치는 전담 브라우저 검증 범위다.

최종 scoped ESLint 대상은 제품 3파일, 순수 검사 1파일, docs50 MJS 4파일 총 8개이며 exit 0, 오류 0·경고 0이다. TS 실행의 Node module-type 안내는 package 설정 안내이고 검사 실패가 아니다.

### 최종 타입 검사 영향 보완

통합 담당의 첫 전체 타입 검사에서 `useSpeakingRecorder.ts`의 await 전후 `document.visibilityState` 직접 재검사가 TS2367로 보고됐다(`docs51/typecheck-attempt1.json` 보존). 매 호출마다 document 값을 읽는 `pageHidden()` 함수로 같은 판정을 분리했다. 상태/타이밍/취소 정책은 바꾸지 않았다. 실제 hook의 hidden/pagehide 1그룹과 부모의 permission 취소/hidden 1그룹만 영향 재검사해 PASS, 해당 hook 1파일 lint 오류 0·경고 0 후 TS 재동결했다. 영향 재실행은 신규 검사 수에 더하지 않는다. 전체 타입 재확인은 통합 담당이 수행한다.

## Native/독립 인계

- `[data-speaking-preparation="0|3|5"]`: 선택 버튼(44px 이상), `aria-pressed`.
- `[data-speaking-recorder-phase="idle|requesting|preparing|recording|stopping"]`: 현재 phase.
- `[data-speaking-countdown]`: 남은 정수 초 속성/텍스트. 준비 중 녹음 `role=timer`는 00:00.
- `[data-speaking-record=""]`: 메인 start/stop. 기존 기록 행도 `data-speaking-record="<id>"`이므로 빈 값까지 선택한다.
- `[data-speaking-rerecord]`, `[data-speaking-record-cancel]`: 결과 재녹음·권한/준비 취소.
- `[data-speaking-mode]`, `[data-speaking-new]`, `[data-speaking-file]`, `[data-speaking-text-take]`, `[data-speaking-take]`: 잠금/회귀용.
- `#speaking-session-title`, `#speaking-transcript`, 기존 `data-speaking-save/history` 계약 유지.
- 100ms 준비/녹음 interval은 현재 run과 timer handle이 함께 유효할 때만 동작한다. `performance.now`가 준비 deadline 및 녹음 시작시각의 단일 시계다. native stream은 합성 음원만, IDB·모델·실제 마이크는 기존 검증 제한을 지킨다.

KO/EN 8키 최종 조각은 integrate에 전달했다. EN 카운트 문구는 `Recording countdown: {seconds}s`로 1초에도 문법이 유지된다. 별도 49차 EN 수량 문구 polish는 해당 조각 한 값만 수정했으며 50 기능/TS와 무관하다.
