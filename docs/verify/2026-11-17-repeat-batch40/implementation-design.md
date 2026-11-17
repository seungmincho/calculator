# 40차 테트리스 솔로 입력 — 읽기 기반 연결 설계

2026-11-17 KST. 이 문서는 최초 읽기 설계다. 순수 준비 API는 [preparation.md](./preparation.md), 36/37 체크포인트 뒤 부모 연결·작성자34그룹 결과는 [implementation.md](./implementation.md)에 기록했다. 아래 미래형과 최초 상태는 설계 당시 기록이며 현재 완료 범위는 구현 보고서를 따른다.

## 근거와 기존 접점

`plan.md`, root의 `check-tetris-input-baseline.mjs` 및 `before-fix.json`, `Tetris.tsx`, `TetrisPageClient.tsx`, `tetrisEngine.ts`의 입력 접점을 읽었다. 기존5그룹 재현을 다시 실행하거나 새 실행 결과로 집계하지 않았다. baseline은 실제 핸들러 AST 범위를 VM에서 실행한 것이며 Chrome 재현과 구분한다. 원본 SHA는 기존 before-fix 파일을 그대로 보존한다.

| 현재 접점 | 읽기로 확인한 문제/유지점 |
|---|---|
| `Tetris.tsx` keyboard effect | INPUT/TEXTAREA/SELECT/isContentEditable만 제외한다. button/SVG descendant/link/summary, IME/defaultPrevented를 구분하지 않는다. keyup은 action만으로 전체 held 상태를 해제한다. |
| `press/release`, heldRef/dirRef/dasRef | 키 코드/포인터 식별 없이 action별 boolean이므로 한 입력의 release가 다른 입력의 hold까지 없앤다. 최초 이동1칸 및 이후 DAS/ARR 공식은 부모에 있다. |
| `pad(action)` | pointerdown 즉시 실행, pointerup/cancel/lostcapture는 해당 action 전체 해제. click/키보드 활성화 경로가 없다. preventDefault만으로 뒤따르는 click이 없어질 것이라고 가정하면 안 된다. |
| 보드 pointer handlers | pointerId를 저장하지 않으며 다른 포인터의 up도 첫 제스처를 종료한다. pause/start는 gestRef를 정리하지 않는다. width0이면 기존 while 이동 루프가 종료되지 않을 수 있다. |
| 게임 RAF effect `[status]` | 매 callback이 최신 gameRef를 읽어 과거 예약도 새 게임을 조작할 수 있다. playing→playing 새 게임은 status가 같아 effect 재시작도 보장하지 않는다. sync에서 finish된 뒤에도 다음 RAF를 예약한다. |
| popup timeout | 새 팝업에는 이전 timeout을 취소하지만 start에서 이전 timeout 소유권을 무효화하지 않는다. 취소 직전 큐에 들어간 callback도 새 팝업을 지울 수 있다. |
| blur/visibilitychange | 이미 pause 호출을 연결했다. 신규 기능으로 다시 구현/집계하지 않고 같은 입력 정리 경계를 재사용한다. |
| 저장/성과/제출 | `tetris-best-score`, `tetris-stats`, `tetris-handling`, finish의 recordGameResult/checkQualifies/fetchLeaderboard, 명시 name submit을 유지한다. 공개 리더보드 테스트 쓰기는 금지다. |

TetrisPageClient는 solo↔multi를 교체하며 솔로 unmount가 발생한다. 이 파일과 `TetrisMultiplayer.tsx`, 엔진 SRS/7-bag/점수/락/홀드 규칙은 변경 대상이 아니다.

## 표준 버튼과 전역 게임 키

실제 button은 focus 상태에서 Space/Enter로 활성화되고, 화면 맥락이 유지되는 조작은 보통 focus도 유지한다. 패드도 이 의미를 제공하며 키보드 사용자를 pointer handler에 의존시키지 않는다. [W3C APG Button Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/button/)

