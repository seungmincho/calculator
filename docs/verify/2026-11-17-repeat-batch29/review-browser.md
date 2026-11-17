# 29차 팀 편성 이력·반출 브라우저 검증

**7/7 첫 실행 PASS**, 2026-11-17 **05:26:03 KST**. 제품 추가 결함0, JS pageerror·hydration·unhandled rejection·원시 번역 키0. 단일 Chrome을 닫고 통합 담당에게 전체 타입 검사 가능 신호를 전달했다.

기존 localhost3039, 독립 합성 명단 컨텍스트, service worker 차단, 외부 요청 차단으로 실행했다. 제품 TypeScript·기존 dev 서버·git·빌드·전체 타입 검사는 변경/실행하지 않았다. CSV 성능 후속은 `../2026-11-17-repeat-batch26/performance/review-browser.md`의8개 결과로 분리하며 원래26차와 Base64는 재검사하지 않았다.

| 흐름 | 실제 확인 |
|---|---|
| 드래그·교환·고정·회전 | 첫 방문에서6명 편성 성공. 실제 HTML dragTo로 팀 이동, 두 사람 선택으로 교환, 고정 및 회전을 undo/redo로 정확히 복원. 독립 동료 pair 계산과 화면 반복2쌍 일치. 회전 메타·고정 팀 위치 보존 |
| 키보드 초점 | undo Enter→이력 소진 시 redo에 초점, Space redo→undo에 초점. 복원은 즉시 확정 보드이며 재추첨하지 않음 |
| 20개 이력·분기 | 실제 고정22회 뒤20개 한도, undo20/redo20 전이. 선택 후 같은 사람 재선택 no-op은 future 유지. 현재 실력과 다음 random 선택은 history 밖에 유지하고 결과 balanced 방식은 그대로. 실제 새 고정은 future 폐기 |
| 참석·명단·공유 | 불참 체크 시 편성/이력 초기화, 저장 명단6명 보존·참석자5명만 편성. 저장본 불러오기는 전원 참석/빈 이력으로 복원. 실제 공유 링크 새 탭은 확정 편성/빈 past·future로 시작. 팀 수3 변경도 초기화 |
| 공개·주장 | 실제80ms interval의 callback을 보류/캡처. 옛 tick/skip은 새 공개 timer를 멈추지 않으며 현재 callback만 완료. undo/redo 즉시 표시. 주장 진행에서 옛 pick 재호출은 중복 선택0,6명 완료는 captain mode의 빈 이력 seed |
| native 복사·TXT | 현재 balanced 팀/실력 독립 문자열과 실제 OS Clipboard 일치. 실제 다운로드159바이트 UTF-8/noBOM·고정 team-divider.txt·전체 내용 동일. 옛 성공 timer가 새 성공을 지우지 않음. 반출로 이름이 URL/저장소/요청/콘솔에 추가되지 않음 |
| 복구·늦은 응답 | Clipboard 거부/없음+legacy false는 실패·readonly 전체 선택 제공. 제어 legacy true는 성공. 고정/undo/실력/언어 변경 뒤 옛 거부는 fallback0·옛 복구0·허위 성공0. 닫기 후 편성 유지 |
| 320px 다크 KO/EN | body/document320px, 가로 overflow0, 입력16px·주요 버튼44px. 이름 input의 실제 Ctrl+Z는 이름만 복원하고 future 유지. 언어 전환 후 원고/보드/이력 유지, Space redo 동작 |

위 표의 세부 확인은7개의 실행 흐름 안에 포함됐으며 별도 테스트 수로 중복 집계하지 않았다. 첫 일반 편성과 공유 URL 후 편집·복사 모두 실제 Next 개발 StrictMode 환경에서 동작했다. 작성 단계의 StrictMode epoch 수정 전 실패는 독립 부모 보고서에 있고, 이 브라우저 실행에서는 재현되지 않았다.

`browser/team-history-320-dark-ko-panel.png`, `team-history-320-dark-en-panel.png`와 각각 `-top.png`를 저장하고 KO/EN 패널을 직접 시각 확인했다. 긴 element 캡처에 fixed header/하단 탐색이 중간에 보이는 부분은 캡처 방식의 흔적이며 실제 문서 overflow 판정과 구분했다. 개발 Next Issue 배지를 제품 JS 오류로 집계하지 않았다.

오래된 callback/Clipboard 거부·legacy true는 명시 제어 fixture다. 실제 native Clipboard 성공과 TXT 파일 바이트 검증은 별도 수행했다. compositionstart/end는 합성 이벤트이며 실제 OS 한글 IME 검증을 주장하지 않는다. 원래 공유 링크에는 이름과 실력이 포함되며, 개인정보 비저장은 새 copy/TXT 동작의 추가 저장·전송에 한정한다. 차단한 광고·폰트·방문 통계 요청의 console 오류는 네트워크 정책에 따른 항목이다.

실행기: `scripts/check-repeat-batch29-browser.mjs`. 최종 실행 시각·개별 근거는 `browser/final-results.json`, 실제 파일은 `browser/team-balanced-native.txt`. 확대 순수/부모 검토는 작성자·독립 담당 보고서로 분리하며 전체 tsc 결과는 통합 보고서에서 확인한다.
