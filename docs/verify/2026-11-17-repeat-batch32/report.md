# 32차 완료 — JSON 선택값·정확한 경로·복사 복구

2026-11-17 KST. 기존 /json-formatter/의 선택값과 경로, 복사 실패 복구를 로컬 검증까지 완료했다. **작성자24그룹·독립12그룹·실제 Chrome6/6·최종 전체 타입 PASS**다. [계약](plan.md) · [통합 검사](integration-checks.json). 새 경로·패키지는 없고 배포하지 않았다.

객체 key와 배열 index를 구분한 경로로 펼침/선택을 관리한다. 점이 포함된 키와 중첩 키·빈 키·숫자 객체 키·루트를 구분하며 선택값 JSON·RFC6901 Pointer·설치 엔진에서 확인된 literal JSONPath를 명시 복사한다. 미지원 경로는 성공처럼 표시하지 않는다. 선택값은50,000 UTF-16 단위 구간으로 미리 보고 복사/수동 복구는 전체 원문을 사용한다. 입력/선택/설정/모드/이탈 뒤 늦은 복사·검증 결과를 막는다.

정렬은 own __proto__를 보존하고 키 빈도는 Map으로 계산한다. 새 선택 subtree에 NaN/Infinity가 있으면 null로 바꾸지 않고 값 복사 불가를 안내한다. 경로와 유효 sibling은 사용할 수 있다. 기존 일반 format/minify/JSON5 전체 출력의 JSON.stringify 동작, 임의 JSONPath/저장 필터 API·12개 schema는 유지한다. 새 literal 확인만 eval:false를 적용한다.

## 구현 및 독립 검토

[작성자 보고서](json-tree-implementation.md): 준비 순수10+child4, 실제 부모8+수정 전 동일 baseline2 =24그룹, 기존 저장 JSONPath8그룹은 별도 회귀다. 제품/검사10파일 lint 오류·경고0이다. 같은 tree 모드 재선택은 no-op이며 parse 대기 동안 과거 선택을 사용하지 않는다.

[독립 검토](json-tree-independent-review.md): 최초11+늦은 literal import 영향1 =12그룹 PASS·검사 JS lint0. 이전 통과11그룹을 반복하지 않았다. Pointer/typed identity/엔진의 own parent·property·value/특수 키 정렬·통계/falsy·전체 복사·기존 filter를 별도 기대값으로 확인했고 미해결 제품 결함0이다.

## 실제 브라우저

[최종 리뷰](review-browser.md) · [결과 JSON](browser/final-results.json): **6/6 PASS**, 06:17:40 KST, Chrome 종료. JS pageerror·hydration·원시 키0이다.

16개 root·dotted/nested·빈 키·숫자/배열·slash/tilde·따옴표/역슬래시/개행·한글·특수 own key를 실제 선택하고 독립 Pointer resolver 및 설치 JSONPath 엔진으로 재평가했다. 이16개가 모두 지원된 결과이며 모든 literal 전수 검증을 뜻하지 않는다. falsy/빈 root와 native 빈 Pointer 복사, JSON5 nonfinite 대상별 제한, sorted own key의 실제 JSON 다운로드를 확인했다.

원문100,016/선택 JSON100,007 UTF-16 단위를 세 미리보기 구간으로 재결합해 전체 값과 일치했고 native Clipboard/수동 복구도 전체 원문이다. 기존 저장 filter의 price5 결과와 저장 raw bytes 불변, 과거 copy fallback0·잘못된 입력 즉시 선택 무효화,320px KO/EN·16px 입력·44px 조작·키보드 선택·신규 전송/저장0을 통과했다.

초기5개는 통과했고 기존 preset1개는 Web Lock 완료 전 query를 읽은 검증기 조건을 bounded poll로 바꾼 뒤 해당 흐름만 통과했다. 제품 수정은 없었다. 실제 CodeMirror/Clipboard/파일과 실패·지연 포트를 구분한다. 별도 성능 벤치마크·모든 JSONPath 문법·이미 OS에 전달된 쓰기 취소를 보장하지 않는다.

## 공용 통합·타입

ko/en47leaf(작성자38+공용가이드9), 정적160사용·오류0. 생성/check1,578파일, apply0, audit own540+child6/미해결0(기존 동적 알림60)이다. 메타 description/OG/Twitter/JSON-LD·FAQ·가이드는 선택 후 명시 복사, 지원 확인,50k 구간/전체 복사와 nonfinite 제한을 구분한다. menu updatedDate2026-11-17, 공용5파일 lint0, 발견 파일 redirects472/RSS382/llms315·45,644바이트다.

31/32/38 공통 타입 첫 시도는 미연결34 준비 파일 TS2774 1건이었다. 해당 함수 검사 표현1줄·copy14/기본 API 포트/lint 보완 후 모든 writer 재고정과 Chrome 종료 상태에서 **06:24:34 KST, 여유4.36GiB, node --max-old-space-size=2048 node_modules/typescript/bin/tsc --noEmit 재검사 exit0**이다. 같은 실행의 [38차 기록](../2026-11-17-repeat-batch38/integration-checks.json)을 따른다. 타입 보완 때문에 현재 브라우저를 반복하지 않았다.

원문 숫자 표기·중복 키·Number 파싱에서 이미 잃은 정밀도 복원, 트리 가상화, 파일/URL 읽기 전체 재설계는 범위 밖이다. 현재 제품/공용 diff·문서 링크 검사는 통합 기록에 남긴다. 저장소 전체 lint·운영 정적 export 통과를 주장하지 않으며 빌드·배포·dev 재시작·커밋·푸시는 실행하지 않았다.
