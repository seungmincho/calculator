# 30차 미연결 준비 결과

이 문서는 미연결 준비 시점의 기록이다. 이후 승인된 두 시계/startedAt 보완과 부모 연결 결과는 implementation.md에 별도로 기록했다.

2026-11-17 KST. 27차 체크포인트 뒤 승인 범위의 신규 유틸·controller·검사·번역 조각만 준비했다. 기존 `PomodoroTimer.tsx`, `pomodoroGoal.ts`, 통계/목표 schema 및 canonical 메시지는 변경하지 않았다. 제품 UI/실제 브라우저 결과가 아니다.

후속 읽기 검토: root가 절전 중 단조 시계 정지와 긴 완료 잠금 후 다음 단계 저장/실행 시각의 차이를 발견했다. `design.md`에 근거와 승인된 최소 보완 계약을 추가했으며 **CSV·29차 체크포인트까지 TS 고정**이다. 아래28그룹은 기존 준비 결과이고 해당 추가 경계의 해결 증거로 확대하지 않는다.

## 파일과 API

| 파일 | 준비 내용 |
|---|---|
| `src/utils/pomodoroSession.ts` | 엄격 설정/공유 타입, phase 시간, 밀리초 기준 계산, 새 방문 복원, 기존 skip/완료 전이 |
| `src/utils/pomodoroPersistence.ts` | 기존3키 parser, same-key version1 timer checkpoint, strict legacy/CAS/readback, 확인된 raw 폐기, abort 가능한 키별 lock |
| `src/lib/pomodoro/session.ts` | 주입 시계·250ms 표시·복귀 listener, 실행 소유자, 완료 승인·세대·취소, 완료/skip/만료 복귀 이벤트 |
| `scripts/check-pomodoro-session.ts` | 제어 시계/controller15그룹 |
| `scripts/check-pomodoro-persistence.ts` | 메모리 Storage/LockManager13그룹 |
| `translations-pomodoro.json` | `pomodoroTimer.reliability`32개 KO/EN 키·placeholder 일치 |

controller는 `createPomodoroSession(ports,onChange,onTransition,initial?,initialNotice?)`로 만들고 `getSnapshot/start/pause/skip/advanceExpired/resetPhase/resetAll/applySettings/updatePreferences/interruptConflict/replace/checkpoint/dispose`를 제공한다. `isRunning`과 `settling`을 구분한다. 부모가 읽은 정상 실행 상태는 생성 시 남은 시간을 이어 가지만 재방문 만료는 시작 버튼으로 완료시키지 않고 `advanceExpired`로만 skip 전이한다.

`authorizeCompletion(proposal,signal)`은 선택 포트다. 부모 연결 때 timer raw/잠금 확인만 이 포트에서 처리하고 lock 해제 후 반환해야 한다. `proposal.next`는 외부 수정에 영향받지 않도록 복제한다. 완료 대기 중 reset/skip/이탈/충돌은 signal과 세대를 무효화한다. 실제 통계/할 일/음향/알림은 승인된 `onTransition`에서 수행하며 이 모듈이 직접 접근하지 않는다.

저장 키는 `pomodoro-settings`, `pomodoro-tasks`, `pomodoro-timer-state` 그대로다. timer version1은 기존8필드와 `version/revision/phaseId/remainingMs`를 포함한다. 단순 읽기0쓰기, 정상 체크포인트에서 strict legacy를 같은 키로 갱신하며 새 동의 흐름은 없다. 손상/미래 버전/초과 원문은 쓰기를 거부한다. quota와 post-write unconfirmed를 구분하고 확인 불가에 rollback하지 않는다. settings/tasks는 기존 객체/배열 형식이다.

## 실행 근거

- `node scripts/check-pomodoro-session.ts`: **15그룹 PASS**. 1.4초 tick oracle, 소수 밀리초 pause/resume, live 벽시계 독립/단조 역행, 큰 지연1회/autoStart 전체시간, 기존 긴 휴식/skip 규칙, pause에서 만료 시 다음 정지, reset/apply 이전 callback, 새 방문 만료·시계 변경, lock 대기 취소/늦은 승인, 관찰시점 귀속, conflict/unconfirmed, dispose, 설정 토글, safe-integer overflow, 부분 포트 생성 실패와 재진입 취소.
- `node scripts/check-pomodoro-persistence.ts`: **13그룹 PASS**. legacy 원문·큰 estimate/회차 보존, read0write, 호환 checkpoint/ms/revision, strict 범위·shape·future, 2MiB 정확 경계/UTF8, CAS/quota/cancel, unconfirmed no rollback, read block/corrupt, 명시 폐기 CAS/다른 키 유지, lock 직렬 두 독자 충돌과 취소/fallback.
- KO/EN 조각 정적 검사: **32키/placeholder 일치**.
- 신규5개 TS 파일 범위 ESLint: **오류0/경고0**. 앞선 실행의 검사 파일 `prefer-const`1건을 수정한 뒤 해당 파일만 재확인해 exit0을 받았다.

검사 초기 실패 중 Node의 parameter-property strip 제한은 일반 필드 생성자로 수정했다. 소수 밀리초 fixture가 Date.now 역할의 벽시각까지 소수로 만들었던 오류는 단조 시각만 소수로 진행하도록 바로잡았다. 제품의 벽시각 검증을 느슨하게 바꾸지 않았다.

## 부모 연결 때 남은 검증

현재 부모에는 아무 import/연결이 없다. activeTask 선택·통계 관찰일자·정상 알림/소리·locale/StrictMode·새로고침/visibility/pagehide 저장 순서·실제 storage event·취소 버튼/명시 원본 폐기 UI·320px는 아직 미실행이다. 부모 저장 큐는 최신 입력 세대를 확인해야 하며 timer lock 안에서 다른 키 lock을 중첩하지 않는다. timer+할 일+통계3키의 crash 원자성/내구성 또는 Web Locks 미지원의 완전한 동시쓰기를 보장하지 않는다.

브라우저 검증과 전체 타입 검사는 각각 전담 담당자가 수행한다. 실제 알림/스피커 재생, Chrome, 전체 tsc, 빌드·배포·커밋을 수행하지 않았다.
