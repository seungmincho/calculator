# 47차 선택 병합 native 검증

최종 **8/8 PASS**, Chrome 종료. 기존3039/격리 context/외부 요청 차단/합성 문서로 실행했다. 통합 담당의 최종 전체 타입 검사도 통과했다(2026-11-17 09:43:59 KST).

- 실제 module Worker로 원본/수정본/혼합 선택을 비교했다. CRLF→LF, 끝 개행, 중복 줄과 입력 원문 보존, 빈 문서의 **0바이트 TXT**를 확인했다.
- 8블록을6개씩 표시해 페이지를 넘긴 선택이 유지됐다. 600행 결과의200행3페이지와 비교 필터에 관계없이 전체 TXT가 독립 기대 문자열과 일치했다.
- 각1,048,576바이트 입력의 두 변경 블록을 섞어 정확히 **2,097,152바이트** TXT를 받았다. 50k/행2k 미리보기 한도를 지키며 전체 복구는 명시 열기 뒤 원문 전체 선택이 가능했다.
- 이 환경의 큰 입력 관측: native paste 두 문서366ms, Worker 시작→응답 검증/React commit 관측247ms, 선택→화면 관측124ms, 전체 복구 열기/선택959ms. 16ms heartbeat47개 중 최대476ms. Playwright와 layout을 포함한 벽시계 관측이며 Worker 순수 CPU나 일반 기기 성능 보장은 아니다.
- 편집/교환/취소 중 마지막 성공과 선택 유지, 늦은 실제 Worker 응답 무효화, 새 성공만 기본 선택 초기화, 명시 초기화를 확인했다. 실제 Worker가 반환한 정상형 응답의 내용을 변조하자 source 검증이 거부하고 이전 선택/문서를 보존했다.
- native Clipboard 전달 문자열과 OS 읽기 CRLF 정규화를 구분했다. 실패→전체 열기/선택/재시도, 비교/병합의 copy·TXT 사이 늦은 fallback0, 입력·언어 ABA 안내 부활0을 확인했다.
- 원고 수정본의 실제 새 탭 전달/opener null/일회 소비/자동 Worker0/명시 Worker를 확인했다. 5문항 초안·수정본 raw는 그대로였다. 별도 pending 수신 중 병합 선택을 하면 edited로 취소하고 선택과 전달 raw를 보존했다(독립 P2 수정 영향).
- 320px 다크 KO/EN에서 문서/body 폭320, 입력16px/주요 버튼44px 이상, radio 화살표 키 조작을 확인했다. 두 패널 캡처를 직접 열어 줄바꿈을 검토했다. 긴 element 캡처에 sticky Header/하단탭이 중간에 보이는 것은 캡처 스크롤 artifact이며 별도 제품 회귀로 집계하지 않았다.

첫 실행6/8의 실패2는 작은 복구 문서도 ‘전체 내용 열기’를 명시해야 하는 계약을 검증기가 누락한 동일 fixture 오류다. 해당 두 흐름만 보완 재실행해 통과했고 제품 수정은 없었다. JS page error/hydration/unhandled rejection/원시 번역키0. 외부 광고·분석 차단 로그는 별도 보관했다. 실제 Clipboard/Worker/파일과 제어 실패·늦은 callback을 구분하며 OS 권한 대화상자·실사용자 문서는 사용하지 않았다.

근거: browser/final-results.json, 각 evidence, 실제 TXT와 KO/EN 캡처. 실행기 scripts/check-repeat-batch47-browser.mjs·browser-fixtures.mjs의 최초 scoped lint0이며 이후 fixture 명시 열기 보완은 실제 두 사례를 통과했다.

Native 이후 KO 복사 성공/실패 두 문구의 목적어 조사를 제거했다. 키·placeholder·제품 TS 변경0이고 통합 담당의 정적107사용/생성1578 검사만 추가했으며 native8개에 중복 합산하지 않았다. 캡처의 Next 개발 Issue 배지는 수집된 콘솔만으로 원인을 단정하지 않는다. 수집된 오류는 외부 광고/분석 요청 차단과 tool_clicks 네트워크 실패이고, JS pageerror/hydration/unhandled/React boundary 오류는0이었다. 배지만으로 신규 제품 결함을 만들거나 추가 브라우저를 열지 않았다.

## 병합 바로가기 영향 확인

기존8흐름 완료 뒤 비교 출력 옆 바로가기 anchor가 추가되어 **영향1흐름만 추가 PASS**했다(final-results9/9=기존8+영향1).600행 비교에서320px KO/EN 각각 이동 후 패널 x16/y80/width288로 Header 아래에 보였다. 원문 두 개·문서id·수정본 선택·Worker 호출 수는 그대로이고 URL hash만 line-merge-result로 바뀌었다. KO/EN viewport 캡처도 직접 확인했다. 기존8흐름을 반복하지 않았다.

검증 소유4개 runner/4개 fixture의 scoped ESLint를 완료했다. 재사용 header의 미사용 helper 경고4개는 해당 함수/참조를 제거해 해결했고 최종 오류0·경고0이다. 제품 파일은 수정하지 않았다.

최종 타입 근거: 통합 담당 `node --max-old-space-size=2048 ... tsc --noEmit`,09:43:59 KST 시작·free3.36GiB·8.74초·exit0·진단0·chunk0f20ce(동기 종료로 session ID 없음). 첫09:40:26/session62674에서 useSpeakingRecorder.ts131 TS2367 한 건이 있었고 `pageHidden()` 최소 보완 뒤 hook hidden1+parent hidden1·lint0을 확인하고 전체 타입만 재검사했다. 이미 통과한 native는 그대로 보존했으며 새 브라우저 반복은 하지 않았다.
