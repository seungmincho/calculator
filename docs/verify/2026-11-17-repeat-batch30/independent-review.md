# 30차 집중 타이머 독립 검토

2026-11-17 KST. team_rotation이 제품 작성자와 별도로 실행했다. 제품 TS는 수정하지 않았고, 31차 준비 TS도 freeze를 유지했다. Chrome·전체 타입 검사·빌드는 실행하지 않았다.

## 핵심 시간·저장 경계

`node --experimental-strip-types docs/verify/2026-11-17-repeat-batch30/check-pomodoro-independent.mjs` — **독립 8그룹 PASS**. 해당 JS 범위 lint **exit0, 오류0·경고0**.

작성자 검사 assertion/fixture를 실행하거나 복사하지 않았다. 실제 `lib/pomodoro/session.ts`와 `utils/pomodoroSession.ts/pomodoroPersistence.ts`를 import하고 별도 시계·저장·잠금 포트를 구성했다. 정상 실행 기대값은 별도 누적 실행 시간 ledger, 저장/복귀 기대값은 승인 시각과 전달 지연의 명시 수치로 계산했다.

1. 35회 시작/일시정지 중 1400.125/321.25/0.5ms tick과 추가 소수 pause tail을 합산했다. 각 긴 정지 구간은 차감하지 않고, 옛 tick은 정지된 snapshot을 바꾸지 않는다.
2. wall/mono 차이 -2001/-2000/-1999/0/1999/2000/2001ms에서 **절대값 >2000만** 중단한다. wall rollback/mono 역행 뒤 남은 시간은 늘지 않고 집계0이다.
3. wall만 2시간 진행한 절전 모사는 clockGapExpired·집계0, 일반 start 금지, 명시 다음 단계는 expiredAdvance·집계0이다. 두 시계가 함께 2시간 진행하면 현재 집중 한 번만 집계하고 다음 휴식 전체 시간을 부여한다. 이것을 실제 OS 절전 재현이라고 주장하지 않는다.
4. 정확한 만료에서 pause는 집중 완료1회·다음 자동 시작0이다. 미관찰 만료 직후 skip/resetPhase/resetAll은 집중 실적0이고 이전 tick도 무효다.
5. 완료 관찰 뒤 잠금 45초 대기, 실제 `writePomodoroTimer` 승인 저장, 영수증 전달 1725ms 지연을 주었다. persisted lastTickTime은 잠금 획득 시각이고 실행/새 방문 복귀의 남은 값 모두 **58275ms**다. 관찰 날짜용 observedAt은 앞선 시각을 유지한다. 대기 중 reset한 영수증은 무효다.
6. 영수증이 다음 휴식 60001ms 뒤 전달되면 현재 집중 이벤트는1회, 다음 휴식은 무집계 만료 안내다. 일반 start/wake로 추가 완료를 만들지 않는다.
7. 정상 legacy3키 읽기는 쓰기0, tasks의 공백/개행/한글/emoji·estimate200·특수 ID와 timer 회차8을 보존한다. null/중복 ID/필드 추가/잘못된 boolean·phase·음수 시간·미래 version을 차단하면서 raw를 보존한다. 재방문 만료는 이전 누적7회/420초를 유지한다.
8. stale expectedRaw CAS 거부, setItem 성공 후 readback 실패의 unconfirmed와 rollback0, 손상 raw 폐기 전 CAS, 잠금 대기 취소의 action0 및 Web Locks 미지원 경로를 확인했다.

현재 이 범위에서 재현 가능한 제품 결함은 없다. Native Web Locks/localStorage 이벤트·실제 DOM/알림/음향은 위 제어 포트 검사에 포함되지 않는다.

## 실제 부모 연결 — 5그룹 PASS

작성자 stable 신호 뒤 `node docs/verify/2026-11-17-repeat-batch30/check-pomodoro-parent-independent.mjs` 실행 — **5그룹 PASS**. 이 JS 파일 scoped lint도 **exit0, 오류0·경고0**이다. 실제 PomodoroTimer 부모와 bundle된 browserSession/controller/storage/통계 API를 실행했다. 기존 공용 hook host와 effect replay 기능만 읽기 재사용했으며 작성자 assertion/fixture는 실행하지 않았다. 목표 패널·복구 패널은 부모 props 포트로 분리했고, Date/performance/native timer·locks·storage·Notification/AudioContext만 제어했다.

1. 실제 effect cleanup/setup을 두 번 재실행해 최초 읽기 쓰기0·실행 가능을 확인했다. 시작 시 A 선택→완료 전에 B 선택에서 B만 +1, 관찰일 통계는 2회/2분→3회/3분이며 이전 tick 재실행은 중복0이다. 이어 휴식 완료는 집중 통계를 늘리지 않는다. 완료 두 건에 가짜 음향/알림도 각각2회다. 언어 변경은 phaseId/남은 시간/할 일·timer 저장본을 보존한다.
2. 실행 저장본이 60001ms 만료된 재방문과 wall만 진행한 같은 방문 만료에서 정지0초·해당 안내를 확인했다. 명시 다음 단계 버튼은 짧은 휴식을 시작하고 통계·할 일·알림·음향 모두 추가0이다.
3. 완료 승인 timer lock이 대기 중일 때 단계 reset 또는 실제 effect cleanup을 수행했다. 나중에 lock callback을 실행해도 통계/할 일/알림/음향 증가0이며 reset 상태도 되돌리지 않는다.
4. 다른 탭의 timer raw 변경을 storage event로 전달하면 현재 타이머가 conflict로 정지하고 입력이 차단된다. 명시 reload가 다른 저장본의 shortBreak/37초를 복원한다. 손상 settings/tasks/timer에서는 첫 읽기 쓰기0, 새 할 일 메모리 편집 뒤에도 세 raw 원문을 그대로 보존한다.
5. timer reload가 lock을 기다릴 때 실제 부모에서 새 할 일을 추가하면 이전 reload는 false로 취소된다. 최신 할 일 저장/화면 상태와 기존 phaseId를 보존한다.

기존 목표/통계는 `pomodoro-daily-goal.v1`의 `{version:1,target}`, `pomodoro-daily-stats`의 `{date,count,minutes}[]` 및 `savePomodoroStats/savePomodoroGoal/withPomodoroLock/pomodoroStatsCsv` 경로를 유지한다. 최종 부모는 실제 기존 savePomodoroStats를 호출했고, goal raw `{version:1,target:7}`은 모든 완료/복귀/취소 동작에서 불변이다. `PomodoroGoalPanel`의 dailyStats/today/statsStatus/onRetryStats props를 보존한다. CSV 계산 유틸/패널 자체는 이번 독립 검사에서 재실행하지 않았으며 브라우저 영향 검증과 구분한다.

## 결론과 한계

합계 **독립 13그룹 PASS**, JS2파일 scoped lint 오류0·경고0, 추가 재현 결함/제품 수정 요청 없음. 제품·공용·31 준비 TS는 수정하지 않았다. controlled clock은 실제 OS sleep의 재현이 아니며 가짜 음향/알림은 실제 사용자에게 재생/발송되지 않았다. 실제 브라우저 DOM·native Web Locks/스토리지 이벤트·KO/EN 모바일과 목표 CSV 흐름은 verify 결과를 별도로 사용한다.
