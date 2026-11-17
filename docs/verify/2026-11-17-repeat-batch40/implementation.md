# 40차 테트리스 솔로 입력 — 작성자 구현·검증

2026-11-17 KST. 36/37 전체 타입 체크포인트 후 부모 연결과 작성자 검증을 완료했다. **부모 final ready이며 제품/검사 TS 고정** 상태다. 독립 검토·실제 Chrome·전체 타입 결과는 해당 담당이 별도로 기록한다.

- 준비된 `tetrisInput.ts`/`tetrisGesture.ts`와 순수23그룹은 기존 그대로다.
- `Tetris.tsx`에 전역 interactive/IME/modifier 정책, key/pointer별 held, native pad click·Space/Enter 반복 제어, capture 실패 시 held 해제, single pointer bounded gesture, lifecycle epoch를 연결했다.
- RAF는 Game identity+game epoch+loop owner+예약 ID+runRevision을 확인한다. playing→playing 새 게임도 새 루프를 만든다. popup은 별도 증가 token과 Game epoch를 확인한다.
- 게임 엔진·SRS·7-bag·score·DAS/ARR 공식·멀티플레이·저장키·RPC 구현은 수정하지 않았다. 모든 제출 검사는 mock 포트만 허용한다.
- KO/EN 조각 `translations-tetris.json` 2키(input.padHint/focusHint)를 작성해 통합 담당에게 전달했다. canonical은 미수정이다.
- 부모 scoped lint 첫 결과: 오류0·cleanup ref warning1. effect 수명에 묶인 안정 ref owner를 캡처하는 최소 보완 후 최종 오류0·경고0이다. pointer capture 메서드 존재 판단은 `typeof`로 명시한다.
- 실제 부모 검사 `tetris-parent-harness.mjs`/`check-tetris-parent.mjs` **11그룹 PASS**. 실제 부모+실제 엔진에 canvas/RAF/소리/저장·RPC 포트만 제어했다. 준비 순수23그룹과 합계34그룹이며 부모 연결 때 변경하지 않은 준비23/기존 엔진 검사를 무조건 반복하지 않았다.

## 작성자 실행 범위

`node docs/verify/2026-11-17-repeat-batch40/check-tetris-parent.mjs`에서 아래11그룹을 확인했다.

1. Strict effect setup/cleanup 반복 후 정상 시작·활성 RAF1개, 같은 예약 callback 재호출은 동작0.
2. button/link/summary/input/textarea/select/contenteditable/SVG ancestor/role slider 및 IME·브라우저 modifier 조합은 전역 게임 키0. 기존 단독 Control/Shift+게임키는 유지.
3. 실제 pad handlers의 Space/Enter 클릭1회·반복 keydown 차단·비포인터 보조기술 형식 click 허용·held 없는 pulse.
4. pointerdown→up/lost capture→click은 동작1회. setPointerCapture throw 후 최초 동작은 유지하되 held를 즉시 해제하여 움직임이 남지 않음.
5. 키+같은방향손가락+반대방향손가락의 개별 해제, 마지막 남은 방향 우선, 정상170ms DAS/50ms ARR 및 down 소유권.
6. 단일보드 포인터, 다른 포인터 up 무시, width0/극소폭/큰 좌표의 유한·최대10수평/22soft 계획, capture 실패/cancel/lost capture 후 tap0 및 새 gesture 정상.
7. pause/resume·새게임의 캡처 해제, 이전 pointer handlers/click/Space keyup 무효화, 최신 gesture만 처리.
8. playing→playing 새 Game 및 RAF 소유권, 이전 예약 무효화, 음수/비유한 timestamp에서 elapsed를 빼거나 늘리지 않음.
9. 이전 팝업 timeout이 새 Game의 팝업을 지우지 못함. pause는 팝업도 정리.
10. 정상 gameover의 best/stats/achievement1회, 기존 ShareResult, 이름 모달·명시 mock 제출1회. 실제 공개 제출0.
11. blur/hidden 자동 pause 후 held 없음, 기존 handling 저장키와 ARR0 값 유지, KO/EN pad aria/focus-visible 및44px 이상 조작 클래스.

준비4파일 lint0과 연결 부모/JS fixture2파일 lint0을 합해 소유7파일 범위가 확인됐다. 실제 canvas 픽셀·브라우저 default activation·포인터 캡처 순서·AT/OS 호환을 이 포트 검사만으로 보장하지 않는다. 현재 실제 소리·외부 네트워크·공개 RPC 쓰기는0이다. 정상 엔진/SRS/7-bag/score/멀티플레이 파일은 변경하지 않았다.

## 브라우저 선택자와 경계

- 루트 `[data-tetris-status]`: idle/playing/paused/over. `[data-tetris-run]`은 입력/실행 세대이며 숫자 자체의 고정값 계약은 없다.
- `[data-tetris-board]`: 실제 canvas. 임의 `game` 노출이나 테스트용 상태 수정 API는 제품에 넣지 않았다. 실제 플레이 상태는 React의 기존 gameRef를 읽기만 해 관측하고 사용자 이벤트로 조작할 수 있다.
- `[data-tetris-pad="left|right|down|cw|ccw|hard|hold"]`: 실제 button. `onPointerDown`은 즉시 조작, native non-pointer click은 pulse1회, disabled는 playing 외 상태.
- `[data-tetris-start]`, `[data-tetris-pause]`, `[data-tetris-resume]`: overlay/하단에 같은동작 버튼이 두개일 수 있어 `.first()` 또는 보이는버튼 범위를 사용한다.
- `[data-tetris-popup]`, `[data-tetris-handling="das|arr"]`: popup token과 기존 설정 range.

pointer 이벤트에는 `pointerId/currentTarget/clientX/clientY/timeStamp`를 사용한다. click은 `nativeEvent.pointerId/pointerType`와 `detail`을 함께 판정한다. native non-pointer id=-1/빈type를 허용하며 pointer ID가 없는 구형 MouseEvent는 같은target 최근1,200ms 포인터 이력1개만 소비한다. detail0만으로 AT를 구분하지 않는다. 실제 native 패드 Space/Enter·타겟변경·capture loss 뒤click은 브라우저 담당이 확인한다.

남은 단계는 독립/브라우저 발견 대응과 통합 전체 타입이다. Chrome·전체 타입·빌드·커밋·배포는 이 담당이 실행하지 않는다.
