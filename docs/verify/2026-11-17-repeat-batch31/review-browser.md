# 31차 독립 브라우저 검증 결과

최종 **6/6 PASS**, 제품 수정 요청 0건. 마지막 영향 실행은 2026-11-17 **06:16:27 KST**에 종료했고 Chrome을 닫았다. 기존 localhost:3039를 재사용했으며 단일 Chrome 안에서 합성 데이터·격리 context·serviceWorkers:block·외부 요청 차단으로 순차 검사했다. 실행기: `scripts/check-repeat-batch31-browser.mjs`, 세부 결과: [browser/final-results.json](browser/final-results.json).

| 실제 흐름 | 확인 결과 |
| --- | --- |
| 자동 공개·초기화 | 실제 400/500ms 예약으로 첫 공개를 관찰했다. 모두 공개 후 과거 callback 전달에도 4명 유지, 새 run/초기화 뒤 이전 callback은 공개 0명 유지. 진행 중 명단 편집 및 미완료 복사/TXT 차단 |
| 수동 공개·키보드 | Enter/Space로 한 명·전체 공개, auto/manual 전환에서 같은 run과 공개 prefix 유지. 같은 이름 2명 보존, 숨긴 카드의 DOM/data/aria에 이름 노출 0. 완료 후 복사 버튼 초점 |
| native Clipboard·TXT | 화면 순서와 native Clipboard 내용 일치. 실제 `presentation-order.txt` 77바이트, UTF-8/no BOM, 순서·줄바꿈까지 독립 기대값과 일치. 추가 입력 초안은 결과 유지, 명시 추가는 결과 초기화 |
| 복구·경합 | reject+legacy false/없음+legacy true, 수동 전체 선택, native 재시도, 닫기 후 현재 복사 버튼 초점. 이전 요청 거부가 초기화 뒤 fallback을 실행하지 않음 |
| 메뉴·룰렛 회귀 | 실제 4.2초 RAF 회전 결과가 제외된 메뉴가 아님. native 결과 복사와 실제 600×340 PNG 33,971바이트 decode. 명시 먹은 기록 저장 전 history bytes 불변, 저장 후에도 주간 계획 bytes 불변 |
| 320px 다크 KO/EN | 긴 이름·중복 이름·복구 화면, 언어 변경 후 run/순열 유지. reduced motion 사용, viewport/body/document 모두 320px. 검사 대상 입력 16px 이상·버튼 44px 이상 |

JS pageerror 및 hydration 오류는 각 흐름 0건이고 검사 대상 원시 번역 키도 없었다. console에는 차단한 외부 폰트·광고·통계 요청의 오류와 기존 tool click fetch 실패가 기록됐다. 이를 제품 JS 오류로 합산하지 않았다.

초기 실행의 네 실패는 검증기 조건을 수정한 뒤 해당 네 흐름만 재실행했다. 수동 shuffling에는 이름 없는 카드 wrapper가 존재하므로 wrapper 부재 대신 공개 카드/숨긴 이름을 확인하도록 수정했다. Windows native Clipboard가 LF를 CRLF로 반환하므로 native 텍스트 비교에서만 CRLF를 LF로 정규화했다. 다운로드 TXT는 원래 bytes 그대로 비교했다. 메뉴의 같은 이름 저장 버튼 두 개는 결과 영역의 버튼으로 좁혔다. 제품 코드는 바꾸지 않았다.

증거: [실제 TXT](browser/presentation-order-native.txt), [메뉴 PNG](browser/menu-roulette-native.png), [한국어 모바일](browser/order-320-ko-panel.png), [영어 모바일](browser/order-320-en-panel.png). 모바일 캡처를 직접 검토했으며 긴 이름이 줄바꿈된다. 긴 패널 하단에 기존 고정 내비게이션/공유 버튼이 같이 찍히는 부분은 캡처에 그대로 남겼다.

native timer·Clipboard·PNG/TXT와 의도적으로 제어한 late callback/Clipboard 실패 포트를 구분한다. 일반 도구 탭 이탈의 세부 조합은 작성자·독립 실제 부모 fixture 근거이며 단일 경로 브라우저 검사로 재집계하지 않는다. RNG의 통계적 공정성, 모든 OS 권한, 외부 폰트 로드는 검증 범위가 아니다. 실행기 범위 lint와 전체 타입 검사는 별도 통합 기록을 따른다.

검증기 정리: 세 브라우저 실행기와 32차 browser-oracles.mjs를 대상으로 실행한 범위 ESLint는 exit0(오류·경고0)이다. 보고서의 로컬 증거 링크도 모두 존재함을 확인했다.
