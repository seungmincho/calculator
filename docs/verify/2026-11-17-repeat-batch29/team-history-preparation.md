# 29차 팀 이력·반출 미연결 준비 상태

2026-11-17 KST. 26차 타입 체크포인트 뒤 root 승인으로 준비했다. **TeamDivider / InteractiveTeamBoard 부모 연결 없음. 기존 알고리즘·저장/공유 schema·canonical 메시지 미수정.** 준비 단위 완료 후 TS 편집을 중지하며 27차 체크포인트 뒤 별도 연결 신호를 기다린다.

## 준비 파일/API

- `src/utils/teamBoardHistory.ts`: `TeamEditSnapshot`/`TeamRotationComparison` readonly 타입, `cloneTeamSnapshot`, `sameTeamSnapshot`, `createTeamHistory`, `commitTeamHistory`, `undoTeamHistory`, `redoTeamHistory`, `TEAM_HISTORY_LIMIT=20`.
- 캡처 시 teams/locked/comparison.previous/skills와 외부 history 배열까지 clone/freeze한다. lock은 집합 의미로 중복 제거·순서 무시, 팀/멤버 순서는 유지한다. no-op은 같은 history 객체를 반환해 future를 보존하며, 실제 commit만 future를 폐기한다. 총 past+future20전이. 첫 완성 보드/공유복원/주장완료는 새 seed다. current skills와 다음 mode는 API 자체에서 제외한다.
- 같은 파일의 `createTeamRevealGuard<Timer>()`: `start()`는 `{generation, previousTimer}`를 반환, `attach(generation,timer)`는 해당 세대의 첫 timer만 받는다. `owns`/`finish`는 **세대+자기 timer**를 함께 검사한다. `finish`/`invalidate`는 호출자가 해제할 timer를 반환하고 세대를 바꾼다. null 체크를 쓰므로 timer ID0도 유효하다. native setInterval/clearInterval은 부모 소유다.
- `src/utils/teamResultActions.ts`: `formatTeamResult(board, currentSkills, labels)`, `createTeamResultSnapshot`, `createTeamResultGuard`, `copyTeamResultText`, `createTeamResultDownloads`.
- 텍스트는 기존 팀 번호/인원·balanced 점수/멤버 순서·빈 줄 형식을 유지한다. snapshot은 완성 문자열과 고정 `team-divider.txt`만 가진다. TXT Blob은 동일 문자열의 UTF-8, BOM 없이 만든다. 파일명에 참가자/제목을 넣지 않는다.
- copy outcome은 `copied|failed|stale`, native 성공/legacy===true만 copied다. stale 거절은 fallback도 실행하지 않는다. 다운로드는 `started|failed|stale`로만 표시해 실제 브라우저 저장 완료를 단정하지 않는다. 모든 URL은 실패·지연1초·dispose에 정확1회 정리한다.
- `src/components/TeamResultCopyRecovery.tsx`: 현재 text 읽기 전용, 수동 선택·선택 실패, 재시도/진행중/닫기. props는 `{text,busy,onRetry,onClose}`. 자기 namespace 등록,16px/44px/token UI.
- `translations-team-actions.json`: ko/en 각각13키(`teamDivider.history`3 + `resultActions`10). 부모 미연결이므로 canonical 병합 시점은 통합 담당 조율에 따른다.

## 자체 검사

- `node --experimental-strip-types scripts/check-team-history-actions.ts`: **12그룹 PASS**. 첫 seed/reset,30 commit 뒤20전이,500개 mixed action의 별도 timeline/cursor oracle, deep freeze/source 분리, noop/lock집합/메타 비교, input 설정 제외·현재 skills 텍스트, timer 세대/ID재사용, 독립 텍스트 형식, clipboard false/error/stale, 실제 Blob UTF-8 bytes, download host 실패/재진입·언마운트 정리.
- `node docs/verify/2026-11-17-repeat-batch29/check-team-copy-recovery.mjs`: **2그룹 PASS**. KO/EN 실제 child의 readonly snapshot/수동 선택·오류/재시도 busy/닫기/16px·44px. DOM ref는 제어 포트이며 실제 브라우저 초점 검증은 아니다.
- 신규 제품3파일+검사2파일 scoped ESLint: **exit0, 오류0·경고0**. 첫 검사에서 검사 파일의 prefer-const1개를 수정한 뒤 재검사했다. 제품 동작 변경이나 lint 예외는 없다.

## 부모 연결에서 남은 필수 작업

1. 현재 board/past 상태를 단일 history 경로로 연결한다. frozen present를 실수로 수정하지 않고 InteractiveTeamBoard에 읽기용 배열을 전달할 타입/복사 경계를 최소 조율한다. UI의 드래프트 임시 보드는 history 밖에 두고 완료 시 seed한다.
2. 실제 편성 변경만 commit, 전체 명단/참석/팀 수/저장복원/주장새시작은 reset한다. mode와 resultMode, current skills와 comparison.skills를 분리한다. 현재 skills/locale가 반출 text를 바꾸면 copy를 무효화하되 history/redo는 유지한다.
3. 공개 interval/skip callback은 캡처 generation+own timer로 검사한다. `start().previousTimer`, `finish()`/`invalidate()`가 반환한 timer만 clear한다. 드래그 epoch와 명시 undo/redo 이후 유효 버튼 focus를 연결한다. CtrlZ는 추가하지 않는다.
4. 반출 클릭은 확정 snapshot+현재 보드 revision으로 보호한다. 현재 output이 바뀌거나 닫기/이탈하면 copy guard와 성공 timer를 무효화한다. 다운로드 manager는 dispose 이후 재사용하지 않으며 StrictMode remount 시 새 manager를 만드는 lifetime을 부모에서 확보한다.
5. TeamDivider 실제 이벤트 fixture와 기존 board/rotation/attendance/rosters/backup 회귀, 독립 검토, 단일 Chrome의 drag·focus·TXT/Clipboard·공유/참석·KO/EN320px를 검증한다. 현재 준비 검사만으로 부모 동작이나 브라우저를 통과했다고 주장하지 않는다.

설계 정책은 `team-history-actions-design.md`의 root 승인 절을 따른다. 전체 tsc·Chrome·빌드·배포·커밋은 실행하지 않았다.
