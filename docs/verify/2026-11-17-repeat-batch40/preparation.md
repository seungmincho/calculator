# 40차 테트리스 솔로 입력 — 미연결 순수 준비

2026-11-17 KST. 33/34 전체 타입 통과 뒤 승인된 신규 파일만 작성했다. **부모 연결 전 준비 완료·TS 안정 상태**이며, 36/37 체크포인트 뒤 연결 지시 전까지 아래 TS 파일을 고정한다. 실제 `Tetris.tsx`, 엔진·멀티플레이·저장소·성과·RPC·canonical은 수정하지 않았다.

## 소유 파일과 결과

| 파일 | 범위 | 확인 |
|---|---|---|
| `src/utils/tetrisInput.ts` | 전역 키 정책·입력별 소유권·패드 클릭 소비 | 신규 14그룹 |
| `src/utils/tetrisGesture.ts` | 단일 보드 포인터와 제한된 동작 계획 | 신규 9그룹 |
| `scripts/check-tetris-input.ts` | 구조형 target 및 키/포인터 이벤트 포트 | PASS |
| `scripts/check-tetris-gesture.ts` | 좌표/시간/epoch 포트 및 기존 엔진 적용 | PASS |

실행 명령:

```text
node scripts/check-tetris-input.ts                 14그룹 PASS
node scripts/check-tetris-gesture.ts                9그룹 PASS
node scripts/check-tetris.ts                       기존 엔진 회귀 PASS
npx eslint src/utils/tetrisInput.ts src/utils/tetrisGesture.ts scripts/check-tetris-input.ts scripts/check-tetris-gesture.ts
                                                   exit 0, 오류 0 / 경고 0
```

Node의 기존 `MODULE_TYPELESS_PACKAGE_JSON` 안내는 실행 실패가 아니다. 이를 없애기 위한 package 설정 변경은 하지 않았다. 기존 root baseline 5그룹은 재실행/새 결과로 합산하지 않았다. 전체 타입·Chrome·빌드·공개 리더보드 쓰기는 실행하지 않았다.

## 확정 API

### 전역 키와 held 입력

`tetrisKeyIntent(event, status, modalOpen)`는 `action/pause/resume/start/repeat` 또는 `null`을 반환한다. `null`이면 전역 핸들러가 preventDefault나 게임 동작을 수행하지 않는다. defaultPrevented·IME·keyCode229, 버튼/링크/summary/편집 영역/위젯 role의 ancestor·composedPath를 제외한다. DOM 생성자나 React에 의존하지 않는다.

meta/alt 조합은 모두 통과한다. ctrl 조합은 ControlLeft/Right 자체만 기존 반시계 회전으로 허용하고 후속 C/P/방향/Space/Enter는 통과한다. Ctrl 자체를 눌렀을 때 이미 실행된 회전을 지연하거나 되돌리는 변경은 아니다. Shift 자체 및 Shift+알파벳 게임 키는 기존대로다. 기존 키 매핑을 별도 literal 기대값과 대조했다.

`createTetrisInputOwners()`는 다음을 제공한다.

- `reset(active)`가 epoch를 증가시키고 소유자를 비운다. 반환 snapshot의 epoch를 gesture/gate에 함께 전달한다.
- `press(source, action, expectedEpoch)`는 키 코드 또는 포인터 ID+버튼 target에 대한 불변 token과 snapshot을 반환한다. 같은 물리 source의 반복 press는 무시한다. 서로 다른 source의 최초 press는 기존 즉시 동작을 각각 한 번 수행할 수 있다.
- `getToken(source)` / `release(token)`은 해당 소유자만 해제한다. 복제 token·이전 epoch·다른 controller의 token은 무시한다.
- snapshot의 `left/right/down`과 마지막 남은 좌우 입력의 `direction`을 부모 held/dir에 반영한다. 반환 `resetDas`를 사용할 때 다른 같은 방향 소유자 해제는 진행 중인 DAS를 재시작하지 않는다.
- `pulse(action, epoch)`는 네이티브 버튼 click의 한 번 동작에 사용하며 held 상태를 남기지 않는다.

### 패드의 native activation과 click 소비

`createTetrisActivationGate()`는 held 소유권과 별도로 제한된 소비 이력을 유지한다. `reset(epoch, active)`는 기존 포인터 이력을 retired로, 누른 키를 canceled로 표시한다. 이력은 최대 32개이며 게임 입력 held 상태와 분리된다.

