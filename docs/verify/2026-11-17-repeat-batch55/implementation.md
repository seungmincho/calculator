# 55차 QR 묶음 인쇄 구현

제품 연결·검증 완료. 자체 순수/컨트롤러8개+실제 부모7개=15그룹 PASS, 소유 제품/검사6파일 ESLint0·경고0, taxi 독립8그룹·lint0, native7/7을 확인했다. 10:15:57 KST 공통 전체 타입(session68215/chunk24ecd5)도 첫 실행 exit0·진단0이었다. `QrGenerator`의 기존 단일 코드 반복 인쇄는 수정하지 않았다.

- `qrBatchPrint.ts`: 입력을 다시 파싱해 결과의 전체 행/순서/라벨/원문/bytes/filename 일치를 확인하고 PNG data URL만 캡처한다. 1~30개, 6개씩 최대5페이지다. 각 label은 코드포인트48개 뒤 생략표시하며 QR payload는 HTML에 넣지 않는다. factory 발급·동결된 snapshot만 standalone HTML로 변환한다. HTML 문자는 escape한다.
- A4 세로 여백12mm, 186×272mm 페이지, 2×3칸(90×86mm), QR65mm, 이름9pt, 행 번호8pt를 사용한다. 그림65mm에는 원래 512 PNG의 quiet zone4모듈이 포함된다. native Chrome PDF에서1/7/30개가1/2/5페이지로 나오는 것을 확인했고,300DPI raster의QR표본20개를jsQR로 다시 읽어 원문과 대조했다. 실물 프린터 시험을 주장하지 않는다.
- `qrBatchPrintJob.ts`: 자기 iframe만 생성해 모든 이미지를 decode하고512×512인지 확인한 뒤 print를 호출한다. decode15초 timeout, cancel settle, current-owner 재확인, afterprint·120초 fallback·실패·이탈 cleanup을 소유한다. popup/외부 자원/실제 인쇄 서비스 업로드 없음.
- `QrBatchGenerator`: 입력/다른 동작/취소/locale/언마운트가 이전 print를 무효화한다. 인쇄 준비 취소는 완료된 QR 결과를 유지해 재시도할 수 있다. 생성·ZIP의 기존 취소 정책은 보존한다. raw source/ZIP/기록/URL 저장 동작을 추가하지 않는다. 메시지는 `인쇄 창을 열었어요`로, 실물 출력 성공이라고 표현하지 않는다.
- 번역은 `translations-qr-batch-print.json`의 KO/EN 각10키다. canonical/generated는 통합 담당만 변경한다.

검사 명령: `node docs/verify/2026-11-17-repeat-batch55/check-qr-batch-print.mjs`. 실제 qrcode PNG 생성과 제품 유틸을 사용하며 인쇄 문서 API만 controlled ports다. 완료/실패/취소/late decode/15초 timeout(검사에서1ms치환)/owner 변경/afterprint cleanup을 포함한8그룹을 통과했다. 실제 브라우저/종이 인쇄 검사와 구분한다.

부모 검사 명령: `node docs/verify/2026-11-17-repeat-batch55/check-qr-batch-parent.mjs`. 실제 QrBatchGenerator, qrcode/JSZip와 제품 유틸을 실행했다. 완전 생성/부분 생성 취소/인쇄 중 입력 ABA/취소 후 같은 이미지 재시도/실패/locale ABA/옛 렌더 callback/Strict/언마운트/ZIP 원본PNG·파일명을7그룹으로 확인했다. 초기 실패는 로컬 harness의 닫는 중괄호 누락과 Node VM import() callback 미지원이었다. 소유 wrapper에서 esbuild `supported.dynamic-import=false`를 적용해 실제 의존성을 require 포트로 연결했고 공유 host와 제품은 수정하지 않았다. 최종15그룹은 통과했다.

Native 계약: 부모 batch textarea, `button[data-qr-batch-print]`, `[data-qr-batch-print-summary]`. iframe `iframe[data-qr-batch-print-frame]`, 그 document body `[data-qr-batch-print-document]`, 각 페이지 `[data-qr-page]`, 각 셀 `[data-qr-line]`. 작업중취소는 기존 batch.cancel 버튼, 인쇄 준비 문구는 batch.print.preparing. PDF용 실제 iframe document HTML은 print 호출 직전 캡처할 수 있다. payload는 이 DOM의 textContent에 없어야 한다.

최종 native 근거는 [브라우저 보고서](review-browser.md)와 [최종 보고서](report.md)다. 최초6/7 중1건은 기존단일인쇄가 새창을 연다는 검사fixture가 원인이었고, 실제숨김iframe 관측으로 바꿔 해당1흐름만 다시확인했다. 제품변경0,실제7PNG ZIP CRC/bytes·기존12칸단일인쇄·320KOEN·JS/hydration0도 통과했다. root는7개PDF의마지막페이지와EN320viewport를직접열어번호7·빈칸복제없음·버튼/요약을확인했다.
