# 40차 테트리스 솔로 실제 브라우저 검증 계획·실행 범위

실행 완료:2026-11-17 07:55:55 KST,8/8 PASS·Chrome 종료. 실제/제어 경계와 근거는 `review-browser.md` 및 `browser/final-results.json`을 따른다.

부모 final ready·canonical 통합 신호 전 Chrome을 열지 않는다. 기존3039·단일 Chrome·격리 저장소를 사용한다. **공개 leaderboard RPC는 반드시 응답 mock**하고 실제 제출/읽기 전송0을 유지한다. 다른 외부 요청은 차단하며 음향은 무음 포트로 관측한다. 엔진 변경·새 제품 TS·전체 타입·빌드·배포를 하지 않는다.

1. **native 시작·키보드 버튼:** StrictMode 첫 시작, Tab focus-visible, 실제 Space/Enter로 시작·패드 활성화가1회만 일어남을 게임 상태와 대조한다. 키 repeat·pointer 후 click이 추가 회전/드롭을 만들지 않는지 확인한다.
2. **전역 키와 컨트롤 경계:** focused 버튼/링크/이름 입력/range·SVG 자식에서 전역 게임 키가 작동하지 않음. 기존 배경/보드 게임 키는 작동. 조합 중 KeyboardEvent와 defaultPrevented는 제어 이벤트로 구분한다. 이미 잡은 키는 focus가 바뀌어도 자기 keyup으로 해제한다.
3. **실제 pointer·혼용 hold:** Chrome CDP 터치와 native 마우스/키보드로 같은 방향 두 소유자·반대 방향 전환·한 소유자 해제를 확인한다. 물리 pointer와 dispatchEvent 모델을 구분하며, capture가 실패하는 모델은 별도 명시한다.
4. **보드 gesture·pause/resume:** 보드 첫 pointer만 소유하며 다른 pointer의 move/up이 끝내지 않음. pause→resume·새 게임 후 옛 up으로 회전/드롭0. 실제 tap/drag와0폭/잘못된 좌표 모델을 구분하고 정상 게임 조작은 유지한다.
5. **RAF·popup 수명:** 실제 엔진/DOM을 유지하고 예약 callback 전달만 보류한다. playing→playing 새 게임·종료·이탈 뒤 옛 RAF가 새 게임을 움직이지 않음. popup timer의 오래된 완료가 새 표시를 지우지 않음. native 속도/전체 점수 엔진 전수 검증으로 확대하지 않는다.
6. **기존 저장·종료1회·mock 제출:** 합성 게임 상태로 종료를 만들어 최고점수/통계/성과의 기존 key를 확인한다. 이름 입력 중 게임 키 차단·명시 제출 mock payload/한 번 처리, 실제 공개 요청0. 일반 플레이 도중 기록을 임의로 생성하지 않는지 확인한다.
7. **설정·언어·솔로 이탈 회귀:** handling 설정/일시정지·복귀, 언어 변경 현재 게임 보존, 실제 SPA 또는 solo panel unmount 후 held/callback 정리. 멀티플레이의 소켓/외부 연결은 실행하지 않는다.
8. **320px 다크 KO/EN:** 패드44px·입력16px·focus-visible·보드와 안내·모달의 overflow0, raw key/JS/hydration 수집. 결과 공유는 기존 합성 결과로 필요한 최소 경계만 확인한다.

필요한 게임 상태는 검증 context의 React ref를 읽어 관측하고, 종료 fixture에만 합성 상태 주입을 사용한다. 제품에 지뢰/게임 상태 디버그 속성을 추가하지 않는다. 실제 OS IME/보조기술/실기기 멀티터치를 Chrome 이벤트 검사와 동일하게 주장하지 않는다.
