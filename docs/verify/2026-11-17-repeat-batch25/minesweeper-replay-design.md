# 25차 B 종료한 클래식 판 재연습 — 읽기 설계

2026-11-17 KST. 담당 `/root/writing_versions`. [25차 계약](plan.md)과 [후보 조사](../../handoff/2026-11-17-minesweeper-replay-candidate.md)에 따른 읽기 설계다. 23차 체크포인트 뒤 [미연결 순수 준비](minesweeper-replay-preparation.md)를 완료했으며 **기존 부모는 아직 변경하지 않았다**.

## 현재 경로 확인

`src/components/Minesweeper.tsx`의 `Game`에는 layout/open/marks/status/boom/start/end/clicks/noGuessFailed가 있고 첫 열린 칸은 없다. `fresh`는 layout 없는 ready 상태를 만든다. `act`가 첫 open에서만 `generate` 또는 `generateNoGuess`를 호출한다. 생성 layout의 mine/count는 별도이며 조작은 open/marks 복사본을 수정한다.

`newDaily`는 `dailyBoard(day)`의 고정 배치·시작 칸을 먼저 연다. 오늘 결과가 있으면 전체 안전 칸을 열어 종료 상태를 복원한다. 클래식 연습은 이 경로를 재사용하거나 일일 기록에 연결하지 않는다.

`finish(g, won)`은 현재 다음 순서다.

1. 승패 소리/승리 시 confetti.
2. `recordGameResult`를 무조건 호출해 `game_achievements`의 게임 수·승패·연승·업적을 변경.
3. daily이면 `toolhub-minesweeper-daily` 저장 후 반환.
4. 일반 preset 승리이면 `toolhub-minesweeper-best` 갱신, `checkQualifies`→이름 모달, leaderboard 조회.

이름 모달의 `onSubmit`은 별도 조건 없이 `leaderboard.submitScore(sec,name,ms)`와 이름 저장을 호출한다. `useLeaderboard`는 `submit_leaderboard_score` RPC에 `p_game_type`, 난도, 점수, 실제 플레이 ms를 전달한다. 따라서 finish만 차단하거나 모달만 숨기는 것으로는 오래된 모달 callback을 막기에 부족하다.

`useLeaderboard`의 mount/난도 변경 조회와 기존 player ID 생성, `useGameAchievements`의 기존 데이터 로드/같은 값 직렬화는 기존 훅 동작이다. 이 작업은 공유 훅을 수정하지 않고 **연습 결과로 인해 기록이 추가·변경되거나 점수가 제출되는 경로**를 막는다. 브라우저 시험에서 공개 점수 RPC는 전부 mock으로 막고, 실제 서비스에 테스트 점수를 쓰지 않는다.

포인터 입력은 한 `pressRef`에 350ms 타이머·fired/suppress/type을 보관한다. 타이머는 `act`의 이전 render closure를 캡처하며 현재 `newGame`에는 press 취소가 없다. 따라서 새 판/재연습에서 timer clear뿐 아니라 이미 큐에 들어온 이전 callback을 막는 판 세대 확인이 필요하다.

## 최소 데이터와 API

신규 순수 `src/utils/minesweeperReplay.ts`를 준비한다. 배치 생성/난수/솔버/openCell/chord/isWon 구현은 `minesweeper.ts`를 그대로 재사용한다.

예정 타입은 `ClassicReplaySource`: `{ difficulty, w, h, mines, first, noGuessFailed, mine, count }`다. `mine`/`count`는 원본에서 복사한 readonly 배열이고 가능하면 freeze한다. 단일 방문 메모리이며 key/version/장기 저장/URL은 만들지 않는다.

- `captureClassicReplaySource(layout, first, difficulty, noGuessFailed)`: 실제 생성 완료 시 한 번 원 배치를 복사한다. 첫 칸 범위/안전 여부, 크기·배열 길이와 지뢰 수를 확인한다. count를 새 배치로 바꾸거나 noGuess를 다시 실행하지 않는다.
- `createClassicPractice(source)`: layout/mine/count, open, marks를 매번 새 배열로 만들고 기존 `openCell`로 같은 first를 자동으로 연다. 일반 fresh 상태와 공유할 수 있는 필드만 반환한다. `boom=-1`, `clicks=0`, `start=end=0`이며 noGuessFailed는 원래 값이다.
- 자동 펼침 직후 `isWon`을 검사한다. 이미 전부 열렸다면 즉시 won/0ms/0clicks로 반환한다. 일반 기록 경로를 거치지 않으며 결과 표시에서 `game.start > 1`만으로 숨기지 않는다.

