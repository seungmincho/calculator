# 53차 실제 브라우저 검증

2026-11-17 10:00 KST. **첫 실행 8/8 PASS**, Chrome 종료. 새 제품 결함이나 fixture 수정 재실행은 없었다. 전체 타입도 2026-11-17 10:15:57 KST 시작 검사에서 첫 실행 PASS했다.

`scripts/check-repeat-batch53-browser.mjs`를 기존 localhost:3039, Chrome 한 개와 격리 문맥에서 실행했다. 외부 요청·Service Worker 차단, 합성 색상만 사용했다. 제품/서버/사용자 데이터는 변경하지 않았다. 실행기/fixture 문법·범위 ESLint 오류/경고0.

| 실제 흐름 | 확인한 결과 |
|---|---|
| raw/마지막 색 | 별도 기대값6색×5표기, CSS 배경을 대조. 3/6 HEX·공백/대소문자 원문 유지. invalid8종은 마지막 색 유지, native paste `#12345678`도 잘리지 않음. |
| 색상 조절 | 실제 color input 값, preset20개, RGB/HSL6축, 제어 난수의 검정·흰색 끝값. 입력/결과 canonical 일치. |
| URL·popstate | 실제 새 탭 복원. 무관 중복 query/hash/history.state 보존. hash/무관 query는 invalid draft 유지, 소유 color 변경은 복원. 잘못된/중복 query 보존·안내, color 없음은 기본값. 실제 back 탐색 포함. |
| 초기 편집·writer 실패 | named restore callback만 보류. 초기 valid/invalid 편집 모두 우선, ready 전 copy 차단. 제어 history 실패에도 현재 색을 유지하고 실제 공유 Clipboard는 현재 canonical URL 사용. |
| 5표기 복사 | 실제 Clipboard5개 정확. API 없음/legacy false·거부/throw는 전체 복구. 전체 선택, 제어 legacy true 재시도 성공. |
| 교차 출력·ABA | 직접 copy↔공유 copy 양방향 늦은 fallback0. 실제 native PNG encode 완료를 보류한 뒤 다른 출력으로 바꾸면 늦은 download0. 입력/언어 ABA·이탈 후 옛 안내0. |
| 실제 PNG | **1080×1350,120603 bytes**. PNG를 디코딩하고 직접 열어 #FF0000 및 RGB/HSL/HSV/CMYK를 확인. invalid draft는 PNG/URL/storage에 없음. |
| 320px KO/EN | body/document320px, 입력16px·버튼/preset44px, preset5열, Enter 전체 선택·모바일 결과 앵커 통과. 두 캡처 직접 확인. |

실제 이미지 생성·파일 다운로드·Clipboard는 native다. 오류/지연/history실패/난수는 제어 포트이며 OS 색 선택 대화상자나 디스플레이 색 교정·실물 CMYK 인쇄 검증을 주장하지 않는다. 공유 이미지의 브랜드 파란 배경은 기존 공용 카드이며 표시한 색의 swatch로 해석하지 않았다.

모든 흐름 JS pageerror·hydration·unhandled rejection·React caught error0, 원시 번역 키0. 외부 폰트/광고/동의/방문통계 차단 console은 예상 기록이다. 개발 Issue 배지의 내부 원인은 확정하지 않았으며 긴 element 캡처의 고정 Header/하단 메뉴 겹침과 실제 가로 overflow를 구분했다.

근거: [최종 결과](browser/final-results.json), [실제 PNG](browser/color-current-native.png), [KO](browser/color-converter-320-ko-panel.png), [EN](browser/color-converter-320-en-panel.png).


최종 공통 타입 근거: preflight 2026-11-17T01:15:57.458Z(10:15:57 KST), 여유3.09GiB, heap2048MiB, session68215, 최종 chunk24ecd5, exit0·진단0. 모든 Chrome 종료 및 writer freeze 뒤 통합 담당이 실행했다. 53 제품 EOF 빈줄1개만 무동작 포맷 보완됐으며 실제 동작 변경이 없어 native 재실행은 하지 않았다.

