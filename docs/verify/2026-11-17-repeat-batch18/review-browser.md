# 18차 독립 브라우저 검증

2026-11-17 01:21 KST 최종. **실제 브라우저 12/12 통과, JS pageerror·hydration 오류·unhandled rejection 0.** 기존 localhost:3039와 격리 Chrome을 사용했고 한 인스턴스에서 순차 실행한 뒤 닫았다. 최종 영향 검사 4/4 통과 후 통합 담당에게 전체 타입 검사 가능 신호를 전달했다. 이 담당은 빌드·개발 서버 재시작·제품 파일 수정·전체 타입 검사를 실행하지 않았다.

실행 파일은 [check-repeat-batch18-browser.mjs](../../../scripts/check-repeat-batch18-browser.mjs), 계획은 [browser-scenarios.md](browser-scenarios.md), 최신 개별 결과는 [browser/final-results.json](browser/final-results.json)에 있다.

## 확인한 동작

- 실제 검색 UI로 KO 메모→타이머→수능을 같은 document에서 이동한 동안 영어 **본문 데이터** 요청 0. 현재 수능에서 EN을 선택하면 shared와 csatGrade 본문만 읽으며 과거 notepad/timer 본문은 요청하지 않았다.
- 수능의 점수·빈칸·공유 URL·목표 초안·저장 기록과 실제 링크 복사가 언어 왕복 뒤 보존됐다. Footer와 ShareResult도 영어 원본으로 바뀌었다.
- 저장 EN 새 방문에서 응답 HTML의 KO 제목 문구를 확인했고, 초기화 뒤 EN과 URL 점수·실제 0·빈칸이 유지됐다. JS/hydration 오류는 없었다. 첫 렌더의 구체적인 동등성은 독립 SSR fixture 근거와 구분한다.
- 메모 본문/제목/저장 JSON과 같은 textarea 노드가 유지됐다. KO에서 사용자가 영어 Markdown 예제와 같은 원고를 입력해도 언어 변경 후 원고와 저장값이 보존됐다.
- 실행 중 타이머가 언어 왕복 중 계속 감소했고 pause/resume이 유지됐다. 열린 GuideSection의 설명도 영어로 바뀌었다.
- 지연된 실제 영어 본문 응답 뒤에도 KO 선택이 유지됐으며 다음 EN 선택이 성공했다. 잘못된 저장 언어와 `/energy-voucher/`, `/enneagram/`, `/env-editor/`는 KO 기본값을 유지했다. language get/set 차단 중에도 메모리 내 왕복 전환이 됐다.
- 직접 scope 연료·달리기의 입력과 계산 결과가 언어 왕복 뒤 유지됐고, 영어 가이드와 MobileResultLink가 표시됐다. 320px 다크의 달리기 화면과 수능 실패/복구 화면을 실제 캡처해 확인했다. 언어 선택 옵션과 retry 버튼은 44px 이상이었다.

| 브라우저 사례 | 최종 |
| --- | --- |
| KO SPA 여러 도구 방문 후 현재 영어 본문만 요청 | PASS |
| 수능 점수·목표 초안·URL·기록·공유/공용 UI 보존 | PASS |
| 저장 EN 새 방문, KO HTML 문구·URL 복원·hydration | PASS |
| 메모 원고·저장 JSON·동일 textarea 보존 | PASS |
| 실행 타이머·동적 가이드·pause/resume 유지 | PASS |
| 영어 예제와 동일한 사용자 Markdown 원고 저장 보존 | PASS |
| 직접 scope 연료/달리기와 320px 결과 이동 | PASS |
| 실제 import 실패→fallback 503→다음 retry 성공·320px | PASS |
| shared 실패 뒤 새 consumer 자동 retry 없음·shared/direct 복구 | PASS |
| 늦은 EN 응답 뒤 KO 유지·이후 EN 성공 | PASS |
| invalid 저장 언어·en 접두사 경로의 KO 기본값 | PASS |
| language 저장소 get/set 차단 중 메모리 전환 | PASS |

## 발견한 제품 문제와 해결 확인