부모 `Game`에 `generation`, `practice`, `first`, `replaySource`를 추가하는 최소 연결을 검토한다. source와 practice를 서로 독립된 state로 두어 렌더 중 어긋나게 만들지 않는다. 처음 일반 클래식 layout을 생성한 때 source를 확정하고, 그 source가 이후 반복 연습의 기준이다. 연습 도중 실패해도 새 source로 덮지 않는다. daily Game에는 replaySource를 두지 않는다.

## 시작·종료·기록 제외

종료한 classic + 유효 source일 때만 ‘같은 판 연습’ 버튼을 제공한다. 버튼은 44px 이상이며 보드 위에 연습 상태와 ‘같은 시작 칸을 미리 열었고, 첫 후속 조작부터 시간을 잰다’는 정책을 표시한다. 연습 원 배치/난도를 현재 설정으로 다시 만들지 않는다.

‘조작’은 기존 act에서 실제 open/marks를 변경한 유효 조작을 뜻한다. 무효 chord·열리지 않는 칸의 반복 클릭·커서 이동·옵션 토글은 시간을 시작하지 않는다. 첫 유효 flag도 일반 게임의 기존 타이머 정책과 동일하게 시작할 수 있다. 자동으로 연 첫 칸은 사용자 클릭 수에 포함하지 않는다. 자동 완료 판은 타이머를 시작하지 않는다.

finish는 기존 승패 피드백 뒤 **`g.practice`이면 즉시 반환**한다. 업적·daily·개인 최고·자격 판정·모달 열기·종료 후 leaderboard 조회보다 앞에서 차단한다. 연습 종료에서도 결과/재연습 버튼은 보이며 새 최고 배지는 없다. 일반 클래식 ShareResult는 연습에서 표시하지 않아 일반 기록 카드로 오해하지 않게 한다. 기존 일일 공유는 그대로다. 기존 최고/리더보드 목록은 조회용으로 유지할 수 있다.

점수 제출은 종료한 일반 클래식 preset의 `{ generation,difficulty,ms }`를 별도 eligibility snapshot으로 잡는다. 모달 노출과 `onSubmit` 양쪽에서 현재 game이 같은 generation의 일반 won인지, 모달 eligibility가 여전히 같은지 확인한다. 연습/새 판/난도/모드 전환 때 eligibility와 모달을 함께 지운다. 이미 정상 일반판에서 사용자가 제출해 시작된 RPC를 나중에 되돌릴 수 있다고 주장하지 않으며, 그 Promise 완료가 새 연습의 모달/상태를 바꾸지는 않도록 세대를 재확인한다.

## 모든 일반 흐름으로 복귀

다음 명시 동작은 press/판 세대를 무효화하고 practice/source/기록 eligibility를 비운 뒤 기존 일반 경로를 사용한다.

- 새 판 버튼 → 현재 classic 설정의 빈 새 판, daily면 기존 당일 판.
- preset 난도 선택 → 해당 일반 빈 판. **이미 선택된 난도 버튼도 연습 중에는 탈출 동작**으로 처리한다. `setDiff(same)`의 no-op에 의존하지 않는다.
- custom 적용 → clamp된 일반 custom 판. 같은 수치를 다시 적용해도 연습을 종료한다.
- classic/daily 탭 선택 → 선택 모드의 일반 흐름. **연습에서 이미 선택된 classic 탭을 눌러도 일반 새 판**으로 돌아간다.
- 기존 날짜 경계/URL 초기 모드 복원 → 기존 초기화 경로를 유지하되 연습 source를 일일 판에 가져가지 않는다.

noGuess/물음표 옵션은 기존과 같이 다음 배치 또는 조작 설정이다. 옵션을 바꿨다고 현재 연습 배치가 새로 검증·생성됐다고 표시하지 않는다. noGuessFailed는 원래 source의 값이다.

