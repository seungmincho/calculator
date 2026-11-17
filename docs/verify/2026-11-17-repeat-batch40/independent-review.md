# 테트리스 입력 — 독립 실제 부모 검토

2026-11-17. **8그룹 PASS, 재현 제품 결함과 수정 요청 없음.** 독립 작성 범위는 이 문서와 `check-tetris-independent.mjs`다. 제품 TS·번역·공용 파일은 수정하지 않았다. 42차 미연결 준비 TS는 동결 상태다.

`node docs/verify/2026-11-17-repeat-batch40/check-tetris-independent.mjs`로 실제 Tetris 부모와 실제 엔진을 실행했다. 작성자의 `tetris-parent-harness.mjs`는 DOM/RAF/시간/capture/저장소/성과·리더보드 포트 설치와 관찰 도구로만 재사용했다. 작성자 검사/assertion은 실행하거나 복사하지 않고 아래 입력 순서와 기대값을 별도로 작성했다. 같은-ID 이전 run 해제 경계를 강화한 뒤 해당1그룹만 재확인했고 반복을 추가 그룹으로 세지 않았다.

1. **전역 키 소유권**: SVG→링크/summary, 여러 role 중 menuitem, plaintext-only 조상, composedPath에 retargeted button, IME/defaultPrevented 이벤트는 게임 엔진 호출과 preventDefault 추가0. 종료 뒤 링크 자식 Enter도 새 판을 만들지 않는다.
2. **패드 native/AT 형식 구분**: pointerdown의 즉시 동작 후 같은 hardware click은 중복0. 그 직후 명시 non-pointer `pointerId=-1/type=''` 클릭은 detail2여도1회 동작한다. blur 뒤 Space keyup은 취소하며 새 Space는 다시 사용할 수 있다. Enter 유지 중 반복click은1회, 접근성 이동 click은 held를 만들지 않는다.
3. **별도 held 참조 모델**: 64단계 결정적 key/다중pointer press/release 시퀀스에 대해 물리 소유자 Map과 마지막 남은 방향을 별도로 계산한다. 매 단계 즉시 동작 횟수·DAS 뒤 엔진 move 방향·모든 소유자 해제 후 이동0을 비교했다. textarea 위 keyup도 기존 key 소유만 해제하고 blur/resume 뒤 남은 이동0이다.
4. **포인터 소유와 세대**: 외부 pointer move/cancel, 이전 보드 up은 현재 캡처를 종료하지 않는다. 같은 pointerId를 새 run에서 다시 누른 뒤 이전 run 핸들러의 up이 새 held를 해제하지 않고, 현재 up은 정상 해제한다. 다른 손가락의 capture loss도 남은 손가락을 유지한다.
5. **제스처 입력 한도**:0/음수/Infinity/NaN 폭은 동작0, 활성 제스처의 비유한 좌표는 소유를 종료하며 새 정상 입력은 복구된다. 극소폭+큰 유한 좌표를 실제 부모 엔진 경계에서 최대10수평/22soft 호출로 확인했다.
6. **Strict/RAF/Game identity**: 초기 및 playing 상태 effect replay 뒤 사용 가능한 루프가 남는다. 기존 예약/같은 예약 재실행/playing→playing restart 후 옛 callback은 retired Game을 조작하지 않는다. 최신 예약1개·최신 Game step1회, unmount 뒤 옛 패드·RAF·timer 엔진 호출0을 확인했다.
7. **팝업 소유권**: 같은 Game의 다음 팝업과 새 Game의 팝업 모두 옛 timeout으로 사라지지 않는다. hidden 자동pause가 현재 팝업을 정리한다.
8. **기존 저장·성과·명시 제출**: 더 낮은 최종 점수는 기존 best를 유지하며 games/totalLines/bestLines만 기대값으로1회 갱신한다. handling 값은 유지한다. 이전 RAF를 다시 불러도 성과1회, 이름 버튼을 명시 실행할 때만 mock 제출1회이며 공유 headline과 점수 payload가 일치한다.

## 근거와 한계

`npx eslint docs/verify/2026-11-17-repeat-batch40/check-tetris-independent.mjs`는 exit0·오류0·경고0이다. 의미가 겹치는 준비 순수23그룹/작성자11그룹은 다시 실행하지 않았다. 이 검사는 실제 부모 이벤트 콜백과 실제 엔진의 제어 포트 검증이다. 브라우저 기본 Space/Enter activation·OS AT·실제 pointer capture 순서·Canvas 픽셀/소리·모바일 layout은 지정 native 검증의 증거를 따른다. Chrome·전체 타입·빌드·배포는 실행하지 않았으며 공개 리더보드/실제 사용자 저장소 쓰기는0이다.