Pointer Events는 click이 키보드 같은 비포인터 입력에서도 발생하며, 포인터 click은 원래 pointerId/type을, 비포인터 click은 별도 식별 값을 사용하도록 정의한다. lostpointercapture 뒤에도 click이 올 수 있으므로 capture 해제와 click 소비 기록은 같은 상태가 아니다. [W3C Pointer Events §4.2.12](https://www.w3.org/TR/pointerevents3/#the-click-auxclick-and-contextmenu-events)

pointerdown의 취소 뒤에도 click이 나오는 예시가 최신 Pointer Events 작업 초안에 명시되어 있다. 따라서 preventDefault를 중복 실행 방지의 유일한 근거로 삼지 않는다. 이 문서는 작업 초안이며 모든 브라우저 지원을 보장하는 근거로 쓰지 않는다. [W3C Pointer Events Level 4 compatibility mapping](https://www.w3.org/TR/pointerevents4/#compatibility-mapping-with-mouse-events)

전역 keydown 판정은 다음 순서로 제안한다.

1. 이미 처리된 defaultPrevented, isComposing/keyCode229는 무시한다. meta/alt 조합 및 Control 자체가 아닌 ctrl 조합도 통과시켜 인쇄·복사·브라우저 이동 단축키를 가로채지 않는다. ControlLeft/Right 단독의 기존 즉시 반시계 회전, Shift 자체 및 Shift+게임 키는 유지한다.
2. target 또는 composedPath/가장 가까운 ancestor가 input/textarea/select/contentEditable/button/a[href]/summary/명시 interactive role이면 게임 단축키를 실행하거나 preventDefault하지 않는다. SVG/path 같은 자식도 실제 컨트롤 ancestor로 판정한다.
3. 명시 interactive role은 button/link/checkbox/radio/switch/slider/spinbutton/textbox/combobox/listbox/option/menuitem 계열/tab/treeitem 등 위젯을 포함한다. 단순 tabindex만으로 게임 보드까지 배제하지 않는다. game/application 영역과 비상호작용 배경의 기존 게임 키는 유지한다.
4. 게임이 허용하는 key만 `key:<code>` 소유자로 등록한다. repeat 또는 이미 같은 source를 보유한 keydown은 최초 이동/회전/드롭을 다시 실행하지 않는다. P/Escape와 idle/over Enter도 repeat 중복 전이를 막는다.
5. keyup은 현재 target이 컨트롤로 바뀌었어도 **이미 등록한 자기 code 소유자만 해제**한다. keydown을 거부한 입력의 keyup은 no-op이다. release에는 preventDefault가 필요 없다. 이 구분으로 포커스 이동 중 눌린 키가 남는 것을 막는다.

CtrlLeft/Right는 기존 ccw 키이므로 모든 ctrlKey를 일괄 거부하지 않는다. 기존 KEYMAP 자체는 그대로 사용한다.

## 입력 소유권과 엔진 호출 분리

신규 순수 모듈 후보 `src/utils/tetrisInput.ts`는 엔진을 직접 수정하지 않고 입력 source와 행동 계획을 소유한다.

- `TetrisInputAction = left | right | down | cw | ccw | hard | hold`.
- source는 `key:<code>` 또는 `pad:<pointerId>`로 구분하고, 각 press는 action·증가 순번·epoch를 가진다. pad source에는 target button/action의 identity를 함께 보관해 다른 버튼의 늦은 이벤트가 현재 소유자를 해제하지 않게 한다.
- `press(source, action)`은 새 source에서만 accepted와 즉시1회 action을 반환한다. 같은 source 반복은 no-op. 서로 다른 source가 같은 방향을 누르면 독립 보유자가 되며 각각의 최초 press는 기존처럼 즉시1회 동작한다.
- snapshot은 `{left,right,down,direction}`이다. left/right가 동시에 있으면 **아직 보유 중인 source 중 마지막 press 방향**을 선택한다. 한 소유자 release는 나머지를 보존한다. 유효 direction이 그대로면 release가 DAS를 불필요하게 재설정하지 않는다. 반대 방향으로 돌아가는 경우는 기존 의미대로 DAS를 다시 시작한다.
- 같은 방향의 새 소유자 최초 press에서는 기존 press의 즉시 이동/DAS 재시작 의미를 유지한다. 연속 이동·soft drop의 실제 시간과 점수는 기존 RAF/엔진을 사용한다.
- `release(source, expectedEpoch?)`, `reset()`과 읽기 전용 snapshot을 제공한다. reset은 epoch를 올리고 전 소유자를 비운다. 상태를 비운 뒤 늦은 release는 다른 새 source를 해제하지 않는다.
- 키보드/보조기술의 패드 click은 `pulse(action)`으로 한 번 실행하고 held 소유자를 남기지 않는다. 이동 키를 계속 누르는 게임 키보드/DAS와 버튼 활성화는 구분한다.

브라우저 element/key event 판정 helper는 DOM 구조 포트를 받거나 별도 작은 adapter로 둔다. React 상태·canvas·네트워크는 순수 소유권 모듈에 넣지 않는다.

## 패드 pointer와 click의 중복 방지

1. 유효 pointerdown은 source를 등록하고 capture를 시도한 뒤 즉시 action을 실행한다. 두 번째 touch도 허용하므로 isPrimary만으로 걸러내지 않는다. mouse의 주 버튼 이외 입력은 받지 않는다.
2. pointerup/cancel/lostcapture는 해당 pointerId·target·epoch만 release한다. action 전체 boolean을 끄지 않는다. 유실된 capture에는 전역 pointerup/cancel 보조 해제 또는 capture 실패 시 소유자 정리를 적용해 held를 남기지 않는다.
3. pointerdown에서 이미 실행한 활성화의 소비 기록을 같은 button/pointerId/epoch로 남긴다. matching click은 기록을 소비하고 추가 engine action0이다. up/lostcapture는 hold만 풀고 이 click 기록을 먼저 없애지 않는다.
4. 비포인터 click(`pointerId=-1`/빈 pointerType) 또는 해당 pointerdown 기록이 없는 activation은 키보드/보조기술 click으로 받아 한 번 pulse한다. `detail===0`만 허용하는 필터는 쓰지 않는다.
5. pointerId가 없는 구형 MouseEvent click은 같은 target의 직전 pointer sequence와 detail/time 범위를 함께 확인하는 제한된 fallback을 둔다. 기록이 없는 클릭은 detail 값만으로 거부하지 않는다. 사용한 기록은 한 번 소비하고 다음 정상 입력/cleanup에서 정리하며 오래된 기록이 나중 보조기술 클릭을 삼키지 않게 한다. 이 fallback의 실제 지원 범위는 native 검사에서 확인하고 전 OS/AT 호환을 단정하지 않는다.
6. native button의 첫 Space/Enter 활성화는 click 경로로 처리한다. 같은 key의 repeat keydown은 기본 반복 click을 막아1회 활성화를 유지한다. Space keyup 전후/Enter keydown의 실제 브라우저 click 순서를 검사한다. keyup/blur/lifecycle reset은 이 중복 키 기록도 정리한다.

pause/start 뒤 새 gesture가 아닌 옛 synthetic click을 실행하지 않도록 소비 기록에도 epoch를 적용한다. 오래된 pointer sequence로 확인되는 click은 새 epoch에서 pulse로 승격하지 않는다. 단, 유효한 새 keyboard/AT activation은 계속 허용한다.

## 보드 gesture

순수 `createTetrisGesture()` 후보는 `{pointerId,epoch,x0,y0,lastX,lastY,startedAt,moved}` 하나만 보유한다. `begin/move/end/cancel/reset`이 입력 검증 후 `moveLeft/right count`, `soft count`, `rotate/hard/hold` 같은 행동 계획을 반환하고 부모가 기존 엔진 함수를 호출한다.

- 첫 유효 pointerdown만 받는다. 이미 active면 같은/다른 pointerdown으로 원점을 덮지 않는다. 다른 pointer의 move/up/cancel/lostcapture는 아무 것도 바꾸지 않는다.
- pause/start/finish/hidden/blur/unmount에서 gesture를 비워 old up이 resume/newgame에서 tap/rotate로 실행되지 않게 한다. 캡처를 해제할 때도 소유한 ID만 다룬다.
- 좌표/시간/폭은 finite, 폭은0보다 커야 한다. 계산된 delta/비율도 finite인지 확인한다. 0/NaN/Infinity/overflow는 엔진 동작0으로 버린다.
- 한 pointermove의 engine 반복 수는 보드 폭/높이로 제한해 작은 양수 폭이나 과도한 좌표에서도 무한/장시간 while이 되지 않게 한다. 벽/바닥 뒤 불필요한 반복은 하지 않는다. 초과 변위를 이후 이벤트에서 따라잡는 대기 작업으로 쌓지 않는다.
- 기존 tap(<12px,350ms), flick(300ms/50px/1.5배), 좌우 cell 및 아래1.2cell 의미는 정상 범위에서 유지한다. `moved`와 종료 계획에 따라 현재의 회전/하드드롭/홀드 선택을 보존한다.

## Lifecycle·RAF·popup

`clearInput()`은 모든 held source·pad key/소비 기록·gesture·capture를 한 번에 정리한다. pause/start/finish/hidden/blur/unmount에서 같은 경로를 사용한다. 기존 blur/hidden 자동 pause 자체는 유지한다.

게임 세대와 실행 loop 예약 세대를 별도로 둔다. start는 동기적으로 이전 frame을 취소/무효화하고 새 Game identity와 runRevision을 만든다. effect는 `[status,runRevision]`을 따라 playing→playing 새 게임도 새 루프를 예약한다. setup은 현재 Game/epoch를 캡처하며 callback은 아래를 **엔진 호출 전과 sync 후 다음 예약 전** 확인한다.

- mounted이며 현재 playing인가.
- 같은 Game identity와 loop epoch인가.
- 자기 reservation이 아직 유효한가.

dt는 정상 값에서 기존 `min(elapsed,100ms)`를 유지한다. 비유한/음수 timestamp는 시간을 빼거나 큰 이동을 만들지 않는다. finish로 status가 바뀌면 callback 끝에서 다음 RAF를 만들지 않는다. cleanup→setup Strict replay는 영구 dispose된 인스턴스를 재사용하지 않고 가역 inactive/새 reservation 방식으로 첫 입력을 보장한다.

popup도 증가 token과 Game epoch로1200ms 지우기 예약을 소유한다. 새 popup/start/pause/finish/unmount는 이전 예약을 정리한다. Date.now가 같은 값이어도 token은 다르며 과거 callback이 새 popup을 지우지 않는다. 이미 실행한 엔진 action은 되돌리지 않는다.

finish의 점수·통계·업적 판정이나 API payload는 바꾸지 않는다. 늦은 옛 frame 자체가 finish까지 도달하지 못하게 보호하고, 현재 gameover는 기존대로1회 기록한다. 이름 모달·명시 제출·ShareResult 동작은 기존 범위 회귀로만 확인하며 실제 공개 RPC는 차단한다.

## 파일 및 검증 단계

| 파일 후보 | 책임 |
|---|---|
| 신규 `src/utils/tetrisInput.ts` | action/source 소유권, interactive target 판단, pad activation 중복 식별의 순수 정책 |
| 신규 `src/utils/tetrisGesture.ts` | 포인터 단일 소유권·유한값/폭 검증·bounded gesture 계획 |
| `src/components/Tetris.tsx` | 기존 엔진 접점에 helper 연결, RAF/popup 소유권, native button click, 최소 data selector/44px/focus 표시 |
| 신규 `scripts/check-tetris-input.ts` / `scripts/check-tetris-gesture.ts` | 다중 source/키·포인터/epoch/수치 경계의 별도 oracle |
| `docs40/check-tetris-parent.mjs` 예정 | 실제 부모 이벤트/제어 engine·canvas·소리·storage·RPC와 Strict replay |
| `docs40/translations-tetris.json` 예정 | 실제 추가 안내가 필요한 경우 KO/EN fragment. canonical은 통합 담당 |

baseline5의 source 추출 스크립트와 before-fix JSON은 재현 근거로 유지한다. 수정 후 새 구현은 더 이상 같은 source anchor가 아닐 수 있으므로 baseline assert를 억지로 성공으로 바꾸지 않고 별도 actual-parent 검사로 같은 사용자 흐름의 해결을 확인한다.

필수 순수 경계는 같은방향 두 포인터+키/반대방향 해제복귀/중복 press/여러 키가 같은 회전 action/unknown release/epoch 뒤 late release, 포인터 불일치/capture 상실/0폭/극소폭/NaN/Infinity/거대한 delta/음수시간이다. 부모는 button Space·link Enter·summary·range·SVG child·IME/defaultPrevented·typing을 포함하고, 실제 button click과 pointer 뒤 click이 각각1회인지 확인한다.

다음 실제 부모 검사에는 playing→playing start, pause→resume oldup, lostcapture 후click, 게임 종료 후oldRAF, 새popup 뒤oldtimeout, Strict replay 후start, storage/achievement/gameover1회, 이름 입력과 명시 가짜 submit을 포함한다. 공개 submit0·실제 소리0·가짜 canvas를 유지한다.

verify 단독 Chrome은 Tab/Space/Enter/native click/멀티포인터/320px KO·EN/focus-visible과 실제 game UI를 검사한다. AST/가짜 포트 PASS를 실제 assistive technology/모든 OS 검증으로 표현하지 않는다. 전체 타입은 통합 담당만, 빌드·배포·커밋은 금지다.

## 현재 상태

읽기와 공식 입력 의미 확인·문서 작성만 끝냈다. 신규 TS/검사 TS·부모 연결·패키지 변경은0이다. 소유권 세부 API는 순수 준비 승인 후 위 계약 안에서 확정하고, 클릭 식별 fallback과 한 이벤트당 gesture 반복 제한은 실제 helper/제어포트 증거와 함께 root에 다시 알린다.
