# 42차 한글 워들 독립 실제 부모 검토

결론: **독립 8그룹 PASS, 추가 재현 제품 결함/수정 요청 없음.** 작성자의 마지막 scope/hard 보완 및 TS 안정 신호 이후 실행했다. 제품 TS·공용 번역·원저자 검사 파일은 수정하지 않았다. 독립 검사 파일만 docs42에 추가했다.

## 실행 및 독립성

`node docs/verify/2026-11-17-repeat-batch42/independent-parent-check.mjs`

실제 KoreanWordle 부모·controller/storage/history를 번들링하는 작성자의 `wordle-parent-harness.mjs` **포트 host만** 재사용한다. 작성자 assertion 모듈은 import/실행하지 않았다. 실제 ShareResult와 CopyRecovery는 별도 React host에서 렌더하고 부모의 실제 props·이벤트 capture·resultKey 변화를 연결했다. leaderboard/achievement는 가짜 포트이며 공개 RPC/사용자 기록 접근 0회다.

게임 정답/유효어는 합성 입력을 만들기 위해 기존 자료를 사용한다. 통계 기대값은 정해 둔 47일의 승/패/진행 분류를 직접 세고 legacy 상수를 더했으며 `computeStats`를 oracle로 재호출하지 않았다. 정답 1회 격자의 기대값은 한글 코드포인트의 받침 유무로 자모 2/3개의 초록 칸을 구성해 `shareGrid/score`와 독립 비교했다. 다른 단어 채점/사전 수학 변경은 이번 부모 개선 범위가 아니다.

## 8개 검증 묶음

1. strict daily raw의 null/배열/잘못된 guesses/boolean/비정규 날짜 키/escape 중복 키·미래 필드, legacy 두 키 우선순위와 짧은 분포 0 채움. 실제 초기 복원·effect replay 0write 및 손상 daily와 정상 settings/연습의 분리.
2. 두 부모의 같은 prefix는 추가 쓰기 없이 idempotent, 다른 날짜는 유지. 분기 충돌 때 메모리 추측 유지와 reload 취소. write 뒤 readback 실패는 unknown이며 명시 reload가 완료 성과를 재처리하지 않음.
3. 6회 패배 및 연습 승리를 reveal 전에 각각 1회 확정. 빠른 Enter 2회·옛 reveal/toast 강제 callback이 새 연습과 자정 뒤 새 reveal 잠금을 변경하지 않음.
4. 저장 lock 대기 중 연습 전환 후에도 제출한 일일 날짜 저장은 유지되고 현재 입력은 그대로. 리더보드 가짜 포트에 최초 완료의 정확한 moves=1/duration=2345ms 전달. 전날 await 응답이 다음 날 열린 새 이름 창을 닫거나 이름을 저장하지 않음.
5. 47개 원본을 유지하고 최근 30개만 projection. legacy 첫 사용 가능 누적값 하나만 더한 played/winRate를 독립 수치 비교. 과거 정답 공유는 날짜/회차/초록 격자와 고정 링크이며 실제 단어 미포함. 과거 선택이 현재 날짜/판/저장을 바꾸지 않음.
6. current→history 복사 역순 응답, native false 복구·성공 timer, locale/선택 날짜/hard/contrast A→B→A 무효화. hard/contrast는 같은 modal scope를 유지한 제어 이벤트로 검사하여 모달 닫기 효과에 가려지지 않게 했다.
7. **실제 ShareResult** link→current 및 current→link 양방향 요청. 이전 native 거절 뒤 legacy fallback 0, 최신 실패만 전체 복구, 부모 새 요청이 공용 복구를 무효화. 성공으로 거짓 표시하지 않음.
8. **실제 CopyRecovery** 전체 readOnly 텍스트·선택 실패 안내·성공 시 전체 offset 선택. 닫기 또는 unmount 이후 native 거절은 fallback/옛 복구를 시작하지 않음.

첫 실행의 통계 selector가 새 `tabular-nums` 클래스를 포함하지 않아 제목을 잡은 것은 독립 fixture 오류였다. 제품 값을 바꾸지 않고 숫자 div 선택자를 고친 뒤 전체 8그룹이 통과했다. 이후 hard/contrast 경계를 모달 변경 없이 분리 강화하여 해당 1그룹만 영향 재검사 PASS했다(총 그룹 수는 여전히 8).

## 한계

이 검사는 가짜 타이머/제어 Clipboard·storage·lock 포트다. 실제 native clearTimeout의 지연 callback 발생이나 OS clipboard 취소 가능성을 주장하지 않는다. 이미 OS에 제출된 복사를 되돌릴 수 없다. actual ShareResult는 별도 host를 부모 props와 수동 capture 순서로 연결했으며 브라우저 이벤트 전파/DOM focus/모달 trap/320px·한글 입력은 native 담당 영역이다. useDialog와 공유 achievement 저장/RPC는 범위 밖 포트로 대체했다.

전체 tsc·Chrome·빌드·배포·커밋 실행 없음. 검사 JS scoped lint 최종 **오류 0·경고 0, exit 0**. 첫 lint의 미사용 helper 경고 1개를 제거하고 재확인했다.