- `pointerDown(id, target, at, epoch)` token은 즉시 press 경로에만 발급한다. `pointerEnd(token, at)`는 up/cancel/lost capture 이후에도 뒤따르는 click을 소비할 수 있도록 남긴다.
- `keyDown(code, target, epoch, repeat)` / `keyUp(...)`의 true는 네이티브 버튼 활성화를 허용한다는 뜻이다. 최초 Space/Enter는 기본 동작을 유지하고 반복 keydown·취소된 이전 Space keyup은 preventDefault 대상이다. blur는 `cancelKeys(target)`를 호출한다.
- `click(...)`은 `activate/duplicate/stale`로 판정한다. 명시적인 하드웨어 pointerId는 대응하는 pointerdown 이력이 있어야 하고, 이미 즉시 실행한 현재 이력은 duplicate, 이전 epoch/다른 target/퇴출된 ID는 stale이다. 이로써 오래된 하드웨어 이벤트를 보조기술 입력으로 승격하지 않는다.
- 명시적인 비포인터 click(pointerId -1 또는 빈 pointerType), 포인터 ID가 없는 click은 native keyboard/AT 경로로 처리한다. detail 값 하나만으로 허용 여부를 결정하지 않는다. ID 없는 구형 MouseEvent는 같은 버튼의 최근 포인터 이력 1개만 1,200ms 안에서 소비한다. 이 호환 경로를 모든 브라우저/보조기술에 대한 보장으로 해석하지 않는다.

부모 연결 때 native button의 실제 keydown→click→keyup 순서 및 pointerdown→up→lost capture→click은 Chrome 담당의 독립 검증 대상으로 남는다. 순수 포트 검사는 실제 네이티브 이벤트 발생을 대체하지 않는다.

### 보드 제스처

`createTetrisGesture(columns, rows)`의 `reset/begin/move/end/cancel/getToken`은 포인터 ID+target+불변 token+epoch를 검증한다. 동시에 한 포인터만 보드를 소유하며 무관한 두 번째 포인터는 기존 소유자의 tap을 종료하지 못한다.

좌표·시간·폭이 유한하고 폭이 양수여야 한다. 유효한 소유자의 잘못된 좌표·역행 시간은 제스처를 취소한다. 가로 1 cell, 아래 1.2 cell, tap의 12px/350ms 미만과 flick의 50px 초과/300ms 미만이라는 기존 정상 경계를 유지한다.

`move`는 수평 최대 columns회·soft drop 최대 rows회 계획만 반환하며 초과 거리는 버린다. 매우 작은 폭/큰 유한 좌표에서도 무한 while이나 다음 이벤트의 과도한 따라잡기 동작을 만들지 않는다. 부모가 계획을 기존 엔진 함수에 적용하며 helper 자체는 엔진을 변경하지 않는다. action 배열/원소와 소유 token은 불변이다.

## 후속 부모 연결 계획

기존 설계의 접점과 범위를 유지한다.

1. held/dir 입력을 owner snapshot으로 갱신하고 최초 동작은 기존 엔진 함수에 적용한다. DAS/ARR 설정·중력·회전/SRS·7-bag·점수 공식은 변경하지 않는다. keyup은 focus가 편집 컨트롤로 옮겨갔어도 이미 승인된 자기 token만 해제한다.
2. 패드 native click·키보드 반복 제어와 pointer capture를 연결한다. capture 정리 시 held token과 click 소비 token을 혼동하지 않는다. pause/start/finish/hidden/blur/unmount에서 모든 입력 epoch를 함께 바꾼다.
3. 보드 handlers는 gesture action 계획을 적용하고 이전 token의 늦은 up/cancel을 무시한다. 화면 폭·client 좌표·event timestamp를 포트에 전달한다.
4. RAF는 game identity+epoch+예약 세대를 검사하고 sync/finish 후 다음 예약 전에 다시 확인한다. playing→playing 새 게임도 루프를 재설정한다. 정상 dt 최대100ms 및 DAS/ARR 계약은 유지하고 음수/비유한 dt는 적용하지 않는다.
5. popup timeout은 game epoch+popup token으로 소유권을 검사하고 새 게임/언마운트에서 무효화한다. Strict effect replay 후 새 루프와 입력은 정상 재시작돼야 한다.
6. 실제 부모 fixture로 저장/성과/모달·명시 mock 제출을 필요한 경계만 확인한다. 공개 RPC 쓰기는 금지한다.

이번 순수 모듈에는 사용자 문구가 없어 번역 조각을 추가하지 않았다. 부모 연결 시 안내가 달라지면 같은 담당이 KO/EN fragment를 작성하고 canonical 병합은 통합 담당에게 전달한다. 현재 부모·브라우저 기능 완료로 표시하지 않는다.
