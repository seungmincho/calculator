# 42차 한글 워들 실제 브라우저 검증

2026-11-17 KST, 기존3039·격리 Chrome·합성 기록과 제어 날짜. **8/8 통과, 워들 Chrome 종료.** 전체 타입은 아래 통합 체크포인트로 통과했다. 모든 공개 leaderboard RPC는 mock이며 실사용 기록·실제 점수 서버 접근0이다.

- 완료35일+진행중1일의 기기 기록은36일 그대로, 최근 목록은30개였다. legacy 두 키 중 첫 유효3게임만 더해 전체 플레이38을 확인했다. 초기 daily/settings/legacy 쓰기0, 진행중 결과 반출없음, 과거 완료 격자에 정답/추측 문자열없음, 새 방문의 성과 재집계0을 확인했다.
- daily `null`·미래 회차·settings 손상·legacy 오류를 독립 표시하고 원본/메모리 판을 보존했다. daily 오류 중 연습은 가능하며 자동 덮어쓰기0이었다.
- native Web Locks와 실제 두 탭 storage 이벤트에서 같은 추측은 저장1회, 다른 다음 추측의 분기는 한쪽만 저장하고 overwrite/concat0이었다. 과거2일 보존과 명시 재조회 후 현재 판 반영을 확인했다.
- quota는 기존 raw/메모리 추측 보존, 실제 set 후 readback 실패는 unknown 표시·rollback0이었다. 재조회로 저장을 확인했다. 일일 제출 뒤 연습으로 바꿔도 이미 확정된 일일 저장은 완료하되 연습 화면을 바꾸지 않았다. 명시 reload는 queued append를 취소했다.
- 빠른 중복 Enter의 완료 성과1회, 보류한 옛750ms reveal의 새 연습 변경0, 제어 KST 날짜 변경을 native interval이 관측하는 경계, 새 방문의 완료 재집계0을 확인했다.
- 실제 native Clipboard 현재/과거 격자, API없음+legacy false 복구 원문/전체선택/재시도, 현재↔ShareResult 늦은 거부의 추가fallback0, 기록 날짜·색약·언어 A→B→A의 옛 성공부활0을 확인했다.
- 실제 QWERTY 키보드의 두벌식 입력과 native750ms reveal을 사용했다. 도움말 모달의 키는 판에 새지 않았다. 합성 이름 명시 제출1회는 mock RPC에만 도달했고 score1·이름 저장을 확인했다. 소요시간은 제어 시계로30초 진행해 기존 최소시간 규칙을 만족시켰다.
- 320px 다크 KO/EN·모션감소에서 기록 복구 textarea16px/새 버튼44px, 문서 폭320px, 언어 전환 후 기록 raw 보존을 확인했다. 두 복구 캡처를 직접 열어 줄바꿈/버튼을 검토했다.

제품 결함0. 첫 실행7/8에서 모바일 EN 재진입은 이미 펼친 날짜를 유지했는데 테스트가 같은 버튼을 눌러 접은 뒤 복사를 찾았다. `aria-expanded`를 확인하도록 테스트만 수정해 해당1흐름을 통과했고 나머지7개는 반복하지 않았다.

JS page error·hydration·unhandled rejection·원시 번역 키0. 외부 광고/폰트/방문 통계 차단 로그와 Node의 TS 데이터 모듈 분류 경고는 별도다. 실제 Clipboard/키보드/Storage/WebLocks와 제어 Date·reveal callback·오류 주입을 구분한다. 게임 사전의 순수 데이터는 합성 유효 입력 선택에만 사용했다. 실제 OS IME/물리 휴대폰·여러 탭의 전역 성과 트랜잭션·실제 공개 점수 제출은 주장하지 않는다.

실행기 `scripts/check-repeat-batch42-browser.mjs`, 상세 `browser/final-results.json`,각 evidence와 KO/EN PNG.

전체 타입은 통합 담당이2026-11-17 08:43:20 KST에여유3.84GiB·Node heap2GB로시작한 `tsc --noEmit`의 첫실행 exit0·진단0으로 통과했다(session89128). Chrome 종료 뒤의 최신41/42/43/45 제품과44copy보완/49준비를 포함한 검사이며 이 담당은 별도전체타입을 실행하지 않았다.
