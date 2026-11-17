# 31차 실제 브라우저 검증 계획

실행 완료: 최종 6/6 PASS, 2026-11-17 06:16:27 KST Chrome 종료. 아래 항목은 실제 수행한 범위이며 상세 결과·검증기 수정·한계는 review-browser.md와 browser/final-results.json에 기록했다.

1. **자동 공개·늦은 callback**: 실제 native400/500ms 공개를 한 명 이상 관찰하고 모두 공개→이전 callback 강제 전달 후 공개 수가 감소하지 않는지 확인. 초기화→새 추첨→이전 callback에서도 새 공개0 유지. 진행 중 추가/삭제/Enter 잠금과 공개 전 copy/TXT 부재를 확인한다. 실제 native 예약을 관찰한 증거와 고의 late callback 주입을 구분한다.
2. **수동·키보드·모드 전환**: URL의 중복 포함 합성 명단으로 명시 draw1회→Enter/Space 다음 한 명→auto/manual 전환→모두 공개. 같은 run과 이미 공개한 prefix가 유지되고 전체 결과 multiset은 최초 명단과 같다. 숨긴 이름은 결과 카드의 DOM/data/aria에 노출되지 않아야 한다. 완료 뒤 mode 변경은 순열을 보존하고 focus가 유효한 조작으로 이동한다.
3. **native Clipboard·TXT**: 완전 공개한 화면 순서를 독립 수집해 native clipboard와 실제 UTF-8/no BOM `presentation-order.txt` bytes가 같은지 비교한다. 미확정 추가 입력은 결과 보존, 명시 추가는 무효화. 기존 comma URL 명단은 보존하되 공개 모드·결과·반출 내용의 새 storage 전송은 없어야 한다.
4. **복구·stale**: Clipboard reject/없음+legacy false→전체 원문 선택/재시도/닫기, legacy true의 성공. 이전 요청 거부/성공 타이머가 새 결과·명단 변경·새 복사 뒤 fallback/안내를 바꾸지 않는지 확인한다. native 성공과 fake 실패 포트는 구분한다.
5. **메뉴·룰렛 영향 회귀**: `toolhub-meals-v1`과 `toolhub:meal-plan`에 합성 기록을 넣고 제외 후보·기존 계획 UI/원문 bytes를 보존한다. 실제4.2초 RAF spin→선택 결과가 제외 항목이 아님→기존600×340 PNG 실제 decode·native 결과 복사. 명시 먹은 기록 추가만 새 기록을 만들고 기존 주간 계획은 변하지 않는다. 기존 명시 참가자 URL을 새 개인정보 비저장으로 오해하지 않는다.
6. **320px KO/EN·reduced motion**: 긴 합성 이름/수동 공개·복구 원문·키보드 focus·16px 입력/44px 조작·overflow0. 언어 변경은 run/순열/공개 수를 보존. 네트워크 차단/JS·hydration·raw key 오류 수집.

single 페이지의 숨겨진 도구 탭 전환은 실제 부모 fixture 담당 근거와 구분한다. 제품 RNG의 통계적 공정성이나 모든 OS Clipboard 권한을 이6흐름으로 보장하지 않는다. 개인 명단/원격 RPC·사용자 데이터는 사용하지 않으며 기존3039·한 Chrome·context 격리를 유지한다.
