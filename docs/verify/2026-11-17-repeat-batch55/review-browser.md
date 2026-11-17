# 55차 실제 QR 인쇄 검증

2026-11-17. **최종 7/7 PASS**, Chrome 종료. 새 제품 결함은 없었다. 첫 실행6/7 중 기존 단일 인쇄가 새 창이라고 가정한 fixture1건을 실제 숨김 iframe 관측으로 고친 뒤 해당1개만 재실행했다. 첫 실패는 `browser/initial-single-print-fixture.json`에 보존했다. 전체 타입도 2026-11-17 10:15:57 KST 시작 검사에서 첫 실행 PASS했다.

`scripts/check-repeat-batch55-browser.mjs`는 기존 localhost3039에서 합성 QR만 사용했다. 외부 요청·Service Worker를 차단하고 실제 OS 인쇄창은 호출하지 않았다. **제품이 생성한 iframe의 HTML/CSS/PNG와 native image.decode를 관측한 뒤, 그 최종 문서 그대로 격리 페이지에 옮겨 Chrome PDF를 생성**했다. 인쇄 레이아웃을 검증 코드에서 다시 만들지 않았다. 기존 설치된 Poppler·pdf-lib·pngjs·jsQR만 사용했고 새 설치나 제품 의존성 변경은 없다.

| 흐름 | 실제 결과 |
|---|---|
| 1개 PDF | A4 **1페이지,18041 bytes**, QR1개 재인식. |
| 7개 PDF | A4 **2페이지,108521 bytes**, QR7개 모두 재인식. 한글 URL, 앞뒤 공백, 내부 탭, 동일 이름/다른 내용, HTML 문자열 이름, 긴 emoji 이름, **1000 UTF-8 bytes** 포함. |
| 30개 PDF | A4 **5페이지,335160 bytes**, 전체30개 행 순서·배치 확인. 첫/마지막 페이지12개를 재인식. 마지막 페이지 중복 채움 없음. |
| decode 오류·timeout | native decode 후 제어 거부,15초 timer를50ms로 치환한 timeout에서 print0·자기 iframe 정리. 동일7이미지 명시 retry 성공. |
| 늦은 준비 | native decode 결과만 보류. 취소는 완료 이미지7개 유지, 명시 retry 가능. 편집/언어/이탈 뒤 오래된 print0·iframe 누수0. |
| ZIP·기존 단일 인쇄 | 실제 ZIP **77917 bytes**, CRC 검증·7PNG bytes와 인쇄 이미지 완전 동일·파일명7개 고유. 오류행/부분 생성에서 인쇄 비활성·부분 결과 노출0. 기존 단일 코드의 동일 이미지12칸 반복 인쇄 유지. |
| 320px KO/EN | body/document320px·입력16px·버튼44px. Enter 인쇄 및 iframe 언어/2페이지 안내 확인. viewport 캡처 직접 확인. |

QR는 실제512×512 PNG이며 인쇄 문서의 각 그림 크기는65mm였다. 실제 Chrome PDF를300DPI로 raster한 **20개 표본**(1+7+12)을 jsQR로 읽어 fixture 원문과 정확히 대조했다. 중복 표본을 독립 사용 사례20개라고 주장하지 않는다. 본문에는 payload 평문이 없고 이름의 HTML 문자는 글자로 보이며 script 실행0. 이름48코드포인트 생략·행 번호·페이지 번호, 한글과 emoji를 PDF 첫/끝 페이지 이미지에서 직접 확인했다. 사이트 Header/메뉴/Footer는 인쇄 문서에 없다.

이 검증은 실제 PDF 렌더와 QR 재인식 근거이며 실물 프린터·종이·카메라·OS 인쇄 대화상자를 검증한 것은 아니다. 앱의 '인쇄 창을 열었어요' 상태는 print 호출 포트를 통과한 상태로만 확인했다. QR의 quiet zone은 생성 원본 그대로 사용했고 인쇄 중 재생성0을 관측했다.

JS pageerror·hydration·unhandled rejection·React caught runtime error0, 원시 번역 키0. console에는 차단한 외부 폰트/광고/동의/방문통계 오류만 있다. 개발 Issue 배지의 내부 원인을 별도로 추정하지 않았다. 제품/서버/사용자 캐시는 변경하지 않았다.

근거: [최종 결과](browser/final-results.json), [1개 PDF](browser/qr-print-1.pdf), [7개 PDF](browser/qr-print-7.pdf), [30개 PDF](browser/qr-print-30.pdf), [7개 첫 페이지](browser/qr-print-7-page-1.png), [7개 끝 페이지](browser/qr-print-7-page-2.png), [최대 원문 QR](browser/qr-print-7-1000byte-qr.png), [EN 모바일](browser/qr-print-320-en-viewport.png).

실행기와 browser-fixtures.mjs의 최종 범위 ESLint도 오류0·경고0이다.


최종 공통 타입 근거: preflight 2026-11-17T01:15:57.458Z(10:15:57 KST), 여유3.09GiB, heap2048MiB, session68215, 최종 chunk24ecd5, exit0·진단0. 모든 Chrome 종료 및 writer freeze 뒤 통합 담당이 실행했다. 53 제품 EOF 빈줄1개만 무동작 포맷 보완됐으며 실제 동작 변경이 없어 native 재실행은 하지 않았다.

