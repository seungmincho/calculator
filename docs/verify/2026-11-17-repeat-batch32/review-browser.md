# 32차 독립 브라우저 검증 결과

최종 **6/6 PASS**, 추가 제품 결함 0건. 마지막 영향 실행 2026-11-17 **06:17:40 KST**, Chrome 종료 확인. 기존 localhost:3039·단일 Chrome·격리 context·외부 요청/service worker 차단으로 실제 CodeMirror와 UI를 조작했다. 실행기 `scripts/check-repeat-batch32-browser.mjs`, 결과 [browser/final-results.json](browser/final-results.json).

| 실제 흐름 | 확인 결과 |
| --- | --- |
| Pointer·경로·특수 키 | root, dotted/nested, 빈 키, 숫자 객체키/배열 index, slash/tilde, quote/backslash/개행, 한글, `__proto__`, constructor, toString, `*`, 필터처럼 보이는 literal까지 16개 선택. 표시 Pointer를 독립 own-property resolver로 읽어 선택 JSON과 비교. 실제 표시 JSONPath 16개는 설치 엔진으로 재평가해 같은 값 확인 |
| falsy·JSON5 | false/0/null/빈 문자열/빈 객체/빈 배열 root 모두 정상. root Pointer의 빈 문자열을 native 복사. NaN/Infinity 포함 subtree 값 복사는 차단하지만 Pointer와 유효한 sibling은 유지 |
| 펼침·정렬·기존 필터 | literal `a.b`와 nested `a`→`b` 펼침 상태 분리. 정렬 뒤 선택 identity와 own `__proto__` 보존. 실제 JSON 다운로드를 독립 parse. 저장한 기존 `$[?(@.price < 10)]`를 불러와 명시 실행하면 price5 항목만 반환, preset 원문 bytes 불변 |
| 큰 선택·전체 복사 | 원문 100,016 UTF-16 단위, 선택 JSON 100,007 단위. 미리보기 범위 0–49,999 / 49,999–100,000 / 100,000–100,007을 재결합하면 원문 선택값과 정확히 일치. native Clipboard와 수동 복구는 전체 값 |
| 복구·이전 응답 | reject+legacy false, 수동 전체 선택/native 재시도. 선택/입력/모드 변경 이후 과거 요청 거부 fallback 0. 잘못된 JSON 입력의 parse 대기 중에도 과거 선택을 즉시 무효화 |
| 320px 다크 KO/EN | 키보드 Enter 선택, 언어 전환 후 선택 identity 유지. viewport/body/document 320px, 대상 입력 최소16px·버튼 최소44px. 합성 원문/선택값 신규 storage·URL·외부 payload 전송 0 |

선행 [browser-oracles.mjs](browser-oracles.mjs)는 제품 util을 가져오지 않고 Pointer/own-key 기대값과 설치 엔진의 기존 필터를 검증한 준비 증거다. 제품 검사 또는 위 6개 실제 흐름에 추가 집계하지 않는다. 이번 16개 literal은 모두 실제 엔진에서 지원됐다. 미지원 literal의 모든 경우를 브라우저로 전수 확인했다고 주장하지 않는다.

초기 실행 5개는 바로 통과했고 기존 preset 흐름 1개는 native Web Lock 완료 직후가 아닌 클릭 직후 query를 읽어 검증기가 실패했다. 실제 query가 갱신되는 조건을 bounded poll로 기다린 뒤 해당 흐름만 재실행해 통과했다. 제품 수정은 없었다.

각 흐름 JS pageerror/hydration 오류 0, 검사 대상 원시 키 0. 외부 요청 차단으로 발생한 resource/tool click fetch console 오류는 별도 보존했다. [한국어 모바일](browser/json-tree-320-ko-panel.png)·[영어 모바일](browser/json-tree-320-en-panel.png)를 직접 확인했다. [특수 own key JSON](browser/special-own-keys-native.json)은 실제 다운로드 증거다.

native Clipboard·CodeMirror·실제 파일과 실패/늦은 응답 주입을 구분한다. native 입력·파일 검사이며 별도 성능 벤치마크나 모든 JSONPath 문법 검증은 아니다. 이미 OS에 전달된 Clipboard 쓰기를 취소할 수 있다고 주장하지 않는다. 전체 타입 검사는 Chrome 종료 뒤 통합 담당이 별도로 수행한다.

검증기 정리: 세 브라우저 실행기와 32차 browser-oracles.mjs를 대상으로 실행한 범위 ESLint는 exit0(오류·경고0)이다. 보고서의 로컬 증거 링크도 모두 존재함을 확인했다.
