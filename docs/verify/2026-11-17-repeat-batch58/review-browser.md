# 58 실제 브라우저 검증

최종 **7/7 PASS**, Chrome 종료.57 최종 원고/큐와58 출력 복구가 연결된 동일 부모에서 출력 흐름만 별도 집계했다. 첫 전체 타입은10:45:23 KST preflight/3.02GiB/heap2GB/session86108/chunk7541e1 exit0·진단0이었다. 이후 아래 JSX 표시 보완이 있어 최종 재타입도 통과했다.

- 실제 OS Clipboard의 현재/전체 복사와 UTF-8 TXT를 비교했다. 한글·emoji·HTML처럼 보이는 문자열·공백·탭·개행이 보존됐다. Windows Clipboard의 CRLF는 비교 시 LF로 정규화했으며 TXT는 원래 snapshot 바이트와 직접 비교했다.
- API 없음+legacy false, API reject+legacy throw는 실패 안내와 복구로 이어졌고 거짓 성공0이었다. 실패 즉시 textarea를 중복 생성하지 않고 명시 확대 뒤 전체 readonly 원고·native selection을 제공했다. 선택 API 실패 안내와 legacy true 통제 재시도를 구분했다.
- **67,200 UTF-16단위/92,400 UTF-8bytes** 원고를 실제 Clipboard 전체선택·붙여넣기로 입력했다. 명시 확대 후 수동 원고 전체와 실제 TXT가 정확히 일치했다. 초기에 Playwright.fill이 timeout됐고, native paste 전환 첫 시도는 기존5글자를 선택하지 않아 이어 붙인 fixture 오류였다. Ctrl+A 추가 후 해당1흐름만 재확인했다. 이를 제품 대용량 성능 결함으로 세지 않았으며 원래 fill timeout의 브라우저 내부 원인은 단정하지 않는다.
- 현재↔전체 복사 양방향과 TXT 요청 뒤 오래된 거부가 fallback/성공을 덮지 않았다. 원고/이미지선택/locale ABA와 unmount도 늦은 안내·fallback0이었다. 이미 OS에 넘긴 clipboard 쓰기 자체를 취소했다고 주장하지 않는다.
- 다운로드 URL/anchor 실패 시 원고와 자기 자원 정리를 확인하고 실제 TXT 재시도에 성공했다. 실제 TTS 이동에서 최신 원고를 일회 소비하고 자동 speak 호출0이었다.
- 320px dark KO/EN에서 원고/복구16px·주요 동작44px·Enter 복사/전체선택과 줄바꿈·가로 overflow0을 확인했다. 두 캡처를 직접 검토했다.

OCR 입력은57과 같은 통제 Worker 프로토콜로 공급했다. 실제 모델·인식 정확도·실제 음성 합성 검증이 아니며 모델 다운로드0·실제 음성0·실사용 데이터 접근0이다. 최종 JS/hydration/unhandled/React caught 오류0·원시 키0, 예상 외부 차단 오류는 별도 수집했다. Next Issue 배지 내부 원인이나 고정 Header/하단 메뉴 캡처를 제품 overflow로 추정하지 않았다.

근거: [최종 결과](browser/final-results.json), [큰 원고 실제 TXT](browser/ocr-large-output.txt), [KO](browser/ocr-copy-320-ko-viewport.png), [EN](browser/ocr-copy-320-en-viewport.png), [실행기](../../../scripts/check-repeat-batch58-browser.mjs). 초기 fill/paste fixture JSON은 browser에 보존했다.56/57/58 실행기·fixture 총6파일 최종 범위 lint 오류0·경고0(사용하지 않는 검증 helper만 제거).

최종 시각 검토에서 부모 상태문구와 복구 alert가 같은 실패 안내를 중복 표시한 UX 문제를 root가 발견했다. 실패 시 부모 문구를 생략하고 child alert와 data 상태를 유지하는 JSX 보완 뒤 **320 KO/EN 기존1흐름만** 재실행했다. 동일 안내가 각 언어 정확1개이고 복구/선택/크기/가로폭 검사를 통과했으며 캡처를 갱신·직접 검토했다. 나머지6개/다른 배치를 반복하거나 새 통과 그룹으로 더하지 않았다.


최종 공통 타입: 2026-11-17 10:51:00 KST preflight, 여유2.87GiB, heap2GB, chunk f3e9de,9.349초, exit0·진단0(기록10:51:25).58 JSX 보완 뒤 기존부모6/모바일native1/범위lint0·Chrome 종료와 writer freeze를 확인한 후 통합 담당이 실행했다. 첫 session86108 PASS도 별도 first-result로 보존했다.
