# JSONPath 표현식 생성 전 설치 엔진 확인

2026-11-17 KST. 제품 변경 없이 설치된 `jsonpath-plus`10.3.0의 Node ESM API를 읽고 실행했다. 현재 화면의 브라우저 재현 또는32차 제품 구현 완료를 뜻하지 않는다.

후보 구현에서 `$[` + `JSON.stringify(key)` + `]`만 만들면 모든 객체 키를 안전하게 표현할 것이라는 가정을 확인했다. 각 입력은 own key에 `target`, 별도의 `decoy` 키에 `other`를 둔 객체이며 `JSONPath({path,json,eval:false,wrap:true})`로 실행했다.

| key | 설치 엔진의 결과 |
| --- | --- |
| `a.b`, 빈 문자열, `0`, `a/b`, `a~b`, `한글` | target1개 |
| 큰따옴표 포함, 작은따옴표 포함, 역슬래시 포함 | 빈 배열 |
| `x]y`, `x[y`, 실제 개행 포함 | 빈 배열 |
| `*` | target와other 모두 선택 |
| `..` | target값 대신 전체 루트 객체 선택 |

이는14개 합성 키의 실제 Node 결과다. 라이브러리의 모든 문법을 검증하거나 JSONPath 표준 전체의 지원 여부를 판정하지 않는다. 설치 소스 `src/jsonpath.js`의 `toPathArray`는 정규식 정규화와 경계 분리를 사용하고, README는 backtick escape도 설명한다. 따라서 자동 생성 표현식의 검증 없이 `JSON.stringify` 또는 `toPathString` 호출만으로 ‘정확한 경로’라고 표시해서는 안 된다.

32차 구현은 typed segment와 own-property resolver를 정본으로 삼는다. JSON Pointer와 값 JSON은 이 엔진의 문자열 파싱에 의존하지 않는다. JSONPath는 지원되는 literal escape를 조사하고, 불가능한 키에는 지원 불가를 안내하며 Pointer/값 복사는 유지한다. 특히 wildcard가 우연히 하나의 값만 반환하는 문서에서 통과했다고 일반적인 literal 표현식으로 인정하지 않는다. 생성 문법과 독립 경로 identity를 함께 확인하고 `eval:false`를 유지한다. 표준식처럼 보이는 문자열을 틀린 선택 결과와 함께 성공 표시하지 않는다.

이 조사는 신규 패키지나 엔진 교체의 승인이 아니다. 기존 저장 JSONPath의 형식/실행을 이 작업에서 임의 변경하지 않는다.
