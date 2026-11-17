# 51차 D-day 반출 복구 native 검증

최종 **8/8 PASS**, Chrome 종료. 합성 일정만 쓰는 격리 context에서 실제 Clipboard/Web Crypto/Canvas/Blob/download를 사용했다. 외부 Calendar 등록·개인 일정·서버 쓰기는0이다. 통합 담당의 최종 전체 타입 검사도 통과했다(2026-11-17 09:43:59 KST).

- 현재 결과 문구와 명시 mode/date/title 공유 URL의 native Clipboard 전달을 확인했다. 클릭 당시 무관 중복 query/hash를 보존하며 URL 자체를 바꾸지 않았다. 다른 고정 일정이 있는 새 탭도 명시 날짜/제목을 복원했다. 기존 전체 URL 동기화가 이미 지운 query를 되살린다는 의미는 아니다.
- Clipboard API 없음+legacy false/reject+throw는 복구로 표시됐다. 전체 원문 선택/실제 native 재시도와 입력·언어 ABA/늦은 거부의 추가 fallback0을 확인했다. Windows native 읽기의 CRLF 정규화는 전달 문자열과 분리했다.
- 실제 단일 ICS **409바이트**를 독립 파싱했다. UTF-8/noBOM/CRLF/75바이트 fold, escape,2028-02-29→2028-03-01 종일 종료일,UTC DTSTAMP를 확인했다. Node SHA256로 별도 계산한 UID와 일치하고 재다운로드 UID도 같았다. 생성한 Blob URL은 이탈 때 각각 정확히1회 회수됐다.
-100개 선택 ICS **22,935바이트**는100개의 고유 UID·제목·날짜·화면 선택 순서와 일치했다. 반출 자체의 저장 raw 쓰기0. 실제 SHA 완료를 보류하고 raw를 바꿨을 때 전체 파일을 거부하며 선택100개/최신 raw를 보존했다.
- SHA 대기 중 편집/명시 취소/모드 전환/SPA 이탈 뒤 이전 anchor0, 새 명시 요청만 최신 파일을 내려받았다. SHA 연산 자체를 취소한 결과로 표현하지 않는다.
- 실제 PNG encoder 대기→ICS, ICS 대기→ShareResult copy, 자체 copy 대기→ICS에서 이전 파일/fallback0을 확인했다. 이후 새 실제 PNG는 **1080×1350·103,325바이트**였고 직접 열어 제목·날짜·결과와 잘림을 확인했다.
- 손상/101개 저장 목록은 반출을 차단하고 원본을 보존하며 현재1개 반출은 가능했다. Blob URL 생성 실패의 거짓 성공0·명시 재시도, 구형 target/event·기념일·날짜 차이·날짜 더하기 진입을 확인했다.
-320px 다크 KO/EN body/문서320px·입력16px·주요 버튼44px 이상, 실제 Enter 전체 선택을 확인했다. 복구 패널 두 캡처를 직접 열어 안내/버튼 줄바꿈을 검토했다.

첫6/8의 실패2는 fixture 문제였다. 새 about:blank 탭에는 secure crypto.subtle이 없으므로 관찰기 설치를 HTTP(S)에만 제한했고,100개 파일 순서를 raw 배열이 아닌 기존 화면 정렬/전체 선택 순서로 대조했다. 제품 변경 없이 해당2개만 재실행해 통과했다. 초기 evidence/failure는 경위로 보존한다. 최종 JS pageerror/hydration/unhandled/원시 번역키0, 예상 외부 분석/광고 차단 로그는 별도 보관했다.

근거: browser/final-results.json·각 evidence·실제 ICS/PNG·KO/EN 캡처. scripts/check-repeat-batch51-browser.mjs 및 browser-fixtures.mjs scoped lint0이다. 이 검사는 제어 SHA 전달 지연/Clipboard 실패/URL 실패와 실제 native 정상 실행을 구분한다.

검증 소유4개 runner/4개 fixture의 scoped ESLint를 완료했다. 재사용 header의 미사용 helper 경고4개는 해당 함수/참조를 제거해 해결했고 최종 오류0·경고0이다. 제품 파일은 수정하지 않았다.

최종 타입 근거: 통합 담당 `node --max-old-space-size=2048 ... tsc --noEmit`,09:43:59 KST 시작·free3.36GiB·8.74초·exit0·진단0·chunk0f20ce(동기 종료로 session ID 없음). 첫09:40:26/session62674에서 useSpeakingRecorder.ts131 TS2367 한 건이 있었고 `pageHidden()` 최소 보완 뒤 hook hidden1+parent hidden1·lint0을 확인하고 전체 타입만 재검사했다. 이미 통과한 native는 그대로 보존했으며 새 브라우저 반복은 하지 않았다.
