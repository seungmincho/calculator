# 25차 독립 브라우저 검증

2026-11-17 **04:11:07 KST, 12/12 첫 실행 PASS**. 원고→Diff 6개와 같은 지뢰판 연습 6개를 제품별 final ready·공용 번역 완료 뒤 순차 검사했다. 항상 Chrome 한 인스턴스만 실행했고 마지막 인스턴스 종료 뒤 통합 담당에게 전체 타입 검사 가능 신호를 보냈다. 제품 수정 요청과 미해결 결함은 0건이다.

## 원고→Diff: 6/6

| 흐름 | 실제 확인 |
| --- | --- |
| 새 탭·원본 보존·Worker | 글자수 3번 탭에서 선택한 저장본을 실제 새 탭으로 보냄. 원래 5탭/저장본 raw bytes와 주소가 그대로이며, 이미 열려 있던 Diff 원문도 불변. 새 탭 opener는 null, 별도 sessionStorage는 소비되고 source 탭의 같은 키 sentinel은 보존. 자동 Worker 0회, 명시 비교에서 실제 Worker 1회. |
| 실제 출력·복사 | 한글·CRLF·빈 줄·끝 개행이 든 두 문서를 비교해 **111바이트 TXT** 다운로드. 각 줄의 표시를 역해석하여 원본 두 문서 재구성. 실제 Clipboard API 읽기와 TXT가 Windows 개행 정규화 후 일치. 원래 탭의 이후 편집은 수신 원문을 바꾸지 않음. |
| 보내기 실패·빈 입력 | popup null, 새 창 sessionStorage 접근 거부를 주입했을 때 원문/목록 불변·실패한 blank 탭 닫힘. 50,001자 입력은 잘라 보내지 않고 중단. 빈 현재 글은 빈 문자열 그대로 전송. 놓친 storage event로 저장 raw가 바뀌어도 버튼 클릭 때 재조회하여 중단. |
| 수신 오류·재방문 | marker 없음은 raw를 소비하지 않음. 미존재·만료·미지원 버전·역할 역전은 기본 입력과 적용하지 않은 raw 보존. 성공 후 새로고침은 재적용하지 않으며 직접 입력·실제 Worker 비교는 계속 가능. |
| dirty·raw 경합·기존 연결 | 수신 callback 대기 중 사용자 편집을 보존. 2차 읽기에서 새 raw로 바뀌면 적용하지 않고, 적용 후 3차 삭제 검사에서 바뀌면 받은 입력과 새 raw를 모두 보존. swap·locale 변경으로 재적용하지 않음. 복사 실패 수동 전체 선택, 편집 후 TXT는 이전 확정 snapshot. 별도 OCR→TTS 키는 원문을 한 번 받고 소비하며 자동 음성 재생 0회. |
| 320px KO/EN | 한국어 source와 영어 target 다크 화면에서 페이지 폭 320px, 입력 16px 이상·전달/비교 버튼 44px 이상. `<b>저장 제목</b>`는 HTML이 아닌 글자로 표시. 캡처를 직접 검토해 안내·입력 잘림 없음. |

## 같은 지뢰판 연습: 6/6

| 흐름 | 실제 확인 |
| --- | --- |
| 원 배치·초기화·시계 | 일반 첫 칸40→패배→연습에서 원 mine/count/크기/first/noGuessFailed·replaySource 동일. flags/questions/boom/clicks/start/end 초기화, 첫 칸 자동 펼침. 커서 이동/대기는 시작하지 않고 유효한 깃발 조작부터 시작. 반복 패배·재연습에서도 원 배치 유지. |
| 승패·무기록·정상 회귀 | 실제 보드 칸 UI 클릭으로 연습 승리와 패배 생성. BEST·업적·일일·이름 저장 raw bytes 불변, 이름 모달/점수 제출 없음. 다음 정상 클래식 승리는 기존 BEST·업적을 갱신하고 이름 모달을 표시. |
| 복귀·일일·자동 완료 | 같은 난도 버튼, 이미 선택된 classic 탭, 새 판으로 복귀하면 일반 빈 판. daily 왕복에서 연습 source와 기록 쓰기 없음. custom 5×5/지뢰1/첫 칸12/seed2는 첫 펼침만으로 연습 완료 상태이며 시간·클릭0, 멈춘 ready로 남지 않음. |
| 늦은 제출 | 일반 승리의 이전 parent 제출 callback을 보관한 뒤 연습에서 호출해도 요청0. 정상 판에서 시작한 제출 1회는 로컬 route mock으로 잡고 지연시킴. 연습 진입 뒤 응답해도 모달·판 세대·이름/기록 bytes를 바꾸지 않음. 공개 서버 전송0. |
| 늦은 입력·정상 새 입력 | 350ms long-press callback을 보관하고 새 판 뒤 실행, 이전 pointerup/click parent handler도 호출: 새 판 영향0. 이후 실제 Enter/방향키/F와 합성 touch long-press는 정상 동작해 입력 잠금이 남지 않음. |
| 320px KO/EN | 다크 한국어 연습 안내와 영어 종료 화면에서 문서/본문 폭320px. 새 판·재연습 등 새 조작 버튼44px 이상. 언어 변경은 현재 판을 보존. 실제 캡처에서 연습 무기록 안내·보드·재연습 버튼 잘림 없음. |

## 증거

- [최종 결과 JSON](browser/final-results.json) · [검증 스크립트](../../../scripts/check-repeat-batch25-browser.mjs) · [계획](browser-scenarios.md)
- [실제 Worker TXT](browser/writing-snapshot-comparison.txt) · [편집 후 이전 확정 TXT](browser/writing-confirmed-before-new-edit.txt)
- [한국어 원고 보내기](browser/writing-send-320-dark-ko.png) · [영어 수신 화면](browser/writing-received-320-dark-en.png)
- [한국어 연습 보드](browser/mines-practice-320-dark-ko.png) · [영어 연습 결과](browser/mines-result-320-dark-en.png)

JS page error 0, hydration 오류 0, unhandled rejection 0, 도구 원시 번역 키 0. 외부 광고·폰트·동의 SDK·방문 통계는 의도적으로 차단했다. 이때 발생한 차단/통계 console 오류와 기존 개발 Issue 배지는 제품 회귀로 세지 않았다.

## 검증 범위 구분

새 탭·sessionStorage·opener·원본 저장 bytes·실제 번들 Worker·TXT·Clipboard API·보드 DOM 클릭/키보드는 Chrome 실제 실행이다. popup null/저장소 거부·수신 callback 지연/읽기 교체·Date.now 시간 경과·long-press와 오래된 parent callback 호출·RPC 응답은 경계를 제어한 fixture다. 개인 원고나 공개 점수는 사용하지 않았다.

지뢰 배치와 game 상태는 React 상태를 **읽기만** 하여 비교·클릭할 안전 칸을 찾았다. 게임 상태를 직접 수정하거나 제품 생성/솔버를 교체하지 않았다. 생성 seed를 고정했으며 작은 판 fixture의 선행 순수 확인은 별도 통과 수에 넣지 않았다. 합성 터치를 실제 모바일 기기에서 확인했다고 주장하지 않는다. 연습 UI의 기록 제외 검증이며 서버 부정행위 방지 검증도 아니다.

기존 메모→TTS 전체 흐름을 반복하지 않고 수정되지 않은 공용 키에 대한 OCR→TTS 최소 회귀만 수행했다. 25차 범위에서 빌드·배포·서버 재시작·패키지 변경·전체 타입 검사는 검증 담당이 실행하지 않았다.