## 입력 세대와 cleanup

부모의 판 교체를 작은 `replaceGame`/입력 무효화 경로로 모아 다음을 즉시 수행한다: press timer clear, fired/suppress 상태 초기화, board generation 증가, 현재 Game ref와 state 일치, 기존 점수 eligibility 취소. unmount도 timer를 취소하고 generation을 무효화한다.

- `act`는 전달받은 예상 generation과 현재 Game ref의 generation이 같을 때만 실행한다. 이전 render의 handler가 최신 ref를 무조건 조작하지 않게 한다.
- long-press callback은 시작한 generation과 pointerId를 캡처하고 실행 직전에 비교한다. timer clear 뒤 이미 큐에 있던 callback도 이 검사에서 탈락한다.
- pointerdown→판 교체→늦은 pointerup/click/contextmenu 순서에서 이전 gesture의 클릭이 새 판을 열지 않게 press generation을 확인한다. 단순 timer 취소만으로 충분하다고 보지 않는다.
- 새 판 보드에 generation key를 줄 수 있으나 DOM 교체만을 stale 방어로 삼지 않는다. keyboard/보조기술의 pointerdown 없는 활성화는 기존처럼 사용할 수 있어야 하므로 일반 click과 키보드 활성화를 구분한다.
- 좌·우·양쪽/가운데 클릭 chord, 터치 이동 취소, 방향키·Enter/Space/F는 기존 동작을 유지한다. 이전 제스처 무효화가 새 정상 터치/키보드를 계속 막는 suppress latch가 되지 않게 테스트한다.

## 수정 예정 범위

| 파일 | 변경 |
|---|---|
| `src/utils/minesweeperReplay.ts` | 원 배치 복사·연습 상태 초기화·자동 완료 판정 |
| `src/components/Minesweeper.tsx` | source/first/practice/generation 연결, 명시 재연습·복귀 UI, finish/submit 차단, press 세대 cleanup |
| `scripts/check-minesweeper-replay.ts` | 순수 재연습 도메인 |
| `docs/verify/2026-11-17-repeat-batch25/check-minesweeper-replay-component.cjs` | 실제 부모 이벤트/기록 포트 검사 |
| `docs/verify/2026-11-17-repeat-batch25/translations-minesweeper.json` | 동일 담당 ko/en 조각 |

공유 achievement/leaderboard 훅, 서버 RPC, 메뉴·원본 번역·메타는 직접 수정하지 않는다. 기존 `check-minesweeper.ts`로 생성/open/chord/승리/일일 계산 회귀를 확인한다. 신규 기능 구현 신호 전에는 검사 TS도 작성하지 않는다.

## 검증 계획과 완료 기준

순수 검사: 여러 preset/custom 첫 칸·원 mine/count/크기/지뢰 수 동일성, noGuessFailed 보존, source와 각 연습 배열의 참조 분리, 반복 조작 후 source 불변, flags/questions/boom/clock/clicks 초기화, 안전 시작 칸 검증, 작은 판 자동 완료.

실제 부모 제어 검사: 일반 loss/win→같은판 연습, 유효 첫 후속 조작의 시계 시작, 반복 연습, 모든 일반 탈출 경로, daily 왕복/저장 값 보존, 일반 win에서 기존 BEST/업적/자격 판정 회귀, 연습 win/loss에서 관련 기록 바이트/호출 수 변화 0, 숨긴 모달의 오래된 submit 직접 호출 차단, 이미 시작된 정상 제출의 늦은 응답, 이전 long-press/pointer/keyboard handler 경합과 새 입력 정상 동작.

실브라우저(verify 단독): 실제 보드의 같은 배치·첫 칸, 재연습/난도·모드 왕복, 키보드·터치/320px·KO/EN. 모든 점수 제출은 제어 포트 또는 네트워크 mock으로 차단한다. 테스트 결과를 서버 부정행위 방지 보장으로 표현하지 않는다.

현재 상태: 읽기 설계와 **미연결 순수 준비 11그룹 검사 완료**. 부모·생성/솔버·기록 hooks 변경 및 공개 점수 전송은0회다. 24차 체크포인트와 후속 부모 연결 소유권 신호를 기다린다.
