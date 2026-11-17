# 29차 팀 편성 이력·반출 읽기 설계

2026-11-17 KST. `plan.md`와 실제 `TeamDivider.tsx`, `InteractiveTeamBoard.tsx`, `teamBoard.ts`, `teamRotation.ts`를 읽었다. 최초 읽기 설계 후 root가 아래 정책을 승인했다. 26차 체크포인트 뒤 신규 유틸/복구 child만 미연결 준비했으며 상태는 `team-history-preparation.md`에 기록한다. 실제 부모 연결은 27차 체크포인트 뒤 별도 신호까지 보류한다.

## 현재 동작과 유지할 경계

- `TeamDivider`의 `rememberBoard`는 완성된 팀이 있을 때만20개 과거 snapshot을 쌓는다. teams/locked/resultMode를 보존하고 comparison은 같은 객체를 참조한다. 현재 코드의 비교 갱신은 불변 방식이지만 새 유틸에서는 previous 배열·skills까지 깊이 분리해 이 전제에 기대지 않는다.
- 결과의 `resultMode`와 다음 편성에 쓰는 `mode`는 다르다. 모드 radio를 바꿔도 결과 방식은 그대로다. 현재 능력치 `skills`는 undo 대상이 아니며 결과 합계·공유·balanced 복사에서 현재 값을 사용한다. 회전 비교는 저장한 skills와 다르면 baseline 안내를 숨긴다.
- 이동/교환은 기존 순수 함수가 null로 거부하면 이력이 생기지 않는다. 고정 토글/재편성/직전 동료 회전은 기존 결과를 먼저 저장한다. 같은 팀 배치가 우연히 다시 나온 경우도 현재는 기록되므로 새 비교에서는 실제 결과·메타가 같은 no-op을 제외한다.
- 명단 추가/삭제/일괄/프리셋, 참석 변경, 팀 수, 저장 명단 복원은 `resetBoard`를 거친다. 저장·갱신·백업 import는 명단 저장소만 바꾸며 현재 보드는 유지한다. `#board=`는 첫 hydration에서만 읽고 현재 공유 schema로 복원한다.
- 주장 선택 시작은 이력을 지우고 부분 편성을 보여 준다. 진행 중 이동/교환/고정/undo는 막히고 copy/share도 표시하지 않는다. 완료 이후에는 결과 편집이 가능하다. 주장 선택을 각 pick별 undo로 만드는 범위가 아니다.
- 공개 animation은80ms interval이며 `clearInterval`만 사용한다. 이미 큐에 든 옛 callback이 실행되면 `finishReveal()`이 현재 ref의 새 timer를 끊을 수 있다. 새 세대/자기 timer 확인이 필요한 경계다. 이는 읽기로 확인한 가능성으로, 실제 부모 fixture에서 도달 순서를 따로 검증한다.
- `InteractiveTeamBoard`는 내부 dragged/over를 가지며 DOM 팀 key는 index, 멤버 key는 name이다. undo/redo로 드래그 중인 배치를 바꿀 때 이전 드래그 상태도 폐기해야 한다.

## 최소 순수 API 초안

새 `src/utils/teamBoardHistory.ts`에 아래 내부 모델을 둔다. 저장/공유 schema는 추가하지 않는다.

```ts
type TeamEditSnapshot = {
  teams: string[][]
  locked: string[]
  mode: 'random' | 'balanced' | 'captain' // 결과 방식
  comparison: {
    previous: string[][]
    baselineSkillGap: number | null
    skills: Record<string, number>
    balanceLimited: boolean
    edited: boolean
  } | null
}
type TeamBoardHistory = {
  past: TeamEditSnapshot[]
  present: TeamEditSnapshot | null
  future: TeamEditSnapshot[]
}
// createTeamHistory(snapshot?), commitTeamHistory(history, next),
// undoTeamHistory(history), redoTeamHistory(history), cloneTeamSnapshot(snapshot)
```

유틸은 난수를 부르지 않고 완성된 다음 snapshot을 받는다. `past.length + future.length <= 20`을 유지한다. 첫 편성/공유 복원/주장 선택 완료는 새 present의 seed로 둬 빈 보드로 undo하지 않는다. commit은 현재와 실제 내용이 같으면 **같은 history 객체**를 반환해 redo를 보존한다. 실제 새 commit이면 future를 버리고 최근20전이만 보존한다. undo/redo는 난수/분배/회전 함수를 부르지 않고 양쪽 snapshot을 새 배열/객체로 분리한다.

팀별 이름 순서는 의미가 있다. locked는 집합 의미이므로 순서만 다른 배열은 no-op이다. comparison.previous의 팀/멤버 순서와 메타 값도 보존한다. lock이름이 실제 보드에 없는 오래된 callback은 부모에서 거부한다. `skills` 객체는 고유 이름/own-key 값으로 복사하고 `__proto__` 같은 합법 이름 때문에 다른 값을 잃지 않게 한다.

부모는 흩어진 `rememberBoard`→setTeams/setLocked 호출을 단일 commit/restore 경로로 모은다. 별도의 현재 teams와 history.present를 동시에 독립 갱신하는 구조를 피한다. 주장 진행의 임시 편성은 history.present 밖에 두고 완료 시 seed한다. 기존 분배/회전 알고리즘과 share encoder는 그대로 호출한다.

## root 승인 정책

