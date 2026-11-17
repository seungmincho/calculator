# 29차 팀 이력·반출 부모 연결

2026-11-17 KST. 27차 전체 타입 검사 체크포인트 뒤 root 승인으로 TeamDivider와 InteractiveTeamBoard를 연결했다. 알고리즘·저장 명단/백업·공유 schema·난수는 수정하지 않았다. canonical14키/메타/가이드는 통합 담당 소유다.

## 실제 동작

- 완성된 현재 보드는 `history.present` 한 곳에서 관리한다. 부모가 readonly snapshot을 표시용 배열로 분리하며 팀별 순서·고정·결과 mode·회전 comparison을 함께 복원한다. past+future20전이, 첫 편성/공유 복원/주장 완료는 seed, 동일 결과 no-op은 future를 유지한다.
- 이동/교환/고정/자동 재편성/회전은 공통 commit 경로다. undo/redo는 현재 확정 snapshot을 복원하고 난수/분배/공개 animation을 다시 실행하지 않는다. 명단/참석/팀 수/저장복원과 주장 시작은 이력을 초기화한다. 저장·백업은 기존 전체 명단 경로를 유지한다.
- 현재 skills와 다음 편성 mode는 history 밖이다. 능력치가 달라지면 기존 회전 baseline의 skills-match 판정을 유지해 안내를 숨긴다. 다음 mode를 바꿔도 resultMode와 redo는 유지한다. 화면에 이 구분을 설명한다.
- 주장 진행은 별도 draftTeams/pool로 관리한다. 마지막 pick 또는 인원==주장 수 즉시 완료에서 seed한다. generation·drafting·pool membership으로 이전 pick을 거부한다. 보드 이벤트도 캡처 epoch를 검사해 이전 이동/고정 handler가 다른 보드를 바꾸지 않는다.
- 공개 interval은 generation과 자기 timer ID를 함께 검사한다. reset/restore/다음 공개/언마운트가 소유권을 무효화하며, 이전 tick/skip은 새 timer를 멈추지 않는다. 재생성된 완성 보드에만 공개를 시작한다.
- undo/redo 버튼은44px이며 복원 뒤 누른 버튼이 유효하면 유지, 소진되면 반대 버튼으로 focus한다. Ctrl/Cmd+Z는 추가하지 않는다. InteractiveTeamBoard는 epoch 변경 시 내부 dragged/over만 초기화하고 멤버 key/DOM을 강제로 재마운트하지 않는다.
- 동일한 확정 text snapshot을 Clipboard와 UTF-8 TXT로 쓴다. 결과/능력치/언어가 반출 text를 바꾸거나 보드 epoch/닫기/이탈이 바뀌면 이전 복사와 성공 timer를 무효화한다. false/error는 readonly 복구·수동선택·재시도, 실제 성공만 copied다. 이미 제출한 OS 복사를 취소한다고 주장하지 않는다.
- TXT 파일명은 `team-divider.txt`로 고정하며 이름/결과를 신규 URL/저장소/로그에 쓰지 않는다. 기존 명시 ShareResult URL은 유지한다. Blob URL은 실패/1초/언마운트에 정리하고 실패 시 현재 편성을 보존한다.

## 자체 검사와 수정 근거

- 준비 순수 history/actions12그룹·KO/EN 복구 child2그룹 PASS는 그대로 유지한다. 부모 연결 중 두 순수 유틸/복구 child는 변경하지 않았다. root의 별도 순수 독립6그룹도 PASS로 전달받았다.
- `node docs/verify/2026-11-17-repeat-batch29/check-team-history-parent.mjs`: **9그룹 PASS**. shared seed, 이동/교환/고정·20전이·no-op/redo분기, 정확한 회전 pair/메타, skills/다음mode 분리, 전체명단 저장·참석 공유, captain취소/완료/옛pick, reveal옛tick/skip, Clipboard/TXT/늦은거절, 실제 child drag 초기화를 실행했다. focus는 제어 host ref이고 실제 DOM은 브라우저 담당 검증이다.
- root 읽기 검토에서 StrictMode setup→cleanup→setup 시 cleanup이 `epochRef`만 증가시켜 state와 어긋나는 문제를 발견했다. 공용 harness를 바꾸지 않고 `team-parent-harness.mjs`에서 실제 effect callback 재실행을 노출했다. **수정 전 첫 나누기0명≠6명으로 재현**, cleanup의 epoch 증가만 제거 후 초기 나누기·공유 결과 편집/복사 PASS다. mounted=false/reveal·copy 소유권 무효화/URL 정리는 유지한다.
- 관련 기존 회귀6개 PASS: team-board, team-rotation(168 시나리오 및 예외), team-attendance, team-rosters(14검사), team-roster-backup(10그룹), team-balance.
- 준비/부모/검사9파일 범위 lint **exit0, 오류0·경고0**이다. fixture의 예약 이름 module1건만 harnessModule로 고친 뒤 해당 파일 lint exit0을 재확인했다. 부모의 cleanup ref 경고는 해당 StrictMode 수정으로 제거했다. lint 규칙 비활성화는 없다.

## 검증 담당 선택자/타이머

- `#team-divider-result`: `data-team-history-past`, `data-team-history-future`, `data-team-board-epoch`, `data-team-result-mode`, `data-team-drafting`, `data-team-dividing`.
- `data-team-divide="initial"|"again"`, `data-team-rotate`, `data-team-undo`, `data-team-redo`, `data-team-reveal-skip`, `data-team-draft-pick="이름"`.
- 기존 `data-team="0..."`/`data-member="이름"`, 명단 체크박스/능력치의 기존 aria-label 유지. 다음 mode는 기존 `input[name="mode"]`.
- `data-team-result-copy`, `data-team-result-copied="true"|"false"`, `data-team-result-download`, `data-team-copy-recovery`, `data-team-copy-select/retry/close`.
- 공개는 native `setInterval(...,80)`이다. callback은 캡처 generation+intervalID로 검사한다. 기존 callback을 보관했다가 skip/새 공개 뒤 호출하면 아무 것도 바꾸지 않아야 한다. restore는 revealCount=Infinity다.
- 복사 주입은 navigator.clipboard/legacy execCommand, TXT는 URL.createObjectURL의 Blob+anchor download다. 기본 다운로드 정리는1초이며 unmount 시 남은 manager를 dispose하고 StrictMode 재설정 뒤 필요하면 새 manager를 만든다.

Chrome·전체 tsc·빌드·배포·커밋은 실행하지 않았다. 독립 부모 검토는 taxi, 실브라우저는 verify 담당이다.
