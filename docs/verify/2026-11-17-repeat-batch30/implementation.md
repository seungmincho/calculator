# 30차 Pomodoro 부모 연결 결과

2026-11-17 KST. CSV·29차 체크포인트 뒤 승인된 시계 보완과 실제 부모 연결을 완료했다. 제품/검사 TS는 독립·브라우저 발견 대응 외 안정 상태다. Chrome·전체 타입 검사·빌드·배포·커밋은 수행하지 않았다.

## 최종 동작

- 남은 밀리초와 고정된 실행 기준을 사용하며 tick별 초 반올림을 누적하지 않는다. 표시만 초 올림이고 pause는 마지막 tick 이후 소수 시간까지 확정한다.
- wall/mono 누적 진행 차이가2초를 넘으면 원인을 추정하지 않고 안전 중단한다. 남은 값을 늘리지 않는 최소값으로 정지하며0이면 무집계 만료 안내/명시 다음 단계, 양수면 확인 후 명시 재개다. 두 시계가 함께 진행한 정상 지연은 현재 단계 하나만 관찰일자에 집계한다.
- 완료 잠금을 실제 획득한 뒤 쓰기 직전에 읽은 `startedAt`을 다음 타이머 저장과 실제 실행에 함께 사용한다. 이전 단계 `observedAt`은 통계 날짜 귀속에만 쓴다. 영수증이 늦게 도착하면 같은 시작점에서 경과를 빼며 다음 단계까지 추가 집계하지 않는다.
- 새 방문의 이미 만료된 상태는 완료/할 일/알림/음향0이다. 명시 다음 단계는 skip 전이로 시작한다. 일반 skip·휴식·전체 초기화/설정 적용의 기존 규칙과 현재 선택 할 일 귀속은 유지한다.
- `pomodoro-settings`, `pomodoro-tasks`, `pomodoro-timer-state`의 정상 legacy를 엄격하게 읽고 정상 체크포인트에서 같은 timer 키의 호환 version1으로 저장한다. 단순 읽기는 쓰지 않으며 저장 동의/버전 버튼을 추가하지 않았다.
- 손상·미지원·초과 원문은 해당 키 쓰기를 차단한다. 메모리 타이머와 다른 정상 키는 계속 사용할 수 있다. 다른 탭 timer 충돌은 무집계 정지/명시 재조회이며 quota와 write 후 확인 불가를 구분한다. 원본 폐기는 별도 확인과 raw CAS가 필요하다.
- 통계/목표 API와 schema, 7일 CSV는 변경하지 않았다. timer 잠금 안에서 통계/할 일 잠금을 중첩하지 않는다. 세 키 전체의 crash 원자성 또는 Web Locks 미지원 환경의 완전한 동시쓰기 보장을 주장하지 않는다.

## 수정 파일

제품6파일: `src/utils/pomodoroSession.ts`, `src/utils/pomodoroPersistence.ts`, `src/lib/pomodoro/session.ts`, `src/lib/pomodoro/browserSession.ts`, `src/components/PomodoroTimer.tsx`, `src/components/PomodoroRecovery.tsx`.

`browserSession`은 주입 가능한 Storage/LockManager/시계/복귀 포트와 세 키 상태를 관리한다. 부모는 기존 목표/차트/설정/할 일 UI와 통계 저장 경로를 유지하며 완료 효과는 React updater 밖의 세대가 검증된 이벤트로 실행한다. 알림 권한 요청과 기존 음향 함수도 유지한다.

`translations-pomodoro.json`은 `pomodoroTimer.reliability` KO/EN33키 최종 조각이다. 기존 description/guide와 페이지 메타는 공용 담당자가 실제 정책에 맞춰 보완한다. canonical 메시지/생성물은 작성자가 직접 변경하지 않았다.

## 자체 검사 근거

| 검사 | 결과 | 범위 |
|---|---|---|
| `scripts/check-pomodoro-session.ts` | 20그룹 PASS | fractional oracle,2초 경계/rollback/wall-only gap, pause/skip/reset, 늦은 승인/영수증, 실제 저장 시작점 일치, 취소/이탈 |
| `scripts/check-pomodoro-persistence.ts` | 13그룹 PASS | legacy 원문/정확한 용량 경계/strict parse/CAS/quota/readback/명시 폐기/lock 취소. 이후 parser는 불변이라 무관한 반복 없음 |
| `scripts/check-pomodoro-browser.ts` | 8그룹 PASS | 실제 coordinator+controller+storage, tick0쓰기/명시 checkpoint, 태스크1회,2소비자경합, memory-only, queued reload 취소, 손상/확인불가/cleanup |
| `docs/verify/2026-11-17-repeat-batch30/check-pomodoro-parent.mjs` | 7그룹 PASS | 실제 부모 이벤트/복구 자식, 현재 task/관찰일 stats/가짜 소리·알림, locale/설정/리셋, expired/gap0집계, late cancel/unmount, confirmation |

총 **48그룹 PASS**. 실제 부모 harness는 제품 coordinator/controller를 실행하고 native IO만 제어한다. goal UI는 props 포트로 분리했으며 실제 목표 저장/CSV 브라우저 회귀와 구분한다. 실제 OS 절전·스피커·알림을 검증했다는 뜻이 아니다.

제품6+검사4파일의 단계별 범위 ESLint 최종 **오류0/경고0**. 신규 recovery cleanup의 ref 경고1개는 안정적인 invalidate callback으로 고쳐 해당 범위를 재확인했다. 부모 fixture 초기의58.475초를58초로 기대한 assertion은 표시 정책에 맞게59초로 수정했으며 제품의 밀리초/올림 정책은 바꾸지 않았다.

## 독립·브라우저 연결

team_rotation의 선행 독립8+실제 부모5=**13그룹 PASS**, 독립JS2파일 lint0을 받았다. 브라우저는 전담 검증 결과를 별도로 기록한다. 독립 검사를 이 문서의 자체 검사 숫자에 합산하지 않는다.

선택자:

- `[data-pomodoro-timer]`: `data-phase`, `data-running`, `data-remaining-ms`, `data-phase-id`, `data-notice`.
- `[data-pomodoro-toggle]`: 일반 시작/일시정지 또는 만료 상태의 다음 단계 시작.
- `[data-pomodoro-phase="work|shortBreak|longBreak"]`: 직접 단계 선택.
- 기존 skip/reset/resetAll/settings 버튼은 해당 번역 aria-label/본문 유지.
- `[data-pomodoro-recovery]`, `[data-pomodoro-store="settings|tasks|timer"]`와 `data-store-status`.
- `[data-pomodoro-reload="…"]`, `[data-pomodoro-discard="…"]`, `[data-pomodoro-confirm="reload|discard"]`.
- 저장 대기 취소는 `reliability.cancelPending` 버튼. task 행은 기존 제목/선택 `aria-pressed` 버튼, 완료 checkbox와 estimate 입력을 유지.

브라우저에서 실제 localStorage/네이티브 Web Locks/refresh/목표 CSV/320px KO·EN을 확인한 뒤 통합 담당자가 전체 타입 검사를 수행한다.