1. **능력치/다음 모드 변경:** 기존처럼 편성 이력 대상에서 제외한다. undo/redo는 팀·고정·결과 방식·회전 비교만 복원하고 현재 능력치는 되돌리지 않는다. 변경된 능력치는 반출 문자열이 바뀌면 복사 snapshot을 무효화하며 회전 baseline은 기존 skills-match 판정을 유지한다. ‘새 편집은 redo 폐기’는 보드 snapshot을 실제로 바꾸는 편집으로 한정한다. 다음 모드 radio만 바꿨다고 결과 history를 지우지 않는다.
2. **주장 새 시작/취소:** past/future와 비교를 모두 버린다. 드래프트 각 pick은 기록하지 않는다. 끝나는 순간의 완성 보드를 seed하고 이후 이동/고정은 일반 이력을 쌓는다. 첫 주장들만으로 완료되는 인원==팀 수 경우도 같은 seed다.
3. **복원 표시:** undo/redo 시 reveal을 취소·세대 증가, revealCount=Infinity, isDividing=false, selected=null로 만든다. 새로운 추첨/animation을 시작하지 않는다. 드래프트/공개 중에는 이벤트 handler에서도 차단한다.
4. **초점/키보드:** 첫 범위는44px undo/redo 버튼과 Tab/Enter/Space다. Ctrl/Cmd+Z 단축키 추가는 보류한다. 명시 undo/redo 뒤 누른 버튼이 계속 가능하면 그곳, 소진되면 반대 이력 버튼으로 초점을 이동한다. 이름·메모 입력/IME native undo를 건드리지 않는다. 드래그를 정리할 보드 epoch key를 쓸 경우 이력 복원 때만 바꾸고 의도한 버튼 초점을 layout 후 복구한다. InteractiveTeamBoard의 최소 drag epoch/focus 영역도 29차 담당 소유로 승인받았다.
5. **세대 검사:** reset/new commit/restore/unmount는 reveal 세대를 무효화한다. interval callback은 캡처한 generation과 자기 timer identity가 둘 다 일치할 때만 reveal/finish를 수행한다. 이전 `finishReveal` 버튼 callback도 새 보드의 timer를 끊지 않아야 한다. 오래된 주장 pick은 해당 세대·현재 drafting·현재 pool membership을 확인하는 최소 guard로 정리한다.

## 복사·TXT 공통 텍스트

새 `teamResultActions.ts`에 번역 label을 인자로 받는 순수 `formatTeamResult(snapshot, skills, labels)`와 copy guard/실제 성공 판정 포트를 둔다. 현재 복사 형식(팀 번호·인원·balanced 합계/개별능력치·쉼표 목록·팀 사이 빈 줄)은 유지한다. 사용자 이름의 원문을 번역 안내 문구나 파일명으로 사용하지 않는다. TXT는 **동일한 확정 문자열**을 UTF-8, BOM 없이, `team-divider.txt`로 명시 반출한다. 복사는 LF 문자열이며 OS 클립보드의 CRLF 정규화는 별도 환경 경계다.

반출 snapshot은 teams/결과 방식/current skills/현재 locale에서 만든 text와 board revision을 묶는다. 복사 요청 번호도 별도로 둔다. board commit/undo/redo/reset/주장 시작/공개 시작, 복사에 쓰이는 능력치/번역 변경, 닫기/unmount에서 이전 요청을 무효화한다. 입력의 newName/rosterTitle 초안만 바꾸고 확정 보드가 같다면 복사까지 지울 이유는 없다.

`copyTeamResultText(text, isCurrent, ports)`는 modern 성공 또는 legacy `=== true`에서만 copied다. 오래된 거절은 legacy fallback을 실행하지 않는다. 실패는 현재 text만 read-only 복구 child에 제공한다. 수동 선택/재시도/닫기와 실패 안내, 16px/44px를 제공한다. 이미 OS에 제출한 복사를 되돌린다고 주장하지 않는다. 복사 성공2초 timer도 같은 요청을 검사한다.

다운로드는 클릭 당시 text의 Blob과 고정 파일명을 사용한다. 임시 URL은 실패/finally와 유한 지연/unmount에 정리하고, 실패해도 편성/이력/선택을 지우지 않는다. 신규 URL/저장소/로그에는 이름/원문을 넣지 않는다. 기존 `ShareResult`와 명시 공유 URL의 이름 포함 안내/schema는 유지한다.

## 필요한 검증과 소유 예상

- 순수 history: 25회 commit 뒤20전이, undo+redo 합계 상한, no-op 뒤 redo 유지, 실제 분기 뒤 redo 삭제, source/current/future의 깊은 분리, 순서/locked 집합/회전메타 동등성.
- 실제 부모: 이동→교환→고정→회전→undo/redo의 실제 teams·반복 pair·baseline 안내; mode와 resultMode 분리; 참석/명단/팀 수/저장복원 reset; 초기 공유 복원 seed; 주장 진행 차단/완료 seed/새 시작; 공개중차단/skip/새 interval 뒤 이전 callback 무효화. 저장·백업은 전체 명단 유지.
- 반출: random/captain/balanced 텍스트를 독립 문자열 oracle로 대조, 실제 UTF-8 Blob bytes와 같은 복사 snapshot, false/throw/late clipboard·수동선택·locale·초안과 확정변경 구분, URL 정확1회 회수.
- 브라우저 담당: 실제 drag/drop·history 버튼 초점/Tab/Enter/Space, 입력 Ctrl+Z/IME 보존, TXT 바이트/OS 복사, KO/EN320px, 공유 재방문·참석자만 반출.
- 기존 회귀: `check-team-board.ts`, `check-team-rotation.ts`, `check-team-attendance.ts`, `check-team-rosters.ts`, `check-team-roster-backup.ts`, 필요시 balance. 기존 알고리즘 전체 재작성/추측 성능 테스트는 하지 않는다.
- 예상 소유: TeamDivider + 새 history/actions 유틸·copy recovery child·검사·ko/en 조각. InteractiveTeamBoard는 최소 reset/focus 계약이 필요한 경우에만 root와 소유 조율한다. 저장 schema/공유 schema/난수/균형/회전 알고리즘은 미수정이다.
