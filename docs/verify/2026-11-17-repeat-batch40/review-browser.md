# 40차 테트리스 실제 브라우저 검증

2026-11-17 07:55:55 KST 종료. **8/8 PASS**, Chrome 종료. 기존 3039 서버를 재사용한 격리 Chrome이며 제품 파일·서버·기존 사용자 저장소는 변경하지 않았다. 통합 담당의37/39/40 최종 전체 타입도 **08:08:20 KST 시작·2GB·exit0/진단0**으로 통과했다.

- 실제 Tab/focus-visible, Space 반복 keydown→keyup, Enter, 포인터 click에서 각 하드드롭이 한 번 실행됐다.
- 일반 버튼·input·textarea·contenteditable·링크·SVG의 키 입력은 전역 게임 입력으로 새지 않았다. 게임에서 잡은 키는 초점 이동 후 keyup으로 해제됐다.
- CDP의 실제 Chrome touch 포인터 두 개와 키를 함께 잡은 3개 소유권을 확인했다. 하나를 떼어도 나머지가 유지되고 반대 방향 포인터를 떼면 눌려 있는 키 방향으로 돌아왔다.
- 실제 캔버스 탭은 한 번 회전했다. 외부 pointerup·정지/재개 이전의 늦은 up·제어한 너비 0 geometry는 새 동작을 만들지 않았다.
- 실제 게임 RAF를 관측·보류하여 새 게임 뒤 옛 callback의 변이 0을 확인했다. 합성 clear 이벤트로 만든 새 팝업은 옛 timeout에 지워지지 않았다.
- 합성 게임 종료 상태를 실제 부모에 전달해 통계 games=1/totalLines=12/bestLines=12, 최고점3210과 반복 callback의 추가 집계0을 확인했다. 이름 입력과 mock submit 1회를 검증했다. **공개 leaderboard 서버로 실제 제출/조회한 요청은 0**이다.
- DAS70 저장, 언어 전환 중 게임 유지, 정지/재개, 실제 Header SPA 이탈 뒤 옛 RAF의 변이0을 확인했다.
- 320px 다크 KO/EN 모두 body/document320px, 새 패드/정지 조작44px 이상, 실제 키보드 초점 표시가 유지됐다.

JS pageerror·hydration·미처리 rejection·원시 번역키 0, 제품 결함0. 외부 광고/분석/폰트 요청은 차단했다. AudioContext는 무음 검증 포트이며 실제 스피커 소리·실기기 터치 반응·실제 공개 기록 서버 동작은 검증했다고 주장하지 않는다. RAF/finish/clear/너비0는 제어 경계이고 키보드·CDP 멀티터치·canvas/React는 실제 실행이다.

실행: `node scripts/check-repeat-batch40-browser.mjs` (단일 Chrome). 실행기·fixture 및 39 준비 runner 범위 ESLint exit0. 증거는 [final-results.json](browser/final-results.json), [KO 화면](browser/tetris-320-ko-top.png), [EN 패드](browser/tetris-320-en-panel.png). KO 첫 화면과 EN 패드 캡처를 직접 검토했다. Enter 가이드의 시작 전/종료 후 조건 명확화는 이후 canonical 문구 수정이며 제품 TS/통과한 native 동작 변경은 없다. 기존 개발 Issue 배지·하단 고정 탐색은 제품 회귀로 판정하지 않았다.
