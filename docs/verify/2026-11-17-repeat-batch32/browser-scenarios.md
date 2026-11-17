# 32차 실제 브라우저 검증 계획

실행 완료: 최종 6/6 PASS, 2026-11-17 06:17:40 KST Chrome 종료. 아래 실제 수행 범위와 준비 oracle의 구분은 review-browser.md 및 browser/final-results.json을 따른다.

1. **경로·특수 own key**: native CodeMirror 입력→트리에서 dotted/nested·root/빈 키·숫자 객체키/배열·slash/tilde·quote/backslash/제어문자·한글·`__proto__` 등을 선택. 실제 표시 Pointer를 독립 RFC6901 own-property resolver로 읽어 선택 전체 JSON과 비교한다. 앱이 제공한 JSONPath는 설치 엔진으로 다시 평가해 같은 값을 찾는지 확인하고 미지원 literal은 성공처럼 복사하지 않는지 검사한다.
2. **유효한 falsy·JSON5**: false/0/null/빈 문자열/빈 container/root의 선택값과 root Pointer 빈 문자열을 구분. JSON5의 NaN/Infinity는 선택값 JSON 복사를 거부하되 Pointer는 유지. 기존 전체 formatter의 별도 직렬화 정책을 임의 변경하지 않는다.
3. **펼침·정렬·기존 쿼리**: 수정 전과 같은 `a.b`/`a.b` nested fixture의 펼침을 독립 확인. 정렬 후 own `__proto__`·constructor·배열 순서와 선택 identity 유지. 기존 JSONPath 필터 `$[?(@.price < 10)]`와 저장 검색식 불러오기/명시 실행을 실제 UI로 확인하며 저장 raw bytes·schema는 불변. 새 literal 검증의 eval:false와 기존 임의 필터를 혼동하지 않는다.
4. **긴 선택 미리보기·전체 복사**: emoji를50k 경계에 둔 긴 문자열의 모든 preview 조각을 재결합해 전체 JSON과 동일한지 확인. 실제 native clipboard는 preview가 아닌 전체 문자열. 원문 입력·선택값을 새 URL/storage에 쓰지 않는지 확인. CSV 성능을 반복 벤치마크하지 않는다.
5. **복사 경합·수동 복구**: 네 대상(output/value/pointer/path)의 하나의 최신 요청 guard를 actual UI에서 확인. native reject+legacy false→전체 readOnly·수동 select·재시도. 입력/선택/모드 변경 후 이전 rejection은 fallback0·안내0. 이미 OS에 전달한 쓰기를 되돌린다고 주장하지 않는다.
6. **320px 다크 KO/EN·키보드**: 항상 보이는 선택/복사·44px/16px·overflow0, root/빈키 구분 접근 이름·Tab/Enter·선택과 preview page를 언어/정렬에서 유지. JS/hydration/rawkey를 수집.

브라우저 전에는 `browser-oracles.mjs`의 fixture/Pointer·own-key 기대값·기존 엔진 필터를 검증 준비로만 검사한다. 제품 util을 import해 자기 결과와 비교하지 않는다. 기존3039·외부 차단·serviceWorkers block·단일 Chrome 규칙을 유지한다.
