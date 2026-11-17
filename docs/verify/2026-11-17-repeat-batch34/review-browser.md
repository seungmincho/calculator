# 34차 숫자 입력·복사 복구 native 검증

최종 **7/7 PASS**, 제품 결함 요청 0건. 2026-11-17 **06:39:36 KST** Chrome 종료. 기존 localhost:3039를 재사용했고 단일 Chrome/격리 context/serviceWorkers:block/외부 요청 차단을 적용했다. 실제 사용자 원문을 사용하지 않았다. 실행기 `scripts/check-repeat-batch34-browser.mjs`, [결과](browser/final-results.json).

| 흐름 | 실제 확인 |
| --- | --- |
| caret·blur·기존 계산 | native 삽입 `1000000→10090000` caret4, Backspace 원복 caret3, 범위 치환 `188000` caret3. 편집 중 raw 유지, blur 뒤 `188,000`. 미완성 부호/끝점/소수뒤0/한글 원문 유지. 자동 focus 없음.20자리 숫자 링크 정확성, 음수 소수 읽기/금액서식 차단, 기존 quick 음수 기준 및20자리 초과 no-op |
| 합성 IME | composition 중 raw/URL 유지와 quick/clear/copy 차단. 종료 뒤 한글 일억→100000000 URL, blur→종료→마지막 input의 최신12345만 `12,345`로 정리. 재초점 뒤 새98765는 이전 예약에 덮이지 않음 |
| URL·빈 입력 | n 없는 예시는 표시하되 주소에 자동 쓰지 않음. 명시 비우기→n=→새로고침 빈칸 유지. 무효 query 원문은 첫 읽기에서 보존. 2^53 초과9007199254740993의 현재 링크 정확, unrelated query/hash/history.state 유지, 실제0과 빈칸 구분 |
| 단일 복구·세대 | native reject+legacy false/부재+throw, 전체 readOnly·선택 예외 안내→실제 선택/focus·native 재시도·닫기. 접두사/띄어쓰기 뒤 이전 실패 fallback0, 이전2초 timer가 새 안내를 지우지 않음. legacy true는 제어 포트로 별도 확인 |
| 단일·일괄 공통 소유권 | 단일 pending→일괄 native 성공→과거 실패, 일괄 pending→현재 링크 native 성공→과거 실패에서 최신 Clipboard/안내 유지. 실제 SPA unmount 뒤 과거 fallback0 |
| 100행 실제 파일 | 100물리행 중 내부 빈행1개를 제외한99행과 헤더,7열. native TSV와 실제 CSV를 독립 reader로 파싱한 결과 전체 동일. CSV7,424바이트·UTF-8 BOM·`number-to-korean-batch.csv`. 원래 줄번호/순서/원문 TAB·따옴표·수식 라벨·20자리/음수·오류3종/0 모두 보존.101행은 부분 결과 없이 반출 차단 |
| 320px 다크 KO/EN | viewport/body/document 모두320px, 대상 입력 최소16px/버튼 최소44px. 일괄 표는 client252px 안에서900px 내부 스크롤. 언어 전환에서 입력 유지·과거 복구 제거, 새 영어 전체 복구 정상 |

첫 실행6개는 통과했고 모바일 마지막 선택자는 이름이 있는 복구 section도 ARIA region이 되어 2개를 찾았다. 검증기를 명시적 표 스크롤 `[role="region"]`으로 좁힌 뒤 **모바일1흐름만** 재실행해 통과했다. 제품 코드 변경은 없었다.

실제 [CSV](browser/number-100-native.csv)·[TSV](browser/number-100-native.tsv), [한국어 복구](browser/number-320-ko-panel.png)·[영어 복구](browser/number-320-en-panel.png)를 보존했다. 캡처를 직접 확인했으며 긴 안내와 버튼이 폭 안에서 줄바꿈된다. 전체 원문은 scroll 가능한 readOnly 필드에 있다.

각 흐름 JS pageerror/hydration/unhandled 오류 0, 검사 대상 원시 번역 키 0. 차단한 외부 폰트·광고·통계 및 기존 tool click fetch의 console 오류는 별도 기록했다. CSV reader의 사전 자기검사는 제품/브라우저 사례 수에 합산하지 않았다.

키보드 삽입/삭제·DOM selection·Clipboard·파일은 실제 Chrome 기능이다. composition 순서는 합성 이벤트로 제어했으며 **한국어 OS IME나 모바일 소프트 키보드 실기기 검증은 하지 않았다.** 실패/legacy true/late callback은 제어 포트이며 실제 OS 권한 허용 성공과 구분한다. 이미 OS로 전달된 쓰기의 취소를 보장하지 않는다. 범위 lint/전체 타입 검사는 각 별도 기록을 따른다.

최종 두 브라우저 실행기 범위 ESLint exit0(오류/경고0), 로컬 증거 링크 존재 확인.33의 독립 P2 수정 때문에34 전체를 반복하지 않았으며 이7개 결과를 그대로 보존했다.33 영향 검사까지 끝난06:44:02 KST에 통합 담당에게 최종 Chrome 종료/전체 타입 가능을 통지했다.
