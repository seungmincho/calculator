# 54차 실제 타자 복습 검증

2026-11-17 10:14 KST. **최종 7/7 PASS**, Chrome 종료. 새 제품 결함은 없었다. 전체 타입도 2026-11-17 10:15:57 KST 시작 검사에서 첫 실행 PASS했다.

기존 localhost3039에서 Chrome 한 개와 격리 문맥·합성 원고/기록을 사용했다. Service Worker·외부 요청은 차단했다. 실제 영어 키보드·DOM focus·Clipboard와 합성 composition/clock 포트를 구분했다. 제품/서버/사용자 기록은 변경하지 않았다.

| 흐름 | 실제 결과 |
|---|---|
| 고친 영어 오타 | native key로 X→Backspace→`alpha beta gamma` 완료. 이미 고친 `alpha`도 후보로 남고 명시 시작 후 exact target으로 완료. 원고/초안/원 결과/두 기록 bytes·URL 불변. |
| 공백·페이지·1자 | 목표 공백을 틀리면 `one two` 문맥 그대로. 같은 단어25개는 서로 다른 위치 후보로 유지되고20+5개 페이지. 1글자 구간 `a` 재연습 가능, 기존 내 글 최소10자 변경 없음. |
| 기본4모드 기록 | short44자/long176자/daily23자/time1373자 원고에서 기존 완료는 각1회 기록. 선택한3/4/5/4자 복습 완료·재시도·닫기는 기록0회·원 결과 유지. 시간제는 clock 포트로 경과시켰음. |
| 시간제 IME 경계 | 확정된 첫 오타만 후보. 아직 입력하지 않은 suffix와 timeout 때 조합 중인 문자열은 후보에 추가되지 않음. 확정 오타 없이 조합만 한 경우 후보0. |
| IME·입력 차단 | 합성 composition의 마지막 한글 prefix 확정 오타, 정상 완성, 중복 end 결과1회. 조합 중 Escape229 무간섭. 실제 Clipboard paste 차단·합성 drop 차단, 일반 Esc는 복습만 닫음. |
| owner·타이머 | 초안/앱 언어 변경은 진행 중 target/입력 유지. 새 원고/모드 이탈/새 origin은 기존 복습을 정리. 관측200ms 타이머 최대1, 옛 DOM handler·정리된 interval을 제어 호출해도 새 입력 변동0. |
| 320px KO/EN | body/document320px·입력16px·버튼44px, radio Space→시작 Enter→DOM focus. 원 결과의 실제 요약 Clipboard에 원고/복습 target 없음. 두 viewport를 직접 열어 확인. |

첫 실행5/7의 실패2개는 fixture 가정이었다. 목표 길이의 오타 입력도 정상 완료되므로 비활성 입력을 다시 fill하려던 helper를 완료 여부에 따라 분기했다. 또한 기본 결과 컨테이너 안에 복습 자식이 있으므로 원 결과 비교에서 그 자식만 제외했다. 두 수정은 검증 파일만 바꿨고 해당2흐름만 다시 실행해 통과했다. 초기 evidence는 `initial-completed-input-fixture.json`과 `initial-result-scope-fixture.json`에 보존했다.

실제 OS/mobile 한글 입력기, 사용자의 기록, 학습 효과를 검증한 것은 아니다. 합성 IME와 Date.now/performance 오프셋·옛 callback 호출은 상태 경계 검증용이다. 모든 속도 수치를 현실의 타자 실력이나 성능 수치로 해석하지 않는다.

JS pageerror·hydration·unhandled rejection·React caught runtime error0, 원시 번역 키0. 차단한 폰트/광고/동의/방문통계 console 오류는 예상 기록이며 개발 Issue 배지의 내부 원인을 추정하지 않았다. 캡처의 고정 Header/하단 메뉴와 실제320px 폭 검증을 구분했다.

근거: [최종 결과](browser/final-results.json), [KO viewport](browser/typing-review-320-ko-viewport.png), [EN viewport](browser/typing-review-320-en-viewport.png), [실행기](../../../scripts/check-repeat-batch54-browser.mjs).

실행기와 browser-fixtures.mjs 최종 범위 ESLint 오류0·경고0. 초기 unused helper 경고1은 검증 파일에서 제거한 뒤 재확인했다.


최종 공통 타입 근거: preflight 2026-11-17T01:15:57.458Z(10:15:57 KST), 여유3.09GiB, heap2048MiB, session68215, 최종 chunk24ecd5, exit0·진단0. 모든 Chrome 종료 및 writer freeze 뒤 통합 담당이 실행했다. 53 제품 EOF 빈줄1개만 무동작 포맷 보완됐으며 실제 동작 변경이 없어 native 재실행은 하지 않았다.

