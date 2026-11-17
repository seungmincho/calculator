# 55차 실제 브라우저 범위

Chrome 한 개·격리 문맥·기존 localhost3039·합성 QR만 사용한다. 외부 요청과 Service Worker를 차단하고 OS 인쇄창은 포트로 가로챈다. 실제 iframe의 최종 HTML/CSS/512 PNG를 그대로 별도 격리 페이지에 넣어 Chrome PDF를 생성한다. 제품 인쇄 레이아웃을 다시 구현하지 않으며 실제 종이 출력이나 프린터 드라이버 검증을 주장하지 않는다.

1. 1행 실제 생성→iframe native image.decode→A4 PDF1페이지→300DPI raster의 QR를 jsQR로 재인식한다.
2. 7행/2페이지에 한글, 공백·탭 원문, 1000 UTF-8 bytes, 같은 이름/다른 내용, HTML 이름, 48코드포인트 초과 이름을 넣고 모든7 QR와 행 순서를 대조한다.
3. 30행/5페이지의 개수·배치·첫/마지막 페이지12개 QR를 독립 재인식한다. 페이지 여백12mm·QR65mm·Footer 사이트 메뉴 제외를 확인한다.
4. 실제 decode 후 오류/대기 timeout을 주입해 print0·자기 iframe 정리·동일 이미지 재시도를 확인한다.
5. 실제 decode 완료를 보류한 상태에서 취소/편집/언어/이탈을 실행해 늦은 print0과 완료 이미지 보존 정책을 확인한다.
6. 실제 ZIP CRC와7 PNG bytes를 인쇄 이미지와 대조한다. 불량행/부분 생성에서 인쇄를 차단하고 기존 단일 QR 반복 인쇄를 유지한다.
7. 320px 다크 KO/EN에서16px·44px·가로폭·Enter 인쇄·문서 언어를 확인하고 viewport를 캡처한다.

기존 설치된 pdf-lib/pngjs/jsqr 및 Codex runtime Poppler만 사용한다. 다운로드·설치·제품 의존성 변경은 없다. 결과는 실제 실행 뒤 browser/final-results.json과 review-browser.md에 기록한다.