1. **영어 본문 다운로드 실패 후 명시 retry가 회복하지 못함 — 해결.** csatGrade의 실제 JSON 본문 chunk를 한 번 중단했다. KO fallback/안내/자동 재요청 없음은 정상이나 화면 retry 후에도 요청이 1회뿐이고 EN으로 바뀌지 않았다. 최초 파일은 `messages_generated_en_ns_csatGrade_json_7aea0cf5._.js`. [수정 전 근거](browser/real-english-chunk-before-fix.json)를 보존했다. 담당은 실패 자원에 대한 명시 retry에서만 버전 hash를 포함한 정적 JSON을 요청하도록 보완했다. 실제 import를 다시 실패시키고 첫 JSON 요청도 503으로 실패시킨 뒤, 다음 화면 retry가 실제 JSON을 다시 읽어 EN으로 회복함을 확인했다. 요청은 본문 script 1회 + JSON 2회였고 입력 79/82도 유지됐다. shared 실패 후 새 화면의 consumer mount에서는 자동 재시도 0이며, 명시 retry로 shared와 현재 fuelCalculator만 회복했다.
2. **320px 실패 안내 왼쪽 잘림 — 해결.** 수정 전 retry 내용 상자의 x=-19.46875, width=278이었다. [수정 전 측정](browser/retry-mobile-bounds-before-fix.json)과 [수정 전 캡처](browser/english-chunk-failure-before-fix-320-dark.png)를 보존했다. 최종 x=21, width=278, right=299로 화면 안에 들어왔다. [최종 측정](browser/retry-mobile-bounds.json), [실패 안내](browser/english-chunk-failure-320-dark.png), [EN 회복](browser/english-chunk-recovered-320-dark.png)을 직접 확인했다.

두 문제의 수정 후 기존 실패/모바일·KO 요청 범위·직접 scope를 재확인하고 shared/direct 복구 사례를 추가했다. 통과한 나머지 입력 보존 흐름을 불필요하게 반복하지 않았다.

## 테스트 조건 오류와 기존 범위

- 처음에는 파일명에 EN이 들어간 Turbopack `(json, async loader)` stub를 영어 본문으로 오인했다. 이 stub를 막으면 초기 hydration 자체가 막혀 언어 메뉴가 열리지 않았다. 파일 내용에서 loader/manifest와 실제 `(json)` 본문을 분류하도록 고쳤다. **영어 데이터 0요청은 loader JavaScript까지 0이라는 뜻이 아니다.**
- 검색 combobox가 메모의 글자 크기 select와 함께 잡히던 테스트를 검색 전용 input으로 한정했다.
- 연료 초기 실시간 가격 응답이 언어 전환과 겹쳐 결과가 달라졌으므로 가격 API를 고정 fixture로 분리했다. 달리기의 JSON 객체 literal 본문을 JSON.parse만 찾던 분류에서 누락한 테스트도 수정한 뒤 통과했다. 실제 외부 유가의 정확성 검증은 아니다.
- InstallPrompt는 현재 layout에 mount되지 않는 기존 컴포넌트다. 이벤트를 발생시켜도 표시되지 않아 제품을 새로 연결하지 않고 표시 검증을 제외했으며 12개 통과 수에 포함하지 않았다. 독립 담당이 확인한 범위는 pwa KO/raw parity와 pwa/common hook·close 키 정적 검사다. 실제 컴포넌트 mount/event 표시·앱 설치를 검증했다고 주장하지 않는다.
- 320px는 데스크톱 Chrome viewport 검증이다. 외부 폰트·광고·분석 요청은 차단했으며 실제 기기/네트워크·전체 도구 전수·KO 서버 metadata/JSON-LD의 영어화는 검증 범위가 아니다.
- 개발 화면의 Next 배지는 남지만 수집한 콘솔 오류는 의도적으로 차단한 외부 요청, 분석 기록 fetch 실패 및 주입한 번역 요청 실패로 구분했다. 해당 오류를 JS/hydration 오류로 숨기거나 제품 정상 네트워크로 계산하지 않았다.
