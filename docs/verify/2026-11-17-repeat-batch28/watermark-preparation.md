# 28 워터마크 미연결 준비 체크포인트

후속 상태: 35 긴급 보완과 CSV/29 체크포인트 뒤 부모 연결까지 완료했다. 아래는 당시 미연결 준비 기록이며 현재 동작/추가 검사·큐 수정은 `watermark-implementation.md`를 따른다.

2026-11-17 KST. 27차 전체 타입 체크포인트 뒤 승인된 순수/큐 준비다. **기존 ImageWatermark 부모·canonical·공용 이미지 유틸 수정 없음.** 현재 완료 단위와 미완료 부분을 분리한다.

## 완료 단위 1 — 순수 설정·좌표·이름

`src/utils/imageWatermark.ts`와 `scripts/check-image-watermark.ts`: **7그룹 PASS**. 활성 모드만 검증하는 immutable snapshot은 raw draft를 바꾸지 않는다. text CRLF/CR/LF→공백·200 code point·공백뿐 입력 오류·#RRGGBB, 기존 숫자/enum 범위, logo File identity,10파일/40MiB·개별/로고 바이트·픽셀 범위,9위치·preview x/y scale·10,000/10,001 tile count, 안전 이름·선택된 현재 ZIP Blob 참조를 확인했다. 이미지 모드에서 숨겨진 무효 텍스트/색은 snapshot에 들어가지 않으며 사용자 draft는 별도 보존한다.

## 완료 단위 2 — 명시 큐·실제 작업 gate·ZIP busy

`src/utils/imageWatermarkQueue.ts`, `imageWatermarkWorkGate.ts`, `imageWatermarkZip.ts`와 `scripts/check-image-watermark-queue.ts`: **9그룹 PASS**. 파일 추가만으로 처리하지 않으며 start 이후 추가 행은 다음 명시 start까지 대기한다. 안정 ID/같은 File·snapshot key·generation·AbortSignal로 적용 여부를 검사하고, 실제 processor finally 전에는 다음 슬롯을 열지 않는다. pause/resume·실패만 재시도·설정 무효화 왕복·삭제/clear/dispose·동기 observer cancel·80MiB 정확 accounting/release를 확인했다. ZIP은 기존 runner를 사용하면서 invalidate 뒤 old encode가 끝날 때까지 physical busy를 유지한다.

검사 포트의 이미지/output은 합성 File·Blob metadata다. 80MiB accounting 검사에 실제80MiB 버퍼를 할당하거나 이미지를 decode하지 않았다. 실제 PNG·ZIP 픽셀/CRC 결과를 검증했다고 주장하지 않는다.

## 완료 단위 3 — 브라우저 어댑터 포트

`src/lib/imageWatermark/browser.ts`와 `scripts/check-image-watermark-browser.ts`: **8그룹 PASS**. public sourcePreview/logo/preview/process만 하나의 gate를 획득하고 내부 source/logo decode는 같은 gate를 재획득하지 않는다. QR header와 실제 decode 양쪽 크기 검사, EXIF를 반영한 실제 크기, 원본 좌표의 공통 draw, 작은 base preview에서 옵션 redraw(원본 재decode 없음),10,000회 draw, PNG type/null 오류, stale read/toBlob·dispose, bitmap/캔버스/URL의 단일 소유권을 확인했다. 기존 `decodeImage`/QR header/uniqueNames/ZIP runner 모듈은 수정하지 않았다.

기본 adapter는 실제 browser `File.arrayBuffer`/decodeImage/canvas.toBlob과 URL을 사용하고 JSZip Blob+STORE 함수를 제공한다. 준비 검사는 합성 헤더·Canvas 명령·I/O 포트로 실행했으며 **실제 PNG decode/픽셀·ZIP CRC·Chrome 검증은 아직 하지 않았다.** 로고 교체 실패 뒤 마지막 유효 asset을 유지할 수 있음을 포트에서 확인했으며 부모 상태 연결은 후속 단계다. 실제 decode/toBlob가 끝나지 않으면 gate를 임의 해제하지 않는다.

## 번역·최종 안정 상태·남은 작업

`translations-watermark.json` ko/en **81키·placeholder 일치**를 확인했다. `imageWatermark.batch`에 오류/목록/명시 만들기·중지/preview/로고/선택·PNG/ZIP/기기 한계 문구를 준비했다. 아직 부모 사용 키 감사·canonical 통합 완료를 주장하지 않는다.

전체 준비 **7+9+8=24그룹 PASS**. 첫6파일 scoped lint exit0, 브라우저 어댑터/검사2파일 lint도 unused 테스트 매개변수 경고를 정리한 뒤 exit0·오류/경고0이다. 준비8개 TS/검사 파일은 **편집 중지·안정 상태**이며 CSV+29 전체 타입 체크포인트를 우선한다. Chrome·전체 tsc·build·배포·커밋을 실행하지 않았다.

남은 것은 별도 승인 뒤 `ImageWatermark` 부모/새 workspace UI 연결과 실제 부모 이벤트, canonical 번역 통합, 합성 실제 이미지·ZIP 브라우저/독립 검사다. 부모는 아직 기존 단일 이미지 구현 그대로다. 특히 부모가 새 로고 선택/설정 변경에서 queue.invalidate와 ZIP.invalidate를 호출하고, 늦은 preview asset을 release하며, clearFiles와 resetAll을 다르게 처리해야 한다. UI가 완료됐다고 주장하지 않는다.
