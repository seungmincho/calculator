# 34차 native 검증 준비

실행 완료: 최종7/7 PASS·06:39:36 KST Chrome 종료. 모바일의 ARIA region 선택자만 좁혀 해당1흐름 재검사했으며 제품 수정은 없었다. 아래 계획의 실제 결과·합성 IME 한계는 review-browser.md를 따른다.

1. **native 편집·blur:** 가운데 삽입/Backspace/범위 치환을 실제 키 입력으로 수행하고 raw뿐 아니라 selectionStart/End를 확인한다. 편집 중 자동 쉼표/자동 focus가 없고 blur에서만 유효 숫자를 정리한다. 미완성 부호/소수점·20자리·2^53 초과·음수/소수·한글 역변환 및 기존 quick 음수/overflow 의미를 확인한다.
2. **합성 IME 이벤트:** compositionstart/input/end·blur 순서를 제어해 조합 중 raw/URL 보존, quick/clear/copy 비활성, 종료 후 최신 input만 지연 정리되는지 확인한다. 재초점/새 편집 후 옛 예약이 원문을 바꾸지 않아야 한다. 실제 한국어 OS IME나 모바일 키보드 검증으로 표현하지 않는다.
3. **URL 최초 복원·빈값:** n 없음의 고정 예시·URL 읽기만으로 n을 새로 쓰지 않음, n= 명시 빈값, 유효/무효 query 우선·무효 원문 보존을 새 context/새로고침으로 확인한다. clear→n=→새 방문은 빈칸 유지, query/hash/history.state 보존. 링크 복사는 현재 raw의 canonical 숫자이며 prefix/spacing/batch는 넣지 않는다.
4. **단일 복구:** native Clipboard 성공, reject/API부재+legacy false/throw·true, 전체 원문 선택·선택 실패/native 재시도/닫기. raw/접두사/띄어쓰기/locale 변경과 이전2초 success callback의 경합을 검사한다. 이미 OS에 전달된 쓰기를 되돌린다고 주장하지 않는다.
5. **단일↔일괄 전역 요청:** 단일 pending→batch native 성공→옛 거부, batch pending→현재 링크 성공→옛 거부에서 fallback0·현재 안내 보존. 실제 SPA unmount 후 늦은 완료도 확인한다. batch 다운로드 상태와 copy 상태를 혼동하지 않는다.
6. **실제100행 TSV/CSV:** 100물리행(내부 빈행·오류·음수·20자리·따옴표·수식 라벨 포함)을 화면에서 확인하고 native TSV/다운로드 CSV를 독립 delimited reader로 파싱한다. CSV BOM/7열/원래 줄번호/순서·오류 포함·수식방어·파일명,101행 전체 차단과 기존 옵션 반영을 확인한다. 숫자 parser를 검증기의 기대값 함수로 재사용하지 않는다.
7. **320px 다크 KO/EN:** 입력16px/주요버튼44px·복구 전체 원문·일괄 표의 내부 가로스크롤과 문서 overflow0·언어 변경 입력 보존·원시 키/JS/hydration/unhandled0. 새로고침을 제외한 locale/옵션 변경에서 예시가 재삽입되지 않아야 한다.

실제 caret/DOM/Clipboard/파일과 합성 composition·오류 포트를 보고서에서 구분한다. 기존6차의 변환 결과를 새34차 부모의 실제 검증으로 대신하지 않으며, 한도 소모용 전체 계산 조합 반복은 하지 않는다.
